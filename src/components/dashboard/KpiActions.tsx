'use client';

import { Permission } from '@/lib/db';
import { 
  PermissionGate, 
  AdminGate, 
  ConditionalRender 
} from '@/components/auth/PermissionGate';
import { usePermission } from '@/lib/auth/permission-hooks';

interface KpiActionsProps {
  kpiId: string;
  onEdit?: () => void;
  onDelete?: () => void;
  onCreate?: () => void;
}

/**
 * Component that shows KPI actions based on user permissions
 */
export function KpiActions({ kpiId, onEdit, onDelete, onCreate }: KpiActionsProps) {
  const canCreateKpi = usePermission(Permission.CREATE_KPI);
  const canEditKpi = usePermission(Permission.EDIT_KPI);
  const canDeleteKpi = usePermission(Permission.DELETE_KPI);

  return (
    <div className="flex gap-2">
      {/* Create KPI button - only for users with create permission */}
      <PermissionGate permission={Permission.CREATE_KPI}>
        <button
          onClick={onCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors duration-200"
        >
          Create KPI
        </button>
      </PermissionGate>

      {/* Edit button - only for users with edit permission */}
      <PermissionGate permission={Permission.EDIT_KPI}>
        <button
          onClick={onEdit}
          className="bg-gray-200 hover:bg-gray-300 text-gray-900 px-4 py-2 rounded-md transition-colors duration-200"
        >
          Edit
        </button>
      </PermissionGate>

      {/* Delete button - only for admins and owners */}
      <AdminGate>
        <PermissionGate permission={Permission.DELETE_KPI}>
          <button
            onClick={onDelete}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors duration-200"
          >
            Delete
          </button>
        </PermissionGate>
      </AdminGate>

      {/* Conditional rendering example */}
      <ConditionalRender permission={Permission.MANAGE_WORKSPACE}>
        {{
          allowed: (
            <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md transition-colors duration-200">
              Manage Settings
            </button>
          ),
          denied: (
            <span className="text-gray-500 text-sm">
              Contact admin to manage settings
            </span>
          )
        }}
      </ConditionalRender>
    </div>
  );
}

/**
 * Example of using permission hooks for conditional logic
 */
export function KpiCard({ kpiId }: { kpiId: string }) {
  const canEdit = usePermission(Permission.EDIT_KPI);
  const canDelete = usePermission(Permission.DELETE_KPI);

  const handleClick = () => {
    if (canEdit) {
      // Navigate to edit page
      console.log('Navigate to edit');
    } else {
      // Show read-only view
      console.log('Show read-only view');
    }
  };

  return (
    <div 
      className={`bg-white shadow-sm rounded-lg p-6 border border-gray-200 ${
        canEdit ? 'cursor-pointer hover:shadow-md' : 'cursor-default'
      } transition-shadow duration-200`}
      onClick={handleClick}
    >
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        Sample KPI
      </h3>
      
      <p className="text-gray-600 mb-4">
        KPI description and current value
      </p>

      {/* Show different footer based on permissions */}
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-500">
          Last updated: Today
        </span>

        <ConditionalRender permission={Permission.EDIT_KPI}>
          {{
            allowed: (
              <span className="text-sm text-blue-600">
                Click to edit
              </span>
            ),
            denied: (
              <span className="text-sm text-gray-400">
                Read-only
              </span>
            )
          }}
        </ConditionalRender>
      </div>
    </div>
  );
}