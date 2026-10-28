import test from "node:test";
import assert from "node:assert/strict";
import { projectLocalReportViewer, reportViewerFiles } from "./local-report-viewer.mjs";
import { checkLocalSourceReview, LocalSourceIntegrationRequired } from "./local-source-review.mjs";
import { reportViewerFixture } from "./test-support/local-report-viewer-fixture.mjs";
import { refreshSyntheticReviewHashes } from "./test-support/local-source-passages-fixture.mjs";
import { syntheticReportQuestions } from "./test-support/local-report-questions.mjs";
import {reportPointInterviewPresentation} from '../lib/source-question-presentation.mjs';

test('no suitable point interview is explicitly withheld, never silently absent or replaced with filler',()=>{
  const {input}=reportViewerFixture();
  input.reuse.interview_questions=[];input.projection.interview_questions=[];input.locators[0].question_ids=[];
  syntheticReportQuestions(input.app.framework,input.reuse);
  const result=projectLocalReportViewer(input), point=result.catalogue.points[0], report=input.app.framework.report;
  const catalogue={...result.catalogue,interviewReviews:result.additions.interviewReviews};
  assert.equal(reportPointInterviewPresentation(catalogue,{originKey:'report-point:'+point.id,sourcePointId:point.id,
    sourceHash:report.source_hash,edition:String(report.year),question:''}),'');
  input.reuse.interviewReviews[point.id].reviews[0].decision='behouden';
  assert.throws(()=>projectLocalReportViewer(input),/question review publication/);
  delete input.reuse.interviewReviews[point.id];
  assert.throws(()=>projectLocalReportViewer(input),/incomplete report interview coverage/);
});

test('point probes retain their exact opening and scope binding',()=>{
  const {input}=reportViewerFixture(), q=input.reuse.interview_questions[0];
  q.follow_up='Waar is dit vastgelegd?';
  syntheticReportQuestions(input.app.framework,input.reuse);
  const result=projectLocalReportViewer(input), point=result.catalogue.points[0], report=input.app.framework.report;
  const text=reportPointInterviewPresentation({...result.catalogue,interviewReviews:result.additions.interviewReviews},
    {originKey:'report-point:'+point.id,sourcePointId:point.id,sourceHash:report.source_hash,edition:String(report.year),question:q.text});
  assert.equal(text,q.text+'\n\nDoorvragen:\n'+q.follow_up);
  q.follow_up='Wie behandelde de melding?';
  assert.throws(()=>projectLocalReportViewer(input),/question review publication/);
});

test("existing report reuse packet supplies the shared viewer without authoring or admission", () => {
  const f = reportViewerFixture(), before = structuredClone(f.input);
  const { additions, catalogue } = projectLocalReportViewer(f.input);
  assert.deepEqual(additions.corpus, [f.input.app]);
  assert.deepEqual(catalogue, f.input.projection);
  assert.deepEqual(additions.control_objectives, f.input.reuse.control_objectives);
  assert.deepEqual(additions.locators, f.input.locators);
  assert.equal(catalogue.points[0].review_status, "SYNTHETIC_NOT_ADMITTED");
  assert.equal(catalogue.points[0].phases.opzet.status, "NOT_SELECTED");
  assert.equal(catalogue.points[0].phases.werking.status, "NOT_SELECTED");
  assert.equal(catalogue.points[0].phases.onderzoek.evidence, "");
  additions.corpus[0].source.pages[0].text = "Changed copy";
  catalogue.points[0].source_context.local = "Changed copy";
  assert.deepEqual(f.input, before);
  const checked = checkLocalSourceReview(f.manifest, f.files, f.authorIds);
  assert.equal(checked.viewerShapeValidated, true);
  for (const key of ["sourceMethodValidated", "reviewValidated", "newContentApproval", "publishable"]) assert.equal(checked[key], false);
  assert.match(new LocalSourceIntegrationRequired(checked).message, /HOLD/);
});

for (const [name, change, message] of [
  ["missing reuse object", f => { f.reuse = null; }, /missing report or reuse/],
  ["changed norm", f => { f.projection.blocks[0].criterion = { text: "Different norm" }; }, /norm/],
  ["changed line", f => { f.projection.blocks[0].line = { ...f.app.framework.lines[0], title: "Different" }; }, /APP-FINAL/],
  ["missing goal", f => { f.reuse.organizational_goals = []; }, /authored goal/],
  ["missing restore relationships", f => { delete f.app.framework.lines[0].relationships; }, /source relationships/],
  ["unknown relationship evidence", f => { f.app.framework.lines[0].relationships = [{ evidence_ids: ["unknown"] }]; }, /source relationships/],
  ["missing control objective", f => { f.reuse.control_objectives = []; }, /authored goal/],
  ["duplicate control assignment", f => { f.reuse.control_objectives.push({ ...f.reuse.control_objectives[0], id: "another" }); }, /ambiguous/],
  ["control copied as objective", f => { f.reuse.control_objectives[0].text = f.app.framework.lines[0].control.text; }, /duplicates/],
  ["changed points", f => { f.projection.points = [{ ...f.projection.points[0], text: "Changed" }]; }, /authored reuse/],
  ["missing phase", f => { delete f.projection.points[0].phases.opzet; }, /phase/],
  ["empty executable phase", f => { f.projection.points[0].phases.onderzoek.procedure = ""; }, /phase/],
  ["missing context", f => { f.projection.points[0].source_context.local = ""; }, /context/],
  ["changed source material", f => { f.projection.sources[0].quote = "Different"; }, /nonliteral/],
  ["wrong source page", f => { f.projection.sources[0].page_end = 1; }, /boundaries/],
  ["changed precise quote", f => { f.locators[0].relations[0].quote = "Changed"; }, /nonliteral/],
  ["wrong PDF", f => { f.locators[0].pdf_hash = "f".repeat(64); }, /different source/],
  ["missing locator", f => { f.locators = []; }, /coverage/],
  ["missing evidence", f => { f.app.framework.evidence = []; }, /unresolved/],
  ["unresolved source", f => { f.projection.points[0].source_links[0].material_id = "missing"; }, /unresolved/],
  ["question moved to unknown point", f => { f.reuse.interview_questions[0].point_ids = ["missing"]; }, /unresolved/],
  ["missing question link", f => { f.locators[0].question_ids = []; }, /question links/],
  ["foreign visual context", f => { f.reuse.visual_sources.push({ id: "V", report_id: "OTHER" }); f.projection.visual_sources = f.reuse.visual_sources; }, /visual context/],
]) test("report viewer refuses " + name, () => {
  const { input } = reportViewerFixture(); change(input);
  assert.throws(() => projectLocalReportViewer(input), message);
});

test("reuse inputs must all belong to the exact final review basis", () => {
  for (const name of reportViewerFiles) {
    const f = reportViewerFixture(), basis = f.read("REVIEW-BASIS.json");
    delete basis.files[name]; f.set("REVIEW-BASIS.json", basis); refreshSyntheticReviewHashes(f);
    assert.throws(() => checkLocalSourceReview(f.manifest, f.files, f.authorIds), /incomplete frozen/);
  }
  const f = reportViewerFixture(), reuse = f.read(reportViewerFiles[0]);
  reuse.control_objectives[0].text = "Changed after review"; f.set(reportViewerFiles[0], reuse);
  assert.throws(() => checkLocalSourceReview(f.manifest, f.files, f.authorIds), /changed frozen dependency/);
});

test("three-phase packets and repeated evidence in different roles retain their exact authored form", () => {
  const { input } = reportViewerFixture(), point = input.projection.points[0];
  point.phases.opzet = point.phases.onderzoek;
  delete point.phases.onderzoek;
  const context = { ...point.source_links[0], role: "PARENT_CONTEXT", context_scope: "PARENT_CRITERION" };
  point.context_source_links.push(context);
  input.locators[0].relations.push({ ...input.locators[0].relations[0], ...context });
  syntheticReportQuestions(input.app.framework,input.reuse);
  const projected = projectLocalReportViewer(input);
  assert.deepEqual(projected.catalogue.points[0], point);
  assert.equal(projected.additions.locators[0].relations.length, 2);
  assert(!Object.hasOwn(projected.catalogue.points[0].phases, "onderzoek"));
  input.locators[0].relations.reverse();
  assert.throws(() => projectLocalReportViewer(input), /changed point relation/);
});
