import { describe, it, expect } from 'vitest';
import { 
  WorkspaceRole, 
  Permission, 
  hasPermission, 
  getRolePermissions,
  ROLE_PERMISSIONS 
} from '../index';
import { 
  checkPermission, 
  hasRolePermission,
  hasAnyPermission, 
  hasAllPermissions 
} from '../permissions';

describe('Permission System', () => {
  describe('Role Permissions Mapping', () => {
    it('should define correct permissions for OWNER role', () => {
      const ownerPermissions = ROLE_PERMISSIONS[WorkspaceRole.OWNER];
      
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

    it('should define correct permissions for ADMIN role', () => {
      const adminPermissions = ROLE_PERMISSIONS[WorkspaceRole.ADMIN];
      
      expect(adminPermissions).toContain(Permission.INVITE_MEMBERS);
      expect(adminPermissions).toContain(Permission.CREATE_KPI);
      expect(adminPermissions).toContain(Permission.EDIT_KPI);
      expect(adminPermissions).toContain(Permission.DELETE_KPI);
      expect(adminPermissions).toContain(Permission.VIEW_KPI);
      expect(adminPermissions).toContain(Permission.CREATE_OBJECTIVE);
      expect(adminPermissions).toContain(Permission.EDIT_OBJECTIVE);
      expect(adminPermissions).toContain(Permission.DELETE_OBJECTIVE);
      expect(adminPermissions).toContain(Permission.VIEW_OBJECTIVE);
      
      // Admin should NOT have these permissions
      expect(adminPermissions).not.toContain(Permission.MANAGE_WORKSPACE);
      expect(adminPermissions).not.toContain(Permission.MANAGE_BILLING);
    });

    it('should define correct permissions for MEMBER role', () => {
      const memberPermissions = ROLE_PERMISSIONS[WorkspaceRole.MEMBER];
      
      expect(memberPermissions).toContain(Permission.VIEW_KPI);
      expect(memberPermissions).toContain(Permission.VIEW_OBJECTIVE);
      
      // Member should NOT have these permissions
      expect(memberPermissions).not.toContain(Permission.CREATE_KPI);
      expect(memberPermissions).not.toContain(Permission.EDIT_KPI);
      expect(memberPermissions).not.toContain(Permission.DELETE_KPI);
      expect(memberPermissions).not.toContain(Permission.MANAGE_WORKSPACE);
      expect(memberPermissions).not.toContain(Permission.INVITE_MEMBERS);
      expect(memberPermissions).not.toContain(Permission.MANAGE_BILLING);
    });
  });

  describe('hasPermission function', () => {
    it('should return true when role has permission', () => {
      expect(hasPermission(WorkspaceRole.OWNER, Permission.CREATE_KPI)).toBe(true);
      expect(hasPermission(WorkspaceRole.ADMIN, Permission.EDIT_KPI)).toBe(true);
      expect(hasPermission(WorkspaceRole.MEMBER, Permission.VIEW_KPI)).toBe(true);
    });

    it('should return false when role lacks permission', () => {
      expect(hasPermission(WorkspaceRole.MEMBER, Permission.CREATE_KPI)).toBe(false);
      expect(hasPermission(WorkspaceRole.ADMIN, Permission.MANAGE_BILLING)).toBe(false);
      expect(hasPermission(WorkspaceRole.MEMBER, Permission.MANAGE_WORKSPACE)).toBe(false);
    });
  });

  describe('checkPermission function (string version)', () => {
    it('should return true for valid permission strings', () => {
      expect(checkPermission(WorkspaceRole.OWNER, 'create_kpi')).toBe(true);
      expect(checkPermission(WorkspaceRole.MEMBER, 'view_kpi')).toBe(true);
    });

    it('should return false for invalid permission strings', () => {
      expect(checkPermission(WorkspaceRole.OWNER, 'invalid_permission')).toBe(false);
      expect(checkPermission(WorkspaceRole.MEMBER, 'create_kpi')).toBe(false);
    });
  });

  describe('hasRolePermission function (enum version)', () => {
    it('should return true when role has permission', () => {
      expect(hasRolePermission(WorkspaceRole.OWNER, Permission.CREATE_KPI)).toBe(true);
      expect(hasRolePermission(WorkspaceRole.ADMIN, Permission.EDIT_KPI)).toBe(true);
    });

    it('should return false when role lacks permission', () => {
      expect(hasRolePermission(WorkspaceRole.MEMBER, Permission.CREATE_KPI)).toBe(false);
      expect(hasRolePermission(WorkspaceRole.ADMIN, Permission.MANAGE_BILLING)).toBe(false);
    });
  });

  describe('getRolePermissions function', () => {
    it('should return all permissions for a role', () => {
      const ownerPermissions = getRolePermissions(WorkspaceRole.OWNER);
      const memberPermissions = getRolePermissions(WorkspaceRole.MEMBER);
      
      expect(ownerPermissions.length).toBeGreaterThan(memberPermissions.length);
      expect(ownerPermissions).toContain(Permission.MANAGE_WORKSPACE);
      expect(memberPermissions).toEqual([Permission.VIEW_KPI, Permission.VIEW_OBJECTIVE]);
    });
  });

  describe('hasAnyPermission function', () => {
    it('should return true when role has at least one permission', () => {
      expect(hasAnyPermission(WorkspaceRole.MEMBER, [
        Permission.CREATE_KPI,
        Permission.VIEW_KPI
      ])).toBe(true);
    });

    it('should return false when role has none of the permissions', () => {
      expect(hasAnyPermission(WorkspaceRole.MEMBER, [
        Permission.CREATE_KPI,
        Permission.MANAGE_WORKSPACE
      ])).toBe(false);
    });
  });

  describe('hasAllPermissions function', () => {
    it('should return true when role has all permissions', () => {
      expect(hasAllPermissions(WorkspaceRole.OWNER, [
        Permission.CREATE_KPI,
        Permission.VIEW_KPI
      ])).toBe(true);
    });

    it('should return false when role lacks any permission', () => {
      expect(hasAllPermissions(WorkspaceRole.MEMBER, [
        Permission.CREATE_KPI,
        Permission.VIEW_KPI
      ])).toBe(false);
    });
  });
});