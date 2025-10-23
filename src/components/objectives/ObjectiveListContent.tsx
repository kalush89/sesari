'use client';

import { useAuth } from '@/lib/hooks/use-auth';
import { Permission } from '@/lib/db';
import { PermissionGate } from '@/components/auth/PermissionGate';

/**
 * Objectives list page content with permission-based features
 * Demonstrates role-based access control for objective management
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */
export function ObjectiveListContent() {
  const { user, workspace, role } = useAuth();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Objectives</h1>
          <p className="text-gray-600 mt-1">
            Set and track your business objectives
          </p>
        </div>
        
        <PermissionGate permission={Permission.CREATE_OBJECTIVE}>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors duration-200">
            Create New Objective
          </button>
        </PermissionGate>
      </div>

      {/* Permission Notice */}
      <PermissionGate 
        permission={Permission.VIEW_OBJECTIVE}
        fallback={
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <h3 className="text-lg font-medium text-yellow-800 mb-2">
              Limited Access
            </h3>
            <p className="text-yellow-700">
              You don't have permission to view objectives. Contact your workspace administrator 
              to request access.
            </p>
          </div>
        }
      >
        {/* Objectives List */}
        <div className="space-y-4">
          <SampleObjectiveCard 
            id="q1-revenue"
            title="Increase Q1 Revenue by 25%" 
            progress={68}
            status="In Progress"
            dueDate="March 31, 2024"
            description="Focus on expanding our customer base and increasing average order value"
          />
          <SampleObjectiveCard 
            id="user-growth"
            title="Reach 10,000 Active Users" 
            progress={42}
            status="In Progress"
            dueDate="June 30, 2024"
            description="Implement user acquisition strategies and improve retention"
          />
          <SampleObjectiveCard 
            id="product-launch"
            title="Launch New Product Feature" 
            progress={85}
            status="Nearly Complete"
            dueDate="February 15, 2024"
            description="Complete development and testing of the AI insights feature"
          />
        </div>

        {/* Create Objective Section */}
        <PermissionGate permission={Permission.CREATE_OBJECTIVE}>
          <div className="bg-white shadow-sm rounded-lg p-6 border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Create New Objective
            </h3>
            <p className="text-gray-600 mb-4">
              Set SMART objectives to drive your business forward.
            </p>
            <div className="flex space-x-3">
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors duration-200">
                Create Objective
              </button>
              <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md transition-colors duration-200">
                AI Suggestions
              </button>
            </div>
          </div>
        </PermissionGate>
      </PermissionGate>
    </div>
  );
}

/**
 * Sample objective card with permission-based actions
 */
function SampleObjectiveCard({ 
  id,
  title, 
  progress,
  status,
  dueDate,
  description
}: { 
  id: string;
  title: string; 
  progress: number;
  status: string;
  dueDate: string;
  description: string;
}) {
  return (
    <div className="bg-white shadow-sm rounded-lg p-6 border border-gray-200 hover:shadow-md transition-shadow duration-200">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h4 className="text-lg font-medium text-gray-900 mb-2">{title}</h4>
          <p className="text-sm text-gray-600 mb-3">{description}</p>
          
          <div className="flex items-center space-x-4 text-sm">
            <span className="text-gray-500">Due: {dueDate}</span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              status === 'Complete' ? 'bg-green-100 text-green-800' :
              status === 'Nearly Complete' ? 'bg-blue-100 text-blue-800' :
              'bg-yellow-100 text-yellow-800'
            }`}>
              {status}
            </span>
          </div>
        </div>
        
        <PermissionGate permission={Permission.EDIT_OBJECTIVE}>
          <button className="text-gray-400 hover:text-gray-600 ml-4">
            <span className="text-lg">⚙️</span>
          </button>
        </PermissionGate>
      </div>
      
      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">Progress</span>
          <span className="text-sm text-gray-600">{progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-2">
        <button className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-md text-sm transition-colors duration-200">
          View Details
        </button>
        
        <PermissionGate permission={Permission.EDIT_OBJECTIVE}>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md text-sm transition-colors duration-200">
            Update Progress
          </button>
        </PermissionGate>
      </div>
    </div>
  );
}