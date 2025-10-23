import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AppLayout, DashboardLayout, AuthLayout } from '../AppLayout';

// Mock the auth hook
vi.mock('@/lib/hooks/use-auth', () => ({
  useAuth: vi.fn(() => ({
    isLoading: false,
    isAuthenticated: true,
    user: { id: '1', name: 'Test User', email: 'test@example.com' },
    workspace: { id: 'ws1', name: 'Test Workspace', slug: 'test' },
    role: 'owner',
    permissions: [],
  })),
}));

// Mock the AuthGuard component
vi.mock('@/components/auth/AuthGuard', () => ({
  AuthGuard: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock the layout components
vi.mock('../Sidebar', () => ({
  Sidebar: () => <div data-testid="sidebar">Sidebar</div>,
}));

vi.mock('../TopNavigation', () => ({
  TopNavigation: () => <div data-testid="top-nav">TopNavigation</div>,
}));

describe('AppLayout', () => {
  it('renders children with default authenticated layout', () => {
    render(
      <AppLayout>
        <div data-testid="content">Test Content</div>
      </AppLayout>
    );

    expect(screen.getByTestId('content')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('top-nav')).toBeInTheDocument();
  });

  it('renders without sidebar and top nav when disabled', () => {
    render(
      <AppLayout showSidebar={false} showTopNav={false}>
        <div data-testid="content">Test Content</div>
      </AppLayout>
    );

    expect(screen.getByTestId('content')).toBeInTheDocument();
    expect(screen.queryByTestId('sidebar')).not.toBeInTheDocument();
    expect(screen.queryByTestId('top-nav')).not.toBeInTheDocument();
  });

  it('renders unauthenticated layout without guards', () => {
    render(
      <AppLayout requireAuth={false} requireWorkspace={false}>
        <div data-testid="content">Test Content</div>
      </AppLayout>
    );

    expect(screen.getByTestId('content')).toBeInTheDocument();
  });
});

describe('DashboardLayout', () => {
  it('renders with full authenticated layout', () => {
    render(
      <DashboardLayout>
        <div data-testid="dashboard-content">Dashboard</div>
      </DashboardLayout>
    );

    expect(screen.getByTestId('dashboard-content')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('top-nav')).toBeInTheDocument();
  });
});

describe('AuthLayout', () => {
  it('renders centered auth content without navigation', () => {
    render(
      <AuthLayout>
        <div data-testid="auth-content">Sign In</div>
      </AuthLayout>
    );

    expect(screen.getByTestId('auth-content')).toBeInTheDocument();
    expect(screen.queryByTestId('sidebar')).not.toBeInTheDocument();
    expect(screen.queryByTestId('top-nav')).not.toBeInTheDocument();
  });
});