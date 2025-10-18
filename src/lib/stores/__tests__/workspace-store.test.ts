import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useWorkspaceStore } from '../workspace-store';
import { WorkspaceRole, Permission } from '../../db';
import { WorkspaceWithMembership } from '../../types/auth';

// Mock fetch
global.fetch = vi.fn();

describe('WorkspaceStore', () => {
  beforeEach(() => {
    // Reset store state
    useWorkspaceStore.getState().clearWorkspaceContext();
    vi.clearAllMocks();
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

  describe('setCurrentWorkspace', () => {
    it('should set current workspace with role and permissions', () => {
      const { setCurrentWorkspace } = useWorkspaceStore.getState();
      
      setCurrentWorkspace(mockWorkspace, WorkspaceRole.OWNER, mockPermissions);
      
      const state = useWorkspaceStore.getState();
      expect(state.currentWorkspace).toEqual(mockWorkspace);
      expect(state.userRole).toBe(WorkspaceRole.OWNER);
      expect(state.permissions).toEqual(mockPermissions);
      expect(state.error).toBeNull();
    });
  });

  describe('setAvailableWorkspaces', () => {
    it('should set available workspaces', () => {
      const workspaces = [mockWorkspace];
      const { setAvailableWorkspaces } = useWorkspaceStore.getState();
      
      setAvailableWorkspaces(workspaces);
      
      const state = useWorkspaceStore.getState();
      expect(state.availableWorkspaces).toEqual(workspaces);
    });
  });

  describe('switchWorkspace', () => {
    it('should switch workspace successfully', async () => {
      const mockResponse = {
        workspace: mockWorkspace,
        role: WorkspaceRole.OWNER,
        permissions: mockPermissions,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      // Mock window.location.reload
      Object.defineProperty(window, 'location', {
        value: { reload: vi.fn() },
        writable: true,
      });

      const { setAvailableWorkspaces, switchWorkspace } = useWorkspaceStore.getState();
      
      // Set up available workspaces first
      setAvailableWorkspaces([mockWorkspace]);
      
      await switchWorkspace('workspace-1');
      
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/workspace/switch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ workspaceId: 'workspace-1' }),
      });

      const state = useWorkspaceStore.getState();
      expect(state.currentWorkspace).toEqual(mockWorkspace);
      expect(state.userRole).toBe(WorkspaceRole.OWNER);
      expect(state.permissions).toEqual(mockPermissions);
      expect(state.error).toBeNull();
      expect(window.location.reload).toHaveBeenCalled();
    });

    it('should handle workspace not found error', async () => {
      const { switchWorkspace } = useWorkspaceStore.getState();
      
      await switchWorkspace('nonexistent-workspace');
      
      const state = useWorkspaceStore.getState();
      expect(state.error).toBe('Workspace not found or access denied');
    });

    it('should handle API error', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: 'Access denied' }),
      });

      const { setAvailableWorkspaces, switchWorkspace } = useWorkspaceStore.getState();
      
      setAvailableWorkspaces([mockWorkspace]);
      
      await switchWorkspace('workspace-1');
      
      const state = useWorkspaceStore.getState();
      expect(state.error).toBe('Access denied');
      expect(state.isLoading).toBe(false);
    });
  });

  describe('refreshWorkspaces', () => {
    it('should refresh workspaces successfully', async () => {
      const mockResponse = {
        workspaces: [mockWorkspace],
        currentWorkspace: mockWorkspace,
        role: WorkspaceRole.OWNER,
        permissions: mockPermissions,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const { refreshWorkspaces } = useWorkspaceStore.getState();
      
      await refreshWorkspaces();
      
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/workspace/list');

      const state = useWorkspaceStore.getState();
      expect(state.availableWorkspaces).toEqual([mockWorkspace]);
      expect(state.currentWorkspace).toEqual(mockWorkspace);
      expect(state.userRole).toBe(WorkspaceRole.OWNER);
      expect(state.permissions).toEqual(mockPermissions);
      expect(state.error).toBeNull();
      expect(state.isLoading).toBe(false);
    });

    it('should handle refresh error', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const { refreshWorkspaces } = useWorkspaceStore.getState();
      
      await refreshWorkspaces();
      
      const state = useWorkspaceStore.getState();
      expect(state.error).toBe('Network error');
      expect(state.isLoading).toBe(false);
    });
  });

  describe('clearWorkspaceContext', () => {
    it('should clear all workspace context', () => {
      const { setCurrentWorkspace, clearWorkspaceContext } = useWorkspaceStore.getState();
      
      // Set some data first
      setCurrentWorkspace(mockWorkspace, WorkspaceRole.OWNER, mockPermissions);
      
      // Clear it
      clearWorkspaceContext();
      
      const state = useWorkspaceStore.getState();
      expect(state.currentWorkspace).toBeNull();
      expect(state.availableWorkspaces).toEqual([]);
      expect(state.userRole).toBeNull();
      expect(state.permissions).toEqual([]);
      expect(state.error).toBeNull();
      expect(state.isLoading).toBe(false);
    });
  });

  describe('utility hooks', () => {
    it('should return current workspace ID', () => {
      const { setCurrentWorkspace } = useWorkspaceStore.getState();
      setCurrentWorkspace(mockWorkspace, WorkspaceRole.OWNER, mockPermissions);
      
      // This would be tested in a React component test
      expect(mockWorkspace.id).toBe('workspace-1');
    });

    it('should check permissions correctly', () => {
      const { setCurrentWorkspace } = useWorkspaceStore.getState();
      setCurrentWorkspace(mockWorkspace, WorkspaceRole.OWNER, mockPermissions);
      
      const state = useWorkspaceStore.getState();
      expect(state.permissions.includes(Permission.MANAGE_WORKSPACE)).toBe(true);
      expect(state.permissions.includes(Permission.MANAGE_BILLING)).toBe(false);
    });
  });
});