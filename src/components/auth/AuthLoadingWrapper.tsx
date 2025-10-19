'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/lib/hooks/use-auth';
import { AuthLoadingState } from './AuthLoadingState';
import { AuthErrorDisplay } from './AuthErrorDisplay';

interface AuthLoadingWrapperProps {
  children: ReactNode;
  requireWorkspace?: boolean;
  fallback?: ReactNode;
  errorFallback?: ReactNode;
}

/**
 * Wrapper component that handles authentication and workspace loading states
 * Shows appropriate loading/error states while authentication is being established
 * 
 * Requirements: 5.1, 5.2, 6.1, 6.2, 7.1, 7.2, 7.3, 7.4, 7.5
 */
export function AuthLoadingWrapper({ 
  children, 
  requireWorkspace = true,
  fallback,
  errorFallback 
}: AuthLoadingWrapperProps) {
  const { 
    isAuthenticated, 
    isLoading, 
    isWorkspaceLoading, 
    workspace, 
    workspaceError,
    refreshWorkspaces 
  } = useAuth();

  // Show loading state while authentication is being established
  if (isLoading) {
    return fallback || <AuthLoadingState message="Authenticating..." />;
  }

  // Show loading state while workspace context is being loaded
  if (isAuthenticated && isWorkspaceLoading) {
    return fallback || <AuthLoadingState message="Loading workspace..." />;
  }

  // Show error state if workspace loading failed
  if (isAuthenticated && workspaceError) {
    return errorFallback || (
      <AuthErrorDisplay 
        error={workspaceError}
        onRetry={refreshWorkspaces}
        title="Workspace Error"
      />
    );
  }

  // Show error state if workspace is required but not available
  if (isAuthenticated && requireWorkspace && !workspace) {
    return errorFallback || (
      <AuthErrorDisplay 
        error="No workspace available. Please contact support or create a new workspace."
        onRetry={refreshWorkspaces}
        title="No Workspace"
      />
    );
  }

  // Authentication and workspace context is ready
  return <>{children}</>;
}

/**
 * Higher-order component that wraps a component with authentication loading wrapper
 */
export function withAuthLoading<P extends object>(
  Component: React.ComponentType<P>,
  options: {
    requireWorkspace?: boolean;
    fallback?: ReactNode;
    errorFallback?: ReactNode;
  } = {}
) {
  const WrappedComponent = (props: P) => (
    <AuthLoadingWrapper {...options}>
      <Component {...props} />
    </AuthLoadingWrapper>
  );

  WrappedComponent.displayName = `withAuthLoading(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}