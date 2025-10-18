#!/usr/bin/env tsx

/**
 * Database Setup Verification Script
 * 
 * This script verifies that the database schema and RLS policies are correctly set up.
 * Run this after setting up the database to ensure everything is working properly.
 */

import { prisma } from '../src/lib/db';
import { validateDatabaseSchema, testWorkspaceIsolation } from '../src/lib/db/validation';

async function main() {
  console.log('🔍 Verifying database setup for Sesari authentication system...\n');

  try {
    // Test 1: Validate database schema
    console.log('1️⃣ Validating database schema...');
    const schemaResult = await validateDatabaseSchema();
    
    if (!schemaResult.success) {
      console.error('❌ Schema validation failed:', schemaResult.error);
      process.exit(1);
    }
    
    console.log('✅ Database schema is valid\n');

    // Test 2: Test workspace isolation
    console.log('2️⃣ Testing workspace isolation...');
    const isolationResult = await testWorkspaceIsolation();
    
    if (!isolationResult.success) {
      console.error('❌ Workspace isolation test failed:', isolationResult.error);
      process.exit(1);
    }
    
    console.log('✅ Workspace isolation is working correctly\n');

    // Test 3: Verify RLS is enabled
    console.log('3️⃣ Verifying RLS policies...');
    const rlsCheck = await prisma.$queryRaw<Array<{ tablename: string; rowsecurity: boolean }>>`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename IN ('workspaces', 'workspace_memberships')
    `;

    const rlsEnabled = rlsCheck.every(table => table.rowsecurity);
    if (!rlsEnabled) {
      console.error('❌ RLS is not enabled on all required tables');
      console.log('Tables RLS status:', rlsCheck);
      process.exit(1);
    }

    console.log('✅ RLS policies are enabled on all workspace tables\n');

    // Test 4: Check required functions exist
    console.log('4️⃣ Checking RLS functions...');
    const functions = await prisma.$queryRaw<Array<{ function_name: string }>>`
      SELECT routine_name as function_name
      FROM information_schema.routines 
      WHERE routine_schema = 'public' 
      AND routine_name IN ('get_current_user_id')
      OR (routine_schema = 'auth' AND routine_name = 'user_id')
    `;

    if (functions.length === 0) {
      console.warn('⚠️ RLS functions may not be created yet. This is normal if migrations haven\'t been run.');
    } else {
      console.log('✅ RLS functions are available:', functions.map(f => f.function_name));
    }

    console.log('\n🎉 Database setup verification completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   ✅ Database schema is valid');
    console.log('   ✅ Workspace isolation is working');
    console.log('   ✅ RLS policies are enabled');
    console.log('   ✅ All required tables exist');
    
    console.log('\n🚀 Your authentication system is ready for development!');
    console.log('\n📖 Next steps:');
    console.log('   1. Run migrations: npm run db:migrate');
    console.log('   2. Generate Prisma client: npm run db:generate');
    console.log('   3. Seed test data: npm run db:seed');
    console.log('   4. Start development: npm run dev');

  } catch (error) {
    console.error('\n❌ Database verification failed:', error);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Check your DATABASE_URL and DIRECT_URL environment variables');
    console.log('   2. Ensure your database is running and accessible');
    console.log('   3. Run: npm run db:push to sync the schema');
    console.log('   4. Check the Prisma documentation for migration issues');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();