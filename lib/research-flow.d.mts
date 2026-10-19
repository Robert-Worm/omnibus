import type { Draft, Framework } from './framework-types.js';
export type ResearchSuggestion = {key: string; text: string; ids: string[]};
export type NormDrag = {type: 'line'; lineId: string; from: string | null} |
  {type: 'group'; lineIds: string[]; from: string | null};
export function personalDraft(draft: Draft, framework: Framework): Draft;
export function centralSuggestion(): string;
export function subSuggestions(draft: Draft, parentId: string): ResearchSuggestion[];
export function subSuggestionReuseId(draft: Draft, parentId: string, key: string): string | null;
export function adoptSubSuggestion(draft: Draft, parentId: string, key: string): Draft;
export function normDrop(draft: Draft, payload: NormDrag | null, targetId: string, blocked?: boolean): {
  valid: boolean; action: 'cancel' | 'unlink' | 'copy' | 'move'; label: string;
};
export function applyGroupDrop(draft: Draft, payload: NormDrag | null, targetId: string, blocked?: boolean): Draft;
