import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db';
import { WorkspaceRole, ROLE_PERMISSIONS } from '@/lib/db';
import { ExtendedSession } from '@/lib/types/auth';
import { z } from 'zod';

const SwitchWorkspaceSchema = z.object({
  workspaceId: z.string().uuid(),
});

/**
 * POST /api/auth/workspace/switch
 * Switch the user's current workspace context
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as ExtendedSession | null;

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { workspaceId } = SwitchWorkspaceSchema.parse(body);

    // Verify user has access to the target workspace
    const membership = await prisma.workspaceMembership.findFirst({
      where: {
        userId: session.user.id,
        workspaceId: workspaceId,
      },
      include: {
        workspace: true,
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: 'Workspace access denied' },
        { status: 403 }
      );
    }

    const role = membership.role as WorkspaceRole;
    const permissions = ROLE_PERMISSIONS[role] || [];

    // Return the workspace data with role and permissions
    return NextResponse.json({
      workspace: {
        ...membership.workspace,
        userRole: role,
      },
      role,
      permissions,
    });

  } catch (error) {
    console.error('Error switching workspace:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}