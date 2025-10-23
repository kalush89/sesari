import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SessionProvider } from 'next-auth/react';
import { WorkspaceRole } from '../../db';

// Mock Next.js router
const mockPush = vi.fn();
const mockReplace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  usePathname: () => '/dashboard',
}));

// Mock NextAuth
vi.mock('next-auth/react', () => ({
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
  useSession: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

// Mock workspace store
const mockWorkspaceStore = {
  currentWorkspace: null,
  availableWorkspaces: [],
  userRole: null,
  permissions: [],
  isLoading: false,
  switchWorkspace: vi.fn(),
  refreshWorkspaces: vi.fn(),
};

vi.mock('../../stores/workspace-store', () => ({
  useWorkspaceStore: () => mockWorkspaceStore,
}));

// Import components after mocks
import { AuthGuard } from '../../../components/auth/AuthGuard';
import { SignInForm } from '../../../components/auth/SignInForm';
import { WorkspaceSelectionModal } from '../../../components/auth/WorkspaceSelectionModal';
import { PermissionGate } from '../../../components/auth/PermissionGate';

const { useSession, signIn, signOut } = vi.mocked(await import('next-auth/react'));

describe('Authentication End-to-End Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPush.mockClear();
    mockReplace.mockClear();
  });

  describe('Complete Authentication Flow', () => {
    it('should handle complete sign-in flow for new user', async () => {
      // Step 1: Unauthenticated user visits protected page
      useSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: vi.fn(),
      });

      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      // Should show loading or redirect to sign-in
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();

      // Step 2: User clicks sign-in button
      render(<SignInForm />);
      
      const signInButton = screen.getByRole('button', { name: /sign in with google/i });
      fireEvent.click(signInButton);

      expect(signIn).toHaveBeenCalledWith('google', { callbackUrl: '/dashboard' });

      // Step 3: After successful OAuth, user has session but no workspace
      useSession.mockReturnValue({
        data: {
          user: { id: 'user-1', email: 'newuser@example.com', name: 'New User' },
          expires: '2024-12-31',
        },
        status: 'authenticated',
        update: vi.fn(),
      });

      // Step 4: System creates default workspace and redirects
      mockWorkspaceStore.currentWorkspace = {
        id: 'workspace-1',
        name: "New User's Workspace",
        slug: 'new-users-workspace',
        ownerId: 'user-1',
      };
      mockWorkspaceStore.userRole = WorkspaceRole.OWNER;
      mockWorkspaceStore.permissions = ['manage_workspace', 'create_kpi', 'view_kpi'];

      // Re-render with authenticated session
      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
      });
    });

    it('should handle sign-in flow for existing user with multiple workspaces', async () => {
      // Step 1: User signs in successfully
      useSession.mockReturnValue({
        data: {
          user: { id: 'user-1', email: 'existing@example.com', name: 'Existing User' },
          workspaceId: 'workspace-1',
          role: WorkspaceRole.ADMIN,
          expires: '2024-12-31',
        },
        status: 'authenticated',
        update: vi.fn(),
      });

      // Step 2: User has multiple workspaces available
      mockWorkspaceStore.availableWorkspaces = [
        {
          id: 'workspace-1',
          name: 'Primary Workspace',
          slug: 'primary-workspace',
          ownerId: 'user-1',
        },
        {
          id: 'workspace-2',
          name: 'Secondary Workspace',
          slug: 'secondary-workspace',
          ownerId: 'user-2',
        },
      ];
      mockWorkspaceStore.currentWorkspace = mockWorkspaceStore.availableWorkspaces[0];
      mockWorkspaceStore.userRole = WorkspaceRole.ADMIN;

      // Step 3: User can switch between workspaces
      render(<WorkspaceSelectionModal isOpen={true} onClose={vi.fn()} />);

      const workspace2Button = screen.getByText('Secondary Workspace');
      fireEvent.click(workspace2Button);

      expect(mockWorkspaceStore.switchWorkspace).toHaveBeenCalledWith('workspace-2');
    });

    it('should handle workspace invitation acceptance flow', async () => {
      // Step 1: User clicks invitation link and signs in
      useSession.mockReturnValue({
        data: {
          user: { id: 'user-2', email: 'invited@example.com', name: 'Invited User' },
          expires: '2024-12-31',
        },
        status: 'authenticated',
        update: vi.fn(),
      });

      // Step 2: System processes invitation and adds user to workspace
      mockWorkspaceStore.currentWorkspace = {
        id: 'workspace-1',
        name: 'Invited Workspace',
        slug: 'invited-workspace',
        ownerId: 'user-1',
      };
      mockWorkspaceStore.userRole = WorkspaceRole.MEMBER;
      mockWorkspaceStore.permissions = ['view_kpi', 'view_objective'];

      // Step 3: User can access workspace with limited permissions
      render(
        <PermissionGate permission="view_kpi">
          <div>KPI Dashboard</div>
        </PermissionGate>
      );

      expect(screen.getByText('KPI Dashboard')).toBeInTheDocument();

      // Step 4: User cannot access admin features
      render(
        <PermissionGate permission="manage_workspace">
          <div>Admin Panel</div>
        </PermissionGate>
      );

      expect(screen.queryByText('Admin Panel')).not.toBeInTheDocument();
    });
  });

  describe('Session Management Scenarios', () => {
    it('should handle session expiry gracefully', async () => {
      // Step 1: User has valid session
      useSession.mockReturnValue({
        data: {
          user: { id: 'user-1', email: 'user@example.com', name: 'User' },
          workspaceId: 'workspace-1',
          role: WorkspaceRole.MEMBER,
          expires: '2024-12-31',
        },
        status: 'authenticated',
        update: vi.fn(),
      });

      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();

      // Step 2: Session expires
      useSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: vi.fn(),
      });

      // Re-render to simulate session check
      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      // Should redirect to sign-in
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('should handle sign-out flow', async () => {
      // Step 1: User is authenticated
      useSession.mockReturnValue({
        data: {
          user: { id: 'user-1', email: 'user@example.com', name: 'User' },
          workspaceId: 'workspace-1',
          role: WorkspaceRole.MEMBER,
          expires: '2024-12-31',
        },
        status: 'authenticated',
        update: vi.fn(),
      });

      const { SignOutButton } = await import('../../../components/auth/SignOutButton');
      render(<SignOutButton />);

      // Step 2: User clicks sign-out
      const signOutButton = screen.getByRole('button', { name: /sign out/i });
      fireEvent.click(signOutButton);

      expect(signOut).toHaveBeenCalledWith({ callbackUrl: '/signin' });

      // Step 3: Session is cleared
      useSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: vi.fn(),
      });

      // Workspace store should be reset
      mockWorkspaceStore.currentWorkspace = null;
      mockWorkspaceStore.userRole = null;
      mockWorkspaceStore.permissions = [];
    });
  });

  describe('Error Handling Scenarios', () => {
    it('should handle OAuth errors', async () => {
      // Mock OAuth error
      signIn.mockRejectedValue(new Error('OAuth provider unavailable'));

      render(<SignInForm />);
      
      const signInButton = screen.getByRole('button', { name: /sign in with google/i });
      fireEvent.click(signInButton);

      await waitFor(() => {
        // Should show error message
        expect(screen.getByText(/sign in failed/i)).toBeInTheDocument();
      });
    });

    it('should handle workspace access errors', async () => {
      // User tries to access workspace they don't have access to
      useSession.mockReturnValue({
        data: {
          user: { id: 'user-1', email: 'user@example.com', name: 'User' },
          expires: '2024-12-31',
        },
        status: 'authenticated',
        update: vi.fn(),
      });

      mockWorkspaceStore.currentWorkspace = null;
      mockWorkspaceStore.isLoading = false;

      render(
        <AuthGuard requireWorkspace>
          <div>Workspace Content</div>
        </AuthGuard>
      );

      // Should show workspace selection or error
      expect(screen.queryByText('Workspace Content')).not.toBeInTheDocument();
    });

    it('should handle network errors during authentication', async () => {
      // Mock network error
      useSession.mockReturnValue({
        data: null,
        status: 'loading',
        update: vi.fn(),
      });

      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      // Should show loading state
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
      
      // After timeout, should handle error gracefully
      await waitFor(() => {
        expect(screen.getByTestId('auth-loading')).toBeInTheDocument();
      }, { timeout: 1000 });
    });
  });

  describe('Permission-Based Access Control', () => {
    it('should enforce role-based permissions correctly', async () => {
      useSession.mockReturnValue({
        data: {
          user: { id: 'user-1', email: 'member@example.com', name: 'Member' },
          workspaceId: 'workspace-1',
          role: WorkspaceRole.MEMBER,
          expires: '2024-12-31',
        },
        status: 'authenticated',
        update: vi.fn(),
      });

      mockWorkspaceStore.userRole = WorkspaceRole.MEMBER;
      mockWorkspaceStore.permissions = ['view_kpi', 'view_objective'];

      // Member can view KPIs
      render(
        <PermissionGate permission="view_kpi">
          <div>View KPI</div>
        </PermissionGate>
      );
      expect(screen.getByText('View KPI')).toBeInTheDocument();

      // Member cannot create KPIs
      render(
        <PermissionGate permission="create_kpi">
          <div>Create KPI</div>
        </PermissionGate>
      );
      expect(screen.queryByText('Create KPI')).not.toBeInTheDocument();

      // Member cannot manage workspace
      render(
        <PermissionGate permission="manage_workspace">
          <div>Manage Workspace</div>
        </PermissionGate>
      );
      expect(screen.queryByText('Manage Workspace')).not.toBeInTheDocument();
    });

    it('should handle permission changes dynamically', async () => {
      useSession.mockReturnValue({
        data: {
          user: { id: 'user-1', email: 'user@example.com', name: 'User' },
          workspaceId: 'workspace-1',
          role: WorkspaceRole.MEMBER,
          expires: '2024-12-31',
        },
        status: 'authenticated',
        update: vi.fn(),
      });

      // Initially member role
      mockWorkspaceStore.userRole = WorkspaceRole.MEMBER;
      mockWorkspaceStore.permissions = ['view_kpi'];

      const { rerender } = render(
        <PermissionGate permission="create_kpi">
          <div>Create KPI</div>
        </PermissionGate>
      );

      expect(screen.queryByText('Create KPI')).not.toBeInTheDocument();

      // Role upgraded to admin
      mockWorkspaceStore.userRole = WorkspaceRole.ADMIN;
      mockWorkspaceStore.permissions = ['view_kpi', 'create_kpi', 'edit_kpi'];

      rerender(
        <PermissionGate permission="create_kpi">
          <div>Create KPI</div>
        </PermissionGate>
      );

      expect(screen.getByText('Create KPI')).toBeInTheDocument();
    });
  });
});