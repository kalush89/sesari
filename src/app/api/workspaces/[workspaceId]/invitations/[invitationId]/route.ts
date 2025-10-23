import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { setRLSContext } from '@/lib/db/rls';
import { hasPermission, WorkspaceRole, Permission } from '@/lib/db';

/**
 * DELETE /api/workspaces/[workspaceId]/invitations/[invitationId]
 * Cancel a pending invitation
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; invitationId: string }> }
) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workspaceId, invitationId } = await params;

    // Set RLS context
    await setRLSContext(prisma, session.user.id);

    // Verify user has permission to manage invitations
    const membership = await prisma.workspaceMembership.findFirst({
      where: {
        workspaceId,
        userId: session.user.id
      }
    });

    if (!membership) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    if (!hasPermission(membership.role as WorkspaceRole, Permission.INVITE_MEMBERS)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Find the invitation
    const invitation = await prisma.workspaceInvitation.findFirst({
      where: {
        id: invitationId,
        workspaceId,
        accepted: false
      }
    });

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    // Delete the invitation
    await prisma.workspaceInvitation.delete({
      where: { id: invitationId }
    });

    return NextResponse.json({
      message: 'Invitation cancelled successfully'
    });

  } catch (error) {
    console.error('Error cancelling invitation:', error);
    return NextResponse.json(
      { error: 'Failed to cancel invitation' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/workspaces/[workspaceId]/invitations/[invitationId]/resend
 * Resend a pending invitation (extends expiry date)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; invitationId: string }> }
) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workspaceId, invitationId } = await params;

    // Set RLS context
    await setRLSContext(prisma, session.user.id);

    // Verify user has permission to manage invitations
    const membership = await prisma.workspaceMembership.findFirst({
      where: {
        workspaceId,
        userId: session.user.id
      }
    });

    if (!membership) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    if (!hasPermission(membership.role as WorkspaceRole, Permission.INVITE_MEMBERS)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Find the invitation
    const invitation = await prisma.workspaceInvitation.findFirst({
      where: {
        id: invitationId,
        workspaceId,
        accepted: false
      },
      include: {
        workspace: {
          select: {
            name: true,
            slug: true
          }
        },
        inviter: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    // Update the invitation with new expiry date
    const updatedInvitation = await prisma.workspaceInvitation.update({
      where: { id: invitationId },
      data: {
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        invitedAt: new Date(), // Update invited date to show it was resent
        updatedAt: new Date()
      },
      include: {
        workspace: {
          select: {
            name: true,
            slug: true
          }
        },
        inviter: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    // TODO: Send invitation email again (implement in future task)
    // await sendInvitationEmail(updatedInvitation);

    return NextResponse.json({
      message: 'Invitation resent successfully',
      invitation: {
        id: updatedInvitation.id,
        email: updatedInvitation.email,
        role: updatedInvitation.role,
        invitedAt: updatedInvitation.invitedAt,
        expiresAt: updatedInvitation.expiresAt,
        workspace: updatedInvitation.workspace,
        inviter: updatedInvitation.inviter
      }
    });

  } catch (error) {
    console.error('Error resending invitation:', error);
    return NextResponse.json(
      { error: 'Failed to resend invitation' },
      { status: 500 }
    );
  }
}