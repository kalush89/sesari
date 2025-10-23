import { Metadata } from 'next';
import { DashboardLayout } from '@/components/layout';
import { WorkspaceInfo } from '@/components/workspace/WorkspaceInfo';
import { KpiActions } from '@/components/dashboard/KpiActions';
import { DashboardContent } from '@/components/dashboard/DashboardContent';

export const metadata: Metadata = {
  title: 'Dashboard - Sesari',
  description: 'Your KPI tracking dashboard',
};

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <DashboardContent />
    </DashboardLayout>
  );
}