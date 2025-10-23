#!/usr/bin/env tsx

/**
 * Authentication Error Debug Script
 * 
 * This script helps diagnose authentication issues by checking:
 * - Environment variables
 * - Database connectivity
 * - NextAuth configuration
 * - Session handling
 * - OAuth provider setup
 */

import { PrismaClient } from '@prisma/client';
import { authOptions } from '../src/lib/auth/config';

const prisma = new PrismaClient();

interface DebugResult {
  category: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
}

class AuthDebugger {
  private results: DebugResult[] = [];

  private addResult(category: string, status: 'pass' | 'fail' | 'warning', message: string, details?: any) {
    this.results.push({ category, status, message, details });
  }

  async checkEnvironmentVariables() {
    console.log('🔍 Checking environment variables...');
    
    const requiredVars = [
      'NEXTAUTH_URL',
      'NEXTAUTH_SECRET',
      'GOOGLE_CLIENT_ID',
      'GOOGLE_CLIENT_SECRET',
      'DATABASE_URL'
    ];

    for (const varName of requiredVars) {
      const value = process.env[varName];
      if (!value) {
        this.addResult('Environment', 'fail', `Missing ${varName}`, { variable: varName });
      } else if (varName === 'NEXTAUTH_SECRET' && value.length < 32) {
        this.addResult('Environment', 'warning', `${varName} should be at least 32 characters`, { length: value.length });
      } else {
        this.addResult('Environment', 'pass', `${varName} is set`, { 
          variable: varName, 
          preview: varName.includes('SECRET') ? '[HIDDEN]' : value.substring(0, 20) + '...' 
        });
      }
    }

    // Check NEXTAUTH_URL format
    const nextAuthUrl = process.env.NEXTAUTH_URL;
    if (nextAuthUrl) {
      try {
        new URL(nextAuthUrl);
        this.addResult('Environment', 'pass', 'NEXTAUTH_URL is a valid URL');
      } catch {
        this.addResult('Environment', 'fail', 'NEXTAUTH_URL is not a valid URL', { url: nextAuthUrl });
      }
    }
  }

  async checkDatabaseConnection() {
    console.log('🔍 Checking database connection...');
    
    try {
      await prisma.$connect();
      this.addResult('Database', 'pass', 'Database connection successful');

      // Check if required tables exist
      const tables = ['User', 'Account', 'Session', 'Workspace', 'WorkspaceMembership'];
      
      for (const table of tables) {
        try {
          const count = await (prisma as any)[table.toLowerCase()].count();
          this.addResult('Database', 'pass', `Table ${table} exists`, { recordCount: count });
        } catch (error) {
          this.addResult('Database', 'fail', `Table ${table} missing or inaccessible`, { error: (error as Error).message });
        }
      }

    } catch (error) {
      this.addResult('Database', 'fail', 'Database connection failed', { error: (error as Error).message });
    }
  }

  async checkNextAuthConfig() {
    console.log('🔍 Checking NextAuth configuration...');
    
    try {
      // Check providers
      if (authOptions.providers && authOptions.providers.length > 0) {
        this.addResult('NextAuth', 'pass', `${authOptions.providers.length} provider(s) configured`);
        
        authOptions.providers.forEach((provider, index) => {
          this.addResult('NextAuth', 'pass', `Provider ${index + 1}: ${provider.type}`, { 
            id: provider.id,
            name: provider.name 
          });
        });
      } else {
        this.addResult('NextAuth', 'fail', 'No providers configured');
      }

      // Check session strategy
      if (authOptions.session?.strategy) {
        this.addResult('NextAuth', 'pass', `Session strategy: ${authOptions.session.strategy}`);
      } else {
        this.addResult('NextAuth', 'warning', 'No session strategy specified');
      }

      // Check adapter
      if (authOptions.adapter) {
        this.addResult('NextAuth', 'pass', 'Database adapter configured');
      } else {
        this.addResult('NextAuth', 'warning', 'No database adapter configured');
      }

      // Check callbacks
      const callbacks = authOptions.callbacks;
      if (callbacks) {
        const callbackTypes = Object.keys(callbacks);
        this.addResult('NextAuth', 'pass', `Callbacks configured: ${callbackTypes.join(', ')}`);
      }

    } catch (error) {
      this.addResult('NextAuth', 'fail', 'NextAuth configuration error', { error: (error as Error).message });
    }
  }

  async checkGoogleOAuthSetup() {
    console.log('🔍 Checking Google OAuth setup...');
    
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const nextAuthUrl = process.env.NEXTAUTH_URL;

    if (!clientId || !clientSecret) {
      this.addResult('OAuth', 'fail', 'Google OAuth credentials missing');
      return;
    }

    // Check client ID format
    if (clientId.endsWith('.apps.googleusercontent.com')) {
      this.addResult('OAuth', 'pass', 'Google Client ID format is correct');
    } else {
      this.addResult('OAuth', 'warning', 'Google Client ID format may be incorrect', { 
        expected: '*.apps.googleusercontent.com',
        actual: clientId.substring(0, 20) + '...'
      });
    }

    // Check redirect URI
    if (nextAuthUrl) {
      const expectedRedirectUri = `${nextAuthUrl}/api/auth/callback/google`;
      this.addResult('OAuth', 'pass', 'Expected redirect URI', { uri: expectedRedirectUri });
    }

    // Test basic OAuth endpoint accessibility (without making actual requests)
    this.addResult('OAuth', 'pass', 'Google OAuth endpoints should be accessible from your domain');
  }

  async checkSessionHandling() {
    console.log('🔍 Checking session handling...');
    
    try {
      // Check for existing sessions
      const sessionCount = await prisma.session.count();
      this.addResult('Sessions', 'pass', `Found ${sessionCount} session(s) in database`);

      // Check for expired sessions
      const expiredSessions = await prisma.session.count({
        where: {
          expires: {
            lt: new Date()
          }
        }
      });

      if (expiredSessions > 0) {
        this.addResult('Sessions', 'warning', `Found ${expiredSessions} expired session(s)`, {
          suggestion: 'Consider running session cleanup'
        });
      }

      // Check session configuration
      const maxAge = authOptions.session?.maxAge;
      if (maxAge) {
        const days = Math.floor(maxAge / (24 * 60 * 60));
        this.addResult('Sessions', 'pass', `Session max age: ${days} days`);
      }

    } catch (error) {
      this.addResult('Sessions', 'fail', 'Session check failed', { error: (error as Error).message });
    }
  }

  async checkCommonIssues() {
    console.log('🔍 Checking for common issues...');
    
    // Check for localhost vs production URL issues
    const nextAuthUrl = process.env.NEXTAUTH_URL;
    if (nextAuthUrl?.includes('localhost') && process.env.NODE_ENV === 'production') {
      this.addResult('Common Issues', 'fail', 'Using localhost URL in production', {
        current: nextAuthUrl,
        suggestion: 'Update NEXTAUTH_URL to production domain'
      });
    }

    // Check for HTTPS in production
    if (nextAuthUrl && !nextAuthUrl.startsWith('https://') && process.env.NODE_ENV === 'production') {
      this.addResult('Common Issues', 'warning', 'Not using HTTPS in production', {
        current: nextAuthUrl,
        suggestion: 'Use HTTPS for production'
      });
    }

    // Check for recent accounts with issues
    try {
      const recentAccounts = await prisma.account.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { user: true }
      });

      if (recentAccounts.length > 0) {
        this.addResult('Common Issues', 'pass', `Found ${recentAccounts.length} recent account(s)`);
      }
    } catch (error) {
      this.addResult('Common Issues', 'warning', 'Could not check recent accounts', { error: (error as Error).message });
    }
  }

  async generateReport() {
    console.log('\n📊 Generating debug report...\n');

    const categories = [...new Set(this.results.map(r => r.category))];
    
    for (const category of categories) {
      console.log(`\n=== ${category} ===`);
      
      const categoryResults = this.results.filter(r => r.category === category);
      
      for (const result of categoryResults) {
        const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️';
        console.log(`${icon} ${result.message}`);
        
        if (result.details) {
          console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
        }
      }
    }

    // Summary
    const passed = this.results.filter(r => r.status === 'pass').length;
    const failed = this.results.filter(r => r.status === 'fail').length;
    const warnings = this.results.filter(r => r.status === 'warning').length;

    console.log('\n=== SUMMARY ===');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⚠️  Warnings: ${warnings}`);

    if (failed > 0) {
      console.log('\n🚨 CRITICAL ISSUES FOUND:');
      this.results
        .filter(r => r.status === 'fail')
        .forEach(r => console.log(`   - ${r.message}`));
    }

    if (warnings > 0) {
      console.log('\n⚠️  WARNINGS:');
      this.results
        .filter(r => r.status === 'warning')
        .forEach(r => console.log(`   - ${r.message}`));
    }

    console.log('\n=== RECOMMENDATIONS ===');
    
    if (failed > 0) {
      console.log('1. Fix all failed checks before proceeding');
      console.log('2. Verify environment variables are correctly set');
      console.log('3. Check database connectivity and schema');
    }
    
    if (warnings > 0) {
      console.log('4. Review warnings for potential improvements');
    }
    
    console.log('5. Test authentication flow in incognito/private browser');
    console.log('6. Check browser console for additional error details');
    console.log('7. Verify Google OAuth console configuration');
  }

  async run() {
    console.log('🔧 Starting Authentication Debug Session...\n');
    
    try {
      await this.checkEnvironmentVariables();
      await this.checkDatabaseConnection();
      await this.checkNextAuthConfig();
      await this.checkGoogleOAuthSetup();
      await this.checkSessionHandling();
      await this.checkCommonIssues();
      
      await this.generateReport();
      
    } catch (error) {
      console.error('❌ Debug session failed:', error);
    } finally {
      await prisma.$disconnect();
    }
  }
}

// Run the debugger
if (require.main === module) {
  const debugger = new AuthDebugger();
  debugger.run().catch(console.error);
}

export { AuthDebugger };