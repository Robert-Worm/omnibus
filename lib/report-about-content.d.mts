import type { Framework, Line } from './framework-types.js';
export function reportAboutContent(workspaces?: {id: string; title: string}[], lines?: Line[]): {
  intro: string; focus: string; audience: string; use: string; titles: string[];
};
export function reportSourceGuidance(framework?: Pick<Framework,'report'|'limitations'>): {
  curated: boolean;
  cards: {title: string; action: string; meaning: string; notes?: string[]}[];
};
