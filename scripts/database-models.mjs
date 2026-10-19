import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {isDeepStrictEqual} from 'node:util';

const root=fileURLToPath(new URL('../',import.meta.url));
const clone=value=>JSON.parse(JSON.stringify(value));
const imp=(names,path)=>`import {${names}} from ${JSON.stringify(resolve(root,path))};\n`;

// Reuse the existing validation/migration functions, but prepare model author
// modules at build time. Published data must match the pinned database exactly.
export async function prepareModels({repository,release,files,special,move,read,arrayDefaults}){
 const {initialModelLibrary}=await import('../lib/model-library.mjs');
 const active=await import('../lib/cev-active.mjs');
 const models=initialModelLibrary().models;
 for(const model of models){
  const matches=repository.catalogue({release,kind:'model',query:model.id,limit:100}).filter(p=>p.id===model.id);
  if(matches.length!==1)throw Error('Exact model version missing: '+model.id);
  const version=matches[0].version;
  const metadata=JSON.parse(repository.db.prepare('SELECT payload FROM packages WHERE version=?').get(version).payload).metadata;
  const {items,...expected}=clone(model);
  if(!isDeepStrictEqual(metadata,expected))throw Error('Model metadata differs from pinned release: '+model.id);
  const rows=repository.records(version,{kind:'dimension',limit:100});
  if(rows.length!==items.length||items.some(item=>!isDeepStrictEqual(repository.record(version,'dimension',item.id),item)))
   throw Error('Model questions differ from pinned release: '+model.id);
 }
 const path='lib/model-library.mjs';
 const data={models:clone(models),activeIntegrityDimensions:active.activeIntegrityDimensions,
  preInterviewReview:active.activeIntegrityModel(false).items.flatMap(i=>i.questions),
  prePracticalCevQuestions:clone(active.prePracticalCevQuestions),previousActiveQuestions:read('lib/cev-active-previous.json')};
 files.delete(resolve(root,'lib/cev-active-previous.json'));
 for(const property of ['models','preInterviewReview','prePracticalCevQuestions','previousActiveQuestions'])move(path,data,[property],'models:library');
 files.set(resolve(root,path),data);
 const source=readFileSync(resolve(root,path),'utf8');
 const reviewed=source.indexOf('export function hasReviewedQuestion'),initial=source.indexOf('export function initialModelLibrary'),restore=source.indexOf('export function restoreModelLibrary');
 if(reviewed<0||initial<reviewed||restore<initial)throw Error('Model library boundary changed');
 special.set(resolve(root,path),
  imp('softControlExample,kapteinSource','lib/export-presets.mjs')+imp('kapteinQuestions','lib/kaptein-questions.mjs')+
  imp('themeCatalogue','lib/theme-workspaces.mjs')+imp('themeLines','lib/report-choices.mjs')+
  imp('structureModel,assembleInterview','lib/interview-structure.mjs')+imp('cleanScopeDraft','lib/product-scope.mjs')+
  imp('contextualQuestion,contextualModelQuestion','lib/model-context.mjs')+imp('practiceQuestionRevision','lib/interview-practice-review.mjs')+
  'const {preInterviewReview,prePracticalCevQuestions,previousActiveQuestions,activeIntegrityDimensions}=data;\n'+
  source.slice(reviewed,initial)+
  'export function initialModelLibrary(){return {version:1,models:structuredClone(data.models)};}\n'+source.slice(restore));

 const activePath='lib/cev-active.mjs',activeData={reviewed:active.activeIntegrityModel(),unreviewed:active.activeIntegrityModel(false),
  activeIntegrityDimensions:active.activeIntegrityDimensions,prePracticalCevQuestions:clone(active.prePracticalCevQuestions)};
 for(const property of ['reviewed','unreviewed','prePracticalCevQuestions'])move(activePath,activeData,[property],'models:active-integrity');
 files.set(resolve(root,activePath),activeData);
 special.set(resolve(root,activePath),'export const {activeIntegrityDimensions,prePracticalCevQuestions}=data;\n'+
  'export function activeIntegrityModel(reviewed=true){return structuredClone({items:[],...data[reviewed?"reviewed":"unreviewed"]});}');
 for(const path of ['lib/interview-practice-previous.json','lib/interview-practice-formulations.json']){
  const data={values:read(path)};move(path,data,['values'],'models:'+path);files.set(resolve(root,path),data);arrayDefaults.add(resolve(root,path));
 }
 return {models:models.length,dimensions:models.reduce((n,m)=>n+m.items.length,0),questions:models.reduce((n,m)=>n+m.items.reduce((n,i)=>n+(i.questions?.length??0),0),0)};
}
