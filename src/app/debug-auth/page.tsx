import { Metadata } from 'next';
import { getAuthSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { AuthDebugInfo } from '@/components/auth/AuthDebugInfo';

export const metadata: Metadata = {
  title: 'Auth Debug - Sesari',
  description: 'Debug authentication and workspace issues',
};

export default async function AuthDebugPage() {
  const session = await getAuthSession();
  
  let workspaces = [];
  let memberships = [];
  
  if (session?.user?.id) {
    try {
      memberships = await prisma.workspaceMembership.findMany({
        where: { userId: session.user.id },
        include: {
          workspace: true,
        },
      });
      
      workspaces = memberships.map(m => ({
        ...m.workspace,
        role: m.role,
        joinedAt: m.joinedAt,
      }));
    } catch (error) {
      console.error('Error fetching debug data:', error);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-semibold text-gray-900 mb-6">
          Authentication Debug
        </h1>
        
        <AuthDebugInfo 
          session={session}
          workspaces={workspaces}
          memberships={memberships}
        />
      </div>
    </div>
  );
}