import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getAuthSession } from '@/lib/auth/session';
import { SignOutButton } from '@/components/auth/SignOutButton';
import { WorkspaceInfo } from '@/components/workspace/WorkspaceInfo';

export const metadata: Metadata = {
  title: 'Dashboard - Sesari',
  description: 'Your KPI tracking dashboard',
};

export default async function DashboardPage() {
  const session = await getAuthSession();

  if (!session) {
    redirect('/signin');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow-sm rounded-lg p-6 border border-gray-200">
            <h1 className="text-3xl font-semibold text-gray-900 mb-6">
              Welcome to Sesari Dashboard
            </h1>
            
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
              <h2 className="text-lg font-medium text-blue-800 mb-2">
                Authentication Successful! 🎉
              </h2>
              <p className="text-blue-700">
                You have successfully signed in with Google OAuth.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  User Information
                </h3>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Name:</span> {session.user.name}</p>
                  <p><span className="font-medium">Email:</span> {session.user.email}</p>
                  <p><span className="font-medium">User ID:</span> {session.user.id}</p>
                </div>
              </div>

              <WorkspaceInfo />
            </div>

            <div className="mt-6 flex space-x-4">
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors duration-200">
                Create KPI
              </button>
              <button className="bg-gray-200 hover:bg-gray-300 text-gray-900 px-4 py-2 rounded-md transition-colors duration-200">
                View Objectives
              </button>
              <SignOutButton />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}