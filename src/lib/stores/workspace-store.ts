import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { WorkspaceRole, Permission } from '../db';
import { WorkspaceWithMembership } from '../types/auth';

/**
 * Workspace context state interface
 */
export interface WorkspaceContextState {
  // Current workspace data
  currentWorkspace: WorkspaceWithMembership | null;
  availableWorkspaces: WorkspaceWithMembership[];
  userRole: WorkspaceRole | null;
  permissions: Permission[];
  
  // Loading and error states
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setCurrentWorkspace: (workspace: WorkspaceWithMembership, role: WorkspaceRole, permissions: Permission[]) => void;
  setAvailableWorkspaces: (workspaces: WorkspaceWithMembership[]) => void;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  refreshWorkspaces: () => Promise<void>;
  clearWorkspaceContext: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

/**
 * Workspace context store with persistence
 * Manages current workspace selection and switching functionality
 */
export const useWorkspaceStore = create<WorkspaceContextState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentWorkspace: null,
      availableWorkspaces: [],
      userRole: null,
      permissions: [],
      isLoading: false,
      error: null,

      // Set current workspace with role and permissions
      setCurrentWorkspace: (workspace, role, permissions) => {
        set({
          currentWorkspace: workspace,
          userRole: role,
          permissions,
          error: null,
        });
      },

      // Set available workspaces
      setAvailableWorkspaces: (workspaces) => {
        set({ availableWorkspaces: workspaces });
      },

      // Switch to a different workspace
      switchWorkspace: async (workspaceId: string) => {
        const { availableWorkspaces } = get();
        const targetWorkspace = availableWorkspaces.find(w => w.id === workspaceId);
        
        if (!targetWorkspace) {
          set({ error: 'Workspace not found or access denied' });
          return;
        }

        set({ isLoading: true, error: null });

        try {
          // Call API to switch workspace context
          const response = await fetch('/api/auth/workspace/switch', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ workspaceId }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to switch workspace');
          }

          const { workspace, role, permissions } = await response.json();
          
          set({
            currentWorkspace: workspace,
            userRole: role,
            permissions,
            isLoading: false,
            error: null,
          });

          // Trigger a page reload to update server-side session
          window.location.reload();
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to switch workspace',
          });
        }
      },

      // Refresh available workspaces
      refreshWorkspaces: async () => {
        set({ isLoading: true, error: null });

        try {
          const response = await fetch('/api/auth/workspace/list');
          
          if (!response.ok) {
            throw new Error('Failed to fetch workspaces');
          }

          const { workspaces, currentWorkspace, role, permissions } = await response.json();
          
          set({
            availableWorkspaces: workspaces,
            currentWorkspace,
            userRole: role,
            permissions,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to refresh workspaces',
          });
        }
      },

      // Clear workspace context (on sign out)
      clearWorkspaceContext: () => {
        set({
          currentWorkspace: null,
          availableWorkspaces: [],
          userRole: null,
          permissions: [],
          error: null,
          isLoading: false,
        });
      },

      // Set loading state
      setLoading: (loading) => {
        set({ isLoading: loading });
      },

      // Set error state
      setError: (error) => {
        set({ error });
      },
    }),
    {
      name: 'workspace-context',
      storage: createJSONStorage(() => localStorage),
      // Only persist essential data, not loading states
      partialize: (state) => ({
        currentWorkspace: state.currentWorkspace,
        availableWorkspaces: state.availableWorkspaces,
        userRole: state.userRole,
        permissions: state.permissions,
      }),
    }
  )
);

/**
 * Hook to get current workspace ID
 */
export const useCurrentWorkspaceId = () => {
  return useWorkspaceStore((state) => state.currentWorkspace?.id || null);
};

/**
 * Hook to get current user role
 */
export const useCurrentUserRole = () => {
  return useWorkspaceStore((state) => state.userRole);
};

/**
 * Hook to get current user permissions
 */
export const useCurrentPermissions = () => {
  return useWorkspaceStore((state) => state.permissions);
};

/**
 * Hook to check if user has a specific permission
 */
export const useHasPermission = (permission: Permission) => {
  return useWorkspaceStore((state) => 
    state.permissions.includes(permission)
  );
};