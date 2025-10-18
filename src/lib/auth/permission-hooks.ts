'use client';

import { useSession } from 'next-auth/react';
import { WorkspaceRole, Permission, hasPermission } from '../db';
import type { ExtendedSession } from '../types/auth';

/**
 * Hook to check if current user has a specific permission
 */
export function usePermission(permission: Permission): boolean {
    const { data: session } = useSession() as { data: ExtendedSession | null };

    if (!session?.role) {
        return false;
    }

    return hasPermission(session.role, permission);
}

/**
 * Hook to check if current user has any of the specified permissions
 */
export function useAnyPermission(permissions: Permission[]): boolean {
    const { data: session } = useSession() as { data: ExtendedSession | null };

    if (!session?.role) {
        return false;
    }

    return permissions.some(permission => hasPermission(session.role!, permission));
}

/**
 * Hook to check if current user has all of the specified permissions
 */
export function useAllPermissions(permissions: Permission[]): boolean {
    const { data: session } = useSession() as { data: ExtendedSession | null };

    if (!session?.role) {
        return false;
    }

    return permissions.every(permission => hasPermission(session.role!, permission));
}

/**
 * Hook to get current user's role
 */
export function useUserRole(): WorkspaceRole | null {
    const { data: session } = useSession() as { data: ExtendedSession | null };
    return session?.role || null;
}

/**
 * Hook to check if current user has a specific role
 */
export function useHasRole(role: WorkspaceRole): boolean {
    const { data: session } = useSession() as { data: ExtendedSession | null };
    return session?.role === role;
}

/**
 * Hook to check if current user is workspace owner
 */
export function useIsOwner(): boolean {
    return useHasRole(WorkspaceRole.OWNER);
}

/**
 * Hook to check if current user is workspace admin or owner
 */
export function useIsAdmin(): boolean {
    const { data: session } = useSession() as { data: ExtendedSession | null };
    const role = session?.role;
    return role === WorkspaceRole.OWNER || role === WorkspaceRole.ADMIN;
}

/**
 * Hook to get all permissions for current user's role
 */
export function useUserPermissions(): Permission[] {
    const { data: session } = useSession() as { data: ExtendedSession | null };

    if (!session?.role) {
        return [];
    }

    const { getRolePermissions } = require('../db');
    return getRolePermissions(session.role);
}