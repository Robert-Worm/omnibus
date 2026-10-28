import test from 'node:test';
import assert from 'node:assert/strict';
import {register} from 'node:module';
import {questionReviewFixture} from './test-support/question-review-fixture.mjs';
import {sourceInterviewPresentation} from './source-question-presentation.mjs';
import {registerCatalogueResource,ensureCatalogue} from './catalogue-runtime.mjs';

// Only the unavailable source payload is fabricated. Exercise the real lazy
// catalogue projection and review gate, without touching a database or project.
const sourceId='SYNTHETIC-CIO',edition='synthetic-1',sourceHash='c'.repeat(64);
const point={id:'P1',criterion_id:'C1',objective_ids:[],selection_status:'SELECTABLE',
 title:'Synthetic point',text:'Synthetic source text',chapter:'Synthetic group',
 addressees:[],conditions:[],exceptions:[],source_links:[],phase_plans:{}};
const data={catalogue:{source_identity:{source_id:sourceId},criteria:[],objectives:[],points:[]},
 bank:{records:[]},status:{edition,official_pdf_byte_verification:{sha256:sourceHash},
  current_consolidation_verification:{display_note:'Synthetic edition'}},
 pointControls:{P1:{text:'Synthetic control'}}};
globalThis.cioInterviewFixture=data;
register('data:text/javascript,'+encodeURIComponent(`
 export function resolve(specifier,context,next){
  if(specifier==='omnibus-data:lib/cio-content.mjs')return {
   url:'data:text/javascript,'+encodeURIComponent('export default globalThis.cioInterviewFixture'),shortCircuit:true};
  if(specifier==='@/lib/cio-trace-validation.mjs')return {
   url:new URL('./cio-trace-validation.mjs',context.parentURL).href,shortCircuit:true};
  return next(specifier,context);
 }
`),import.meta.url);
const {cioProposals}=await import('./cio-law-data.mjs');
const wording='Hoe bereidt u een besluit over informatievoorziening voor?';
const receipt=()=>questionReviewFixture({sourceId,itemId:sourceId+':P1',sourceEdition:edition,sourceHash,
 questions:[{id:'questionManagement',kind:'interview',text:wording}]});
const offered=proposal=>sourceInterviewPresentation(proposal,{sourceId,itemId:proposal.originKey,
 questionId:'questionManagement',text:proposal.questionManagement,sourceEdition:proposal.edition,sourceHash:proposal.sourceHash}).text;

test('lazy CIO questions retain exact source identity and independent interview approval',async()=>{
 assert.equal(cioProposals.length,0);
 const original=structuredClone(point);
 registerCatalogueResource('synthetic-cio-points',async()=>true,()=>{
  data.catalogue.points.push(point);
  data.catalogue.criteria.push({id:'C1',text:'Synthetic criterion'});
  data.interviewReviews={P1:receipt()};
 });
 await ensureCatalogue(['synthetic-cio-points']);
 const proposal=cioProposals[0];
 assert.equal(proposal.edition,edition);
 assert.equal(proposal.sourceHash,sourceHash);
 assert.equal(proposal.interviewReview,data.interviewReviews.P1);
 assert.equal(offered(proposal),wording);
 assert.equal(proposal.question,'','The original audit question stays empty');
 assert.deepEqual(point,original,'Separate review must not alter source or saved trace');
 for(const invalid of [null,{}, {...receipt(),sourceHash:'d'.repeat(64)},
  {...receipt(),itemId:sourceId+':OTHER'}, {...receipt(),reviews:[]}]){
  registerCatalogueResource('synthetic-cio-invalid-'+JSON.stringify(invalid),async()=>true,()=>{data.interviewReviews.P1=invalid;});
  await ensureCatalogue(['synthetic-cio-invalid-'+JSON.stringify(invalid)]);
  assert(Object.hasOwn(cioProposals[0],'interviewReview'));
  assert.equal(offered(cioProposals[0]),'');
 }
 registerCatalogueResource('synthetic-cio-no-review',async()=>true,()=>{delete data.interviewReviews;});
 await ensureCatalogue(['synthetic-cio-no-review']);
 assert(!Object.hasOwn(cioProposals[0],'interviewReview'));
 assert.equal(offered(cioProposals[0]),'');
 assert.deepEqual(point,original);
});
