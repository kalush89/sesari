import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ValidatedApiContext, withApiSecurity, ApiSecurityConfig } from './api-middleware';
import { AuthError } from '../types/auth';
import { ApiValidationError } from './api-validation';

/**
 * Enhanced API route security with request validation
 * Requirements: 4.3, 4.4, 3.4, 5.1
 */

export interface ApiRouteConfig extends ApiSecurityConfig {
  bodySchema?: z.ZodSchema<any>;
  paramsSchema?: z.ZodSchema<any>;
  querySchema?: z.ZodSchema<any>;
  methods?: ('GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE')[];
}

export interface ValidatedApiRequest {
  body?: any;
  params?: any;
  query?: any;
  headers: Headers;
  method: string;
  url: string;
}

export interface ApiRouteHandler {
  (
    context: ValidatedApiContext,
    request: ValidatedApiRequest
  ): Promise<Response>;
}

/**
 * Create a secure API route handler with comprehensive validation
 */
export function createApiRoute(
  config: ApiRouteConfig,
  handler: ApiRouteHandler
) {
  return withApiSecurity(config)(async (context: ValidatedApiContext, request: NextRequest, routeParams?: any) => {
    try {
      // Validate HTTP method
      if (config.methods && !config.methods.includes(request.method as any)) {
        return new Response(
          JSON.stringify({
            error: 'method_not_allowed',
            message: `Method ${request.method} not allowed. Allowed methods: ${config.methods.join(', ')}`
          }),
          {
            status: 405,
            headers: { 
              'Content-Type': 'application/json',
              'Allow': config.methods.join(', ')
            }
          }
        );
      }

      // Parse and validate request body
      let validatedBody: any;
      if (config.bodySchema && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
        try {
          const rawBody = await request.json();
          validatedBody = config.bodySchema.parse(rawBody);
        } catch (error) {
          if (error instanceof z.ZodError) {
            return new Response(
              JSON.stringify({
                error: 'validation_error',
                message: 'Invalid request body',
                details: error.errors
              }),
              {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
              }
            );
          }
          throw error;
        }
      }

      // Parse and validate route parameters
      let validatedParams: any;
      if (config.paramsSchema && routeParams) {
        try {
          // Handle Promise-based params (Next.js 15)
          const params = routeParams.params ? await routeParams.params : routeParams;
          validatedParams = config.paramsSchema.parse(params);
        } catch (error) {
          if (error instanceof z.ZodError) {
            return new Response(
              JSON.stringify({
                error: 'validation_error',
                message: 'Invalid route parameters',
                details: error.errors
              }),
              {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
              }
            );
          }
          throw error;
        }
      }

      // Parse and validate query parameters
      let validatedQuery: any;
      if (config.querySchema) {
        try {
          const url = new URL(request.url);
          const queryParams = Object.fromEntries(url.searchParams.entries());
          validatedQuery = config.querySchema.parse(queryParams);
        } catch (error) {
          if (error instanceof z.ZodError) {
            return new Response(
              JSON.stringify({
                error: 'validation_error',
                message: 'Invalid query parameters',
                details: error.errors
              }),
              {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
              }
            );
          }
          throw error;
        }
      }

      // Create validated request object
      const validatedRequest: ValidatedApiRequest = {
        body: validatedBody,
        params: validatedParams,
        query: validatedQuery,
        headers: request.headers,
        method: request.method,
        url: request.url
      };

      // Call the handler
      return await handler(context, validatedRequest);

    } catch (error) {
      console.error('API route error:', error);
      
      if (error instanceof ApiValidationError) {
        return new Response(
          JSON.stringify({
            error: error.code,
            message: error.message
          }),
          {
            status: error.statusCode,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      return new Response(
        JSON.stringify({
          error: AuthError.NETWORK_ERROR,
          message: 'An unexpected error occurred'
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  });
}

/**
 * Common Zod schemas for API validation
 */
export const ApiSchemas = {
  // UUID parameter validation
  uuidParam: z.object({
    id: z.string().uuid('Invalid ID format')
  }),

  workspaceParam: z.object({
    workspaceId: z.string().uuid('Invalid workspace ID format')
  }),

  memberParam: z.object({
    workspaceId: z.string().uuid('Invalid workspace ID format'),
    memberId: z.string().uuid('Invalid member ID format')
  }),

  invitationParam: z.object({
    workspaceId: z.string().uuid('Invalid workspace ID format'),
    invitationId: z.string().uuid('Invalid invitation ID format')
  }),

  // Pagination query parameters
  paginationQuery: z.object({
    page: z.string().regex(/^\d+$/).transform(val => parseInt(val, 10)).optional(),
    limit: z.string().regex(/^\d+$/).transform(val => parseInt(val, 10)).optional(),
    sort: z.string().optional(),
    order: z.enum(['asc', 'desc']).optional()
  }),

  // Member invitation body
  inviteMemberBody: z.object({
    email: z.string().email('Invalid email address'),
    role: z.enum(['admin', 'member'], {
      errorMap: () => ({ message: 'Role must be admin or member' })
    })
  }),

  // Member role update body
  updateMemberRoleBody: z.object({
    role: z.enum(['owner', 'admin', 'member'], {
      errorMap: () => ({ message: 'Role must be owner, admin, or member' })
    })
  }),

  // Workspace creation body
  createWorkspaceBody: z.object({
    name: z.string().min(1, 'Workspace name is required').max(100, 'Workspace name too long'),
    slug: z.string().min(1, 'Workspace slug is required').max(50, 'Workspace slug too long')
      .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens')
  }),

  // Workspace update body
  updateWorkspaceBody: z.object({
    name: z.string().min(1, 'Workspace name is required').max(100, 'Workspace name too long').optional(),
    slug: z.string().min(1, 'Workspace slug is required').max(50, 'Workspace slug too long')
      .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens').optional()
  }),

  // KPI creation/update body
  kpiBody: z.object({
    name: z.string().min(1, 'KPI name is required').max(200, 'KPI name too long'),
    description: z.string().max(1000, 'Description too long').optional(),
    target: z.number().optional(),
    unit: z.string().max(50, 'Unit too long').optional(),
    category: z.string().max(100, 'Category too long').optional()
  }),

  // Objective creation/update body
  objectiveBody: z.object({
    title: z.string().min(1, 'Objective title is required').max(200, 'Title too long'),
    description: z.string().max(2000, 'Description too long').optional(),
    targetValue: z.number().optional(),
    deadline: z.string().datetime('Invalid deadline format').optional(),
    priority: z.enum(['low', 'medium', 'high']).optional()
  })
} as const;

/**
 * Standardized success response helper
 */
export function createSuccessResponse<T = any>(
  data: T,
  message?: string,
  status: number = 200
): Response {
  return new Response(
    JSON.stringify({
      success: true,
      message,
      data
    }),
    {
      status,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

/**
 * Standardized error response helper
 */
export function createErrorResponse(
  error: string,
  message: string,
  status: number = 400,
  details?: any
): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error,
      message,
      details
    }),
    {
      status,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

/**
 * Helper to extract workspace ID from route parameters
 */
export function extractWorkspaceId(params: any): string {
  if (params?.params?.workspaceId) {
    return params.params.workspaceId;
  }
  if (params?.workspaceId) {
    return params.workspaceId;
  }
  throw new ApiValidationError(
    AuthError.WORKSPACE_ACCESS_DENIED,
    'Workspace ID not found in route parameters',
    400
  );
}