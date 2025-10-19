'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/use-auth';
import { WorkspaceRole, Permission } from '@/lib/db';
import { AuthLoadingWrapper } from './AuthLoadingWrapper';
import { AuthErrorDisplay } from './AuthErrorDisplay';

interface AuthGuardProps {
  children: ReactNode;
  requireAuth?: boolean;
  requireWorkspace?: boolean;
  requiredRole?: WorkspaceRole;
  requiredPermissions?: Permission[];
  requireAnyPermission?: Permission[];
  redirectTo?: string;
  fallback?: ReactNode;
  errorFallback?: ReactNode;
}

/**
 * Authentication guard component that protects routes and components
 * Handles authentication, workspace access, and permission checking
 * 
 * Requirements: 5.1, 5.2, 5.4, 3.1, 3.2, 3.3, 3.4, 3.5
 */
export function AuthGuard({
  children,
  requireAuth = true,
  requireWorkspace = true,
  requiredRole,
  requiredPermissions = [],
  requireAnyPermission = [],
  redirectTo = '/signin',
  fallback,
  errorFallback,
}: AuthGuardProps) {
  const router = useRouter();
  const { 
    isAuthenticated, 
    isLoading, 
    role, 
    permissions,
    workspace,
    isWorkspaceLoading,
    workspaceError 
  } = useAuth();

  // Redirect to sign-in if authentication is required but user is not authenticated
  useEffect(() => {
    if (requireAuth && !isLoading && !isAuthenticated) {
      router.push(redirectTo);
    }
  }, [requireAuth, isLoading, isAuthenticated, router, redirectTo]);

  // Don't render anything if redirecting
  if (requireAuth && !isLoading && !isAuthenticated) {
    return null;
  }

  // Show loading wrapper for authentication and workspace loading
  if (isLoading || (requireWorkspace && isWorkspaceLoading)) {
    return (
      <AuthLoadingWrapper 
        requireWorkspace={requireWorkspace}
        fallback={fallback}
        errorFallback={errorFallback}
      >
        {children}
      </AuthLoadingWrapper>
    );
  }

  // Check workspace requirement
  if (requireWorkspace && !workspace) {
    return errorFallback || (
      <AuthErrorDisplay 
        error="No workspace available. Please contact support."
        title="Access Denied"
      />
    );
  }

  // Check role requirement
  if (requiredRole && role) {
    const roleHierarchy = {
      [WorkspaceRole.MEMBER]: 1,
      [WorkspaceRole.ADMIN]: 2,
      [WorkspaceRole.OWNER]: 3,
    };

    if (roleHierarchy[role] < roleHierarchy[requiredRole]) {
      return errorFallback || (
        <AuthErrorDisplay 
          error={`This action requires ${requiredRole} role or higher. You have ${role} role.`}
          title="Insufficient Permissions"
        />
      );
    }
  }

  // Check required permissions (all must be present)
  if (requiredPermissions.length > 0) {
    const hasAllPermissions = requiredPermissions.every(permission => 
      permissions.includes(permission)
    );

    if (!hasAllPermissions) {
      const missingPermissions = requiredPermissions.filter(permission => 
        !permissions.includes(permission)
      );

      return errorFallback || (
        <AuthErrorDisplay 
          error={`Missing required permissions: ${missingPermissions.join(', ')}`}
          title="Access Denied"
        />
      );
    }
  }

  // Check any permission requirement (at least one must be present)
  if (requireAnyPermission.length > 0) {
    const hasAnyPermission = requireAnyPermission.some(permission => 
      permissions.includes(permission)
    );

    if (!hasAnyPermission) {
      return errorFallback || (
        <AuthErrorDisplay 
          error={`This action requires one of: ${requireAnyPermission.join(', ')}`}
          title="Access Denied"
        />
      );
    }
  }

  // All checks passed, render children
  return <>{children}</>;
}

/**
 * Higher-order component that wraps a component with authentication guard
 */
export function withAuthGuard<P extends object>(
  Component: React.ComponentType<P>,
  guardOptions: Omit<AuthGuardProps, 'children'> = {}
) {
  const GuardedComponent = (props: P) => (
    <AuthGuard {...guardOptions}>
      <Component {...props} />
    </AuthGuard>
  );

  GuardedComponent.displayName = `withAuthGuard(${Component.displayName || Component.name})`;
  
  return GuardedComponent;
}

/**
 * Simple authentication check component for conditional rendering
 */
export function AuthCheck({
  children,
  fallback = null,
  requireAuth = true,
  requireWorkspace = false,
  requiredRole,
  requiredPermissions = [],
  requireAnyPermission = [],
}: {
  children: ReactNode;
  fallback?: ReactNode;
  requireAuth?: boolean;
  requireWorkspace?: boolean;
  requiredRole?: WorkspaceRole;
  requiredPermissions?: Permission[];
  requireAnyPermission?: Permission[];
}) {
  const { isAuthenticated, role, permissions, workspace } = useAuth();

  // Check authentication
  if (requireAuth && !isAuthenticated) {
    return <>{fallback}</>;
  }

  // Check workspace
  if (requireWorkspace && !workspace) {
    return <>{fallback}</>;
  }

  // Check role
  if (requiredRole && role) {
    const roleHierarchy = {
      [WorkspaceRole.MEMBER]: 1,
      [WorkspaceRole.ADMIN]: 2,
      [WorkspaceRole.OWNER]: 3,
    };

    if (roleHierarchy[role] < roleHierarchy[requiredRole]) {
      return <>{fallback}</>;
    }
  }

  // Check required permissions
  if (requiredPermissions.length > 0) {
    const hasAllPermissions = requiredPermissions.every(permission => 
      permissions.includes(permission)
    );

    if (!hasAllPermissions) {
      return <>{fallback}</>;
    }
  }

  // Check any permission
  if (requireAnyPermission.length > 0) {
    const hasAnyPermission = requireAnyPermission.some(permission => 
      permissions.includes(permission)
    );

    if (!hasAnyPermission) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
}