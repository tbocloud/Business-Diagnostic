'use client';

import { useEffect } from 'react';
import { FormRunner } from '@/components/forms/FormRunner';
import { ensureCheck, syncCheck } from '@/lib/checks';
import { computeErp, ERP_SECTIONS, erpToSave } from '@/lib/erp';
import { useErp } from '@/lib/forms';
import { useCheck } from '@/lib/store';

/** The ERP check: on its own from the start page, or after Stage 1 / Stage 2. */
export function ErpApp() {
  const stage1 = useCheck((s) => s.answers);
  const profile = useCheck((s) => s.profile);
  // Fill the contact step from Stage 1 on this device, when it's still empty.
  useEffect(() => {
    const { profile: p } = useCheck.getState();
    const { details, setDetails } = useErp.getState();
    if (!details.businessName && p.businessName) setDetails({ businessName: p.businessName });
    if (!details.ownerName && p.ownerName) setDetails({ ownerName: p.ownerName });
  }, []);
  const points = () => computeErp(useErp.getState().answers, profile).points;
  const toSave = () => erpToSave(useErp.getState().answers, profile);
  return (
    <FormRunner
      sections={ERP_SECTIONS}
      useStore={useErp}
      stage1={stage1}
      profile={profile}
      eyebrow="ERP check"
      note={{
        title: 'Anything else about your system?',
        intro: 'Something your software can’t do, a report you wish you had, a job you do by hand every day? Type it, or record a voice note — we will show you how ERPNext handles it.',
        example: 'We bill from Tally but stock is in Excel, and the two never match at month-end.',
      }}
      ensureSaved={() => ensureCheck('erp', useErp, points, toSave)}
      details={{ title: 'Where should we send your ERP plan?', intro: 'Your business and how to reach you — so the plan in your report goes to the right person.' }}
      resultsHref="/erp/results"
      onSubmit={async () => {
        await syncCheck('erp', useErp, points(), toSave());
      }}
    />
  );
}
