'use client';

import { useEffect, useState } from 'react';

interface AuthLoadingStateProps {
  message?: string;
  showProgress?: boolean;
  timeout?: number;
  onTimeout?: () => void;
}

/**
 * Enhanced loading state component for authentication processes
 * Provides visual feedback and timeout handling
 */
export function AuthLoadingState({ 
  message = 'Authenticating...', 
  showProgress = true,
  timeout = 30000, // 30 seconds default
  onTimeout 
}: AuthLoadingStateProps) {
  const [progress, setProgress] = useState(0);
  const [timeoutReached, setTimeoutReached] = useState(false);

  useEffect(() => {
    if (!showProgress && !timeout) return;

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progressPercent = Math.min((elapsed / timeout) * 100, 100);
      
      setProgress(progressPercent);
      
      if (elapsed >= timeout) {
        setTimeoutReached(true);
        onTimeout?.();
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [timeout, onTimeout, showProgress]);

  if (timeoutReached) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-yellow-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-yellow-800">
              Authentication is taking longer than expected
            </p>
            <p className="text-sm text-yellow-700 mt-1">
              Please check your internet connection and try refreshing the page.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
      <div className="flex items-center">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3" aria-hidden="true"></div>
        <div className="flex-1">
          <p className="text-sm font-medium text-blue-800">
            {message}
          </p>
          {showProgress && (
            <div className="mt-2">
              <div className="bg-blue-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                  role="progressbar"
                  aria-valuenow={progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Authentication progress"
                ></div>
              </div>
              <p className="text-xs text-blue-600 mt-1">
                {progress < 50 ? 'Connecting to Google...' : 
                 progress < 80 ? 'Verifying credentials...' : 
                 'Setting up your session...'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Simple loading spinner component
 */
export function AuthSpinner({ size = 'md', className = '' }: { 
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  return (
    <div 
      className={`animate-spin rounded-full border-b-2 border-current ${sizeClasses[size]} ${className}`}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}