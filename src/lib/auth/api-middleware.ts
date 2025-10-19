import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { WorkspaceRole, Permission, hasPermission } from '../db';
import { AuthError } from '../types/auth';
import { ApiValidationError, handleApiError } from './api-validation';

/**
 * API route security middleware for comprehensive validation
 * Requirements: 4.3, 4.4, 3.4, 5.1
 */

export interface ApiSecurityConfig {
  requireAuth?: boolean;
  requireWorkspace?: boolean;
  requiredPermissions?: Permission[];
  allowedRoles?: WorkspaceRole[];
  rateLimitKey?: string;
}

export interface ValidatedApiContext {
  userId: string;
  email: string;
  name: string;
  workspaceId?: string;
  role?: WorkspaceRole;
  permissions?: Permission[];
}

/**
 * Comprehensive API route security middleware
 * Validates authentication, workspace access, and permissions
 */
export function withApiSecurity(
  config: ApiSecurityConfig = {}
) {
  return function <T extends any[]>(
    handler: (context: ValidatedApiContext, ...args: T) => Promise<Response>
  ) {
    return async (...args: T): Promise<Response> => {
      try {
        const request = args[0] as NextRequest;
        
        // Extract workspace ID from URL if present
        const url = new URL(request.url);
        const pathSegments = url.pathname.split('/');
        const workspaceIndex = pathSegments.indexOf('workspaces');
        const workspaceId = workspaceIndex !== -1 && workspaceIndex + 1 < pathSegments.length 
          ? pathSegments[workspaceIndex + 1] 
          : undefined;

        // Validate authentication if required
        let context: ValidatedApiContext | null = null;
        
        if (config.requireAuth !== false) {
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

          context = {
            userId: token.sub,
            email: token.email as string,
            name: token.name as string,
            workspaceId: token.workspaceId as string | undefined,
            role: token.role as WorkspaceRole | undefined
          };

          // Validate workspace access if required
          if (config.requireWorkspace || workspaceId) {
            const targetWorkspaceId = workspaceId || config.requireWorkspace;
            
            if (!targetWorkspaceId) {
              throw new ApiValidationError(
                AuthError.WORKSPACE_ACCESS_DENIED,
                'Workspace context required',
                400
              );
            }

            if (!context.workspaceId || context.workspaceId !== targetWorkspaceId) {
              throw new ApiValidationError(
                AuthError.WORKSPACE_ACCESS_DENIED,
                'Access denied to this workspace',
                403
              );
            }

            if (!context.role) {
              throw new ApiValidationError(
                AuthError.INSUFFICIENT_PERMISSIONS,
                'No role assigned in workspace',
                403
              );
            }

            // Set workspace context
            context.workspaceId = targetWorkspaceId;
          }

          // Validate role restrictions
          if (config.allowedRoles && context.role) {
            if (!config.allowedRoles.includes(context.role)) {
              throw new ApiValidationError(
                AuthError.INSUFFICIENT_PERMISSIONS,
                `Role '${context.role}' not allowed for this operation`,
                403
              );
            }
          }

          // Validate permissions
          if (config.requiredPermissions && context.role) {
            const userPermissions = getPermissionsForRole(context.role);
            const hasAllPermissions = config.requiredPermissions.every(permission =>
              hasPermission(context.role!, permission)
            );

            if (!hasAllPermissions) {
              const missingPermissions = config.requiredPermissions.filter(permission =>
                !hasPermission(context.role!, permission)
              );
              
              throw new ApiValidationError(
                AuthError.INSUFFICIENT_PERMISSIONS,
                `Missing required permissions: ${missingPermissions.join(', ')}`,
                403
              );
            }

            context.permissions = userPermissions;
          }
        }

        // Rate limiting (basic implementation)
        if (config.rateLimitKey && context) {
          await checkRateLimit(config.rateLimitKey, context.userId);
        }

        // Call the handler with validated context
        return await handler(context!, ...args);

      } catch (error) {
        return handleApiError(error);
      }
    };
  };
}

/**
 * Get permissions for a given role
 */
function getPermissionsForRole(role: WorkspaceRole): Permission[] {
  const ROLE_PERMISSIONS: Record<WorkspaceRole, Permission[]> = {
    [WorkspaceRole.OWNER]: [
      Permission.MANAGE_WORKSPACE,
      Permission.INVITE_MEMBERS,
      Permission.MANAGE_BILLING,
      Permission.CREATE_KPI,
      Permission.EDIT_KPI,
      Permission.DELETE_KPI,
      Permission.VIEW_KPI,
      Permission.CREATE_OBJECTIVE,
      Permission.EDIT_OBJECTIVE,
      Permission.DELETE_OBJECTIVE,
      Permission.VIEW_OBJECTIVE
    ],
    [WorkspaceRole.ADMIN]: [
      Permission.INVITE_MEMBERS,
      Permission.CREATE_KPI,
      Permission.EDIT_KPI,
      Permission.DELETE_KPI,
      Permission.VIEW_KPI,
      Permission.CREATE_OBJECTIVE,
      Permission.EDIT_OBJECTIVE,
      Permission.DELETE_OBJECTIVE,
      Permission.VIEW_OBJECTIVE
    ],
    [WorkspaceRole.MEMBER]: [
      Permission.VIEW_KPI,
      Permission.VIEW_OBJECTIVE
    ]
  };

  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Basic rate limiting check (in-memory implementation)
 * In production, this should use Redis or similar
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

async function checkRateLimit(key: string, userId: string): Promise<void> {
  const rateLimitKey = `${key}:${userId}`;
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window
  const maxRequests = 100; // Max requests per window

  const current = rateLimitStore.get(rateLimitKey);
  
  if (!current || now > current.resetTime) {
    rateLimitStore.set(rateLimitKey, {
      count: 1,
      resetTime: now + windowMs
    });
    return;
  }

  if (current.count >= maxRequests) {
    throw new ApiValidationError(
      AuthError.NETWORK_ERROR,
      'Rate limit exceeded. Please try again later.',
      429
    );
  }

  current.count++;
}

/**
 * Predefined security configurations for common API patterns
 */
export const ApiSecurityPresets = {
  // Public endpoints (no auth required)
  PUBLIC: {
    requireAuth: false
  },

  // Basic authenticated endpoints
  AUTHENTICATED: {
    requireAuth: true
  },

  // Workspace-scoped endpoints
  WORKSPACE: {
    requireAuth: true,
    requireWorkspace: true
  },

  // Admin-only workspace operations
  WORKSPACE_ADMIN: {
    requireAuth: true,
    requireWorkspace: true,
    allowedRoles: [WorkspaceRole.OWNER, WorkspaceRole.ADMIN]
  },

  // Owner-only workspace operations
  WORKSPACE_OWNER: {
    requireAuth: true,
    requireWorkspace: true,
    allowedRoles: [WorkspaceRole.OWNER]
  },

  // KPI management endpoints
  KPI_READ: {
    requireAuth: true,
    requireWorkspace: true,
    requiredPermissions: [Permission.VIEW_KPI] as Permission[]
  },

  KPI_WRITE: {
    requireAuth: true,
    requireWorkspace: true,
    requiredPermissions: [Permission.CREATE_KPI, Permission.EDIT_KPI] as Permission[]
  },

  KPI_DELETE: {
    requireAuth: true,
    requireWorkspace: true,
    requiredPermissions: [Permission.DELETE_KPI] as Permission[]
  },

  // Objective management endpoints
  OBJECTIVE_READ: {
    requireAuth: true,
    requireWorkspace: true,
    requiredPermissions: [Permission.VIEW_OBJECTIVE] as Permission[]
  },

  OBJECTIVE_WRITE: {
    requireAuth: true,
    requireWorkspace: true,
    requiredPermissions: [Permission.CREATE_OBJECTIVE, Permission.EDIT_OBJECTIVE] as Permission[]
  },

  OBJECTIVE_DELETE: {
    requireAuth: true,
    requireWorkspace: true,
    requiredPermissions: [Permission.DELETE_OBJECTIVE] as Permission[]
  },

  // Member management endpoints
  MEMBER_INVITE: {
    requireAuth: true,
    requireWorkspace: true,
    requiredPermissions: [Permission.INVITE_MEMBERS] as Permission[]
  },

  MEMBER_MANAGE: {
    requireAuth: true,
    requireWorkspace: true,
    allowedRoles: [WorkspaceRole.OWNER, WorkspaceRole.ADMIN]
  }
} as const;

/**
 * Utility function to create API handlers with security presets
 */
export function createSecureApiHandler<T extends any[]>(
  preset: keyof typeof ApiSecurityPresets,
  handler: (context: ValidatedApiContext, ...args: T) => Promise<Response>
) {
  return withApiSecurity(ApiSecurityPresets[preset])(handler);
}