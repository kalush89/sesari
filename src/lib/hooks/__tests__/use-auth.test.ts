import { renderHook, act } from '@testing-library/react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useAuth, useAuthReady, useAuthHeaders, useHasPermission } from '../use-auth';
import { useWorkspaceStore } from '../../stores/workspace-store';
import { WorkspaceRole, Permission } from '../../db';

// Mock NextAuth
jest.mock('next-auth/react');
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;
const mockSignIn = signIn as jest.MockedFunction<typeof signIn>;
const mockSignOut = signOut as jest.MockedFunction<typeof signOut>;

// Mock workspace store
jest.mock('../../stores/workspace-store');
const mockUseWorkspaceStore = useWorkspaceStore as jest.MockedFunction<typeof useWorkspaceStore>;

describe('useAuth', () => {
  const mockWorkspaceStore = {
    currentWorkspace: null,
    availableWorkspaces: [],
    userRole: null,
    permissions: [],
    isLoading: false,
    error: null,
    switchWorkspace: jest.fn(),
    refreshWorkspaces: jest.fn(),
    clearWorkspaceContext: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseWorkspaceStore.mockReturnValue(mockWorkspaceStore);
  });

  describe('when user is not authenticated', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: jest.fn(),
      });
    });

    it('should return unauthenticated state', () => {
      const { result } = renderHook(() => useAuth());

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.user).toBe(null);
      expect(result.current.session).toBe(null);
      expect(result.current.workspace).toBe(null);
      expect(result.current.workspaceId).toBe(null);
      expect(result.current.role).toBe(null);
      expect(result.current.permissions).toEqual([]);
    });

    it('should provide sign in function', async () => {
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn('google', { callbackUrl: '/test' });
      });

      expect(mockSignIn).toHaveBeenCalledWith('google', {
        callbackUrl: '/test',
      });
    });
  });

  describe('when session is loading', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading',
        update: jest.fn(),
      });
    });

    it('should return loading state', () => {
      const { result } = renderHook(() => useAuth());

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(true);
    });
  });

  describe('when user is authenticated', () => {
    const mockSession = {
      user: {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        image: 'https://example.com/avatar.jpg',
      },
      expires: '2024-12-31',
    };

    const mockWorkspace = {
      id: 'workspace-1',
      name: 'Test Workspace',
      slug: 'test-workspace',
      membership: {
        role: WorkspaceRole.ADMIN,
      },
    };

    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: mockSession,
        status: 'authenticated',
        update: jest.fn(),
      });

      mockUseWorkspaceStore.mockReturnValue({
        ...mockWorkspaceStore,
        currentWorkspace: mockWorkspace,
        availableWorkspaces: [mockWorkspace],
        userRole: WorkspaceRole.ADMIN,
        permissions: [Permission.VIEW_KPI, Permission.CREATE_KPI],
      });
    });

    it('should return authenticated state with workspace context', () => {
      const { result } = renderHook(() => useAuth());

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.user).toEqual({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        image: 'https://example.com/avatar.jpg',
      });
      expect(result.current.workspace).toEqual({
        id: 'workspace-1',
        name: 'Test Workspace',
        slug: 'test-workspace',
      });
      expect(result.current.workspaceId).toBe('workspace-1');
      expect(result.current.role).toBe(WorkspaceRole.ADMIN);
      expect(result.current.permissions).toEqual([Permission.VIEW_KPI, Permission.CREATE_KPI]);
    });

    it('should provide available workspaces', () => {
      const { result } = renderHook(() => useAuth());

      expect(result.current.availableWorkspaces).toEqual([{
        id: 'workspace-1',
        name: 'Test Workspace',
        slug: 'test-workspace',
        role: WorkspaceRole.ADMIN,
      }]);
      expect(result.current.hasMultipleWorkspaces).toBe(false);
    });

    it('should provide sign out function with workspace cleanup', async () => {
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signOut({ callbackUrl: '/goodbye' });
      });

      expect(mockWorkspaceStore.clearWorkspaceContext).toHaveBeenCalled();
      expect(mockSignOut).toHaveBeenCalledWith({
        callbackUrl: '/goodbye',
      });
    });

    it('should provide workspace switching function', async () => {
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.switchWorkspace('workspace-2');
      });

      expect(mockWorkspaceStore.switchWorkspace).toHaveBeenCalledWith('workspace-2');
    });
  });

  describe('when workspace is loading', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: 'user-1', email: 'test@example.com', name: 'Test User' },
          expires: '2024-12-31',
        },
        status: 'authenticated',
        update: jest.fn(),
      });

      mockUseWorkspaceStore.mockReturnValue({
        ...mockWorkspaceStore,
        isLoading: true,
      });
    });

    it('should return workspace loading state', () => {
      const { result } = renderHook(() => useAuth());

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isWorkspaceLoading).toBe(true);
    });
  });
});

describe('useAuthReady', () => {
  beforeEach(() => {
    mockUseWorkspaceStore.mockReturnValue({
      currentWorkspace: {
        id: 'workspace-1',
        name: 'Test Workspace',
        slug: 'test-workspace',
      },
      availableWorkspaces: [],
      userRole: WorkspaceRole.ADMIN,
      permissions: [],
      isLoading: false,
      error: null,
      switchWorkspace: jest.fn(),
      refreshWorkspaces: jest.fn(),
      clearWorkspaceContext: jest.fn(),
    });
  });

  it('should return ready state when authenticated with workspace', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { id: 'user-1', email: 'test@example.com', name: 'Test User' },
        expires: '2024-12-31',
      },
      status: 'authenticated',
      update: jest.fn(),
    });

    const { result } = renderHook(() => useAuthReady());

    expect(result.current.isReady).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.hasWorkspace).toBe(true);
  });

  it('should return not ready when workspace is loading', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { id: 'user-1', email: 'test@example.com', name: 'Test User' },
        expires: '2024-12-31',
      },
      status: 'authenticated',
      update: jest.fn(),
    });

    mockUseWorkspaceStore.mockReturnValue({
      currentWorkspace: null,
      availableWorkspaces: [],
      userRole: null,
      permissions: [],
      isLoading: true,
      error: null,
      switchWorkspace: jest.fn(),
      refreshWorkspaces: jest.fn(),
      clearWorkspaceContext: jest.fn(),
    });

    const { result } = renderHook(() => useAuthReady());

    expect(result.current.isReady).toBe(false);
    expect(result.current.isLoading).toBe(true);
  });
});

describe('useAuthHeaders', () => {
  it('should return headers when authenticated with workspace', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { id: 'user-1', email: 'test@example.com', name: 'Test User' },
        expires: '2024-12-31',
      },
      status: 'authenticated',
      update: jest.fn(),
    });

    mockUseWorkspaceStore.mockReturnValue({
      currentWorkspace: { id: 'workspace-1', name: 'Test', slug: 'test' },
      availableWorkspaces: [],
      userRole: WorkspaceRole.ADMIN,
      permissions: [],
      isLoading: false,
      error: null,
      switchWorkspace: jest.fn(),
      refreshWorkspaces: jest.fn(),
      clearWorkspaceContext: jest.fn(),
    });

    const { result } = renderHook(() => useAuthHeaders());

    expect(result.current).toEqual({
      'x-workspace-id': 'workspace-1',
      'x-user-role': WorkspaceRole.ADMIN,
    });
  });

  it('should return empty headers when not authenticated', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
      update: jest.fn(),
    });

    const { result } = renderHook(() => useAuthHeaders());

    expect(result.current).toEqual({});
  });
});

describe('useHasPermission', () => {
  it('should return true when user has permission', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { id: 'user-1', email: 'test@example.com', name: 'Test User' },
        expires: '2024-12-31',
      },
      status: 'authenticated',
      update: jest.fn(),
    });

    mockUseWorkspaceStore.mockReturnValue({
      currentWorkspace: { id: 'workspace-1', name: 'Test', slug: 'test' },
      availableWorkspaces: [],
      userRole: WorkspaceRole.ADMIN,
      permissions: [Permission.VIEW_KPI, Permission.CREATE_KPI],
      isLoading: false,
      error: null,
      switchWorkspace: jest.fn(),
      refreshWorkspaces: jest.fn(),
      clearWorkspaceContext: jest.fn(),
    });

    const { result } = renderHook(() => useHasPermission(Permission.VIEW_KPI));

    expect(result.current).toBe(true);
  });

  it('should return false when user does not have permission', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { id: 'user-1', email: 'test@example.com', name: 'Test User' },
        expires: '2024-12-31',
      },
      status: 'authenticated',
      update: jest.fn(),
    });

    mockUseWorkspaceStore.mockReturnValue({
      currentWorkspace: { id: 'workspace-1', name: 'Test', slug: 'test' },
      availableWorkspaces: [],
      userRole: WorkspaceRole.MEMBER,
      permissions: [Permission.VIEW_KPI],
      isLoading: false,
      error: null,
      switchWorkspace: jest.fn(),
      refreshWorkspaces: jest.fn(),
      clearWorkspaceContext: jest.fn(),
    });

    const { result } = renderHook(() => useHasPermission(Permission.CREATE_KPI));

    expect(result.current).toBe(false);
  });

  it('should return false when not authenticated', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
      update: jest.fn(),
    });

    const { result } = renderHook(() => useHasPermission(Permission.VIEW_KPI));

    expect(result.current).toBe(false);
  });
});