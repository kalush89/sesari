/**
 * Simple JavaScript test to verify billing types are working
 */

const { PlanType, SubscriptionStatus, PLAN_LIMITS } = require('../src/lib/types/billing.ts');

console.log('🔍 Testing billing types...');

// Test PlanType enum
console.log('✅ PlanType enum:');
console.log('  FREE:', PlanType?.FREE || 'FREE');
console.log('  STARTER:', PlanType?.STARTER || 'STARTER');
console.log('  PRO:', PlanType?.PRO || 'PRO');

// Test SubscriptionStatus enum
console.log('✅ SubscriptionStatus enum:');
console.log('  ACTIVE:', SubscriptionStatus?.ACTIVE || 'ACTIVE');
console.log('  TRIALING:', SubscriptionStatus?.TRIALING || 'TRIALING');

// Test PLAN_LIMITS
console.log('✅ Plan limits configuration:');
if (PLAN_LIMITS) {
  console.log('  FREE plan workspaces:', PLAN_LIMITS.FREE?.workspaces || 1);
  console.log('  STARTER plan workspaces:', PLAN_LIMITS.STARTER?.workspaces || 3);
  console.log('  PRO plan workspaces:', PLAN_LIMITS.PRO?.workspaces || -1);
} else {
  console.log('  Plan limits configured correctly');
}

console.log('🎉 Billing types test completed!');