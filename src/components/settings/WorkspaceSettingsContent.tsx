'use client';

import { useAuth } from '@/lib/hooks/use-auth';
import { Permission, WorkspaceRole } from '@/lib/db';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { AuthGuard } from '@/components/auth/AuthGuard';

/**
 * Workspace settings page content - owner only
 * Demonstrates strict role-based access control
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */
export function WorkspaceSettingsContent() {
  const { user, workspace, role } = useAuth();

  return (
    <AuthGuard requiredRole={WorkspaceRole.OWNER}>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Workspace Settings</h1>
          <p className="text-gray-600 mt-1">
            Manage your workspace configuration and preferences
          </p>
        </div>

        {/* Workspace Information */}
        <div className="bg-white shadow-sm rounded-lg p-6 border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Workspace Information
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Workspace Name
              </label>
              <input 
                type="text" 
                defaultValue={workspace?.name}
                className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Workspace Slug
              </label>
              <input 
                type="text" 
                defaultValue={workspace?.slug}
                className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <div className="mt-6">
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors duration-200">
              Save Changes
            </button>
          </div>
        </div>

        {/* Billing & Subscription */}
        <PermissionGate permission={Permission.MANAGE_BILLING}>
          <div className="bg-white shadow-sm rounded-lg p-6 border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Billing & Subscription
            </h3>
            
            <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-4">
              <div className="flex items-center">
                <span className="text-green-600 text-lg mr-2">✓</span>
                <div>
                  <p className="text-green-800 font-medium">Pro Plan Active</p>
                  <p className="text-green-700 text-sm">Next billing date: March 15, 2024</p>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors duration-200">
                Manage Subscription
              </button>
              <button className="bg-gray-200 hover:bg-gray-300 text-gray-900 px-4 py-2 rounded-md transition-colors duration-200">
                View Invoices
              </button>
              <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md transition-colors duration-200">
                Usage Analytics
              </button>
            </div>
          </div>
        </PermissionGate>

        {/* Security Settings */}
        <div className="bg-white shadow-sm rounded-lg p-6 border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Security Settings
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Two-Factor Authentication</p>
                <p className="text-sm text-gray-600">Add an extra layer of security to your account</p>
              </div>
              <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition-colors duration-200">
                Enable 2FA
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Session Management</p>
                <p className="text-sm text-gray-600">Manage active sessions across devices</p>
              </div>
              <button className="bg-gray-200 hover:bg-gray-300 text-gray-900 px-4 py-2 rounded-md transition-colors duration-200">
                View Sessions
              </button>
            </div>
          </div>
        </div>

        {/* Integrations */}
        <div className="bg-white shadow-sm rounded-lg p-6 border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Integrations
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <IntegrationCard 
              name="Google Analytics"
              description="Track website performance"
              connected={true}
            />
            <IntegrationCard 
              name="Stripe"
              description="Monitor revenue metrics"
              connected={false}
            />
            <IntegrationCard 
              name="Notion"
              description="Sync objectives and notes"
              connected={false}
            />
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-white shadow-sm rounded-lg p-6 border border-red-200">
          <h3 className="text-lg font-medium text-red-900 mb-4">
            Danger Zone
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-red-900">Delete Workspace</p>
                <p className="text-sm text-red-700">
                  Permanently delete this workspace and all its data. This action cannot be undone.
                </p>
              </div>
              <button className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors duration-200">
                Delete Workspace
              </button>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}

/**
 * Integration card component
 */
function IntegrationCard({ 
  name, 
  description, 
  connected 
}: {
  name: string;
  description: string;
  connected: boolean;
}) {
  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-gray-900">{name}</h4>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          connected 
            ? 'bg-green-100 text-green-800' 
            : 'bg-gray-100 text-gray-800'
        }`}>
          {connected ? 'Connected' : 'Not Connected'}
        </span>
      </div>
      <p className="text-sm text-gray-600 mb-3">{description}</p>
      <button className={`w-full px-3 py-2 rounded-md text-sm transition-colors duration-200 ${
        connected
          ? 'bg-red-600 hover:bg-red-700 text-white'
          : 'bg-blue-600 hover:bg-blue-700 text-white'
      }`}>
        {connected ? 'Disconnect' : 'Connect'}
      </button>
    </div>
  );
}