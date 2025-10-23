/**
 * Core billing service for subscription management
 */

import { PrismaClient } from '@prisma/client';
import {
  PlanType,
  SubscriptionStatus,
  Subscription,
  TrialStatus,
  CheckoutSession,
  Feature,
  ResourceAction,
  EnforcementResult,
  FeatureAccess,
  UsageStats,
  BillingError
} from '@/lib/types/billing';
import { getPlanLimits } from './plan-config';
import { UsageTrackingService } from './usage-tracking-service';
import { PlanEnforcementService } from './plan-enforcement-service';

export class BillingService {
  private usageService: UsageTrackingService;
  private enforcementService: PlanEnforcementService;

  constructor(private prisma: PrismaClient) {
    this.usageService = new UsageTrackingService(prisma);
    this.enforcementService = new PlanEnforcementService(prisma);
  }

  // Subscription Management Methods

  /**
   * Get subscription for a user
   */
  async getSubscription(userId: string): Promise<Subscription | null> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId }
    });

    return subscription;
  }

  /**
   * Create or update subscription from webhook data
   */
  async upsertSubscription(data: {
    userId: string;
    lemonSqueezyId: string;
    planType: PlanType;
    status: SubscriptionStatus;
    trialEndsAt?: Date;
    currentPeriodEnd: Date;
    cancelAtPeriodEnd?: boolean;
  }): Promise<Subscription> {
    const subscription = await this.prisma.subscription.upsert({
      where: { userId: data.userId },
      update: {
        lemonSqueezyId: data.lemonSqueezyId,
        planType: data.planType,
        status: data.status,
        trialEndsAt: data.trialEndsAt,
        currentPeriodEnd: data.currentPeriodEnd,
        cancelAtPeriodEnd: data.cancelAtPeriodEnd ?? false
      },
      create: {
        userId: data.userId,
        lemonSqueezyId: data.lemonSqueezyId,
        planType: data.planType,
        status: data.status,
        trialEndsAt: data.trialEndsAt,
        currentPeriodEnd: data.currentPeriodEnd,
        cancelAtPeriodEnd: data.cancelAtPeriodEnd ?? false
      }
    });

    return subscription;
  }

  /**
   * Cancel subscription (mark for cancellation at period end)
   */
  async cancelSubscription(userId: string): Promise<void> {
    await this.prisma.subscription.update({
      where: { userId },
      data: {
        cancelAtPeriodEnd: true
      }
    });
  }

  /**
   * Create checkout session (placeholder - actual implementation will use Lemon Squeezy API)
   */
  async createCheckoutSession(userId: string, planType: PlanType): Promise<CheckoutSession> {
    // This is a placeholder implementation
    // The actual implementation will integrate with Lemon Squeezy API
    const sessionId = `checkout_${Date.now()}_${userId}`;
    
    return {
      url: `https://checkout.lemonsqueezy.com/session/${sessionId}`,
      sessionId
    };
  }

  // Plan Enforcement Methods

  /**
   * Check workspace creation limit
   */
  async checkWorkspaceLimit(userId: string): Promise<boolean> {
    const result = await this.enforcementService.enforceLimits(userId, ResourceAction.CREATE_WORKSPACE);
    return result.allowed;
  }

  /**
   * Check KPI creation limit for a workspace
   */
  async checkKpiLimit(workspaceId: string): Promise<boolean> {
    // Get workspace owner to check their plan
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId }
    });

    if (!workspace) {
      throw new Error('Workspace not found');
    }

    const result = await this.enforcementService.enforceLimits(
      workspace.ownerId,
      ResourceAction.CREATE_KPI,
      workspaceId
    );
    return result.allowed;
  }

  /**
   * Check feature access for a user
   */
  async checkFeatureAccess(userId: string, feature: Feature): Promise<boolean> {
    const featureAccess = await this.enforcementService.getFeatureAccess(userId);
    
    switch (feature) {
      case Feature.INTEGRATIONS:
        return featureAccess.integrations;
      case Feature.AI_FEATURES:
        return featureAccess.aiFeatures;
      case Feature.MULTIPLE_WORKSPACES:
        return featureAccess.multipleWorkspaces;
      case Feature.UNLIMITED_KPIS:
        return featureAccess.unlimitedKpis;
      default:
        return false;
    }
  }

  /**
   * Get comprehensive feature access for a user
   */
  async getFeatureAccess(userId: string): Promise<FeatureAccess> {
    return this.enforcementService.getFeatureAccess(userId);
  }

  /**
   * Enforce limits for a resource action
   */
  async enforceLimits(userId: string, action: ResourceAction, workspaceId?: string): Promise<EnforcementResult> {
    return this.enforcementService.enforceLimits(userId, action, workspaceId);
  }

  // Usage Tracking Methods

  /**
   * Increment KPI count for a workspace
   */
  async incrementKpiCount(workspaceId: string): Promise<void> {
    await this.usageService.incrementKpiCount(workspaceId);
  }

  /**
   * Decrement KPI count for a workspace
   */
  async decrementKpiCount(workspaceId: string): Promise<void> {
    await this.usageService.decrementKpiCount(workspaceId);
  }

  /**
   * Get usage statistics for a user
   */
  async getUsageStats(userId: string): Promise<UsageStats> {
    return this.usageService.getUsageStats(userId);
  }

  // Trial Management Methods

  /**
   * Start trial for a user
   */
  async startTrial(userId: string, planType: PlanType = PlanType.PRO): Promise<void> {
    const planLimits = getPlanLimits(planType);
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + planLimits.trialDays);

    await this.prisma.subscription.upsert({
      where: { userId },
      update: {
        planType,
        status: SubscriptionStatus.TRIALING,
        trialEndsAt,
        currentPeriodEnd: trialEndsAt
      },
      create: {
        userId,
        lemonSqueezyId: `trial_${userId}_${Date.now()}`,
        planType,
        status: SubscriptionStatus.TRIALING,
        trialEndsAt,
        currentPeriodEnd: trialEndsAt
      }
    });
  }

  /**
   * Check trial status for a user
   */
  async checkTrialStatus(userId: string): Promise<TrialStatus> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId }
    });

    if (!subscription || !subscription.trialEndsAt) {
      return {
        isInTrial: false,
        hasExpired: false
      };
    }

    const now = new Date();
    const isInTrial = subscription.status === SubscriptionStatus.TRIALING && subscription.trialEndsAt > now;
    const hasExpired = subscription.trialEndsAt <= now;
    
    let daysRemaining: number | undefined;
    if (isInTrial) {
      const timeDiff = subscription.trialEndsAt.getTime() - now.getTime();
      daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
    }

    return {
      isInTrial,
      trialEndsAt: subscription.trialEndsAt,
      daysRemaining,
      hasExpired
    };
  }

  /**
   * Expire trial and downgrade to free plan
   */
  async expireTrial(userId: string): Promise<void> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId }
    });

    if (subscription && subscription.status === SubscriptionStatus.TRIALING) {
      await this.prisma.subscription.update({
        where: { userId },
        data: {
          planType: PlanType.FREE,
          status: SubscriptionStatus.ACTIVE,
          trialEndsAt: null
        }
      });
    }
  }

  // Utility Methods

  /**
   * Get user's current plan type
   */
  async getUserPlanType(userId: string): Promise<PlanType> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId }
    });

    return subscription?.planType ?? PlanType.FREE;
  }

  /**
   * Check if user has active subscription
   */
  async hasActiveSubscription(userId: string): Promise<boolean> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId }
    });

    return subscription?.status === SubscriptionStatus.ACTIVE || 
           subscription?.status === SubscriptionStatus.TRIALING;
  }

  /**
   * Get limit notifications for a user
   */
  async getLimitNotifications(userId: string) {
    return this.enforcementService.checkLimitNotifications(userId);
  }

  /**
   * Validate action and throw error if not allowed
   */
  async validateAction(userId: string, action: ResourceAction, workspaceId?: string): Promise<void> {
    await this.enforcementService.validateAction(userId, action, workspaceId);
  }
}