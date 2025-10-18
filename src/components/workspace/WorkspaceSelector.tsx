'use client';

import { useState } from 'react';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';

interface WorkspaceSelectorProps {
  className?: string;
}

/**
 * Workspace selector dropdown component
 * Allows users to switch between their available workspaces
 */
export function WorkspaceSelector({ className = '' }: WorkspaceSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const {
    currentWorkspace,
    availableWorkspaces,
    switchWorkspace,
    isLoading,
    error,
  } = useWorkspaceStore();

  const handleWorkspaceSwitch = async (workspaceId: string) => {
    if (workspaceId === currentWorkspace?.id) {
      setIsOpen(false);
      return;
    }

    await switchWorkspace(workspaceId);
    setIsOpen(false);
  };

  // Show selector if user has multiple workspaces
  if (!currentWorkspace || availableWorkspaces.length <= 1) {
    return null;
  }

  return (
    <div className={`relative ${className}`}>
      {/* Current workspace button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className="flex items-center justify-between w-full px-3 py-2 text-left bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
        aria-label={`Current workspace: ${currentWorkspace.name}. Click to switch workspace.`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <div className="flex items-center">
          <div className="w-2 h-2 bg-blue-600 rounded-full mr-2"></div>
          <span className="text-sm font-medium text-gray-900 truncate">
            {currentWorkspace.name}
          </span>
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div 
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg"
          role="listbox"
          aria-label="Available workspaces"
        >
          <div className="py-1">
            {availableWorkspaces.map((workspace) => (
              <button
                key={workspace.id}
                onClick={() => handleWorkspaceSwitch(workspace.id)}
                disabled={isLoading}
                className={`flex items-center w-full px-3 py-2 text-left text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 ${
                  workspace.id === currentWorkspace.id
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-900'
                }`}
                role="option"
                aria-selected={workspace.id === currentWorkspace.id}
                aria-label={`Switch to ${workspace.name} workspace as ${workspace.userRole}`}
              >
                <div
                  className={`w-2 h-2 rounded-full mr-2 ${
                    workspace.id === currentWorkspace.id
                      ? 'bg-blue-600'
                      : 'bg-gray-300'
                  }`}
                ></div>
                <div className="flex-1 truncate">
                  <div className="font-medium">{workspace.name}</div>
                  <div className="text-xs text-gray-500 capitalize">
                    {workspace.userRole}
                  </div>
                </div>
                {workspace.id === currentWorkspace.id && (
                  <svg
                    className="w-4 h-4 text-blue-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="absolute z-50 w-full mt-1 p-2 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center rounded-md">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        </div>
      )}
    </div>
  );
}

/**
 * Simple workspace display component (read-only)
 */
export function WorkspaceDisplay({ className = '' }: { className?: string }) {
  const { currentWorkspace, userRole } = useWorkspaceStore();

  if (!currentWorkspace) {
    return null;
  }

  return (
    <div className={`flex items-center ${className}`}>
      <div className="w-2 h-2 bg-blue-600 rounded-full mr-2"></div>
      <div>
        <div className="text-sm font-medium text-gray-900">
          {currentWorkspace.name}
        </div>
        {userRole && (
          <div className="text-xs text-gray-500 capitalize">
            {userRole}
          </div>
        )}
      </div>
    </div>
  );
}