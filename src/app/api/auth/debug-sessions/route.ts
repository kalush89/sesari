import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { getUserActiveSessions, cleanupExpiredSessions } from '@/lib/auth/session-cleanup';

/**
 * Debug endpoint for session management
 * GET: Shows active sessions for current user
 * DELETE: Cleans up expired sessions
 */

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const activeSessions = await getUserActiveSessions(session.user.id);
    
    return NextResponse.json({
      user: {
        id: session.user.id,
        email: session.user.email,
      },
      activeSessions: activeSessions.map(s => ({
        id: s.id,
        tokenPreview: s.sessionToken.substring(0, 10) + '...',
        expires: s.expires,
        createdAt: s.createdAt,
      })),
      sessionCount: activeSessions.length,
    });
  } catch (error) {
    console.error('Error fetching session debug info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch session info' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const cleanedCount = await cleanupExpiredSessions();
    
    return NextResponse.json({
      success: true,
      message: `Cleaned up ${cleanedCount} expired sessions`,
      cleanedCount,
    });
  } catch (error) {
    console.error('Error cleaning up sessions:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup sessions' },
      { status: 500 }
    );
  }
}