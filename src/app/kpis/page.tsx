import { Metadata } from 'next';
import { DashboardLayout } from '@/components/layout';
import { KpiListContent } from '@/components/kpi/KpiListContent';

export const metadata: Metadata = {
  title: 'KPIs - Sesari',
  description: 'Manage and track your key performance indicators',
};

export default function KpisPage() {
  return (
    <DashboardLayout>
      <KpiListContent />
    </DashboardLayout>
  );
}