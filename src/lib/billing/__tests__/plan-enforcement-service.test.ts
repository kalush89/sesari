/**
 * Unit tests for plan enforcement service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PlanEnforcementService } from '../plan-enforcement-service';
import { PlanType, SubscriptionStatus, ResourceAction, Feature, LimitType, BillingError } from '@/lib/types/billing';

// Mock Prisma client
const mockPrisma = {
  subscription: {
    findUnique: vi.fn()
  },
  workspace: {
    findUnique: vi.fn(),
    findMany: vi.fn()
  }
};

// Mock UsageTrackingService
vi.mock('../usage-tracking-service', () => ({
  UsageTrackingService: vi.fn().mockImplementation(() => ({
    getWorkspaceCount: vi.fn(),
    getKpiCount: vi.fn(),
    getMaxKpiCount: vi.fn()
  }))
}));

describe('PlanEnforcementService', () => {
  let service: PlanEnforcementService;
  let mockUsageService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PlanEnforcementService(mockPrisma as any);
    mockUsageService = (service as any).usageService;
  });

  describe('enforceLimits', () => {
    describe('CREATE_WORKSPACE action', () => {
      it('should allow workspace creation within FREE plan limit', async () => {
        mockPrisma.subscription.findUnique.mockResolvedValue({
          planType: PlanType.FREE
        });
        mockUsageService.getWorkspaceCount.mockResolvedValue(0);

        const result = await service.enforceLimits('user-1', ResourceAction.CREATE_WORKSPACE);

        expect(result.allowed).toBe(true);
      });

      it('should deny workspace creation when FREE plan limit exceeded', async () => {
        mockPrisma.subscription.findUnique.mockResolvedValue({
          planType: PlanType.FREE
        });
        mockUsageService.getWorkspaceCount.mockResolvedValue(1);
        mockUsageService.getMaxKpiCount.mockResolvedValue(3);

        const result = await service.enforceLimits('user-1', ResourceAction.CREATE_WORKSPACE);

        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('Workspace limit exceeded');
        expect(result.upgradeRequired).toBe(true);
        expect(result.suggestedPlan).toBe(PlanType.STARTER);
      });

      it('should allow unlimited workspaces for PRO plan', async () => {
        mockPrisma.subscription.findUnique.mockResolvedValue({
          planType: PlanType.PRO
        });
        mockUsageService.getWorkspaceCount.mockResolvedValue(100);

        const result = await service.enforceLimits('user-1', ResourceAction.CREATE_WORKSPACE);

        expect(result.allowed).toBe(true);
      });
    });

    describe('CREATE_KPI action', () => {
      it('should allow KPI creation within plan limit', async () => {
        mockPrisma.subscription.findUnique.mockResolvedValue({
          planType: PlanType.FREE
        });
        mockUsageService.getKpiCount.mockResolvedValue(3);

        const result = await service.enforceLimits('user-1', ResourceAction.CREATE_KPI, 'workspace-1');

        expect(result.allowed).toBe(true);
      });

      it('should deny KPI creation when limit exceeded', async () => {
        mockPrisma.subscription.findUnique.mockResolvedValue({
          planType: PlanType.FREE
        });
        mockUsageService.getKpiCount.mockResolvedValue(5);
        mockUsageService.getWorkspaceCount.mockResolvedValue(1);

        const result = await service.enforceLimits('user-1', ResourceAction.CREATE_KPI, 'workspace-1');

        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('KPI limit exceeded');
        expect(result.upgradeRequired).toBe(true);
      });

      it('should throw error when workspace ID not provided', async () => {
        await expect(
          service.enforceLimits('user-1', ResourceAction.CREATE_KPI)
        ).rejects.toThrow('Workspace ID required');
      });
    });

    describe('Feature access actions', () => {
      it('should deny integrations for FREE plan', async () => {
        mockPrisma.subscription.findUnique.mockResolvedValue({
          planType: PlanType.FREE
        });

        const result = await service.enforceLimits('user-1', ResourceAction.ACCESS_INTEGRATION);

        expect(result.allowed).toBe(false);
        expect(result.upgradeRequired).toBe(true);
        expect(result.suggestedPlan).toBe(PlanType.STARTER);
      });

      it('should allow integrations for STARTER plan', async () => {
        mockPrisma.subscription.findUnique.mockResolvedValue({
          planType: PlanType.STARTER
        });

        const result = await service.enforceLimits('user-1', ResourceAction.ACCESS_INTEGRATION);

        expect(result.allowed).toBe(true);
      });

      it('should deny AI features for FREE plan', async () => {
        mockPrisma.subscription.findUnique.mockResolvedValue({
          planType: PlanType.FREE
        });

        const result = await service.enforceLimits('user-1', ResourceAction.USE_AI_FEATURE);

        expect(result.allowed).toBe(false);
        expect(result.upgradeRequired).toBe(true);
      });
    });

    it('should handle user without subscription (defaults to FREE)', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue(null);
      mockUsageService.getWorkspaceCount.mockResolvedValue(0);

      const result = await service.enforceLimits('user-1', ResourceAction.CREATE_WORKSPACE);

      expect(result.allowed).toBe(true);
    });
  });

  describe('getFeatureAccess', () => {
    it('should return correct feature access for FREE plan', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        planType: PlanType.FREE
      });

      const access = await service.getFeatureAccess('user-1');

      expect(access).toEqual({
        integrations: false,
        aiFeatures: false,
        multipleWorkspaces: false,
        unlimitedKpis: false
      });
    });

    it('should return correct feature access for STARTER plan', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        planType: PlanType.STARTER
      });

      const access = await service.getFeatureAccess('user-1');

      expect(access).toEqual({
        integrations: true,
        aiFeatures: true,
        multipleWorkspaces: true,
        unlimitedKpis: false
      });
    });

    it('should return correct feature access for PRO plan', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        planType: PlanType.PRO
      });

      const access = await service.getFeatureAccess('user-1');

      expect(access).toEqual({
        integrations: true,
        aiFeatures: true,
        multipleWorkspaces: true,
        unlimitedKpis: true
      });
    });
  });

  describe('checkLimitNotifications', () => {
    it('should detect workspace limit approaching', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        planType: PlanType.FREE
      });
      mockUsageService.getWorkspaceCount.mockResolvedValue(1); // 100% of limit
      mockPrisma.workspace.findMany.mockResolvedValue([
        {
          id: 'workspace-1',
          usageTracking: { kpiCount: 2 }
        }
      ]);

      const notifications = await service.checkLimitNotifications('user-1');

      expect(notifications).toHaveLength(1);
      expect(notifications[0]).toEqual({
        type: LimitType.WORKSPACE_COUNT,
        percentage: 100,
        limit: 1,
        current: 1
      });
    });

    it('should detect KPI limit approaching', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        planType: PlanType.FREE
      });
      mockUsageService.getWorkspaceCount.mockResolvedValue(0);
      mockPrisma.workspace.findMany.mockResolvedValue([
        {
          id: 'workspace-1',
          usageTracking: { kpiCount: 4 } // 80% of 5
        }
      ]);

      const notifications = await service.checkLimitNotifications('user-1');

      expect(notifications).toHaveLength(1);
      expect(notifications[0]).toEqual({
        type: LimitType.KPI_COUNT,
        percentage: 80,
        limit: 5,
        current: 4
      });
    });

    it('should return empty array for PRO plan (unlimited)', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        planType: PlanType.PRO
      });
      mockUsageService.getWorkspaceCount.mockResolvedValue(100);
      mockPrisma.workspace.findMany.mockResolvedValue([]);

      const notifications = await service.checkLimitNotifications('user-1');

      expect(notifications).toHaveLength(0);
    });
  });

  describe('validateAction', () => {
    it('should not throw when action is allowed', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        planType: PlanType.STARTER
      });
      mockUsageService.getWorkspaceCount.mockResolvedValue(1);

      await expect(
        service.validateAction('user-1', ResourceAction.CREATE_WORKSPACE)
      ).resolves.not.toThrow();
    });

    it('should throw error when action is not allowed', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        planType: PlanType.FREE
      });
      mockUsageService.getWorkspaceCount.mockResolvedValue(1);
      mockUsageService.getMaxKpiCount.mockResolvedValue(3);

      await expect(
        service.validateAction('user-1', ResourceAction.CREATE_WORKSPACE)
      ).rejects.toThrow();
    });

    it('should throw error with billing error code', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        planType: PlanType.FREE
      });
      mockUsageService.getWorkspaceCount.mockResolvedValue(1);
      mockUsageService.getMaxKpiCount.mockResolvedValue(3);

      try {
        await service.validateAction('user-1', ResourceAction.CREATE_WORKSPACE);
      } catch (error: any) {
        expect(error.code).toBe(BillingError.PLAN_LIMIT_EXCEEDED);
        expect(error.upgradeRequired).toBe(true);
        expect(error.suggestedPlan).toBe(PlanType.STARTER);
      }
    });
  });
});