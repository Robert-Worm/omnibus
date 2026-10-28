import test from 'node:test';
import assert from 'node:assert/strict';
import {register} from 'node:module';
import {questionReviewFixture} from './test-support/question-review-fixture.mjs';
import {reportInterviewText,reportPointInterviewPresentation} from './source-question-presentation.mjs';

const hash='a'.repeat(64),opening='Hoe verloopt de overdracht?',probe='Wie ontving het dossier?';
const receipt=(itemId,questions,decisions)=>questionReviewFixture({sourceId:'SYNTHETIC',itemId,
 sourceEdition:'2026',sourceHash:hash,questions,decisions});
const input={version:'synthetic',entries:[],interviewReviews:{
 PARENT:receipt('PARENT',[{id:'auditQuestion',kind:'interview',text:opening}]),
 POINT:receipt('POINT',[{id:'new-opening',kind:'interview',text:opening},
  {id:'new-opening:follow_up',kind:'doorvraag',text:probe}]),
}};
const dataUrl='data:application/json,'+encodeURIComponent(JSON.stringify(input));
register('data:text/javascript,'+encodeURIComponent(`
 export function resolve(specifier,context,next){
  if(context.parentURL?.endsWith('/report-quality-revisions.mjs')&&specifier.endsWith('/report-quality-revisions.json'))
   return {url:${JSON.stringify(dataUrl)},shortCircuit:true};
  if(context.parentURL?.endsWith('/report-point-source.mjs')){
   if(specifier==='./report-point-catalogue.mjs')return {url:'data:text/javascript,export default globalThis.reportInterviewCatalogue;',shortCircuit:true};
   if(specifier.endsWith('/report-additions.json'))return {url:'data:application/json,%7B%22catalogue%22:%7B%22points%22:%5B%5D%7D,%22interview_questions%22:%5B%5D%7D',shortCircuit:true};
  }
  return next(specifier,context);
 }
`),import.meta.url);
const {revisedReportLine,reportInterviewReviews}=await import('./report-quality-revisions.mjs');
const revisions=(await import(dataUrl,{with:{type:'json'}})).default;

test('local parent reviews are read without changing source rows and cannot override a current negative review',()=>{
 const source={id:'SYNTHETIC',year:2026,source_hash:hash};
 const line={id:'OWN-PARENT',report_id:source.id,auditQuestion:{text:'Original source audit question'}};
 const local={'OWN-PARENT':receipt('OWN-PARENT',[{id:'auditQuestion',kind:'interview',text:opening}])};
 const before=structuredClone(line);
 assert.equal(reportInterviewText(revisedReportLine(line,source,local)),opening);
 assert.deepEqual(line,before);
 revisions.interviewReviews['OWN-PARENT']=null;
 assert.equal(reportInterviewText(revisedReportLine(line,source,local)),'');
 delete revisions.interviewReviews['OWN-PARENT'];
 assert.equal(reportInterviewText(revisedReportLine(line,{...source,year:2027},local)),'');
});

test('local norm probes are offered only with their approved opening and receipt',()=>{
 const source={id:'SYNTHETIC',year:2026,source_hash:hash},line={id:'LOCAL',report_id:'SYNTHETIC',auditQuestion:{text:'Original'}};
 const local={LOCAL:receipt('LOCAL',[{id:'auditQuestion',kind:'interview',text:opening},
   {id:'auditQuestion:follow_up',kind:'doorvraag',text:probe}])};
 assert.equal(reportInterviewText(revisedReportLine(line,source,local)),opening+'\n\nDoorvragen:\n'+probe);
 local.LOCAL.reviews[1].decision='HOLD';
 assert.equal(reportInterviewText(revisedReportLine(line,source,local)),opening);
 local.LOCAL.reviews[0].decision='HOLD';
 assert.equal(reportInterviewText(revisedReportLine(line,source,local)),'');
});

test('parent interview receipts are separate from source fields and bound to the current report',()=>{
 const line={id:'PARENT',report_id:'SYNTHETIC',auditQuestion:{text:'Original audit wording'},criterion:{text:'Original norm'}};
 const before=structuredClone(line),source={id:'SYNTHETIC',year:2026,source_hash:hash};
 assert.equal(reportInterviewText(revisedReportLine(line)),'','No source metadata means no new receipt attached');
 const revised=revisedReportLine(line,source);
 assert.equal(reportInterviewText(revised),opening);assert.deepEqual(line,before);
 assert.equal(revised,line);assert(!Object.hasOwn(line,'interviewReview'));
 assert.deepEqual(revised.criterion,line.criterion);assert.deepEqual(revised.auditQuestion,line.auditQuestion);
 assert.equal(reportInterviewText(revisedReportLine(line,{...source,source_hash:'b'.repeat(64)})),'');
 assert.equal(reportInterviewText(revisedReportLine(line,{...source,year:2027})),'');
 const original=revisions.interviewReviews.PARENT;
 for(const invalid of [null,{}, {...original,itemId:'OTHER'}]){
  revisions.interviewReviews.PARENT=invalid;
  assert.equal(reportInterviewText(revisedReportLine(line,source)),'');
 }
 revisions.interviewReviews.PARENT=original;
});

test('point inventories add reviewed gaps and paired probes without changing saved source snapshots',()=>{
 const catalogue={points:[{id:'POINT',report_id:'SYNTHETIC'}],reports:[{id:'SYNTHETIC',year:2026,source_hash:hash}],
  interview_questions:[],interviewReviews:reportInterviewReviews()};
 const material={originKey:'report-point:POINT',sourcePointId:'POINT',edition:'2026',sourceHash:hash,question:''};
 const before=structuredClone({catalogue,material});
 assert.equal(reportPointInterviewPresentation(catalogue,material),opening+'\n\nDoorvragen:\n'+probe);
 assert.equal(reportPointInterviewPresentation(catalogue,{...material,question:'Eigen vraag'}),undefined);
 assert.equal(reportPointInterviewPresentation(catalogue,{...material,edition:'2025'}),undefined);
 assert.deepEqual({catalogue,material},before);
 const original=catalogue.interviewReviews.POINT;
 for(const decision of ['HOLD','herschrijven','schrappen']){
  const changed=structuredClone(original);changed.reviews[1].decision=decision;catalogue.interviewReviews.POINT=changed;
  assert.equal(reportPointInterviewPresentation(catalogue,material),opening);
  changed.reviews[0].decision=decision;assert.equal(reportPointInterviewPresentation(catalogue,material),'');
 }
 for(const invalid of [null,{}, {...original,sourceHash:'b'.repeat(64)}]){
  catalogue.interviewReviews.POINT=invalid;assert.equal(reportPointInterviewPresentation(catalogue,material),'');
 }
 catalogue.interviewReviews.POINT=original;
});

test('the real point reader includes the original catalogue, not only later additions',async()=>{
 globalThis.reportInterviewCatalogue={points:[{id:'POINT',report_id:'SYNTHETIC'}],
  reports:[{id:'SYNTHETIC',year:2026,source_hash:hash}],interview_questions:[]};
 const {currentReportPointInterview}=await import('./report-point-source.mjs');
 const material={originKey:'report-point:POINT',sourcePointId:'POINT',edition:'2026',sourceHash:hash,question:''};
 const before=structuredClone(globalThis.reportInterviewCatalogue);
 assert.equal(currentReportPointInterview(material),opening+'\n\nDoorvragen:\n'+probe);
 assert.equal(currentReportPointInterview({...material,sourceHash:'b'.repeat(64)}),undefined);
 assert.equal(currentReportPointInterview({...material,question:'Eigen tekst'}),undefined);
 assert.deepEqual(globalThis.reportInterviewCatalogue,before);
});
