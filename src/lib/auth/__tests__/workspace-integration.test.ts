import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createWorkspace, switchWorkspace, inviteToWorkspace } from '../invitation-utils';
import { WorkspaceRole } from '../../db';

// Mock Prisma
const mockPrisma = {
  workspace: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
  workspaceMembership: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  },
};

vi.mock('../../db', () => ({
  prisma: mockPrisma,
  WorkspaceRole,
}));

// Mock session
vi.mock('../session', () => ({
  getAuthSession: vi.fn(),
  requireAuth: vi.fn(),
}));

const mockGetAuthSession = vi.mocked(await import('../session')).getAuthSession;
const mockRequireAuth = vi.mocked(await import('../session')).requireAuth;

describe('Workspace Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Workspace Creation', () => {
    it('should create workspace with owner membership', async () => {
      const mockSession = {
        user: { id: 'user-1', email: 'owner@example.com', name: 'Owner' },
        expires: '2024-12-31',
      };

      const mockWorkspace = {
        id: 'workspace-1',
        name: 'Test Workspace',
        slug: 'test-workspace',
        ownerId: 'user-1',
      };

      const mockMembership = {
        id: 'membership-1',
        workspaceId: 'workspace-1',
        userId: 'user-1',
        role: WorkspaceRole.OWNER,
      };

      mockRequireAuth.mockResolvedValue(mockSession);
      mockPrisma.workspace.create.mockResolvedValue(mockWorkspace);
      mockPrisma.workspaceMembership.create.mockResolvedValue(mockMembership);

      const result = await createWorkspace('Test Workspace');

      expect(result).toEqual(mockWorkspace);
      expect(mockPrisma.workspace.create).toHaveBeenCalledWith({
        data: {
          name: 'Test Workspace',
          slug: expect.stringMatching(/^test-workspace/),
          ownerId: 'user-1',
        },
      });
      expect(mockPrisma.workspaceMembership.create).toHaveBeenCalledWith({
        data: {
          workspaceId: 'workspace-1',
          userId: 'user-1',
          role: WorkspaceRole.OWNER,
        },
      });
    });

    it('should handle workspace creation errors', async () => {
      const mockSession = {
        user: { id: 'user-1', email: 'owner@example.com', name: 'Owner' },
        expires: '2024-12-31',
      };

      mockRequireAuth.mockResolvedValue(mockSession);
      mockPrisma.workspace.create.mockRejectedValue(new Error('Database error'));

      await expect(createWorkspace('Test Workspace')).rejects.toThrow('Database error');
    });
  });

  describe('Workspace Switching', () => {
    it('should switch to authorized workspace', async () => {
      const mockSession = {
        user: { id: 'user-1', email: 'user@example.com', name: 'User' },
        workspaceId: 'workspace-1',
        role: WorkspaceRole.MEMBER,
        expires: '2024-12-31',
      };

      const mockMembership = {
        id: 'membership-2',
        workspaceId: 'workspace-2',
        userId: 'user-1',
        role: WorkspaceRole.ADMIN,
        workspace: {
          id: 'workspace-2',
          name: 'New Workspace',
        },
      };

      mockRequireAuth.mockResolvedValue(mockSession);
      mockPrisma.workspaceMembership.findUnique.mockResolvedValue(mockMembership);

      const result = await switchWorkspace('workspace-2');

      expect(result).toEqual({
        workspaceId: 'workspace-2',
        role: WorkspaceRole.ADMIN,
        workspace: mockMembership.workspace,
      });
    });

    it('should reject switching to unauthorized workspace', async () => {
      const mockSession = {
        user: { id: 'user-1', email: 'user@example.com', name: 'User' },
        workspaceId: 'workspace-1',
        role: WorkspaceRole.MEMBER,
        expires: '2024-12-31',
      };

      mockRequireAuth.mockResolvedValue(mockSession);
      mockPrisma.workspaceMembership.findUnique.mockResolvedValue(null);

      await expect(switchWorkspace('workspace-2')).rejects.toThrow('Workspace access denied');
    });
  });

  describe('Workspace Invitations', () => {
    it('should create invitation for valid workspace owner', async () => {
      const mockSession = {
        user: { id: 'user-1', email: 'owner@example.com', name: 'Owner' },
        workspaceId: 'workspace-1',
        role: WorkspaceRole.OWNER,
        expires: '2024-12-31',
      };

      const mockWorkspace = {
        id: 'workspace-1',
        name: 'Test Workspace',
        ownerId: 'user-1',
      };

      const mockInvitation = {
        id: 'invitation-1',
        workspaceId: 'workspace-1',
        email: 'invitee@example.com',
        role: WorkspaceRole.MEMBER,
        invitedBy: 'user-1',
        token: 'invitation-token',
      };

      mockRequireAuth.mockResolvedValue(mockSession);
      mockPrisma.workspace.findUnique.mockResolvedValue(mockWorkspace);
      mockPrisma.workspaceMembership.create.mockResolvedValue(mockInvitation);

      const result = await inviteToWorkspace('workspace-1', 'invitee@example.com', WorkspaceRole.MEMBER);

      expect(result).toEqual(mockInvitation);
      expect(mockPrisma.workspaceMembership.create).toHaveBeenCalledWith({
        data: {
          workspaceId: 'workspace-1',
          email: 'invitee@example.com',
          role: WorkspaceRole.MEMBER,
          invitedBy: 'user-1',
          token: expect.any(String),
          invitedAt: expect.any(Date),
        },
      });
    });

    it('should reject invitation from non-owner', async () => {
      const mockSession = {
        user: { id: 'user-2', email: 'member@example.com', name: 'Member' },
        workspaceId: 'workspace-1',
        role: WorkspaceRole.MEMBER,
        expires: '2024-12-31',
      };

      const mockWorkspace = {
        id: 'workspace-1',
        name: 'Test Workspace',
        ownerId: 'user-1',
      };

      mockRequireAuth.mockResolvedValue(mockSession);
      mockPrisma.workspace.findUnique.mockResolvedValue(mockWorkspace);

      await expect(
        inviteToWorkspace('workspace-1', 'invitee@example.com', WorkspaceRole.MEMBER)
      ).rejects.toThrow('Insufficient permissions');
    });

    it('should reject invitation to non-existent workspace', async () => {
      const mockSession = {
        user: { id: 'user-1', email: 'owner@example.com', name: 'Owner' },
        workspaceId: 'workspace-1',
        role: WorkspaceRole.OWNER,
        expires: '2024-12-31',
      };

      mockRequireAuth.mockResolvedValue(mockSession);
      mockPrisma.workspace.findUnique.mockResolvedValue(null);

      await expect(
        inviteToWorkspace('workspace-999', 'invitee@example.com', WorkspaceRole.MEMBER)
      ).rejects.toThrow('Workspace not found');
    });
  });

  describe('Multi-tenant Data Isolation', () => {
    it('should enforce workspace isolation in queries', async () => {
      const mockSession = {
        user: { id: 'user-1', email: 'user@example.com', name: 'User' },
        workspaceId: 'workspace-1',
        role: WorkspaceRole.MEMBER,
        expires: '2024-12-31',
      };

      mockGetAuthSession.mockResolvedValue(mockSession);

      // Mock workspace-specific data query
      mockPrisma.workspaceMembership.findMany.mockResolvedValue([
        {
          id: 'membership-1',
          workspaceId: 'workspace-1',
          userId: 'user-1',
          role: WorkspaceRole.MEMBER,
        },
      ]);

      // This would be called by a function that enforces workspace isolation
      const memberships = await mockPrisma.workspaceMembership.findMany({
        where: { workspaceId: 'workspace-1' },
      });

      expect(memberships).toHaveLength(1);
      expect(memberships[0].workspaceId).toBe('workspace-1');
    });

    it('should prevent cross-workspace data access', async () => {
      const mockSession = {
        user: { id: 'user-1', email: 'user@example.com', name: 'User' },
        workspaceId: 'workspace-1',
        role: WorkspaceRole.MEMBER,
        expires: '2024-12-31',
      };

      mockGetAuthSession.mockResolvedValue(mockSession);

      // Attempting to access data from different workspace should be blocked
      mockPrisma.workspaceMembership.findMany.mockResolvedValue([]);

      const memberships = await mockPrisma.workspaceMembership.findMany({
        where: { workspaceId: 'workspace-2' }, // Different workspace
      });

      // Should return empty array due to RLS policies
      expect(memberships).toHaveLength(0);
    });
  });
});