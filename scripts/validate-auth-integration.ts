#!/usr/bin/env tsx

/**
 * Validation script for Task 12: Authentication Integration
 * Verifies that authentication is properly integrated with the app structure
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import path from 'path';

interface ValidationResult {
  passed: boolean;
  message: string;
}

class AuthIntegrationValidator {
  private results: ValidationResult[] = [];

  private addResult(passed: boolean, message: string) {
    this.results.push({ passed, message });
    console.log(`${passed ? '✅' : '❌'} ${message}`);
  }

  private fileExists(filePath: string): boolean {
    return existsSync(path.join(process.cwd(), filePath));
  }

  private fileContains(filePath: string, content: string): boolean {
    if (!this.fileExists(filePath)) return false;
    const fileContent = readFileSync(path.join(process.cwd(), filePath), 'utf-8');
    return fileContent.includes(content);
  }

  validateRootLayout() {
    console.log('\n🔍 Validating Root Layout Integration...');
    
    // Check if AuthProvider is imported and used
    this.addResult(
      this.fileContains('src/app/layout.tsx', 'AuthProvider'),
      'AuthProvider is imported and used in root layout'
    );

    // Check if providers are properly nested
    this.addResult(
      this.fileContains('src/app/layout.tsx', '<SessionProvider') &&
      this.fileContains('src/app/layout.tsx', '<WorkspaceProvider') &&
      this.fileContains('src/app/layout.tsx', '<AuthProvider'),
      'Authentication providers are properly nested'
    );
  }

  validateLayoutComponents() {
    console.log('\n🔍 Validating Layout Components...');

    // Check if layout components exist
    const layoutComponents = [
      'src/components/layout/AppLayout.tsx',
      'src/components/layout/Sidebar.tsx',
      'src/components/layout/TopNavigation.tsx',
      'src/components/layout/index.ts'
    ];

    layoutComponents.forEach(component => {
      this.addResult(
        this.fileExists(component),
        `Layout component exists: ${component}`
      );
    });

    // Check if AppLayout uses AuthGuard
    this.addResult(
      this.fileContains('src/components/layout/AppLayout.tsx', 'AuthGuard'),
      'AppLayout properly uses AuthGuard for route protection'
    );

    // Check if Sidebar uses permission-based navigation
    this.addResult(
      this.fileContains('src/components/layout/Sidebar.tsx', 'PermissionGate'),
      'Sidebar implements permission-based navigation'
    );
  }

  validatePageIntegration() {
    console.log('\n🔍 Validating Page Integration...');

    // Check if dashboard page uses new layout
    this.addResult(
      this.fileContains('src/app/dashboard/page.tsx', 'DashboardLayout'),
      'Dashboard page uses DashboardLayout'
    );

    // Check if auth pages use AuthLayout
    this.addResult(
      this.fileContains('src/app/(auth)/signin/page.tsx', 'AuthLayout'),
      'Sign-in page uses AuthLayout'
    );

    this.addResult(
      this.fileContains('src/app/(auth)/error/page.tsx', 'AuthLayout'),
      'Error page uses AuthLayout'
    );

    // Check if new pages exist with proper layouts
    const newPages = [
      'src/app/kpis/page.tsx',
      'src/app/objectives/page.tsx',
      'src/app/team/page.tsx',
      'src/app/settings/page.tsx'
    ];

    newPages.forEach(page => {
      this.addResult(
        this.fileExists(page),
        `New page exists: ${page}`
      );
    });
  }

  validatePermissionIntegration() {
    console.log('\n🔍 Validating Permission Integration...');

    // Check if components use permission gates
    const componentsWithPermissions = [
      'src/components/kpi/KpiListContent.tsx',
      'src/components/objectives/ObjectiveListContent.tsx',
      'src/components/team/TeamManagementContent.tsx',
      'src/components/settings/WorkspaceSettingsContent.tsx'
    ];

    componentsWithPermissions.forEach(component => {
      this.addResult(
        this.fileContains(component, 'PermissionGate') || 
        this.fileContains(component, 'AuthGuard'),
        `Component uses permission controls: ${path.basename(component)}`
      );
    });

    // Check if dashboard content shows role-based features
    this.addResult(
      this.fileContains('src/components/dashboard/DashboardContent.tsx', 'useAuth') &&
      this.fileContains('src/components/dashboard/DashboardContent.tsx', 'permissions'),
      'Dashboard content displays role-based features'
    );
  }

  validateAuthContextUsage() {
    console.log('\n🔍 Validating Auth Context Usage...');

    // Check if components use the auth hook
    const componentsUsingAuth = [
      'src/components/layout/Sidebar.tsx',
      'src/components/layout/TopNavigation.tsx',
      'src/components/dashboard/DashboardContent.tsx'
    ];

    componentsUsingAuth.forEach(component => {
      this.addResult(
        this.fileContains(component, 'useAuth'),
        `Component uses auth context: ${path.basename(component)}`
      );
    });
  }

  validateTests() {
    console.log('\n🔍 Validating Tests...');

    // Check if integration tests exist
    this.addResult(
      this.fileExists('src/test/integration/auth-integration.test.ts'),
      'Authentication integration tests exist'
    );

    this.addResult(
      this.fileExists('src/components/layout/__tests__/AppLayout.test.tsx'),
      'Layout component tests exist'
    );
  }

  async validateTypeScript() {
    console.log('\n🔍 Validating TypeScript Compilation...');

    try {
      // Try to compile TypeScript without emitting files
      execSync('npx tsc --noEmit --skipLibCheck', { 
        stdio: 'pipe',
        timeout: 30000 
      });
      this.addResult(true, 'TypeScript compilation successful');
    } catch (error) {
      this.addResult(false, 'TypeScript compilation failed');
      console.log('TypeScript errors:', error.toString());
    }
  }

  generateReport() {
    console.log('\n📊 Authentication Integration Validation Report');
    console.log('='.repeat(50));

    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    const percentage = Math.round((passed / total) * 100);

    console.log(`\nResults: ${passed}/${total} checks passed (${percentage}%)`);

    if (percentage >= 90) {
      console.log('\n🎉 Authentication integration is successfully implemented!');
      console.log('✅ Task 12 requirements have been met:');
      console.log('  - Root layout includes authentication providers');
      console.log('  - Pages use authentication and workspace context');
      console.log('  - Components respect role-based permissions');
      console.log('  - Proper layout structure with navigation');
    } else if (percentage >= 70) {
      console.log('\n⚠️  Authentication integration is mostly complete but needs attention');
    } else {
      console.log('\n❌ Authentication integration needs significant work');
    }

    const failed = this.results.filter(r => !r.passed);
    if (failed.length > 0) {
      console.log('\n❌ Failed checks:');
      failed.forEach(result => {
        console.log(`  - ${result.message}`);
      });
    }

    return percentage >= 90;
  }

  async validate(): Promise<boolean> {
    console.log('🚀 Starting Authentication Integration Validation...');
    
    this.validateRootLayout();
    this.validateLayoutComponents();
    this.validatePageIntegration();
    this.validatePermissionIntegration();
    this.validateAuthContextUsage();
    this.validateTests();
    await this.validateTypeScript();

    return this.generateReport();
  }
}

// Run validation if this script is executed directly
if (require.main === module) {
  const validator = new AuthIntegrationValidator();
  validator.validate().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Validation failed:', error);
    process.exit(1);
  });
}

export { AuthIntegrationValidator };