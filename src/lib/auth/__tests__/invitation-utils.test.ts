import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  createInvitation, 
  acceptInvitation, 
  validateInvitation,
  getInvitationByToken,
  revokeInvitation,
  cleanupExpiredInvitations
} from '../invitation-utils';
import { WorkspaceRole } from '../../db';

// Mock Prisma
const mockPrisma = {
  workspaceInvitation: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  },
  workspaceMembership: {
    create: vi.fn(),
    findUnique: vi.fn(),
  },
  workspace: {
    findUnique: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  },
};

vi.mock('../../db', () => ({
  prisma: mockPrisma,
  WorkspaceRole: {
    OWNER: 'owner',
    ADMIN: 'admin',
    MEMBER: 'member',
  },
}));

describe('Invitation Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createInvitation', () => {
    it('should create invitation with valid data', async () => {
      const mockInvitation = {
        id: 'invitation-1',
        email: 'test@example.com',
        role: WorkspaceRole.MEMBER,
        workspaceId: 'workspace-1',
        invitedBy: 'user-1',
        token: 'invitation-token',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      };

      mockPrisma.workspaceInvitation.create.mockResolvedValue(mockInvitation);

      const result = await createInvitation({
        email: 'test@example.com',
        role: WorkspaceRole.MEMBER,
        workspaceId: 'workspace-1',
        invitedBy: 'user-1',
      });

      expect(result).toEqual(mockInvitation);
      expect(mockPrisma.workspaceInvitation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'test@example.com',
          role: WorkspaceRole.MEMBER,
          workspaceId: 'workspace-1',
          invitedBy: 'user-1',
          token: expect.any(String),
          expiresAt: expect.any(Date),
        }),
      });
    });

    it('should throw error for invalid email', async () => {
      await expect(createInvitation({
        email: 'invalid-email',
        role: WorkspaceRole.MEMBER,
        workspaceId: 'workspace-1',
        invitedBy: 'user-1',
      })).rejects.toThrow('Invalid email address');
    });

    it('should throw error for invalid role', async () => {
      await expect(createInvitation({
        email: 'test@example.com',
        role: 'invalid-role' as WorkspaceRole,
        workspaceId: 'workspace-1',
        invitedBy: 'user-1',
      })).rejects.toThrow('Invalid role');
    });
  });

  describe('acceptInvitation', () => {
    it('should accept valid invitation and create membership', async () => {
      const mockInvitation = {
        id: 'invitation-1',
        email: 'test@example.com',
        role: WorkspaceRole.MEMBER,
        workspaceId: 'workspace-1',
        token: 'invitation-token',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        acceptedAt: null,
      };

      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
      };

      const mockMembership = {
        id: 'membership-1',
        workspaceId: 'workspace-1',
        userId: 'user-1',
        role: WorkspaceRole.MEMBER,
      };

      mockPrisma.workspaceInvitation.findUnique.mockResolvedValue(mockInvitation);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.workspaceMembership.findUnique.mockResolvedValue(null);
      mockPrisma.workspaceMembership.create.mockResolvedValue(mockMembership);
      mockPrisma.workspaceInvitation.update.mockResolvedValue({
        ...mockInvitation,
        acceptedAt: new Date(),
      });

      const result = await acceptInvitation('invitation-token', 'user-1');

      expect(result).toEqual(mockMembership);
      expect(mockPrisma.workspaceMembership.create).toHaveBeenCalledWith({
        data: {
          workspaceId: 'workspace-1',
          userId: 'user-1',
          role: WorkspaceRole.MEMBER,
          invitedBy: mockInvitation.invitedBy,
          invitedAt: mockInvitation.createdAt,
        },
      });
    });

    it('should throw error for expired invitation', async () => {
      const mockInvitation = {
        id: 'invitation-1',
        email: 'test@example.com',
        role: WorkspaceRole.MEMBER,
        workspaceId: 'workspace-1',
        token: 'invitation-token',
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Expired
        acceptedAt: null,
      };

      mockPrisma.workspaceInvitation.findUnique.mockResolvedValue(mockInvitation);

      await expect(acceptInvitation('invitation-token', 'user-1')).rejects.toThrow('Invitation has expired');
    });

    it('should throw error for already accepted invitation', async () => {
      const mockInvitation = {
        id: 'invitation-1',
        email: 'test@example.com',
        role: WorkspaceRole.MEMBER,
        workspaceId: 'workspace-1',
        token: 'invitation-token',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        acceptedAt: new Date(),
      };

      mockPrisma.workspaceInvitation.findUnique.mockResolvedValue(mockInvitation);

      await expect(acceptInvitation('invitation-token', 'user-1')).rejects.toThrow('Invitation has already been accepted');
    });

    it('should throw error for email mismatch', async () => {
      const mockInvitation = {
        id: 'invitation-1',
        email: 'test@example.com',
        role: WorkspaceRole.MEMBER,
        workspaceId: 'workspace-1',
        token: 'invitation-token',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        acceptedAt: null,
      };

      const mockUser = {
        id: 'user-1',
        email: 'different@example.com',
      };

      mockPrisma.workspaceInvitation.findUnique.mockResolvedValue(mockInvitation);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(acceptInvitation('invitation-token', 'user-1')).rejects.toThrow('Email address does not match invitation');
    });

    it('should throw error for existing membership', async () => {
      const mockInvitation = {
        id: 'invitation-1',
        email: 'test@example.com',
        role: WorkspaceRole.MEMBER,
        workspaceId: 'workspace-1',
        token: 'invitation-token',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        acceptedAt: null,
      };

      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
      };

      const mockExistingMembership = {
        id: 'membership-1',
        workspaceId: 'workspace-1',
        userId: 'user-1',
        role: WorkspaceRole.ADMIN,
      };

      mockPrisma.workspaceInvitation.findUnique.mockResolvedValue(mockInvitation);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.workspaceMembership.findUnique.mockResolvedValue(mockExistingMembership);

      await expect(acceptInvitation('invitation-token', 'user-1')).rejects.toThrow('User is already a member of this workspace');
    });
  });

  describe('validateInvitation', () => {
    it('should return true for valid invitation', async () => {
      const mockInvitation = {
        id: 'invitation-1',
        email: 'test@example.com',
        role: WorkspaceRole.MEMBER,
        workspaceId: 'workspace-1',
        token: 'invitation-token',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        acceptedAt: null,
      };

      mockPrisma.workspaceInvitation.findUnique.mockResolvedValue(mockInvitation);

      const result = await validateInvitation('invitation-token');
      expect(result).toBe(true);
    });

    it('should return false for expired invitation', async () => {
      const mockInvitation = {
        id: 'invitation-1',
        email: 'test@example.com',
        role: WorkspaceRole.MEMBER,
        workspaceId: 'workspace-1',
        token: 'invitation-token',
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Expired
        acceptedAt: null,
      };

      mockPrisma.workspaceInvitation.findUnique.mockResolvedValue(mockInvitation);

      const result = await validateInvitation('invitation-token');
      expect(result).toBe(false);
    });

    it('should return false for accepted invitation', async () => {
      const mockInvitation = {
        id: 'invitation-1',
        email: 'test@example.com',
        role: WorkspaceRole.MEMBER,
        workspaceId: 'workspace-1',
        token: 'invitation-token',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        acceptedAt: new Date(),
      };

      mockPrisma.workspaceInvitation.findUnique.mockResolvedValue(mockInvitation);

      const result = await validateInvitation('invitation-token');
      expect(result).toBe(false);
    });

    it('should return false for non-existent invitation', async () => {
      mockPrisma.workspaceInvitation.findUnique.mockResolvedValue(null);

      const result = await validateInvitation('invalid-token');
      expect(result).toBe(false);
    });
  });

  describe('getInvitationByToken', () => {
    it('should return invitation for valid token', async () => {
      const mockInvitation = {
        id: 'invitation-1',
        email: 'test@example.com',
        role: WorkspaceRole.MEMBER,
        workspaceId: 'workspace-1',
        token: 'invitation-token',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        acceptedAt: null,
      };

      mockPrisma.workspaceInvitation.findUnique.mockResolvedValue(mockInvitation);

      const result = await getInvitationByToken('invitation-token');
      expect(result).toEqual(mockInvitation);
    });

    it('should return null for invalid token', async () => {
      mockPrisma.workspaceInvitation.findUnique.mockResolvedValue(null);

      const result = await getInvitationByToken('invalid-token');
      expect(result).toBeNull();
    });
  });

  describe('revokeInvitation', () => {
    it('should revoke invitation successfully', async () => {
      const mockInvitation = {
        id: 'invitation-1',
        email: 'test@example.com',
        role: WorkspaceRole.MEMBER,
        workspaceId: 'workspace-1',
        token: 'invitation-token',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        acceptedAt: null,
      };

      mockPrisma.workspaceInvitation.findUnique.mockResolvedValue(mockInvitation);
      mockPrisma.workspaceInvitation.delete.mockResolvedValue(mockInvitation);

      const result = await revokeInvitation('invitation-1');
      expect(result).toBe(true);
      expect(mockPrisma.workspaceInvitation.delete).toHaveBeenCalledWith({
        where: { id: 'invitation-1' },
      });
    });

    it('should return false for non-existent invitation', async () => {
      mockPrisma.workspaceInvitation.findUnique.mockResolvedValue(null);

      const result = await revokeInvitation('invalid-id');
      expect(result).toBe(false);
    });

    it('should throw error for already accepted invitation', async () => {
      const mockInvitation = {
        id: 'invitation-1',
        email: 'test@example.com',
        role: WorkspaceRole.MEMBER,
        workspaceId: 'workspace-1',
        token: 'invitation-token',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        acceptedAt: new Date(),
      };

      mockPrisma.workspaceInvitation.findUnique.mockResolvedValue(mockInvitation);

      await expect(revokeInvitation('invitation-1')).rejects.toThrow('Cannot revoke accepted invitation');
    });
  });

  describe('cleanupExpiredInvitations', () => {
    it('should delete expired invitations', async () => {
      mockPrisma.workspaceInvitation.deleteMany.mockResolvedValue({ count: 5 });

      const result = await cleanupExpiredInvitations();
      expect(result).toBe(5);
      expect(mockPrisma.workspaceInvitation.deleteMany).toHaveBeenCalledWith({
        where: {
          expiresAt: {
            lt: expect.any(Date),
          },
          acceptedAt: null,
        },
      });
    });

    it('should return 0 when no expired invitations', async () => {
      mockPrisma.workspaceInvitation.deleteMany.mockResolvedValue({ count: 0 });

      const result = await cleanupExpiredInvitations();
      expect(result).toBe(0);
    });
  });
});