import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create a test user (this would normally be created via OAuth)
  const testUser = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      name: 'Test User',
      image: null,
    },
  });

  console.log('✅ Created test user:', testUser.email);

  // Create a test workspace
  const testWorkspace = await prisma.workspace.upsert({
    where: { slug: 'test-workspace' },
    update: {},
    create: {
      name: 'Test Workspace',
      slug: 'test-workspace',
      ownerId: testUser.id,
      planType: 'free',
    },
  });

  console.log('✅ Created test workspace:', testWorkspace.name);

  // Create workspace membership for the owner
  await prisma.workspaceMembership.upsert({
    where: {
      workspaceId_userId: {
        workspaceId: testWorkspace.id,
        userId: testUser.id,
      },
    },
    update: {},
    create: {
      workspaceId: testWorkspace.id,
      userId: testUser.id,
      role: 'owner',
    },
  });

  console.log('✅ Created workspace membership');

  console.log('🎉 Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });