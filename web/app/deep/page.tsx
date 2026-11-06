import type { Metadata } from 'next';
import { DeepApp } from '@/components/deep/DeepApp';

export const metadata: Metadata = { title: 'Stage 2 · Your real numbers' };

export default function DeepPage() {
  return <DeepApp />;
}
