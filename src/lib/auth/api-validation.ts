import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { WorkspaceRole, Permission, hasPermission } from '../db';
import { AuthError } from '../types/auth';

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
 */
export async function validateAuth(request: NextRequest) {
  const token = await getToken({ 
    req: request,
    secret: process.env.NEXTAUTH_SECRET 
  });

  if (!token || !token.sub) {
    throw new ApiValidationError(
      AuthError.SESSION_EXPIRED,
      'Authentication required',
      401
    );
  }

  return {
    userId: token.sub,
    email: token.email as string,
    name: token.name as string,
    workspaceId: token.workspaceId as string | undefined,
    role: token.role as WorkspaceRole | undefined
  };
}

/**
 * Validate workspace access for API routes
 * Returns the authenticated user session with workspace context
 */
export async function validateWorkspaceAuth(
  request: NextRequest, 
  workspaceId: string
) {
  const session = await validateAuth(request);

  if (!session.workspaceId || session.workspaceId !== workspaceId) {
    throw new ApiValidationError(
      AuthError.WORKSPACE_ACCESS_DENIED,
      'Access denied to this workspace',
      403
    );
  }

  if (!session.role) {
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
 */
export async function validatePermission(
  request: NextRequest,
  workspaceId: string,
  permission: Permission
) {
  const session = await validateWorkspaceAuth(request, workspaceId);

  if (!hasPermission(session.role, permission)) {
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
 * Wrapper for API route handlers with automatic error handling
 */
export function withApiValidation<T extends any[]>(
  handler: (...args: T) => Promise<Response>
) {
  return async (...args: T): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleApiError(error);
    }
  };
}