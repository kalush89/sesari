import { render, screen, waitFor } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import { AuthProvider, useAuthContext, useAuthContextReady } from '../AuthProvider';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import { WorkspaceRole, Permission } from '@/lib/db';

// Mock NextAuth
jest.mock('next-auth/react');
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;

// Mock workspace store
jest.mock('@/lib/stores/workspace-store');
const mockUseWorkspaceStore = useWorkspaceStore as jest.MockedFunction<typeof useWorkspaceStore>;

// Test component that uses the auth context
function TestComponent() {
  const { isAuthenticated, user, workspace, role } = useAuthContext();
  
  return (
    <div>
      <div data-testid="authenticated">{isAuthenticated.toString()}</div>
      <div data-testid="user">{user?.email || 'none'}</div>
      <div data-testid="workspace">{workspace?.name || 'none'}</div>
      <div data-testid="role">{role || 'none'}</div>
    </div>
  );
}

// Test component that uses auth ready hook
function TestReadyComponent() {
  const { isReady, isLoading, hasWorkspace } = useAuthContextReady();
  
  return (
    <div>
      <div data-testid="ready">{isReady.toString()}</div>
      <div data-testid="loading">{isLoading.toString()}</div>
      <div data-testid="has-workspace">{hasWorkspace.toString()}</div>
    </div>
  );
}

describe('AuthProvider', () => {
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
    setLoading: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseWorkspaceStore.mockReturnValue(mockWorkspaceStore);
  });

  it('should provide unauthenticated context when user is not signed in', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
      update: jest.fn(),
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
    expect(screen.getByTestId('user')).toHaveTextContent('none');
    expect(screen.getByTestId('workspace')).toHaveTextContent('none');
    expect(screen.getByTestId('role')).toHaveTextContent('none');
  });

  it('should provide authenticated context with workspace when user is signed in', async () => {
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

    mockUseSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated',
      update: jest.fn(),
    });

    mockUseWorkspaceStore.mockReturnValue({
      ...mockWorkspaceStore,
      currentWorkspace: mockWorkspace,
      userRole: WorkspaceRole.ADMIN,
      permissions: [Permission.VIEW_KPI, Permission.CREATE_KPI],
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
      expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
      expect(screen.getByTestId('workspace')).toHaveTextContent('Test Workspace');
      expect(screen.getByTestId('role')).toHaveTextContent('admin');
    });
  });

  it('should initialize workspace context when user is authenticated', async () => {
    const mockRefreshWorkspaces = jest.fn().mockResolvedValue(undefined);
    const mockSetLoading = jest.fn();

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
      refreshWorkspaces: mockRefreshWorkspaces,
      setLoading: mockSetLoading,
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(mockSetLoading).toHaveBeenCalledWith(true);
      expect(mockRefreshWorkspaces).toHaveBeenCalled();
      expect(mockSetLoading).toHaveBeenCalledWith(false);
    });
  });

  it('should clear workspace context when user signs out', async () => {
    const mockClearWorkspaceContext = jest.fn();

    // Start with authenticated session
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
      clearWorkspaceContext: mockClearWorkspaceContext,
    });

    const { rerender } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Change to unauthenticated
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
      update: jest.fn(),
    });

    rerender(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(mockClearWorkspaceContext).toHaveBeenCalled();
    });
  });

  it('should handle workspace initialization errors gracefully', async () => {
    const mockRefreshWorkspaces = jest.fn().mockRejectedValue(new Error('Network error'));
    const mockSetLoading = jest.fn();
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

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
      refreshWorkspaces: mockRefreshWorkspaces,
      setLoading: mockSetLoading,
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to initialize workspace context:',
        expect.any(Error)
      );
      expect(mockSetLoading).toHaveBeenCalledWith(false);
    });

    consoleSpy.mockRestore();
  });
});

describe('useAuthContext', () => {
  it('should throw error when used outside AuthProvider', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useAuthContext must be used within an AuthProvider');

    consoleSpy.mockRestore();
  });
});

describe('useAuthContextReady', () => {
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
      setLoading: jest.fn(),
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

    render(
      <AuthProvider>
        <TestReadyComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('ready')).toHaveTextContent('true');
    expect(screen.getByTestId('loading')).toHaveTextContent('false');
    expect(screen.getByTestId('has-workspace')).toHaveTextContent('true');
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
      setLoading: jest.fn(),
    });

    render(
      <AuthProvider>
        <TestReadyComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('ready')).toHaveTextContent('false');
    expect(screen.getByTestId('loading')).toHaveTextContent('true');
    expect(screen.getByTestId('has-workspace')).toHaveTextContent('false');
  });

  it('should return not ready when session is loading', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'loading',
      update: jest.fn(),
    });

    render(
      <AuthProvider>
        <TestReadyComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('ready')).toHaveTextContent('false');
    expect(screen.getByTestId('loading')).toHaveTextContent('true');
  });
});