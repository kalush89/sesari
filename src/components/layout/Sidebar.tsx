'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/use-auth';
import { Permission } from '@/lib/db';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { WorkspaceSelector } from '@/components/workspace/WorkspaceSelector';

interface NavigationItem {
  name: string;
  href: string;
  icon: string;
  permission?: Permission;
  adminOnly?: boolean;
}

const navigationItems: NavigationItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: '📊',
  },
  {
    name: 'KPIs',
    href: '/kpis',
    icon: '📈',
    permission: Permission.VIEW_KPI,
  },
  {
    name: 'Objectives',
    href: '/objectives',
    icon: '🎯',
    permission: Permission.VIEW_OBJECTIVE,
  },
  {
    name: 'Create KPI',
    href: '/kpis/create',
    icon: '➕',
    permission: Permission.CREATE_KPI,
  },
  {
    name: 'Team',
    href: '/team',
    icon: '👥',
    permission: Permission.INVITE_MEMBERS,
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: '⚙️',
    permission: Permission.MANAGE_WORKSPACE,
    adminOnly: true,
  },
];

/**
 * Sidebar navigation component with role-based menu items
 * Shows different navigation options based on user permissions
 * 
 * Requirements: 3.1, 3.2, 3.3, 6.5
 */
export function Sidebar() {
  const pathname = usePathname();
  const { user, workspace, role } = useAuth();

  return (
    <div className="fixed inset-y-0 left-0 w-64 bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-700">
        <h1 className="text-xl font-semibold">Sesari</h1>
        <p className="text-gray-400 text-sm mt-1">KPI Tracker</p>
      </div>

      {/* Workspace Selector */}
      <div className="p-4 border-b border-gray-700">
        <WorkspaceSelector />
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navigationItems.map((item) => {
            const isActive = pathname === item.href;
            
            // If item requires permission, wrap with PermissionGate
            if (item.permission) {
              return (
                <li key={item.name}>
                  <PermissionGate permission={item.permission}>
                    <NavigationLink 
                      item={item} 
                      isActive={isActive} 
                    />
                  </PermissionGate>
                </li>
              );
            }

            // If item is admin only, check role
            if (item.adminOnly && role === 'member') {
              return null;
            }

            return (
              <li key={item.name}>
                <NavigationLink 
                  item={item} 
                  isActive={isActive} 
                />
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Info */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center space-x-3">
          {user?.image && (
            <img 
              src={user.image} 
              alt={user.name} 
              className="w-8 h-8 rounded-full"
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {user?.name}
            </p>
            <p className="text-xs text-gray-400 truncate">
              {role && (
                <span className="capitalize">{role}</span>
              )}
            </p>
          </div>
        </div>
        
        {workspace && (
          <div className="mt-2 text-xs text-gray-400">
            <p>Workspace: {workspace.name}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Individual navigation link component
 */
function NavigationLink({ 
  item, 
  isActive 
}: { 
  item: NavigationItem; 
  isActive: boolean; 
}) {
  return (
    <Link
      href={item.href}
      className={`
        flex items-center space-x-3 px-4 py-2 rounded-md transition-colors duration-200
        ${isActive 
          ? 'bg-blue-600 text-white' 
          : 'text-gray-300 hover:text-white hover:bg-gray-700'
        }
      `}
    >
      <span className="text-lg">{item.icon}</span>
      <span className="font-medium">{item.name}</span>
    </Link>
  );
}