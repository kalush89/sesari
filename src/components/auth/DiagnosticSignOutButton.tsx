'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';
import { logDiagnostics, compareDiagnostics, DiagnosticResult } from '@/lib/auth/signout-diagnostics';

interface DiagnosticSignOutButtonProps {
  className?: string;
  children?: React.ReactNode;
}

/**
 * Diagnostic sign-out button that captures detailed state information
 * before and after sign-out attempts to help identify what's persisting
 */
export function DiagnosticSignOutButton({ className, children }: DiagnosticSignOutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [diagnostics, setDiagnostics] = useState<{
    before?: DiagnosticResult;
    after?: DiagnosticResult;
  }>({});

  const handleDiagnosticSignOut = async () => {
    try {
      setIsLoading(true);
      
      // Capture state before sign-out
      console.log('🔍 Capturing state BEFORE sign-out...');
      const beforeState = logDiagnostics('BEFORE Sign-Out');
      setDiagnostics(prev => ({ ...prev, before: beforeState }));
      
      // Attempt sign-out
      console.log('🚪 Attempting NextAuth sign-out...');
      await signOut({
        callbackUrl: '/signin',
        redirect: false, // Don't redirect so we can capture after state
      });
      
      // Wait a moment for state to update
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Capture state after sign-out
      console.log('🔍 Capturing state AFTER sign-out...');
      const afterState = logDiagnostics('AFTER Sign-Out');
      setDiagnostics(prev => ({ ...prev, after: afterState }));
      
      // Compare states
      if (beforeState && afterState) {
        compareDiagnostics(beforeState, afterState);
      }
      
      // Check if sign-out was successful
      const stillHasSession = Object.keys(afterState.cookies).some(key => 
        key.includes('next-auth') || key.includes('session')
      );
      
      const stillHasLocalStorage = Object.keys(afterState.localStorage).length > 0;
      
      if (stillHasSession || stillHasLocalStorage) {
        console.warn('⚠️ Sign-out may not have been complete!');
        console.log('Session cookies still present:', stillHasSession);
        console.log('LocalStorage still has data:', stillHasLocalStorage);
        
        // Force redirect anyway
        setTimeout(() => {
          window.location.href = '/signin';
        }, 2000);
      } else {
        console.log('✅ Sign-out appears successful, redirecting...');
        window.location.href = '/signin';
      }
      
    } catch (error) {
      console.error('❌ Diagnostic sign-out failed:', error);
      
      // Capture error state
      const errorState = logDiagnostics('ERROR State');
      setDiagnostics(prev => ({ ...prev, after: errorState }));
      
      // Force redirect
      window.location.href = '/signin';
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        onClick={handleDiagnosticSignOut}
        disabled={isLoading}
        className={className || "bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"}
      >
        {isLoading ? (
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            🔍 Diagnosing...
          </div>
        ) : (
          children || '🔍 Diagnostic Sign Out'
        )}
      </button>
      
      {diagnostics.before && diagnostics.after && (
        <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
          <p>✅ Diagnostic data captured - check console for details</p>
          <p>Before: {Object.keys(diagnostics.before.cookies).length} cookies, {Object.keys(diagnostics.before.localStorage).length} localStorage items</p>
          <p>After: {Object.keys(diagnostics.after.cookies).length} cookies, {Object.keys(diagnostics.after.localStorage).length} localStorage items</p>
        </div>
      )}
    </div>
  );
}