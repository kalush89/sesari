import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { 
  validateAuth, 
  validateWorkspaceAuth, 
  validatePermission,
  validateAllPermissions,
  validateAnyPermission,
  ApiValidationError,
  handleApiError
} from '../api-validation';
import { WorkspaceRole, Permission } from '../../db';
import { AuthError } from '../../types/auth';

// Mock next-auth/jwt
vi.mock('next-auth/jwt', () => ({
  getToken: vi.fn()
}));

const mockGetToken = vi.mocked(await import('next-auth/jwt')).getToken;

describe('API Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateAuth', () => {
    it('should return user session when token is valid', async () => {
      const mockToken = {
        sub: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        workspaceId: 'workspace-1',
        role: WorkspaceRole.OWNER
      };

      mockGetToken.mockResolvedValue(mockToken);

      const request = new NextRequest('http://localhost/api/test');
      const result = await validateAuth(request);

      expect(result).toEqual({
        userId: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        workspaceId: 'workspace-1',
        role: WorkspaceRole.OWNER
      });
    });

    it('should throw ApiValidationError when no token', async () => {
      mockGetToken.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/test');
      
      await expect(validateAuth(request)).rejects.toThrow(ApiValidationError);
      await expect(validateAuth(request)).rejects.toThrow('Authentication required');
    });

    it('should throw ApiValidationError when token has no sub', async () => {
      mockGetToken.mockResolvedValue({ email: 'test@example.com' });

      const request = new NextRequest('http://localhost/api/test');
      
      await expect(validateAuth(request)).rejects.toThrow(ApiValidationError);
    });
  });

  describe('validateWorkspaceAuth', () => {
    it('should return session with workspace context when authorized', async () => {
      const mockToken = {
        sub: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        workspaceId: 'workspace-1',
        role: WorkspaceRole.ADMIN
      };

      mockGetToken.mockResolvedValue(mockToken);

      const request = new NextRequest('http://localhost/api/test');
      const result = await validateWorkspaceAuth(request, 'workspace-1');

      expect(result).toEqual({
        userId: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        workspaceId: 'workspace-1',
        role: WorkspaceRole.ADMIN
      });
    });

    it('should throw error when workspace ID does not match', async () => {
      const mockToken = {
        sub: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        workspaceId: 'workspace-1',
        role: WorkspaceRole.ADMIN
      };

      mockGetToken.mockResolvedValue(mockToken);

      const request = new NextRequest('http://localhost/api/test');
      
      await expect(validateWorkspaceAuth(request, 'workspace-2')).rejects.toThrow(
        'Access denied to this workspace'
      );
    });

    it('should throw error when no workspace ID in session', async () => {
      const mockToken = {
        sub: 'user-1',
        email: 'test@example.com',
        name: 'Test User'
      };

      mockGetToken.mockResolvedValue(mockToken);

      const request = new NextRequest('http://localhost/api/test');
      
      await expect(validateWorkspaceAuth(request, 'workspace-1')).rejects.toThrow(
        'Access denied to this workspace'
      );
    });

    it('should throw error when no role assigned', async () => {
      const mockToken = {
        sub: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        workspaceId: 'workspace-1'
      };

      mockGetToken.mockResolvedValue(mockToken);

      const request = new NextRequest('http://localhost/api/test');
      
      await expect(validateWorkspaceAuth(request, 'workspace-1')).rejects.toThrow(
        'No role assigned in workspace'
      );
    });
  });

  describe('validatePermission', () => {
    it('should return session when user has required permission', async () => {
      const mockToken = {
        sub: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        workspaceId: 'workspace-1',
        role: WorkspaceRole.OWNER
      };

      mockGetToken.mockResolvedValue(mockToken);

      const request = new NextRequest('http://localhost/api/test');
      const result = await validatePermission(request, 'workspace-1', Permission.CREATE_KPI);

      expect(result.role).toBe(WorkspaceRole.OWNER);
    });

    it('should throw error when user lacks required permission', async () => {
      const mockToken = {
        sub: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        workspaceId: 'workspace-1',
        role: WorkspaceRole.MEMBER
      };

      mockGetToken.mockResolvedValue(mockToken);

      const request = new NextRequest('http://localhost/api/test');
      
      await expect(validatePermission(request, 'workspace-1', Permission.CREATE_KPI)).rejects.toThrow(
        'Permission denied: create_kpi'
      );
    });
  });

  describe('validateAllPermissions', () => {
    it('should return session when user has all required permissions', async () => {
      const mockToken = {
        sub: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        workspaceId: 'workspace-1',
        role: WorkspaceRole.OWNER
      };

      mockGetToken.mockResolvedValue(mockToken);

      const request = new NextRequest('http://localhost/api/test');
      const result = await validateAllPermissions(request, 'workspace-1', [
        Permission.CREATE_KPI,
        Permission.EDIT_KPI
      ]);

      expect(result.role).toBe(WorkspaceRole.OWNER);
    });

    it('should throw error when user lacks any required permission', async () => {
      const mockToken = {
        sub: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        workspaceId: 'workspace-1',
        role: WorkspaceRole.MEMBER
      };

      mockGetToken.mockResolvedValue(mockToken);

      const request = new NextRequest('http://localhost/api/test');
      
      await expect(validateAllPermissions(request, 'workspace-1', [
        Permission.VIEW_KPI,
        Permission.CREATE_KPI
      ])).rejects.toThrow('Missing required permissions');
    });
  });

  describe('validateAnyPermission', () => {
    it('should return session when user has at least one required permission', async () => {
      const mockToken = {
        sub: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        workspaceId: 'workspace-1',
        role: WorkspaceRole.MEMBER
      };

      mockGetToken.mockResolvedValue(mockToken);

      const request = new NextRequest('http://localhost/api/test');
      const result = await validateAnyPermission(request, 'workspace-1', [
        Permission.CREATE_KPI,
        Permission.VIEW_KPI
      ]);

      expect(result.role).toBe(WorkspaceRole.MEMBER);
    });

    it('should throw error when user has none of the required permissions', async () => {
      const mockToken = {
        sub: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        workspaceId: 'workspace-1',
        role: WorkspaceRole.MEMBER
      };

      mockGetToken.mockResolvedValue(mockToken);

      const request = new NextRequest('http://localhost/api/test');
      
      await expect(validateAnyPermission(request, 'workspace-1', [
        Permission.CREATE_KPI,
        Permission.MANAGE_WORKSPACE
      ])).rejects.toThrow('Missing any of required permissions');
    });
  });

  describe('handleApiError', () => {
    it('should return proper response for ApiValidationError', () => {
      const error = new ApiValidationError(
        AuthError.INSUFFICIENT_PERMISSIONS,
        'Permission denied',
        403
      );

      const response = handleApiError(error);
      
      expect(response.status).toBe(403);
    });

    it('should return 500 for unexpected errors', () => {
      const error = new Error('Unexpected error');

      const response = handleApiError(error);
      
      expect(response.status).toBe(500);
    });
  });
});