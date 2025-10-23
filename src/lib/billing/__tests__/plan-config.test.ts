/**
 * Unit tests for plan configuration utilities
 */

import { describe, it, expect } from 'vitest';
import {
  getPlanLimits,
  planSupportsFeature,
  isWithinWorkspaceLimit,
  isWithinKpiLimit,
  calculateUsagePercentage,
  isApproachingLimit,
  getSuggestedUpgradePlan
} from '../plan-config';
import { PlanType, Feature } from '@/lib/types/billing';

describe('Plan Configuration', () => {
  describe('getPlanLimits', () => {
    it('should return correct limits for FREE plan', () => {
      const limits = getPlanLimits(PlanType.FREE);
      expect(limits).toEqual({
        workspaces: 1,
        kpisPerWorkspace: 5,
        integrations: false,
        aiFeatures: false,
        trialDays: 0
      });
    });

    it('should return correct limits for STARTER plan', () => {
      const limits = getPlanLimits(PlanType.STARTER);
      expect(limits).toEqual({
        workspaces: 3,
        kpisPerWorkspace: 15,
        integrations: true,
        aiFeatures: true,
        trialDays: 14
      });
    });

    it('should return correct limits for PRO plan', () => {
      const limits = getPlanLimits(PlanType.PRO);
      expect(limits).toEqual({
        workspaces: -1,
        kpisPerWorkspace: -1,
        integrations: true,
        aiFeatures: true,
        trialDays: 14
      });
    });
  });

  describe('planSupportsFeature', () => {
    it('should correctly identify FREE plan feature support', () => {
      expect(planSupportsFeature(PlanType.FREE, Feature.INTEGRATIONS)).toBe(false);
      expect(planSupportsFeature(PlanType.FREE, Feature.AI_FEATURES)).toBe(false);
      expect(planSupportsFeature(PlanType.FREE, Feature.MULTIPLE_WORKSPACES)).toBe(false);
      expect(planSupportsFeature(PlanType.FREE, Feature.UNLIMITED_KPIS)).toBe(false);
    });

    it('should correctly identify STARTER plan feature support', () => {
      expect(planSupportsFeature(PlanType.STARTER, Feature.INTEGRATIONS)).toBe(true);
      expect(planSupportsFeature(PlanType.STARTER, Feature.AI_FEATURES)).toBe(true);
      expect(planSupportsFeature(PlanType.STARTER, Feature.MULTIPLE_WORKSPACES)).toBe(true);
      expect(planSupportsFeature(PlanType.STARTER, Feature.UNLIMITED_KPIS)).toBe(false);
    });

    it('should correctly identify PRO plan feature support', () => {
      expect(planSupportsFeature(PlanType.PRO, Feature.INTEGRATIONS)).toBe(true);
      expect(planSupportsFeature(PlanType.PRO, Feature.AI_FEATURES)).toBe(true);
      expect(planSupportsFeature(PlanType.PRO, Feature.MULTIPLE_WORKSPACES)).toBe(true);
      expect(planSupportsFeature(PlanType.PRO, Feature.UNLIMITED_KPIS)).toBe(true);
    });
  });

  describe('isWithinWorkspaceLimit', () => {
    it('should enforce FREE plan workspace limit', () => {
      expect(isWithinWorkspaceLimit(PlanType.FREE, 0)).toBe(true);
      expect(isWithinWorkspaceLimit(PlanType.FREE, 1)).toBe(false);
    });

    it('should enforce STARTER plan workspace limit', () => {
      expect(isWithinWorkspaceLimit(PlanType.STARTER, 2)).toBe(true);
      expect(isWithinWorkspaceLimit(PlanType.STARTER, 3)).toBe(false);
    });

    it('should allow unlimited workspaces for PRO plan', () => {
      expect(isWithinWorkspaceLimit(PlanType.PRO, 100)).toBe(true);
      expect(isWithinWorkspaceLimit(PlanType.PRO, 1000)).toBe(true);
    });
  });

  describe('isWithinKpiLimit', () => {
    it('should enforce FREE plan KPI limit', () => {
      expect(isWithinKpiLimit(PlanType.FREE, 4)).toBe(true);
      expect(isWithinKpiLimit(PlanType.FREE, 5)).toBe(false);
    });

    it('should enforce STARTER plan KPI limit', () => {
      expect(isWithinKpiLimit(PlanType.STARTER, 14)).toBe(true);
      expect(isWithinKpiLimit(PlanType.STARTER, 15)).toBe(false);
    });

    it('should allow unlimited KPIs for PRO plan', () => {
      expect(isWithinKpiLimit(PlanType.PRO, 100)).toBe(true);
      expect(isWithinKpiLimit(PlanType.PRO, 1000)).toBe(true);
    });
  });

  describe('calculateUsagePercentage', () => {
    it('should calculate correct percentage for limited plans', () => {
      expect(calculateUsagePercentage(2, 5)).toBe(40);
      expect(calculateUsagePercentage(5, 5)).toBe(100);
      expect(calculateUsagePercentage(6, 5)).toBe(100); // Capped at 100%
    });

    it('should return 0 for unlimited plans', () => {
      expect(calculateUsagePercentage(100, -1)).toBe(0);
    });

    it('should return 100 for zero limit', () => {
      expect(calculateUsagePercentage(1, 0)).toBe(100);
    });
  });

  describe('isApproachingLimit', () => {
    it('should detect when approaching 80% threshold', () => {
      expect(isApproachingLimit(4, 5)).toBe(true); // 80%
      expect(isApproachingLimit(3, 5)).toBe(false); // 60%
      expect(isApproachingLimit(5, 5)).toBe(true); // 100%
    });

    it('should return false for unlimited plans', () => {
      expect(isApproachingLimit(1000, -1)).toBe(false);
    });
  });

  describe('getSuggestedUpgradePlan', () => {
    it('should suggest STARTER for FREE users within STARTER limits', () => {
      const suggestion = getSuggestedUpgradePlan(PlanType.FREE, 2, 10);
      expect(suggestion).toBe(PlanType.STARTER);
    });

    it('should suggest PRO for FREE users exceeding STARTER limits', () => {
      const suggestion = getSuggestedUpgradePlan(PlanType.FREE, 5, 20);
      expect(suggestion).toBe(PlanType.PRO);
    });

    it('should suggest PRO for STARTER users', () => {
      const suggestion = getSuggestedUpgradePlan(PlanType.STARTER, 5, 20);
      expect(suggestion).toBe(PlanType.PRO);
    });

    it('should return null for PRO users', () => {
      const suggestion = getSuggestedUpgradePlan(PlanType.PRO, 10, 50);
      expect(suggestion).toBe(null);
    });
  });
});