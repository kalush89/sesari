#!/usr/bin/env tsx

/**
 * Script to fix RLS policies for proper test execution
 * This addresses the issue where RLS tests are being skipped
 */

import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

async function fixRLSPolicies() {
  console.log('🔧 Fixing RLS policies for test compatibility...');

  try {
    // Read the SQL fix file
    const sqlFix = readFileSync(join(__dirname, 'apply-rls-fix.sql'), 'utf-8');
    
    // Split by semicolon and execute each statement
    const statements = sqlFix
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`Executing: ${statement.substring(0, 50)}...`);
        await prisma.$executeRawUnsafe(statement);
      }
    }

    console.log('✅ RLS policies fixed successfully!');
    console.log('🧪 RLS tests should now run properly');
    
  } catch (error) {
    console.error('❌ Failed to fix RLS policies:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixRLSPolicies().catch(console.error);