import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db';
import { WorkspaceRole, ROLE_PERMISSIONS } from '@/lib/db';
import { ExtendedSession } from '@/lib/types/auth';

/**
 * GET /api/auth/workspace/list
 * Get all workspaces the user has access to
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as ExtendedSession | null;
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get all workspace memberships for the user with optimized query
    const memberships = await prisma.workspaceMembership.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
            slug: true,
            ownerId: true,
            planType: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
      orderBy: {
        joinedAt: 'asc',
      },
    });

    if (memberships.length === 0) {
      return NextResponse.json({
        workspaces: [],
        currentWorkspace: null,
        role: null,
        permissions: [],
      });
    }

    // Transform memberships to workspace data with user roles
    const workspaces = memberships.map(membership => ({
      ...membership.workspace,
      userRole: membership.role as WorkspaceRole,
    }));

    // Determine current workspace (from session or default to first)
    let currentWorkspace = null;
    let currentRole: WorkspaceRole | null = null;
    let currentPermissions: any[] = [];

    if (session.workspaceId) {
      // Use workspace from session
      const currentMembership = memberships.find(m => m.workspaceId === session.workspaceId);
      if (currentMembership) {
        currentWorkspace = {
          ...currentMembership.workspace,
          userRole: currentMembership.role as WorkspaceRole,
        };
        currentRole = currentMembership.role as WorkspaceRole;
        currentPermissions = ROLE_PERMISSIONS[currentRole] || [];
      }
    }

    // If no current workspace, default to the first available
    if (!currentWorkspace && memberships.length > 0) {
      const firstMembership = memberships[0];
      currentWorkspace = {
        ...firstMembership.workspace,
        userRole: firstMembership.role as WorkspaceRole,
      };
      currentRole = firstMembership.role as WorkspaceRole;
      currentPermissions = ROLE_PERMISSIONS[currentRole] || [];
    }

    return NextResponse.json({
      workspaces,
      currentWorkspace,
      role: currentRole,
      permissions: currentPermissions,
    });

  } catch (error) {
    console.error('Error fetching workspaces:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}