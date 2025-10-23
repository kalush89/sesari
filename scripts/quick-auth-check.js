#!/usr/bin/env node

/**
 * Quick Authentication Check
 * Simple Node.js script to diagnose common auth issues
 */

console.log('🔧 Quick Authentication Diagnostic\n');

// Check environment variables
console.log('=== Environment Variables ===');
const requiredVars = [
  'NEXTAUTH_URL',
  'NEXTAUTH_SECRET', 
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'DATABASE_URL'
];

let hasIssues = false;

requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (!value) {
    console.log(`❌ ${varName}: MISSING`);
    hasIssues = true;
  } else if (varName === 'GOOGLE_CLIENT_ID' && value.includes('503028689915')) {
    console.log(`⚠️  ${varName}: Using example/placeholder value`);
    console.log(`   Current: ${value}`);
    console.log(`   Issue: This appears to be a placeholder. You need real Google OAuth credentials.`);
    hasIssues = true;
  } else if (varName === 'GOOGLE_CLIENT_SECRET' && value.includes('GOCSPX-kszdQ')) {
    console.log(`⚠️  ${varName}: Using example/placeholder value`);
    console.log(`   Current: ${value}`);
    console.log(`   Issue: This appears to be a placeholder. You need real Google OAuth credentials.`);
    hasIssues = true;
  } else if (varName === 'NEXTAUTH_SECRET' && value.length < 32) {
    console.log(`⚠️  ${varName}: Too short (${value.length} chars, need 32+)`);
    hasIssues = true;
  } else {
    const preview = varName.includes('SECRET') ? '[HIDDEN]' : 
                   value.length > 30 ? value.substring(0, 30) + '...' : value;
    console.log(`✅ ${varName}: ${preview}`);
  }
});

console.log('\n=== URL Configuration ===');
const nextAuthUrl = process.env.NEXTAUTH_URL;
if (nextAuthUrl) {
  try {
    const url = new URL(nextAuthUrl);
    console.log(`✅ NEXTAUTH_URL: ${nextAuthUrl}`);
    console.log(`   Expected callback: ${nextAuthUrl}/api/auth/callback/google`);
  } catch (e) {
    console.log(`❌ NEXTAUTH_URL: Invalid URL format`);
    hasIssues = true;
  }
} else {
  console.log(`❌ NEXTAUTH_URL: Missing`);
  hasIssues = true;
}

console.log('\n=== Common Issues & Solutions ===');

if (hasIssues) {
  console.log('\n🚨 ISSUES FOUND:');
  
  if (!process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID.includes('503028689915')) {
    console.log('\n1. GOOGLE OAUTH SETUP REQUIRED:');
    console.log('   - Go to https://console.cloud.google.com/');
    console.log('   - Create a new project or select existing one');
    console.log('   - Enable Google+ API');
    console.log('   - Go to Credentials > Create Credentials > OAuth 2.0 Client ID');
    console.log('   - Application type: Web application');
    console.log('   - Authorized redirect URIs: http://localhost:3000/api/auth/callback/google');
    console.log('   - Copy Client ID and Client Secret to your .env.local file');
  }
  
  if (!process.env.NEXTAUTH_SECRET || process.env.NEXTAUTH_SECRET.length < 32) {
    console.log('\n2. NEXTAUTH_SECRET SETUP:');
    console.log('   - Generate a secure secret: openssl rand -base64 32');
    console.log('   - Or use: https://generate-secret.vercel.app/32');
    console.log('   - Add to .env.local: NEXTAUTH_SECRET="your-generated-secret"');
  }
  
  console.log('\n3. RESTART DEVELOPMENT SERVER:');
  console.log('   - After updating .env.local, restart: npm run dev');
  
  console.log('\n4. CLEAR BROWSER DATA:');
  console.log('   - Clear cookies and local storage for localhost:3000');
  console.log('   - Or test in incognito/private browsing mode');
  
} else {
  console.log('✅ Environment configuration looks good!');
  console.log('\nIf you\'re still seeing authentication errors:');
  console.log('1. Check browser console for detailed error messages');
  console.log('2. Verify Google OAuth console settings match your domain');
  console.log('3. Test in incognito mode to rule out cached data');
  console.log('4. Check if your database is accessible');
}

console.log('\n=== Next Steps ===');
console.log('1. Fix any issues listed above');
console.log('2. Restart your development server: npm run dev');
console.log('3. Test authentication at: http://localhost:3000/signin');
console.log('4. If issues persist, check browser developer tools for errors');

console.log('\n📋 Debug complete!\n');