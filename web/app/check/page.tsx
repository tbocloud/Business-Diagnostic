import type { Metadata } from 'next';
import { CheckApp } from '@/components/check/CheckApp';

export const metadata: Metadata = { title: 'Your check-up' };

export default function CheckPage() {
  return <CheckApp />;
}
