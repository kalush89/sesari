'use client';

import { useState } from 'react';

interface SidebarProps {
  children?: React.ReactNode;
}

export default function Sidebar({ children }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className={`bg-gray-900 text-white transition-all duration-300 ${
      isCollapsed ? 'w-16' : 'w-64'
    } min-h-screen flex flex-col`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <h1 className="text-xl font-bold">Sesari</h1>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg
              className={`w-5 h-5 transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          <SidebarItem
            icon="🏠"
            label="Dashboard"
            href="/dashboard"
            isCollapsed={isCollapsed}
          />
          <SidebarItem
            icon="📊"
            label="Analytics"
            href="/analytics"
            isCollapsed={isCollapsed}
          />
          <SidebarItem
            icon="⚙️"
            label="Settings"
            href="/settings"
            isCollapsed={isCollapsed}
          />
          <SidebarItem
            icon="👥"
            label="Team"
            href="/team"
            isCollapsed={isCollapsed}
          />
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-700">
        <SidebarItem
          icon="👤"
          label="Profile"
          href="/profile"
          isCollapsed={isCollapsed}
        />
      </div>

      {children}
    </div>
  );
}

interface SidebarItemProps {
  icon: string;
  label: string;
  href: string;
  isCollapsed: boolean;
  isActive?: boolean;
}

function SidebarItem({ icon, label, href, isCollapsed, isActive = false }: SidebarItemProps) {
  return (
    <li>
      <a
        href={href}
        className={`flex items-center p-3 rounded-lg transition-colors ${
          isActive
            ? 'bg-blue-600 text-white'
            : 'hover:bg-gray-700 text-gray-300 hover:text-white'
        }`}
        title={isCollapsed ? label : undefined}
      >
        <span className="text-xl">{icon}</span>
        {!isCollapsed && (
          <span className="ml-3 font-medium">{label}</span>
        )}
      </a>
    </li>
  );
}