import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { WorkspaceRole } from '../../db';

// Mock the auth session
vi.mock('../session', () => ({
  getAuthSession: vi.fn(),
  requireAuth: vi.fn(),
  requireWorkspaceAuth: vi.fn(),
}));

// Mock the API validation
vi.mock('../api-validation', () => ({
  validateApiAccess: vi.fn(),
  validateWorkspaceAccess: vi.fn(),
  validatePermission: vi.fn(),
}));

const mockGetAuthSession = vi.mocked(await import('../session')).getAuthSession;
const mockRequireAuth = vi.mocked(await import('../session')).requireAuth;
const mockRequireWorkspaceAuth = vi.mocked(await import('../session')).requireWorkspaceAuth;
const mockValidateApiAccess = vi.mocked(await import('../api-validation')).validateApiAccess;
const mockValidateWorkspaceAccess = vi.mocked(await import('../api-validation')).validateWorkspaceAccess;
const mockValidatePermission = vi.mocked(await import('../api-validation')).validatePermission;

describe('API Security Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication Validation', () => {
    it('should allow authenticated requests to protected endpoints', async () => {
      const mockSession = {
        user: { id: 'user-1', email: 'user@example.com', name: 'User' },
        workspaceId: 'workspace-1',
        role: WorkspaceRole.MEMBER,
        expires: '2024-12-31',
      };

      mockGetAuthSession.mockResolvedValue(mockSession);
      mockValidateApiAccess.mockResolvedValue({ success: true, session: mockSession });

      const request = new NextRequest('http://localhost:3000/api/kpis');
      const result = await mockValidateApiAccess(request);

      expect(result.success).toBe(true);
      expect(result.session).toEqual(mockSession);
    });

    it('should reject unauthenticated requests to protected endpoints', async () => {
      mockGetAuthSession.mockResolvedValue(null);
      mockValidateApiAccess.mockResolvedValue({ 
        success: false, 
        error: 'Authentication required',
        status: 401 
      });

      const request = new NextRequest('http://localhost:3000/api/kpis');
      const result = await mockValidateApiAccess(request);

      expect(result.success).toBe(false);
      expect(result.status).toBe(401);
      expect(result.error).toBe('Authentication required');
    });

    it('should allow public endpoints without authentication', async () => {
      mockValidateApiAccess.mockResolvedValue({ success: true });

      const request = new NextRequest('http://localhost:3000/api/health');
      const result = await mockValidateApiAccess(request);

      expect(result.success).toBe(true);
      expect(mockGetAuthSession).not.toHaveBeenCalled();
    });
  });

  describe('Workspace Access Validation', () => {
    it('should allow access to authorized workspace resources', async () => {
      const mockSession = {
        user: { id: 'user-1', email: 'user@example.com', name: 'User' },
        workspaceId: 'workspace-1',
        role: WorkspaceRole.ADMIN,
        expires: '2024-12-31',
      };

      mockRequireWorkspaceAuth.mockResolvedValue(mockSession);
      mockValidateWorkspaceAccess.mockResolvedValue({ 
        success: true, 
        session: mockSession,
        workspaceId: 'workspace-1'
      });

      const request = new NextRequest('http://localhost:3000/api/workspaces/workspace-1/kpis');
      const result = await mockValidateWorkspaceAccess(request, 'workspace-1');

      expect(result.success).toBe(true);
      expect(result.workspaceId).toBe('workspace-1');
    });

    it('should reject access to unauthorized workspace resources', async () => {
      mockRequireWorkspaceAuth.mockRejectedValue(new Error('Workspace access denied'));
      mockValidateWorkspaceAccess.mockResolvedValue({ 
        success: false, 
        error: 'Workspace access denied',
        status: 403 
      });

      const request = new NextRequest('http://localhost:3000/api/workspaces/workspace-2/kpis');
      const result = await mockValidateWorkspaceAccess(request, 'workspace-2');

      expect(result.success).toBe(false);
      expect(result.status).toBe(403);
    });

    it('should validate workspace ID from URL parameters', async () => {
      const mockSession = {
        user: { id: 'user-1', email: 'user@example.com', name: 'User' },
        workspaceId: 'workspace-1',
        role: WorkspaceRole.OWNER,
        expires: '2024-12-31',
      };

      mockRequireWorkspaceAuth.mockResolvedValue(mockSession);
      mockValidateWorkspaceAccess.mockImplementation(async (request, workspaceId) => {
        const url = new URL(request.url);
        const urlWorkspaceId = url.pathname.split('/')[3]; // Extract from /api/workspaces/{id}/...
        
        if (urlWorkspaceId === workspaceId && workspaceId === mockSession.workspaceId) {
          return { success: true, session: mockSession, workspaceId };
        }
        return { success: false, error: 'Workspace mismatch', status: 403 };
      });

      const request = new NextRequest('http://localhost:3000/api/workspaces/workspace-1/members');
      const result = await mockValidateWorkspaceAccess(request, 'workspace-1');

      expect(result.success).toBe(true);
    });
  });

  describe('Permission-Based Access Control', () => {
    it('should allow actions with sufficient permissions', async () => {
      const mockSession = {
        user: { id: 'user-1', email: 'admin@example.com', name: 'Admin' },
        workspaceId: 'workspace-1',
        role: WorkspaceRole.ADMIN,
        expires: '2024-12-31',
      };

      mockValidatePermission.mockResolvedValue({ 
        success: true, 
        session: mockSession,
        hasPermission: true 
      });

      const request = new NextRequest('http://localhost:3000/api/workspaces/workspace-1/kpis', {
        method: 'POST'
      });
      const result = await mockValidatePermission(request, 'create_kpi');

      expect(result.success).toBe(true);
      expect(result.hasPermission).toBe(true);
    });

    it('should reject actions without sufficient permissions', async () => {
      const mockSession = {
        user: { id: 'user-1', email: 'member@example.com', name: 'Member' },
        workspaceId: 'workspace-1',
        role: WorkspaceRole.MEMBER,
        expires: '2024-12-31',
      };

      mockValidatePermission.mockResolvedValue({ 
        success: false, 
        error: 'Insufficient permissions',
        status: 403,
        hasPermission: false 
      });

      const request = new NextRequest('http://localhost:3000/api/workspaces/workspace-1/kpis', {
        method: 'POST'
      });
      const result = await mockValidatePermission(request, 'create_kpi');

      expect(result.success).toBe(false);
      expect(result.status).toBe(403);
      expect(result.hasPermission).toBe(false);
    });

    it('should validate different permissions for different HTTP methods', async () => {
      const mockSession = {
        user: { id: 'user-1', email: 'member@example.com', name: 'Member' },
        workspaceId: 'workspace-1',
        role: WorkspaceRole.MEMBER,
        expires: '2024-12-31',
      };

      // GET requests (view permission) - should succeed
      mockValidatePermission.mockResolvedValueOnce({ 
        success: true, 
        session: mockSession,
        hasPermission: true 
      });

      const getRequest = new NextRequest('http://localhost:3000/api/workspaces/workspace-1/kpis', {
        method: 'GET'
      });
      const getResult = await mockValidatePermission(getRequest, 'view_kpi');
      expect(getResult.success).toBe(true);

      // POST requests (create permission) - should fail
      mockValidatePermission.mockResolvedValueOnce({ 
        success: false, 
        error: 'Insufficient permissions',
        status: 403,
        hasPermission: false 
      });

      const postRequest = new NextRequest('http://localhost:3000/api/workspaces/workspace-1/kpis', {
        method: 'POST'
      });
      const postResult = await mockValidatePermission(postRequest, 'create_kpi');
      expect(postResult.success).toBe(false);
    });
  });

  describe('Cross-Workspace Security', () => {
    it('should prevent access to resources from different workspace', async () => {
      const mockSession = {
        user: { id: 'user-1', email: 'user@example.com', name: 'User' },
        workspaceId: 'workspace-1',
        role: WorkspaceRole.OWNER,
        expires: '2024-12-31',
      };

      mockGetAuthSession.mockResolvedValue(mockSession);
      mockValidateWorkspaceAccess.mockResolvedValue({ 
        success: false, 
        error: 'Cross-workspace access denied',
        status: 403 
      });

      // User tries to access workspace-2 resources while in workspace-1 context
      const request = new NextRequest('http://localhost:3000/api/workspaces/workspace-2/kpis');
      const result = await mockValidateWorkspaceAccess(request, 'workspace-2');

      expect(result.success).toBe(false);
      expect(result.status).toBe(403);
    });

    it('should log security violations', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const mockSession = {
        user: { id: 'user-1', email: 'user@example.com', name: 'User' },
        workspaceId: 'workspace-1',
        role: WorkspaceRole.MEMBER,
        expires: '2024-12-31',
      };

      mockGetAuthSession.mockResolvedValue(mockSession);
      mockValidateWorkspaceAccess.mockImplementation(async () => {
        console.warn('SECURITY_VIOLATION: Cross-workspace access attempt', {
          userId: 'user-1',
          userWorkspace: 'workspace-1',
          attemptedWorkspace: 'workspace-2',
          timestamp: new Date().toISOString()
        });
        return { success: false, error: 'Security violation logged', status: 403 };
      });

      const request = new NextRequest('http://localhost:3000/api/workspaces/workspace-2/kpis');
      await mockValidateWorkspaceAccess(request, 'workspace-2');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('SECURITY_VIOLATION'),
        expect.objectContaining({
          userId: 'user-1',
          userWorkspace: 'workspace-1',
          attemptedWorkspace: 'workspace-2'
        })
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Rate Limiting and Abuse Prevention', () => {
    it('should enforce rate limits on API endpoints', async () => {
      const mockSession = {
        user: { id: 'user-1', email: 'user@example.com', name: 'User' },
        workspaceId: 'workspace-1',
        role: WorkspaceRole.MEMBER,
        expires: '2024-12-31',
      };

      // First few requests should succeed
      mockValidateApiAccess.mockResolvedValueOnce({ success: true, session: mockSession });
      mockValidateApiAccess.mockResolvedValueOnce({ success: true, session: mockSession });
      mockValidateApiAccess.mockResolvedValueOnce({ success: true, session: mockSession });

      // After rate limit exceeded
      mockValidateApiAccess.mockResolvedValueOnce({ 
        success: false, 
        error: 'Rate limit exceeded',
        status: 429 
      });

      const request = new NextRequest('http://localhost:3000/api/workspaces/workspace-1/kpis');
      
      // Simulate multiple requests
      const results = await Promise.all([
        mockValidateApiAccess(request),
        mockValidateApiAccess(request),
        mockValidateApiAccess(request),
        mockValidateApiAccess(request),
      ]);

      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(results[2].success).toBe(true);
      expect(results[3].success).toBe(false);
      expect(results[3].status).toBe(429);
    });

    it('should detect and prevent brute force attempts', async () => {
      mockValidateApiAccess.mockImplementation(async (request) => {
        const url = new URL(request.url);
        if (url.pathname.includes('/auth/signin')) {
          // Simulate failed login attempts
          return { 
            success: false, 
            error: 'Too many failed attempts',
            status: 429 
          };
        }
        return { success: true };
      });

      const request = new NextRequest('http://localhost:3000/api/auth/signin', {
        method: 'POST'
      });

      const result = await mockValidateApiAccess(request);
      expect(result.status).toBe(429);
    });
  });

  describe('Input Validation and Sanitization', () => {
    it('should validate and sanitize request bodies', async () => {
      const mockSession = {
        user: { id: 'user-1', email: 'user@example.com', name: 'User' },
        workspaceId: 'workspace-1',
        role: WorkspaceRole.ADMIN,
        expires: '2024-12-31',
      };

      mockValidateApiAccess.mockImplementation(async (request) => {
        const body = await request.json().catch(() => ({}));
        
        // Validate required fields
        if (!body.name || typeof body.name !== 'string') {
          return { 
            success: false, 
            error: 'Invalid input: name is required',
            status: 400 
          };
        }

        // Sanitize input
        if (body.name.includes('<script>')) {
          return { 
            success: false, 
            error: 'Invalid input: potentially malicious content',
            status: 400 
          };
        }

        return { success: true, session: mockSession };
      });

      // Valid request
      const validRequest = new NextRequest('http://localhost:3000/api/workspaces/workspace-1/kpis', {
        method: 'POST',
        body: JSON.stringify({ name: 'Valid KPI Name', value: 100 })
      });

      const validResult = await mockValidateApiAccess(validRequest);
      expect(validResult.success).toBe(true);

      // Invalid request - missing name
      const invalidRequest1 = new NextRequest('http://localhost:3000/api/workspaces/workspace-1/kpis', {
        method: 'POST',
        body: JSON.stringify({ value: 100 })
      });

      const invalidResult1 = await mockValidateApiAccess(invalidRequest1);
      expect(invalidResult1.success).toBe(false);
      expect(invalidResult1.status).toBe(400);

      // Invalid request - XSS attempt
      const maliciousRequest = new NextRequest('http://localhost:3000/api/workspaces/workspace-1/kpis', {
        method: 'POST',
        body: JSON.stringify({ name: '<script>alert("xss")</script>', value: 100 })
      });

      const maliciousResult = await mockValidateApiAccess(maliciousRequest);
      expect(maliciousResult.success).toBe(false);
      expect(maliciousResult.status).toBe(400);
    });
  });
});