'use client';

import { useState } from 'react';

interface NuclearSignOutButtonProps {
  className?: string;
  children?: React.ReactNode;
}

/**
 * Nuclear sign-out option that destroys everything and forces a complete reset
 * This is the most aggressive approach to ensure sign-out works
 */
export function NuclearSignOutButton({ className, children }: NuclearSignOutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleNuclearSignOut = async () => {
    try {
      setIsLoading(true);
      
      console.log('🚨 NUCLEAR SIGN-OUT INITIATED');
      
      // Step 1: Clear ALL browser storage
      try {
        // Clear localStorage
        localStorage.clear();
        console.log('✅ LocalStorage cleared');
        
        // Clear sessionStorage
        sessionStorage.clear();
        console.log('✅ SessionStorage cleared');
        
        // Clear IndexedDB (if any)
        if ('indexedDB' in window) {
          try {
            const databases = await indexedDB.databases();
            await Promise.all(
              databases.map(db => {
                if (db.name) {
                  return new Promise((resolve, reject) => {
                    const deleteReq = indexedDB.deleteDatabase(db.name!);
                    deleteReq.onsuccess = () => resolve(undefined);
                    deleteReq.onerror = () => reject(deleteReq.error);
                  });
                }
              })
            );
            console.log('✅ IndexedDB cleared');
          } catch (error) {
            console.warn('⚠️ IndexedDB clear failed:', error);
          }
        }
        
        // Clear ALL cookies
        document.cookie.split(";").forEach((c) => {
          const eqPos = c.indexOf("=");
          const name = eqPos > -1 ? c.substr(0, eqPos).trim() : c.trim();
          
          // Clear for current domain
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
          
          // Clear for parent domain
          const parts = window.location.hostname.split('.');
          if (parts.length > 1) {
            const parentDomain = '.' + parts.slice(-2).join('.');
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${parentDomain}`;
          }
        });
        console.log('✅ All cookies cleared');
        
      } catch (error) {
        console.error('❌ Storage clearing failed:', error);
      }
      
      // Step 2: Call multiple sign-out endpoints
      const signOutPromises = [
        // NextAuth signout
        fetch('/api/auth/signout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'callbackUrl=/signin'
        }).catch(e => console.warn('NextAuth signout failed:', e)),
        
        // Custom signout
        fetch('/api/auth/signout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }).catch(e => console.warn('Custom signout failed:', e)),
        
        // Session invalidation
        fetch('/api/auth/session', {
          method: 'DELETE',
        }).catch(e => console.warn('Session delete failed:', e)),
      ];
      
      await Promise.allSettled(signOutPromises);
      console.log('✅ All sign-out endpoints called');
      
      // Step 3: Force reload to clear any in-memory state
      console.log('🔄 Forcing page reload...');
      
      // Use replace to prevent back button issues
      window.location.replace('/signin');
      
    } catch (error) {
      console.error('❌ Nuclear sign-out failed:', error);
      
      // If everything fails, just force navigate
      window.location.replace('/signin');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleNuclearSignOut}
      disabled={isLoading}
      className={className || "bg-red-900 hover:bg-red-950 text-white px-4 py-2 rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed border-2 border-red-700"}
    >
      {isLoading ? (
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          🚨 Nuclear sign-out...
        </div>
      ) : (
        children || '🚨 Nuclear Sign Out'
      )}
    </button>
  );
}