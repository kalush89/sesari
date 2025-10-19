'use client';

import { useState } from 'react';

interface ForceSignOutButtonProps {
  className?: string;
  children?: React.ReactNode;
}

/**
 * Force sign-out button that directly calls NextAuth API endpoints
 * This bypasses all client-side logic and forces a server-side sign-out
 */
export function ForceSignOutButton({ className, children }: ForceSignOutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleForceSignOut = async () => {
    try {
      setIsLoading(true);
      
      // Clear all client-side storage first
      try {
        localStorage.clear();
        sessionStorage.clear();
        
        // Clear all cookies by setting them to expire
        document.cookie.split(";").forEach((c) => {
          const eqPos = c.indexOf("=");
          const name = eqPos > -1 ? c.substr(0, eqPos) : c;
          document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
          document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=" + window.location.hostname;
        });
      } catch (error) {
        console.warn('Failed to clear client storage:', error);
      }
      
      // Call NextAuth signout API directly
      const response = await fetch('/api/auth/signout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          callbackUrl: '/signin',
        }),
      });
      
      if (response.ok) {
        // Force redirect to signin
        window.location.href = '/signin';
      } else {
        throw new Error('SignOut API call failed');
      }
      
    } catch (error) {
      console.error('Force sign out error:', error);
      
      // If everything fails, just redirect to signin
      window.location.href = '/signin';
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleForceSignOut}
      disabled={isLoading}
      className={className || "bg-red-800 hover:bg-red-900 text-white px-4 py-2 rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"}
    >
      {isLoading ? (
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          Force signing out...
        </div>
      ) : (
        children || 'Force Sign Out'
      )}
    </button>
  );
}