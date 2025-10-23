import { NextAuthOptions, Session, Account, User } from 'next-auth';
import { JWT } from "next-auth/jwt";
import { PrismaAdapter } from '@auth/prisma-adapter';
import GoogleProvider from 'next-auth/providers/google';
import { prisma } from '../db';
import { WorkspaceRole } from '../db';
import type { ExtendedSession } from '../types/auth';
import { AdapterUser } from 'next-auth/adapters';



// Utility function to generate unique IDs (mimicking CUID/nanoid behavior)
// We use a simple UUID generator for this example as we must remain self-contained.
// This is used for creating the Workspace and Membership IDs.
const generateUniqueId = (): string => crypto.randomUUID();

/**
 * Custom Adapter Wrapper to handle default workspace creation for new users.
 * This logic runs in a privileged context (before the user's RLS session is active),
 * ensuring the Foreign Key check passes when creating the default workspace.
 */
const CustomPrismaAdapter = (p: typeof prisma) => {
  const adapter = PrismaAdapter(p);

  return {
    ...adapter,

    // OVERRIDE: Modify the createUser function to also set up the default workspace
    async createUser(user: AdapterUser) {
      // 1. Execute the base adapter's createUser functionality first
      // This is necessary because NextAuth passes the 'user' object back to the adapter, 
      // which handles the insertion into the 'users' table.
      // We explicitly cast the result to User for type safety in the following steps.
      const createdUser = (await adapter.createUser!(user as AdapterUser)) 

      // 2. Setup the default workspace and membership for the newly created user
      try {
        const workspaceId = generateUniqueId();
        const membershipId = generateUniqueId();
        
        const workspaceName = `${createdUser.name ?? "User"}'s Workspace`;
        const baseSlug = createdUser.email?.split("@")[0] || "user";
        const timestamp = Date.now().toString().slice(-4);
        const workspaceSlug = `${baseSlug}-workspace-${timestamp}`;

        // Use a transaction to create both records atomically. 
        // This transaction runs with elevated privileges (full Prisma access).
        await p.$transaction([
          // Create the default Workspace
          p.workspace.create({
            data: {
              id: workspaceId,
              name: workspaceName,
              slug: workspaceSlug,
              ownerId: createdUser.id,
              planType: "free",
            },
          }),
          // Create the Workspace Membership
          p.workspaceMembership.create({
            data: {
              id: membershipId,
              workspaceId,
              userId: createdUser.id,
              role: "owner",
            },
          }),
        ]);

        console.log(
          `✅ Custom adapter created default workspace for new user: ${createdUser.email}`
        );
      } catch (error) {
        console.error("Error in custom adapter creating default workspace:", error);
      }

      return createdUser;
    },
  };
};

/**
 * NextAuth configuration with Google OAuth, Prisma adapter, and custom callbacks
 * Implements JWT strategy with workspace context and role-based permissions
 */
export const authOptions: NextAuthOptions = {
  // Use the CustomPrismaAdapter for database integration
  adapter: CustomPrismaAdapter(prisma),

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
     * SIMPLIFIED: Workspace creation is now handled by the CustomPrismaAdapter
     */
    async signIn({ user, account }: { user: User; account: Account | null }) {
      try {
        // Allow sign in for Google OAuth
        if (account?.provider === 'google') {
          // The adapter already ensured a default workspace was created if the user was new.
          // We only need to return true here.
          return true;
        }

        return false;
      } catch (error) {
        console.error('Error in signIn callback (after adapter):', error);
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

      // SIMPLIFIED: Workspace creation is now handled by the CustomPrismaAdapter, 
      // so this block is removed to prevent redundant attempts.
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
