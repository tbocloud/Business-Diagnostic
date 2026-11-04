import type { Metadata } from 'next';
import { DeepResultsApp } from '@/components/deep/DeepResultsApp';

export const metadata: Metadata = { title: 'Your Stage 2 report' };

export default function DeepResultsPage() {
  return <DeepResultsApp />;
}
