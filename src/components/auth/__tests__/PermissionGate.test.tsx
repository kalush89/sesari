import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { 
  PermissionGate, 
  MultiPermissionGate, 
  RoleGate, 
  MinimumRoleGate,
  OwnerOnlyGate,
  AdminGate,
  ConditionalRender
} from '../PermissionGate';
import { WorkspaceRole, Permission } from '@/lib/db';

// Mock the permission hooks
vi.mock('@/lib/auth/permission-hooks', () => ({
  usePermission: vi.fn(),
  useAnyPermission: vi.fn(),
  useAllPermissions: vi.fn(),
  useHasRole: vi.fn(),
  useUserRole: vi.fn()
}));

const mockUsePermission = vi.mocked(await import('@/lib/auth/permission-hooks')).usePermission;
const mockUseAnyPermission = vi.mocked(await import('@/lib/auth/permission-hooks')).useAnyPermission;
const mockUseAllPermissions = vi.mocked(await import('@/lib/auth/permission-hooks')).useAllPermissions;
const mockUseHasRole = vi.mocked(await import('@/lib/auth/permission-hooks')).useHasRole;
const mockUseUserRole = vi.mocked(await import('@/lib/auth/permission-hooks')).useUserRole;

describe('PermissionGate Components', () => {
  describe('PermissionGate', () => {
    it('should render children when user has permission', () => {
      mockUsePermission.mockReturnValue(true);

      render(
        <PermissionGate permission={Permission.CREATE_KPI}>
          <div>Protected content</div>
        </PermissionGate>
      );

      expect(screen.getByText('Protected content')).toBeInTheDocument();
    });

    it('should render fallback when user lacks permission', () => {
      mockUsePermission.mockReturnValue(false);

      render(
        <PermissionGate 
          permission={Permission.CREATE_KPI}
          fallback={<div>Access denied</div>}
        >
          <div>Protected content</div>
        </PermissionGate>
      );

      expect(screen.getByText('Access denied')).toBeInTheDocument();
      expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
    });

    it('should render nothing when user lacks permission and no fallback', () => {
      mockUsePermission.mockReturnValue(false);

      render(
        <PermissionGate permission={Permission.CREATE_KPI}>
          <div>Protected content</div>
        </PermissionGate>
      );

      expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
    });
  });

  describe('MultiPermissionGate', () => {
    it('should render children when user has any permission (requireAll=false)', () => {
      mockUseAnyPermission.mockReturnValue(true);

      render(
        <MultiPermissionGate 
          permissions={[Permission.CREATE_KPI, Permission.VIEW_KPI]}
          requireAll={false}
        >
          <div>Protected content</div>
        </MultiPermissionGate>
      );

      expect(screen.getByText('Protected content')).toBeInTheDocument();
    });

    it('should render children when user has all permissions (requireAll=true)', () => {
      mockUseAllPermissions.mockReturnValue(true);

      render(
        <MultiPermissionGate 
          permissions={[Permission.CREATE_KPI, Permission.VIEW_KPI]}
          requireAll={true}
        >
          <div>Protected content</div>
        </MultiPermissionGate>
      );

      expect(screen.getByText('Protected content')).toBeInTheDocument();
    });

    it('should render fallback when requirements not met', () => {
      mockUseAllPermissions.mockReturnValue(false);

      render(
        <MultiPermissionGate 
          permissions={[Permission.CREATE_KPI, Permission.VIEW_KPI]}
          requireAll={true}
          fallback={<div>Access denied</div>}
        >
          <div>Protected content</div>
        </MultiPermissionGate>
      );

      expect(screen.getByText('Access denied')).toBeInTheDocument();
      expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
    });
  });

  describe('RoleGate', () => {
    it('should render children when user has required role', () => {
      mockUseHasRole.mockReturnValue(true);

      render(
        <RoleGate role={WorkspaceRole.ADMIN}>
          <div>Admin content</div>
        </RoleGate>
      );

      expect(screen.getByText('Admin content')).toBeInTheDocument();
    });

    it('should render fallback when user lacks required role', () => {
      mockUseHasRole.mockReturnValue(false);

      render(
        <RoleGate 
          role={WorkspaceRole.ADMIN}
          fallback={<div>Not admin</div>}
        >
          <div>Admin content</div>
        </RoleGate>
      );

      expect(screen.getByText('Not admin')).toBeInTheDocument();
      expect(screen.queryByText('Admin content')).not.toBeInTheDocument();
    });
  });

  describe('MinimumRoleGate', () => {
    it('should render children when user meets minimum role requirement', () => {
      mockUseUserRole.mockReturnValue(WorkspaceRole.OWNER);

      render(
        <MinimumRoleGate minimumRole={WorkspaceRole.ADMIN}>
          <div>Admin+ content</div>
        </MinimumRoleGate>
      );

      expect(screen.getByText('Admin+ content')).toBeInTheDocument();
    });

    it('should render fallback when user below minimum role', () => {
      mockUseUserRole.mockReturnValue(WorkspaceRole.MEMBER);

      render(
        <MinimumRoleGate 
          minimumRole={WorkspaceRole.ADMIN}
          fallback={<div>Insufficient role</div>}
        >
          <div>Admin+ content</div>
        </MinimumRoleGate>
      );

      expect(screen.getByText('Insufficient role')).toBeInTheDocument();
      expect(screen.queryByText('Admin+ content')).not.toBeInTheDocument();
    });

    it('should render fallback when no current role', () => {
      mockUseUserRole.mockReturnValue(null);

      render(
        <MinimumRoleGate 
          minimumRole={WorkspaceRole.MEMBER}
          fallback={<div>No role</div>}
        >
          <div>Member+ content</div>
        </MinimumRoleGate>
      );

      expect(screen.getByText('No role')).toBeInTheDocument();
      expect(screen.queryByText('Member+ content')).not.toBeInTheDocument();
    });
  });

  describe('OwnerOnlyGate', () => {
    it('should render children when user is owner', () => {
      mockUseHasRole.mockReturnValue(true);

      render(
        <OwnerOnlyGate>
          <div>Owner content</div>
        </OwnerOnlyGate>
      );

      expect(screen.getByText('Owner content')).toBeInTheDocument();
    });

    it('should render fallback when user is not owner', () => {
      mockUseHasRole.mockReturnValue(false);

      render(
        <OwnerOnlyGate fallback={<div>Not owner</div>}>
          <div>Owner content</div>
        </OwnerOnlyGate>
      );

      expect(screen.getByText('Not owner')).toBeInTheDocument();
      expect(screen.queryByText('Owner content')).not.toBeInTheDocument();
    });
  });

  describe('AdminGate', () => {
    it('should render children when user is admin or higher', () => {
      mockUseUserRole.mockReturnValue(WorkspaceRole.ADMIN);

      render(
        <AdminGate>
          <div>Admin content</div>
        </AdminGate>
      );

      expect(screen.getByText('Admin content')).toBeInTheDocument();
    });
  });

  describe('ConditionalRender', () => {
    it('should render allowed content when permission check passes', () => {
      mockUsePermission.mockReturnValue(true);

      render(
        <ConditionalRender permission={Permission.CREATE_KPI}>
          {{
            allowed: <div>Can create KPI</div>,
            denied: <div>Cannot create KPI</div>
          }}
        </ConditionalRender>
      );

      expect(screen.getByText('Can create KPI')).toBeInTheDocument();
      expect(screen.queryByText('Cannot create KPI')).not.toBeInTheDocument();
    });

    it('should render denied content when permission check fails', () => {
      mockUsePermission.mockReturnValue(false);

      render(
        <ConditionalRender permission={Permission.CREATE_KPI}>
          {{
            allowed: <div>Can create KPI</div>,
            denied: <div>Cannot create KPI</div>
          }}
        </ConditionalRender>
      );

      expect(screen.getByText('Cannot create KPI')).toBeInTheDocument();
      expect(screen.queryByText('Can create KPI')).not.toBeInTheDocument();
    });

    it('should render allowed content when role check passes', () => {
      mockUseHasRole.mockReturnValue(true);

      render(
        <ConditionalRender role={WorkspaceRole.OWNER}>
          {{
            allowed: <div>Owner content</div>,
            denied: <div>Not owner</div>
          }}
        </ConditionalRender>
      );

      expect(screen.getByText('Owner content')).toBeInTheDocument();
      expect(screen.queryByText('Not owner')).not.toBeInTheDocument();
    });

    it('should render allowed content when minimum role check passes', () => {
      mockUseUserRole.mockReturnValue(WorkspaceRole.OWNER);

      render(
        <ConditionalRender minimumRole={WorkspaceRole.ADMIN}>
          {{
            allowed: <div>Admin+ content</div>,
            denied: <div>Below admin</div>
          }}
        </ConditionalRender>
      );

      expect(screen.getByText('Admin+ content')).toBeInTheDocument();
      expect(screen.queryByText('Below admin')).not.toBeInTheDocument();
    });
  });
});