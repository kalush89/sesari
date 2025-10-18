'use client';

import { useSession } from 'next-auth/react';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import { AuthSpinner } from './AuthLoadingState';

interface AuthStatusIndicatorProps {
  showDetails?: boolean;
  className?: string;
}

/**
 * Component that shows the current authentication and workspace status
 * Useful for debugging and providing user feedback
 */
export function AuthStatusIndicator({ 
  showDetails = false, 
  className = '' 
}: AuthStatusIndicatorProps) {
  const { data: session, status } = useSession();
  const { currentWorkspace, isLoading: workspaceLoading, error: workspaceError } = useWorkspaceStore();

  const getStatusColor = () => {
    if (status === 'loading' || workspaceLoading) return 'yellow';
    if (status === 'authenticated' && currentWorkspace) return 'green';
    if (status === 'authenticated' && !currentWorkspace) return 'yellow';
    return 'red';
  };

  const getStatusMessage = () => {
    if (status === 'loading') return 'Checking authentication...';
    if (workspaceLoading) return 'Loading workspace...';
    if (status === 'unauthenticated') return 'Not signed in';
    if (status === 'authenticated' && !currentWorkspace) return 'No workspace selected';
    if (status === 'authenticated' && currentWorkspace) return 'Ready';
    return 'Unknown status';
  };

  const statusColor = getStatusColor();
  const statusMessage = getStatusMessage();

  const colorClasses = {
    green: 'bg-green-100 text-green-800 border-green-200',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    red: 'bg-red-100 text-red-800 border-red-200'
  };

  const dotClasses = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500'
  };

  return (
    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm border ${colorClasses[statusColor]} ${className}`}>
      <div className={`w-2 h-2 rounded-full mr-2 ${dotClasses[statusColor]} ${
        (status === 'loading' || workspaceLoading) ? 'animate-pulse' : ''
      }`}></div>
      
      {(status === 'loading' || workspaceLoading) && (
        <AuthSpinner size="sm" className="mr-2" />
      )}
      
      <span className="font-medium">{statusMessage}</span>
      
      {showDetails && (
        <div className="ml-2 text-xs opacity-75">
          {session?.user?.email && `(${session.user.email})`}
          {currentWorkspace && ` • ${currentWorkspace.name}`}
        </div>
      )}
      
      {workspaceError && (
        <div className="ml-2">
          <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      )}
    </div>
  );
}

/**
 * Compact version for use in navigation or headers
 */
export function AuthStatusDot({ className = '' }: { className?: string }) {
  const { status } = useSession();
  const { currentWorkspace, isLoading: workspaceLoading } = useWorkspaceStore();

  const getStatusColor = () => {
    if (status === 'loading' || workspaceLoading) return 'yellow';
    if (status === 'authenticated' && currentWorkspace) return 'green';
    if (status === 'authenticated' && !currentWorkspace) return 'yellow';
    return 'red';
  };

  const statusColor = getStatusColor();
  
  const colorClasses = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500'
  };

  return (
    <div 
      className={`w-3 h-3 rounded-full ${colorClasses[statusColor]} ${
        (status === 'loading' || workspaceLoading) ? 'animate-pulse' : ''
      } ${className}`}
      title={`Authentication status: ${statusColor}`}
      role="status"
      aria-label={`Authentication status: ${statusColor}`}
    ></div>
  );
}