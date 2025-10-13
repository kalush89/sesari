import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/db"

// Extended JWT interface to include workspace context
export interface ExtendedJWT {
  userId: string
  workspaceId?: string
  role?: UserRole
  plan?: PlanType
  email: string
}

// Extended session interface with workspace and role information
export interface ExtendedSession {
  user: {
    id: string
    email: string
    name: string
    image: string
  }
  workspace?: {
    id: string
    name: string
    plan: PlanType
  }
  role?: UserRole
  expires: string
}

// User roles enum
export enum UserRole {
  SUPERADMIN = 'SUPERADMIN',
  WORKSPACE_ADMIN = 'WORKSPACE_ADMIN',
  EDITOR = 'EDITOR',
  VIEWER = 'VIEWER'
}

// Plan types enum
export enum PlanType {
  FREE = 'FREE',
  STARTER = 'STARTER',
  PRO = 'PRO'
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user, account }) {
      // Initial sign in
      if (account && user) {
        token.userId = user.id
        token.email = user.email!
        
        // TODO: Add workspace logic once database schema is implemented
        // For now, just store basic user info
      }

      return token
    },
    async session({ session, token }) {
      if (token) {
        const extendedSession: ExtendedSession = {
          user: {
            id: token.userId as string,
            email: token.email as string,
            name: session.user?.name || '',
            image: session.user?.image || ''
          },
          expires: session.expires,
          // TODO: Add workspace and role info once database schema is implemented
        }

        return extendedSession as ExtendedSession
      }
      return session
    }
  },
  pages: {
    signIn: '/signin',
    error: '/auth/error'
  },
  events: {
    async signIn({ user, account, profile }) {
      console.log(`User ${user.email} signed in with ${account?.provider}`)
    },
    async signOut({ session }) {
      console.log(`User signed out`)
    }
  },
  debug: process.env.NODE_ENV === 'development'
}
// Helper function to get server-side session
import { getServerSession } from "next-auth"

export async function getAuthSession() {
  return await getServerSession(authOptions)
}

// Type guard to check if session is extended
export function isExtendedSession(session: any): session is ExtendedSession {
  return session && session.user && session.user.id
}