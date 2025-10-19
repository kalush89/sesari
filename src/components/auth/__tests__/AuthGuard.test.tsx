import { render, screen, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { AuthGuard, AuthCheck, withAuthGuard } from '../AuthGuard';
import { useAuth } from '@/lib/hooks/use-auth';
import { WorkspaceRole, Permission } from '@/lib/db';

// Mock Next.js router
jest.mock('next/navigation');
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockPush = jest.fn();

// Mock useAuth hook
jest.mock('@/lib/hooks/use-auth');
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('AuthGuard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      prefetch: jest.fn(),
    } as any);
  });

  it('should render children when user is authenticated with workspace', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { id: 'user-1', email: 'test@example.com', name: 'Test User' },
      session: null,
      workspace: { id: 'workspace-1', name: 'Test Workspace', slug: 'test' },
      workspaceId: 'workspace-1',
      role: WorkspaceRole.ADMIN,
      permissions: [Permission.VIEW_KPI],
      availableWorkspaces: [],
      hasMultipleWorkspaces: false,
      isWorkspaceLoading: false,
      workspaceError: null,
      signIn: jest.fn(),
      signOut: jest.fn(),
      switchWorkspace: jest.fn(),
      refreshWorkspaces: jest.fn(),
    });

    render(
      <AuthGuard>
        <div data-testid="protected-content">Protected Content</div>
      </AuthGuard>
    );

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });

  it('should redirect to sign-in when user is not authenticated', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      session: null,
      workspace: null,
      workspaceId: null,
      role: null,
      permissions: [],
      availableWorkspaces: [],
      hasMultipleWorkspaces: false,
      isWorkspaceLoading: false,
      workspaceError: null,
      signIn: jest.fn(),
      signOut: jest.fn(),
      switchWorkspace: jest.fn(),
      refreshWorkspaces: jest.fn(),
    });

    render(
      <AuthGuard>
        <div data-testid="protected-content">Protected Content</div>
      </AuthGuard>
    );

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/signin');
    });

    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('should redirect to custom URL when specified', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      session: null,
      workspace: null,
      workspaceId: null,
      role: null,
      permissions: [],
      availableWorkspaces: [],
      hasMultipleWorkspaces: false,
      isWorkspaceLoading: false,
      workspaceError: null,
      signIn: jest.fn(),
      signOut: jest.fn(),
      switchWorkspace: jest.fn(),
      refreshWorkspaces: jest.fn(),
    });

    render(
      <AuthGuard redirectTo="/custom-signin">
        <div data-testid="protected-content">Protected Content</div>
      </AuthGuard>
    );

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/custom-signin');
    });
  });

  it('should show error when workspace is required but not available', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { id: 'user-1', email: 'test@example.com', name: 'Test User' },
      session: null,
      workspace: null,
      workspaceId: null,
      role: null,
      permissions: [],
      availableWorkspaces: [],
      hasMultipleWorkspaces: false,
      isWorkspaceLoading: false,
      workspaceError: null,
      signIn: jest.fn(),
      signOut: jest.fn(),
      switchWorkspace: jest.fn(),
      refreshWorkspaces: jest.fn(),
    });

    render(
      <AuthGuard requireWorkspace={true}>
        <div data-testid="protected-content">Protected Content</div>
      </AuthGuard>
    );

    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.getByText('No workspace available. Please contact support.')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('should show error when user role is insufficient', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { id: 'user-1', email: 'test@example.com', name: 'Test User' },
      session: null,
      workspace: { id: 'workspace-1', name: 'Test Workspace', slug: 'test' },
      workspaceId: 'workspace-1',
      role: WorkspaceRole.MEMBER,
      permissions: [Permission.VIEW_KPI],
      availableWorkspaces: [],
      hasMultipleWorkspaces: false,
      isWorkspaceLoading: false,
      workspaceError: null,
      signIn: jest.fn(),
      signOut: jest.fn(),
      switchWorkspace: jest.fn(),
      refreshWorkspaces: jest.fn(),
    });

    render(
      <AuthGuard requiredRole={WorkspaceRole.ADMIN}>
        <div data-testid="protected-content">Protected Content</div>
      </AuthGuard>
    );

    expect(screen.getByText('Insufficient Permissions')).toBeInTheDocument();
    expect(screen.getByText('This action requires admin role or higher. You have member role.')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('should show error when user lacks required permissions', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { id: 'user-1', email: 'test@example.com', name: 'Test User' },
      session: null,
      workspace: { id: 'workspace-1', name: 'Test Workspace', slug: 'test' },
      workspaceId: 'workspace-1',
      role: WorkspaceRole.MEMBER,
      permissions: [Permission.VIEW_KPI],
      availableWorkspaces: [],
      hasMultipleWorkspaces: false,
      isWorkspaceLoading: false,
      workspaceError: null,
      signIn: jest.fn(),
      signOut: jest.fn(),
      switchWorkspace: jest.fn(),
      refreshWorkspaces: jest.fn(),
    });

    render(
      <AuthGuard requiredPermissions={[Permission.CREATE_KPI, Permission.EDIT_KPI]}>
        <div data-testid="protected-content">Protected Content</div>
      </AuthGuard>
    );

    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.getByText(/Missing required permissions:/)).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('should render children when user has any of the required permissions', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { id: 'user-1', email: 'test@example.com', name: 'Test User' },
      session: null,
      workspace: { id: 'workspace-1', name: 'Test Workspace', slug: 'test' },
      workspaceId: 'workspace-1',
      role: WorkspaceRole.MEMBER,
      permissions: [Permission.VIEW_KPI],
      availableWorkspaces: [],
      hasMultipleWorkspaces: false,
      isWorkspaceLoading: false,
      workspaceError: null,
      signIn: jest.fn(),
      signOut: jest.fn(),
      switchWorkspace: jest.fn(),
      refreshWorkspaces: jest.fn(),
    });

    render(
      <AuthGuard requireAnyPermission={[Permission.VIEW_KPI, Permission.CREATE_KPI]}>
        <div data-testid="protected-content">Protected Content</div>
      </AuthGuard>
    );

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });

  it('should show custom fallback when provided', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { id: 'user-1', email: 'test@example.com', name: 'Test User' },
      session: null,
      workspace: null,
      workspaceId: null,
      role: null,
      permissions: [],
      availableWorkspaces: [],
      hasMultipleWorkspaces: false,
      isWorkspaceLoading: false,
      workspaceError: null,
      signIn: jest.fn(),
      signOut: jest.fn(),
      switchWorkspace: jest.fn(),
      refreshWorkspaces: jest.fn(),
    });

    render(
      <AuthGuard 
        requireWorkspace={true}
        errorFallback={<div data-testid="custom-error">Custom Error</div>}
      >
        <div data-testid="protected-content">Protected Content</div>
      </AuthGuard>
    );

    expect(screen.getByTestId('custom-error')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });
});

describe('AuthCheck', () => {
  it('should render children when conditions are met', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { id: 'user-1', email: 'test@example.com', name: 'Test User' },
      session: null,
      workspace: { id: 'workspace-1', name: 'Test Workspace', slug: 'test' },
      workspaceId: 'workspace-1',
      role: WorkspaceRole.ADMIN,
      permissions: [Permission.VIEW_KPI, Permission.CREATE_KPI],
      availableWorkspaces: [],
      hasMultipleWorkspaces: false,
      isWorkspaceLoading: false,
      workspaceError: null,
      signIn: jest.fn(),
      signOut: jest.fn(),
      switchWorkspace: jest.fn(),
      refreshWorkspaces: jest.fn(),
    });

    render(
      <AuthCheck 
        requireAuth={true}
        requireWorkspace={true}
        requiredRole={WorkspaceRole.ADMIN}
        requiredPermissions={[Permission.VIEW_KPI]}
      >
        <div data-testid="conditional-content">Conditional Content</div>
      </AuthCheck>
    );

    expect(screen.getByTestId('conditional-content')).toBeInTheDocument();
  });

  it('should render fallback when conditions are not met', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      session: null,
      workspace: null,
      workspaceId: null,
      role: null,
      permissions: [],
      availableWorkspaces: [],
      hasMultipleWorkspaces: false,
      isWorkspaceLoading: false,
      workspaceError: null,
      signIn: jest.fn(),
      signOut: jest.fn(),
      switchWorkspace: jest.fn(),
      refreshWorkspaces: jest.fn(),
    });

    render(
      <AuthCheck 
        requireAuth={true}
        fallback={<div data-testid="fallback-content">Please sign in</div>}
      >
        <div data-testid="conditional-content">Conditional Content</div>
      </AuthCheck>
    );

    expect(screen.getByTestId('fallback-content')).toBeInTheDocument();
    expect(screen.queryByTestId('conditional-content')).not.toBeInTheDocument();
  });
});

describe('withAuthGuard', () => {
  function TestComponent({ message }: { message: string }) {
    return <div data-testid="test-component">{message}</div>;
  }

  it('should wrap component with auth guard', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { id: 'user-1', email: 'test@example.com', name: 'Test User' },
      session: null,
      workspace: { id: 'workspace-1', name: 'Test Workspace', slug: 'test' },
      workspaceId: 'workspace-1',
      role: WorkspaceRole.ADMIN,
      permissions: [Permission.VIEW_KPI],
      availableWorkspaces: [],
      hasMultipleWorkspaces: false,
      isWorkspaceLoading: false,
      workspaceError: null,
      signIn: jest.fn(),
      signOut: jest.fn(),
      switchWorkspace: jest.fn(),
      refreshWorkspaces: jest.fn(),
    });

    const GuardedComponent = withAuthGuard(TestComponent, {
      requireAuth: true,
      requireWorkspace: true,
    });

    render(<GuardedComponent message="Hello World" />);

    expect(screen.getByTestId('test-component')).toBeInTheDocument();
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  it('should prevent rendering when auth conditions are not met', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      session: null,
      workspace: null,
      workspaceId: null,
      role: null,
      permissions: [],
      availableWorkspaces: [],
      hasMultipleWorkspaces: false,
      isWorkspaceLoading: false,
      workspaceError: null,
      signIn: jest.fn(),
      signOut: jest.fn(),
      switchWorkspace: jest.fn(),
      refreshWorkspaces: jest.fn(),
    });

    const GuardedComponent = withAuthGuard(TestComponent, {
      requireAuth: true,
      redirectTo: '/login',
    });

    render(<GuardedComponent message="Hello World" />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });

    expect(screen.queryByTestId('test-component')).not.toBeInTheDocument();
  });
});