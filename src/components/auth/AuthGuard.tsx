'use client';


import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/use-auth';
import { WorkspaceRole, Permission } from '@/lib/db';
import { AuthLoadingWrapper } from './AuthLoadingWrapper';
import { AuthErrorDisplay } from './AuthErrorDisplay';

interface AuthGuardProps {
  children: ReactNode;
  requireAuth?: boolean;
  requireWorkspace?: boolean;
  requiredRole?: WorkspaceRole;
  requiredPermissions?: Permission[];
  requireAnyPermission?: Permission[];
  redirectTo?: string;
  fallback?: ReactNode;
  errorFallback?: ReactNode;
}

/**
 * Loop-proof AuthGuard
 * Handles:
 * - Safe redirects
 * - Prevents loops on /signin
 * - Delays until session stabilizes
 * - Gracefully handles workspace and role requirements
 */
export function AuthGuard({
  children,
  requireAuth = true,
  requireWorkspace = true,
  requiredRole,
  requiredPermissions = [],
  requireAnyPermission = [],
  redirectTo = '/signin',
  fallback,
  errorFallback,
}: AuthGuardProps) {
  const router = useRouter();
  const {
    isAuthenticated,
    isLoading,
    role,
    permissions,
    workspace,
    isWorkspaceLoading,
    workspaceError,
  } = useAuth();

  const [hasRedirected, setHasRedirected] = useState(false);

  // -------------------------------
  // ✅ Prevent infinite redirect loop
  // -------------------------------
  console.log(workspace)
  useEffect(() => {
    if (!requireAuth || isLoading || hasRedirected) return;

    const currentPath = window.location.pathname;

    // Don’t redirect if already on the redirect page
    if (!isAuthenticated && currentPath !== redirectTo) {
      setHasRedirected(true);
      router.replace(redirectTo);
    }
  }, [requireAuth, isLoading, isAuthenticated, router, redirectTo, hasRedirected]);

  // -------------------------------
  // 🚫 Stop rendering when redirecting
  // -------------------------------
  if (requireAuth && !isLoading && !isAuthenticated) {
    return null;
  }

  // -------------------------------
  // 🌀 Loading states
  // -------------------------------
  if (isLoading || (requireWorkspace && isWorkspaceLoading)) {
    return (
      <AuthLoadingWrapper
        requireWorkspace={requireWorkspace}
        fallback={fallback}
        errorFallback={errorFallback}
      >
        {children}
      </AuthLoadingWrapper>
    );
  }

  // -------------------------------
  // ❌ Workspace missing
  // -------------------------------
  if (requireWorkspace && !workspace) {
    return (
      errorFallback || (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="max-w-md w-full bg-white shadow-sm rounded-lg p-6 border border-gray-200">
            <div className="text-center">
              <h2 className="text-xl font-medium text-gray-900 mb-4">No Workspace Found</h2>
              <p className="text-gray-600 mb-6">
                You don’t have access to any workspaces yet. This might be because:
              </p>
              <ul className="text-left text-sm text-gray-600 mb-6 space-y-2">
                <li>• You’re a new user and your workspace is still being created</li>
                <li>• There was an issue during account setup</li>
                <li>• You need to be invited to a workspace</li>
              </ul>
              <div className="space-y-3">
                <button
                  onClick={() => window.location.reload()}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors duration-200"
                >
                  Refresh Page
                </button>
                <Link
                  href="/debug-auth"
                  className="block w-full bg-gray-200 hover:bg-gray-300 text-gray-900 px-4 py-2 rounded-md transition-colors duration-200 text-center"
                >
                  Debug Information
                </Link>
              </div>
            </div>
          </div>
        </div>
      )
    );
  }

  // -------------------------------
  // ⚙️ Role validation
  // -------------------------------
  if (requiredRole && role) {
    const roleHierarchy = {
      [WorkspaceRole.MEMBER]: 1,
      [WorkspaceRole.ADMIN]: 2,
      [WorkspaceRole.OWNER]: 3,
    };

    if (
      !roleHierarchy[role] ||
      !roleHierarchy[requiredRole] ||
      roleHierarchy[role] < roleHierarchy[requiredRole]
    ) {
      return (
        errorFallback || (
          <AuthErrorDisplay
            error={`This action requires ${requiredRole} role or higher. You have ${role}.`}
            title="Insufficient Permissions"
          />
        )
      );
    }
  }

  // -------------------------------
  // 🔒 Permission checks
  // -------------------------------
  if (requiredPermissions.length > 0) {
    const hasAll = requiredPermissions.every((p) => permissions.includes(p));
    if (!hasAll) {
      const missing = requiredPermissions.filter((p) => !permissions.includes(p));
      return (
        errorFallback || (
          <AuthErrorDisplay
            error={`Missing permissions: ${missing.join(', ')}`}
            title="Access Denied"
          />
        )
      );
    }
  }

  if (requireAnyPermission.length > 0) {
    const hasAny = requireAnyPermission.some((p) => permissions.includes(p));
    if (!hasAny) {
      return (
        errorFallback || (
          <AuthErrorDisplay
            error={`Requires one of: ${requireAnyPermission.join(', ')}`}
            title="Access Denied"
          />
        )
      );
    }
  }

  // -------------------------------
  // ✅ All checks passed
  // -------------------------------
  return <>{children}</>;
}

/**
 * Higher-order wrapper
 */
export function withAuthGuard<P extends object>(
  Component: React.ComponentType<P>,
  guardOptions: Omit<AuthGuardProps, 'children'> = {}
) {
  const GuardedComponent = (props: P) => (
    <AuthGuard {...guardOptions}>
      <Component {...props} />
    </AuthGuard>
  );
  GuardedComponent.displayName = `withAuthGuard(${Component.displayName || Component.name})`;
  return GuardedComponent;
}


// import { ReactNode, useEffect } from 'react';
// import { useRouter } from 'next/navigation';
// import { useAuth } from '@/lib/hooks/use-auth';
// import { WorkspaceRole, Permission } from '@/lib/db';
// import { AuthLoadingWrapper } from './AuthLoadingWrapper';
// import { AuthErrorDisplay } from './AuthErrorDisplay';
// import Link from 'next/link';

// interface AuthGuardProps {
//   children: ReactNode;
//   requireAuth?: boolean;
//   requireWorkspace?: boolean;
//   requiredRole?: WorkspaceRole;
//   requiredPermissions?: Permission[];
//   requireAnyPermission?: Permission[];
//   redirectTo?: string;
//   fallback?: ReactNode;
//   errorFallback?: ReactNode;
// }

// /**
//  * Authentication guard component that protects routes and components
//  * Handles authentication, workspace access, and permission checking
//  * 
//  * Requirements: 5.1, 5.2, 5.4, 3.1, 3.2, 3.3, 3.4, 3.5
//  */
// export function AuthGuard({
//   children,
//   requireAuth = true,
//   requireWorkspace = true,
//   requiredRole,
//   requiredPermissions = [],
//   requireAnyPermission = [],
//   redirectTo = '/signin',
//   fallback,
//   errorFallback,
// }: AuthGuardProps) {
//   const router = useRouter();
//   const { 
//     isAuthenticated, 
//     isLoading, 
//     role, 
//     permissions,
//     workspace,
//     isWorkspaceLoading,
//     workspaceError 
//   } = useAuth();

// console.log("the workspace", workspace)
//   // Redirect to sign-in if authentication is required but user is not authenticated
//   useEffect(() => {
//     console.log("the workspace", workspace)
//     if (requireAuth && !isLoading && !isAuthenticated) {
//       router.push(redirectTo);
//     }
//   }, [requireAuth, isLoading, isAuthenticated, redirectTo]);

//   // Don't render anything if redirecting
//   if (requireAuth && !isLoading && !isAuthenticated) {
//     return null;
//   }

//   // Show loading wrapper for authentication and workspace loading
//   if (isLoading || (requireWorkspace && isWorkspaceLoading)) {
//     return (
//       <AuthLoadingWrapper 
//         requireWorkspace={requireWorkspace}
//         fallback={fallback}
//         errorFallback={errorFallback}
//       >
//         {children}
//       </AuthLoadingWrapper>
//     );
//   }

//   // Check workspace requirement
//   if (requireWorkspace && !workspace) {
//     return errorFallback || (
//       <div className="min-h-screen bg-gray-50 flex items-center justify-center">
//         <div className="max-w-md w-full bg-white shadow-sm rounded-lg p-6 border border-gray-200">
//           <div className="text-center">
//             <h2 className="text-xl font-medium text-gray-900 mb-4">
//               No Workspace Found
//             </h2>
//             <p className="text-gray-600 mb-6">
//               You don't have access to any workspaces yet. This might be because:
//             </p>
//             <ul className="text-left text-sm text-gray-600 mb-6 space-y-2">
//               <li>• You're a new user and your workspace is still being created</li>
//               <li>• There was an issue during account setup</li>
//               <li>• You need to be invited to a workspace</li>
//             </ul>
//             <div className="space-y-3">
//               <button
//                 onClick={() => window.location.reload()}
//                 className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors duration-200"
//               >
//                 Refresh Page
//               </button>
//               <Link
//                 href="/debug-auth"
//                 className="block w-full bg-gray-200 hover:bg-gray-300 text-gray-900 px-4 py-2 rounded-md transition-colors duration-200 text-center"
//               >
//                 Debug Information
//               </Link>
//             </div>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   // Check role requirement
//   if (requiredRole && role) {
//     const roleHierarchy = {
//       [WorkspaceRole.MEMBER]: 1,
//       [WorkspaceRole.ADMIN]: 2,
//       [WorkspaceRole.OWNER]: 3,
//     };

//     if (roleHierarchy[role] < roleHierarchy[requiredRole]) {
//       return errorFallback || (
//         <AuthErrorDisplay 
//           error={`This action requires ${requiredRole} role or higher. You have ${role} role.`}
//           title="Insufficient Permissions"
//         />
//       );
//     }
//   }

//   // Check required permissions (all must be present)
//   if (requiredPermissions.length > 0) {
//     const hasAllPermissions = requiredPermissions.every(permission => 
//       permissions.includes(permission)
//     );

//     if (!hasAllPermissions) {
//       const missingPermissions = requiredPermissions.filter(permission => 
//         !permissions.includes(permission)
//       );

//       return errorFallback || (
//         <AuthErrorDisplay 
//           error={`Missing required permissions: ${missingPermissions.join(', ')}`}
//           title="Access Denied"
//         />
//       );
//     }
//   }

//   // Check any permission requirement (at least one must be present)
//   if (requireAnyPermission.length > 0) {
//     const hasAnyPermission = requireAnyPermission.some(permission => 
//       permissions.includes(permission)
//     );

//     if (!hasAnyPermission) {
//       return errorFallback || (
//         <AuthErrorDisplay 
//           error={`This action requires one of: ${requireAnyPermission.join(', ')}`}
//           title="Access Denied"
//         />
//       );
//     }
//   }

//   // All checks passed, render children
//   return <>{children}</>;
// }

// /**
//  * Higher-order component that wraps a component with authentication guard
//  */
// export function withAuthGuard<P extends object>(
//   Component: React.ComponentType<P>,
//   guardOptions: Omit<AuthGuardProps, 'children'> = {}
// ) {
//   const GuardedComponent = (props: P) => (
//     <AuthGuard {...guardOptions}>
//       <Component {...props} />
//     </AuthGuard>
//   );

//   GuardedComponent.displayName = `withAuthGuard(${Component.displayName || Component.name})`;
  
//   return GuardedComponent;
// }

// /**
//  * Simple authentication check component for conditional rendering
//  */
// export function AuthCheck({
//   children,
//   fallback = null,
//   requireAuth = true,
//   requireWorkspace = false,
//   requiredRole,
//   requiredPermissions = [],
//   requireAnyPermission = [],
// }: {
//   children: ReactNode;
//   fallback?: ReactNode;
//   requireAuth?: boolean;
//   requireWorkspace?: boolean;
//   requiredRole?: WorkspaceRole;
//   requiredPermissions?: Permission[];
//   requireAnyPermission?: Permission[];
// }) {
//   const { isAuthenticated, role, permissions, workspace } = useAuth();

//   // Check authentication
//   if (requireAuth && !isAuthenticated) {
//     return <>{fallback}</>;
//   }

//   // Check workspace
//   if (requireWorkspace && !workspace) {
//     return <>{fallback}</>;
//   }

//   // Check role
//   if (requiredRole && role) {
//     const roleHierarchy = {
//       [WorkspaceRole.MEMBER]: 1,
//       [WorkspaceRole.ADMIN]: 2,
//       [WorkspaceRole.OWNER]: 3,
//     };

//     if (roleHierarchy[role] < roleHierarchy[requiredRole]) {
//       return <>{fallback}</>;
//     }
//   }

//   // Check required permissions
//   if (requiredPermissions.length > 0) {
//     const hasAllPermissions = requiredPermissions.every(permission => 
//       permissions.includes(permission)
//     );

//     if (!hasAllPermissions) {
//       return <>{fallback}</>;
//     }
//   }

//   // Check any permission
//   if (requireAnyPermission.length > 0) {
//     const hasAnyPermission = requireAnyPermission.some(permission => 
//       permissions.includes(permission)
//     );

//     if (!hasAnyPermission) {
//       return <>{fallback}</>;
//     }
//   }

//   return <>{children}</>;
// }



// interface AuthGuardProps {
//   children: ReactNode;
//   requireAuth?: boolean;
//   requireWorkspace?: boolean;
//   requiredRole?: typeof WorkspaceRole[keyof typeof WorkspaceRole];
//   requiredPermissions?: typeof Permission[keyof typeof Permission][];
//   requireAnyPermission?: typeof Permission[keyof typeof Permission][];
//   redirectTo?: string;
//   fallback?: ReactNode;
//   errorFallback?: ReactNode;
// }

// /**
//  * Authentication guard component that protects routes and components
//  * Handles authentication, workspace access, and permission checking
//  */
// export function AuthGuard({
//   children,
//   requireAuth = true,
//   requireWorkspace = true,
//   requiredRole,
//   requiredPermissions = [],
//   requireAnyPermission = [],
//   redirectTo = '/signin',
//   fallback,
//   errorFallback,
// }: AuthGuardProps) {
//   const router = useRouter();
//   const { 
//     isAuthenticated, 
//     isLoading, 
//     role, 
//     permissions,
//     workspace,
//     isWorkspaceLoading,
//     workspaceError 
//   } = useAuth();

//   // Redirect to sign-in if authentication is required but user is not authenticated
//   useEffect(() => {
//     if (requireAuth && !isLoading && !isAuthenticated) {
//       router.push(redirectTo);
//     }
//   }, [requireAuth, isLoading, isAuthenticated, router, redirectTo]);

//   // Don't render anything if redirecting
//   if (requireAuth && !isLoading && !isAuthenticated) {
//     return null;
//   }

//   // Show loading wrapper for authentication and workspace loading
//   if (isLoading || (requireWorkspace && isWorkspaceLoading)) {
//     return (
//       <AuthLoadingWrapper 
//         requireWorkspace={requireWorkspace}
//         fallback={fallback}
//         errorFallback={errorFallback}
//       >
//         {children}
//       </AuthLoadingWrapper>
//     );
//   }
// //console.log("workspace require")
//   // --- LOGICAL FIX START: Handle Workspace Error explicitly ---
//   if (requireWorkspace && workspaceError) {
//     // We detected an error during workspace loading, display the error.
//     // NOTE: This assumes the user will pass a custom errorFallback with an onRetry handler.
//     return errorFallback || (
//         <AuthErrorDisplay 
//             error={String(workspaceError)} // Use the actual error message
//             title="Workspace Loading Error"
//             // Mock a retry function for the generic fallback
//            // onRetry={() => window.location.reload()} 
//         />
//     );
//   }
//   // --- LOGICAL FIX END ---

//   // Check workspace requirement (only checked if there was NO error)
//   if (requireWorkspace && !workspace) {
//     return errorFallback || (
//       <div className="min-h-screen bg-gray-50 flex items-center justify-center">
//         <div className="max-w-md w-full bg-white shadow-sm rounded-lg p-6 border border-gray-200">
//           <div className="text-center">
//             <h2 className="text-xl font-medium text-gray-900 mb-4">
//               No Workspace Found
//             </h2>
//             <p className="text-gray-600 mb-6">
//               You don't have access to any workspaces yet. This might be because:
//             </p>
//             <ul className="text-left text-sm text-gray-600 mb-6 space-y-2">
//               <li>• You're a new user and your workspace is still being created</li>
//               <li>• There was an issue during account setup</li>
//               <li>• You need to be invited to a workspace</li>
//             </ul>
//             <div className="space-y-3">
//               <button
//                 onClick={() => window.location.reload()}
//                 className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors duration-200"
//               >
//                 Refresh Page
//               </button>
//               <Link
//                 href="/debug-auth"
//                 className="block w-full bg-gray-200 hover:bg-gray-300 text-gray-900 px-4 py-2 rounded-md transition-colors duration-200 text-center"
//               >
//                 Debug Information
//               </Link>
//             </div>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   // Check role requirement
//   if (requiredRole && role) {
//     const roleHierarchy = {
//       [WorkspaceRole.MEMBER]: 1,
//       [WorkspaceRole.ADMIN]: 2,
//       [WorkspaceRole.OWNER]: 3,
//     };

//     if (roleHierarchy[role] < roleHierarchy[requiredRole]) {
//       return errorFallback || (
//         <AuthErrorDisplay 
//           error={`This action requires ${requiredRole} role or higher. You have ${role} role.`}
//           title="Insufficient Permissions"
//         />
//       );
//     }
//   }

//   // Check required permissions (all must be present)
//   if (requiredPermissions.length > 0) {
//     const hasAllPermissions = requiredPermissions.every(permission => 
//       permissions.includes(permission)
//     );

//     if (!hasAllPermissions) {
//       const missingPermissions = requiredPermissions.filter(permission => 
//         !permissions.includes(permission)
//       );

//       return errorFallback || (
//         <AuthErrorDisplay 
//           error={`Missing required permissions: ${missingPermissions.join(', ')}`}
//           title="Access Denied"
//         />
//       );
//     }
//   }

//   // Check any permission requirement (at least one must be present)
//   if (requireAnyPermission.length > 0) {
//     const hasAnyPermission = requireAnyPermission.some(permission => 
//       permissions.includes(permission)
//     );

//     if (!hasAnyPermission) {
//       return errorFallback || (
//         <AuthErrorDisplay 
//           error={`This action requires one of: ${requireAnyPermission.join(', ')}`}
//           title="Access Denied"
//         />
//       );
//     }
//   }

//   // All checks passed, render children
//   return <>{children}</>;
// }

/**
 * Higher-order component that wraps a component with authentication guard
 */
// export function withAuthGuard<P extends object>(
//   Component: React.ComponentType<P>,
//   guardOptions: Omit<AuthGuardProps, 'children'> = {}
// ) {
//   const GuardedComponent = (props: P) => (
//     <AuthGuard {...guardOptions}>
//       <Component {...props} />
//     </AuthGuard>
//   );

//   GuardedComponent.displayName = `withAuthGuard(${Component.displayName || Component.name})`;
  
//   return GuardedComponent;
// }

/**
 * Simple authentication check component for conditional rendering
 */
// export function AuthCheck({
//   children,
//   fallback = null,
//   requireAuth = true,
//   requireWorkspace = false,
//   requiredRole,
//   requiredPermissions = [],
//   requireAnyPermission = [],
// }: {
//   children: ReactNode;
//   fallback?: ReactNode;
//   requireAuth?: boolean;
//   requireWorkspace?: boolean;
//   requiredRole?: typeof WorkspaceRole[keyof typeof WorkspaceRole];
//   requiredPermissions?: typeof Permission[keyof typeof Permission][];
//   requireAnyPermission?: typeof Permission[keyof typeof Permission][];
// }) {
//   const { isAuthenticated, role, permissions, workspace } = useAuth();

//   // Check authentication
//   if (requireAuth && !isAuthenticated) {
//     return <>{fallback}</>;
//   }

//   // Check workspace
//   if (requireWorkspace && !workspace) {
//     return <>{fallback}</>;
//   }

//   // Check role
//   if (requiredRole && role) {
//     const roleHierarchy = {
//       [WorkspaceRole.MEMBER]: 1,
//       [WorkspaceRole.ADMIN]: 2,
//       [WorkspaceRole.OWNER]: 3,
//     };

//     if (roleHierarchy[role] < roleHierarchy[requiredRole]) {
//       return <>{fallback}</>;
//     }
//   }

//   // Check required permissions
//   if (requiredPermissions.length > 0) {
//     const hasAllPermissions = requiredPermissions.every(permission => 
//       permissions.includes(permission)
//     );

//     if (!hasAllPermissions) {
//       return <>{fallback}</>;
//     }
//   }

//   // Check any permission
//   if (requireAnyPermission.length > 0) {
//     const hasAnyPermission = requireAnyPermission.some(permission => 
//       permissions.includes(permission)
//     );

//     if (!hasAnyPermission) {
//       return <>{fallback}</>;
//     }
//   }

//   return <>{children}</>;
// }



// --- MOCK / ENVIRONMENT SETUP (Replacing external imports) ---
// const useRouter = () => ({
//   push: (url: string) => console.log(`[Router Mock] Navigating to: ${url}`),
// });

// // Mock Next.js Link component with basic anchor tag behavior
// interface LinkProps {
//   href: string;
//   className?: string;
//   children: ReactNode;
// }
// const Link: React.FC<LinkProps> = ({ href, className, children }) => (
//   <a href={href} className={className} onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
//       e.preventDefault();
//       console.log(`[Link Mock] Navigating to: ${href}`);
//   }}>{children}</a>
// );

// // Define types based on the mocked values
// export type WorkspaceRoleType = 'MEMBER' | 'ADMIN' | 'OWNER';
// export type PermissionType = 'READ' | 'WRITE';

// const WorkspaceRole: Record<WorkspaceRoleType, WorkspaceRoleType> = { MEMBER: 'MEMBER', ADMIN: 'ADMIN', OWNER: 'OWNER' };
// const Permission: Record<PermissionType, PermissionType> = { READ: 'READ', WRITE: 'WRITE' }; 

// interface AuthState {
// isAuthenticated: boolean;
// isLoading: boolean;
// role: WorkspaceRoleType;
// permissions: PermissionType[];
// workspace: { id: string, name: string } | null;
// isWorkspaceLoading: boolean;
// workspaceError: string | null;
// }

// // Mock useAuth return type
// const useAuth = (): AuthState => ({
// isAuthenticated: true, 
// isLoading: false, 
// role: WorkspaceRole.OWNER, 
// permissions: [Permission.READ, Permission.WRITE],
// workspace: { id: 'w1', name: 'Default' }, 
// isWorkspaceLoading: false,
// workspaceError: null, 
// });

// interface AuthLoadingWrapperProps {
//   children: ReactNode;
//   requireWorkspace: boolean;
//   fallback?: ReactNode;
//   errorFallback?: ReactNode;
// }

// const AuthLoadingWrapper: React.FC<AuthLoadingWrapperProps> = ({ children, requireWorkspace }) => (
//   <div className="p-8 text-center bg-blue-100 rounded-lg shadow-inner">
//       <p className="font-semibold text-blue-800">
//           {requireWorkspace ? 'Loading Workspace & Auth...' : 'Loading Authentication...'}
//       </p>
//       <div className="mt-4">{children}</div>
//   </div>
// );

// interface AuthErrorDisplayProps {
// title?: string;
// error?: string | null; 
// onRetry?: () => void;
// }

// export const AuthErrorDisplay: React.FC<AuthErrorDisplayProps> = ({ title: customTitle, error: customError, onRetry }) => {
//   const errorTitle = customTitle || 'Authentication Error';
//   const errorMessage = customError || 'An unexpected error occurred.';
//   const isRetryable = !!onRetry;

//   return (
//       <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
//           <div className="max-w-md w-full">
//               <div className="text-center space-y-4">
//                   <div className="bg-red-50 border border-red-200 rounded-xl p-6 shadow-lg">
//                       <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
//                           <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
//                           </svg>
//                       </div>
//                       <h3 className="text-xl font-bold text-red-800 mb-2">{errorTitle}</h3>
//                       <p className="text-red-700 text-base">{errorMessage}</p>
//                   </div>

//                   {isRetryable && (
//                       <button
//                           onClick={onRetry}
//                           className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg transition-colors duration-200 shadow-md font-semibold"
//                       >
//                           Try Again
//                       </button>
//                   )}
//               </div>
//           </div>
//       </div>
//   );
// }
// // --- END MOCK / ENVIRONMENT SETUP ---


// interface AuthGuardProps {
// children: ReactNode;
// requireAuth?: boolean;
// requireWorkspace?: boolean;
// requiredRole?: WorkspaceRoleType;
// requiredPermissions?: PermissionType[];
// requireAnyPermission?: PermissionType[];
// redirectTo?: string;
// fallback?: ReactNode;
// errorFallback?: ReactNode;
// }

// /**
// * Authentication guard component that protects routes and components
// * Handles authentication, workspace access, and permission checking
// */
// export const AuthGuard: React.FC<AuthGuardProps> = ({
// children,
// requireAuth = true,
// requireWorkspace = true,
// requiredRole,
// requiredPermissions = [],
// requireAnyPermission = [],
// redirectTo = '/signin',
// fallback,
// errorFallback,
// }) => {
// const router = useRouter();
// const { 
//   isAuthenticated, 
//   isLoading, 
//   role, 
//   permissions,
//   workspace,
//   isWorkspaceLoading,
//   workspaceError 
// } = useAuth();

// // Redirect to sign-in if authentication is required but user is not authenticated
// useEffect(() => {
//   console.log(workspace)
//   if (requireAuth && !isLoading && !isAuthenticated) {
//     router.push(redirectTo);
//   }
// }, [requireAuth, isLoading, isAuthenticated, router, redirectTo]);

// // Don't render anything if redirecting
// if (requireAuth && !isLoading && !isAuthenticated) {
//   return null;
// }

// // Show loading wrapper for authentication and workspace loading
// if (isLoading || (requireWorkspace && isWorkspaceLoading)) {
//   return (
//     <AuthLoadingWrapper 
//       requireWorkspace={requireWorkspace}
//       fallback={fallback}
//       errorFallback={errorFallback}
//     >
//       {children}
//     </AuthLoadingWrapper>
//   );
// }

// // --- LOGICAL FIX START: Handle Workspace Error explicitly ---
// if (requireWorkspace && workspaceError) {
//   // We detected an error during workspace loading, display the error.
//   // NOTE: This assumes the user will pass a custom errorFallback with an onRetry handler.
//   return errorFallback || (
//       <AuthErrorDisplay 
//           error={workspaceError} // Use the actual error message, already typed as string | null
//           title="Workspace Loading Error"
//           // Mock a retry function for the generic fallback
//           onRetry={() => window.location.reload()} 
//       />
//   );
// }
// // --- LOGICAL FIX END ---

// // Check workspace requirement (only checked if there was NO error)
// if (requireWorkspace && !workspace) {
//   return errorFallback || (
//     <div className="min-h-screen bg-gray-50 flex items-center justify-center">
//       <div className="max-w-md w-full bg-white shadow-sm rounded-lg p-6 border border-gray-200">
//         <div className="text-center">
//           <h2 className="text-xl font-medium text-gray-900 mb-4">
//             No Workspace Found
//           </h2>
//           <p className="text-gray-600 mb-6">
//             You don't have access to any workspaces yet. This might be because:
//           </p>
//           <ul className="text-left text-sm text-gray-600 mb-6 space-y-2">
//             <li>• You're a new user and your workspace is still being created</li>
//             <li>• There was an issue during account setup</li>
//             <li>• You need to be invited to a workspace</li>
//           </ul>
//           <div className="space-y-3">
//             <button
//               onClick={() => window.location.reload()}
//               className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors duration-200"
//             >
//               Refresh Page
//             </button>
//             <Link
//               href="/debug-auth"
//               className="block w-full bg-gray-200 hover:bg-gray-300 text-gray-900 px-4 py-2 rounded-md transition-colors duration-200 text-center"
//             >
//               Debug Information
//             </Link>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// // Check role requirement
// if (requiredRole && role) {
//   const roleHierarchy = {
//     [WorkspaceRole.MEMBER]: 1,
//     [WorkspaceRole.ADMIN]: 2,
//     [WorkspaceRole.OWNER]: 3,
//   };

//   if (roleHierarchy[role] < roleHierarchy[requiredRole]) {
//     return errorFallback || (
//       <AuthErrorDisplay 
//         error={`This action requires ${requiredRole} role or higher. You have ${role} role.`}
//         title="Insufficient Permissions"
//       />
//     );
//   }
// }


// // Check required permissions (all must be present)
// if (requiredPermissions.length > 0) {
//   const hasAllPermissions = requiredPermissions.every((permission: PermissionType) => 
//     permissions.includes(permission)
//   );

//   if (!hasAllPermissions) {
//     const missingPermissions = requiredPermissions.filter((permission: PermissionType) => 
//       !permissions.includes(permission)
//     );

//     return errorFallback || (
//       <AuthErrorDisplay 
//         error={`Missing required permissions: ${missingPermissions.join(', ')}`}
//         title="Access Denied"
//       />
//     );
//   }
// }

// // Check any permission requirement (at least one must be present)
// if (requireAnyPermission.length > 0) {
//   const hasAnyPermission = requireAnyPermission.some((permission: PermissionType) => 
//     permissions.includes(permission)
//   );

//   if (!hasAnyPermission) {
//     return errorFallback || (
//       <AuthErrorDisplay 
//         error={`This action requires one of: ${requireAnyPermission.join(', ')}`}
//         title="Access Denied"
//       />
//     );
//   }
// }

// // All checks passed, render children
// return <>{children}</>;
// }

// /**
// * Higher-order component that wraps a component with authentication guard
// */
// export function withAuthGuard<P extends object>(
// Component: React.ComponentType<P>,
// guardOptions: Omit<AuthGuardProps, 'children'> = {}
// ) {
// const GuardedComponent: React.FC<P> = (props) => (
//   <AuthGuard {...guardOptions}>
//     <Component {...props} />
//   </AuthGuard>
// );

// GuardedComponent.displayName = `withAuthGuard(${Component.displayName || Component.name || 'Component'})`;

// return GuardedComponent;
// }

// interface AuthCheckProps {
// children: ReactNode;
// fallback?: ReactNode;
// requireAuth?: boolean;
// requireWorkspace?: boolean;
// requiredRole?: WorkspaceRoleType;
// requiredPermissions?: PermissionType[];
// requireAnyPermission?: PermissionType[];
// }

// /**
// * Simple authentication check component for conditional rendering
// */
// export const AuthCheck: React.FC<AuthCheckProps> = ({
// children,
// fallback = null,
// requireAuth = true,
// requireWorkspace = false,
// requiredRole,
// requiredPermissions = [],
// requireAnyPermission = [],
// }) => {
// const { isAuthenticated, role, permissions, workspace } = useAuth();

// // Check authentication
// if (requireAuth && !isAuthenticated) {
//   return <>{fallback}</>;
// }

// // Check workspace
// if (requireWorkspace && !workspace) {
//   return <>{fallback}</>;
// }

// // Check role
// if (requiredRole && role) {
//   const roleHierarchy = {
//     [WorkspaceRole.MEMBER]: 1,
//     [WorkspaceRole.ADMIN]: 2,
//     [WorkspaceRole.OWNER]: 3,
//   };

//   if (roleHierarchy[role] < roleHierarchy[requiredRole]) {
//     return <>{fallback}</>;
//   }
// }

// // Check required permissions
// if (requiredPermissions.length > 0) {
//   const hasAllPermissions = requiredPermissions.every((permission: PermissionType) => 
//     permissions.includes(permission)
//   );

//   if (!hasAllPermissions) {
//     return <>{fallback}</>;
//   }
// }

// // Check any permission
// if (requireAnyPermission.length > 0) {
//   const hasAnyPermission = requireAnyPermission.some((permission: PermissionType) => 
//     permissions.includes(permission)
//   );

//   if (!hasAnyPermission) {
//     return <>{fallback}</>;
//   }
// }

// return <>{children}</>;
// }
