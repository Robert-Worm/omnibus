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
import { projectFoundationOverview } from "../scripts/foundation-overview-projection.mjs";
import {sourceQuestionPlanPresentation} from '../lib/source-question-plan.mjs';
import {sourceInterviewPresentation,sourceInterviewProbes} from '../lib/source-question-presentation.mjs';

const f = await sourceRuntimeFixture({ after }, "framework"), built = await buildLocalDatabase(f.options);
const reader = new CatalogueRepository(built.database, { readOnly: true });
let topical;
try {
  const content = readRuntimePublication(reader, { ...built, contract: runtimeContractHash });
  const resources = Object.fromEntries(Object.entries(content.refs).map(([key, ref]) => [key, webResource(reader, built.release, ref.hash)]));
  topical = hydratedModule({ content, resources }, "lib/topical-reviewed.json");
} finally { reader.close(); }
const root = new URL("../", import.meta.url).href;
// Only absent/unrelated corpus data is stubbed. The shared framework projection,
// selection, material trace validation, question links and project codec are real.
register("data:text/javascript," + encodeURIComponent(`
 const root=${JSON.stringify(root)}, topical=${JSON.stringify(topical)};
 const empty={corpus:[],themes:[],researchPresets:[],researchGroups:[],scopeSnapshots:{},scopeDecisions:{},locators:[],control_objectives:[],organizational_goals:[],interview_questions:[],visual_sources:[]};
 const json=value=>({url:'data:application/json,'+encodeURIComponent(JSON.stringify(value)),shortCircuit:true});
 const source=value=>({url:'data:text/javascript,'+encodeURIComponent(value),shortCircuit:true});
 export function resolve(specifier,context,next){
  if(specifier.endsWith('/topical-reviewed.json'))return json(topical);
  if(['/report-additions.json','/reviewed-reports.json'].some(s=>specifier.endsWith(s)))return json(empty);
  if(specifier.endsWith('/product-scope-snapshots.json'))return json({});
  if(specifier==='omnibus-data:lib/theme-workspaces.mjs')return json({presets:[]});
  if(specifier==='omnibus-data:lib/control-objectives.mjs')return json({controlObjectives:{},objectiveAssignments:{}});
  if(['/report-objectives.json','/organizational-goals.json'].some(s=>specifier.endsWith(s)))return json({});
  const fixtures={
   'report-point-catalogue.mjs':'export default {points:[],reports:[],interview_questions:[]};',
   'interview-structure.mjs':'export const starrPrompts=()=>[],modelStarrPrompts=()=>[],interviewLevels=[];',
   'foundations/registry.mjs':'export const importedFoundationItems=[],importedFoundationMetadata={};',
   'process-catalogue.mjs':'export const processes=[],activeProcesses=[];',
   'cio-law-data.mjs':'export const cioMetadata={id:"SYNTHETIC_CIO"},cioProposals=[],cioPoints=[],cioReviewBasis="synthetic";',
   'cio-content.mjs':'export function validateCioEditorialTrace(){throw Error("Unexpected CIO source");}',
   'wwke-law-data.mjs':'export const wwkeMetadata={id:"SYNTHETIC_WWKE"},wwkeProposals=[],wwkeSourceId="SYNTHETIC_WWKE";export function validateWwkeMaterial(){throw Error("Unexpected law source");}',
   'report-quality-revisions.mjs':'export const revisedReportLine=l=>l,reportInterviewReviews=()=>({});',
   'research-flow.mjs':'export const subSuggestions=()=>[];'
  };
  for(const [file,code] of Object.entries(fixtures))if(specifier.endsWith('/'+file))return source(code);
  if(specifier.endsWith('/theme-workspaces.mjs'))return next(new URL('lib/content-adapters/theme-workspaces.mjs',root).href,context);
  if(specifier.endsWith('/control-objectives.mjs'))return next(new URL('lib/content-adapters/control-objectives.mjs',root).href,context);
  if(specifier.startsWith('@/'))return next(new URL(specifier.slice(2),root).href,context);
  return next(specifier,context);
 }
 export function load(url,context,next){
  if(url.startsWith('data:application/json,')&&context.importAttributes.type!=='json')
   return {format:'module',source:'export default '+decodeURIComponent(url.split(',')[1])+';',shortCircuit:true};
  return next(url,context);
 }
`), import.meta.url);
const { topicalPackage, topicalRows, topicalGroups, topicalProposals } = await import("../lib/topical-content.mjs");
const { topicalRecordSources } = await import("../lib/topical-source-reader.mjs");
const { chooseTopicalPoints, topicalSelection } = await import("../lib/topical-selection.mjs");
const { emptyDraft, validateDraft, updateValue } = await import("../lib/framework-model.mjs");
const { materialLine } = await import("../lib/investigation.mjs");
const { addQuestion, linkQuestionLines } = await import("../lib/research-plan.mjs");
const { makeProject, readProject } = await import("../lib/project-session.mjs");
const framework = { version: "synthetic", content_hash: "a".repeat(64), title: "Fictief lokaal onderzoek",
  report: { id: "SYNTHETIC_BASE", source_hash: "b".repeat(64) }, lines: [], evidence: [] };
const restore = text => readProject(parseProjectText(text), null, { restoreDraft: value => validateDraft(value, framework),
  restoreModels: value => value, themes: [] }).project;

test("new framework database uses the CIO-shaped viewer, exact source, selection and project restoration", () => {
  const p = topicalPackage("FICTIEF"), before = structuredClone(p), point = p.catalogue.points[0];
  const rows = topicalRows(p), overview = projectFoundationOverview(p.id, { rows, points: p.catalogue.points, records: p.bank.records, groups: topicalGroups(p) });
  assert.equal(overview.rows[0].displayOnly, true); assert.deepEqual(rows[0].pointIds, [point.id]);
  const source = topicalRecordSources(p, p.bank.records[0]);
  assert.equal(source[0].passages.length, p.bank.records[0].source_spans.length);
  assert.equal(source[0].passages[0].quote, p.bank.records[0].source_spans[0].quote);
  let draft = chooseTopicalPoints(emptyDraft(framework), p.id, [point.id], true);
  assert.equal(topicalSelection(draft, p.id).all, true);
  const material = draft.investigation.materials[0];
  const identity={sourceId:p.id,sourceEdition:p.context.edition,sourceHash:p.documents[0].pdf_hash};
  const plan=sourceQuestionPlanPresentation(p.questionPlan,identity);
  assert.equal(plan.central,'Hoe worden meldingen afgehandeld?');
  assert.equal(plan.broadSubquestions.length,1);assert.equal(plan.subquestions.length,1);
  assert.deepEqual(plan.broadSubquestions[0].originKeys,[material.originKey]);
  const proposal=topicalProposals.find(row=>row.originKey===material.originKey);
  const interviewIdentity={...identity,itemId:material.originKey,questionId:'question'};
  assert.equal(sourceInterviewPresentation(proposal,interviewIdentity).text,'Hoe is de laatste melding afgehandeld?');
  assert.deepEqual(sourceInterviewProbes(proposal,interviewIdentity),['Welke gegevens zijn daarbij vastgelegd?']);
  assert.equal(material.controlObjective, p.catalogue.objectives[0].text);
  assert.equal(material.control, p.catalogue.objectives[0].control_measure);
  assert.equal(material.rationale, p.catalogue.goals[0].text);
  assert.match(material.sourceContext, /NORM_ADDRESSEE/); assert.match(material.sourceContext, /Geen echte verplichting/);
  assert.equal(material.testExistence, ""); assert.equal(material.testOperation, "");
  draft = updateValue(draft, materialLine(material), "criterion", "Eigen norm voor het onderzoek.");
  const question = addQuestion(draft, null, "Hoe worden meldingen toegewezen?");
  draft = linkQuestionLines(question.draft, question.question.id, [material.id]); draft.notes[material.id] = "Eigen notitie";
  const project = makeProject(draft, { models: [] }, { openIds: [], activeId: null }, { page: "framework" });
  const restored = restore(serializeProject(project));
  for (const key of ["included", "research", "investigation", "overrides", "notes"]) assert.deepEqual(restored.draft[key], draft[key]);
  const deselected = chooseTopicalPoints(restored.draft, p.id, [point.id], false);
  assert.deepEqual(deselected.included, []);
  assert.deepEqual(chooseTopicalPoints(deselected, p.id, [point.id], true).investigation, draft.investigation);
  for (const change of [m => { delete m.topicalTrace; }, m => {
    const trace = JSON.parse(m.topicalTrace); trace.point.exceptions = []; m.topicalTrace = JSON.stringify(trace);
  }, m => { m.sourceHash = "f".repeat(64); }]) {
    const bad = structuredClone(project); change(bad.draft.investigation.materials[0]);
    assert.throws(() => restore(serializeProject(bad)), /Topical/);
  }
  assert.deepEqual(p, before);
});
