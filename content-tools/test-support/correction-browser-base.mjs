// Browser-capable EMPTY synthetic base for correction acceptance only. No real
// sources, authored norms or review decisions are imported from another DB.
import { readFileSync } from "node:fs";
import { CatalogueRepository } from "../../local-data/repository.mjs";
import { readRuntimePublication, publishRuntime } from "../../local-data/runtime-publication.mjs";
import { runtimeContract } from "../../lib/runtime-contract.mjs";
import { runtimeContractHash } from "../../lib/runtime-contract-identity.mjs";
export function prepareCorrectionBrowserBase(f) {
  const pins = JSON.parse(readFileSync(f.options.base)), repository = new CatalogueRepository(f.baseline.databasePath);
  try {
    const content = readRuntimePublication(repository, { ...pins, contract: runtimeContractHash }), m = content.modules;
    for (const [id, entry] of Object.entries(runtimeContract)) if (entry.kind === "exports") {
      m[id] = Object.fromEntries(entry.names.map(name => [name, /Groups$|Records$|Items$|LegacyOriginKeys$|Replacements$|Questions$|Sectors$|RelatedContext$/.test(name) ? [] : {}]));
    }
    const empty = () => ({ source_identity: { source_id: "EMPTY-SYNTHETIC" }, points: [], criteria: [], objectives: [], goals: [], issues: [], source_dispositions: [] });
    Object.assign(m, {
      "lib/cio-content.mjs": { catalogue: empty(), bank: { records: [] }, pages: [], issues: { issues: [] },
        status: { title: "Empty synthetic source", current_consolidation_verification: { display_note: "No real source" } }, editorial: {}, pointControls: {}, rowControls: {} },
      "lib/wwke-content.mjs": empty(),
      "lib/wwke-reviewed/source-bank.json": { records: [] },
      "lib/wwke-reviewed/filters.json": { point_mappings: [], vocabularies: { sectors: [] }, predicates: { government_navigation: { default_modes: [] } } },
      "lib/wwke-reviewed/context.json": { title: "Empty synthetic source", consolidation: {}, official_publication: { identifier: "SYNTHETIC" }, dates: {}, commencement_evidence: {} },
      "lib/wwke-reviewed/pages.json": { pages: [] },
      "lib/wwke-reviewed/impact.json": { issues: [] },
      "lib/foundations/registry.mjs": { importedFoundationItems: [], importedFoundationMetadata: {}, foundationQuestionPlans: {} },
      "lib/foundations/dorafc-context.mjs": { workbook: { document: {}, refs: {}, entries: {} }, law: { refs: {}, entries: {} }, notices: {} },
      "lib/foundations/eed-versioned-passages.mjs": { historical: {}, eedItems: [], eedDocuments: [], rows: [] },
      "lib/foundations/group-definitions.mjs": { cioGroupDescriptions: {}, topicalDescriptions: {} },
      "lib/foundations/cio-execution-review.mjs": { cioInitialExecutionMerges: {}, cioFollowupExecutionMerges: {} },
      "lib/foundations/cio-source-review.mjs": { cioAdditionalRefs: {}, cioCommentaryPassages: {}, cioPreferredPassages: {}, cioAdditionalPages: {} },
      "lib/foundations/cio-titles.mjs": { cioGroupTitles: {}, cioCriterionTitles: {} },
      "lib/foundation-reference-only.mjs": { referenceOnlySources: [], isoRiskHistoricalReferences: {}, ismsHistoricalReferences: {}, cobitHistoricalReferences: {} },
      "lib/foundation-reader.mjs": { documents: [], references: {} },
      "lib/foundation-passage-history.mjs": { histories: {} },
      "lib/cio-source-document.mjs": { pages: [] },
      "lib/process-catalogue.mjs": { processes: [], processResearchTopics: {}, sourceDomains: {} },
      "lib/theme-curation.json": { version: "synthetic", themes: [], parents: [] },
      "lib/theme-workspaces.mjs": { presets: [] },
      "lib/research-flow.mjs": { groups: [], centralSuggestion: "Fictief onderzoek" },
      "lib/control-objectives.mjs": { controlObjectives: {}, objectiveAssignments: {} },
      "lib/model-library.mjs": { models: [], preInterviewReview: {}, prePracticalCevQuestions: {}, previousActiveQuestions: {}, activeIntegrityDimensions: [] },
      "lib/cev-active.mjs": { reviewed: { items: [] }, unreviewed: { items: [] }, activeIntegrityDimensions: [], prePracticalCevQuestions: {} },
      "lib/interview-practice-review.mjs": { reviewed: { items: [] }, previousKotterBarrier: {} },
      "lib/question-formulations.mjs": { clauses: {}, strategicExperience: "Fictief" },
      "lib/cev-content.mjs": { cevMetadata: {}, indicatorContent: {}, levelWording: {} },
      "lib/report-point-adapter.mjs": { generic: {} },
      "lib/report-about-content.mjs": { themes: {}, audiences: {}, curated: {} },
      "lib/cio-question-detail.mjs": { cioBroadQuestionGroups: [], cioSpecificQuestions: [] },
      "lib/point-interview.mjs": { cioTopics: {}, wwkeTopics: {} },
      "lib/wwke-readable-criteria.mjs": { wwkeReadableCriteria: {} },
    });
    m["lib/foundations/dorafc-context.json"] = structuredClone(m["lib/foundations/dorafc-context.mjs"]);
    m["app/report-quality-revisions.json"] = { version: "synthetic", entries: [] };
    m["app/cio-quality-revisions.json"] = { entries: [], edits: [] };
    m["app/wwke-quality-revisions.json"] = { entries: [], edits: [] };
    m["lib/foundation-passage-history.mjs"] = Object.fromEntries([
      ...["history", "wooHistory", "wdoHistory", "archiefHistory", "wwkeHistory", "wbkHistory", "wpgHistory", "wjsgHistory", "bio2History", "cloudHistory", "awHistory", "csrdHistory"].map(key => [key, { entries: [] }]),
      ...["aiaItems", "wooItems", "wdoItems", "wdoFutureItems", "archiefItems", "wwkeItems", "wbkItems", "wpgItems", "wjsgItems", "bio2Items", "cloudItems", "awItems", "csrdItems"].map(key => [key, []]),
    ]);
    for (const id of Object.keys(m)) if (id.endsWith('-catalogue.json')) m[id] = { ...m[id], theme: {}, process_mappings: [], points: [], sources: [], blocks: [], reports: [], interview_questions: [], visual_sources: [] };
    const publication = publishRuntime(repository, content, { release: pins.release, contract: runtimeContractHash });
    f.save("base.json", { ...pins, publication });
  } finally { repository.close(); }
}
