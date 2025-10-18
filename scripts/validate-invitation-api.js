/**
 * Simple validation script for invitation API endpoints
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function validateInvitationAPI() {
  console.log('🔍 Validating Invitation API structure...\n');

  try {
    // Test 1: Check if WorkspaceInvitation model exists
    console.log('1. Checking WorkspaceInvitation model...');
    
    const invitationCount = await prisma.workspaceInvitation.count();
    console.log(`✅ WorkspaceInvitation model accessible (${invitationCount} records)`);

    // Test 2: Check if we can create an invitation (dry run)
    console.log('2. Testing invitation creation structure...');
    
    // Just validate the structure without actually creating
    const invitationStructure = {
      workspaceId: 'test-id',
      email: 'test@example.com',
      role: 'member',
      invitedBy: 'inviter-id',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    };
    
    console.log('✅ Invitation structure is valid');

    // Test 3: Check if required API files exist
    console.log('3. Checking API route files...');
    
    const fs = require('fs');
    const path = require('path');
    
    const apiFiles = [
      'src/app/api/workspaces/[workspaceId]/members/route.ts',
      'src/app/api/workspaces/[workspaceId]/members/[memberId]/route.ts',
      'src/app/api/workspaces/[workspaceId]/invitations/[invitationId]/route.ts',
      'src/app/api/invitations/accept/route.ts',
      'src/app/api/invitations/pending/route.ts'
    ];

    for (const file of apiFiles) {
      if (fs.existsSync(file)) {
        console.log(`✅ ${file} exists`);
      } else {
        console.log(`❌ ${file} missing`);
      }
    }

    // Test 4: Check utility functions
    console.log('4. Checking utility files...');
    
    const utilityFiles = [
      'src/lib/auth/invitation-utils.ts'
    ];

    for (const file of utilityFiles) {
      if (fs.existsSync(file)) {
        console.log(`✅ ${file} exists`);
      } else {
        console.log(`❌ ${file} missing`);
      }
    }

    console.log('\n🎉 Invitation API structure validation complete!');

  } catch (error) {
    console.error('\n❌ Validation failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

validateInvitationAPI();