import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useWorkspace, usePermission, useHasAnyPermission, useHasAllPermissions, useWorkspaceHeaders } from '../use-workspace';
import { useWorkspaceStore } from '../../stores/workspace-store';
import { WorkspaceRole, Permission } from '../../db';
import { WorkspaceWithMembership } from '../../types/auth';

describe('useWorkspace hooks', () => {
  beforeEach(() => {
    // Reset store state
    useWorkspaceStore.getState().clearWorkspaceContext();
  });

  const mockWorkspace: WorkspaceWithMembership = {
    id: 'workspace-1',
    name: 'Test Workspace',
    slug: 'test-workspace',
    ownerId: 'user-1',
    planType: 'free',
    createdAt: new Date(),
    updatedAt: new Date(),
    memberships: [],
    userRole: WorkspaceRole.OWNER,
  };

  const mockPermissions = [
    Permission.MANAGE_WORKSPACE,
    Permission.VIEW_KPI,
    Permission.CREATE_KPI,
  ];

  describe('useWorkspace', () => {
    it('should return workspace context', () => {
      const { setCurrentWorkspace, setAvailableWorkspaces } = useWorkspaceStore.getState();
      setCurrentWorkspace(mockWorkspace, WorkspaceRole.OWNER, mockPermissions);
      setAvailableWorkspaces([mockWorkspace]);

      const { result } = renderHook(() => useWorkspace());

      expect(result.current.workspace).toEqual(mockWorkspace);
      expect(result.current.workspaceId).toBe('workspace-1');
      expect(result.current.workspaceName).toBe('Test Workspace');
      expect(result.current.role).toBe(WorkspaceRole.OWNER);
      expect(result.current.permissions).toEqual(mockPermissions);
      expect(result.current.availableWorkspaces).toEqual([mockWorkspace]);
      expect(result.current.hasMultipleWorkspaces).toBe(false);
    });

    it('should return null values when no workspace', () => {
      const { result } = renderHook(() => useWorkspace());

      expect(result.current.workspace).toBeNull();
      expect(result.current.workspaceId).toBeNull();
      expect(result.current.workspaceName).toBeNull();
      expect(result.current.role).toBeNull();
      expect(result.current.permissions).toEqual([]);
      expect(result.current.availableWorkspaces).toEqual([]);
      expect(result.current.hasMultipleWorkspaces).toBe(false);
    });

    it('should detect multiple workspaces', () => {
      const secondWorkspace = { ...mockWorkspace, id: 'workspace-2', name: 'Second Workspace' };
      const { setAvailableWorkspaces } = useWorkspaceStore.getState();
      setAvailableWorkspaces([mockWorkspace, secondWorkspace]);

      const { result } = renderHook(() => useWorkspace());

      expect(result.current.hasMultipleWorkspaces).toBe(true);
    });
  });

  describe('usePermission', () => {
    it('should return true for granted permission', () => {
      const { setCurrentWorkspace } = useWorkspaceStore.getState();
      setCurrentWorkspace(mockWorkspace, WorkspaceRole.OWNER, mockPermissions);

      const { result } = renderHook(() => usePermission(Permission.MANAGE_WORKSPACE));

      expect(result.current).toBe(true);
    });

    it('should return false for denied permission', () => {
      const { setCurrentWorkspace } = useWorkspaceStore.getState();
      setCurrentWorkspace(mockWorkspace, WorkspaceRole.OWNER, mockPermissions);

      const { result } = renderHook(() => usePermission(Permission.MANAGE_BILLING));

      expect(result.current).toBe(false);
    });

    it('should return false when no permissions', () => {
      const { result } = renderHook(() => usePermission(Permission.MANAGE_WORKSPACE));

      expect(result.current).toBe(false);
    });
  });

  describe('useHasAnyPermission', () => {
    it('should return true when user has any of the required permissions', () => {
      const { setCurrentWorkspace } = useWorkspaceStore.getState();
      setCurrentWorkspace(mockWorkspace, WorkspaceRole.OWNER, mockPermissions);

      const { result } = renderHook(() => 
        useHasAnyPermission([Permission.MANAGE_BILLING, Permission.VIEW_KPI])
      );

      expect(result.current).toBe(true);
    });

    it('should return false when user has none of the required permissions', () => {
      const { setCurrentWorkspace } = useWorkspaceStore.getState();
      setCurrentWorkspace(mockWorkspace, WorkspaceRole.OWNER, mockPermissions);

      const { result } = renderHook(() => 
        useHasAnyPermission([Permission.MANAGE_BILLING])
      );

      expect(result.current).toBe(false);
    });
  });

  describe('useHasAllPermissions', () => {
    it('should return true when user has all required permissions', () => {
      const { setCurrentWorkspace } = useWorkspaceStore.getState();
      setCurrentWorkspace(mockWorkspace, WorkspaceRole.OWNER, mockPermissions);

      const { result } = renderHook(() => 
        useHasAllPermissions([Permission.VIEW_KPI, Permission.CREATE_KPI])
      );

      expect(result.current).toBe(true);
    });

    it('should return false when user is missing some permissions', () => {
      const { setCurrentWorkspace } = useWorkspaceStore.getState();
      setCurrentWorkspace(mockWorkspace, WorkspaceRole.OWNER, mockPermissions);

      const { result } = renderHook(() => 
        useHasAllPermissions([Permission.VIEW_KPI, Permission.MANAGE_BILLING])
      );

      expect(result.current).toBe(false);
    });
  });

  describe('useWorkspaceHeaders', () => {
    it('should return headers when workspace context exists', () => {
      const { setCurrentWorkspace } = useWorkspaceStore.getState();
      setCurrentWorkspace(mockWorkspace, WorkspaceRole.OWNER, mockPermissions);

      const { result } = renderHook(() => useWorkspaceHeaders());

      expect(result.current).toEqual({
        'x-workspace-id': 'workspace-1',
        'x-user-role': 'owner',
      });
    });

    it('should return empty object when no workspace context', () => {
      const { result } = renderHook(() => useWorkspaceHeaders());

      expect(result.current).toEqual({});
    });
  });
});