import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { setRLSContext } from '@/lib/db/rls';
import { hasPermission, WorkspaceRole, Permission } from '@/lib/db';
import { z } from 'zod';

// Schema for inviting a member
const InviteMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['admin', 'member'], {
    errorMap: () => ({ message: 'Role must be admin or member' })
  })
});

/**
 * GET /api/workspaces/[workspaceId]/members
 * Get all members and pending invitations for a workspace
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workspaceId } = await params;

    // Set RLS context
    await setRLSContext(prisma, session.user.id);

    // Verify user has access to this workspace and can view members
    const membership = await prisma.workspaceMembership.findFirst({
      where: {
        workspaceId,
        userId: session.user.id
      }
    });

    if (!membership) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // Get all members
    const members = await prisma.workspaceMembership.findMany({
      where: { workspaceId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
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
      orderBy: [
        { role: 'asc' }, // owners first, then admins, then members
        { joinedAt: 'asc' }
      ]
    });

    // Get pending invitations (only if user can invite members)
    let pendingInvitations: any[] = [];
    if (hasPermission(membership.role as WorkspaceRole, Permission.INVITE_MEMBERS)) {
      pendingInvitations = await prisma.workspaceInvitation.findMany({
        where: {
          workspaceId,
          accepted: false,
          expiresAt: {
            gt: new Date() // Only non-expired invitations
          }
        },
        include: {
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
    }

    return NextResponse.json({
      members,
      pendingInvitations,
      userRole: membership.role
    });

  } catch (error) {
    console.error('Error fetching workspace members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workspace members' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/workspaces/[workspaceId]/members
 * Invite a new member to the workspace
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workspaceId } = await params;
    const body = await request.json();

    // Validate request body
    const validationResult = InviteMemberSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { email, role } = validationResult.data;

    // Set RLS context
    await setRLSContext(prisma, session.user.id);

    // Verify user has permission to invite members
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

    // Check if user is already a member
    const existingMember = await prisma.workspaceMembership.findFirst({
      where: {
        workspaceId,
        user: { email }
      }
    });

    if (existingMember) {
      return NextResponse.json(
        { error: 'User is already a member of this workspace' },
        { status: 409 }
      );
    }

    // Check if there's already a pending invitation
    const existingInvitation = await prisma.workspaceInvitation.findFirst({
      where: {
        workspaceId,
        email,
        accepted: false,
        expiresAt: {
          gt: new Date()
        }
      }
    });

    if (existingInvitation) {
      return NextResponse.json(
        { error: 'An invitation has already been sent to this email' },
        { status: 409 }
      );
    }

    // Create the invitation
    const invitation = await prisma.workspaceInvitation.create({
      data: {
        workspaceId,
        email,
        role,
        invitedBy: session.user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
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

    // TODO: Send invitation email (implement in future task)
    // await sendInvitationEmail(invitation);

    return NextResponse.json({
      message: 'Invitation sent successfully',
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        invitedAt: invitation.invitedAt,
        expiresAt: invitation.expiresAt,
        workspace: invitation.workspace,
        inviter: invitation.inviter
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error inviting member:', error);
    return NextResponse.json(
      { error: 'Failed to send invitation' },
      { status: 500 }
    );
  }
}