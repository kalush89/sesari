'use client';

import { SignOutButton } from '@/components/auth/SignOutButton';
import { SimpleSignOutButton } from '@/components/auth/SimpleSignOutButton';
import { ForceSignOutButton } from '@/components/auth/ForceSignOutButton';
import { NuclearSignOutButton } from '@/components/auth/NuclearSignOutButton';
import { DiagnosticSignOutButton } from '@/components/auth/DiagnosticSignOutButton';
import { DatabaseSignOutButton } from '@/components/auth/DatabaseSignOutButton';
import { SignOutDebugInfo } from '@/components/auth/SignOutDebugInfo';
import { SessionDebugInfo } from '@/components/auth/SessionDebugInfo';
import { AuthStrategyTester } from '@/components/auth/AuthStrategyTester';

/**
 * Test page for debugging sign-out issues
 * Includes multiple sign-out methods and debug information
 */
export default function TestSignOutDebugPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Sign-Out Debug Page</h1>
        
        <SignOutDebugInfo />
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Sign-Out Methods</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Original SignOutButton (with workspace cleanup):</h3>
              <SignOutButton />
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Simple SignOutButton (minimal cleanup):</h3>
              <SimpleSignOutButton />
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Force SignOutButton (direct API call):</h3>
              <ForceSignOutButton />
            </div>
            
            <div>
              <h3 className="font-medium mb-2">🚨 Nuclear SignOutButton (destroys everything):</h3>
              <NuclearSignOutButton />
            </div>
            
            <div>
              <h3 className="font-medium mb-2">🔍 Diagnostic SignOutButton (captures state changes):</h3>
              <DiagnosticSignOutButton />
            </div>
            
            <div>
              <h3 className="font-medium mb-2">🗄️ Database SignOutButton (fixes database session issue):</h3>
              <DatabaseSignOutButton />
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Manual Actions:</h3>
              <div className="space-x-2">
                <button 
                  onClick={() => localStorage.clear()}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded text-sm"
                >
                  Clear LocalStorage
                </button>
                <button 
                  onClick={() => sessionStorage.clear()}
                  className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 rounded text-sm"
                >
                  Clear SessionStorage
                </button>
                <button 
                  onClick={() => window.location.href = '/api/auth/signout'}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-sm"
                >
                  Direct API SignOut
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <AuthStrategyTester />
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Instructions</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Check the debug info above to see current state</li>
            <li>Try the "Simple SignOutButton" first - it has minimal cleanup</li>
            <li>If that doesn't work, try the "Nuclear SignOutButton" 🚨</li>
            <li>Use the "Clear Everything & Reload" button as last resort</li>
            <li>Check if the page redirects to /signin and stays there</li>
            <li>Try navigating back to /dashboard to see if you're truly signed out</li>
          </ol>
        </div>
      </div>
    </div>
  );
}