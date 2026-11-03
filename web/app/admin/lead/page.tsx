'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { LeadPage } from '@/components/admin/LeadPage';

// Static hosting has no dynamic routes, so the lead id travels as ?id=123.
function LeadFromQuery() {
  const id = Number(useSearchParams()?.get('id') ?? 0);
  return <LeadPage key={id} id={Number.isFinite(id) ? id : 0} />;
}

export default function AdminLeadPage() {
  return (
    <Suspense fallback={null}>
      <LeadFromQuery />
    </Suspense>
  );
}
