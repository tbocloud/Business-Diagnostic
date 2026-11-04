import type { Metadata } from 'next';
import { ErpResultsApp } from '@/components/erp/ErpResultsApp';

export const metadata: Metadata = { title: 'Your ERP check report' };

export default function ErpResultsPage() {
  return <ErpResultsApp />;
}
