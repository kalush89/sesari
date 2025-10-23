import { Metadata } from 'next';
import { DashboardLayout } from '@/components/layout';
import { ObjectiveListContent } from '@/components/objectives/ObjectiveListContent';

export const metadata: Metadata = {
  title: 'Objectives - Sesari',
  description: 'Manage and track your business objectives',
};

export default function ObjectivesPage() {
  return (
    <DashboardLayout>
      <ObjectiveListContent />
    </DashboardLayout>
  );
}