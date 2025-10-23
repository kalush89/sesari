import { describe, it, expect } from 'vitest';
import {
  PlanType,
  SubscriptionStatus,
  PLAN_LIMITS,
  Feature,
  BillingError,
  type Subscription,
  type UsageTracking,
  type UsageStats,
  type TrialStatus
} from '../billing';

describe('Billing Types', () => {
  describe('PlanType enum', () => {
    it('should have correct plan types', () => {
      expect(PlanType.FREE).toBe('FREE');
      expect(PlanType.STARTER).toBe('STARTER');
      expect(PlanType.PRO).toBe('PRO');
    });
  });

  describe('SubscriptionStatus enum', () => {
    it('should have correct subscription statuses', () => {
      expect(SubscriptionStatus.ACTIVE).toBe('ACTIVE');
      expect(SubscriptionStatus.TRIALING).toBe('TRIALING');
      expect(SubscriptionStatus.PAST_DUE).toBe('PAST_DUE');
      expect(SubscriptionStatus.CANCELED).toBe('CANCELED');
      expect(SubscriptionStatus.UNPAID).toBe('UNPAID');
    });
  });

  describe('PLAN_LIMITS configuration', () => {
    it('should have correct FREE plan limits', () => {
      const freeLimits = PLAN_LIMITS[PlanType.FREE];
      expect(freeLimits.workspaces).toBe(1);
      expect(freeLimits.kpisPerWorkspace).toBe(5);
      expect(freeLimits.integrations).toBe(false);
      expect(freeLimits.aiFeatures).toBe(false);
      expect(freeLimits.trialDays).toBe(0);
    });

    it('should have correct STARTER plan limits', () => {
      const starterLimits = PLAN_LIMITS[PlanType.STARTER];
      expect(starterLimits.workspaces).toBe(3);
      expect(starterLimits.kpisPerWorkspace).toBe(15);
      expect(starterLimits.integrations).toBe(true);
      expect(starterLimits.aiFeatures).toBe(true);
      expect(starterLimits.trialDays).toBe(14);
    });

    it('should have correct PRO plan limits', () => {
      const proLimits = PLAN_LIMITS[PlanType.PRO];
      expect(proLimits.workspaces).toBe(-1); // unlimited
      expect(proLimits.kpisPerWorkspace).toBe(-1); // unlimited
      expect(proLimits.integrations).toBe(true);
      expect(proLimits.aiFeatures).toBe(true);
      expect(proLimits.trialDays).toBe(14);
    });
  });

  describe('Subscription interface', () => {
    it('should have correct structure', () => {
      const subscription: Subscription = {
        id: 'sub_123',
        userId: 'user_123',
        lemonSqueezyId: 'ls_123',
        planType: PlanType.STARTER,
        status: SubscriptionStatus.ACTIVE,
        trialEndsAt: new Date(),
        currentPeriodEnd: new Date(),
        cancelAtPeriodEnd: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      expect(subscription.planType).toBe(PlanType.STARTER);
      expect(subscription.status).toBe(SubscriptionStatus.ACTIVE);
    });
  });

  describe('UsageTracking interface', () => {
    it('should have correct structure', () => {
      const usage: UsageTracking = {
        id: 'usage_123',
        workspaceId: 'workspace_123',
        kpiCount: 5,
        updatedAt: new Date()
      };

      expect(usage.kpiCount).toBe(5);
      expect(usage.workspaceId).toBe('workspace_123');
    });
  });

  describe('Feature enum', () => {
    it('should have correct feature types', () => {
      expect(Feature.INTEGRATIONS).toBe('integrations');
      expect(Feature.AI_FEATURES).toBe('ai_features');
      expect(Feature.MULTIPLE_WORKSPACES).toBe('multiple_workspaces');
      expect(Feature.UNLIMITED_KPIS).toBe('unlimited_kpis');
    });
  });

  describe('BillingError enum', () => {
    it('should have correct error types', () => {
      expect(BillingError.SUBSCRIPTION_NOT_FOUND).toBe('subscription_not_found');
      expect(BillingError.PLAN_LIMIT_EXCEEDED).toBe('plan_limit_exceeded');
      expect(BillingError.FEATURE_NOT_AVAILABLE).toBe('feature_not_available');
    });
  });
});