export type WwkeSpan={page:number;start:number;end:number;quote:string;[key:string]:unknown};
export type WwkeSourceRecord={
  id:string;
  title:string;
  locator:string;
  assertion:string;
  evidence_kind:string;
  conditions:string[];
  exceptions:string[];
  cross_references:string[];
  interpretation_notes:string[];
  xml_evidence?:{quote:string};
  xml_anchor?:string;
};
export type WwkeSourceIssue={id:string;status:string;severity:string;description:string;resolution:string};
// A display projection of the already-validated source trace, not a new saved schema.
export type WwkeSourceTrace={
  records?:WwkeSourceRecord[];
  issues?:WwkeSourceIssue[];
  assessment?:{mode?:string;basis?:string;boundary?:string};
};
export type WwkeLink={record_id:string;contribution:string;supported_clause:string;explanation:string;basis_code:string;basis_reason:string;derivation_reason?:string;interpretation_boundary?:string;unresolved_interpretation?:string;xml_anchor?:string;visible_spans:WwkeSpan[];[key:string]:any};
export type WwkePoint={id:string;criterion_id:string;title:string;text:string;basis:string;element:string;objective_ids:string[];addressees:{label:string;role:string;condition?:string}[];normative_kind:string;scope:string;conditions:string[];exceptions:string[];selection_status:string;selection_reason:string;source_links:WwkeLink[];phase_plans:Record<string,{status:string;action:string;expected_evidence:string;interpretation_boundary:string;reason:string}>;control_measure:{text:string;rationale:string};facets:{sectors:string[];target_roles:string[];government_relevance:string[]};[key:string]:any};
export const wwkeSourceId:string;
export const wwkeReviewBasis:string;
export const wwkePoints:WwkePoint[];
export const wwkePointMap:Map<string,WwkePoint>;
export const wwkeRecordMap:Map<string,WwkeSourceRecord>;
export const wwkeFilterMap:Map<string,any>;
export const wwkeLabels:Record<string,string>;
export const wwkeCatalogue:{points:WwkePoint[];criteria:{id:string;title:string;text:string;chapter:string;[key:string]:any}[];issues:{id:string;status:string;severity:string;description:string;resolution:string}[];[key:string]:any};
export const wwkeBank:any;
export const wwkePages:{page:number;text:string}[];
export const wwkeFilters:{vocabularies:Record<'sectors'|'target_roles'|'government_relevance',{id:string;definition:string}[]>;[key:string]:any};
// Fields consumed by the viewer, not a replacement for the full evidence schema.
export type WwkeDisplayContext={
  title:string;document_type:string;adopter:string;history:string;
  dates:Record<'adoption'|'publication'|'commencement'|'selected_consolidation'|'context_checked_on',string>;
  consolidation:{url:string};
  official_publication:{url:string;identifier:string};
  commencement_evidence:{boundary:string;url:string;identifier:string};
  scope:{government_boundary:string;navigation_boundary:string;extension:string};
  quality:{fresh_pdf_text_check:string;source_differences:string};
  limitations:string[];
};
export const wwkeContext:WwkeDisplayContext;
export const wwkeStatus:any;
export const wwkeReceipt:any;
export const wwkeMetadata:{id:string;title:string;kind:string;url:string;edition:string;usage:string;readiness:string;coverage:string;statusNote:string};
export const wwkeProposals:Array<{id:string;sourceId:string;originKey:string;title:string;body:string;auditNorm:string;topic:string;groupId:string;groupTitle:string;groupDescription:string;sourceControlId:string;sourcePointId:string;parentCriterion:string;reviewStatus:string;location:string;sourceContext:string;risk:string;control:string;question:string;procedure:string}>;
export function wwkePointContext(point:WwkePoint):{criterion:any;objectives:{id:string;text:string;risk:string}[];goals:{id:string;text:string}[];records:WwkeSourceRecord[];issues:WwkeSourceIssue[];issueUses:{issue_id:string;reason:string}[]};
export function wwkeMatches(point:WwkePoint,filters?:{sector?:string;role?:string;government?:string;includeGeneral?:boolean;query?:string}):boolean;
export function wwkeExcludedForSector(pointId:string,sector:string):boolean;
export function wwkeExactPassage(span:WwkeSpan):{before:string;quote:string;after:string}|null;
export function wwkePhaseText(plan:any):string;
export function validateWwkeAssessment(point:WwkePoint,assessment:any):any;
export function validateWwkeMaterial(material:any):void;
