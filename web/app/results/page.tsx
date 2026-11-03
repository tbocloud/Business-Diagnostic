import type { Metadata } from 'next';
import { ResultsApp } from '@/components/results/ResultsApp';

export const metadata: Metadata = { title: 'Your report' };

export default function ResultsPage() {
  return <ResultsApp />;
}
