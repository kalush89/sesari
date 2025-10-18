import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { 
  usePermission, 
  useAnyPermission, 
  useAllPermissions,
  useUserRole,
  useHasRole,
  useIsOwner,
  useIsAdmin,
  useUserPermissions
} from '../permission-hooks';
import { WorkspaceRole, Permission } from '../../db';

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
  useSession: vi.fn()
}));

const mockUseSession = vi.fn();
vi.mocked(await import('next-auth/react')).useSession = mockUseSession;

describe('Permission Hooks', () => {
  describe('usePermission', () => {
    it('should return true when user has permission', () => {
      mockUseSession.mockReturnValue({
        data: { 
          user: { id: 'test', email: 'test@example.com', name: 'Test User' },
          role: WorkspaceRole.OWNER,
          expires: '2024-12-31'
        },
        status: 'authenticated',
        update: vi.fn()
      });

      const { result } = renderHook(() => usePermission(Permission.CREATE_KPI));
      
      expect(result.current).toBe(true);
    });

    it('should return false when user lacks permission', () => {
      mockUseSession.mockReturnValue({
        data: { 
          user: { id: 'test', email: 'test@example.com', name: 'Test User' },
          role: WorkspaceRole.MEMBER,
          expires: '2024-12-31'
        },
        status: 'authenticated',
        update: vi.fn()
      });

      const { result } = renderHook(() => usePermission(Permission.CREATE_KPI));
      
      expect(result.current).toBe(false);
    });

    it('should return false when no session', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: vi.fn()
      });

      const { result } = renderHook(() => usePermission(Permission.CREATE_KPI));
      
      expect(result.current).toBe(false);
    });

    it('should return false when no role in session', () => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: 'test', email: 'test@example.com', name: 'Test User' },
          expires: '2024-12-31'
        },
        status: 'authenticated',
        update: vi.fn()
      });

      const { result } = renderHook(() => usePermission(Permission.CREATE_KPI));
      
      expect(result.current).toBe(false);
    });
  });

  describe('useAnyPermission', () => {
    it('should return true when user has at least one permission', () => {
      mockUseSession.mockReturnValue({
        data: { 
          user: { id: 'test', email: 'test@example.com', name: 'Test User' },
          role: WorkspaceRole.MEMBER,
          expires: '2024-12-31'
        },
        status: 'authenticated',
        update: vi.fn()
      });

      const { result } = renderHook(() => useAnyPermission([
        Permission.CREATE_KPI,
        Permission.VIEW_KPI
      ]));
      
      expect(result.current).toBe(true);
    });

    it('should return false when user has none of the permissions', () => {
      mockUseSession.mockReturnValue({
        data: { 
          user: { id: 'test', email: 'test@example.com', name: 'Test User' },
          role: WorkspaceRole.MEMBER,
          expires: '2024-12-31'
        },
        status: 'authenticated',
        update: vi.fn()
      });

      const { result } = renderHook(() => useAnyPermission([
        Permission.CREATE_KPI,
        Permission.MANAGE_WORKSPACE
      ]));
      
      expect(result.current).toBe(false);
    });
  });

  describe('useAllPermissions', () => {
    it('should return true when user has all permissions', () => {
      mockUseSession.mockReturnValue({
        data: { 
          user: { id: 'test', email: 'test@example.com', name: 'Test User' },
          role: WorkspaceRole.OWNER,
          expires: '2024-12-31'
        },
        status: 'authenticated',
        update: vi.fn()
      });

      const { result } = renderHook(() => useAllPermissions([
        Permission.CREATE_KPI,
        Permission.VIEW_KPI
      ]));
      
      expect(result.current).toBe(true);
    });

    it('should return false when user lacks any permission', () => {
      mockUseSession.mockReturnValue({
        data: { 
          user: { id: 'test', email: 'test@example.com', name: 'Test User' },
          role: WorkspaceRole.MEMBER,
          expires: '2024-12-31'
        },
        status: 'authenticated',
        update: vi.fn()
      });

      const { result } = renderHook(() => useAllPermissions([
        Permission.CREATE_KPI,
        Permission.VIEW_KPI
      ]));
      
      expect(result.current).toBe(false);
    });
  });

  describe('useUserRole', () => {
    it('should return user role when authenticated', () => {
      mockUseSession.mockReturnValue({
        data: { 
          user: { id: 'test', email: 'test@example.com', name: 'Test User' },
          role: WorkspaceRole.ADMIN,
          expires: '2024-12-31'
        },
        status: 'authenticated',
        update: vi.fn()
      });

      const { result } = renderHook(() => useUserRole());
      
      expect(result.current).toBe(WorkspaceRole.ADMIN);
    });

    it('should return null when no session', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: vi.fn()
      });

      const { result } = renderHook(() => useUserRole());
      
      expect(result.current).toBe(null);
    });
  });

  describe('useHasRole', () => {
    it('should return true when user has specified role', () => {
      mockUseSession.mockReturnValue({
        data: { 
          user: { id: 'test', email: 'test@example.com', name: 'Test User' },
          role: WorkspaceRole.ADMIN,
          expires: '2024-12-31'
        },
        status: 'authenticated',
        update: vi.fn()
      });

      const { result } = renderHook(() => useHasRole(WorkspaceRole.ADMIN));
      
      expect(result.current).toBe(true);
    });

    it('should return false when user has different role', () => {
      mockUseSession.mockReturnValue({
        data: { 
          user: { id: 'test', email: 'test@example.com', name: 'Test User' },
          role: WorkspaceRole.MEMBER,
          expires: '2024-12-31'
        },
        status: 'authenticated',
        update: vi.fn()
      });

      const { result } = renderHook(() => useHasRole(WorkspaceRole.ADMIN));
      
      expect(result.current).toBe(false);
    });
  });

  describe('useIsOwner', () => {
    it('should return true when user is owner', () => {
      mockUseSession.mockReturnValue({
        data: { 
          user: { id: 'test', email: 'test@example.com', name: 'Test User' },
          role: WorkspaceRole.OWNER,
          expires: '2024-12-31'
        },
        status: 'authenticated',
        update: vi.fn()
      });

      const { result } = renderHook(() => useIsOwner());
      
      expect(result.current).toBe(true);
    });

    it('should return false when user is not owner', () => {
      mockUseSession.mockReturnValue({
        data: { 
          user: { id: 'test', email: 'test@example.com', name: 'Test User' },
          role: WorkspaceRole.ADMIN,
          expires: '2024-12-31'
        },
        status: 'authenticated',
        update: vi.fn()
      });

      const { result } = renderHook(() => useIsOwner());
      
      expect(result.current).toBe(false);
    });
  });

  describe('useIsAdmin', () => {
    it('should return true when user is owner', () => {
      mockUseSession.mockReturnValue({
        data: { 
          user: { id: 'test', email: 'test@example.com', name: 'Test User' },
          role: WorkspaceRole.OWNER,
          expires: '2024-12-31'
        },
        status: 'authenticated',
        update: vi.fn()
      });

      const { result } = renderHook(() => useIsAdmin());
      
      expect(result.current).toBe(true);
    });

    it('should return true when user is admin', () => {
      mockUseSession.mockReturnValue({
        data: { 
          user: { id: 'test', email: 'test@example.com', name: 'Test User' },
          role: WorkspaceRole.ADMIN,
          expires: '2024-12-31'
        },
        status: 'authenticated',
        update: vi.fn()
      });

      const { result } = renderHook(() => useIsAdmin());
      
      expect(result.current).toBe(true);
    });

    it('should return false when user is member', () => {
      mockUseSession.mockReturnValue({
        data: { 
          user: { id: 'test', email: 'test@example.com', name: 'Test User' },
          role: WorkspaceRole.MEMBER,
          expires: '2024-12-31'
        },
        status: 'authenticated',
        update: vi.fn()
      });

      const { result } = renderHook(() => useIsAdmin());
      
      expect(result.current).toBe(false);
    });
  });

  describe('useUserPermissions', () => {
    it('should return permissions for user role', () => {
      mockUseSession.mockReturnValue({
        data: { 
          user: { id: 'test', email: 'test@example.com', name: 'Test User' },
          role: WorkspaceRole.MEMBER,
          expires: '2024-12-31'
        },
        status: 'authenticated',
        update: vi.fn()
      });

      const { result } = renderHook(() => useUserPermissions());
      
      expect(result.current).toEqual([
        Permission.VIEW_KPI,
        Permission.VIEW_OBJECTIVE
      ]);
    });

    it('should return empty array when no session', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: vi.fn()
      });

      const { result } = renderHook(() => useUserPermissions());
      
      expect(result.current).toEqual([]);
    });
  });
});