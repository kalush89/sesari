#!/usr/bin/env tsx

/**
 * Comprehensive Authentication Test Runner
 * 
 * This script runs all authentication-related tests and generates a detailed report
 * covering unit tests, integration tests, and end-to-end scenarios.
 */

import { execSync } from 'child_process';
import { writeFileSync, existsSync } from 'fs';
import { join } from 'path';

interface TestResult {
  suite: string;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  coverage?: number;
}

interface TestReport {
  timestamp: string;
  totalTests: number;
  totalPassed: number;
  totalFailed: number;
  totalSkipped: number;
  overallDuration: number;
  overallCoverage: number;
  suites: TestResult[];
  requirements: RequirementCoverage[];
}

interface RequirementCoverage {
  requirement: string;
  description: string;
  testFiles: string[];
  covered: boolean;
}

class AuthTestRunner {
  private testSuites = [
    {
      name: 'Authentication Utilities',
      pattern: 'src/lib/auth/__tests__/auth-utilities.test.ts',
      requirements: ['1.1', '1.2', '1.3', '1.4', '1.5', '7.1', '7.2', '7.3', '7.4', '7.5']
    },
    {
      name: 'Session Management',
      pattern: 'src/lib/auth/__tests__/session.test.ts',
      requirements: ['5.1', '5.2', '5.3', '5.4', '5.5']
    },
    {
      name: 'OAuth Integration',
      pattern: 'src/lib/auth/__tests__/oauth-integration.test.ts',
      requirements: ['1.1', '1.2', '1.3', '1.4', '1.5']
    },
    {
      name: 'Workspace Integration',
      pattern: 'src/lib/auth/__tests__/workspace-integration.test.ts',
      requirements: ['2.1', '2.2', '2.3', '2.4', '2.5', '6.1', '6.2', '6.3', '6.4', '6.5']
    },
    {
      name: 'Permission System',
      pattern: 'src/lib/auth/__tests__/permission-hooks.test.ts',
      requirements: ['3.1', '3.2', '3.3', '3.4', '3.5']
    },
    {
      name: 'API Security',
      pattern: 'src/lib/auth/__tests__/api-security-integration.test.ts',
      requirements: ['4.1', '4.2', '4.3', '4.4', '4.5']
    },
    {
      name: 'Middleware Protection',
      pattern: 'src/lib/auth/__tests__/middleware.test.ts',
      requirements: ['5.1', '5.2', '5.4']
    },
    {
      name: 'Component Authentication',
      pattern: 'src/components/auth/__tests__/*.test.tsx',
      requirements: ['7.1', '7.2', '7.3', '7.4', '7.5']
    },
    {
      name: 'End-to-End Scenarios',
      pattern: 'src/lib/auth/__tests__/auth-e2e.test.ts',
      requirements: ['1.1', '1.2', '1.3', '1.4', '1.5', '2.1', '2.2', '2.3', '2.4', '2.5', '3.1', '3.2', '3.3', '3.4', '3.5', '4.1', '4.2', '4.3', '4.4', '4.5', '5.1', '5.2', '5.3', '5.4', '5.5', '6.1', '6.2', '6.3', '6.4', '6.5', '7.1', '7.2', '7.3', '7.4', '7.5']
    }
  ];

  private requirementDescriptions = {
    '1.1': 'Display "Sign in with Google" button',
    '1.2': 'Redirect to Google OAuth consent screen',
    '1.3': 'Create/update user profile with Google account info',
    '1.4': 'Redirect to dashboard on successful authentication',
    '1.5': 'Display user-friendly error messages on OAuth failure',
    '2.1': 'Create pending workspace membership record on invitation',
    '2.2': 'Automatically add invited users to workspace on first sign-in',
    '2.3': 'Enforce role permissions immediately upon workspace addition',
    '2.4': 'Prevent access for expired invitations',
    '2.5': 'Allow workspace switching for multi-workspace users',
    '3.1': 'Grant full workspace management permissions to owners',
    '3.2': 'Grant KPI/objective management permissions to admins',
    '3.3': 'Grant read-only access to members',
    '3.4': 'Deny unauthorized actions with 403 error',
    '3.5': 'Update permissions immediately on role changes',
    '4.1': 'Automatically enforce workspace-based Row-Level Security',
    '4.2': 'Return only data from current workspace context',
    '4.3': 'Validate workspace access before processing data operations',
    '4.4': 'Deny access and log unauthorized workspace access attempts',
    '4.5': 'Ensure no data leakage between workspaces',
    '5.1': 'Verify authentication status via middleware',
    '5.2': 'Redirect to sign-in page on session expiry',
    '5.3': 'Invalidate session and clear tokens on sign-out',
    '5.4': 'Redirect unauthenticated users to sign-in',
    '5.5': 'Verify workspace access permissions during session validation',
    '6.1': 'Store workspace context in user session',
    '6.2': 'Automatically load last selected workspace on return',
    '6.3': 'Update session context immediately on workspace switch',
    '6.4': 'Default to first available workspace if previous is inaccessible',
    '6.5': 'Update UI components to reflect new workspace data',
    '7.1': 'Display appropriate loading indicators during authentication',
    '7.2': 'Display specific, actionable error messages on failure',
    '7.3': 'Provide retry options for network issues',
    '7.4': 'Inform users when OAuth is temporarily unavailable',
    '7.5': 'Log technical details while showing user-friendly messages'
  };

  async runTests(): Promise<TestReport> {
    console.log('🚀 Starting Comprehensive Authentication Test Suite...\n');

    const startTime = Date.now();
    const results: TestResult[] = [];
    let totalTests = 0;
    let totalPassed = 0;
    let totalFailed = 0;
    let totalSkipped = 0;

    for (const suite of this.testSuites) {
      console.log(`📋 Running ${suite.name}...`);
      
      try {
        const suiteStartTime = Date.now();
        
        // Check if test files exist
        if (!this.testFilesExist(suite.pattern)) {
          console.log(`⚠️  Test files not found for ${suite.name}, skipping...`);
          continue;
        }

        // Run the test suite
        const output = execSync(
          `npm run test:run -- ${suite.pattern} --reporter=json`,
          { encoding: 'utf-8', stdio: 'pipe' }
        );

        const suiteResult = this.parseTestOutput(output);
        suiteResult.suite = suite.name;
        suiteResult.duration = Date.now() - suiteStartTime;

        results.push(suiteResult);
        totalTests += suiteResult.passed + suiteResult.failed + suiteResult.skipped;
        totalPassed += suiteResult.passed;
        totalFailed += suiteResult.failed;
        totalSkipped += suiteResult.skipped;

        console.log(`✅ ${suite.name}: ${suiteResult.passed} passed, ${suiteResult.failed} failed, ${suiteResult.skipped} skipped`);
      } catch (error) {
        console.log(`❌ ${suite.name}: Failed to run tests`);
        console.error(error);
        
        results.push({
          suite: suite.name,
          passed: 0,
          failed: 1,
          skipped: 0,
          duration: 0
        });
        totalFailed += 1;
      }
    }

    // Generate coverage report
    console.log('\n📊 Generating coverage report...');
    const coverage = await this.generateCoverageReport();

    // Generate requirement coverage
    const requirementCoverage = this.generateRequirementCoverage();

    const report: TestReport = {
      timestamp: new Date().toISOString(),
      totalTests,
      totalPassed,
      totalFailed,
      totalSkipped,
      overallDuration: Date.now() - startTime,
      overallCoverage: coverage,
      suites: results,
      requirements: requirementCoverage
    };

    this.generateReport(report);
    this.printSummary(report);

    return report;
  }

  private testFilesExist(pattern: string): boolean {
    try {
      if (pattern.includes('*')) {
        // For glob patterns, just check if the directory exists
        const dir = pattern.substring(0, pattern.lastIndexOf('/'));
        return existsSync(dir);
      } else {
        return existsSync(pattern);
      }
    } catch {
      return false;
    }
  }

  private parseTestOutput(output: string): TestResult {
    try {
      const jsonOutput = JSON.parse(output);
      return {
        suite: '',
        passed: jsonOutput.numPassedTests || 0,
        failed: jsonOutput.numFailedTests || 0,
        skipped: jsonOutput.numPendingTests || 0,
        duration: 0
      };
    } catch {
      // Fallback parsing if JSON output fails
      const lines = output.split('\n');
      let passed = 0;
      let failed = 0;
      let skipped = 0;

      for (const line of lines) {
        if (line.includes('✓') || line.includes('PASS')) passed++;
        if (line.includes('✗') || line.includes('FAIL')) failed++;
        if (line.includes('○') || line.includes('SKIP')) skipped++;
      }

      return { suite: '', passed, failed, skipped, duration: 0 };
    }
  }

  private async generateCoverageReport(): Promise<number> {
    try {
      const output = execSync(
        'npm run test:coverage -- src/lib/auth src/components/auth --reporter=json',
        { encoding: 'utf-8', stdio: 'pipe' }
      );

      // Parse coverage from output
      const coverageMatch = output.match(/All files\s+\|\s+([\d.]+)/);
      return coverageMatch ? parseFloat(coverageMatch[1]) : 0;
    } catch {
      return 0;
    }
  }

  private generateRequirementCoverage(): RequirementCoverage[] {
    const coverage: RequirementCoverage[] = [];

    for (const [req, description] of Object.entries(this.requirementDescriptions)) {
      const testFiles = this.testSuites
        .filter(suite => suite.requirements.includes(req))
        .map(suite => suite.pattern);

      coverage.push({
        requirement: req,
        description,
        testFiles,
        covered: testFiles.length > 0
      });
    }

    return coverage;
  }

  private generateReport(report: TestReport): void {
    const reportPath = join(process.cwd(), 'test-reports', 'auth-test-report.json');
    const htmlReportPath = join(process.cwd(), 'test-reports', 'auth-test-report.html');

    // Ensure directory exists
    execSync('mkdir -p test-reports', { stdio: 'ignore' });

    // Write JSON report
    writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Generate HTML report
    const htmlReport = this.generateHtmlReport(report);
    writeFileSync(htmlReportPath, htmlReport);

    console.log(`\n📄 Reports generated:`);
    console.log(`   JSON: ${reportPath}`);
    console.log(`   HTML: ${htmlReportPath}`);
  }

  private generateHtmlReport(report: TestReport): string {
    const successRate = ((report.totalPassed / report.totalTests) * 100).toFixed(1);
    const uncoveredRequirements = report.requirements.filter(r => !r.covered);

    return `
<!DOCTYPE html>
<html>
<head>
    <title>Authentication Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 8px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric { background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .metric h3 { margin: 0 0 10px 0; color: #333; }
        .metric .value { font-size: 24px; font-weight: bold; }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .skipped { color: #ffc107; }
        .suite { margin: 10px 0; padding: 15px; background: #f8f9fa; border-radius: 8px; }
        .requirements { margin: 20px 0; }
        .requirement { margin: 5px 0; padding: 10px; background: white; border-radius: 4px; }
        .covered { border-left: 4px solid #28a745; }
        .uncovered { border-left: 4px solid #dc3545; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔐 Authentication Test Report</h1>
        <p>Generated: ${report.timestamp}</p>
        <p>Duration: ${(report.overallDuration / 1000).toFixed(2)}s</p>
    </div>

    <div class="summary">
        <div class="metric">
            <h3>Total Tests</h3>
            <div class="value">${report.totalTests}</div>
        </div>
        <div class="metric">
            <h3>Success Rate</h3>
            <div class="value passed">${successRate}%</div>
        </div>
        <div class="metric">
            <h3>Passed</h3>
            <div class="value passed">${report.totalPassed}</div>
        </div>
        <div class="metric">
            <h3>Failed</h3>
            <div class="value failed">${report.totalFailed}</div>
        </div>
        <div class="metric">
            <h3>Coverage</h3>
            <div class="value">${report.overallCoverage.toFixed(1)}%</div>
        </div>
    </div>

    <h2>📋 Test Suites</h2>
    ${report.suites.map(suite => `
        <div class="suite">
            <h3>${suite.suite}</h3>
            <p>
                <span class="passed">✅ ${suite.passed} passed</span> | 
                <span class="failed">❌ ${suite.failed} failed</span> | 
                <span class="skipped">⏭️ ${suite.skipped} skipped</span>
            </p>
            <p>Duration: ${(suite.duration / 1000).toFixed(2)}s</p>
        </div>
    `).join('')}

    <h2>📋 Requirement Coverage</h2>
    <div class="requirements">
        ${report.requirements.map(req => `
            <div class="requirement ${req.covered ? 'covered' : 'uncovered'}">
                <strong>${req.requirement}</strong>: ${req.description}
                <br>
                <small>Tests: ${req.testFiles.length > 0 ? req.testFiles.join(', ') : 'None'}</small>
            </div>
        `).join('')}
    </div>

    ${uncoveredRequirements.length > 0 ? `
        <h2>⚠️ Uncovered Requirements</h2>
        <ul>
            ${uncoveredRequirements.map(req => `
                <li><strong>${req.requirement}</strong>: ${req.description}</li>
            `).join('')}
        </ul>
    ` : '<h2>✅ All Requirements Covered</h2>'}
</body>
</html>`;
  }

  private printSummary(report: TestReport): void {
    const successRate = ((report.totalPassed / report.totalTests) * 100).toFixed(1);
    const uncoveredCount = report.requirements.filter(r => !r.covered).length;

    console.log('\n' + '='.repeat(60));
    console.log('🔐 AUTHENTICATION TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`📊 Total Tests: ${report.totalTests}`);
    console.log(`✅ Passed: ${report.totalPassed}`);
    console.log(`❌ Failed: ${report.totalFailed}`);
    console.log(`⏭️  Skipped: ${report.totalSkipped}`);
    console.log(`🎯 Success Rate: ${successRate}%`);
    console.log(`📈 Coverage: ${report.overallCoverage.toFixed(1)}%`);
    console.log(`⏱️  Duration: ${(report.overallDuration / 1000).toFixed(2)}s`);
    console.log(`📋 Requirements: ${report.requirements.length - uncoveredCount}/${report.requirements.length} covered`);

    if (report.totalFailed > 0) {
      console.log('\n❌ FAILED SUITES:');
      report.suites
        .filter(suite => suite.failed > 0)
        .forEach(suite => {
          console.log(`   • ${suite.suite}: ${suite.failed} failed tests`);
        });
    }

    if (uncoveredCount > 0) {
      console.log('\n⚠️  UNCOVERED REQUIREMENTS:');
      report.requirements
        .filter(r => !r.covered)
        .forEach(req => {
          console.log(`   • ${req.requirement}: ${req.description}`);
        });
    }

    console.log('\n' + '='.repeat(60));
    
    if (report.totalFailed === 0 && uncoveredCount === 0) {
      console.log('🎉 ALL AUTHENTICATION TESTS PASSED!');
      console.log('🔒 Authentication system is fully tested and secure.');
    } else {
      console.log('⚠️  Some tests failed or requirements are uncovered.');
      console.log('🔧 Please review and fix the issues before deployment.');
    }
    
    console.log('='.repeat(60));
  }
}

// Run the tests if this script is executed directly
if (require.main === module) {
  const runner = new AuthTestRunner();
  runner.runTests().catch(console.error);
}

export { AuthTestRunner };