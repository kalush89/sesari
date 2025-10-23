#!/usr/bin/env tsx

/**
 * Script to verify billing schema setup
 * Checks that the new tables and types are working correctly
 */

import { PrismaClient } from '@prisma/client';
import { PlanType, SubscriptionStatus } from '../src/lib/types/billing';

const prisma = new PrismaClient();

async function verifyBillingSchema() {
  console.log('🔍 Verifying billing schema setup...');

  try {
    // Test 1: Check if we can query the subscriptions table
    console.log('✅ Testing subscriptions table...');
    const subscriptions = await prisma.subscription.findMany();
    console.log(`   Found ${subscriptions.length} subscriptions`);

    // Test 2: Check if we can query the usage_tracking table
    console.log('✅ Testing usage_tracking table...');
    const usageRecords = await prisma.usageTracking.findMany();
    console.log(`   Found ${usageRecords.length} usage tracking records`);

    // Test 3: Verify enum values are working
    console.log('✅ Testing enum values...');
    console.log(`   PlanType.FREE: ${PlanType.FREE}`);
    console.log(`   SubscriptionStatus.ACTIVE: ${SubscriptionStatus.ACTIVE}`);

    // Test 4: Test creating a usage tracking record (if we have workspaces)
    const workspaces = await prisma.workspace.findMany();
    if (workspaces.length > 0) {
      const workspace = workspaces[0];
      console.log('✅ Testing usage tracking creation...');
      
      // Check if usage tracking already exists for this workspace
      const existingUsage = await prisma.usageTracking.findUnique({
        where: { workspaceId: workspace.id }
      });

      if (!existingUsage) {
        const newUsage = await prisma.usageTracking.create({
          data: {
            workspaceId: workspace.id,
            kpiCount: 0
          }
        });
        console.log(`   Created usage tracking for workspace: ${newUsage.id}`);
      } else {
        console.log(`   Usage tracking already exists for workspace: ${existingUsage.id}`);
      }
    }

    console.log('🎉 Billing schema verification completed successfully!');
    
  } catch (error) {
    console.error('❌ Billing schema verification failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run verification
verifyBillingSchema().catch(console.error);