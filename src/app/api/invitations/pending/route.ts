import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth/session';
import { getPendingInvitations } from '@/lib/auth/invitation-utils';

/**
 * GET /api/invitations/pending
 * Get pending invitations for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const invitations = await getPendingInvitations(session.user.email);

    return NextResponse.json({
      invitations,
      count: invitations.length
    });

  } catch (error) {
    console.error('Error fetching pending invitations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pending invitations' },
      { status: 500 }
    );
  }
}