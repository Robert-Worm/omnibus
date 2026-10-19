import type { Draft, Element, Line } from './framework-types.js';
export const controlObjectives: Record<string, {title: string; text: string; reason?: string}>;
export const objectiveAssignments: Record<string, string>;
export function controlObjectiveFor(line: Line): Element;
export function objectiveGroupFor(line: Line): {id: string; title: string; text: string} | null;
export function objectiveGroupsForDraft(lines: Line[], draft: Draft): Line[];
