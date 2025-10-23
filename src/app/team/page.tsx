import { Metadata } from 'next';
import { DashboardLayout } from '@/components/layout';
import { TeamManagementContent } from '@/components/team/TeamManagementContent';

export const metadata: Metadata = {
  title: 'Team - Sesari',
  description: 'Manage your workspace team and permissions',
};

export default function TeamPage() {
  return (
    <DashboardLayout>
      <TeamManagementContent />
    </DashboardLayout>
  );
}