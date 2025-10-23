'use client';

import { useAuth } from '@/lib/hooks/use-auth';
import { SignOutButton } from '@/components/auth/SignOutButton';
import { WorkspaceSelector } from '@/components/workspace/WorkspaceSelector';
import { AuthStatusIndicator } from '@/components/auth/AuthStatusIndicator';

/**
 * Top navigation bar component
 * Shows user info, workspace context, and quick actions
 * 
 * Requirements: 5.1, 5.2, 6.5
 */
export function TopNavigation() {
  const { user, workspace, role } = useAuth();

  return (
    <header className="fixed top-0 left-0 right-0 bg-white shadow-sm border-b border-gray-200 z-50">
      <div className="flex items-center justify-between px-6 py-3">
        {/* Left side - Workspace info */}
        <div className="flex items-center space-x-4">
          <div className="lg:hidden">
            <h1 className="text-lg font-semibold text-gray-900">Sesari</h1>
          </div>
          
          {workspace && (
            <div className="hidden sm:block">
              <p className="text-sm text-gray-600">
                Current workspace: <span className="font-medium">{workspace.name}</span>
              </p>
            </div>
          )}
        </div>

        {/* Right side - User actions */}
        <div className="flex items-center space-x-4">
          {/* Authentication status */}
          <AuthStatusIndicator />
          
          {/* Workspace selector for mobile */}
          <div className="sm:hidden">
            <WorkspaceSelector />
          </div>
          
          {/* User info */}
          {user && (
            <div className="flex items-center space-x-3">
              {user.image && (
                <img 
                  src={user.image} 
                  alt={user.name} 
                  className="w-8 h-8 rounded-full"
                />
              )}
              <div className="hidden md:block">
                <p className="text-sm font-medium text-gray-900">
                  {user.name}
                </p>
                {role && (
                  <p className="text-xs text-gray-500 capitalize">
                    {role}
                  </p>
                )}
              </div>
            </div>
          )}
          
          {/* Sign out button */}
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}