import { PrismaClient } from '@prisma/client';

/**
 * Global database client instance
 * Uses singleton pattern to prevent multiple connections in development
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

/**
 * Workspace role enum for type safety
 */
export enum WorkspaceRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member'
}

/**
 * Plan type enum for type safety
 */
export enum PlanType {
  FREE = 'free',
  STARTER = 'starter',
  PRO = 'pro'
}

/**
 * Permission enum for role-based access control
 */
export enum Permission {
  // Workspace management
  MANAGE_WORKSPACE = 'manage_workspace',
  INVITE_MEMBERS = 'invite_members',
  MANAGE_BILLING = 'manage_billing',
  
  // KPI management
  CREATE_KPI = 'create_kpi',
  EDIT_KPI = 'edit_kpi',
  DELETE_KPI = 'delete_kpi',
  VIEW_KPI = 'view_kpi',
  
  // Objective management
  CREATE_OBJECTIVE = 'create_objective',
  EDIT_OBJECTIVE = 'edit_objective',
  DELETE_OBJECTIVE = 'delete_objective',
  VIEW_OBJECTIVE = 'view_objective'
}

/**
 * Role-based permissions mapping
 */
export const ROLE_PERMISSIONS: Record<WorkspaceRole, Permission[]> = {
  [WorkspaceRole.OWNER]: [
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
    Permission.VIEW_OBJECTIVE
  ],
  [WorkspaceRole.ADMIN]: [
    Permission.INVITE_MEMBERS,
    Permission.CREATE_KPI,
    Permission.EDIT_KPI,
    Permission.DELETE_KPI,
    Permission.VIEW_KPI,
    Permission.CREATE_OBJECTIVE,
    Permission.EDIT_OBJECTIVE,
    Permission.DELETE_OBJECTIVE,
    Permission.VIEW_OBJECTIVE
  ],
  [WorkspaceRole.MEMBER]: [
    Permission.VIEW_KPI,
    Permission.VIEW_OBJECTIVE
  ]
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: WorkspaceRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: WorkspaceRole): Permission[] {
  return ROLE_PERMISSIONS[role];
}