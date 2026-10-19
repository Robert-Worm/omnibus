import type {Draft} from './framework-types';
export const GUIDE_SEEN_KEY: string;
export function claimGuideIntroduction(storage?: Pick<Storage, 'getItem' | 'setItem'> | null): boolean;
export type GuideStep = {id: string; title: string; text: string; label: string; page: string; target?: string; reason?: string};
export function contextualGuidance(options?: {
  page?: string; draft?: Draft; ready?: boolean; pendingQuestion?: boolean; storageBlocked?: boolean; hasModel?: boolean; hasOpenModel?: boolean;
  exportStatus?: {missing: {id: string; label: string} | null; validation: string} | null;
}): {title: string; explanation: string; next: GuideStep | null; pageLabel: string};
