'use client';

import { checkApi } from './api';
import { type CheckKind, type FormState } from './forms';
import { normalizeAnswers } from './normalize';
import { useCheck } from './store';
import type { StoreApi, UseBoundStore } from 'zustand';

/**
 * Save a Stage 2 / ERP check to the team's database (and from there the CRM record).
 * Joins it to the Stage 1 check on this device when there is one. Never throws: the
 * client's own report works even when the server can't be reached.
 */
export async function syncCheck(
  kind: CheckKind,
  store: UseBoundStore<StoreApi<FormState>>,
  points: string[],
  /** What to save (default: the store's answers), e.g. with the Stage 1 figures Stage 2 builds on. */
  answers?: FormState['answers'],
): Promise<boolean> {
  const s = store.getState();
  const stage1 = useCheck.getState();
  const details = {
    businessName: s.details.businessName.trim() || stage1.profile.businessName.trim() || undefined,
    ownerName: s.details.ownerName.trim() || stage1.profile.ownerName?.trim() || undefined,
    phone: s.details.phone.trim() || undefined,
    email: s.details.email.trim() || undefined,
  };
  try {
    const res = await checkApi.submit({
      kind,
      submissionId: s.submissionId,
      token: s.submissionToken,
      parentId: stage1.submissionId,
      parentToken: stage1.submissionToken,
      details,
      answers: answers ?? s.answers,
      summary: { points },
    });
    store.getState().setSubmission(res.submissionId, res.token);
    return true;
  } catch (e) {
    console.warn(`Could not save the ${kind} check:`, e);
    return false;
  }
}

/** Answers from a report link (anyone can edit those): only well-formed entries. */
export function cleanFormAnswers(a: unknown) {
  return normalizeAnswers(a) ?? {};
}

