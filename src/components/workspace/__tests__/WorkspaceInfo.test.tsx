import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WorkspaceInfo } from '../WorkspaceInfo';
import { useWorkspaceStore } from '../../../lib/stores/workspace-store';
import { WorkspaceRole, Permission } from '../../../lib/db';
import { WorkspaceWithMembership } from '../../../lib/types/auth';

// Mock the workspace selector component
vi.mock('../WorkspaceSelector', () => ({
  WorkspaceSelector: ({ className }: { className?: string }) => (
    <div data-testid="workspace-selector" className={className}>
      Workspace Selector
    </div>
  ),
}));

describe('WorkspaceInfo', () => {
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

  it('should show loading state', () => {
    const { setLoading } = useWorkspaceStore.getState();
    setLoading(true);

    render(<WorkspaceInfo />);

    expect(screen.getByRole('generic')).toHaveClass('animate-pulse');
  });

  it('should show error state', () => {
    const { setError } = useWorkspaceStore.getState();
    setError('Failed to load workspace');

    render(<WorkspaceInfo />);

    expect(screen.getByText('Failed to load workspace')).toBeInTheDocument();
    expect(screen.getByText('Failed to load workspace').closest('div')).toHaveClass('bg-red-50');
  });

  it('should show no workspace state', () => {
    render(<WorkspaceInfo />);

    expect(screen.getByText('No workspace selected')).toBeInTheDocument();
  });

  it('should display workspace information', () => {
    const { setCurrentWorkspace, setAvailableWorkspaces } = useWorkspaceStore.getState();
    setCurrentWorkspace(mockWorkspace, WorkspaceRole.OWNER, mockPermissions);
    setAvailableWorkspaces([mockWorkspace]);

    render(<WorkspaceInfo />);

    expect(screen.getByText('Workspace Context')).toBeInTheDocument();
    expect(screen.getByText('Test Workspace')).toBeInTheDocument();
    expect(screen.getByText('owner')).toBeInTheDocument();
    expect(screen.getByText('workspace-1')).toBeInTheDocument();
    
    // Check permissions are displayed
    expect(screen.getByText('manage workspace')).toBeInTheDocument();
    expect(screen.getByText('view kpi')).toBeInTheDocument();
    expect(screen.getByText('create kpi')).toBeInTheDocument();
  });

  it('should show workspace selector when multiple workspaces available', () => {
    const secondWorkspace = { ...mockWorkspace, id: 'workspace-2', name: 'Second Workspace' };
    const { setCurrentWorkspace, setAvailableWorkspaces } = useWorkspaceStore.getState();
    
    setCurrentWorkspace(mockWorkspace, WorkspaceRole.OWNER, mockPermissions);
    setAvailableWorkspaces([mockWorkspace, secondWorkspace]);

    render(<WorkspaceInfo />);

    expect(screen.getByTestId('workspace-selector')).toBeInTheDocument();
  });

  it('should not show workspace selector when only one workspace', () => {
    const { setCurrentWorkspace, setAvailableWorkspaces } = useWorkspaceStore.getState();
    setCurrentWorkspace(mockWorkspace, WorkspaceRole.OWNER, mockPermissions);
    setAvailableWorkspaces([mockWorkspace]);

    render(<WorkspaceInfo />);

    expect(screen.queryByTestId('workspace-selector')).not.toBeInTheDocument();
  });
});