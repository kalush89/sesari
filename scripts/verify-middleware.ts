#!/usr/bin/env tsx

/**
 * Script to verify middleware implementation
 * Tests route protection and workspace validation
 */

import { 
  isPublicRoute, 
  isProtectedRoute, 
  requiresWorkspaceContext,
  validateWorkspaceAccess,
  createWorkspaceHeaders 
} from '../src/lib/auth/middleware-utils';

interface TestCase {
  name: string;
  path: string;
  expected: boolean;
}

interface WorkspaceTestCase {
  name: string;
  token: any;
  expected: {
    isValid: boolean;
    needsWorkspace?: boolean;
    needsRole?: boolean;
  };
}

console.log('🔒 Verifying Middleware Implementation...\n');

// Test public routes
const publicRouteTests: TestCase[] = [
  { name: 'Home page', path: '/', expected: true },
  { name: 'Sign in page', path: '/auth/signin', expected: true },
  { name: 'Auth error page', path: '/auth/error', expected: true },
  { name: 'NextAuth API', path: '/api/auth/signin', expected: true },
  { name: 'Dashboard (should be false)', path: '/dashboard', expected: false },
];

console.log('📍 Testing Public Routes:');
publicRouteTests.forEach(test => {
  const result = isPublicRoute(test.path);
  const status = result === test.expected ? '✅' : '❌';
  console.log(`  ${status} ${test.name}: ${test.path} -> ${result}`);
});

// Test protected routes
const protectedRouteTests: TestCase[] = [
  { name: 'Dashboard', path: '/dashboard', expected: true },
  { name: 'Dashboard KPIs', path: '/dashboard/kpis', expected: true },
  { name: 'KPI API', path: '/api/kpis', expected: true },
  { name: 'Objectives API', path: '/api/objectives', expected: true },
  { name: 'Home page (should be false)', path: '/', expected: false },
  { name: 'Auth page (should be false)', path: '/auth/signin', expected: false },
];

console.log('\n🔐 Testing Protected Routes:');
protectedRouteTests.forEach(test => {
  const result = isProtectedRoute(test.path);
  const status = result === test.expected ? '✅' : '❌';
  console.log(`  ${status} ${test.name}: ${test.path} -> ${result}`);
});

// Test workspace context requirements
const workspaceContextTests: TestCase[] = [
  { name: 'KPI API', path: '/api/kpis', expected: true },
  { name: 'Objectives API', path: '/api/objectives', expected: true },
  { name: 'Auth API (should be false)', path: '/api/auth/signin', expected: false },
  { name: 'Health API (should be false)', path: '/api/health', expected: false },
  { name: 'User API (should be false)', path: '/api/user', expected: false },
];

console.log('\n🏢 Testing Workspace Context Requirements:');
workspaceContextTests.forEach(test => {
  const result = requiresWorkspaceContext(test.path);
  const status = result === test.expected ? '✅' : '❌';
  console.log(`  ${status} ${test.name}: ${test.path} -> ${result}`);
});

// Test workspace validation
const workspaceValidationTests: WorkspaceTestCase[] = [
  {
    name: 'Valid token with workspace and role',
    token: { workspaceId: 'ws_123', role: 'admin', sub: 'user_123' },
    expected: { isValid: true }
  },
  {
    name: 'Token without workspace',
    token: { role: 'admin', sub: 'user_123' },
    expected: { isValid: false, needsWorkspace: true }
  },
  {
    name: 'Token without role',
    token: { workspaceId: 'ws_123', sub: 'user_123' },
    expected: { isValid: false, needsRole: true }
  },
  {
    name: 'Null token',
    token: null,
    expected: { isValid: false }
  },
];

console.log('\n🎯 Testing Workspace Validation:');
workspaceValidationTests.forEach(test => {
  const result = validateWorkspaceAccess(test.token);
  const isCorrect = 
    result.isValid === test.expected.isValid &&
    result.needsWorkspace === test.expected.needsWorkspace &&
    result.needsRole === test.expected.needsRole;
  
  const status = isCorrect ? '✅' : '❌';
  console.log(`  ${status} ${test.name}:`);
  console.log(`    Expected: ${JSON.stringify(test.expected)}`);
  console.log(`    Got: ${JSON.stringify({ isValid: result.isValid, needsWorkspace: result.needsWorkspace, needsRole: result.needsRole })}`);
});

// Test header creation
console.log('\n📋 Testing Header Creation:');
const testToken = { workspaceId: 'ws_123', role: 'admin', sub: 'user_123' };
const headers = createWorkspaceHeaders(testToken);
const expectedHeaders = ['x-workspace-id', 'x-user-role', 'x-user-id'];

expectedHeaders.forEach(header => {
  const hasHeader = header in headers;
  const status = hasHeader ? '✅' : '❌';
  console.log(`  ${status} ${header}: ${hasHeader ? headers[header] : 'missing'}`);
});

console.log('\n🎉 Middleware verification complete!');