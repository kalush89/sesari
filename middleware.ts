import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  isPublicRoute,
  isProtectedRoute,
  requiresWorkspaceContext,
  validateWorkspaceAccess,
  createWorkspaceHeaders,
  createApiErrorResponse,
} from './src/lib/auth/middleware-utils';

/**
 * NextAuth.js middleware for route protection
 * Handles authentication and authorization for protected routes
 * Requirements: 5.1, 5.2, 5.4, 5.5
 */
export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth?.token;

    // Allow access to public routes
    if (isPublicRoute(pathname)) {
      return NextResponse.next();
    }

    // Requirement 5.1 & 5.4: Verify authentication status and redirect unauthenticated users
    if (!token && isProtectedRoute(pathname)) {
      const signInUrl = new URL('/signin', req.url);
      signInUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(signInUrl);
    }

    // Handle authenticated users
    if (token) {
      // Requirement 5.5: Verify workspace access permissions for dashboard routes
      if (pathname.startsWith('/dashboard')) {
        const validation = validateWorkspaceAccess(token);
        
        if (!validation.isValid) {
          if (validation.needsWorkspace) {
            // Redirect to workspace selection/creation if no workspace context
            const workspaceUrl = new URL('/onboarding/workspace', req.url);
            return NextResponse.redirect(workspaceUrl);
          }
          
          if (validation.needsRole) {
            console.error('User has workspace but no role assigned:', {
              userId: token.sub,
              workspaceId: token.workspaceId,
            });
            
            // Redirect to error page for role assignment issues
            const errorUrl = new URL('/error', req.url);
            errorUrl.searchParams.set('error', 'workspace_access_denied');
            return NextResponse.redirect(errorUrl);
          }
        }
      }

      // Protect API routes with authentication and workspace validation
      if (pathname.startsWith('/api/') && requiresWorkspaceContext(pathname)) {
        // Requirement 5.1: Verify authentication status for API routes
        if (!token) {
          return NextResponse.json(
            { 
              error: 'Authentication required',
              message: 'You must be signed in to access this resource.'
            },
            { status: 401 }
          );
        }

        // Requirement 5.5: Verify workspace access for workspace-scoped API routes
        const validation = validateWorkspaceAccess(token);
        
        if (!validation.isValid) {
          if (validation.needsWorkspace) {
            return NextResponse.json(
              { 
                error: 'Workspace context required',
                message: 'Please select a workspace to access this resource.'
              },
              { status: 403 }
            );
          }

          if (validation.needsRole) {
            return NextResponse.json(
              { 
                error: 'Insufficient permissions',
                message: 'You do not have the required permissions for this workspace.'
              },
              { status: 403 }
            );
          }
        }

        // Add workspace context headers for API requests
        const response = NextResponse.next();
        const headers = createWorkspaceHeaders(token);
        
        Object.entries(headers).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
        
        return response;
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        // Always allow access to public routes
        if (isPublicRoute(pathname)) {
          return true;
        }

        // Requirement 5.1: Require authentication for protected routes
        if (isProtectedRoute(pathname)) {
          return !!token;
        }

        // Allow access to other routes (static files, etc.)
        return true;
      },
    },
  }
);

/**
 * Matcher configuration for middleware
 * Defines which routes should be processed by the middleware
 * Optimized to only process routes that need authentication/authorization
 */
export const config = {
  matcher: [
    /*
     * Match protected routes that require authentication:
     * - Dashboard pages
     * - API routes (except static assets)
     * - Auth pages (for redirect handling)
     */
    '/dashboard/:path*',
    '/api/((?!auth).*)',
    '/auth/:path*',
    '/((?!_next/static|_next/image|favicon.ico|public/|.*\\..*).*)' 
  ],
};