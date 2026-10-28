import test, { after } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
import { sourceRuntimeFixture } from "./test-support/local-source-runtime-fixture.mjs";
import { buildLocalDatabase } from "./local-database.mjs";
import { CatalogueRepository } from "../local-data/repository.mjs";
import { readRuntimePublication } from "../local-data/runtime-publication.mjs";
import { webResource } from "../local-data/web-resources.mjs";
import { runtimeContractHash } from "../lib/runtime-contract-identity.mjs";
import { hydratedModule } from "./local-source-runtime.mjs";
import { serializeProject, parseProjectText } from "../lib/project-codec.mjs";

const fixture = await sourceRuntimeFixture({ after }, "report"), built = await buildLocalDatabase(fixture.options);
const reader = new CatalogueRepository(built.database, { readOnly: true });
let additions;
try {
  const content = readRuntimePublication(reader, { ...built, contract: runtimeContractHash });
  const resources = Object.fromEntries(Object.entries(content.refs).map(([key, ref]) => [key, webResource(reader, built.release, ref.hash)]));
  additions = hydratedModule({ content, resources }, "app/report-additions.json");
} finally { reader.close(); }
const viewer = { additions, catalogue: { ...additions.catalogue, interview_questions: additions.interview_questions, visual_sources: additions.visual_sources } };
const root = new URL("../", import.meta.url).href;
// Run the real report, investigation, draft and project adapters. Replace only
// absent catalogue inputs and unrelated model/law content with fictitious data.
register("data:text/javascript," + encodeURIComponent(`
 const root=${JSON.stringify(root)}, additions=${JSON.stringify(viewer.additions)};
 const empty={corpus:[],themes:[],researchPresets:[],researchGroups:[],scopeSnapshots:{},scopeDecisions:{}};
 Object.assign(additions,{themes:[],researchPresets:[],scopeSnapshots:{},scopeDecisions:{}});
 const json=value=>({url:'data:application/json,'+encodeURIComponent(JSON.stringify(value)),shortCircuit:true});
 const source=value=>({url:'data:text/javascript,'+encodeURIComponent(value),shortCircuit:true});
 export function resolve(specifier,context,next){
  if(specifier==='omnibus-data:lib/report-point-adapter.mjs')return json({generic:{}});
  if(specifier==='omnibus-data:lib/control-objectives.mjs')return json({controlObjectives:{},objectiveAssignments:{}});
  if(specifier==='omnibus-data:lib/theme-workspaces.mjs')return json({presets:[]});
  if(specifier.endsWith('/report-additions.json'))return json(additions);
  if(specifier.endsWith('/reviewed-reports.json'))return json(empty);
  if(['/report-objectives.json','/organizational-goals.json','/product-scope-snapshots.json'].some(s=>specifier.endsWith(s)))return json({});
  const fixtures={
   'report-point-catalogue.mjs':'export default '+JSON.stringify({...additions.catalogue,interview_questions:additions.interview_questions,visual_sources:additions.visual_sources})+';',
   'interview-structure.mjs':'export const starrPrompts=()=>[],modelStarrPrompts=()=>[],interviewLevels=[];',
   'foundations/registry.mjs':'export const importedFoundationItems=[],importedFoundationMetadata={};',
   'process-catalogue.mjs':'export const processes=[],activeProcesses=[];',
   'cio-law-data.mjs':'export const cioMetadata={id:"SYNTHETIC_CIO"},cioProposals=[],cioPoints=[],cioReviewBasis="synthetic";',
   'cio-content.mjs':'export function validateCioEditorialTrace(){throw Error("Unexpected CIO source");}',
   'topical-content.mjs':'export const topicalMetadata=[],topicalProposals=[],topicalIds=[];export function validateTopicalMaterial(){throw Error("Unexpected topical source");}',
   'wwke-law-data.mjs':'export const wwkeMetadata={id:"SYNTHETIC_WWKE"},wwkeProposals=[],wwkeSourceId="SYNTHETIC_WWKE";export function validateWwkeMaterial(){throw Error("Unexpected law source");}',
   'report-quality-revisions.mjs':'export const revisedReportLine=l=>l,reportInterviewReviews=()=>({});',
   'research-flow.mjs':'export const subSuggestions=()=>[];'
  };
  for(const [file,code] of Object.entries(fixtures))if(specifier.endsWith('/'+file))return source(code);
  for(const file of ['control-objectives.mjs','theme-workspaces.mjs'])if(specifier.endsWith('/'+file))
   return next(new URL('lib/content-adapters/'+file,root).href,context);
  if(specifier.startsWith('@/'))return next(new URL(specifier.slice(2),root).href,context);
  return next(specifier,context);
 }
 export function load(url,context,next){
  // Runtime data imports are JSON values in the normal build plugin as well.
  if(url.startsWith('data:application/json,')&&context.importAttributes.type!=='json')
   return {format:'module',source:'export default '+decodeURIComponent(url.split(',')[1])+';',shortCircuit:true};
  return next(url,context);
 }
`), import.meta.url);
const { setReportPointSelection } = await import("../lib/content-adapters/report-point-adapter.mjs");
const { emptyDraft, validateDraft, updateValue } = await import("../lib/framework-model.mjs");
const { materialLine } = await import("../lib/investigation.mjs");
const {currentReportPointInterview} = await import('../lib/report-point-source.mjs');
const { addQuestion, linkQuestionLines } = await import("../lib/research-plan.mjs");
const { makeProject, readProject } = await import("../lib/project-session.mjs");
const { sourceEvidenceIds, validateSourceItems } = await import("../lib/framework-source-items.mjs");
const framework = { version: "synthetic", content_hash: "a".repeat(64), title: "Fictief lokaal onderzoek",
  report: { id: "SYNTHETIC_BASE", source_hash: "b".repeat(64) }, lines: [], evidence: [] };
const restore = text => readProject(parseProjectText(text), null, {
  restoreDraft: value => validateDraft(value, framework),
  restoreModels: value => { assert.deepEqual(value, { models: [] }); return value; }, themes: [] }).project;

test("new local report database reaches existing selection, questions and project restoration without changing its source", () => {
  const before = structuredClone(viewer), id = viewer.catalogue.points[0].id;
  assert.equal(validateSourceItems(additions.corpus[0].framework), true);
  assert.deepEqual(sourceEvidenceIds(additions.corpus[0].framework.lines[0]), ["E1"]);
  let draft = setReportPointSelection(emptyDraft(framework), viewer.catalogue, [id], true, "source");
  const material = draft.investigation.materials[0];
  assert.equal(material.body, fixture.input.app.framework.lines[0].criterion.text);
  assert.equal(material.controlObjective, fixture.input.reuse.control_objectives[0].text);
  assert.equal(material.question, fixture.input.reuse.interview_questions[0].text);
  assert.equal(currentReportPointInterview(material),fixture.input.reuse.interview_questions[0].text);
  assert.equal(currentReportPointInterview({...material,question:'Mijn eigen vraag'}),undefined);
  assert.equal(material.testDesign, ""); assert.equal(material.testExistence, ""); assert.equal(material.testOperation, "");
  assert.match(material.procedure, /^ONDERZOEK\n/);
  assert.match(material.sourceContext, /Alleen bij een melding/);
  assert.equal(JSON.parse(material.reportTrace).relations[0].quote, fixture.input.app.framework.evidence[0].quote);
  draft = updateValue(draft, materialLine(material), "criterion", "Eigen aangescherpte norm voor dit onderzoek.");
  draft.notes[material.id] = "Eigen notitie.";
  const question = addQuestion(draft, null, "Hoe worden meldingen in deze organisatie afgehandeld?");
  draft = linkQuestionLines(question.draft, question.question.id, [material.id]);
  const project = makeProject(draft, { models: [] }, { openIds: [], activeId: null }, { page: "framework" });
  const restored = restore(serializeProject(project));
  assert.deepEqual(restored.draft.included, draft.included);
  assert.deepEqual(restored.draft.overrides, draft.overrides);
  assert.deepEqual(restored.draft.notes, draft.notes);
  assert.deepEqual(restored.draft.research, draft.research);
  assert.deepEqual(restored.draft.investigation, draft.investigation);
  const removed = setReportPointSelection(restored.draft, viewer.catalogue, [id], false);
  assert.deepEqual(removed.included, []);
  const selected = setReportPointSelection(removed, viewer.catalogue, [id], true);
  assert.equal(selected.investigation.materials.length, 1);
  assert.deepEqual(selected.overrides, draft.overrides);
  assert.deepEqual(selected.research, draft.research);
  assert.deepEqual(selected.investigation, draft.investigation);
  assert.deepEqual(viewer, before);
  for (const tamper of [trace => { trace.relations[0].quote = "Veranderd"; }, trace => { trace.questions = []; },
    trace => { trace.limitations = []; }, trace => { trace.pdf_hash = "f".repeat(64); }]) {
    const bad = structuredClone(project), stored = bad.draft.investigation.materials[0], trace = JSON.parse(stored.reportTrace);
    tamper(trace); stored.reportTrace = JSON.stringify(trace);
    assert.throws(() => restore(serializeProject(bad)), /bronlocatie|beoordeelde/);
  }
});
