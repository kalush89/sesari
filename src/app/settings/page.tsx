import { Metadata } from 'next';
import { AdminLayout } from '@/components/layout';
import { WorkspaceSettingsContent } from '@/components/settings/WorkspaceSettingsContent';

export const metadata: Metadata = {
  title: 'Settings - Sesari',
  description: 'Manage your workspace settings and preferences',
};

export default function SettingsPage() {
  return (
    <AdminLayout>
      <WorkspaceSettingsContent />
    </AdminLayout>
  );
}