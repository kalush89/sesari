'use client';

import { useState, useEffect } from 'react';

interface SessionInfo {
  user: {
    id: string;
    email: string;
  };
  activeSessions: Array<{
    id: string;
    tokenPreview: string;
    expires: string;
    createdAt: string;
  }>;
  sessionCount: number;
}

/**
 * Component to display database session information for debugging
 */
export function SessionDebugInfo() {
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSessionInfo = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/auth/debug-sessions');
      
      if (response.ok) {
        const data = await response.json();
        setSessionInfo(data);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to fetch session info');
      }
    } catch (err) {
      setError('Network error fetching session info');
    } finally {
      setIsLoading(false);
    }
  };

  const cleanupExpiredSessions = async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/auth/debug-sessions', {
        method: 'DELETE',
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Cleanup result:', data);
        // Refresh session info after cleanup
        await fetchSessionInfo();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to cleanup sessions');
      }
    } catch (err) {
      setError('Network error during cleanup');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessionInfo();
  }, []);

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold">Database Session Info</h3>
        <div className="space-x-2">
          <button
            onClick={fetchSessionInfo}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
          >
            {isLoading ? 'Loading...' : 'Refresh'}
          </button>
          <button
            onClick={cleanupExpiredSessions}
            disabled={isLoading}
            className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
          >
            Cleanup Expired
          </button>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-2 mb-3">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}
      
      {sessionInfo && (
        <div className="space-y-2 text-sm font-mono">
          <div>User: <span className="font-semibold">{sessionInfo.user.email}</span></div>
          <div>User ID: <span className="font-semibold">{sessionInfo.user.id}</span></div>
          <div>Active Sessions: <span className="font-semibold">{sessionInfo.sessionCount}</span></div>
          
          {sessionInfo.activeSessions.length > 0 && (
            <div className="mt-3">
              <h4 className="font-medium mb-2">Session Details:</h4>
              <div className="space-y-1">
                {sessionInfo.activeSessions.map((session, index) => (
                  <div key={session.id} className="bg-gray-50 p-2 rounded text-xs">
                    <div>#{index + 1} Token: {session.tokenPreview}</div>
                    <div>Expires: {new Date(session.expires).toLocaleString()}</div>
                    <div>Created: {new Date(session.createdAt).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      
      {!sessionInfo && !isLoading && !error && (
        <p className="text-gray-500 text-sm">Click refresh to load session info</p>
      )}
    </div>
  );
}