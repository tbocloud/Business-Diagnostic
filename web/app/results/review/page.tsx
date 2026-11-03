import type { Metadata } from 'next';
import { ReviewApp } from '@/components/review/ReviewApp';

export const metadata: Metadata = { title: 'Review' };

export default function ReviewPage() {
  return <ReviewApp />;
}
