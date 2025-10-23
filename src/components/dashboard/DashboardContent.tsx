'use client';

import { useAuth } from '@/lib/hooks/use-auth';
import { WorkspaceInfo } from '@/components/workspace/WorkspaceInfo';
import { KpiActions } from './KpiActions';
import { Permission } from '@/lib/db';
import { PermissionGate } from '@/components/auth/PermissionGate';

/**
 * Main dashboard content component
 * Shows personalized dashboard based on user permissions and workspace context
 * 
 * Requirements: 5.1, 5.2, 6.5, 3.1, 3.2, 3.3
 */
export function DashboardContent() {
  const { user, workspace, role, permissions } = useAuth();

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-white shadow-sm rounded-lg p-6 border border-gray-200">
        <h1 className="text-3xl font-semibold text-gray-900 mb-2">
          Welcome back, {user?.name}!
        </h1>
        <p className="text-gray-600">
          Here's what's happening with your KPIs and objectives.
        </p>
      </div>

      {/* Authentication Success Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <h2 className="text-lg font-medium text-blue-800 mb-2">
          Authentication System Active 🎉
        </h2>
        <p className="text-blue-700">
          You are successfully authenticated with workspace access and role-based permissions.
        </p>
      </div>

      {/* User and Workspace Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Information Card */}
        <div className="bg-white shadow-sm rounded-lg p-6 border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            User Information
          </h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              {user?.image && (
                <img
                  src={user.image}
                  alt={user.name}
                  className="w-12 h-12 rounded-full"
                />
              )}
              <div>
                <p className="font-medium text-gray-900">{user?.name}</p>
                <p className="text-sm text-gray-600">{user?.email}</p>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-200">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Role:</span>
                  <p className="capitalize text-gray-900">{role}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">User ID:</span>
                  <p className="text-gray-900 font-mono text-xs">{user?.id}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Workspace Information */}
        <WorkspaceInfo />
      </div>

      {/* Permissions Overview */}
      <div className="bg-white shadow-sm rounded-lg p-6 border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Your Permissions
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {permissions.map((permission) => (
            <div
              key={permission}
              className="bg-green-50 border border-green-200 rounded-md px-3 py-2"
            >
              <span className="text-sm font-medium text-green-800">
                {permission.replace(/_/g, ' ').toLowerCase()}
              </span>
            </div>
          ))}
        </div>

        {permissions.length === 0 && (
          <p className="text-gray-500 text-sm">
            No specific permissions assigned. Contact your workspace administrator.
          </p>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow-sm rounded-lg p-6 border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Quick Actions
        </h3>

        <div className="space-y-4">
          {/* KPI Actions */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">KPI Management</h4>
            <KpiActions
              kpiId="sample-kpi"
              onCreate={() => console.log('Create KPI')}
              onEdit={() => console.log('Edit KPI')}
              onDelete={() => console.log('Delete KPI')}
            />
          </div>

          {/* Workspace Actions */}
          <PermissionGate permission={Permission.MANAGE_WORKSPACE}>
            <div className="pt-4 border-t border-gray-200">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Workspace Management</h4>
              <div className="flex space-x-2">
                <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md transition-colors duration-200">
                  Workspace Settings
                </button>
                <PermissionGate permission={Permission.INVITE_MEMBERS}>
                  <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md transition-colors duration-200">
                    Invite Members
                  </button>
                </PermissionGate>
              </div>
            </div>
          </PermissionGate>
        </div>
      </div>

      {/* Sample KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <SampleKpiCard title="Monthly Revenue" value="$12,450" change="+8.2%" />
        <SampleKpiCard title="Active Users" value="1,234" change="+12.5%" />
        <SampleKpiCard title="Conversion Rate" value="3.4%" change="-2.1%" />
      </div>
    </div>
  );
}

/**
 * Sample KPI card component for demonstration
 */
function SampleKpiCard({
  title,
  value,
  change
}: {
  title: string;
  value: string;
  change: string;
}) {
  const isPositive = change.startsWith('+');

  return (
    <div className="bg-white shadow-sm rounded-lg p-6 border border-gray-200 hover:shadow-md transition-shadow duration-200">
      <h4 className="text-sm font-medium text-gray-600 mb-2">{title}</h4>
      <div className="flex items-baseline justify-between">
        <p className="text-2xl font-semibold text-gray-900">{value}</p>
        <span className={`text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'
          }`}>
          {change}
        </span>
      </div>

      <PermissionGate
        permission={Permission.VIEW_KPI}
        fallback={
          <p className="text-xs text-gray-400 mt-2">
            Limited access - contact admin for full KPI details
          </p>
        }
      >
        <p className="text-xs text-gray-500 mt-2">
          Click to view detailed analytics
        </p>
      </PermissionGate>
    </div>
  );
}