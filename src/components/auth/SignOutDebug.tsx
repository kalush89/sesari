'use client';

import { useSession, signOut } from 'next-auth/react';
import { useState } from 'react';

/**
 * Debug component to test signout functionality
 * Remove this after fixing the signout issue
 */
export function SignOutDebug() {
  const { data: session, status } = useSession();
  const [debugInfo, setDebugInfo] = useState<string>('');

  const testSignOut = async () => {
    setDebugInfo('Starting signout process...');
    
    try {
      // Test 1: Check session status
      setDebugInfo(prev => prev + `\nSession status: ${status}`);
      setDebugInfo(prev => prev + `\nSession data: ${JSON.stringify(session, null, 2)}`);
      
      // Test 2: Try signOut with different options
      setDebugInfo(prev => prev + '\nAttempting signOut with redirect: false...');
      
      const result = await signOut({ 
        redirect: false,
        callbackUrl: '/signin'
      });
      
      setDebugInfo(prev => prev + `\nSignOut result: ${JSON.stringify(result, null, 2)}`);
      
      // Test 3: Check if session is cleared
      setTimeout(() => {
        setDebugInfo(prev => prev + `\nSession after signout: ${JSON.stringify(session, null, 2)}`);
      }, 1000);
      
    } catch (error) {
      setDebugInfo(prev => prev + `\nSignOut error: ${error}`);
    }
  };

  const forceRedirect = () => {
    window.location.href = '/signin';
  };

  if (status === 'loading') {
    return <div>Loading session...</div>;
  }

  if (status === 'unauthenticated') {
    return <div>Not authenticated</div>;
  }

  return (
    <div className="p-4 border border-gray-300 rounded-lg bg-gray-50">
      <h3 className="text-lg font-semibold mb-4">SignOut Debug</h3>
      
      <div className="space-y-2 mb-4">
        <button
          onClick={testSignOut}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md mr-2"
        >
          Test SignOut
        </button>
        
        <button
          onClick={forceRedirect}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md"
        >
          Force Redirect
        </button>
      </div>
      
      <div className="bg-white p-3 rounded border">
        <h4 className="font-medium mb-2">Debug Info:</h4>
        <pre className="text-sm whitespace-pre-wrap">{debugInfo}</pre>
      </div>
    </div>
  );
}