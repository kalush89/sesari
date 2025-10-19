import { NextRequest } from 'next/server';
import { AuthError } from '../types/auth';

/**
 * Security audit utilities for API routes
 * Requirements: 4.3, 4.4, 3.4, 5.1
 */

export interface SecurityAuditResult {
  endpoint: string;
  method: string;
  isSecured: boolean;
  hasAuthentication: boolean;
  hasWorkspaceValidation: boolean;
  hasPermissionCheck: boolean;
  hasInputValidation: boolean;
  vulnerabilities: string[];
  recommendations: string[];
}

export interface SecurityAuditLog {
  timestamp: Date;
  userId?: string;
  workspaceId?: string;
  endpoint: string;
  method: string;
  action: 'access_granted' | 'access_denied' | 'authentication_failed' | 'permission_denied';
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Security audit logger for tracking access attempts
 */
class SecurityAuditLogger {
  private logs: SecurityAuditLog[] = [];
  private maxLogs = 10000; // Keep last 10k logs in memory

  log(entry: Omit<SecurityAuditLog, 'timestamp'>): void {
    const logEntry: SecurityAuditLog = {
      ...entry,
      timestamp: new Date()
    };

    this.logs.push(logEntry);

    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // In production, this should write to a persistent store
    console.log('Security Audit:', JSON.stringify(logEntry));
  }

  getRecentLogs(limit: number = 100): SecurityAuditLog[] {
    return this.logs.slice(-limit);
  }

  getFailedAttempts(timeWindow: number = 3600000): SecurityAuditLog[] {
    const cutoff = new Date(Date.now() - timeWindow);
    return this.logs.filter(log => 
      log.timestamp > cutoff && 
      ['access_denied', 'authentication_failed', 'permission_denied'].includes(log.action)
    );
  }

  getSuspiciousActivity(userId?: string, ipAddress?: string): SecurityAuditLog[] {
    const recentLogs = this.getRecentLogs(1000);
    
    return recentLogs.filter(log => {
      // Multiple failed attempts from same IP
      if (ipAddress && log.ipAddress === ipAddress) {
        const failedAttempts = recentLogs.filter(l => 
          l.ipAddress === ipAddress && 
          ['access_denied', 'authentication_failed'].includes(l.action)
        );
        return failedAttempts.length > 5;
      }

      // Multiple failed attempts from same user
      if (userId && log.userId === userId) {
        const failedAttempts = recentLogs.filter(l => 
          l.userId === userId && 
          l.action === 'permission_denied'
        );
        return failedAttempts.length > 10;
      }

      return false;
    });
  }
}

export const securityAuditLogger = new SecurityAuditLogger();

/**
 * Middleware wrapper that adds security audit logging
 */
export function withSecurityAudit<T extends any[]>(
  handler: (...args: T) => Promise<Response>
) {
  return async (...args: T): Promise<Response> => {
    const request = args[0] as NextRequest;
    const startTime = Date.now();
    
    try {
      const response = await handler(...args);
      
      // Log successful access
      securityAuditLogger.log({
        endpoint: new URL(request.url).pathname,
        method: request.method,
        action: 'access_granted',
        ipAddress: getClientIP(request),
        userAgent: request.headers.get('user-agent') || undefined
      });

      return response;
    } catch (error: any) {
      // Log security-related failures
      let action: SecurityAuditLog['action'] = 'access_denied';
      let reason = 'Unknown error';

      if (error?.code === AuthError.SESSION_EXPIRED) {
        action = 'authentication_failed';
        reason = 'Session expired or invalid';
      } else if (error?.code === AuthError.INSUFFICIENT_PERMISSIONS) {
        action = 'permission_denied';
        reason = error.message;
      } else if (error?.code === AuthError.WORKSPACE_ACCESS_DENIED) {
        action = 'access_denied';
        reason = 'Workspace access denied';
      }

      securityAuditLogger.log({
        endpoint: new URL(request.url).pathname,
        method: request.method,
        action,
        reason,
        ipAddress: getClientIP(request),
        userAgent: request.headers.get('user-agent') || undefined
      });

      throw error;
    }
  };
}

/**
 * Extract client IP address from request
 */
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }

  return 'unknown';
}

/**
 * Validate API route security configuration
 */
export function auditApiRouteSecurity(
  endpoint: string,
  method: string,
  hasAuth: boolean,
  hasWorkspaceValidation: boolean,
  hasPermissionCheck: boolean,
  hasInputValidation: boolean
): SecurityAuditResult {
  const vulnerabilities: string[] = [];
  const recommendations: string[] = [];

  // Check authentication
  if (!hasAuth && !isPublicEndpoint(endpoint)) {
    vulnerabilities.push('Missing authentication validation');
    recommendations.push('Add authentication check using validateAuth() or withApiSecurity()');
  }

  // Check workspace validation for workspace-scoped endpoints
  if (isWorkspaceScopedEndpoint(endpoint) && !hasWorkspaceValidation) {
    vulnerabilities.push('Missing workspace access validation');
    recommendations.push('Add workspace validation using validateWorkspaceAuth()');
  }

  // Check permission validation for protected operations
  if (isProtectedOperation(endpoint, method) && !hasPermissionCheck) {
    vulnerabilities.push('Missing permission validation');
    recommendations.push('Add permission check using validatePermission()');
  }

  // Check input validation for data modification endpoints
  if (['POST', 'PUT', 'PATCH'].includes(method) && !hasInputValidation) {
    vulnerabilities.push('Missing input validation');
    recommendations.push('Add Zod schema validation for request body');
  }

  // Check for sensitive data exposure
  if (endpoint.includes('/admin') && !hasPermissionCheck) {
    vulnerabilities.push('Admin endpoint without proper authorization');
    recommendations.push('Ensure admin endpoints require appropriate permissions');
  }

  return {
    endpoint,
    method,
    isSecured: vulnerabilities.length === 0,
    hasAuthentication: hasAuth,
    hasWorkspaceValidation,
    hasPermissionCheck,
    hasInputValidation,
    vulnerabilities,
    recommendations
  };
}

/**
 * Check if endpoint is public (doesn't require authentication)
 */
function isPublicEndpoint(endpoint: string): boolean {
  const publicEndpoints = [
    '/api/auth',
    '/api/health',
    '/api/status'
  ];

  return publicEndpoints.some(pattern => endpoint.startsWith(pattern));
}

/**
 * Check if endpoint is workspace-scoped
 */
function isWorkspaceScopedEndpoint(endpoint: string): boolean {
  return endpoint.includes('/workspaces/') || 
         endpoint.includes('/kpis') || 
         endpoint.includes('/objectives') ||
         endpoint.includes('/members') ||
         endpoint.includes('/invitations');
}

/**
 * Check if operation requires special permissions
 */
function isProtectedOperation(endpoint: string, method: string): boolean {
  // Write operations generally require permissions
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return true;
  }

  // Admin endpoints require permissions
  if (endpoint.includes('/admin') || endpoint.includes('/manage')) {
    return true;
  }

  // Member management requires permissions
  if (endpoint.includes('/members') || endpoint.includes('/invitations')) {
    return true;
  }

  return false;
}

/**
 * Generate security audit report for all API routes
 */
export function generateSecurityAuditReport(): {
  summary: {
    totalEndpoints: number;
    securedEndpoints: number;
    vulnerableEndpoints: number;
    securityScore: number;
  };
  vulnerabilities: SecurityAuditResult[];
  recommendations: string[];
} {
  // This would typically scan all API route files
  // For now, return a placeholder structure
  
  const mockResults: SecurityAuditResult[] = [
    // This would be populated by scanning actual route files
  ];

  const vulnerableEndpoints = mockResults.filter(result => !result.isSecured);
  const allRecommendations = mockResults.flatMap(result => result.recommendations);
  const uniqueRecommendations = [...new Set(allRecommendations)];

  return {
    summary: {
      totalEndpoints: mockResults.length,
      securedEndpoints: mockResults.length - vulnerableEndpoints.length,
      vulnerableEndpoints: vulnerableEndpoints.length,
      securityScore: mockResults.length > 0 
        ? Math.round(((mockResults.length - vulnerableEndpoints.length) / mockResults.length) * 100)
        : 100
    },
    vulnerabilities: vulnerableEndpoints,
    recommendations: uniqueRecommendations
  };
}

/**
 * Rate limiting tracker for security
 */
export class RateLimitTracker {
  private attempts = new Map<string, { count: number; resetTime: number }>();

  checkRateLimit(
    key: string, 
    maxAttempts: number = 100, 
    windowMs: number = 60000
  ): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const current = this.attempts.get(key);

    if (!current || now > current.resetTime) {
      const resetTime = now + windowMs;
      this.attempts.set(key, { count: 1, resetTime });
      return { allowed: true, remaining: maxAttempts - 1, resetTime };
    }

    if (current.count >= maxAttempts) {
      return { allowed: false, remaining: 0, resetTime: current.resetTime };
    }

    current.count++;
    return { 
      allowed: true, 
      remaining: maxAttempts - current.count, 
      resetTime: current.resetTime 
    };
  }

  clearExpired(): void {
    const now = Date.now();
    for (const [key, value] of this.attempts.entries()) {
      if (now > value.resetTime) {
        this.attempts.delete(key);
      }
    }
  }
}

export const globalRateLimiter = new RateLimitTracker();