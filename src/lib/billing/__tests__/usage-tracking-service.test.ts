/**
 * Unit tests for usage tracking service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UsageTrackingService } from '../usage-tracking-service';
import { PlanType } from '@/lib/types/billing';

// Mock Prisma client
const mockPrisma = {
  usageTracking: {
    upsert: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn()
  },
  workspace: {
    count: vi.fn(),
    findMany: vi.fn()
  },
  subscription: {
    findUnique: vi.fn()
  }
};

describe('UsageTrackingService', () => {
  let service: UsageTrackingService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new UsageTrackingService(mockPrisma as any);
  });

  describe('incrementKpiCount', () => {
    it('should increment KPI count for existing workspace', async () => {
      mockPrisma.usageTracking.upsert.mockResolvedValue({});

      await service.incrementKpiCount('workspace-1');

      expect(mockPrisma.usageTracking.upsert).toHaveBeenCalledWith({
        where: { workspaceId: 'workspace-1' },
        update: {
          kpiCount: {
            increment: 1
          }
        },
        create: {
          workspaceId: 'workspace-1',
          kpiCount: 1
        }
      });
    });
  });

  describe('decrementKpiCount', () => {
    it('should decrement KPI count when count is greater than 0', async () => {
      mockPrisma.usageTracking.findUnique.mockResolvedValue({
        workspaceId: 'workspace-1',
        kpiCount: 5
      });
      mockPrisma.usageTracking.update.mockResolvedValue({});

      await service.decrementKpiCount('workspace-1');

      expect(mockPrisma.usageTracking.update).toHaveBeenCalledWith({
        where: { workspaceId: 'workspace-1' },
        data: {
          kpiCount: {
            decrement: 1
          }
        }
      });
    });

    it('should not decrement when count is 0', async () => {
      mockPrisma.usageTracking.findUnique.mockResolvedValue({
        workspaceId: 'workspace-1',
        kpiCount: 0
      });

      await service.decrementKpiCount('workspace-1');

      expect(mockPrisma.usageTracking.update).not.toHaveBeenCalled();
    });

    it('should handle non-existent usage tracking', async () => {
      mockPrisma.usageTracking.findUnique.mockResolvedValue(null);

      await service.decrementKpiCount('workspace-1');

      expect(mockPrisma.usageTracking.update).not.toHaveBeenCalled();
    });
  });

  describe('getKpiCount', () => {
    it('should return KPI count for existing workspace', async () => {
      mockPrisma.usageTracking.findUnique.mockResolvedValue({
        workspaceId: 'workspace-1',
        kpiCount: 3
      });

      const count = await service.getKpiCount('workspace-1');

      expect(count).toBe(3);
    });

    it('should return 0 for non-existent workspace', async () => {
      mockPrisma.usageTracking.findUnique.mockResolvedValue(null);

      const count = await service.getKpiCount('workspace-1');

      expect(count).toBe(0);
    });
  });

  describe('getWorkspaceCount', () => {
    it('should count workspaces owned by user', async () => {
      mockPrisma.workspace.count.mockResolvedValue(2);

      const count = await service.getWorkspaceCount('user-1');

      expect(count).toBe(2);
      expect(mockPrisma.workspace.count).toHaveBeenCalledWith({
        where: {
          OR: [
            { ownerId: 'user-1' },
            {
              memberships: {
                some: {
                  userId: 'user-1'
                }
              }
            }
          ]
        }
      });
    });
  });

  describe('getUsageStats', () => {
    it('should return comprehensive usage statistics', async () => {
      // Mock subscription
      mockPrisma.subscription.findUnique.mockResolvedValue({
        userId: 'user-1',
        planType: PlanType.STARTER,
        trialEndsAt: new Date('2024-12-31')
      });

      // Mock workspace count
      mockPrisma.workspace.count.mockResolvedValue(2);

      // Mock workspaces with usage tracking
      mockPrisma.workspace.findMany.mockResolvedValue([
        {
          id: 'workspace-1',
          usageTracking: { kpiCount: 3 }
        },
        {
          id: 'workspace-2',
          usageTracking: { kpiCount: 7 }
        }
      ]);

      const stats = await service.getUsageStats('user-1');

      expect(stats).toEqual({
        workspaceCount: 2,
        workspaceLimit: 3,
        kpiCounts: {
          'workspace-1': 3,
          'workspace-2': 7
        },
        kpiLimits: {
          'workspace-1': 15,
          'workspace-2': 15
        },
        planType: PlanType.STARTER,
        trialEndsAt: new Date('2024-12-31')
      });
    });

    it('should handle user without subscription (FREE plan)', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue(null);
      mockPrisma.workspace.count.mockResolvedValue(1);
      mockPrisma.workspace.findMany.mockResolvedValue([
        {
          id: 'workspace-1',
          usageTracking: null
        }
      ]);

      const stats = await service.getUsageStats('user-1');

      expect(stats.planType).toBe(PlanType.FREE);
      expect(stats.workspaceLimit).toBe(1);
      expect(stats.kpiCounts['workspace-1']).toBe(0);
      expect(stats.kpiLimits['workspace-1']).toBe(5);
    });
  });

  describe('resetWorkspaceUsage', () => {
    it('should reset KPI count to 0', async () => {
      mockPrisma.usageTracking.upsert.mockResolvedValue({});

      await service.resetWorkspaceUsage('workspace-1');

      expect(mockPrisma.usageTracking.upsert).toHaveBeenCalledWith({
        where: { workspaceId: 'workspace-1' },
        update: {
          kpiCount: 0
        },
        create: {
          workspaceId: 'workspace-1',
          kpiCount: 0
        }
      });
    });
  });

  describe('getMaxKpiCount', () => {
    it('should return maximum KPI count across all workspaces', async () => {
      mockPrisma.workspace.findMany.mockResolvedValue([
        {
          id: 'workspace-1',
          usageTracking: { kpiCount: 3 }
        },
        {
          id: 'workspace-2',
          usageTracking: { kpiCount: 7 }
        },
        {
          id: 'workspace-3',
          usageTracking: null
        }
      ]);

      const maxCount = await service.getMaxKpiCount('user-1');

      expect(maxCount).toBe(7);
    });

    it('should return 0 when user has no workspaces', async () => {
      mockPrisma.workspace.findMany.mockResolvedValue([]);

      const maxCount = await service.getMaxKpiCount('user-1');

      expect(maxCount).toBe(0);
    });
  });
});