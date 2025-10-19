import { prisma } from '@/lib/db';

/**
 * Database session cleanup utilities
 * These functions help manage database sessions properly
 */

/**
 * Delete all database sessions for a specific user
 */
export async function deleteUserSessions(userId: string): Promise<number> {
  try {
    const result = await prisma.session.deleteMany({
      where: {
        userId: userId,
      },
    });
    
    console.log(`Deleted ${result.count} database sessions for user: ${userId}`);
    return result.count;
  } catch (error) {
    console.error('Error deleting user sessions:', error);
    throw error;
  }
}

/**
 * Delete a specific session by session token
 */
export async function deleteSessionByToken(sessionToken: string): Promise<boolean> {
  try {
    const result = await prisma.session.delete({
      where: {
        sessionToken: sessionToken,
      },
    });
    
    console.log(`Deleted session with token: ${sessionToken.substring(0, 10)}...`);
    return true;
  } catch (error) {
    console.error('Error deleting session by token:', error);
    return false;
  }
}

/**
 * Clean up expired sessions (maintenance function)
 */
export async function cleanupExpiredSessions(): Promise<number> {
  try {
    const result = await prisma.session.deleteMany({
      where: {
        expires: {
          lt: new Date(),
        },
      },
    });
    
    console.log(`Cleaned up ${result.count} expired sessions`);
    return result.count;
  } catch (error) {
    console.error('Error cleaning up expired sessions:', error);
    throw error;
  }
}

/**
 * Get active sessions for a user (for debugging)
 */
export async function getUserActiveSessions(userId: string) {
  try {
    const sessions = await prisma.session.findMany({
      where: {
        userId: userId,
        expires: {
          gt: new Date(),
        },
      },
      select: {
        id: true,
        sessionToken: true,
        expires: true,
        createdAt: true,
      },
    });
    
    return sessions;
  } catch (error) {
    console.error('Error fetching user sessions:', error);
    throw error;
  }
}