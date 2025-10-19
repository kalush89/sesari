'use client';

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';
import { Session } from 'next-auth';
import { ReactNode, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';

interface SessionProviderProps {
  children: ReactNode;
  session?: Session | null;
}

/**
 * Internal component to handle session changes and workspace synchronization
 */
function SessionHandler({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const { clearWorkspaceContext, refreshWorkspaces, currentWorkspace, isLoading } = useWorkspaceStore();

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
      // Refresh workspace context when session is established
      // Only if we don't have current workspace or session workspace changed
      const extendedSession = session as any;
      const sessionWorkspaceId = extendedSession?.workspaceId;
      
      // Only refresh if we truly need to - avoid unnecessary API calls
      const needsRefresh = !currentWorkspace || 
        (sessionWorkspaceId && currentWorkspace.id !== sessionWorkspaceId);
      
      if (needsRefresh) {
        // Debounce the refresh to avoid multiple rapid calls
        const timeoutId = setTimeout(() => {
          refreshWorkspaces().catch(error => {
            console.error('Failed to refresh workspace context:', error);
          });
        }, 100);

        return () => clearTimeout(timeoutId);
      }
    }
  }, [status, session?.user?.id, clearWorkspaceContext, refreshWorkspaces, currentWorkspace, isLoading]);

  return <>{children}</>;
}

/**
 * Enhanced session provider wrapper for NextAuth
 * Provides authentication context and handles workspace synchronization
 * 
 * Requirements: 5.1, 5.2, 6.5
 */
export function SessionProvider({ children, session }: SessionProviderProps) {
  return (
    <NextAuthSessionProvider 
      session={session}
      // Reduce automatic refetching to improve performance
      refetchOnWindowFocus={false}
      // Refetch session every 15 minutes instead of 5
      refetchInterval={15 * 60}
      // Don't refetch when coming back online
      refetchWhenOffline={false}
    >
      <SessionHandler>
        {children}
      </SessionHandler>
    </NextAuthSessionProvider>
  );
}