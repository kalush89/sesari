'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/lib/hooks/use-auth';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { Sidebar } from './Sidebar';
import { TopNavigation } from './TopNavigation';
import { AuthLoadingState } from '@/components/auth/AuthLoadingState';

interface AppLayoutProps {
  children: ReactNode;
  requireAuth?: boolean;
  requireWorkspace?: boolean;
  showSidebar?: boolean;
  showTopNav?: boolean;
}

/**
 * Main application layout component with authentication and workspace context
 * Provides consistent layout structure with navigation and authentication guards
 * 
 * Requirements: 5.1, 5.2, 6.5, 3.1, 3.2, 3.3
 */
export function AppLayout({
  children,
  requireAuth = true,
  requireWorkspace = true,
  showSidebar = true,
  showTopNav = true,
}: AppLayoutProps) {
  const { isLoading, isAuthenticated } = useAuth();

  // Show loading state while authentication is being determined
  if (isLoading) {
    return <AuthLoadingState />;
  }

  // For unauthenticated pages (like sign-in), render without guards
  if (!requireAuth) {
    return (
      <div className="min-h-screen bg-gray-50">
        {children}
      </div>
    );
  }

  // For authenticated pages, wrap with AuthGuard and layout
  return (
    <AuthGuard 
      requireAuth={requireAuth} 
      requireWorkspace={requireWorkspace}
    >
      <div className="min-h-screen bg-gray-50">
        {/* Top Navigation */}
        {showTopNav && <TopNavigation />}
        
        <div className="flex">
          {/* Sidebar Navigation */}
          {showSidebar && <Sidebar />}
          
          {/* Main Content Area */}
          <main className={`flex-1 ${showSidebar ? 'ml-64' : ''} ${showTopNav ? 'pt-16' : ''}`}>
            <div className="p-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}

/**
 * Layout variant for dashboard pages
 */
export function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AppLayout 
      requireAuth={true} 
      requireWorkspace={true}
      showSidebar={true}
      showTopNav={true}
    >
      {children}
    </AppLayout>
  );
}

/**
 * Layout variant for authentication pages
 */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <AppLayout 
      requireAuth={false} 
      requireWorkspace={false}
      showSidebar={false}
      showTopNav={false}
    >
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md w-full">
          {children}
        </div>
      </div>
    </AppLayout>
  );
}

/**
 * Layout variant for settings and admin pages
 */
export function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AppLayout 
      requireAuth={true} 
      requireWorkspace={true}
      showSidebar={true}
      showTopNav={true}
    >
      {children}
    </AppLayout>
  );
}