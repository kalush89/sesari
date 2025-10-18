import { PrismaClient } from '@prisma/client';

/**
 * RLS (Row-Level Security) utilities for multi-tenant data isolation
 * These functions ensure that all database queries are scoped to the current user's workspace
 */

/**
 * Set the current user ID in the database session for RLS policies
 * This must be called before any database operations that rely on RLS
 */
export async function setRLSContext(prisma: PrismaClient, userId: string): Promise<void> {
  await prisma.$executeRaw`SELECT set_config('app.current_user_id', ${userId}, true)`;
}

/**
 * Clear the RLS context (useful for cleanup or admin operations)
 */
export async function clearRLSContext(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRaw`SELECT set_config('app.current_user_id', '', true)`;
}

/**
 * Execute a database operation with RLS context set for a specific user
 * This is a helper function that automatically sets and clears the context
 */
export async function withRLSContext<T>(
  prisma: PrismaClient,
  userId: string,
  operation: () => Promise<T>
): Promise<T> {
  await setRLSContext(prisma, userId);
  try {
    return await operation();
  } finally {
    await clearRLSContext(prisma);
  }
}

/**
 * Validate that a user has access to a specific workspace
 * This should be used in API routes before performing workspace-specific operations
 */
export async function validateWorkspaceAccess(
  prisma: PrismaClient,
  userId: string,
  workspaceId: string
): Promise<boolean> {
  const membership = await withRLSContext(prisma, userId, async () => {
    return await prisma.workspaceMembership.findFirst({
      where: {
        userId,
        workspaceId,
      },
    });
  });

  return membership !== null;
}

/**
 * Get all workspaces that a user has access to
 */
export async function getUserWorkspaces(prisma: PrismaClient, userId: string) {
  return await withRLSContext(prisma, userId, async () => {
    return await prisma.workspace.findMany({
      include: {
        memberships: {
          where: {
            userId,
          },
          select: {
            role: true,
          },
        },
      },
    });
  });
}

/**
 * Get user's role in a specific workspace
 */
export async function getUserWorkspaceRole(
  prisma: PrismaClient,
  userId: string,
  workspaceId: string
): Promise<string | null> {
  const membership = await withRLSContext(prisma, userId, async () => {
    return await prisma.workspaceMembership.findFirst({
      where: {
        userId,
        workspaceId,
      },
      select: {
        role: true,
      },
    });
  });

  return membership?.role || null;
}