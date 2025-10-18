'use client';

import { ReactNode } from 'react';
import { WorkspaceRole, Permission } from '@/lib/db';
import { 
  usePermission, 
  useAnyPermission, 
  useAllPermissions, 
  useHasRole,
  useUserRole
} from '@/lib/auth/permission-hooks';

interface PermissionGateProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface SinglePermissionGateProps extends PermissionGateProps {
  permission: Permission;
}

interface MultiplePermissionGateProps extends PermissionGateProps {
  permissions: Permission[];
  requireAll?: boolean; // If true, user must have ALL permissions. If false, user needs ANY permission
}

interface RoleGateProps extends PermissionGateProps {
  role: WorkspaceRole;
}

interface MinimumRoleGateProps extends PermissionGateProps {
  minimumRole: WorkspaceRole;
}

/**
 * Component that renders children only if user has the specified permission
 */
export function PermissionGate({ 
  permission, 
  children, 
  fallback = null 
}: SinglePermissionGateProps) {
  const hasRequiredPermission = usePermission(permission);
  
  return hasRequiredPermission ? <>{children}</> : <>{fallback}</>;
}

/**
 * Component that renders children only if user has the required permissions
 */
export function MultiPermissionGate({ 
  permissions, 
  requireAll = false,
  children, 
  fallback = null 
}: MultiplePermissionGateProps) {
  const hasRequiredPermissions = requireAll 
    ? useAllPermissions(permissions)
    : useAnyPermission(permissions);
  
  return hasRequiredPermissions ? <>{children}</> : <>{fallback}</>;
}

/**
 * Component that renders children only if user has the specified role
 */
export function RoleGate({ 
  role, 
  children, 
  fallback = null 
}: RoleGateProps) {
  const hasRequiredRole = useHasRole(role);
  
  return hasRequiredRole ? <>{children}</> : <>{fallback}</>;
}

/**
 * Component that renders children only if user has minimum required role
 * Role hierarchy: MEMBER < ADMIN < OWNER
 */
export function MinimumRoleGate({ 
  minimumRole, 
  children, 
  fallback = null 
}: MinimumRoleGateProps) {
  const currentRole = useUserRole();
  
  if (!currentRole) {
    return <>{fallback}</>;
  }

  const roleHierarchy = {
    [WorkspaceRole.MEMBER]: 1,
    [WorkspaceRole.ADMIN]: 2,
    [WorkspaceRole.OWNER]: 3
  };

  const hasMinimumRole = roleHierarchy[currentRole] >= roleHierarchy[minimumRole];
  
  return hasMinimumRole ? <>{children}</> : <>{fallback}</>;
}

/**
 * Component that renders children only for workspace owners
 */
export function OwnerOnlyGate({ children, fallback = null }: PermissionGateProps) {
  return (
    <RoleGate role={WorkspaceRole.OWNER} fallback={fallback}>
      {children}
    </RoleGate>
  );
}

/**
 * Component that renders children only for admins and owners
 */
export function AdminGate({ children, fallback = null }: PermissionGateProps) {
  return (
    <MinimumRoleGate minimumRole={WorkspaceRole.ADMIN} fallback={fallback}>
      {children}
    </MinimumRoleGate>
  );
}

/**
 * Component that renders different content based on user permissions
 */
interface ConditionalRenderProps {
  permission?: Permission;
  permissions?: Permission[];
  requireAll?: boolean;
  role?: WorkspaceRole;
  minimumRole?: WorkspaceRole;
  children: {
    allowed: ReactNode;
    denied: ReactNode;
  };
}

export function ConditionalRender({
  permission,
  permissions,
  requireAll = false,
  role,
  minimumRole,
  children
}: ConditionalRenderProps) {
  let hasAccess = false;

  if (permission) {
    hasAccess = usePermission(permission);
  } else if (permissions) {
    hasAccess = requireAll 
      ? useAllPermissions(permissions)
      : useAnyPermission(permissions);
  } else if (role) {
    hasAccess = useHasRole(role);
  } else if (minimumRole) {
    const currentRole = useUserRole();
    
    if (currentRole) {
      const roleHierarchy = {
        [WorkspaceRole.MEMBER]: 1,
        [WorkspaceRole.ADMIN]: 2,
        [WorkspaceRole.OWNER]: 3
      };
      hasAccess = roleHierarchy[currentRole] >= roleHierarchy[minimumRole];
    }
  }

  return <>{hasAccess ? children.allowed : children.denied}</>;
}