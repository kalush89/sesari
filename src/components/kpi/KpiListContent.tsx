'use client';

import { useAuth } from '@/lib/hooks/use-auth';
import { Permission } from '@/lib/db';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { KpiActions } from '@/components/dashboard/KpiActions';

/**
 * KPI list page content with permission-based features
 * Demonstrates role-based access control for KPI management
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */
export function KpiListContent() {
  const { user, workspace, role } = useAuth();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">KPIs</h1>
          <p className="text-gray-600 mt-1">
            Track and manage your key performance indicators
          </p>
        </div>
        
        <PermissionGate permission={Permission.CREATE_KPI}>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors duration-200">
            Create New KPI
          </button>
        </PermissionGate>
      </div>

      {/* Permission Notice */}
      <PermissionGate 
        permission={Permission.VIEW_KPI}
        fallback={
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <h3 className="text-lg font-medium text-yellow-800 mb-2">
              Limited Access
            </h3>
            <p className="text-yellow-700">
              You don't have permission to view KPIs. Contact your workspace administrator 
              to request access.
            </p>
          </div>
        }
      >
        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <SampleKpiCard 
            id="revenue"
            title="Monthly Revenue" 
            value="$12,450" 
            change="+8.2%"
            description="Total revenue for the current month"
          />
          <SampleKpiCard 
            id="users"
            title="Active Users" 
            value="1,234" 
            change="+12.5%"
            description="Number of active users this month"
          />
          <SampleKpiCard 
            id="conversion"
            title="Conversion Rate" 
            value="3.4%" 
            change="-2.1%"
            description="Percentage of visitors who convert"
          />
        </div>

        {/* Actions Section */}
        <div className="bg-white shadow-sm rounded-lg p-6 border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            KPI Management Actions
          </h3>
          <KpiActions 
            kpiId="sample-kpi"
            onCreate={() => console.log('Create KPI')}
            onEdit={() => console.log('Edit KPI')}
            onDelete={() => console.log('Delete KPI')}
          />
        </div>
      </PermissionGate>
    </div>
  );
}

/**
 * Sample KPI card with permission-based actions
 */
function SampleKpiCard({ 
  id,
  title, 
  value, 
  change,
  description
}: { 
  id: string;
  title: string; 
  value: string; 
  change: string;
  description: string;
}) {
  const isPositive = change.startsWith('+');
  
  return (
    <div className="bg-white shadow-sm rounded-lg p-6 border border-gray-200 hover:shadow-md transition-shadow duration-200">
      <div className="flex justify-between items-start mb-4">
        <h4 className="text-lg font-medium text-gray-900">{title}</h4>
        
        <PermissionGate permission={Permission.EDIT_KPI}>
          <button className="text-gray-400 hover:text-gray-600">
            <span className="text-lg">⚙️</span>
          </button>
        </PermissionGate>
      </div>
      
      <div className="mb-4">
        <div className="flex items-baseline justify-between">
          <p className="text-3xl font-semibold text-gray-900">{value}</p>
          <span className={`text-sm font-medium ${
            isPositive ? 'text-green-600' : 'text-red-600'
          }`}>
            {change}
          </span>
        </div>
        <p className="text-sm text-gray-600 mt-1">{description}</p>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-2">
        <button className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-md text-sm transition-colors duration-200">
          View Details
        </button>
        
        <PermissionGate permission={Permission.EDIT_KPI}>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md text-sm transition-colors duration-200">
            Edit
          </button>
        </PermissionGate>
      </div>
    </div>
  );
}