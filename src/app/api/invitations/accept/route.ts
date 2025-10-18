import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { z } from 'zod';

// Schema for accepting invitation
const AcceptInvitationSchema = z.object({
  invitationId: z.string().uuid('Invalid invitation ID')
});

/**
 * POST /api/invitations/accept
 * Accept a workspace invitation
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate request body
    const validationResult = AcceptInvitationSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { invitationId } = validationResult.data;

    // Find the invitation
    const invitation = await prisma.workspaceInvitation.findFirst({
      where: {
        id: invitationId,
        email: session.user.email,
        accepted: false,
        expiresAt: {
          gt: new Date() // Must not be expired
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

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found or expired' },
        { status: 404 }
      );
    }

    // Check if user is already a member of this workspace
    const existingMembership = await prisma.workspaceMembership.findFirst({
      where: {
        workspaceId: invitation.workspaceId,
        userId: session.user.id
      }
    });

    if (existingMembership) {
      // Mark invitation as accepted even though user is already a member
      await prisma.workspaceInvitation.update({
        where: { id: invitationId },
        data: {
          accepted: true,
          acceptedAt: new Date()
        }
      });

      return NextResponse.json({
        message: 'You are already a member of this workspace',
        workspace: invitation.workspace,
        membership: existingMembership
      });
    }

    // Use a transaction to ensure consistency
    const result = await prisma.$transaction(async (tx) => {
      // Create workspace membership
      const membership = await tx.workspaceMembership.create({
        data: {
          workspaceId: invitation.workspaceId,
          userId: session.user.id,
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
        where: { id: invitationId },
        data: {
          accepted: true,
          acceptedAt: new Date()
        }
      });

      return membership;
    });

    return NextResponse.json({
      message: 'Invitation accepted successfully',
      workspace: result.workspace,
      membership: {
        id: result.id,
        role: result.role,
        joinedAt: result.joinedAt
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error accepting invitation:', error);
    return NextResponse.json(
      { error: 'Failed to accept invitation' },
      { status: 500 }
    );
  }
}