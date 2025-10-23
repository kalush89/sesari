/**
 * Usage tracking service for workspace and KPI counting
 */

import { PrismaClient } from '@prisma/client';
import { UsageStats, PlanType } from '@/lib/types/billing';
import { getPlanLimits } from './plan-config';

export class UsageTrackingService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Increment KPI count for a workspace
   */
  async incrementKpiCount(workspaceId: string): Promise<void> {
    await this.prisma.usageTracking.upsert({
      where: { workspaceId },
      update: {
        kpiCount: {
          increment: 1
        }
      },
      create: {
        workspaceId,
        kpiCount: 1
      }
    });
  }

  /**
   * Decrement KPI count for a workspace
   */
  async decrementKpiCount(workspaceId: string): Promise<void> {
    const usage = await this.prisma.usageTracking.findUnique({
      where: { workspaceId }
    });

    if (usage && usage.kpiCount > 0) {
      await this.prisma.usageTracking.update({
        where: { workspaceId },
        data: {
          kpiCount: {
            decrement: 1
          }
        }
      });
    }
  }

  /**
   * Get KPI count for a specific workspace
   */
  async getKpiCount(workspaceId: string): Promise<number> {
    const usage = await this.prisma.usageTracking.findUnique({
      where: { workspaceId }
    });

    return usage?.kpiCount ?? 0;
  }

  /**
   * Get workspace count for a user
   */
  async getWorkspaceCount(userId: string): Promise<number> {
    const count = await this.prisma.workspace.count({
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
      }
    });

    return count;
  }

  /**
   * Get comprehensive usage statistics for a user
   */
  async getUsageStats(userId: string): Promise<UsageStats> {
    // Get user's subscription to determine plan type
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId }
    });

    const planType = subscription?.planType ?? PlanType.FREE;
    const planLimits = getPlanLimits(planType);

    // Get workspace count
    const workspaceCount = await this.getWorkspaceCount(userId);

    // Get all workspaces user has access to
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

    // Build KPI counts and limits per workspace
    const kpiCounts: Record<string, number> = {};
    const kpiLimits: Record<string, number> = {};

    for (const workspace of workspaces) {
      kpiCounts[workspace.id] = workspace.usageTracking?.kpiCount ?? 0;
      kpiLimits[workspace.id] = planLimits.kpisPerWorkspace;
    }

    return {
      workspaceCount,
      workspaceLimit: planLimits.workspaces,
      kpiCounts,
      kpiLimits,
      planType,
      trialEndsAt: subscription?.trialEndsAt ?? undefined
    };
  }

  /**
   * Reset usage tracking for a workspace (useful for testing)
   */
  async resetWorkspaceUsage(workspaceId: string): Promise<void> {
    await this.prisma.usageTracking.upsert({
      where: { workspaceId },
      update: {
        kpiCount: 0
      },
      create: {
        workspaceId,
        kpiCount: 0
      }
    });
  }

  /**
   * Get maximum KPI count across all user's workspaces
   */
  async getMaxKpiCount(userId: string): Promise<number> {
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

    return Math.max(...workspaces.map(w => w.usageTracking?.kpiCount ?? 0), 0);
  }
}