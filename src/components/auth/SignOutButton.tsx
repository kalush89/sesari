'use client';

import { signOut } from 'next-auth/react';
import { useState } from 'react';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';

interface SignOutButtonProps {
  className?: string;
  children?: React.ReactNode;
}

export function SignOutButton({ className, children }: SignOutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { clearWorkspaceContext } = useWorkspaceStore();

  const handleSignOut = async () => {
    try {
      setIsLoading(true);
      
      // Clear workspace context immediately
      clearWorkspaceContext();
      
      // Clear local storage to ensure clean state
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (storageError) {
        console.warn('Failed to clear storage:', storageError);
      }
      
      // Use NextAuth signOut - this should handle everything
      console.log('Attempting NextAuth signOut...');
      
      const result = await signOut({
        callbackUrl: '/signin',
        redirect: false, // Handle redirect manually for better control
      });
      
      console.log('NextAuth signOut completed:', result);
      
      // Force redirect to signin page
      window.location.href = '/signin';
      
    } catch (error) {
      console.error('Sign out error:', error);
      
      // If NextAuth signOut fails, force redirect anyway
      clearWorkspaceContext();
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (storageError) {
        console.warn('Failed to clear storage in error handler:', storageError);
      }
      
      // Force redirect to signin
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