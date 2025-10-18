import { prisma } from './index';
import { setRLSContext, validateWorkspaceAccess, getUserWorkspaces } from './rls';

/**
 * Database validation utilities for testing RLS and multi-tenant security
 */

/**
 * Test RLS policies by attempting to access data across workspace boundaries
 */
export async function testRLSPolicies(userId: string, workspaceId: string) {
    console.log('🔒 Testing RLS policies...');

    try {
        // Set RLS context for the user
        await setRLSContext(prisma, userId);

        // Test 1: User should only see their own workspaces
        const userWorkspaces = await getUserWorkspaces(prisma, userId);
        console.log(`✅ User can access ${userWorkspaces.length} workspace(s)`);

        // Test 2: Validate specific workspace access
        const hasAccess = await validateWorkspaceAccess(prisma, userId, workspaceId);
        console.log(`✅ Workspace access validation: ${hasAccess ? 'GRANTED' : 'DENIED'}`);

        // Test 3: Try to access workspace memberships (should be filtered by RLS)
        const memberships = await prisma.workspaceMembership.findMany({
            include: {
                workspace: true,
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                    },
                },
            },
        });
        console.log(`✅ User can see ${memberships.length} membership(s)`);

        return {
            success: true,
            workspaceCount: userWorkspaces.length,
            hasWorkspaceAccess: hasAccess,
            membershipCount: memberships.length,
        };
    } catch (error) {
        console.error('❌ RLS test failed:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Validate database schema and constraints
 */
export async function validateDatabaseSchema() {
    console.log('🔍 Validating database schema...');

    try {
        // Test 1: Check if all required tables exist
        const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'workspaces', 'workspace_memberships', 'accounts', 'sessions')
    `;

        const requiredTables = ['users', 'workspaces', 'workspace_memberships', 'accounts', 'sessions'];
        const existingTables = tables.map(t => t.table_name);
        const missingTables = requiredTables.filter(table => !existingTables.includes(table));

        if (missingTables.length > 0) {
            console.error('❌ Missing tables:', missingTables);
            return { success: false, missingTables };
        }

        console.log('✅ All required tables exist');

        // Test 2: Check RLS is enabled on workspace tables
        const rlsStatus = await prisma.$queryRaw<Array<{ tablename: string; rowsecurity: boolean }>>`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename IN ('workspaces', 'workspace_memberships')
    `;

        const rlsEnabled = rlsStatus.every(table => table.rowsecurity);
        if (!rlsEnabled) {
            console.error('❌ RLS not enabled on all workspace tables');
            return { success: false, rlsStatus };
        }

        console.log('✅ RLS enabled on workspace tables');

        // Test 3: Check constraints exist
        const constraints = await prisma.$queryRaw<Array<{ constraint_name: string }>>`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND constraint_type = 'CHECK'
      AND constraint_name IN ('valid_role', 'valid_plan_type')
    `;

        const expectedConstraints = ['valid_role', 'valid_plan_type'];
        const existingConstraints = constraints.map(c => c.constraint_name);
        const missingConstraints = expectedConstraints.filter(constraint =>
            !existingConstraints.includes(constraint)
        );

        if (missingConstraints.length > 0) {
            console.warn('⚠️ Missing constraints:', missingConstraints);
        } else {
            console.log('✅ All validation constraints exist');
        }

        return {
            success: true,
            tables: existingTables,
            rlsEnabled: true,
            constraints: existingConstraints,
        };
    } catch (error) {
        console.error('❌ Schema validation failed:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Test workspace isolation by creating test data
 */
export async function testWorkspaceIsolation() {
    console.log('🧪 Testing workspace isolation...');

    try {
        // Create two test users
        const user1 = await prisma.user.create({
            data: {
                email: `test1-${Date.now()}@example.com`,
                name: 'Test User 1',
            },
        });

        const user2 = await prisma.user.create({
            data: {
                email: `test2-${Date.now()}@example.com`,
                name: 'Test User 2',
            },
        });

        // Create separate workspaces for each user
        const workspace1 = await prisma.workspace.create({
            data: {
                name: 'Workspace 1',
                slug: `workspace-1-${Date.now()}`,
                ownerId: user1.id,
            },
        });

        const workspace2 = await prisma.workspace.create({
            data: {
                name: 'Workspace 2',
                slug: `workspace-2-${Date.now()}`,
                ownerId: user2.id,
            },
        });

        // Create memberships
        await prisma.workspaceMembership.create({
            data: {
                workspaceId: workspace1.id,
                userId: user1.id,
                role: 'owner',
            },
        });

        await prisma.workspaceMembership.create({
            data: {
                workspaceId: workspace2.id,
                userId: user2.id,
                role: 'owner',
            },
        });

        // Test isolation: User 1 should not see User 2's workspace
        const user1Workspaces = await getUserWorkspaces(prisma, user1.id);
        const user2Workspaces = await getUserWorkspaces(prisma, user2.id);

        const user1CanSeeWorkspace2 = user1Workspaces.some(w => w.id === workspace2.id);
        const user2CanSeeWorkspace1 = user2Workspaces.some(w => w.id === workspace1.id);

        if (user1CanSeeWorkspace2 || user2CanSeeWorkspace1) {
            console.error('❌ Workspace isolation failed - users can see each other\'s workspaces');
            return { success: false, isolationBreach: true };
        }

        console.log('✅ Workspace isolation working correctly');

        // Cleanup test data
        await prisma.workspaceMembership.deleteMany({
            where: {
                OR: [
                    { workspaceId: workspace1.id },
                    { workspaceId: workspace2.id },
                ],
            },
        });

        await prisma.workspace.deleteMany({
            where: {
                OR: [
                    { id: workspace1.id },
                    { id: workspace2.id },
                ],
            },
        });

        await prisma.user.deleteMany({
            where: {
                OR: [
                    { id: user1.id },
                    { id: user2.id },
                ],
            },
        });

        return { success: true };
    } catch (error) {
        console.error('❌ Workspace isolation test failed:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}