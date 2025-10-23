/**
 * Unit tests for core billing service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BillingService } from '../billing-service';
import { PlanType, SubscriptionStatus, Feature, ResourceAction } from '@/lib/types/billing';

// Mock Prisma client
const mockPrisma = {
  subscription: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn()
  },
  workspace: {
    findUnique: vi.fn()
  }
};

// Mock services
vi.mock('../usage-tracking-service', () => ({
  UsageTrackingService: vi.fn().mockImplementation(() => ({
    incrementKpiCount: vi.fn(),
    decrementKpiCount: vi.fn(),
    getUsageStats: vi.fn()
  }))
}));

vi.mock('../plan-enforcement-service', () => ({
  PlanEnforcementService: vi.fn().mockImplementation(() => ({
    enforceLimits: vi.fn(),
    getFeatureAccess: vi.fn(),
    checkLimitNotifications: vi.fn(),
    validateAction: vi.fn()
  }))
}));

describe('BillingService', () => {
  let service: BillingService;
  let mockUsageService: any;
  let mockEnforcementService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new BillingService(mockPrisma as any);
    mockUsageService = (service as any).usageService;
    mockEnforcementService = (service as any).enforcementService;
  });

  describe('Subscription Management', () => {
    describe('getSubscription', () => {
      it('should return subscription for user', async () => {
        const mockSubscription = {
          id: 'sub-1',
          userId: 'user-1',
          planType: PlanType.STARTER
        };
        mockPrisma.subscription.findUnique.mockResolvedValue(mockSubscription);

        const result = await service.getSubscription('user-1');

        expect(result).toEqual(mockSubscription);
        expect(mockPrisma.subscription.findUnique).toHaveBeenCalledWith({
          where: { userId: 'user-1' }
        });
      });

      it('should return null when no subscription exists', async () => {
        mockPrisma.subscription.findUnique.mockResolvedValue(null);

        const result = await service.getSubscription('user-1');

        expect(result).toBeNull();
      });
    });

    describe('upsertSubscription', () => {
      it('should create new subscription', async () => {
        const subscriptionData = {
          userId: 'user-1',
          lemonSqueezyId: 'ls-123',
          planType: PlanType.STARTER,
          status: SubscriptionStatus.ACTIVE,
          currentPeriodEnd: new Date('2024-12-31')
        };

        const mockSubscription = { id: 'sub-1', ...subscriptionData };
        mockPrisma.subscription.upsert.mockResolvedValue(mockSubscription);

        const result = await service.upsertSubscription(subscriptionData);

        expect(result).toEqual(mockSubscription);
        expect(mockPrisma.subscription.upsert).toHaveBeenCalledWith({
          where: { userId: 'user-1' },
          update: {
            lemonSqueezyId: 'ls-123',
            planType: PlanType.STARTER,
            status: SubscriptionStatus.ACTIVE,
            trialEndsAt: undefined,
            currentPeriodEnd: new Date('2024-12-31'),
            cancelAtPeriodEnd: false
          },
          create: {
            userId: 'user-1',
            lemonSqueezyId: 'ls-123',
            planType: PlanType.STARTER,
            status: SubscriptionStatus.ACTIVE,
            trialEndsAt: undefined,
            currentPeriodEnd: new Date('2024-12-31'),
            cancelAtPeriodEnd: false
          }
        });
      });

      it('should update existing subscription', async () => {
        const subscriptionData = {
          userId: 'user-1',
          lemonSqueezyId: 'ls-123',
          planType: PlanType.PRO,
          status: SubscriptionStatus.ACTIVE,
          currentPeriodEnd: new Date('2024-12-31'),
          cancelAtPeriodEnd: true
        };

        mockPrisma.subscription.upsert.mockResolvedValue(subscriptionData);

        await service.upsertSubscription(subscriptionData);

        expect(mockPrisma.subscription.upsert).toHaveBeenCalledWith(
          expect.objectContaining({
            update: expect.objectContaining({
              cancelAtPeriodEnd: true
            })
          })
        );
      });
    });

    describe('cancelSubscription', () => {
      it('should mark subscription for cancellation', async () => {
        mockPrisma.subscription.update.mockResolvedValue({});

        await service.cancelSubscription('user-1');

        expect(mockPrisma.subscription.update).toHaveBeenCalledWith({
          where: { userId: 'user-1' },
          data: {
            cancelAtPeriodEnd: true
          }
        });
      });
    });

    describe('createCheckoutSession', () => {
      it('should create checkout session', async () => {
        const result = await service.createCheckoutSession('user-1', PlanType.STARTER);

        expect(result).toHaveProperty('url');
        expect(result).toHaveProperty('sessionId');
        expect(result.url).toContain('lemonsqueezy.com');
      });
    });
  });

  describe('Plan Enforcement', () => {
    describe('checkWorkspaceLimit', () => {
      it('should return enforcement result for workspace creation', async () => {
        mockEnforcementService.enforceLimits.mockResolvedValue({ allowed: true });

        const result = await service.checkWorkspaceLimit('user-1');

        expect(result).toBe(true);
        expect(mockEnforcementService.enforceLimits).toHaveBeenCalledWith(
          'user-1',
          ResourceAction.CREATE_WORKSPACE
        );
      });
    });

    describe('checkKpiLimit', () => {
      it('should check KPI limit for workspace', async () => {
        mockPrisma.workspace.findUnique.mockResolvedValue({
          id: 'workspace-1',
          ownerId: 'user-1'
        });
        mockEnforcementService.enforceLimits.mockResolvedValue({ allowed: true });

        const result = await service.checkKpiLimit('workspace-1');

        expect(result).toBe(true);
        expect(mockEnforcementService.enforceLimits).toHaveBeenCalledWith(
          'user-1',
          ResourceAction.CREATE_KPI,
          'workspace-1'
        );
      });

      it('should throw error for non-existent workspace', async () => {
        mockPrisma.workspace.findUnique.mockResolvedValue(null);

        await expect(service.checkKpiLimit('workspace-1')).rejects.toThrow('Workspace not found');
      });
    });

    describe('checkFeatureAccess', () => {
      it('should check integration access', async () => {
        mockEnforcementService.getFeatureAccess.mockResolvedValue({
          integrations: true,
          aiFeatures: false,
          multipleWorkspaces: true,
          unlimitedKpis: false
        });

        const result = await service.checkFeatureAccess('user-1', Feature.INTEGRATIONS);

        expect(result).toBe(true);
      });

      it('should check AI features access', async () => {
        mockEnforcementService.getFeatureAccess.mockResolvedValue({
          integrations: true,
          aiFeatures: false,
          multipleWorkspaces: true,
          unlimitedKpis: false
        });

        const result = await service.checkFeatureAccess('user-1', Feature.AI_FEATURES);

        expect(result).toBe(false);
      });
    });
  });

  describe('Usage Tracking', () => {
    describe('incrementKpiCount', () => {
      it('should delegate to usage service', async () => {
        await service.incrementKpiCount('workspace-1');

        expect(mockUsageService.incrementKpiCount).toHaveBeenCalledWith('workspace-1');
      });
    });

    describe('decrementKpiCount', () => {
      it('should delegate to usage service', async () => {
        await service.decrementKpiCount('workspace-1');

        expect(mockUsageService.decrementKpiCount).toHaveBeenCalledWith('workspace-1');
      });
    });

    describe('getUsageStats', () => {
      it('should delegate to usage service', async () => {
        const mockStats = {
          workspaceCount: 2,
          workspaceLimit: 3,
          kpiCounts: {},
          kpiLimits: {},
          planType: PlanType.STARTER
        };
        mockUsageService.getUsageStats.mockResolvedValue(mockStats);

        const result = await service.getUsageStats('user-1');

        expect(result).toEqual(mockStats);
        expect(mockUsageService.getUsageStats).toHaveBeenCalledWith('user-1');
      });
    });
  });

  describe('Trial Management', () => {
    describe('startTrial', () => {
      it('should create trial subscription', async () => {
        const mockDate = new Date('2024-01-01');
        vi.setSystemTime(mockDate);

        mockPrisma.subscription.upsert.mockResolvedValue({});

        await service.startTrial('user-1', PlanType.PRO);

        const expectedTrialEnd = new Date('2024-01-15'); // 14 days later

        expect(mockPrisma.subscription.upsert).toHaveBeenCalledWith({
          where: { userId: 'user-1' },
          update: {
            planType: PlanType.PRO,
            status: SubscriptionStatus.TRIALING,
            trialEndsAt: expectedTrialEnd,
            currentPeriodEnd: expectedTrialEnd
          },
          create: {
            userId: 'user-1',
            lemonSqueezyId: expect.stringContaining('trial_user-1_'),
            planType: PlanType.PRO,
            status: SubscriptionStatus.TRIALING,
            trialEndsAt: expectedTrialEnd,
            currentPeriodEnd: expectedTrialEnd
          }
        });

        vi.useRealTimers();
      });
    });

    describe('checkTrialStatus', () => {
      it('should return active trial status', async () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 7);

        mockPrisma.subscription.findUnique.mockResolvedValue({
          status: SubscriptionStatus.TRIALING,
          trialEndsAt: futureDate
        });

        const result = await service.checkTrialStatus('user-1');

        expect(result.isInTrial).toBe(true);
        expect(result.hasExpired).toBe(false);
        expect(result.daysRemaining).toBe(7);
      });

      it('should return expired trial status', async () => {
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 1);

        mockPrisma.subscription.findUnique.mockResolvedValue({
          status: SubscriptionStatus.TRIALING,
          trialEndsAt: pastDate
        });

        const result = await service.checkTrialStatus('user-1');

        expect(result.isInTrial).toBe(false);
        expect(result.hasExpired).toBe(true);
      });

      it('should handle user without trial', async () => {
        mockPrisma.subscription.findUnique.mockResolvedValue(null);

        const result = await service.checkTrialStatus('user-1');

        expect(result.isInTrial).toBe(false);
        expect(result.hasExpired).toBe(false);
      });
    });

    describe('expireTrial', () => {
      it('should downgrade trial to free plan', async () => {
        mockPrisma.subscription.findUnique.mockResolvedValue({
          status: SubscriptionStatus.TRIALING
        });
        mockPrisma.subscription.update.mockResolvedValue({});

        await service.expireTrial('user-1');

        expect(mockPrisma.subscription.update).toHaveBeenCalledWith({
          where: { userId: 'user-1' },
          data: {
            planType: PlanType.FREE,
            status: SubscriptionStatus.ACTIVE,
            trialEndsAt: null
          }
        });
      });

      it('should not update non-trial subscriptions', async () => {
        mockPrisma.subscription.findUnique.mockResolvedValue({
          status: SubscriptionStatus.ACTIVE
        });

        await service.expireTrial('user-1');

        expect(mockPrisma.subscription.update).not.toHaveBeenCalled();
      });
    });
  });

  describe('Utility Methods', () => {
    describe('getUserPlanType', () => {
      it('should return user plan type', async () => {
        mockPrisma.subscription.findUnique.mockResolvedValue({
          planType: PlanType.STARTER
        });

        const result = await service.getUserPlanType('user-1');

        expect(result).toBe(PlanType.STARTER);
      });

      it('should return FREE for user without subscription', async () => {
        mockPrisma.subscription.findUnique.mockResolvedValue(null);

        const result = await service.getUserPlanType('user-1');

        expect(result).toBe(PlanType.FREE);
      });
    });

    describe('hasActiveSubscription', () => {
      it('should return true for active subscription', async () => {
        mockPrisma.subscription.findUnique.mockResolvedValue({
          status: SubscriptionStatus.ACTIVE
        });

        const result = await service.hasActiveSubscription('user-1');

        expect(result).toBe(true);
      });

      it('should return true for trialing subscription', async () => {
        mockPrisma.subscription.findUnique.mockResolvedValue({
          status: SubscriptionStatus.TRIALING
        });

        const result = await service.hasActiveSubscription('user-1');

        expect(result).toBe(true);
      });

      it('should return false for canceled subscription', async () => {
        mockPrisma.subscription.findUnique.mockResolvedValue({
          status: SubscriptionStatus.CANCELED
        });

        const result = await service.hasActiveSubscription('user-1');

        expect(result).toBe(false);
      });
    });

    describe('getLimitNotifications', () => {
      it('should delegate to enforcement service', async () => {
        const mockNotifications = [
          { type: 'workspace_count', percentage: 80, limit: 3, current: 2 }
        ];
        mockEnforcementService.checkLimitNotifications.mockResolvedValue(mockNotifications);

        const result = await service.getLimitNotifications('user-1');

        expect(result).toEqual(mockNotifications);
      });
    });

    describe('validateAction', () => {
      it('should delegate to enforcement service', async () => {
        await service.validateAction('user-1', ResourceAction.CREATE_WORKSPACE);

        expect(mockEnforcementService.validateAction).toHaveBeenCalledWith(
          'user-1',
          ResourceAction.CREATE_WORKSPACE,
          undefined
        );
      });
    });
  });
});