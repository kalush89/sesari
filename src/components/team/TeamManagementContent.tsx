'use client';

import { useAuth } from '@/lib/hooks/use-auth';
import { Permission, WorkspaceRole } from '@/lib/db';
import { PermissionGate, AdminGate } from '@/components/auth/PermissionGate';

/**
 * Team management page content with admin-only features
 * Demonstrates role-based access control for team management
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 3.5
 */
export function TeamManagementContent() {
  const { user, workspace, role } = useAuth();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Team Management</h1>
          <p className="text-gray-600 mt-1">
            Manage workspace members and their permissions
          </p>
        </div>
        
        <PermissionGate permission={Permission.INVITE_MEMBERS}>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors duration-200">
            Invite Member
          </button>
        </PermissionGate>
      </div>

      {/* Permission Check */}
      <PermissionGate 
        permission={Permission.INVITE_MEMBERS}
        fallback={
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <h3 className="text-lg font-medium text-yellow-800 mb-2">
              Access Restricted
            </h3>
            <p className="text-yellow-700">
              You don't have permission to manage team members. Only workspace admins 
              and owners can access this page.
            </p>
          </div>
        }
      >
        {/* Current Team Members */}
        <div className="bg-white shadow-sm rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Current Team Members
            </h3>
          </div>
          
          <div className="divide-y divide-gray-200">
            <TeamMemberRow 
              name="John Doe"
              email="john@example.com"
              role={WorkspaceRole.OWNER}
              isCurrentUser={true}
              joinedAt="January 15, 2024"
            />
            <TeamMemberRow 
              name="Jane Smith"
              email="jane@example.com"
              role={WorkspaceRole.ADMIN}
              isCurrentUser={false}
              joinedAt="February 3, 2024"
            />
            <TeamMemberRow 
              name="Bob Johnson"
              email="bob@example.com"
              role={WorkspaceRole.MEMBER}
              isCurrentUser={false}
              joinedAt="February 10, 2024"
            />
          </div>
        </div>

        {/* Pending Invitations */}
        <div className="bg-white shadow-sm rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Pending Invitations
            </h3>
          </div>
          
          <div className="divide-y divide-gray-200">
            <PendingInvitationRow 
              email="alice@example.com"
              role={WorkspaceRole.ADMIN}
              invitedAt="February 15, 2024"
              invitedBy="John Doe"
            />
            <PendingInvitationRow 
              email="charlie@example.com"
              role={WorkspaceRole.MEMBER}
              invitedAt="February 16, 2024"
              invitedBy="Jane Smith"
            />
          </div>
        </div>

        {/* Admin Actions */}
        <AdminGate>
          <div className="bg-white shadow-sm rounded-lg p-6 border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Admin Actions
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors duration-200">
                Bulk Invite Members
              </button>
              <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md transition-colors duration-200">
                Export Member List
              </button>
              <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md transition-colors duration-200">
                Manage Permissions
              </button>
              <button className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md transition-colors duration-200">
                Audit Log
              </button>
            </div>
          </div>
        </AdminGate>
      </PermissionGate>
    </div>
  );
}

/**
 * Team member row component
 */
function TeamMemberRow({ 
  name, 
  email, 
  role, 
  isCurrentUser, 
  joinedAt 
}: {
  name: string;
  email: string;
  role: WorkspaceRole;
  isCurrentUser: boolean;
  joinedAt: string;
}) {
  return (
    <div className="px-6 py-4 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
          <span className="text-sm font-medium text-gray-700">
            {name.split(' ').map(n => n[0]).join('')}
          </span>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">
            {name} {isCurrentUser && <span className="text-gray-500">(You)</span>}
          </p>
          <p className="text-sm text-gray-600">{email}</p>
          <p className="text-xs text-gray-500">Joined {joinedAt}</p>
        </div>
      </div>
      
      <div className="flex items-center space-x-4">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          role === WorkspaceRole.OWNER ? 'bg-purple-100 text-purple-800' :
          role === WorkspaceRole.ADMIN ? 'bg-blue-100 text-blue-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {role}
        </span>
        
        {!isCurrentUser && (
          <AdminGate>
            <div className="flex space-x-2">
              <button className="text-blue-600 hover:text-blue-700 text-sm">
                Edit Role
              </button>
              <button className="text-red-600 hover:text-red-700 text-sm">
                Remove
              </button>
            </div>
          </AdminGate>
        )}
      </div>
    </div>
  );
}

/**
 * Pending invitation row component
 */
function PendingInvitationRow({ 
  email, 
  role, 
  invitedAt, 
  invitedBy 
}: {
  email: string;
  role: WorkspaceRole;
  invitedAt: string;
  invitedBy: string;
}) {
  return (
    <div className="px-6 py-4 flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-900">{email}</p>
        <p className="text-xs text-gray-500">
          Invited by {invitedBy} on {invitedAt}
        </p>
      </div>
      
      <div className="flex items-center space-x-4">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          role === WorkspaceRole.ADMIN ? 'bg-blue-100 text-blue-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {role}
        </span>
        
        <AdminGate>
          <div className="flex space-x-2">
            <button className="text-blue-600 hover:text-blue-700 text-sm">
              Resend
            </button>
            <button className="text-red-600 hover:text-red-700 text-sm">
              Cancel
            </button>
          </div>
        </AdminGate>
      </div>
    </div>
  );
}