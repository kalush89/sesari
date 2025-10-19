'use client';

import { signOut } from 'next-auth/react';
import { useState } from 'react';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';

interface DatabaseSignOutButtonProps {
  className?: string;
  children?: React.ReactNode;
}

/**
 * Sign-out button that properly handles database session cleanup
 * This addresses the root cause of the sign-out issue with database sessions
 */
export function DatabaseSignOutButton({ className, children }: DatabaseSignOutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { clearWorkspaceContext } = useWorkspaceStore();

  const handleSignOut = async () => {
    try {
      setIsLoading(true);
      
      console.log('🔄 Starting database-aware sign-out process...');
      
      // Step 1: Call custom signout API to delete database sessions
      try {
        const response = await fetch('/api/auth/signout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log('✅ Database session cleanup:', result);
        } else {
          console.warn('⚠️ Database session cleanup failed, continuing with signout');
        }
      } catch (cleanupError) {
        console.warn('⚠️ Custom signout cleanup failed:', cleanupError);
        // Continue with signout even if cleanup fails
      }
      
      // Step 2: Clear workspace context
      clearWorkspaceContext();
      
      // Step 3: Clear client-side storage
      try {
        localStorage.removeItem('workspace-context');
        sessionStorage.clear();
        console.log('✅ Client-side storage cleared');
      } catch (storageError) {
        console.warn('⚠️ Failed to clear storage:', storageError);
      }
      
      // Step 4: Call NextAuth signOut (this should now work properly)
      console.log('🚪 Calling NextAuth signOut...');
      
      await signOut({
        callbackUrl: '/signin',
        redirect: true, // Let NextAuth handle the redirect
      });
      
    } catch (error) {
      console.error('❌ Database sign-out failed:', error);
      
      // Fallback: force redirect even if signout fails
      clearWorkspaceContext();
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (storageError) {
        console.warn('Failed to clear storage in error handler:', storageError);
      }
      
      // Force redirect
      window.location.href = '/signin';
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleSignOut}
      disabled={isLoading}
      className={className || "bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"}
    >
      {isLoading ? (
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          Signing out...
        </div>
      ) : (
        children || 'Sign Out'
      )}
    </button>
  );
}