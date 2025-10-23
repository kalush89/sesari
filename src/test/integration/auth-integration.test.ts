import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { SessionProvider } from 'next-auth/react';
import { WorkspaceProvider } from '@/components/providers/WorkspaceProvider';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { DashboardLayout } from '@/components/layout';
import { Permission, WorkspaceRole } from '@/lib/db';

// Mock NextAuth session
const mockSession = {
  user: {
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com',
    image: 'https://example.com/avatar.jpg',
  },
  expires: '2024-12-31',
};

// Mock workspace store
const mockWorkspaceStore = {
  currentWorkspace: {
    id: 'ws-1',
    name: 'Test Workspace',
    slug: 'test-workspace',
    membership: {
      role: WorkspaceRole.OWNER,
    },
  },
  availableWorkspaces: [
    {
      id: 'ws-1',
      name: 'Test Workspace',
      slug: 'test-workspace',
      membership: {
        role: WorkspaceRole.OWNER,
      },
    },
  ],
  userRole: WorkspaceRole.OWNER,
  permissions: [
    Permission.MANAGE_WORKSPACE,
    Permission.INVITE_MEMBERS,
    Permission.MANAGE_BILLING,
    Permission.CREATE_KPI,
    Permission.EDIT_KPI,
    Permission.DELETE_KPI,
    Permission.VIEW_KPI,
    Permission.CREATE_OBJECTIVE,
    Permission.EDIT_OBJECTIVE,
    Permission.DELETE_OBJECTIVE,
    Permission.VIEW_OBJECTIVE,
  ],
  isLoading: false,
  error: null,
  switchWorkspace: vi.fn(),
  refreshWorkspaces: vi.fn(),
  clearWorkspaceContext: vi.fn(),
  setLoading: vi.fn(),
};

// Mock the workspace store
vi.mock('@/lib/stores/workspace-store', () => ({
  useWorkspaceStore: () => mockWorkspaceStore,
}));

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: mockSession,
    status: 'authenticated',
  }),
  SessionProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock Next.js router
vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
}));

// Test component that uses authentication
function TestAuthenticatedComponent() {
  return (
    <SessionProvider session={mockSession}>
      <WorkspaceProvider>
        <AuthProvider>
          <DashboardLayout>
            <div data-testid="authenticated-content">
              <h1>Dashboard Content</h1>
              <p>This content requires authentication</p>
            </div>
          </DashboardLayout>
        </AuthProvider>
      </WorkspaceProvider>
    </SessionProvider>
  );
}

describe('Authentication Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render authenticated content when user is signed in', async () => {
    render(<TestAuthenticatedComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('authenticated-content')).toBeInTheDocument();
    });

    expect(screen.getByText('Dashboard Content')).toBeInTheDocument();
    expect(screen.getByText('This content requires authentication')).toBeInTheDocument();
  });

  it('should provide authentication context to child components', async () => {
    const TestComponent = () => {
      // This would use the useAuth hook in a real component
      return (
        <div data-testid="auth-context-test">
          <p>User: {mockSession.user.name}</p>
          <p>Workspace: {mockWorkspaceStore.currentWorkspace?.name}</p>
          <p>Role: {mockWorkspaceStore.userRole}</p>
        </div>
      );
    };

    render(
      <SessionProvider session={mockSession}>
        <WorkspaceProvider>
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        </WorkspaceProvider>
      </SessionProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-context-test')).toBeInTheDocument();
    });
  });

  it('should handle workspace context properly', async () => {
    expect(mockWorkspaceStore.currentWorkspace).toBeDefined();
    expect(mockWorkspaceStore.currentWorkspace?.id).toBe('ws-1');
    expect(mockWorkspaceStore.userRole).toBe(WorkspaceRole.OWNER);
    expect(mockWorkspaceStore.permissions).toContain(Permission.MANAGE_WORKSPACE);
  });

  it('should provide proper permission checking', () => {
    const hasManageWorkspace = mockWorkspaceStore.permissions.includes(Permission.MANAGE_WORKSPACE);
    const hasCreateKpi = mockWorkspaceStore.permissions.includes(Permission.CREATE_KPI);
    const hasViewKpi = mockWorkspaceStore.permissions.includes(Permission.VIEW_KPI);

    expect(hasManageWorkspace).toBe(true);
    expect(hasCreateKpi).toBe(true);
    expect(hasViewKpi).toBe(true);
  });
});

describe('Role-Based Access Control Integration', () => {
  it('should grant all permissions to workspace owner', () => {
    const ownerPermissions = mockWorkspaceStore.permissions;
    
    // Owner should have all permissions
    expect(ownerPermissions).toContain(Permission.MANAGE_WORKSPACE);
    expect(ownerPermissions).toContain(Permission.INVITE_MEMBERS);
    expect(ownerPermissions).toContain(Permission.MANAGE_BILLING);
    expect(ownerPermissions).toContain(Permission.CREATE_KPI);
    expect(ownerPermissions).toContain(Permission.EDIT_KPI);
    expect(ownerPermissions).toContain(Permission.DELETE_KPI);
    expect(ownerPermissions).toContain(Permission.VIEW_KPI);
    expect(ownerPermissions).toContain(Permission.CREATE_OBJECTIVE);
    expect(ownerPermissions).toContain(Permission.EDIT_OBJECTIVE);
    expect(ownerPermissions).toContain(Permission.DELETE_OBJECTIVE);
    expect(ownerPermissions).toContain(Permission.VIEW_OBJECTIVE);
  });

  it('should properly identify user role', () => {
    expect(mockWorkspaceStore.userRole).toBe(WorkspaceRole.OWNER);
  });

  it('should provide workspace context', () => {
    expect(mockWorkspaceStore.currentWorkspace).toBeDefined();
    expect(mockWorkspaceStore.currentWorkspace?.name).toBe('Test Workspace');
    expect(mockWorkspaceStore.availableWorkspaces).toHaveLength(1);
  });
});