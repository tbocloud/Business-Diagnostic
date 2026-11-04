'use client';

import { useEffect } from 'react';
import { FormRunner } from '@/components/forms/FormRunner';
import { syncCheck } from '@/lib/checks';
import { computeErp, ERP_SECTIONS } from '@/lib/erp';
import { useErp } from '@/lib/forms';
import { useCheck } from '@/lib/store';

/** The ERP check: on its own from the start page, or after Stage 1 / Stage 2. */
export function ErpApp() {
  const stage1 = useCheck((s) => s.answers);
  // Fill the contact step from Stage 1 on this device, when it's still empty.
  useEffect(() => {
    const { profile } = useCheck.getState();
    const { details, setDetails } = useErp.getState();
    if (!details.businessName && profile.businessName) setDetails({ businessName: profile.businessName });
    if (!details.ownerName && profile.ownerName) setDetails({ ownerName: profile.ownerName });
  }, []);
  return (
    <FormRunner
      sections={ERP_SECTIONS}
      useStore={useErp}
      stage1={stage1}
      eyebrow="ERP check"
      details={{ title: 'Where should we send your ERP plan?', intro: 'Your business and how to reach you — so the plan in your report goes to the right person.' }}
      resultsHref="/erp/results"
      onSubmit={async () => {
        await syncCheck('erp', useErp, computeErp(useErp.getState().answers).points);
      }}
    />
  );
}
