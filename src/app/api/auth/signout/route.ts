import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';

/**
 * Handle custom signout logic
 * This can be called before the NextAuth signout to perform cleanup
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ success: true }); // Already signed out
    }

    // Explicitly delete all database sessions for this user
    try {
      const { deleteUserSessions } = await import('@/lib/auth/session-cleanup');
      
      const deletedCount = await deleteUserSessions(session.user.id);
      
      console.log(`Custom signout cleanup for user: ${session.user.email}`);
      console.log(`Deleted ${deletedCount} database sessions`);
      
      return NextResponse.json({ 
        success: true,
        message: 'Signout cleanup completed',
        deletedSessions: deletedCount
      });
    } catch (dbError) {
      console.error('Error deleting database sessions:', dbError);
      
      // Still return success since the main signout should proceed
      return NextResponse.json({ 
        success: true,
        message: 'Signout cleanup completed with warnings',
        warning: 'Database session cleanup failed'
      });
    }
  } catch (error) {
    console.error('Error in custom signout:', error);
    return NextResponse.json(
      { success: false, error: 'Signout cleanup failed' },
      { status: 500 }
    );
  }
}