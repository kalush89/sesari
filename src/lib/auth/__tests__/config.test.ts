import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authOptions } from '../config';
import { WorkspaceRole } from '../../db';

// Mock Prisma
vi.mock('../../db', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    workspace: {
      create: vi.fn(),
    },
    workspaceMembership: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

// Mock environment variables
vi.mock('process', () => ({
  env: {
    GOOGLE_CLIENT_ID: 'test-client-id',
    GOOGLE_CLIENT_SECRET: 'test-client-secret',
    NODE_ENV: 'test',
  },
}));

describe('NextAuth Configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have Google provider configured', () => {
    expect(authOptions.providers).toBeDefined();
    expect(authOptions.providers.length).toBe(1);
    expect(authOptions.providers[0].id).toBe('google');
  });

  it('should use JWT strategy', () => {
    expect(authOptions.session?.strategy).toBe('jwt');
  });

  it('should have custom pages configured', () => {
    expect(authOptions.pages?.signIn).toBe('/signin');
    expect(authOptions.pages?.error).toBe('/error');
  });

  it('should have Prisma adapter configured', () => {
    expect(authOptions.adapter).toBeDefined();
  });

  it('should have security settings configured', () => {
    expect(authOptions.useSecureCookies).toBe(false); // test environment
  });

  it('should have callbacks configured', () => {
    expect(authOptions.callbacks?.jwt).toBeDefined();
    expect(authOptions.callbacks?.session).toBeDefined();
    expect(authOptions.callbacks?.signIn).toBeDefined();
    expect(authOptions.callbacks?.redirect).toBeDefined();
  });

  it('should have events configured', () => {
    expect(authOptions.events?.signIn).toBeDefined();
    expect(authOptions.events?.signOut).toBeDefined();
  });
});