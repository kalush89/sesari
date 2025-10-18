import { prisma } from '@/lib/db';
import { WorkspaceRole } from '@/lib/db';

/**
 * Process pending invitations for a user when they sign in
 * This automatically adds users to workspaces they were invited to
 */
export async function processPendingInvitations(userId: string, email: string) {
  try {
    // Find all pending, non-expired invitations for this email
    const pendingInvitations = await prisma.workspaceInvitation.findMany({
      where: {
        email,
        accepted: false,
        expiresAt: {
          gt: new Date()
        }
      },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    });

    if (pendingInvitations.length === 0) {
      return { processedCount: 0, memberships: [] };
    }

    const processedMemberships = [];

    // Process each invitation
    for (const invitation of pendingInvitations) {
      try {
        // Check if user is already a member of this workspace
        const existingMembership = await prisma.workspaceMembership.findFirst({
          where: {
            workspaceId: invitation.workspaceId,
            userId
          }
        });

        if (existingMembership) {
          // Just mark the invitation as accepted
          await prisma.workspaceInvitation.update({
            where: { id: invitation.id },
            data: {
              accepted: true,
              acceptedAt: new Date()
            }
          });
          continue;
        }

        // Create workspace membership and mark invitation as accepted
        const membership = await prisma.$transaction(async (tx) => {
          // Create the membership
          const newMembership = await tx.workspaceMembership.create({
            data: {
              workspaceId: invitation.workspaceId,
              userId,
              role: invitation.role,
              invitedBy: invitation.invitedBy,
              invitedAt: invitation.invitedAt,
              joinedAt: new Date()
            },
            include: {
              workspace: {
                select: {
                  id: true,
                  name: true,
                  slug: true
                }
              }
            }
          });

          // Mark invitation as accepted
          await tx.workspaceInvitation.update({
            where: { id: invitation.id },
            data: {
              accepted: true,
              acceptedAt: new Date()
            }
          });

          return newMembership;
        });

        processedMemberships.push(membership);

      } catch (error) {
        console.error(`Error processing invitation ${invitation.id}:`, error);
        // Continue processing other invitations even if one fails
      }
    }

    return {
      processedCount: processedMemberships.length,
      memberships: processedMemberships
    };

  } catch (error) {
    console.error('Error processing pending invitations:', error);
    return { processedCount: 0, memberships: [] };
  }
}

/**
 * Get pending invitations for a user by email
 */
export async function getPendingInvitations(email: string) {
  try {
    const invitations = await prisma.workspaceInvitation.findMany({
      where: {
        email,
        accepted: false,
        expiresAt: {
          gt: new Date()
        }
      },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        inviter: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { invitedAt: 'desc' }
    });

    return invitations;
  } catch (error) {
    console.error('Error fetching pending invitations:', error);
    return [];
  }
}

/**
 * Clean up expired invitations (can be called periodically)
 */
export async function cleanupExpiredInvitations() {
  try {
    const result = await prisma.workspaceInvitation.deleteMany({
      where: {
        accepted: false,
        expiresAt: {
          lt: new Date()
        }
      }
    });

    console.log(`Cleaned up ${result.count} expired invitations`);
    return result.count;
  } catch (error) {
    console.error('Error cleaning up expired invitations:', error);
    return 0;
  }
}