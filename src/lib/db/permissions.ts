import { WorkspaceRole, Permission, ROLE_PERMISSIONS } from './index';

/**
 * Check if a role has a specific permission (string version for compatibility)
 */
export function checkPermission(role: WorkspaceRole, permission: string): boolean {
  // Convert string permission to enum if it's a valid permission
  const permissionEnum = Object.values(Permission).find(p => p === permission);
  
  if (!permissionEnum) {
    return false;
  }
  
  return ROLE_PERMISSIONS[role].includes(permissionEnum);
}

/**
 * Check if a role has a specific permission (enum version - preferred)
 */
export function hasRolePermission(role: WorkspaceRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: WorkspaceRole): Permission[] {
  return ROLE_PERMISSIONS[role];
}

/**
 * Check if a role has any of the specified permissions
 */
export function hasAnyPermission(role: WorkspaceRole, permissions: Permission[]): boolean {
  const rolePermissions = ROLE_PERMISSIONS[role];
  return permissions.some(permission => rolePermissions.includes(permission));
}

/**
 * Check if a role has all of the specified permissions
 */
export function hasAllPermissions(role: WorkspaceRole, permissions: Permission[]): boolean {
  const rolePermissions = ROLE_PERMISSIONS[role];
  return permissions.every(permission => rolePermissions.includes(permission));
}