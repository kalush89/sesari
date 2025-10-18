import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '../../db';
import { WorkspaceRole } from '../../db';
import { processPendingInvitations, getPendingInvitations, cleanupExpiredInvitations } from '../invitation-utils';

describe('Invitation Utils', () => {
  let testUser: any;
  let testWorkspace: any;
  let inviterUser: any;

  beforeEach(async () => {
    // Create test users
    testUser = await prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User'
      }
    });

    inviterUser = await prisma.user.create({
      data: {
        email: 'inviter@example.com',
        name: 'Inviter User'
      }
    });

    // Create test workspace
    testWorkspace = await prisma.workspace.create({
      data: {
        name: 'Test Workspace',
        slug: 'test-workspace',
        ownerId: inviterUser.id,
        planType: 'free'
      }
    });

    // Create owner membership for inviter
    await prisma.workspaceMembership.create({
      data: {
        workspaceId: testWorkspace.id,
        userId: inviterUser.id,
        role: WorkspaceRole.OWNER
      }
    });
  });

  afterEach(async () => {
    // Cleanup test data
    await prisma.workspaceInvitation.deleteMany({
      where: {
        OR: [
          { email: testUser.email },
          { invitedBy: inviterUser.id }
        ]
      }
    });
    await prisma.workspaceMembership.deleteMany({
      where: {
        OR: [
          { userId: testUser.id },
          { userId: inviterUser.id }
        ]
      }
    });
    await prisma.workspace.deleteMany({
      where: { id: testWorkspace.id }
    });
    await prisma.user.deleteMany({
      where: {
        id: { in: [testUser.id, inviterUser.id] }
      }
    });
  });

  describe('processPendingInvitations', () => {
    it('should process valid pending invitations', async () => {
      // Create a pending invitation
      const invitation = await prisma.workspaceInvitation.create({
        data: {
          workspaceId: testWorkspace.id,
          email: testUser.email,
          role: WorkspaceRole.ADMIN,
          invitedBy: inviterUser.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
        }
      });

      const result = await processPendingInvitations(testUser.id, testUser.email);

      expect(result.processedCount).toBe(1);
      expect(result.memberships).toHaveLength(1);
      expect(result.memberships[0].role).toBe(WorkspaceRole.ADMIN);
      expect(result.memberships[0].workspaceId).toBe(testWorkspace.id);

      // Check that invitation is marked as accepted
      const updatedInvitation = await prisma.workspaceInvitation.findUnique({
        where: { id: invitation.id }
      });
      expect(updatedInvitation?.accepted).toBe(true);
      expect(updatedInvitation?.acceptedAt).toBeTruthy();

      // Check that membership was created
      const membership = await prisma.workspaceMembership.findFirst({
        where: {
          workspaceId: testWorkspace.id,
          userId: testUser.id
        }
      });
      expect(membership).toBeTruthy();
      expect(membership?.role).toBe(WorkspaceRole.ADMIN);
    });

    it('should skip expired invitations', async () => {
      // Create an expired invitation
      await prisma.workspaceInvitation.create({
        data: {
          workspaceId: testWorkspace.id,
          email: testUser.email,
          role: WorkspaceRole.MEMBER,
          invitedBy: inviterUser.id,
          expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
        }
      });

      const result = await processPendingInvitations(testUser.id, testUser.email);

      expect(result.processedCount).toBe(0);
      expect(result.memberships).toHaveLength(0);

      // Check that no membership was created
      const membership = await prisma.workspaceMembership.findFirst({
        where: {
          workspaceId: testWorkspace.id,
          userId: testUser.id
        }
      });
      expect(membership).toBeNull();
    });

    it('should handle existing memberships gracefully', async () => {
      // Create existing membership
      await prisma.workspaceMembership.create({
        data: {
          workspaceId: testWorkspace.id,
          userId: testUser.id,
          role: WorkspaceRole.MEMBER
        }
      });

      // Create a pending invitation
      const invitation = await prisma.workspaceInvitation.create({
        data: {
          workspaceId: testWorkspace.id,
          email: testUser.email,
          role: WorkspaceRole.ADMIN,
          invitedBy: inviterUser.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      });

      const result = await processPendingInvitations(testUser.id, testUser.email);

      expect(result.processedCount).toBe(0);
      expect(result.memberships).toHaveLength(0);

      // Check that invitation is still marked as accepted
      const updatedInvitation = await prisma.workspaceInvitation.findUnique({
        where: { id: invitation.id }
      });
      expect(updatedInvitation?.accepted).toBe(true);
    });

    it('should return empty result for no invitations', async () => {
      const result = await processPendingInvitations(testUser.id, testUser.email);

      expect(result.processedCount).toBe(0);
      expect(result.memberships).toHaveLength(0);
    });
  });

  describe('getPendingInvitations', () => {
    it('should return pending invitations for user', async () => {
      // Create pending invitations
      const invitation1 = await prisma.workspaceInvitation.create({
        data: {
          workspaceId: testWorkspace.id,
          email: testUser.email,
          role: WorkspaceRole.ADMIN,
          invitedBy: inviterUser.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      });

      const invitations = await getPendingInvitations(testUser.email);

      expect(invitations).toHaveLength(1);
      expect(invitations[0].id).toBe(invitation1.id);
      expect(invitations[0].email).toBe(testUser.email);
      expect(invitations[0].role).toBe(WorkspaceRole.ADMIN);
      expect(invitations[0].workspace).toBeTruthy();
      expect(invitations[0].inviter).toBeTruthy();
    });

    it('should not return expired invitations', async () => {
      // Create expired invitation
      await prisma.workspaceInvitation.create({
        data: {
          workspaceId: testWorkspace.id,
          email: testUser.email,
          role: WorkspaceRole.MEMBER,
          invitedBy: inviterUser.id,
          expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
        }
      });

      const invitations = await getPendingInvitations(testUser.email);

      expect(invitations).toHaveLength(0);
    });

    it('should not return accepted invitations', async () => {
      // Create accepted invitation
      await prisma.workspaceInvitation.create({
        data: {
          workspaceId: testWorkspace.id,
          email: testUser.email,
          role: WorkspaceRole.MEMBER,
          invitedBy: inviterUser.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          accepted: true,
          acceptedAt: new Date()
        }
      });

      const invitations = await getPendingInvitations(testUser.email);

      expect(invitations).toHaveLength(0);
    });
  });

  describe('cleanupExpiredInvitations', () => {
    it('should remove expired invitations', async () => {
      // Create expired invitation
      const expiredInvitation = await prisma.workspaceInvitation.create({
        data: {
          workspaceId: testWorkspace.id,
          email: testUser.email,
          role: WorkspaceRole.MEMBER,
          invitedBy: inviterUser.id,
          expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
        }
      });

      // Create valid invitation
      const validInvitation = await prisma.workspaceInvitation.create({
        data: {
          workspaceId: testWorkspace.id,
          email: 'another@example.com',
          role: WorkspaceRole.MEMBER,
          invitedBy: inviterUser.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
        }
      });

      const cleanedCount = await cleanupExpiredInvitations();

      expect(cleanedCount).toBe(1);

      // Check that expired invitation was removed
      const expiredCheck = await prisma.workspaceInvitation.findUnique({
        where: { id: expiredInvitation.id }
      });
      expect(expiredCheck).toBeNull();

      // Check that valid invitation still exists
      const validCheck = await prisma.workspaceInvitation.findUnique({
        where: { id: validInvitation.id }
      });
      expect(validCheck).toBeTruthy();

      // Cleanup the valid invitation
      await prisma.workspaceInvitation.delete({
        where: { id: validInvitation.id }
      });
    });

    it('should not remove accepted invitations even if expired', async () => {
      // Create accepted but expired invitation
      const acceptedInvitation = await prisma.workspaceInvitation.create({
        data: {
          workspaceId: testWorkspace.id,
          email: testUser.email,
          role: WorkspaceRole.MEMBER,
          invitedBy: inviterUser.id,
          expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
          accepted: true,
          acceptedAt: new Date()
        }
      });

      const cleanedCount = await cleanupExpiredInvitations();

      expect(cleanedCount).toBe(0);

      // Check that accepted invitation still exists
      const acceptedCheck = await prisma.workspaceInvitation.findUnique({
        where: { id: acceptedInvitation.id }
      });
      expect(acceptedCheck).toBeTruthy();
    });
  });
});