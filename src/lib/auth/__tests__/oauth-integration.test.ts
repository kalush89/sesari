import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkspaceRole } from '../../db';
import type { Account, Profile, Session, User } from 'next-auth';
import type { ExtendedSession } from '../../types/auth';

// Mock Prisma at the top level
vi.mock('../../db', () => ({
    prisma: {
        user: {
            findUnique: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
        },
        workspace: {
            create: vi.fn(),
            findFirst: vi.fn(),
        },
        workspaceMembership: {
            findMany: vi.fn(),
            create: vi.fn(),
            updateMany: vi.fn(),
        },
    },
    WorkspaceRole: {
        OWNER: 'owner',
        ADMIN: 'admin',
        MEMBER: 'member',
    },
}));

// Import after mocking
const { authOptions } = await import('../config');
const { prisma } = await import('../../db');

describe('OAuth Integration Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Google OAuth Flow', () => {
        it('should handle Google OAuth sign-in', async () => {
            const mockAccount: Account = {
                provider: 'google',
                type: 'oauth',
                providerAccountId: 'google-123',
                access_token: 'mock-access-token',
                token_type: 'Bearer',
            };

            const signInCallback = authOptions.callbacks?.signIn;
            if (signInCallback) {
                const result = await signInCallback({
                    account: mockAccount,
                });

                expect(result).toBe(true);
            }
        });

        it('should reject non-Google providers', async () => {
            const mockAccount: Account = {
                provider: 'facebook',
                type: 'oauth',
                providerAccountId: 'facebook-123',
                access_token: 'mock-access-token',
                token_type: 'Bearer',
            };

            const signInCallback = authOptions.callbacks?.signIn;
            if (signInCallback) {
                const result = await signInCallback({
                    account: mockAccount,
                });

                expect(result).toBe(false);
            }
        });

        it('should handle OAuth errors gracefully', async () => {
            const signInCallback = authOptions.callbacks?.signIn;
            if (signInCallback) {
                const result = await signInCallback({
                    account: null,
                });

                expect(result).toBe(false);
            }
        });
    });

    describe('Session Management', () => {
        it('should create proper session with workspace context', async () => {
            const mockUser: User = {
                id: 'user-1',
                email: 'test@example.com',
                name: 'Test User',
                image: null,
                emailVerified: null,
            };

            const mockSession: Session = {
                user: {
                    email: 'test@example.com',
                    name: 'Test User',
                },
                expires: '2024-12-31',
            };

            // Mock user with workspace memberships
            vi.mocked(prisma.user.findUnique).mockResolvedValue({
                id: 'user-1',
                email: 'test@example.com',
                name: 'Test User',
                workspaceMemberships: [
                    {
                        id: 'membership-1',
                        workspaceId: 'workspace-1',
                        userId: 'user-1',
                        role: WorkspaceRole.OWNER,
                        workspace: {
                            id: 'workspace-1',
                            name: 'Test Workspace',
                        },
                    },
                ],
            });

            const sessionCallback = authOptions.callbacks?.session;
            if (sessionCallback) {
                const result = await sessionCallback({
                    session: mockSession,
                    user: mockUser,
                }) as ExtendedSession;

                expect(result.user.id).toBe('user-1');
                expect(result.workspaceId).toBe('workspace-1');
                expect(result.role).toBe(WorkspaceRole.OWNER);
            }
        });

        it('should handle users with no workspace memberships', async () => {
            const mockUser: User = {
                id: 'user-2',
                email: 'noworkspace@example.com',
                name: 'No Workspace User',
                image: null,
                emailVerified: null,
            };

            const mockSession: Session = {
                user: {
                    email: 'noworkspace@example.com',
                    name: 'No Workspace User',
                },
                expires: '2024-12-31',
            };

            // Mock user with no workspace memberships
            vi.mocked(prisma.user.findUnique).mockResolvedValue({
                id: 'user-2',
                email: 'noworkspace@example.com',
                name: 'No Workspace User',
                workspaceMemberships: [],
            });

            const sessionCallback = authOptions.callbacks?.session;
            if (sessionCallback) {
                const result = await sessionCallback({
                    session: mockSession,
                    user: mockUser,
                }) as ExtendedSession;

                expect(result.user.id).toBe('user-2');
                expect(result.workspaceId).toBeUndefined();
                expect(result.role).toBeUndefined();
            }
        });

        it('should handle database errors gracefully', async () => {
            const mockUser: User = {
                id: 'user-3',
                email: 'error@example.com',
                name: 'Error User',
                image: null,
                emailVerified: null,
            };

            const mockSession: Session = {
                user: {
                    email: 'error@example.com',
                    name: 'Error User',
                },
                expires: '2024-12-31',
            };

            // Mock database error
            vi.mocked(prisma.user.findUnique).mockRejectedValue(new Error('Database connection failed'));

            const sessionCallback = authOptions.callbacks?.session;
            if (sessionCallback) {
                const result = await sessionCallback({
                    session: mockSession,
                    user: mockUser,
                }) as ExtendedSession;

                // Should return basic session without workspace context
                expect(result.user.id).toBe('user-3');
                expect(result.workspaceId).toBeUndefined();
                expect(result.role).toBeUndefined();
            }
        });
    });

    describe('Redirect Callback', () => {
        it('should handle relative URLs', async () => {
            const redirectCallback = authOptions.callbacks?.redirect;
            if (redirectCallback) {
                const result = await redirectCallback({
                    url: '/dashboard',
                    baseUrl: 'https://example.com',
                });

                expect(result).toBe('https://example.com/dashboard');
            }
        });

        it('should handle same-origin URLs', async () => {
            const redirectCallback = authOptions.callbacks?.redirect;
            if (redirectCallback) {
                const result = await redirectCallback({
                    url: 'https://example.com/custom-page',
                    baseUrl: 'https://example.com',
                });

                expect(result).toBe('https://example.com/custom-page');
            }
        });

        it('should default to dashboard for external URLs', async () => {
            const redirectCallback = authOptions.callbacks?.redirect;
            if (redirectCallback) {
                const result = await redirectCallback({
                    url: 'https://malicious-site.com',
                    baseUrl: 'https://example.com',
                });

                expect(result).toBe('https://example.com/dashboard');
            }
        });
    });
});