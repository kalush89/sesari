import { NextAuthOptions, Session, Account, User } from 'next-auth';
import { JWT } from "next-auth/jwt";
import { PrismaAdapter } from '@auth/prisma-adapter';
import GoogleProvider from 'next-auth/providers/google';
import { prisma } from '../db';
import { WorkspaceRole } from '../db';
import type { ExtendedSession } from '../types/auth';

/**
 * NextAuth configuration with Google OAuth, Prisma adapter, and custom callbacks
 * Implements JWT strategy with workspace context and role-based permissions
 */
export const authOptions: NextAuthOptions = {
  // Use Prisma adapter for database integration
  adapter: PrismaAdapter(prisma),

  // Configure providers
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          // Request minimal required scopes for security
          scope: 'openid email profile',
          // Enable PKCE for enhanced security
          code_challenge_method: 'S256',
        },
      },
      // Configure profile mapping
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          emailVerified: profile.email_verified ? new Date() : null,
        };
      },
    }),
  ],

  // Use database strategy for session management (required with PrismaAdapter)
  session: {
    strategy: 'database',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },

  // Custom pages
  pages: {
    signIn: '/signin',
    error: '/error',
  },

  // Security settings
  useSecureCookies: process.env.NODE_ENV === 'production',

  // Custom callbacks for session handling
  callbacks: {
    /**
     * Session callback - runs whenever a session is checked
     * Used to add workspace context to the session
     */
    async session({
      session,
      user,
    }: {
      session: Session;
      user?: User;
      newSession?: any;
    }): Promise<ExtendedSession> {
      try {
        // Get user's workspace memberships
        const userWithWorkspaces = await prisma.user.findUnique({
          where: { id: user?.id! },
          include: {
            workspaceMemberships: {
              include: {
                workspace: true,
              },
              orderBy: {
                joinedAt: 'desc', // Most recent workspace first
              },
            },
          },
        });

        let workspaceId: string | undefined;
        let role: WorkspaceRole | undefined;

        if (userWithWorkspaces?.workspaceMemberships && userWithWorkspaces.workspaceMemberships.length > 0) {
          // Use the most recent workspace as default
          const defaultMembership = userWithWorkspaces.workspaceMemberships[0];
          workspaceId = defaultMembership.workspaceId;
          role = defaultMembership.role as WorkspaceRole;
        }

        // Return extended session with workspace context
        const extendedSession: ExtendedSession = {
          ...session,
          user: {
            id: user?.id!,
            email: session.user?.email || '',
            name: session.user?.name || '',
            image: session.user?.image || undefined,
          },
          workspaceId,
          role,
        };

        return extendedSession;
      } catch (error) {
        console.error('Error fetching workspace context in session callback:', error);
        // Return basic session without workspace context
        return {
          ...session,
          user: {
            id: user?.id!,
            email: session.user?.email || '',
            name: session.user?.name || '',
            image: session.user?.image || undefined,
          },
        } as ExtendedSession;
      }
    },

    /**
     * SignIn callback - controls whether a user is allowed to sign in
     * Used for additional validation and workspace assignment
     */
    async signIn({ account }: { account: Account | null }) {
      try {
        // Allow sign in for Google OAuth
        if (account?.provider === 'google') {
          return true;
        }

        return false;
      } catch (error) {
        console.error('Error in signIn callback:', error);
        return false;
      }
    },

    /**
     * Redirect callback - controls where users are redirected after sign in
     */
    async redirect({ url, baseUrl }: { url: string; baseUrl: string }) {
      // Allows relative callback URLs
      if (url.startsWith('/')) return `${baseUrl}${url}`;

      // Allows callback URLs on the same origin
      if (new URL(url).origin === baseUrl) return url;

      // Default redirect to dashboard
      return `${baseUrl}/dashboard`;
    },
  },

  // Event handlers for logging and analytics
  events: {
    async signIn({ user, isNewUser }: { user: User; isNewUser?: boolean }) {
      console.log(`User signed in: ${user.email} (new: ${isNewUser})`);

      // Process pending invitations for both new and existing users
      if (user.id && user.email) {
        try {
          const { processPendingInvitations } = await import('./invitation-utils');
          const result = await processPendingInvitations(user.id, user.email);

          if (result.processedCount > 0) {
            console.log(`Processed ${result.processedCount} pending invitations for user: ${user.email}`);
          }
        } catch (error) {
          console.error('Error processing pending invitations:', error);
          // Don't fail the sign in process
        }
      }

      // Create default workspace for new users
      if (isNewUser && user.id) {
        try {
          // Generate a unique workspace slug
          const baseSlug = user.name?.toLowerCase().replace(/\s+/g, '-') || 'workspace';
          const timestamp = Date.now().toString().slice(-4);
          const slug = `${baseSlug}-${timestamp}`;

          // Create workspace and membership
          await prisma.workspace.create({
            data: {
              name: `${user.name}'s Workspace`,
              slug,
              ownerId: user.id,
              planType: 'free',
              memberships: {
                create: {
                  userId: user.id,
                  role: WorkspaceRole.OWNER,
                  joinedAt: new Date(),
                },
              },
            },
          });

          console.log(`Created default workspace for new user: ${user.email}`);
        } catch (error) {
          console.error('Error creating default workspace:', error);
          // Don't fail the sign in process
        }
      }
    },

    async signOut({ session, token }: { session: Session; token: JWT }) {
      console.log(`User signed out: ${session?.user?.email || token?.email}`);

      // Explicitly delete database session records for this user
      try {
        const { deleteUserSessions } = await import('./session-cleanup');

        // For database sessions, we need to get the user ID from the token or find it another way
        if (token?.sub) {
          await deleteUserSessions(token.sub);
          console.log(`Cleaned up all database sessions for user ID: ${token.sub}`);
        } else if (session?.user?.email) {
          // Fallback: find user by email if we don't have the ID
          const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true }
          });
          if (user?.id) {
            await deleteUserSessions(user.id);
            console.log(`Cleaned up all database sessions for user: ${session.user.email}`);
          }
        }
      } catch (error) {
        console.error('Error deleting database sessions during signout:', error);
        // Don't fail the signout process if session cleanup fails
      }

      // Additional cleanup can be added here if needed
      // For example, invalidating tokens, clearing cache, etc.
    },
  },

  // Enable debug mode in development
  debug: process.env.NODE_ENV === 'development',
};