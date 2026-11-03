import type { Metadata } from 'next';
import { LeadsPage } from '@/components/admin/LeadsPage';

export const metadata: Metadata = { title: 'Leads' };

export default function AdminLeadsPage() {
  return <LeadsPage />;
}
