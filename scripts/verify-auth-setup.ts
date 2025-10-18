#!/usr/bin/env tsx

/**
 * Verification script for NextAuth.js configuration
 * Checks that all required components are properly configured
 */

import { authOptions } from '../src/lib/auth/config';
import { WorkspaceRole, Permission } from '../src/lib/db';

console.log('🔐 Verifying NextAuth.js Configuration...\n');

// Check environment variables
const requiredEnvVars = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL',
  'DATABASE_URL'
];

console.log('📋 Checking environment variables:');
let envVarsValid = true;

for (const envVar of requiredEnvVars) {
  const value = process.env[envVar];
  if (value) {
    console.log(`  ✅ ${envVar}: ${envVar.includes('SECRET') || envVar.includes('URL') ? '[REDACTED]' : 'Set'}`);
  } else {
    console.log(`  ❌ ${envVar}: Missing`);
    envVarsValid = false;
  }
}

if (!envVarsValid) {
  console.log('\n❌ Some required environment variables are missing!');
  process.exit(1);
}

// Check NextAuth configuration
console.log('\n🔧 Checking NextAuth configuration:');

try {
  // Check providers
  if (authOptions.providers && authOptions.providers.length > 0) {
    console.log(`  ✅ Providers configured: ${authOptions.providers.length}`);
    authOptions.providers.forEach((provider, index) => {
      console.log(`    - Provider ${index + 1}: ${provider.id}`);
    });
  } else {
    console.log('  ❌ No providers configured');
  }

  // Check session strategy
  if (authOptions.session?.strategy === 'jwt') {
    console.log('  ✅ JWT strategy configured');
  } else {
    console.log('  ❌ JWT strategy not configured');
  }

  // Check adapter
  if (authOptions.adapter) {
    console.log('  ✅ Prisma adapter configured');
  } else {
    console.log('  ❌ Prisma adapter not configured');
  }

  // Check callbacks
  const callbacks = authOptions.callbacks;
  if (callbacks?.jwt && callbacks?.session && callbacks?.signIn && callbacks?.redirect) {
    console.log('  ✅ All required callbacks configured');
  } else {
    console.log('  ❌ Some callbacks missing');
  }

  // Check pages
  if (authOptions.pages?.signIn && authOptions.pages?.error) {
    console.log('  ✅ Custom pages configured');
  } else {
    console.log('  ❌ Custom pages not configured');
  }

  // Check events
  if (authOptions.events?.signIn && authOptions.events?.signOut) {
    console.log('  ✅ Event handlers configured');
  } else {
    console.log('  ❌ Event handlers not configured');
  }

} catch (error) {
  console.log('  ❌ Error checking NextAuth configuration:', error);
}

// Check role and permission system
console.log('\n👥 Checking role and permission system:');

try {
  const roles = Object.values(WorkspaceRole);
  const permissions = Object.values(Permission);
  
  console.log(`  ✅ Roles defined: ${roles.length}`);
  roles.forEach(role => console.log(`    - ${role}`));
  
  console.log(`  ✅ Permissions defined: ${permissions.length}`);
  permissions.forEach(permission => console.log(`    - ${permission}`));

} catch (error) {
  console.log('  ❌ Error checking role system:', error);
}

console.log('\n✅ NextAuth.js configuration verification complete!');
console.log('\n🚀 You can now:');
console.log('  1. Start the development server: npm run dev');
console.log('  2. Navigate to /auth/signin to test Google OAuth');
console.log('  3. Check the authentication flow');