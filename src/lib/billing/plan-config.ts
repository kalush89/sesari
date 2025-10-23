/**
 * Plan configuration and validation utilities
 */

import { PlanType, PlanLimits, Feature, PLAN_LIMITS } from '@/lib/types/billing';

/**
 * Get plan limits for a specific plan type
 */
export function getPlanLimits(planType: PlanType): PlanLimits {
  return PLAN_LIMITS[planType];
}

/**
 * Check if a plan supports a specific feature
 */
export function planSupportsFeature(planType: PlanType, feature: Feature): boolean {
  const limits = getPlanLimits(planType);
  
  switch (feature) {
    case Feature.INTEGRATIONS:
      return limits.integrations;
    case Feature.AI_FEATURES:
      return limits.aiFeatures;
    case Feature.MULTIPLE_WORKSPACES:
      return limits.workspaces > 1 || limits.workspaces === -1;
    case Feature.UNLIMITED_KPIS:
      return limits.kpisPerWorkspace === -1;
    default:
      return false;
  }
}

/**
 * Check if usage is within plan limits
 */
export function isWithinWorkspaceLimit(planType: PlanType, currentCount: number): boolean {
  const limits = getPlanLimits(planType);
  return limits.workspaces === -1 || currentCount < limits.workspaces;
}

/**
 * Check if KPI count is within plan limits
 */
export function isWithinKpiLimit(planType: PlanType, currentCount: number): boolean {
  const limits = getPlanLimits(planType);
  return limits.kpisPerWorkspace === -1 || currentCount < limits.kpisPerWorkspace;
}

/**
 * Calculate usage percentage for a given limit
 */
export function calculateUsagePercentage(current: number, limit: number): number {
  if (limit === -1) return 0; // Unlimited
  if (limit === 0) return 100; // No allowance
  return Math.min((current / limit) * 100, 100);
}

/**
 * Check if usage is approaching limit (80% threshold)
 */
export function isApproachingLimit(current: number, limit: number): boolean {
  if (limit === -1) return false; // Unlimited
  return calculateUsagePercentage(current, limit) >= 80;
}

/**
 * Get suggested upgrade plan based on current usage
 */
export function getSuggestedUpgradePlan(
  currentPlan: PlanType,
  workspaceCount: number,
  maxKpiCount: number
): PlanType | null {
  // If already on PRO, no upgrade available
  if (currentPlan === PlanType.PRO) {
    return null;
  }

  // Check if STARTER would be sufficient
  if (currentPlan === PlanType.FREE) {
    const starterLimits = getPlanLimits(PlanType.STARTER);
    if (
      workspaceCount <= starterLimits.workspaces &&
      maxKpiCount <= starterLimits.kpisPerWorkspace
    ) {
      return PlanType.STARTER;
    }
  }

  // Otherwise suggest PRO
  return PlanType.PRO;
}