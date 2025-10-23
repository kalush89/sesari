/**
 * Plan enforcement service for checking limits and feature access
 */

import { PrismaClient } from '@prisma/client';
import {
  PlanType,
  Feature,
  ResourceAction,
  EnforcementResult,
  FeatureAccess,
  LimitType,
  BillingError
} from '@/lib/types/billing';
import {
  getPlanLimits,
  planSupportsFeature,
  isWithinWorkspaceLimit,
  isWithinKpiLimit,
  getSuggestedUpgradePlan,
  isApproachingLimit
} from './plan-config';
import { UsageTrackingService } from './usage-tracking-service';

export class PlanEnforcementService {
  private usageService: UsageTrackingService;

  constructor(private prisma: PrismaClient) {
    this.usageService = new UsageTrackingService(prisma);
  }

  /**
   * Enforce limits for a specific resource action
   */
  async enforceLimits(userId: string, action: ResourceAction, workspaceId?: string): Promise<EnforcementResult> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId }
    });

    const planType = subscription?.planType ?? PlanType.FREE;

    switch (action) {
      case ResourceAction.CREATE_WORKSPACE:
        return this.enforceWorkspaceLimit(userId, planType);

      case ResourceAction.CREATE_KPI:
        if (!workspaceId) {
          throw new Error('Workspace ID required for KPI creation enforcement');
        }
        return this.enforceKpiLimit(userId, planType, workspaceId);

      case ResourceAction.ACCESS_INTEGRATION:
        return this.enforceFeatureAccess(planType, Feature.INTEGRATIONS);

      case ResourceAction.USE_AI_FEATURE:
        return this.enforceFeatureAccess(planType, Feature.AI_FEATURES);

      default:
        return { allowed: false, reason: 'Unknown resource action' };
    }
  }

  /**
   * Enforce workspace creation limits
   */
  private async enforceWorkspaceLimit(userId: string, planType: PlanType): Promise<EnforcementResult> {
    const currentCount = await this.usageService.getWorkspaceCount(userId);
    const limits = getPlanLimits(planType);

    if (isWithinWorkspaceLimit(planType, currentCount)) {
      return { allowed: true };
    }

    const maxKpiCount = await this.usageService.getMaxKpiCount(userId);
    const suggestedPlan = getSuggestedUpgradePlan(planType, currentCount + 1, maxKpiCount);

    return {
      allowed: false,
      reason: `Workspace limit exceeded. Current plan allows ${limits.workspaces} workspace${limits.workspaces === 1 ? '' : 's'}.`,
      currentUsage: currentCount,
      limit: limits.workspaces,
      upgradeRequired: true,
      suggestedPlan: suggestedPlan ?? undefined
    };
  }

  /**
   * Enforce KPI creation limits
   */
  private async enforceKpiLimit(userId: string, planType: PlanType, workspaceId: string): Promise<EnforcementResult> {
    const currentCount = await this.usageService.getKpiCount(workspaceId);
    const limits = getPlanLimits(planType);

    if (isWithinKpiLimit(planType, currentCount)) {
      return { allowed: true };
    }

    const workspaceCount = await this.usageService.getWorkspaceCount(userId);
    const suggestedPlan = getSuggestedUpgradePlan(planType, workspaceCount, currentCount + 1);

    return {
      allowed: false,
      reason: `KPI limit exceeded for this workspace. Current plan allows ${limits.kpisPerWorkspace} KPIs per workspace.`,
      currentUsage: currentCount,
      limit: limits.kpisPerWorkspace,
      upgradeRequired: true,
      suggestedPlan: suggestedPlan ?? undefined
    };
  }

  /**
   * Enforce feature access based on plan
   */
  private enforceFeatureAccess(planType: PlanType, feature: Feature): EnforcementResult {
    if (planSupportsFeature(planType, feature)) {
      return { allowed: true };
    }

    const featureName = feature.replace('_', ' ').toLowerCase();
    const suggestedPlan = planType === PlanType.FREE ? PlanType.STARTER : PlanType.PRO;

    return {
      allowed: false,
      reason: `${featureName} not available on current plan.`,
      upgradeRequired: true,
      suggestedPlan
    };
  }

  /**
   * Get comprehensive feature access for a user
   */
  async getFeatureAccess(userId: string): Promise<FeatureAccess> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId }
    });

    const planType = subscription?.planType ?? PlanType.FREE;

    return {
      integrations: planSupportsFeature(planType, Feature.INTEGRATIONS),
      aiFeatures: planSupportsFeature(planType, Feature.AI_FEATURES),
      multipleWorkspaces: planSupportsFeature(planType, Feature.MULTIPLE_WORKSPACES),
      unlimitedKpis: planSupportsFeature(planType, Feature.UNLIMITED_KPIS)
    };
  }

  /**
   * Check if user is approaching any limits and should be notified
   */
  async checkLimitNotifications(userId: string): Promise<Array<{ type: LimitType; percentage: number; limit: number; current: number }>> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId }
    });

    const planType = subscription?.planType ?? PlanType.FREE;
    const limits = getPlanLimits(planType);
    const notifications: Array<{ type: LimitType; percentage: number; limit: number; current: number }> = [];

    // Check workspace limit
    const workspaceCount = await this.usageService.getWorkspaceCount(userId);
    if (limits.workspaces !== -1 && isApproachingLimit(workspaceCount, limits.workspaces)) {
      notifications.push({
        type: LimitType.WORKSPACE_COUNT,
        percentage: Math.round((workspaceCount / limits.workspaces) * 100),
        limit: limits.workspaces,
        current: workspaceCount
      });
    }

    // Check KPI limits for each workspace
    const workspaces = await this.prisma.workspace.findMany({
      where: {
        OR: [
          { ownerId: userId },
          {
            memberships: {
              some: {
                userId: userId
              }
            }
          }
        ]
      },
      include: {
        usageTracking: true
      }
    });

    for (const workspace of workspaces) {
      const kpiCount = workspace.usageTracking?.kpiCount ?? 0;
      if (limits.kpisPerWorkspace !== -1 && isApproachingLimit(kpiCount, limits.kpisPerWorkspace)) {
        notifications.push({
          type: LimitType.KPI_COUNT,
          percentage: Math.round((kpiCount / limits.kpisPerWorkspace) * 100),
          limit: limits.kpisPerWorkspace,
          current: kpiCount
        });
      }
    }

    return notifications;
  }

  /**
   * Validate that a user can perform an action, throwing an error if not
   */
  async validateAction(userId: string, action: ResourceAction, workspaceId?: string): Promise<void> {
    const result = await this.enforceLimits(userId, action, workspaceId);
    
    if (!result.allowed) {
      const error = new Error(result.reason || 'Action not allowed');
      (error as any).code = BillingError.PLAN_LIMIT_EXCEEDED;
      (error as any).upgradeRequired = result.upgradeRequired;
      (error as any).suggestedPlan = result.suggestedPlan;
      throw error;
    }
  }
}