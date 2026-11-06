'use client';

import { FormRunner } from '@/components/forms/FormRunner';
import { ensureCheck, syncCheck } from '@/lib/checks';
import { computeDeep, DEEP_SECTIONS, withStage1 } from '@/lib/deep';
import { useDeep } from '@/lib/forms';
import { useCheck } from '@/lib/store';

/** Stage 2: the client's real numbers, after their Stage 1 report. */
export function DeepApp() {
  const stage1 = useCheck((s) => s.answers);
  const profile = useCheck((s) => s.profile);
  const points = () => computeDeep(useDeep.getState().answers, stage1, profile.industry).points;
  const toSave = () => withStage1(useDeep.getState().answers, stage1, profile.industry);
  return (
    <FormRunner
      sections={DEEP_SECTIONS}
      useStore={useDeep}
      stage1={stage1}
      profile={profile}
      eyebrow="Stage 2"
      note={{
        title: 'Anything else about your numbers?',
        intro: 'A cost that worries you, a customer who never pays, a plan you are weighing up? Type it, or record a voice note — our team reads it with your figures.',
        example: 'Diesel and transport costs went up 30% this year and I haven’t passed it on.',
      }}
      ensureSaved={() => ensureCheck('deep', useDeep, points, toSave)}
      resultsHref="/deep/results"
      onSubmit={async () => {
        await syncCheck('deep', useDeep, points(), toSave());
      }}
    />
  );
}
