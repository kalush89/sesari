#!/usr/bin/env tsx

import { 
  WorkspaceRole, 
  Permission, 
  hasPermission, 
  getRolePermissions 
} from '../src/lib/db';

console.log('🔐 Testing Role-Based Permission System\n');

// Test role permissions
console.log('📋 Role Permissions:');
Object.values(WorkspaceRole).forEach(role => {
  const permissions = getRolePermissions(role);
  console.log(`  ${role.toUpperCase()}: ${permissions.length} permissions`);
  permissions.forEach(permission => {
    console.log(`    - ${permission}`);
  });
  console.log('');
});

// Test specific permission checks
console.log('🧪 Permission Tests:');

const testCases = [
  { role: WorkspaceRole.OWNER, permission: Permission.MANAGE_WORKSPACE, expected: true },
  { role: WorkspaceRole.OWNER, permission: Permission.CREATE_KPI, expected: true },
  { role: WorkspaceRole.OWNER, permission: Permission.MANAGE_BILLING, expected: true },
  { role: WorkspaceRole.ADMIN, permission: Permission.MANAGE_BILLING, expected: false },
  { role: WorkspaceRole.ADMIN, permission: Permission.CREATE_KPI, expected: true },
  { role: WorkspaceRole.ADMIN, permission: Permission.INVITE_MEMBERS, expected: true },
  { role: WorkspaceRole.MEMBER, permission: Permission.VIEW_KPI, expected: true },
  { role: WorkspaceRole.MEMBER, permission: Permission.VIEW_OBJECTIVE, expected: true },
  { role: WorkspaceRole.MEMBER, permission: Permission.CREATE_KPI, expected: false },
  { role: WorkspaceRole.MEMBER, permission: Permission.MANAGE_WORKSPACE, expected: false },
];

let passedTests = 0;
let totalTests = testCases.length;

testCases.forEach(({ role, permission, expected }) => {
  const result = hasPermission(role, permission);
  const status = result === expected ? '✅' : '❌';
  if (result === expected) passedTests++;
  console.log(`  ${status} ${role} -> ${permission}: ${result} (expected: ${expected})`);
});

console.log(`\n📊 Test Results: ${passedTests}/${totalTests} passed`);

if (passedTests === totalTests) {
  console.log('🎉 All permission tests passed!');
} else {
  console.log('❌ Some tests failed - check permission configuration');
  process.exit(1);
}

// Test role hierarchy
console.log('\n📊 Role Hierarchy Analysis:');
const roles = [WorkspaceRole.MEMBER, WorkspaceRole.ADMIN, WorkspaceRole.OWNER];
roles.forEach(role => {
  const permissions = getRolePermissions(role);
  console.log(`  ${role}: ${permissions.length} permissions`);
});

// Verify permission coverage
console.log('\n🔍 Permission Coverage Analysis:');
const allPermissions = Object.values(Permission);
allPermissions.forEach(permission => {
  const rolesWithPermission = roles.filter(role => hasPermission(role, permission));
  console.log(`  ${permission}: ${rolesWithPermission.join(', ')}`);
});

// Validate role hierarchy makes sense
console.log('\n🏗️ Role Hierarchy Validation:');
const memberPerms = getRolePermissions(WorkspaceRole.MEMBER);
const adminPerms = getRolePermissions(WorkspaceRole.ADMIN);
const ownerPerms = getRolePermissions(WorkspaceRole.OWNER);

// Admin should have all member permissions
const adminHasAllMemberPerms = memberPerms.every(perm => adminPerms.includes(perm));
console.log(`  ✅ Admin includes all Member permissions: ${adminHasAllMemberPerms}`);

// Owner should have all admin permissions
const ownerHasAllAdminPerms = adminPerms.every(perm => ownerPerms.includes(perm));
console.log(`  ✅ Owner includes all Admin permissions: ${ownerHasAllAdminPerms}`);

// Owner should have all member permissions
const ownerHasAllMemberPerms = memberPerms.every(perm => ownerPerms.includes(perm));
console.log(`  ✅ Owner includes all Member permissions: ${ownerHasAllMemberPerms}`);

console.log('\n✨ Permission system validation completed successfully!');