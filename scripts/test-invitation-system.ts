#!/usr/bin/env tsx

/**
 * Test script for workspace invitation system
 * This script validates the core invitation functionality
 */

import { prisma } from '../src/lib/db';
import { WorkspaceRole } from '../src/lib/db';
import { processPendingInvitations, getPendingInvitations, cleanupExpiredInvitations } from '../src/lib/auth/invitation-utils';

async function testInvitationSystem() {
  console.log('🧪 Testing Workspace Invitation System...\n');

  try {
    // Create test users
    console.log('1. Creating test users...');
    const owner = await prisma.user.create({
      data: {
        email: 'owner@test.com',
        name: 'Test Owner'
      }
    });

    const invitee = await prisma.user.create({
      data: {
        email: 'invitee@test.com',
        name: 'Test Invitee'
      }
    });

    console.log('✅ Created test users');

    // Create test workspace
    console.log('2. Creating test workspace...');
    const workspace = await prisma.workspace.create({
      data: {
        name: 'Test Workspace',
        slug: 'test-workspace-' + Date.now(),
        ownerId: owner.id,
        planType: 'free',
        memberships: {
          create: {
            userId: owner.id,
            role: WorkspaceRole.OWNER
          }
        }
      }
    });

    console.log('✅ Created test workspace');

    // Create invitation
    console.log('3. Creating invitation...');
    const invitation = await prisma.workspaceInvitation.create({
      data: {
        workspaceId: workspace.id,
        email: invitee.email,
        role: WorkspaceRole.ADMIN,
        invitedBy: owner.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      }
    });

    console.log('✅ Created invitation');

    // Test getPendingInvitations
    console.log('4. Testing getPendingInvitations...');
    const pendingInvitations = await getPendingInvitations(invitee.email);
    console.log(`Found ${pendingInvitations.length} pending invitations`);
    
    if (pendingInvitations.length !== 1) {
      throw new Error('Expected 1 pending invitation');
    }

    console.log('✅ getPendingInvitations works correctly');

    // Test processPendingInvitations
    console.log('5. Testing processPendingInvitations...');
    const result = await processPendingInvitations(invitee.id, invitee.email);
    console.log(`Processed ${result.processedCount} invitations`);

    if (result.processedCount !== 1) {
      throw new Error('Expected 1 processed invitation');
    }

    console.log('✅ processPendingInvitations works correctly');

    // Verify membership was created
    console.log('6. Verifying membership creation...');
    const membership = await prisma.workspaceMembership.findFirst({
      where: {
        workspaceId: workspace.id,
        userId: invitee.id
      }
    });

    if (!membership || membership.role !== WorkspaceRole.ADMIN) {
      throw new Error('Membership not created correctly');
    }

    console.log('✅ Membership created correctly');

    // Verify invitation was marked as accepted
    console.log('7. Verifying invitation acceptance...');
    const acceptedInvitation = await prisma.workspaceInvitation.findUnique({
      where: { id: invitation.id }
    });

    if (!acceptedInvitation?.accepted || !acceptedInvitation.acceptedAt) {
      throw new Error('Invitation not marked as accepted');
    }

    console.log('✅ Invitation marked as accepted');

    // Test expired invitation cleanup
    console.log('8. Testing expired invitation cleanup...');
    
    // Create expired invitation
    await prisma.workspaceInvitation.create({
      data: {
        workspaceId: workspace.id,
        email: 'expired@test.com',
        role: WorkspaceRole.MEMBER,
        invitedBy: owner.id,
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
      }
    });

    const cleanedCount = await cleanupExpiredInvitations();
    console.log(`Cleaned up ${cleanedCount} expired invitations`);

    if (cleanedCount !== 1) {
      throw new Error('Expected 1 expired invitation to be cleaned up');
    }

    console.log('✅ Expired invitation cleanup works correctly');

    // Cleanup test data
    console.log('9. Cleaning up test data...');
    await prisma.workspaceInvitation.deleteMany({
      where: { workspaceId: workspace.id }
    });
    await prisma.workspaceMembership.deleteMany({
      where: { workspaceId: workspace.id }
    });
    await prisma.workspace.delete({
      where: { id: workspace.id }
    });
    await prisma.user.deleteMany({
      where: { id: { in: [owner.id, invitee.id] } }
    });

    console.log('✅ Test data cleaned up');

    console.log('\n🎉 All tests passed! Invitation system is working correctly.');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testInvitationSystem();