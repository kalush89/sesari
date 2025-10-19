import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createApiRoute, ApiSchemas, createSuccessResponse, createErrorResponse } from '../api-route-security';
import { ApiSecurityPresets } from '../api-middleware';
import { AuthError } from '../../types/auth';

// Mock next-auth/jwt
vi.mock('next-auth/jwt', () => ({
  getToken: vi.fn()
}));

// Mock the database
vi.mock('../../db', () => ({
  Permission: {
    VIEW_KPI: 'view_kpi',
    CREATE_KPI: 'create_kpi',
    EDIT_KPI: 'edit_kpi',
    DELETE_KPI: 'delete_kpi'
  },
  WorkspaceRole: {
    OWNER: 'owner',
    ADMIN: 'admin',
    MEMBER: 'member'
  },
  hasPermission: vi.fn()
}));

const { getToken } = await import('next-auth/jwt');
const { hasPermission } = await import('../../db');

describe('API Route Security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createApiRoute', () => {
    it('should validate authentication for protected routes', async () => {
      const mockHandler = vi.fn().mockResolvedValue(createSuccessResponse({ message: 'success' }));
      
      const secureHandler = createApiRoute(
        ApiSecurityPresets.AUTHENTICATED,
        mockHandler
      );

      // Mock unauthenticated request
      vi.mocked(getToken).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/test', {
        method: 'GET'
      });

      const response = await secureHandler(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe(AuthError.SESSION_EXPIRED);
      expect(mockHandler).not.toHaveBeenCalled();
    });

    it('should validate workspace access for workspace-scoped routes', async () => {
      const mockHandler = vi.fn().mockResolvedValue(createSuccessResponse({ message: 'success' }));
      
      const secureHandler = createApiRoute(
        ApiSecurityPresets.WORKSPACE,
        mockHandler
      );

      // Mock authenticated user with different workspace
      vi.mocked(getToken).mockResolvedValue({
        sub: 'user-1',
        email: 'user@example.com',
        name: 'Test User',
        workspaceId: 'workspace-1',
        role: 'member'
      });

      const request = new NextRequest('http://localhost/api/workspaces/workspace-2/kpis', {
        method: 'GET'
      });

      const response = await secureHandler(request, { params: { workspaceId: 'workspace-2' } });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe(AuthError.WORKSPACE_ACCESS_DENIED);
      expect(mockHandler).not.toHaveBeenCalled();
    });

    it('should validate permissions for permission-protected routes', async () => {
      const mockHandler = vi.fn().mockResolvedValue(createSuccessResponse({ message: 'success' }));
      
      const secureHandler = createApiRoute(
        ApiSecurityPresets.KPI_WRITE,
        mockHandler
      );

      // Mock authenticated user with insufficient permissions
      vi.mocked(getToken).mockResolvedValue({
        sub: 'user-1',
        email: 'user@example.com',
        name: 'Test User',
        workspaceId: 'workspace-1',
        role: 'member'
      });

      vi.mocked(hasPermission).mockReturnValue(false);

      const request = new NextRequest('http://localhost/api/workspaces/workspace-1/kpis', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test KPI' })
      });

      const response = await secureHandler(request, { params: { workspaceId: 'workspace-1' } });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe(AuthError.INSUFFICIENT_PERMISSIONS);
      expect(mockHandler).not.toHaveBeenCalled();
    });

    it('should validate request body with Zod schema', async () => {
      const mockHandler = vi.fn().mockResolvedValue(createSuccessResponse({ message: 'success' }));
      
      const secureHandler = createApiRoute(
        {
          ...ApiSecurityPresets.AUTHENTICATED,
          bodySchema: ApiSchemas.kpiBody,
          methods: ['POST']
        },
        mockHandler
      );

      // Mock authenticated user
      vi.mocked(getToken).mockResolvedValue({
        sub: 'user-1',
        email: 'user@example.com',
        name: 'Test User'
      });

      const request = new NextRequest('http://localhost/api/test', {
        method: 'POST',
        body: JSON.stringify({ name: '' }) // Invalid: empty name
      });

      const response = await secureHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('validation_error');
      expect(data.message).toBe('Invalid request body');
      expect(mockHandler).not.toHaveBeenCalled();
    });

    it('should validate HTTP methods', async () => {
      const mockHandler = vi.fn().mockResolvedValue(createSuccessResponse({ message: 'success' }));
      
      const secureHandler = createApiRoute(
        {
          ...ApiSecurityPresets.PUBLIC,
          methods: ['GET', 'POST']
        },
        mockHandler
      );

      const request = new NextRequest('http://localhost/api/test', {
        method: 'DELETE'
      });

      const response = await secureHandler(request);
      const data = await response.json();

      expect(response.status).toBe(405);
      expect(data.error).toBe('method_not_allowed');
      expect(response.headers.get('Allow')).toBe('GET, POST');
      expect(mockHandler).not.toHaveBeenCalled();
    });

    it('should validate route parameters with Zod schema', async () => {
      const mockHandler = vi.fn().mockResolvedValue(createSuccessResponse({ message: 'success' }));
      
      const secureHandler = createApiRoute(
        {
          ...ApiSecurityPresets.PUBLIC,
          paramsSchema: ApiSchemas.workspaceParam
        },
        mockHandler
      );

      const request = new NextRequest('http://localhost/api/test', {
        method: 'GET'
      });

      const response = await secureHandler(request, { params: { workspaceId: 'invalid-uuid' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('validation_error');
      expect(data.message).toBe('Invalid route parameters');
      expect(mockHandler).not.toHaveBeenCalled();
    });

    it('should validate query parameters with Zod schema', async () => {
      const mockHandler = vi.fn().mockResolvedValue(createSuccessResponse({ message: 'success' }));
      
      const secureHandler = createApiRoute(
        {
          ...ApiSecurityPresets.PUBLIC,
          querySchema: ApiSchemas.paginationQuery
        },
        mockHandler
      );

      const request = new NextRequest('http://localhost/api/test?page=invalid', {
        method: 'GET'
      });

      const response = await secureHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('validation_error');
      expect(data.message).toBe('Invalid query parameters');
      expect(mockHandler).not.toHaveBeenCalled();
    });

    it('should pass validated data to handler when all checks pass', async () => {
      const mockHandler = vi.fn().mockResolvedValue(createSuccessResponse({ message: 'success' }));
      
      const secureHandler = createApiRoute(
        {
          ...ApiSecurityPresets.WORKSPACE,
          bodySchema: ApiSchemas.kpiBody,
          paramsSchema: ApiSchemas.workspaceParam,
          querySchema: ApiSchemas.paginationQuery,
          methods: ['POST']
        },
        mockHandler
      );

      // Mock authenticated user with proper permissions
      const workspaceId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      vi.mocked(getToken).mockResolvedValue({
        sub: 'user-1',
        email: 'user@example.com',
        name: 'Test User',
        workspaceId: workspaceId,
        role: 'admin'
      });

      const request = new NextRequest(`http://localhost/api/workspaces/${workspaceId}/kpis?page=1&limit=10`, {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test KPI',
          description: 'A test KPI',
          target: 100,
          unit: 'count'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await secureHandler(request, { 
        params: { workspaceId: workspaceId } 
      });

      // Debug the response if it fails
      if (response.status !== 200) {
        const errorData = await response.json();
        console.log('Error response:', errorData);
      }

      expect(response.status).toBe(200);
      expect(mockHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          email: 'user@example.com',
          name: 'Test User',
          workspaceId: workspaceId,
          role: 'admin'
        }),
        expect.objectContaining({
          body: {
            name: 'Test KPI',
            description: 'A test KPI',
            target: 100,
            unit: 'count'
          },
          params: { workspaceId: workspaceId },
          query: { page: 1, limit: 10 },
          method: 'POST'
        })
      );
    });
  });

  describe('Response Helpers', () => {
    it('should create success response with correct format', () => {
      const response = createSuccessResponse({ id: 1, name: 'Test' }, 'Created successfully', 201);
      
      expect(response.status).toBe(201);
      expect(response.headers.get('Content-Type')).toBe('application/json');
    });

    it('should create error response with correct format', () => {
      const response = createErrorResponse('validation_error', 'Invalid input', 400, { field: 'name' });
      
      expect(response.status).toBe(400);
      expect(response.headers.get('Content-Type')).toBe('application/json');
    });
  });

  describe('Schema Validation', () => {
    it('should validate UUID parameters correctly', () => {
      const validUuid = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      const invalidUuid = 'invalid-uuid';

      expect(() => ApiSchemas.uuidParam.parse({ id: validUuid })).not.toThrow();
      expect(() => ApiSchemas.uuidParam.parse({ id: invalidUuid })).toThrow();
    });

    it('should validate workspace parameters correctly', () => {
      const validUuid = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      const invalidUuid = 'invalid-uuid';

      expect(() => ApiSchemas.workspaceParam.parse({ workspaceId: validUuid })).not.toThrow();
      expect(() => ApiSchemas.workspaceParam.parse({ workspaceId: invalidUuid })).toThrow();
    });

    it('should validate pagination query parameters correctly', () => {
      const validQuery = { page: '1', limit: '10', sort: 'name', order: 'asc' as const };
      const invalidQuery = { page: 'invalid', limit: '10' };
      const validNumericQuery = { page: 1, limit: 10, sort: 'name', order: 'asc' as const };

      expect(() => ApiSchemas.paginationQuery.parse(validQuery)).not.toThrow();
      expect(() => ApiSchemas.paginationQuery.parse(validNumericQuery)).not.toThrow();
      expect(() => ApiSchemas.paginationQuery.parse(invalidQuery)).toThrow();
    });

    it('should validate member invitation body correctly', () => {
      const validBody = { email: 'user@example.com', role: 'admin' as const };
      const invalidBody = { email: 'invalid-email', role: 'invalid-role' };

      expect(() => ApiSchemas.inviteMemberBody.parse(validBody)).not.toThrow();
      expect(() => ApiSchemas.inviteMemberBody.parse(invalidBody)).toThrow();
    });

    it('should validate KPI body correctly', () => {
      const validBody = {
        name: 'Test KPI',
        description: 'A test KPI',
        target: 100,
        unit: 'count',
        category: 'sales'
      };
      const invalidBody = {
        name: '', // Empty name should fail
        target: 'invalid' // Should be number
      };

      expect(() => ApiSchemas.kpiBody.parse(validBody)).not.toThrow();
      expect(() => ApiSchemas.kpiBody.parse(invalidBody)).toThrow();
    });
  });
});