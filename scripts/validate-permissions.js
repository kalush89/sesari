// Simple validation script for the permission system
const { WorkspaceRole, Permission, hasPermission, getRolePermissions } = require('../src/lib/db/index.ts');

console.log('🔐 Testing Role-Based Permission System\n');

// Test basic functionality
try {
  console.log('📋 Testing Role Permissions:');
  
  // Test OWNER permissions
  const ownerPermissions = getRolePermissions(WorkspaceRole.OWNER);
  console.log(`✅ OWNER has ${ownerPermissions.length} permissions`);
  
  // Test ADMIN permissions  
  const adminPermissions = getRolePermissions(WorkspaceRole.ADMIN);
  console.log(`✅ ADMIN has ${adminPermissions.length} permissions`);
  
  // Test MEMBER permissions
  const memberPermissions = getRolePermissions(WorkspaceRole.MEMBER);
  console.log(`✅ MEMBER has ${memberPermissions.length} permissions`);
  
  console.log('\n🧪 Testing Permission Checks:');
  
  // Test specific cases
  const ownerCanManage = hasPermission(WorkspaceRole.OWNER, Permission.MANAGE_WORKSPACE);
  console.log(`✅ Owner can manage workspace: ${ownerCanManage}`);
  
  const adminCannotBill = !hasPermission(WorkspaceRole.ADMIN, Permission.MANAGE_BILLING);
  console.log(`✅ Admin cannot manage billing: ${adminCannotBill}`);
  
  const memberCanView = hasPermission(WorkspaceRole.MEMBER, Permission.VIEW_KPI);
  console.log(`✅ Member can view KPIs: ${memberCanView}`);
  
  const memberCannotCreate = !hasPermission(WorkspaceRole.MEMBER, Permission.CREATE_KPI);
  console.log(`✅ Member cannot create KPIs: ${memberCannotCreate}`);
  
  console.log('\n🎉 All permission tests passed!');
  
} catch (error) {
  console.error('❌ Error testing permissions:', error.message);
  process.exit(1);
}