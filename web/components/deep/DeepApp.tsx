'use client';

import { FormRunner } from '@/components/forms/FormRunner';
import { syncCheck } from '@/lib/checks';
import { computeDeep, DEEP_SECTIONS, withStage1 } from '@/lib/deep';
import { useDeep } from '@/lib/forms';
import { useCheck } from '@/lib/store';

/** Stage 2: the client's real numbers, after their Stage 1 report. */
export function DeepApp() {
  const stage1 = useCheck((s) => s.answers);
  return (
    <FormRunner
      sections={DEEP_SECTIONS}
      useStore={useDeep}
      stage1={stage1}
      eyebrow="Stage 2"
      resultsHref="/deep/results"
      onSubmit={async () => {
        const answers = useDeep.getState().answers;
        await syncCheck('deep', useDeep, computeDeep(answers, stage1).points, withStage1(answers, stage1));
      }}
    />
  );
}
