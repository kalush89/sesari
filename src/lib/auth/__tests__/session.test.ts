import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAuthSession, requireAuth, requireWorkspaceAuth, hasPermission } from '../session';
import { WorkspaceRole } from '../../db';

// Mock next-auth
vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

// Mock auth config
vi.mock('../config', () => ({
  authOptions: {},
}));

// Mock permissions
vi.mock('../../db/permissions', () => ({
  checkPermission: vi.fn(),
}));

const mockGetServerSession = vi.mocked(await import('next-auth/next')).getServerSession;
const mockCheckPermission = vi.mocked(await import('../../db/permissions')).checkPermission;

describe('Auth Session Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAuthSession', () => {
    it('should return session when authenticated', async () => {
      const mockSession = {
        user: { id: '1', email: 'test@example.com', name: 'Test User' },
        workspaceId: 'workspace-1',
        role: WorkspaceRole.OWNER,
        expires: '2024-12-31',
      };

      mockGetServerSession.mockResolvedValue(mockSession);

      const result = await getAuthSession();
      expect(result).toEqual(mockSession);
    });

    it('should return null when not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const result = await getAuthSession();
      expect(result).toBeNull();
    });
  });

  describe('requireAuth', () => {
    it('should return session when authenticated', async () => {
      const mockSession = {
        user: { id: '1', email: 'test@example.com', name: 'Test User' },
        workspaceId: 'workspace-1',
        role: WorkspaceRole.OWNER,
        expires: '2024-12-31',
      };

      mockGetServerSession.mockResolvedValue(mockSession);

      const result = await requireAuth();
      expect(result).toEqual(mockSession);
    });

    it('should throw error when not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      await expect(requireAuth()).rejects.toThrow('Authentication required');
    });
  });

  describe('requireWorkspaceAuth', () => {
    it('should return session with workspace context when authorized', async () => {
      const mockSession = {
        user: { id: '1', email: 'test@example.com', name: 'Test User' },
        workspaceId: 'workspace-1',
        role: WorkspaceRole.OWNER,
        expires: '2024-12-31',
      };

      mockGetServerSession.mockResolvedValue(mockSession);

      const result = await requireWorkspaceAuth('workspace-1');
      expect(result).toEqual(mockSession);
    });

    it('should throw error when workspace access denied', async () => {
      const mockSession = {
        user: { id: '1', email: 'test@example.com', name: 'Test User' },
        workspaceId: 'workspace-2',
        role: WorkspaceRole.OWNER,
        expires: '2024-12-31',
      };

      mockGetServerSession.mockResolvedValue(mockSession);

      await expect(requireWorkspaceAuth('workspace-1')).rejects.toThrow('Workspace access denied');
    });

    it('should throw error when no workspace context', async () => {
      const mockSession = {
        user: { id: '1', email: 'test@example.com', name: 'Test User' },
        expires: '2024-12-31',
      };

      mockGetServerSession.mockResolvedValue(mockSession);

      await expect(requireWorkspaceAuth('workspace-1')).rejects.toThrow('Workspace access denied');
    });
  });

  describe('hasPermission', () => {
    it('should return true when user has permission', async () => {
      const mockSession = {
        user: { id: '1', email: 'test@example.com', name: 'Test User' },
        workspaceId: 'workspace-1',
        role: WorkspaceRole.OWNER,
        expires: '2024-12-31',
      };

      mockGetServerSession.mockResolvedValue(mockSession);
      mockCheckPermission.mockReturnValue(true);

      const result = await hasPermission('create_kpi', 'workspace-1');
      expect(result).toBe(true);
      expect(mockCheckPermission).toHaveBeenCalledWith(WorkspaceRole.OWNER, 'create_kpi');
    });

    it('should return false when user lacks permission', async () => {
      const mockSession = {
        user: { id: '1', email: 'test@example.com', name: 'Test User' },
        workspaceId: 'workspace-1',
        role: WorkspaceRole.MEMBER,
        expires: '2024-12-31',
      };

      mockGetServerSession.mockResolvedValue(mockSession);
      mockCheckPermission.mockReturnValue(false);

      const result = await hasPermission('create_kpi', 'workspace-1');
      expect(result).toBe(false);
    });

    it('should return false when not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const result = await hasPermission('create_kpi');
      expect(result).toBe(false);
    });
  });
});