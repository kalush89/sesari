#!/usr/bin/env tsx

/**
 * API Security Validation Script
 * Validates that all API routes are properly secured
 * Requirements: 4.3, 4.4, 3.4, 5.1
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { auditApiRouteSecurity, generateSecurityAuditReport } from '../src/lib/auth/security-audit';

interface ApiRoute {
  path: string;
  methods: string[];
  hasAuth: boolean;
  hasWorkspaceValidation: boolean;
  hasPermissionCheck: boolean;
  hasInputValidation: boolean;
  content: string;
}

/**
 * Scan all API route files
 */
function scanApiRoutes(dir: string = 'src/app/api'): ApiRoute[] {
  const routes: ApiRoute[] = [];
  
  function scanDirectory(currentDir: string) {
    const items = readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = join(currentDir, item);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        scanDirectory(fullPath);
      } else if (item === 'route.ts' || item === 'route.js') {
        const content = readFileSync(fullPath, 'utf-8');
        const route = analyzeRouteFile(fullPath, content);
        if (route) {
          routes.push(route);
        }
      }
    }
  }
  
  scanDirectory(dir);
  return routes;
}

/**
 * Analyze a route file for security patterns
 */
function analyzeRouteFile(filePath: string, content: string): ApiRoute | null {
  const methods: string[] = [];
  
  // Extract HTTP methods
  const methodRegex = /export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE)/g;
  let match;
  while ((match = methodRegex.exec(content)) !== null) {
    methods.push(match[1]);
  }
  
  // Also check for withApiValidation wrapped exports
  const wrappedMethodRegex = /export\s+const\s+(GET|POST|PUT|PATCH|DELETE)\s*=\s*withApiValidation/g;
  while ((match = wrappedMethodRegex.exec(content)) !== null) {
    methods.push(match[1]);
  }
  
  if (methods.length === 0) {
    return null;
  }
  
  // Check for authentication patterns
  const hasAuth = 
    content.includes('validateAuth(') ||
    content.includes('validateWorkspaceAuth(') ||
    content.includes('validatePermission(') ||
    content.includes('getAuthSession(') ||
    content.includes('getServerSession(') ||
    content.includes('withApiValidation(') ||
    content.includes('withApiSecurity(') ||
    content.includes('createApiRoute(');
  
  // Check for workspace validation
  const hasWorkspaceValidation = 
    content.includes('validateWorkspaceAuth(') ||
    content.includes('validatePermission(') ||
    content.includes('workspaceId') ||
    content.includes('ApiSecurityPresets.WORKSPACE') ||
    content.includes('requireWorkspace: true');
  
  // Check for permission validation
  const hasPermissionCheck = 
    content.includes('validatePermission(') ||
    content.includes('hasPermission(') ||
    content.includes('Permission.') ||
    content.includes('requiredPermissions') ||
    content.includes('allowedRoles');
  
  // Check for input validation
  const hasInputValidation = 
    content.includes('z.object(') ||
    content.includes('Schema.parse(') ||
    content.includes('bodySchema:') ||
    content.includes('paramsSchema:') ||
    content.includes('querySchema:') ||
    content.includes('.safeParse(');
  
  return {
    path: filePath.replace('src/app/api/', '').replace('/route.ts', '').replace('/route.js', ''),
    methods,
    hasAuth,
    hasWorkspaceValidation,
    hasPermissionCheck,
    hasInputValidation,
    content
  };
}

/**
 * Generate security report for all routes
 */
function generateReport(routes: ApiRoute[]) {
  console.log('\n🔒 API Security Audit Report\n');
  console.log('=' .repeat(50));
  
  let totalEndpoints = 0;
  let securedEndpoints = 0;
  const vulnerabilities: string[] = [];
  
  for (const route of routes) {
    for (const method of route.methods) {
      totalEndpoints++;
      
      const audit = auditApiRouteSecurity(
        route.path,
        method,
        route.hasAuth,
        route.hasWorkspaceValidation,
        route.hasPermissionCheck,
        route.hasInputValidation
      );
      
      if (audit.isSecured) {
        securedEndpoints++;
        console.log(`✅ ${method} /${route.path}`);
      } else {
        console.log(`❌ ${method} /${route.path}`);
        audit.vulnerabilities.forEach(vuln => {
          console.log(`   - ${vuln}`);
          vulnerabilities.push(`${method} /${route.path}: ${vuln}`);
        });
        audit.recommendations.forEach(rec => {
          console.log(`   💡 ${rec}`);
        });
      }
    }
  }
  
  console.log('\n' + '=' .repeat(50));
  console.log(`📊 Security Summary:`);
  console.log(`   Total Endpoints: ${totalEndpoints}`);
  console.log(`   Secured: ${securedEndpoints}`);
  console.log(`   Vulnerable: ${totalEndpoints - securedEndpoints}`);
  console.log(`   Security Score: ${Math.round((securedEndpoints / totalEndpoints) * 100)}%`);
  
  if (vulnerabilities.length > 0) {
    console.log('\n🚨 Security Issues Found:');
    vulnerabilities.forEach((vuln, index) => {
      console.log(`   ${index + 1}. ${vuln}`);
    });
    
    console.log('\n📋 Recommended Actions:');
    console.log('   1. Add authentication validation to unprotected endpoints');
    console.log('   2. Implement workspace access validation for workspace-scoped routes');
    console.log('   3. Add permission checks for protected operations');
    console.log('   4. Implement input validation with Zod schemas');
    console.log('   5. Use withApiValidation() or createApiRoute() for consistent security');
  }
  
  return {
    totalEndpoints,
    securedEndpoints,
    vulnerabilities: vulnerabilities.length,
    securityScore: Math.round((securedEndpoints / totalEndpoints) * 100)
  };
}

/**
 * Check specific security patterns
 */
function checkSecurityPatterns(routes: ApiRoute[]) {
  console.log('\n🔍 Security Pattern Analysis\n');
  
  const patterns = {
    'Using withApiValidation wrapper': 0,
    'Using createApiRoute helper': 0,
    'Using validateAuth function': 0,
    'Using validateWorkspaceAuth function': 0,
    'Using validatePermission function': 0,
    'Using Zod validation': 0,
    'Using security presets': 0
  };
  
  for (const route of routes) {
    if (route.content.includes('withApiValidation(')) patterns['Using withApiValidation wrapper']++;
    if (route.content.includes('createApiRoute(')) patterns['Using createApiRoute helper']++;
    if (route.content.includes('validateAuth(')) patterns['Using validateAuth function']++;
    if (route.content.includes('validateWorkspaceAuth(')) patterns['Using validateWorkspaceAuth function']++;
    if (route.content.includes('validatePermission(')) patterns['Using validatePermission function']++;
    if (route.content.includes('z.object(') || route.content.includes('Schema')) patterns['Using Zod validation']++;
    if (route.content.includes('ApiSecurityPresets')) patterns['Using security presets']++;
  }
  
  Object.entries(patterns).forEach(([pattern, count]) => {
    const percentage = Math.round((count / routes.length) * 100);
    console.log(`${count.toString().padStart(3)} routes (${percentage.toString().padStart(3)}%) - ${pattern}`);
  });
}

/**
 * Validate specific route types
 */
function validateRouteTypes(routes: ApiRoute[]) {
  console.log('\n📋 Route Type Analysis\n');
  
  const routeTypes = {
    'Public routes (no auth needed)': routes.filter(r => 
      r.path.startsWith('auth/') || 
      r.path === 'health' || 
      r.path === 'status'
    ),
    'Workspace-scoped routes': routes.filter(r => 
      r.path.includes('workspaces/') || 
      r.path.includes('kpis') || 
      r.path.includes('objectives')
    ),
    'Member management routes': routes.filter(r => 
      r.path.includes('members') || 
      r.path.includes('invitations')
    ),
    'Admin routes': routes.filter(r => 
      r.path.includes('admin') || 
      r.path.includes('manage')
    )
  };
  
  Object.entries(routeTypes).forEach(([type, typeRoutes]) => {
    console.log(`${type}: ${typeRoutes.length} routes`);
    
    typeRoutes.forEach(route => {
      const hasProperSecurity = type === 'Public routes (no auth needed)' ? 
        true : // Public routes don't need auth
        route.hasAuth && (
          !type.includes('Workspace-scoped') || route.hasWorkspaceValidation
        ) && (
          !type.includes('Member management') || route.hasPermissionCheck
        );
      
      const status = hasProperSecurity ? '✅' : '❌';
      console.log(`   ${status} ${route.path} (${route.methods.join(', ')})`);
    });
  });
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('🔒 Starting API Security Validation...\n');
    
    const routes = scanApiRoutes();
    
    if (routes.length === 0) {
      console.log('❌ No API routes found!');
      process.exit(1);
    }
    
    console.log(`📁 Found ${routes.length} API route files\n`);
    
    // Generate main security report
    const summary = generateReport(routes);
    
    // Analyze security patterns
    checkSecurityPatterns(routes);
    
    // Validate route types
    validateRouteTypes(routes);
    
    // Exit with error if security issues found
    if (summary.vulnerabilities > 0) {
      console.log('\n❌ Security validation failed! Please address the issues above.');
      process.exit(1);
    } else {
      console.log('\n✅ All API routes are properly secured!');
      process.exit(0);
    }
    
  } catch (error) {
    console.error('❌ Error during security validation:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

export { scanApiRoutes, analyzeRouteFile, generateReport };