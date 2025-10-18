import type { JWT } from 'next-auth/jwt';

/**
 * Utility functions for middleware authentication and authorization
 */

/**
 * Protected routes that require authentication
 */
export const PROTECTED_ROUTES = [
    '/dashboard',
    '/api/kpis',
    '/api/objectives',
    '/api/workspaces',
    '/api/integrations',
] as const;

/**
 * Public routes that don't require authentication
 */
export const PUBLIC_ROUTES = [
    '/',
    '/signin',
    '/error',
    '/api/auth',
] as const;

/**
 * API routes that don't require workspace context
 */
export const NON_WORKSPACE_API_ROUTES = [
    '/api/auth',
    '/api/health',
    '/api/user',
    '/api/workspaces/list',
] as const;

/**
 * Check if a path matches any of the given route patterns
 */
export function matchesRoute(pathname: string, routes: readonly string[]): boolean {
    return routes.some(route => pathname.startsWith(route));
}

/**
 * Check if a route is public (doesn't require authentication)
 */
export function isPublicRoute(pathname: string): boolean {
    return matchesRoute(pathname, PUBLIC_ROUTES);
}

/**
 * Check if a route is protected (requires authentication)
 */
export function isProtectedRoute(pathname: string): boolean {
    return matchesRoute(pathname, PROTECTED_ROUTES);
}

/**
 * Check if an API route requires workspace context
 */
export function requiresWorkspaceContext(pathname: string): boolean {
    return pathname.startsWith('/api/') && !matchesRoute(pathname, NON_WORKSPACE_API_ROUTES);
}

/**
 * Validate that a token has the required workspace context
 */
export function validateWorkspaceAccess(token: JWT | null): {
    isValid: boolean;
    error?: string;
    needsWorkspace?: boolean;
    needsRole?: boolean;
} {
    if (!token) {
        return { isValid: false, error: 'No authentication token' };
    }

    if (!token.workspaceId) {
        return {
            isValid: false,
            error: 'No workspace context',
            needsWorkspace: true
        };
    }

    if (!token.role) {
        return {
            isValid: false,
            error: 'No role assigned',
            needsRole: true
        };
    }

    return { isValid: true };
}

/**
 * Create workspace context headers for API requests
 */
export function createWorkspaceHeaders(token: JWT): Record<string, string> {
    const headers: Record<string, string> = {};

    if (token.workspaceId) {
        headers['x-workspace-id'] = token.workspaceId as string;
    }

    if (token.role) {
        headers['x-user-role'] = token.role as string;
    }

    if (token.sub) {
        headers['x-user-id'] = token.sub;
    }

    return headers;
}

/**
 * Create error response for API routes
 */
export function createApiErrorResponse(
    error: string,
    message: string,
    status: number
): Response {
    return new Response(
        JSON.stringify({ error, message }),
        {
            status,
            headers: { 'Content-Type': 'application/json' },
        }
    );
}