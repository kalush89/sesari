import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { setRLSContext } from '@/lib/db/rls';
import { hasPermission, WorkspaceRole, Permission } from '@/lib/db';
import { z } from 'zod';

// Schema for updating member role
const UpdateMemberSchema = z.object({
  role: z.enum(['admin', 'member'], {
    errorMap: () => ({ message: 'Role must be admin or member' })
  })
});

/**
 * PATCH /api/workspaces/[workspaceId]/members/[memberId]
 * Update a member's role in the workspace
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; memberId: string }> }
) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workspaceId, memberId } = await params;
    const body = await request.json();

    // Validate request body
    const validationResult = UpdateMemberSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { role } = validationResult.data;

    // Set RLS context
    await setRLSContext(prisma, session.user.id);

    // Verify user has permission to manage workspace
    const userMembership = await prisma.workspaceMembership.findFirst({
      where: {
        workspaceId,
        userId: session.user.id
      }
    });

    if (!userMembership) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // Only owners can change member roles
    if (userMembership.role !== WorkspaceRole.OWNER) {
      return NextResponse.json({ error: 'Only workspace owners can change member roles' }, { status: 403 });
    }

    // Find the member to update
    const memberToUpdate = await prisma.workspaceMembership.findFirst({
      where: {
        id: memberId,
        workspaceId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!memberToUpdate) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Cannot change the owner's role
    if (memberToUpdate.role === WorkspaceRole.OWNER) {
      return NextResponse.json({ error: 'Cannot change the workspace owner\'s role' }, { status: 400 });
    }

    // Cannot change your own role
    if (memberToUpdate.userId === session.user.id) {
      return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 });
    }

    // Update the member's role
    const updatedMember = await prisma.workspaceMembership.update({
      where: { id: memberId },
      data: { role },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        }
      }
    });

    return NextResponse.json({
      message: 'Member role updated successfully',
      member: updatedMember
    });

  } catch (error) {
    console.error('Error updating member role:', error);
    return NextResponse.json(
      { error: 'Failed to update member role' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/workspaces/[workspaceId]/members/[memberId]
 * Remove a member from the workspace
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; memberId: string }> }
) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workspaceId, memberId } = await params;

    // Set RLS context
    await setRLSContext(prisma, session.user.id);

    // Verify user has permission to manage workspace
    const userMembership = await prisma.workspaceMembership.findFirst({
      where: {
        workspaceId,
        userId: session.user.id
      }
    });

    if (!userMembership) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // Find the member to remove
    const memberToRemove = await prisma.workspaceMembership.findFirst({
      where: {
        id: memberId,
        workspaceId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!memberToRemove) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Cannot remove the workspace owner
    if (memberToRemove.role === WorkspaceRole.OWNER) {
      return NextResponse.json({ error: 'Cannot remove the workspace owner' }, { status: 400 });
    }

    // Only owners can remove members, or members can remove themselves
    const canRemove = userMembership.role === WorkspaceRole.OWNER || 
                     memberToRemove.userId === session.user.id;

    if (!canRemove) {
      return NextResponse.json({ error: 'Insufficient permissions to remove this member' }, { status: 403 });
    }

    // Remove the member
    await prisma.workspaceMembership.delete({
      where: { id: memberId }
    });

    return NextResponse.json({
      message: 'Member removed successfully'
    });

  } catch (error) {
    console.error('Error removing member:', error);
    return NextResponse.json(
      { error: 'Failed to remove member' },
      { status: 500 }
    );
  }
}