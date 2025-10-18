import { getServerSession } from 'next-auth/next';
import { authOptions } from './config';
import { ExtendedSession, AuthError, AuthErrorResponse } from '../types/auth';
import { WorkspaceRole } from '../db';
import { prisma } from '../db';

/**
 * Get the current user session on the server side
 * Returns null if no session exists
 */
export async function getAuthSession(): Promise<ExtendedSession | null> {
  return await getServerSession(authOptions);
}

/**
 * Create a structured authentication error
 */
export function createAuthError(
  error: AuthError,
  message: string,
  details?: Record<string, any>,
  retryable: boolean = false
): AuthErrorResponse {
  return {
    error,
    message,
    details,
    retryable,
  };
}

/**
 * Get the current user session and throw if not authenticated
 * Use this for protected server actions and API routes
 */
export async function requireAuth(): Promise<ExtendedSession> {
  const session = await getAuthSession();
  
  if (!session) {
    const error = createAuthError(
      AuthError.SESSION_EXPIRED,
      'Authentication required. Please sign in to continue.',
      undefined,
      true
    );
    throw new Error(JSON.stringify(error));
  }
  
  return session;
}

/**
 * Get the current user session with workspace context
 * Throws if user doesn't have access to the specified workspace
 */
export async function requireWorkspaceAuth(workspaceId: string): Promise<ExtendedSession & { workspaceId: string; role: WorkspaceRole }> {
  const session = await requireAuth();
  
  if (!session.workspaceId || session.workspaceId !== workspaceId) {
    throw new Error('Workspace access denied');
  }
  
  if (!session.role) {
    throw new Error('No role assigned for workspace');
  }
  
  return {
    ...session,
    workspaceId: session.workspaceId,
    role: session.role,
  };
}

/**
 * Check if the current user has a specific permission in their workspace
 */
export async function hasPermission(permission: string, workspaceId?: string): Promise<boolean> {
  try {
    const session = await getAuthSession();
    
    if (!session || !session.role) {
      return false;
    }
    
    // If workspaceId is provided, verify user has access to that workspace
    if (workspaceId && session.workspaceId !== workspaceId) {
      return false;
    }
    
    // Import permission checking logic
    const { checkPermission } = await import('../db/permissions');
    return checkPermission(session.role, permission);
  } catch {
    return false;
  }
}

/**
 * Validate session and workspace access for API routes
 */
export async function validateApiAuth(): Promise<{
  session: ExtendedSession;
  workspaceId: string;
  role: WorkspaceRole;
}> {
  const session = await getAuthSession();
  
  if (!session) {
    throw new Error('Authentication required');
  }
  
  if (!session.workspaceId || !session.role) {
    throw new Error('Workspace context required');
  }
  
  return {
    session,
    workspaceId: session.workspaceId,
    role: session.role,
  };
}