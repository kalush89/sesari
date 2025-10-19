'use client';

import { useEffect, ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';

interface WorkspaceProviderProps {
  children: ReactNode;
}

/**
 * Workspace context provider that initializes and manages workspace state
 * Should be used within SessionProvider
 */
export function WorkspaceProvider({ children }: WorkspaceProviderProps) {
  const { data: session, status } = useSession();
  const { 
    refreshWorkspaces, 
    clearWorkspaceContext, 
    currentWorkspace,
    isLoading,
    setLoading 
  } = useWorkspaceStore();

  useEffect(() => {
    if (status === 'loading') {
      return; // Still loading session
    }

    if (status === 'unauthenticated') {
      // Clear workspace context when user signs out
      clearWorkspaceContext();
      return;
    }

    if (status === 'authenticated' && session?.user && !isLoading) {
      // Initialize workspace context when user is authenticated
      const initializeWorkspaces = async () => {
        try {
          await refreshWorkspaces();
        } catch (error) {
          console.error('Failed to initialize workspace context:', error);
        }
      };

      // Only initialize if we don't have a current workspace or if session workspace changed
      const extendedSession = session as any;
      const needsInitialization = !currentWorkspace || 
        (extendedSession?.workspaceId && currentWorkspace.id !== extendedSession.workspaceId);
      
      if (needsInitialization) {
        initializeWorkspaces();
      }
    }
  }, [status, session?.user?.id, refreshWorkspaces, clearWorkspaceContext, currentWorkspace, isLoading]);

  // Show loading state while initializing workspace context
  if (status === 'authenticated' && isLoading && !currentWorkspace) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading workspace...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Hook to check if workspace context is ready
 */
export function useWorkspaceReady() {
  const { status } = useSession();
  const { currentWorkspace, isLoading } = useWorkspaceStore();
  
  return {
    isReady: status === 'authenticated' && !isLoading && currentWorkspace !== null,
    isLoading: status === 'loading' || isLoading,
    hasWorkspace: currentWorkspace !== null,
  };
}