'use client';

import { useSearchParams } from 'next/navigation';

const ERROR_MESSAGES: Record<string, { title: string; message: string; retryable: boolean }> = {
  Configuration: {
    title: 'Configuration Error',
    message: 'There is a problem with the server configuration. Please contact support.',
    retryable: false,
  },
  AccessDenied: {
    title: 'Access Denied',
    message: 'You do not have permission to sign in. Please contact your administrator.',
    retryable: false,
  },
  Verification: {
    title: 'Verification Error',
    message: 'The verification token has expired or is invalid. Please try signing in again.',
    retryable: true,
  },
  OAuthSignin: {
    title: 'OAuth Sign In Error',
    message: 'There was an error with the OAuth provider. Please try again.',
    retryable: true,
  },
  OAuthCallback: {
    title: 'OAuth Callback Error',
    message: 'There was an error during the OAuth callback. Please try signing in again.',
    retryable: true,
  },
  OAuthCreateAccount: {
    title: 'Account Creation Error',
    message: 'Could not create your account. Please try again or contact support.',
    retryable: true,
  },
  EmailCreateAccount: {
    title: 'Email Account Error',
    message: 'Could not create account with email. Please try a different method.',
    retryable: true,
  },
  Callback: {
    title: 'Callback Error',
    message: 'There was an error during authentication. Please try again.',
    retryable: true,
  },
  OAuthAccountNotLinked: {
    title: 'Account Not Linked',
    message: 'This account is already associated with another sign-in method. Please use your original sign-in method.',
    retryable: false,
  },
  EmailSignin: {
    title: 'Email Sign In Error',
    message: 'Could not send sign-in email. Please check your email address and try again.',
    retryable: true,
  },
  CredentialsSignin: {
    title: 'Invalid Credentials',
    message: 'The credentials you provided are incorrect. Please try again.',
    retryable: true,
  },
  SessionRequired: {
    title: 'Session Required',
    message: 'You must be signed in to access this page.',
    retryable: true,
  },
  Default: {
    title: 'Authentication Error',
    message: 'An unexpected error occurred during authentication. Please try again.',
    retryable: true,
  },
};

interface AuthErrorDisplayProps {
  title?: string;
  error?: string;
  onRetry?: () => Promise<void>
}

export function AuthErrorDisplay({ title: customTitle, error: customError, onRetry }: AuthErrorDisplayProps) {
  const searchParams = useSearchParams();
  
  let errorTitle;
  let errorMessage;
  let isRetryable;

  if (customTitle && customError) {
    // Use custom props for AuthGuard generated errors (e.g., insufficient role)
    errorTitle = customTitle;
    errorMessage = customError;
    isRetryable = !!onRetry;
  } else {
    // Fallback to reading NextAuth error codes from search params
    const errorCode = searchParams.get('error') || 'Default';
    const errorInfo = ERROR_MESSAGES[errorCode] || ERROR_MESSAGES.Default;

    errorTitle = errorInfo.title;
    errorMessage = errorInfo.message;
    isRetryable = errorInfo.retryable;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
              {/* Warning Icon */}
              <svg
                className="w-6 h-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            
            <h3 className="text-xl font-bold text-red-800 mb-2">
              {errorTitle}
            </h3>
            
            <p className="text-red-700 text-base">
              {errorMessage}
            </p>
          </div>

          {isRetryable && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-start">
                {/* Info Icon */}
                <svg className="w-5 h-5 text-blue-600 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-blue-800 text-sm font-medium">
                    This error might be temporary.
                  </p>
                  <p className="text-blue-700 text-sm mt-1">
                    Please try signing in again. If the problem persists, check your internet connection.
                  </p>
                </div>
              </div>
            </div>
          )}

          {!isRetryable && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <div className="flex items-start">
                {/* Cross Icon */}
                <svg className="w-5 h-5 text-gray-600 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-12.728 12.728m0-12.728l12.728 12.728" />
                </svg>
                <div>
                  <p className="text-gray-800 text-sm font-medium">
                    Action required
                  </p>
                  <p className="text-gray-700 text-sm mt-1">
                    Please contact support or check your account settings.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="text-xs text-gray-500 pt-2">
            Details: {customError || searchParams.get('error') || 'No error code provided'}
          </div>
        </div>
      </div>
    </div>
  );
}







// 'use client';

// import { useSearchParams } from 'next/navigation';

// const ERROR_MESSAGES: Record<string, { title: string; message: string; retryable: boolean }> = {
//   Configuration: {
//     title: 'Configuration Error',
//     message: 'There is a problem with the server configuration. Please contact support.',
//     retryable: false,
//   },
//   AccessDenied: {
//     title: 'Access Denied',
//     message: 'You do not have permission to sign in. Please contact your administrator.',
//     retryable: false,
//   },
//   Verification: {
//     title: 'Verification Error',
//     message: 'The verification token has expired or is invalid. Please try signing in again.',
//     retryable: true,
//   },
//   OAuthSignin: {
//     title: 'OAuth Sign In Error',
//     message: 'There was an error with the OAuth provider. Please try again.',
//     retryable: true,
//   },
//   OAuthCallback: {
//     title: 'OAuth Callback Error',
//     message: 'There was an error during the OAuth callback. Please try signing in again.',
//     retryable: true,
//   },
//   OAuthCreateAccount: {
//     title: 'Account Creation Error',
//     message: 'Could not create your account. Please try again or contact support.',
//     retryable: true,
//   },
//   EmailCreateAccount: {
//     title: 'Email Account Error',
//     message: 'Could not create account with email. Please try a different method.',
//     retryable: true,
//   },
//   Callback: {
//     title: 'Callback Error',
//     message: 'There was an error during authentication. Please try again.',
//     retryable: true,
//   },
//   OAuthAccountNotLinked: {
//     title: 'Account Not Linked',
//     message: 'This account is already associated with another sign-in method. Please use your original sign-in method.',
//     retryable: false,
//   },
//   EmailSignin: {
//     title: 'Email Sign In Error',
//     message: 'Could not send sign-in email. Please check your email address and try again.',
//     retryable: true,
//   },
//   CredentialsSignin: {
//     title: 'Invalid Credentials',
//     message: 'The credentials you provided are incorrect. Please try again.',
//     retryable: true,
//   },
//   SessionRequired: {
//     title: 'Session Required',
//     message: 'You must be signed in to access this page.',
//     retryable: true,
//   },
//   Default: {
//     title: 'Authentication Error',
//     message: 'An unexpected error occurred during authentication. Please try again.',
//     retryable: true,
//   },
// };

// export function AuthErrorDisplay() {
//   const searchParams = useSearchParams();
//   const error = searchParams.get('error') || 'Default';
//   
//   const errorInfo = ERROR_MESSAGES[error] || ERROR_MESSAGES.Default;

//   return (
//     <div className="text-center space-y-4">
//       <div className="bg-red-50 border border-red-200 rounded-md p-4">
//         <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
//           <svg
//             className="w-6 h-6 text-red-600"
//             fill="none"
//             stroke="currentColor"
//             viewBox="0 0 24 24"
//           >
//             <path
//               strokeLinecap="round"
//               strokeLinejoin="round"
//               strokeWidth={2}
//               d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
//             />
//           </svg>
//         </div>
//         
//         <h3 className="text-lg font-medium text-red-800 mb-2">
//           {errorInfo.title}
//         </h3>
//         
//         <p className="text-red-700 text-sm">
//           {errorInfo.message}
//         </p>
//       </div>

//       {errorInfo.retryable && (
//         <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
//           <div className="flex items-start">
//             <svg className="w-5 h-5 text-blue-600 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
//             </svg>
//             <div>
//               <p className="text-blue-800 text-sm font-medium">
//                 This error is usually temporary
//               </p>
//               <p className="text-blue-700 text-sm mt-1">
//                 Please try signing in again. If the problem persists, check your internet connection or try again later.
//               </p>
//             </div>
//           </div>
//         </div>
//       )}

//       {!errorInfo.retryable && (
//         <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
//           <div className="flex items-start">
//             <svg className="w-5 h-5 text-gray-600 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-12.728 12.728m0-12.728l12.728 12.728" />
//             </svg>
//             <div>
//               <p className="text-gray-800 text-sm font-medium">
//                 Unable to resolve automatically
//               </p>
//               <p className="text-gray-700 text-sm mt-1">
//                 Please contact support if you continue to experience this issue.
//               </p>
//             </div>
//           </div>
//         </div>
//       )}

//       <div className="text-xs text-gray-500">
//         Error code: {error}
//       </div>
//     </div>
//   );
// }