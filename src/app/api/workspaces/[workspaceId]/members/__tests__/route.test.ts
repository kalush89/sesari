import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import { prisma } from '@/lib/db';
import { WorkspaceRole } from '@/lib/db';

// Mock the auth session
vi.mock('@/lib/auth/session', () => ({
  getAuthSession: vi.fn()
}));

// Mock RLS context
vi.mock('@/lib/db/rls', () => ({
  setRLSContext: vi.fn()
}));

const { getAuthSession } = await import('@/lib/auth/session');
const { setRLSContext } = await import('@/lib/db/rls');

describe('/api/workspaces/[workspaceId]/members', () => {
  let testUser: any;
  let testWorkspace: any;
  let adminUser: any;
  let memberUser: any;

  beforeEach(async () => {
    // Create test users
    testUser = await prisma.user.create({
      data: {
        email: 'owner@example.com',
        name: 'Owner User'
      }
    });

    adminUser = await prisma.user.create({
      data: {
        email: 'admin@example.com',
        name: 'Admin User'
      }
    });

    memberUser = await prisma.user.create({
      data: {
        email: 'member@example.com',
        name: 'Member User'
      }
    });

    // Create test workspace
    testWorkspace = await prisma.workspace.create({
      data: {
        name: 'Test Workspace',
        slug: 'test-workspace',
        ownerId: testUser.id,
        planType: 'free'
      }
    });

    // Create memberships
    await prisma.workspaceMembership.create({
      data: {
        workspaceId: testWorkspace.id,
        userId: testUser.id,
        role: WorkspaceRole.OWNER
      }
    });

    await prisma.workspaceMembership.create({
      data: {
        workspaceId: testWorkspace.id,
        userId: adminUser.id,
        role: WorkspaceRole.ADMIN
      }
    });

    await prisma.workspaceMembership.create({
      data: {
        workspaceId: testWorkspace.id,
        userId: memberUser.id,
        role: WorkspaceRole.MEMBER
      }
    });
  });

  afterEach(async () => {
    // Cleanup test data
    await prisma.workspaceInvitation.deleteMany({
      where: { workspaceId: testWorkspace.id }
    });
    await prisma.workspaceMembership.deleteMany({
      where: { workspaceId: testWorkspace.id }
    });
    await prisma.workspace.deleteMany({
      where: { id: testWorkspace.id }
    });
    await prisma.user.deleteMany({
      where: {
        id: { in: [testUser.id, adminUser.id, memberUser.id] }
      }
    });
    vi.clearAllMocks();
  });

  describe('GET /api/workspaces/[workspaceId]/members', () => {
    it('should return members and pending invitations for authorized user', async () => {
      // Mock authenticated session
      vi.mocked(getAuthSession).mockResolvedValue({
        user: { id: testUser.id, email: testUser.email, name: testUser.name }
      } as any);

      // Create a pending invitation
      await prisma.workspaceInvitation.create({
        data: {
          workspaceId: testWorkspace.id,
          email: 'invited@example.com',
          role: WorkspaceRole.MEMBER,
          invitedBy: testUser.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      });

      const request = new NextRequest('http://localhost/api/workspaces/test/members');
      const response = await GET(request, { params: { workspaceId: testWorkspace.id } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.members).toHaveLength(3); // owner, admin, member
      expect(data.pendingInvitations).toHaveLength(1);
      expect(data.userRole).toBe(WorkspaceRole.OWNER);
    });

    it('should return 401 for unauthenticated user', async () => {
      vi.mocked(getAuthSession).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/workspaces/test/members');
      const response = await GET(request, { params: { workspaceId: testWorkspace.id } });

      expect(response.status).toBe(401);
    });

    it('should return 404 for workspace user has no access to', async () => {
      const unauthorizedUser = await prisma.user.create({
        data: {
          email: 'unauthorized@example.com',
          name: 'Unauthorized User'
        }
      });

      vi.mocked(getAuthSession).mockResolvedValue({
        user: { id: unauthorizedUser.id, email: unauthorizedUser.email, name: unauthorizedUser.name }
      } as any);

      const request = new NextRequest('http://localhost/api/workspaces/test/members');
      const response = await GET(request, { params: { workspaceId: testWorkspace.id } });

      expect(response.status).toBe(404);

      // Cleanup
      await prisma.user.delete({ where: { id: unauthorizedUser.id } });
    });

    it('should not show pending invitations to members without invite permission', async () => {
      vi.mocked(getAuthSession).mockResolvedValue({
        user: { id: memberUser.id, email: memberUser.email, name: memberUser.name }
      } as any);

      // Create a pending invitation
      await prisma.workspaceInvitation.create({
        data: {
          workspaceId: testWorkspace.id,
          email: 'invited@example.com',
          role: WorkspaceRole.MEMBER,
          invitedBy: testUser.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      });

      const request = new NextRequest('http://localhost/api/workspaces/test/members');
      const response = await GET(request, { params: { workspaceId: testWorkspace.id } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.members).toHaveLength(3);
      expect(data.pendingInvitations).toHaveLength(0); // Member can't see invitations
      expect(data.userRole).toBe(WorkspaceRole.MEMBER);
    });
  });

  describe('POST /api/workspaces/[workspaceId]/members', () => {
    it('should create invitation for authorized user', async () => {
      vi.mocked(getAuthSession).mockResolvedValue({
        user: { id: testUser.id, email: testUser.email, name: testUser.name }
      } as any);

      const request = new NextRequest('http://localhost/api/workspaces/test/members', {
        method: 'POST',
        body: JSON.stringify({
          email: 'newmember@example.com',
          role: 'member'
        })
      });

      const response = await POST(request, { params: { workspaceId: testWorkspace.id } });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.message).toBe('Invitation sent successfully');
      expect(data.invitation.email).toBe('newmember@example.com');
      expect(data.invitation.role).toBe('member');

      // Verify invitation was created in database
      const invitation = await prisma.workspaceInvitation.findFirst({
        where: {
          workspaceId: testWorkspace.id,
          email: 'newmember@example.com'
        }
      });
      expect(invitation).toBeTruthy();
    });

    it('should return 403 for user without invite permission', async () => {
      vi.mocked(getAuthSession).mockResolvedValue({
        user: { id: memberUser.id, email: memberUser.email, name: memberUser.name }
      } as any);

      const request = new NextRequest('http://localhost/api/workspaces/test/members', {
        method: 'POST',
        body: JSON.stringify({
          email: 'newmember@example.com',
          role: 'member'
        })
      });

      const response = await POST(request, { params: { workspaceId: testWorkspace.id } });

      expect(response.status).toBe(403);
    });

    it('should return 400 for invalid email', async () => {
      vi.mocked(getAuthSession).mockResolvedValue({
        user: { id: testUser.id, email: testUser.email, name: testUser.name }
      } as any);

      const request = new NextRequest('http://localhost/api/workspaces/test/members', {
        method: 'POST',
        body: JSON.stringify({
          email: 'invalid-email',
          role: 'member'
        })
      });

      const response = await POST(request, { params: { workspaceId: testWorkspace.id } });

      expect(response.status).toBe(400);
    });

    it('should return 409 for existing member', async () => {
      vi.mocked(getAuthSession).mockResolvedValue({
        user: { id: testUser.id, email: testUser.email, name: testUser.name }
      } as any);

      const request = new NextRequest('http://localhost/api/workspaces/test/members', {
        method: 'POST',
        body: JSON.stringify({
          email: adminUser.email, // Already a member
          role: 'member'
        })
      });

      const response = await POST(request, { params: { workspaceId: testWorkspace.id } });

      expect(response.status).toBe(409);
    });

    it('should return 409 for duplicate pending invitation', async () => {
      vi.mocked(getAuthSession).mockResolvedValue({
        user: { id: testUser.id, email: testUser.email, name: testUser.name }
      } as any);

      // Create existing invitation
      await prisma.workspaceInvitation.create({
        data: {
          workspaceId: testWorkspace.id,
          email: 'duplicate@example.com',
          role: WorkspaceRole.MEMBER,
          invitedBy: testUser.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      });

      const request = new NextRequest('http://localhost/api/workspaces/test/members', {
        method: 'POST',
        body: JSON.stringify({
          email: 'duplicate@example.com',
          role: 'member'
        })
      });

      const response = await POST(request, { params: { workspaceId: testWorkspace.id } });

      expect(response.status).toBe(409);
    });
  });
});