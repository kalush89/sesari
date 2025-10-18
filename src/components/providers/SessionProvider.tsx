'use client';

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';
import { Session } from 'next-auth';
import { ReactNode } from 'react';

interface SessionProviderProps {
  children: ReactNode;
  session?: Session | null;
}

/**
 * Session provider wrapper for NextAuth
 * Provides authentication context to all child components
 */
export function SessionProvider({ children, session }: SessionProviderProps) {
  return (
    <NextAuthSessionProvider session={session}>
      {children}
    </NextAuthSessionProvider>
  );
}