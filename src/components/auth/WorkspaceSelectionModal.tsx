'use client';

import { useState, useEffect } from 'react';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import { AuthSpinner } from './AuthLoadingState';

interface WorkspaceSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWorkspaceSelected: (workspaceId: string) => void;
}

/**
 * Modal for workspace selection when user has multiple workspaces
 * Shown after successful authentication for multi-workspace users
 */
export function WorkspaceSelectionModal({ 
  isOpen, 
  onClose, 
  onWorkspaceSelected 
}: WorkspaceSelectionModalProps) {
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  
  const { 
    availableWorkspaces, 
    currentWorkspace, 
    switchWorkspace, 
    isLoading, 
    error 
  } = useWorkspaceStore();

  // Auto-select current workspace if available
  useEffect(() => {
    if (currentWorkspace && !selectedWorkspaceId) {
      setSelectedWorkspaceId(currentWorkspace.id);
    }
  }, [currentWorkspace, selectedWorkspaceId]);

  const handleWorkspaceSelect = async () => {
    if (!selectedWorkspaceId) return;

    setIsSelecting(true);
    try {
      await switchWorkspace(selectedWorkspaceId);
      onWorkspaceSelected(selectedWorkspaceId);
      onClose();
    } catch (error) {
      console.error('Failed to select workspace:', error);
      // Error is handled by the store
    } finally {
      setIsSelecting(false);
    }
  };

  const handleWorkspaceClick = (workspaceId: string) => {
    setSelectedWorkspaceId(workspaceId);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Select Your Workspace
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              You have access to multiple workspaces. Please select which one you'd like to use.
            </p>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="space-y-2 mb-6">
            {availableWorkspaces.map((workspace) => (
              <button
                key={workspace.id}
                onClick={() => handleWorkspaceClick(workspace.id)}
                disabled={isLoading || isSelecting}
                className={`w-full text-left p-3 rounded-md border transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                  selectedWorkspaceId === workspace.id
                    ? 'border-blue-500 bg-blue-50 text-blue-900'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
                role="radio"
                aria-checked={selectedWorkspaceId === workspace.id}
                aria-label={`Select ${workspace.name} workspace`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-3 ${
                      selectedWorkspaceId === workspace.id ? 'bg-blue-600' : 'bg-gray-300'
                    }`}></div>
                    <div>
                      <div className="font-medium text-sm">{workspace.name}</div>
                      <div className="text-xs text-gray-500 capitalize">
                        {workspace.userRole} access
                      </div>
                    </div>
                  </div>
                  {selectedWorkspaceId === workspace.id && (
                    <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </button>
            ))}
          </div>

          <div className="flex space-x-3">
            <button
              onClick={onClose}
              disabled={isSelecting}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleWorkspaceSelect}
              disabled={!selectedWorkspaceId || isSelecting}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isSelecting ? (
                <>
                  <AuthSpinner size="sm" className="mr-2" />
                  Selecting...
                </>
              ) : (
                'Continue'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to manage workspace selection modal state
 */
export function useWorkspaceSelection() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { availableWorkspaces, currentWorkspace } = useWorkspaceStore();

  const shouldShowModal = availableWorkspaces.length > 1 && !currentWorkspace;

  useEffect(() => {
    setIsModalOpen(shouldShowModal);
  }, [shouldShowModal]);

  const closeModal = () => setIsModalOpen(false);
  
  const handleWorkspaceSelected = (workspaceId: string) => {
    setIsModalOpen(false);
  };

  return {
    isModalOpen,
    closeModal,
    handleWorkspaceSelected,
    shouldShowModal
  };
}