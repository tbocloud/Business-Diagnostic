import type { Metadata } from 'next';
import { ErpApp } from '@/components/erp/ErpApp';

export const metadata: Metadata = { title: 'ERP check' };

export default function ErpPage() {
  return <ErpApp />;
}
