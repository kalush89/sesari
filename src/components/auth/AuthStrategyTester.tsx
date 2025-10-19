'use client';

import { useState } from 'react';
import { signOut, signIn } from 'next-auth/react';

/**
 * Component to test different authentication strategies
 */
export function AuthStrategyTester() {
  const [isLoading, setIsLoading] = useState(false);

  const testDatabaseAuth = async () => {
    setIsLoading(true);
    try {
      // Sign out from current session
      await signOut({ redirect: false });
      
      // Sign in with database strategy (default)
      await signIn('google', { 
        callbackUrl: '/test-signout-debug',
        redirect: true 
      });
    } catch (error) {
      console.error('Database auth test failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearEverythingAndReload = async () => {
    setIsLoading(true);
    
    try {
      // Clear all storage
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear all cookies
      document.cookie.split(";").forEach((c) => {
        const eqPos = c.indexOf("=");
        const name = eqPos > -1 ? c.substr(0, eqPos).trim() : c.trim();
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
      });
      
      // Force reload
      window.location.reload();
    } catch (error) {
      console.error('Clear and reload failed:', error);
      window.location.reload();
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-lg font-semibold mb-4">Authentication Strategy Testing</h2>
      
      <div className="space-y-4">
        <div>
          <h3 className="font-medium mb-2">Current Issues Diagnosis:</h3>
          <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
            <li>Database session strategy might be persisting sessions</li>
            <li>Client-side state might be cached and restored</li>
            <li>Middleware might be interfering with sign-out flow</li>
            <li>Multiple session providers might be conflicting</li>
          </ul>
        </div>
        
        <div className="border-t pt-4">
          <h3 className="font-medium mb-2">Test Actions:</h3>
          <div className="space-y-2">
            <button
              onClick={clearEverythingAndReload}
              disabled={isLoading}
              className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors duration-200 disabled:opacity-50"
            >
              {isLoading ? 'Processing...' : '🧹 Clear Everything & Reload'}
            </button>
            
            <button
              onClick={() => window.location.href = '/api/auth/signout?callbackUrl=/signin'}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md transition-colors duration-200"
            >
              🔗 Direct API Sign-Out Link
            </button>
            
            <button
              onClick={() => {
                localStorage.clear();
                sessionStorage.clear();
                window.location.href = '/signin';
              }}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md transition-colors duration-200"
            >
              🚀 Clear Storage & Redirect
            </button>
          </div>
        </div>
        
        <div className="border-t pt-4">
          <h3 className="font-medium mb-2">Manual Verification:</h3>
          <ol className="text-sm text-gray-600 list-decimal list-inside space-y-1">
            <li>Open browser dev tools → Application tab</li>
            <li>Check Cookies, Local Storage, Session Storage</li>
            <li>Look for any NextAuth or workspace-related data</li>
            <li>Try navigating to /dashboard after "sign-out"</li>
            <li>Check if you're redirected to /signin or stay on dashboard</li>
          </ol>
        </div>
      </div>
    </div>
  );
}