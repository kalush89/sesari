#!/usr/bin/env tsx

/**
 * Test runner for Task 11 - Authentication Tests
 * Validates that all authentication test files are working correctly
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';

const testFiles = [
  'src/lib/auth/__tests__/auth-utilities.test.ts',
  'src/lib/auth/__tests__/oauth-integration.test.ts',
  'src/lib/auth/__tests__/api-validation.test.ts',
  'src/lib/auth/__tests__/middleware.test.ts',
  'src/lib/auth/__tests__/session.test.ts',
  'src/lib/auth/__tests__/config.test.ts',
];

console.log('🧪 Running Authentication Tests (Task 11)');
console.log('==========================================\n');

let allTestsPassed = true;

for (const testFile of testFiles) {
  const fullPath = path.resolve(testFile);
  
  if (!existsSync(fullPath)) {
    console.log(`❌ Test file not found: ${testFile}`);
    allTestsPassed = false;
    continue;
  }

  try {
    console.log(`🔍 Running: ${testFile}`);
    
    // First check TypeScript compilation
    try {
      execSync(`npx tsc --noEmit ${testFile}`, { 
        stdio: 'pipe',
        encoding: 'utf8'
      });
      console.log(`  ✅ TypeScript compilation passed`);
    } catch (error) {
      console.log(`  ❌ TypeScript compilation failed:`);
      console.log(`     ${error.message}`);
      allTestsPassed = false;
      continue;
    }

    // Then run the actual tests
    try {
      const output = execSync(`npx vitest run ${testFile} --run`, { 
        stdio: 'pipe',
        encoding: 'utf8'
      });
      console.log(`  ✅ Tests passed`);
      
      // Extract test count from output if available
      const testMatch = output.match(/(\d+) passed/);
      if (testMatch) {
        console.log(`  📊 ${testMatch[1]} tests passed`);
      }
    } catch (error) {
      console.log(`  ❌ Tests failed:`);
      console.log(`     ${error.message}`);
      allTestsPassed = false;
    }

  } catch (error) {
    console.log(`  ❌ Error running test: ${error.message}`);
    allTestsPassed = false;
  }

  console.log('');
}

console.log('==========================================');
if (allTestsPassed) {
  console.log('🎉 All authentication tests passed!');
  console.log('✅ Task 11 implementation is complete');
  process.exit(0);
} else {
  console.log('❌ Some authentication tests failed');
  console.log('🔧 Task 11 needs additional work');
  process.exit(1);
}