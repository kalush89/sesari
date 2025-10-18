import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth/config';

/**
 * NextAuth API route handler
 * Handles all authentication requests including sign in, sign out, and callbacks
 */
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };