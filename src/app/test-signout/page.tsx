'use client';

import { useSession } from 'next-auth/react';
import { SignOutButton } from '@/components/auth/SignOutButton';
import { SignOutDebug } from '@/components/auth/SignOutDebug';

/**
 * Test page for debugging signout functionality
 * Remove this after fixing the issue
 */
export default function TestSignOutPage() {
  const { data: session, status } = useSession();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">SignOut Test Page</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Current Session</h2>
            <div className="space-y-2">
              <p><strong>Status:</strong> {status}</p>
              <p><strong>User ID:</strong> {session?.user?.id || 'N/A'}</p>
              <p><strong>Email:</strong> {session?.user?.email || 'N/A'}</p>
              <p><strong>Name:</strong> {session?.user?.name || 'N/A'}</p>
            </div>
            
            <div className="mt-6">
              <h3 className="text-lg font-medium mb-2">Standard SignOut Button</h3>
              <SignOutButton />
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Debug Tools</h2>
            <SignOutDebug />
          </div>
        </div>
        
        <div className="mt-8 bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Session Details</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(session, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}