// Shared model state; types only, with no catalogue content or UI dependencies.
export type LibraryIndicator = {
  id: string;
  title: string;
  definition: string;
  documents: string;
  observation: string;
  included: boolean;
  origin?: string;
};
export type LibraryQuestion = {
  purpose?: string;
  id: string;
  dimensionId?: string;
  title: string;
  question: string;
  probes: string;
  included: boolean;
  indicatorId?: string;
  variants?: Record<string, string>;
  selectedLevels?: string[];
  formulationBase?: Record<string, string>;
  origin?: string;
  revision?: string;
};
export type LibraryItem = {
  definition?: string;
  relevance?: string;
  boundary?: string;
  id: string;
  title: string;
  question: string;
  probes: string;
  included: boolean;
  originalTitle?: string;
  questions?: LibraryQuestion[];
  indicators?: LibraryIndicator[];
};
export type LibraryModel = {
  physicalTasksRelevant?: boolean;
  researchSubject?: string;
  interviewLevel?: string;
  id: string;
  version: string;
  title: string;
  source: string;
  question: string;
  kind: string;
  selected: boolean;
  items: LibraryItem[];
  officialName?: string;
  author?: string;
  usage?: string;
  description?: string;
  limitation?: string;
  usageNotes?: string;
  sources?: { id: string; title: string; url: string; type?: string }[];
};
export type ModelLibraryState = { version: number; models: LibraryModel[] };
