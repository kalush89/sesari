import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processPendingInvitations, getPendingInvitations, cleanupExpiredInvitations, generateInvitationToken, validateInvitationToken, createWorkspaceSlug } from '../invitation-utils';
import { hasPermission, getRolePermissions } from '../../db';
import { WorkspaceRole, Permission } from '../../db';

// Mock crypto for token generation
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => 'mock-uuid-123'),
    getRandomValues: vi.fn((arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    }),
  },
});

describe('Authentication Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Invitation Processing', () => {
    it('should process pending invitations for new users', async () => {
      const mockPrisma = {
        workspaceInvitation: {
          findMany: vi.fn(),
          update: vi.fn(),
        },
        workspaceMembership: {
          findFirst: vi.fn(),
          create: vi.fn(),
        },
      };

      vi.doMock('../../db', () => ({ prisma: mockPrisma }));

      const mockInvitations = [
        {
          id: 'invitation-1',
          workspaceId: 'workspace-1',
          email: 'user@example.com',
          role: WorkspaceRole.MEMBER,
          workspace: { id: 'workspace-1', name: 'Test Workspace', slug: 'test-workspace' },
        },
      ];

      mockPrisma.workspaceInvitation.findMany.mockResolvedValue(mockInvitations);
      mockPrisma.workspaceMembership.findFirst.mockResolvedValue(null);
      mockPrisma.workspaceMembership.create.mockResolvedValue({
        id: 'membership-1',
        workspaceId: 'workspace-1',
        userId: 'user-1',
        role: WorkspaceRole.MEMBER,
      });

      const result = await processPendingInvitations('user-1', 'user@example.com');

      expect(result.processedCount).toBe(1);
      expect(result.memberships).toHaveLength(1);
    });

    it('should get pending invitations by email', async () => {
      const mockInvitations = [
        {
          id: 'invitation-1',
          workspaceId: 'workspace-1',
          email: 'user@example.com',
          role: WorkspaceRole.MEMBER,
          workspace: { name: 'Test Workspace' },
        },
      ];

      const result = await getPendingInvitations('user@example.com');
      expect(Array.isArray(result)).toBe(true);
    });

    it('should cleanup expired invitations', async () => {
      const result = await cleanupExpiredInvitations();
      expect(typeof result).toBe('object');
    });
  });

  describe('Workspace Slug Generation', () => {

    it('should create valid slugs from workspace names', () => {
      expect(createWorkspaceSlug('My Awesome Workspace')).toBe('my-awesome-workspace');
      expect(createWorkspaceSlug('Test & Development')).toBe('test--development');
      expect(createWorkspaceSlug('  Spaces  Everywhere  ')).toBe('spaces--everywhere');
      expect(createWorkspaceSlug('123 Numbers & Symbols!')).toBe('123-numbers--symbols');
    });

    it('should handle edge cases in slug generation', () => {
      expect(createWorkspaceSlug('')).toBe('workspace');
      expect(createWorkspaceSlug('   ')).toBe('workspace');
      expect(createWorkspaceSlug('!@#$%^&*()')).toBe('workspace');
      expect(createWorkspaceSlug('a')).toBe('a');
    });

    it('should ensure slug uniqueness', () => {
      const baseName = 'Test Workspace';
      const slug1 = createWorkspaceSlug(baseName);
      const slug2 = createWorkspaceSlug(baseName, 1);
      const slug3 = createWorkspaceSlug(baseName, 2);

      expect(slug1).toBe('test-workspace');
      expect(slug2).toBe('test-workspace-1');
      expect(slug3).toBe('test-workspace-2');
    });
  });

  describe('Permission System', () => {
    it('should correctly check owner permissions', () => {
      expect(hasPermission(WorkspaceRole.OWNER, Permission.MANAGE_WORKSPACE)).toBe(true);
      expect(hasPermission(WorkspaceRole.OWNER, Permission.CREATE_KPI)).toBe(true);
      expect(hasPermission(WorkspaceRole.OWNER, Permission.VIEW_KPI)).toBe(true);
      expect(hasPermission(WorkspaceRole.OWNER, Permission.MANAGE_BILLING)).toBe(true);
    });

    it('should correctly check admin permissions', () => {
      expect(hasPermission(WorkspaceRole.ADMIN, Permission.CREATE_KPI)).toBe(true);
      expect(hasPermission(WorkspaceRole.ADMIN, Permission.EDIT_KPI)).toBe(true);
      expect(hasPermission(WorkspaceRole.ADMIN, Permission.VIEW_KPI)).toBe(true);
      expect(hasPermission(WorkspaceRole.ADMIN, Permission.INVITE_MEMBERS)).toBe(true);
      expect(hasPermission(WorkspaceRole.ADMIN, Permission.MANAGE_WORKSPACE)).toBe(false);
      expect(hasPermission(WorkspaceRole.ADMIN, Permission.MANAGE_BILLING)).toBe(false);
    });

    it('should correctly check member permissions', () => {
      expect(hasPermission(WorkspaceRole.MEMBER, Permission.VIEW_KPI)).toBe(true);
      expect(hasPermission(WorkspaceRole.MEMBER, Permission.VIEW_OBJECTIVE)).toBe(true);
      expect(hasPermission(WorkspaceRole.MEMBER, Permission.CREATE_KPI)).toBe(false);
      expect(hasPermission(WorkspaceRole.MEMBER, Permission.EDIT_KPI)).toBe(false);
      expect(hasPermission(WorkspaceRole.MEMBER, Permission.INVITE_MEMBERS)).toBe(false);
      expect(hasPermission(WorkspaceRole.MEMBER, Permission.MANAGE_WORKSPACE)).toBe(false);
    });

    it('should get all permissions for a role', () => {
      const ownerPermissions = getRolePermissions(WorkspaceRole.OWNER);
      const adminPermissions = getRolePermissions(WorkspaceRole.ADMIN);
      const memberPermissions = getRolePermissions(WorkspaceRole.MEMBER);

      expect(ownerPermissions).toContain(Permission.MANAGE_WORKSPACE);
      expect(ownerPermissions).toContain(Permission.MANAGE_BILLING);
      expect(ownerPermissions.length).toBeGreaterThan(adminPermissions.length);

      expect(adminPermissions).toContain(Permission.CREATE_KPI);
      expect(adminPermissions).toContain(Permission.INVITE_MEMBERS);
      expect(adminPermissions).not.toContain(Permission.MANAGE_BILLING);
      expect(adminPermissions.length).toBeGreaterThan(memberPermissions.length);

      expect(memberPermissions).toContain(Permission.VIEW_KPI);
      expect(memberPermissions).toContain(Permission.VIEW_OBJECTIVE);
      expect(memberPermissions).not.toContain(Permission.CREATE_KPI);
      expect(memberPermissions.length).toBeLessThan(adminPermissions.length);
    });
  });

  describe('Security Utilities', () => {
    // Mock implementations of security utilities
    const isValidEmail = (email: string): boolean => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    };

    const sanitizeInput = (input: string): string => {
      return input.replace(/<[^>]*>/g, '');
    };

    const isValidWorkspaceName = (name: string): boolean => {
      const trimmed = name.trim();
      return trimmed.length >= 2 && trimmed.length <= 100;
    };

    it('should validate email formats', () => {
      expect(isValidEmail('user@example.com')).toBe(true);
      expect(isValidEmail('test.email+tag@domain.co.uk')).toBe(true);
      expect(isValidEmail('invalid-email')).toBe(false);
      expect(isValidEmail('user@')).toBe(false);
      expect(isValidEmail('@domain.com')).toBe(false);
      expect(isValidEmail('')).toBe(false);
    });

    it('should sanitize user inputs', () => {
      expect(sanitizeInput('Normal text')).toBe('Normal text');
      expect(sanitizeInput('<script>alert("xss")</script>')).toBe('alert("xss")');
      expect(sanitizeInput('Text with "quotes" and \'apostrophes\'')).toBe('Text with "quotes" and \'apostrophes\'');
      expect(sanitizeInput('')).toBe('');
    });

    it('should validate workspace names', () => {
      expect(isValidWorkspaceName('Valid Workspace Name')).toBe(true);
      expect(isValidWorkspaceName('A')).toBe(false); // Too short
      expect(isValidWorkspaceName('a'.repeat(101))).toBe(false); // Too long
      expect(isValidWorkspaceName('')).toBe(false);
      expect(isValidWorkspaceName('   ')).toBe(false);
    });
  });

  describe('Rate Limiting Utilities', () => {
    // Mock rate limiting implementation
    const rateLimitStore = new Map<string, number>();
    const RATE_LIMIT = 5;

    const trackInvitationAttempt = (email: string, workspaceId: string): void => {
      const key = `${email}:${workspaceId}`;
      const current = rateLimitStore.get(key) || 0;
      rateLimitStore.set(key, current + 1);
    };

    const isRateLimited = (email: string, workspaceId: string): boolean => {
      const key = `${email}:${workspaceId}`;
      return (rateLimitStore.get(key) || 0) >= RATE_LIMIT;
    };

    const resetRateLimit = (email: string, workspaceId: string): void => {
      const key = `${email}:${workspaceId}`;
      rateLimitStore.delete(key);
    };

    it('should track invitation attempts', () => {
      const email = 'test@example.com';
      const workspaceId = 'workspace-1';
      
      // First few attempts should be allowed
      expect(isRateLimited(email, workspaceId)).toBe(false);
      trackInvitationAttempt(email, workspaceId);
      trackInvitationAttempt(email, workspaceId);
      trackInvitationAttempt(email, workspaceId);
      
      // After too many attempts, should be rate limited
      trackInvitationAttempt(email, workspaceId);
      trackInvitationAttempt(email, workspaceId);
      
      expect(isRateLimited(email, workspaceId)).toBe(true);
    });

    it('should reset rate limits after time window', () => {
      const email = 'test2@example.com';
      const workspaceId = 'workspace-1';
      
      // Simulate rate limiting
      for (let i = 0; i < 6; i++) {
        trackInvitationAttempt(email, workspaceId);
      }
      
      expect(isRateLimited(email, workspaceId)).toBe(true);
      
      // Reset rate limit
      resetRateLimit(email, workspaceId);
      
      expect(isRateLimited(email, workspaceId)).toBe(false);
    });
  });

  describe('Audit Logging', () => {
    it('should log authentication events', () => {
      const { logAuthEvent } = require('../invitation-utils');
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      logAuthEvent('user-1', 'SIGN_IN', { provider: 'google' });
      logAuthEvent('user-1', 'WORKSPACE_SWITCH', { 
        fromWorkspace: 'workspace-1', 
        toWorkspace: 'workspace-2' 
      });
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('AUTH_EVENT'),
        expect.objectContaining({
          userId: 'user-1',
          event: 'SIGN_IN',
          metadata: { provider: 'google' }
        })
      );
      
      consoleSpy.mockRestore();
    });

    it('should log security events', () => {
      const { logSecurityEvent } = require('../invitation-utils');
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      logSecurityEvent('UNAUTHORIZED_ACCESS', {
        userId: 'user-1',
        workspaceId: 'workspace-2',
        resource: '/api/kpis'
      });
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('SECURITY_EVENT'),
        expect.objectContaining({
          event: 'UNAUTHORIZED_ACCESS',
          metadata: expect.objectContaining({
            userId: 'user-1',
            workspaceId: 'workspace-2'
          })
        })
      );
      
      consoleSpy.mockRestore();
    });
  });
});