/**
 * Layout Components
 * 
 * This module exports all layout components for the Sesari application.
 * These components provide consistent structure and authentication-aware layouts.
 * 
 * @example
 * ```tsx
 * import { DashboardLayout } from '@/components/layout';
 * 
 * export default function MyPage() {
 *   return (
 *     <DashboardLayout>
 *       <h1>My Page Content</h1>
 *     </DashboardLayout>
 *   );
 * }
 * ```
 */

// Main layout components and variants
export {
    AppLayout,
    DashboardLayout,
    AuthLayout,
    AdminLayout
} from './AppLayout';

// Navigation components
export { Sidebar } from './Sidebar';
export { TopNavigation } from './TopNavigation';

/**
 * Layout Component Usage Guide:
 * 
 * - AppLayout: Base layout with configurable auth and navigation
 * - DashboardLayout: Full authenticated layout with sidebar and top nav
 * - AuthLayout: Centered layout for sign-in/sign-up pages
 * - AdminLayout: Enhanced layout for administrative functions
 * - Sidebar: Role-based navigation sidebar
 * - TopNavigation: User context and workspace information bar
 */