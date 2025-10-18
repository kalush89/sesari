import { User, Workspace, WorkspaceMembership } from '@prisma/client';
import { Session } from 'next-auth';
import { WorkspaceRole, Permission } from '../db';

/**
 * Extended session interface for NextAuth
 */
export interface ExtendedSession extends Session {
  user: {
    id: string;
    email: string;
    name: string;
    image?: string;
  };
  workspaceId?: string;
  role?: WorkspaceRole;
}

/**
 * Workspace context for UI state management
 */
export interface WorkspaceContext {
  workspaceId: string;
  role: WorkspaceRole;
  permissions: Permission[];
}

/**
 * Extended user type with workspace relationships
 */
export interface UserWithWorkspaces extends User {
  workspaceMemberships: (WorkspaceMembership & {
    workspace: Workspace;
  })[];
}

/**
 * Extended workspace type with membership information
 */
export interface WorkspaceWithMembership extends Workspace {
  memberships: WorkspaceMembership[];
  userRole?: WorkspaceRole;
}

/**
 * Authentication error types
 */
export enum AuthError {
  INVALID_CREDENTIALS = 'invalid_credentials',
  SESSION_EXPIRED = 'session_expired',
  WORKSPACE_ACCESS_DENIED = 'workspace_access_denied',
  INSUFFICIENT_PERMISSIONS = 'insufficient_permissions',
  OAUTH_ERROR = 'oauth_error',
  NETWORK_ERROR = 'network_error'
}

/**
 * Authentication error response interface
 */
export interface AuthErrorResponse {
  error: AuthError;
  message: string;
  details?: Record<string, any>;
  retryable: boolean;
}

/**
 * Workspace invitation interface
 */
export interface WorkspaceInvitation {
  id: string;
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
  invitedBy: string;
  invitedAt: Date;
  expiresAt: Date;
  accepted: boolean;
}

/**
 * Workspace creation interface
 */
export interface CreateWorkspaceData {
  name: string;
  slug: string;
  planType?: 'free' | 'starter' | 'pro';
}

/**
 * Workspace member invitation interface
 */
export interface InviteMemberData {
  email: string;
  role: WorkspaceRole;
  workspaceId: string;
}