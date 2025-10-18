'use client';

import { signIn, getSession } from 'next-auth/react';
import { useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface SignInError {
  type: 'oauth' | 'network' | 'session' | 'unknown';
  message: string;
  retryable: boolean;
}

export function SignInForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<SignInError | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';

  const handleGoogleSignIn = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await signIn('google', {
        callbackUrl,
        redirect: false,
      });

      if (result?.error) {
        // Handle specific OAuth errors
        let errorInfo: SignInError;
        switch (result.error) {
          case 'OAuthSignin':
          case 'OAuthCallback':
          case 'OAuthCreateAccount':
            errorInfo = {
              type: 'oauth',
              message: 'There was an issue with Google sign-in. Please try again.',
              retryable: true,
            };
            break;
          case 'AccessDenied':
            errorInfo = {
              type: 'oauth',
              message: 'Access was denied. Please ensure you have the necessary permissions.',
              retryable: false,
            };
            break;
          case 'Configuration':
            errorInfo = {
              type: 'oauth',
              message: 'There is a configuration issue. Please contact support.',
              retryable: false,
            };
            break;
          default:
            errorInfo = {
              type: 'unknown',
              message: 'Failed to sign in with Google. Please try again.',
              retryable: true,
            };
        }
        setError(errorInfo);
        return;
      }

      // Check if sign in was successful
      if (result?.ok) {
        // Wait for session to be established with timeout
        const sessionCheckTimeout = setTimeout(() => {
          setError({
            type: 'session',
            message: 'Sign-in is taking longer than expected. Please try refreshing the page.',
            retryable: true,
          });
          setIsLoading(false);
        }, 10000); // 10 second timeout

        try {
          // Poll for session establishment
          let attempts = 0;
          const maxAttempts = 10;
          
          while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 500));
            const session = await getSession();
            
            if (session) {
              clearTimeout(sessionCheckTimeout);
              router.push(callbackUrl);
              return;
            }
            attempts++;
          }
          
          // If we get here, session wasn't established
          clearTimeout(sessionCheckTimeout);
          setError({
            type: 'session',
            message: 'Session could not be established. Please try signing in again.',
            retryable: true,
          });
        } catch (sessionError) {
          clearTimeout(sessionCheckTimeout);
          console.error('Session check error:', sessionError);
          setError({
            type: 'session',
            message: 'There was an issue establishing your session. Please try again.',
            retryable: true,
          });
        }
      }
    } catch (err) {
      console.error('Sign in error:', err);
      
      // Check if it's a network error
      const isNetworkError = err instanceof TypeError && err.message.includes('fetch');
      
      setError({
        type: isNetworkError ? 'network' : 'unknown',
        message: isNetworkError 
          ? 'Network connection issue. Please check your internet connection and try again.'
          : 'An unexpected error occurred. Please try again.',
        retryable: true,
      });
    } finally {
      setIsLoading(false);
    }
  }, [callbackUrl, router]);

  const handleRetry = useCallback(() => {
    setRetryCount(prev => prev + 1);
    handleGoogleSignIn();
  }, [handleGoogleSignIn]);

  return (
    <div className="space-y-6">
      {error && (
        <div className={`border rounded-md p-4 ${
          error.type === 'network' 
            ? 'bg-yellow-50 border-yellow-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-start">
            <div className="flex-shrink-0">
              {error.type === 'network' ? (
                <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <div className="ml-3 flex-1">
              <p className={`text-sm font-medium ${
                error.type === 'network' ? 'text-yellow-800' : 'text-red-800'
              }`}>
                {error.message}
              </p>
              {error.retryable && (
                <button
                  onClick={handleRetry}
                  disabled={isLoading}
                  className={`mt-2 text-sm font-medium underline hover:no-underline disabled:opacity-50 disabled:cursor-not-allowed ${
                    error.type === 'network' ? 'text-yellow-700' : 'text-red-700'
                  }`}
                >
                  Try again
                </button>
              )}
              {retryCount > 0 && (
                <p className="mt-1 text-xs text-gray-500">
                  Attempt {retryCount + 1}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <button
        onClick={handleGoogleSignIn}
        disabled={isLoading}
        className="w-full flex justify-center items-center px-4 py-3 border border-gray-300 rounded-md shadow-sm bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
        aria-label="Sign in with Google"
      >
        {isLoading ? (
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600 mr-3" aria-hidden="true"></div>
            <span>Signing in...</span>
          </div>
        ) : (
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span>Continue with Google</span>
          </div>
        )}
      </button>

      {/* Loading progress indicator */}
      {isLoading && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
          <div className="flex items-center">
            <div className="animate-pulse w-2 h-2 bg-blue-600 rounded-full mr-2"></div>
            <p className="text-sm text-blue-800">
              Connecting to Google...
            </p>
          </div>
        </div>
      )}

      <div className="text-center">
        <p className="text-sm text-gray-600">
          By signing in, you agree to our{' '}
          <a href="/terms" className="text-blue-600 hover:text-blue-700 underline">
            terms of service
          </a>{' '}
          and{' '}
          <a href="/privacy" className="text-blue-600 hover:text-blue-700 underline">
            privacy policy
          </a>.
        </p>
      </div>
    </div>
  );
}