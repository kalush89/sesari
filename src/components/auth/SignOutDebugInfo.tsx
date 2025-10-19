'use client';

import { useSession } from 'next-auth/react';
import { useAuth } from '@/lib/hooks/use-auth';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';

/**
 * Debug component to show current authentication and workspace state
 * Helps troubleshoot sign-out issues
 */
export function SignOutDebugInfo() {
  const { data: session, status } = useSession();
  const { isAuthenticated, user, workspace } = useAuth();
  const { currentWorkspace, userRole, permissions } = useWorkspaceStore();

  return (
    <div className="bg-gray-100 p-4 rounded-lg text-sm font-mono">
      <h3 className="font-bold mb-2">Debug Info:</h3>
      
      <div className="space-y-1">
        <div>NextAuth Status: <span className="font-semibold">{status}</span></div>
        <div>NextAuth Session: <span className="font-semibold">{session ? 'Present' : 'None'}</span></div>
        <div>NextAuth User: <span className="font-semibold">{session?.user?.email || 'None'}</span></div>
        
        <div className="border-t pt-2 mt-2">
          <div>useAuth Authenticated: <span className="font-semibold">{isAuthenticated.toString()}</span></div>
          <div>useAuth User: <span className="font-semibold">{user?.email || 'None'}</span></div>
          <div>useAuth Workspace: <span className="font-semibold">{workspace?.name || 'None'}</span></div>
        </div>
        
        <div className="border-t pt-2 mt-2">
          <div>Store Workspace: <span className="font-semibold">{currentWorkspace?.name || 'None'}</span></div>
          <div>Store Role: <span className="font-semibold">{userRole || 'None'}</span></div>
          <div>Store Permissions: <span className="font-semibold">{permissions.length}</span></div>
        </div>
        
        <div className="border-t pt-2 mt-2">
          <div>LocalStorage Keys: <span className="font-semibold">
            {typeof window !== 'undefined' ? Object.keys(localStorage).join(', ') || 'None' : 'N/A'}
          </span></div>
        </div>
      </div>
    </div>
  );
}