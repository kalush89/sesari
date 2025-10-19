'use client';

import { signOut } from 'next-auth/react';
import { useState } from 'react';

interface SimpleSignOutButtonProps {
  className?: string;
  children?: React.ReactNode;
}

/**
 * Simplified sign-out button that focuses on reliable sign-out functionality
 * This bypasses complex workspace cleanup to ensure sign-out always works
 */
export function SimpleSignOutButton({ className, children }: SimpleSignOutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSignOut = async () => {
    try {
      setIsLoading(true);
      
      // Clear all local storage immediately
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (error) {
        console.warn('Failed to clear storage:', error);
      }
      
      // Use NextAuth signOut with immediate redirect
      await signOut({
        callbackUrl: '/signin',
        redirect: true,
      });
      
    } catch (error) {
      console.error('Sign out error:', error);
      
      // Force redirect if NextAuth fails
      window.location.href = '/signin';
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleSignOut}
      disabled={isLoading}
      className={className || "bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-turned"}
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