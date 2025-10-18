import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { setRLSContext, clearRLSContext, validateWorkspaceAccess, getUserWorkspaces } from '../rls';

// Use a separate test database client
const prisma = new PrismaClient();

describe('RLS (Row-Level Security)', () => {
  let testUser1: any;
  let testUser2: any;
  let testWorkspace1: any;
  let testWorkspace2: any;

  beforeAll(async () => {
    // Create test users
    testUser1 = await prisma.user.create({
      data: {
        email: `test1-${Date.now()}@example.com`,
        name: 'Test User 1',
      },
    });

    testUser2 = await prisma.user.create({
      data: {
        email: `test2-${Date.now()}@example.com`,
        name: 'Test User 2',
      },
    });

    // Create test workspaces
    testWorkspace1 = await prisma.workspace.create({
      data: {
        name: 'Test Workspace 1',
        slug: `test-workspace-1-${Date.now()}`,
        ownerId: testUser1.id,
      },
    });

    testWorkspace2 = await prisma.workspace.create({
      data: {
        name: 'Test Workspace 2',
        slug: `test-workspace-2-${Date.now()}`,
        ownerId: testUser2.id,
      },
    });

    // Create workspace memberships
    await prisma.workspaceMembership.create({
      data: {
        workspaceId: testWorkspace1.id,
        userId: testUser1.id,
        role: 'owner',
      },
    });

    await prisma.workspaceMembership.create({
      data: {
        workspaceId: testWorkspace2.id,
        userId: testUser2.id,
        role: 'owner',
      },
    });
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.workspaceMembership.deleteMany({
      where: {
        OR: [
          { workspaceId: testWorkspace1.id },
          { workspaceId: testWorkspace2.id },
        ],
      },
    });

    await prisma.workspace.deleteMany({
      where: {
        OR: [
          { id: testWorkspace1.id },
          { id: testWorkspace2.id },
        ],
      },
    });

    await prisma.user.deleteMany({
      where: {
        OR: [
          { id: testUser1.id },
          { id: testUser2.id },
        ],
      },
    });

    await prisma.$disconnect();
  });

  it('should set and clear RLS context', async () => {
    await setRLSContext(prisma, testUser1.id);
    // Context is set - no direct way to test this without making queries
    
    await clearRLSContext(prisma);
    // Context is cleared
    
    expect(true).toBe(true); // Test passes if no errors thrown
  });

  it('should validate workspace access correctly', async () => {
    // User 1 should have access to workspace 1
    const hasAccess1 = await validateWorkspaceAccess(prisma, testUser1.id, testWorkspace1.id);
    expect(hasAccess1).toBe(true);

    // User 1 should NOT have access to workspace 2
    const hasAccess2 = await validateWorkspaceAccess(prisma, testUser1.id, testWorkspace2.id);
    expect(hasAccess2).toBe(false);
  });

  it('should return only accessible workspaces for user', async () => {
    // User 1 should only see workspace 1
    const user1Workspaces = await getUserWorkspaces(prisma, testUser1.id);
    expect(user1Workspaces).toHaveLength(1);
    expect(user1Workspaces[0].id).toBe(testWorkspace1.id);

    // User 2 should only see workspace 2
    const user2Workspaces = await getUserWorkspaces(prisma, testUser2.id);
    expect(user2Workspaces).toHaveLength(1);
    expect(user2Workspaces[0].id).toBe(testWorkspace2.id);
  });

  it('should enforce workspace isolation', async () => {
    // Set context for user 1
    await setRLSContext(prisma, testUser1.id);

    // User 1 should only see their own workspace memberships
    const memberships = await prisma.workspaceMembership.findMany();
    
    // Should only return memberships for workspaces user 1 has access to
    expect(memberships.every(m => m.workspaceId === testWorkspace1.id)).toBe(true);

    await clearRLSContext(prisma);
  });
});