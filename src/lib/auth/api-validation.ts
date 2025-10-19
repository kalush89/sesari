import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { WorkspaceRole, Permission, hasPermission } from '../db';
import { AuthError } from '../types/auth';
import { securityAuditLogger, withSecurityAudit } from './security-audit';

/**
 * API validation error class
 */
export class ApiValidationError extends Error {
  constructor(
    public code: AuthError,
    message: string,
    public statusCode: number = 403
  ) {
    super(message);
    this.name = 'ApiValidationError';
  }
}

/**
 * Validate authentication for API routes
 * Returns the authenticated user session
 * Requirements: 4.3, 5.1
 */
export async function validateAuth(request: NextRequest) {
  const token = await getToken({ 
    req: request,
    secret: process.env.NEXTAUTH_SECRET 
  });

  if (!token || !token.sub) {
    // Log authentication failure
    securityAuditLogger.log({
      endpoint: new URL(request.url).pathname,
      method: request.method,
      action: 'authentication_failed',
      reason: 'No valid token found',
      ipAddress: getClientIP(request),
      userAgent: request.headers.get('user-agent') || undefined
    });

    throw new ApiValidationError(
      AuthError.SESSION_EXPIRED,
      'Authentication required',
      401
    );
  }

  // Log successful authentication
  securityAuditLogger.log({
    endpoint: new URL(request.url).pathname,
    method: request.method,
    action: 'access_granted',
    userId: token.sub,
    workspaceId: token.workspaceId as string | undefined,
    ipAddress: getClientIP(request),
    userAgent: request.headers.get('user-agent') || undefined
  });

  return {
    userId: token.sub,
    email: token.email as string,
    name: token.name as string,
    workspaceId: token.workspaceId as string | undefined,
    role: token.role as WorkspaceRole | undefined
  };
}

/**
 * Extract client IP address from request
 */
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }

  return 'unknown';
}

/**
 * Validate workspace access for API routes
 * Returns the authenticated user session with workspace context
 * Requirements: 4.3, 4.4, 3.4
 */
export async function validateWorkspaceAuth(
  request: NextRequest, 
  workspaceId: string
) {
  const session = await validateAuth(request);

  if (!session.workspaceId || session.workspaceId !== workspaceId) {
    // Log workspace access denial
    securityAuditLogger.log({
      endpoint: new URL(request.url).pathname,
      method: request.method,
      action: 'access_denied',
      userId: session.userId,
      workspaceId: workspaceId,
      reason: `User workspace (${session.workspaceId}) does not match requested workspace (${workspaceId})`,
      ipAddress: getClientIP(request),
      userAgent: request.headers.get('user-agent') || undefined
    });

    throw new ApiValidationError(
      AuthError.WORKSPACE_ACCESS_DENIED,
      'Access denied to this workspace',
      403
    );
  }

  if (!session.role) {
    // Log missing role
    securityAuditLogger.log({
      endpoint: new URL(request.url).pathname,
      method: request.method,
      action: 'permission_denied',
      userId: session.userId,
      workspaceId: workspaceId,
      reason: 'No role assigned in workspace',
      ipAddress: getClientIP(request),
      userAgent: request.headers.get('user-agent') || undefined
    });

    throw new ApiValidationError(
      AuthError.INSUFFICIENT_PERMISSIONS,
      'No role assigned in workspace',
      403
    );
  }

  return {
    ...session,
    workspaceId: session.workspaceId,
    role: session.role
  };
}

/**
 * Validate specific permission for API routes
 * Returns the authenticated user session if they have the required permission
 * Requirements: 3.4, 4.4
 */
export async function validatePermission(
  request: NextRequest,
  workspaceId: string,
  permission: Permission
) {
  const session = await validateWorkspaceAuth(request, workspaceId);

  if (!hasPermission(session.role, permission)) {
    // Log permission denial
    securityAuditLogger.log({
      endpoint: new URL(request.url).pathname,
      method: request.method,
      action: 'permission_denied',
      userId: session.userId,
      workspaceId: workspaceId,
      reason: `User role (${session.role}) lacks required permission: ${permission}`,
      ipAddress: getClientIP(request),
      userAgent: request.headers.get('user-agent') || undefined
    });

    throw new ApiValidationError(
      AuthError.INSUFFICIENT_PERMISSIONS,
      `Permission denied: ${permission}`,
      403
    );
  }

  return session;
}

/**
 * Validate multiple permissions (user must have ALL)
 */
export async function validateAllPermissions(
  request: NextRequest,
  workspaceId: string,
  permissions: Permission[]
) {
  const session = await validateWorkspaceAuth(request, workspaceId);

  const hasAllPermissions = permissions.every(permission => 
    hasPermission(session.role, permission)
  );

  if (!hasAllPermissions) {
    throw new ApiValidationError(
      AuthError.INSUFFICIENT_PERMISSIONS,
      `Missing required permissions: ${permissions.join(', ')}`,
      403
    );
  }

  return session;
}

/**
 * Validate any permission (user must have at least ONE)
 */
export async function validateAnyPermission(
  request: NextRequest,
  workspaceId: string,
  permissions: Permission[]
) {
  const session = await validateWorkspaceAuth(request, workspaceId);

  const hasAnyPermission = permissions.some(permission => 
    hasPermission(session.role, permission)
  );

  if (!hasAnyPermission) {
    throw new ApiValidationError(
      AuthError.INSUFFICIENT_PERMISSIONS,
      `Missing any of required permissions: ${permissions.join(', ')}`,
      403
    );
  }

  return session;
}

/**
 * Handle API validation errors and return appropriate response
 */
export function handleApiError(error: unknown): Response {
  if (error instanceof ApiValidationError) {
    return new Response(
      JSON.stringify({
        error: error.code,
        message: error.message,
        retryable: error.code === AuthError.NETWORK_ERROR
      }),
      {
        status: error.statusCode,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  // Log unexpected errors but don't expose details
  console.error('Unexpected API error:', error);
  
  return new Response(
    JSON.stringify({
      error: AuthError.NETWORK_ERROR,
      message: 'An unexpected error occurred',
      retryable: true
    }),
    {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

/**
 * Wrapper for API route handlers with automatic error handling and security audit
 * Requirements: 4.3, 4.4, 3.4, 5.1
 */
export function withApiValidation<T extends any[]>(
  handler: (...args: T) => Promise<Response>
) {
  return withSecurityAudit(async (...args: T): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleApiError(error);
    }
  });
}