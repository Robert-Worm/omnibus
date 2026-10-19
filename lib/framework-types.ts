export type Basis = "EXPLICIT" | "INFERRED" | "PROPOSED" | "NOT_ESTABLISHED";
export type ElementKey =
  | "objective"
  | "risk"
  | "controlObjective"
  | "control"
  | "criterion"
  | "finding"
  | "auditQuestion"
  | "procedure"
  | "owner";
export type Element = { text: string; basis: Basis; evidence_ids: string[]; reason: string };
export type Evidence = {
  id: string;
  report_id?: string;
  page: number;
  page_end?: number;
  start: number;
  end: number;
  quote: string;
  role: string;
};
export type Relation = {
  from: ElementKey;
  to: ElementKey;
  relation: string;
  basis: Basis;
  evidence_ids: string[];
  reason: string;
};
export type Status = { value: string; explanation: string; evidence_ids: string[] };
export type SourceItem = Element & {
  id: string;
  kind: BranchKind | "objective";
  parent_id: string | null;
  relationship: { basis: Basis; evidence_ids: string[]; reason: string; relation: string };
};
export type Line = {
  practicalRevision?: string;
  controlObjective?: Element;
  sourcePointId?: string;
  parentCriterion?: string;
  collectionGroup?: {id:string;title:string;sourceTitle:string};
  provisionStatus?:string;
  provisionStatusDetails?:string;
  source_id?: string;
  materialKind?: string;
  sourceControlId?: string;
  id: string;
  title: string;
  entity: string;
  report_id?: string;
  sourceItems?: SourceItem[];
  controlStatus: { design: Status; implementation: Status; operation: Status };
  relationships: Relation[];
} & Record<Exclude<ElementKey, "controlObjective">, Element>;
export type Pattern = {
  id: string;
  title: string;
  status: string;
  line_ids: string[];
  evidence_ids: string[];
  observation: string;
  boundary: string;
  counterevidence: string;
  report_count: number;
};
export type Report = {
  sourceDocumentHashes?:string;
  localPdf?: string;
  publication_date?: string;
  controlId?: string;
  context?: string;
  license?: string;
  changes?: string;
  url?: string;
  edition?: string;
  location?: string;
  id: string;
  title: string;
  year: number;
  source_hash: string;
  date?: string;
  pdf_hash?: string;
  scope?: string;
};
export type Framework = {
  scope_evidence_ids?: string[];
  reportContexts?: {report_id: string; evidence_ids: string[]}[];
  sources?: Report[];
  productScope?: string;
  version: string;
  content_hash: string;
  review_status: string;
  title: string;
  scope: string;
  report: Report;
  reports?: Report[];
  themes?: {
    id: string;
    title: string;
    keywords: string;
    lineIds: string[];
    reportIds: string[];
  }[];
  evidence: Evidence[];
  lines: Line[];
  patterns: Pattern[];
  gaps: string[];
  limitations: string[];
};
export type BranchKind = "risk" | "control" | "auditQuestion" | "procedure";
export type BranchItem = { id: string; kind: BranchKind; parent_id: string; text: string };
export type StructureNode = {
  id: string;
  kind: BranchKind | "objective";
  parent_id: string | null;
  text: string;
  isBase: boolean;
};
export type ResearchQuestion = {
  modelId?: string;
  modelSubject?: string;
  modelDimensionKey?: string;
  modelIndicatorIds?: string[];
  planKey?: string;
  planPartKey?: string;
  subquestionDetail?: 'broad' | 'specific';
  linkMode?: "manual" | "central" | "dimensions";
  researchDesign?: {direction: string; topic: string};
  subject?: string;
  id: string;
  parent_id: string | null;
  text: string;
  origin: "user" | "suggested";
};
export type ResearchPlan = {
  questions: ResearchQuestion[];
  links: { question_id: string; line_id: string }[];
};
export type Draft = {
  exportSettings?: Record<string, unknown>;
  investigation?: {
    version: number;
    purpose: string;
    scope: string;
    riskIntake?: {context:string;signals:string};
    goal?: {direction: string; subject: string; intendedUse: string};
    researchApproach?: {breadth?: string; lens?: string};
    processId?: string;
    sourceIds: string[];
    materials: Record<string, string>[];
    applicability?: {originKey: string; status: string; reason: string; evidence: string}[];
  };
  format: "rijksmap-framework-draft-v2";
  source_hash: string;
  baseline_id: string;
  title: string;
  included: string[];
  overrides: Record<string, Record<string, string>>;
  notes: Record<string, string>;
  branchItems: Record<string, BranchItem[]>;
  research?: ResearchPlan;
  excludedFields?: Record<string, string[]>;
};
