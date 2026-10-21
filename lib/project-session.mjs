import {restoreWorkspace} from './theme-workspaces.mjs';
import {serializeProject,expandProject} from './project-codec.mjs';
import {rememberCollectionPage} from './collection-start.mjs';
export const PROJECT_KEY = 'rijksmap-project-v1';
export const MAX_PROJECT_BYTES = 24000000;
// Object-key order is immaterial in project JSON; array order remains meaningful.
export function projectContentEqual(a,b) {
  if(a===b)return true;
  if(!a || !b || typeof a!=='object' || typeof b!=='object')return false;
  if(Array.isArray(a)||Array.isArray(b))return Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((v,i)=>projectContentEqual(v,b[i]));
  const keys=Object.keys(a);
  return keys.length===Object.keys(b).length&&keys.every(k=>Object.hasOwn(b,k)&&projectContentEqual(a[k],b[k]));
}
const pages = ['entry','risk-start','report-themes','start','catalogue','processes','topics','foundations','foundation-workspace','models','model-workspace','reports','reader','framework','export'];
export function projectView(value = {}) {
  const text = key => typeof value[key] === 'string' ? value[key].slice(0,200) : '';
  const f=value.foundationBrowse ?? {};
  const foundationBrowse={query:typeof f.query==='string'?f.query.slice(0,500):'',sourceId:text('foundationFocus'),
    topic:typeof f.topic==='string'?f.topic.slice(0,200):'',groupId:typeof f.groupId==='string'?f.groupId.slice(0,200):'',
    page:Number.isInteger(f.page)&&f.page>=0?f.page:0,selectedOnly:f.selectedOnly===true,reviewedOnly:f.reviewedOnly===true,grouped:f.grouped!==false};
  return {page:pages.includes(value.page) ? value.page : 'framework', selected:text('selected'),
    lastCollectionPage:rememberCollectionPage(value.lastCollectionPage, value.page),
    aboutViews:{laws:value.aboutViews?.laws===true,models:value.aboutViews?.models===true,reports:value.aboutViews?.reports===true},
    researchRoute:value.researchRoute==='risk'?'risk':value.researchRoute===''?'':'question',
    foundationCatalogueScope:value.foundationCatalogueScope==='frameworks'?'frameworks':'laws',
    discoveryAxis:value.discoveryAxis==='processes'?'processes':'themes',discoveryCategory:text('discoveryCategory'),
    openModelIds:Array.isArray(value.openModelIds)?[...new Set(value.openModelIds.filter(id=>typeof id==='string'&&id.length<200))].slice(0,200):[],
    readerId:text('readerId'), reportPage:Number.isInteger(value.reportPage) && value.reportPage>0 ? value.reportPage : 1,
    foundationFocus:text('foundationFocus'),sourceProcess:text('sourceProcess'),
    activeModel:text('activeModel'),modelDimension:text('modelDimension'),modelQuery:text('modelQuery'),
    foundationBrowse,reportScope:['open','audit','all'].includes(value.reportScope)?value.reportScope:'all',choiceThemeId:text('choiceThemeId'),
    combined:value.combined===true,
    excluded:Array.isArray(value.excluded) ? [...new Set(value.excluded.filter(x=>typeof x==='string' && x.length<300))].slice(0,10000) : []};
}
export function makeProject(draft, modelLibrary, workspace, view = {}) {
  return {format:'rijksmap-project',version:1,draft,modelLibrary,workspace,view:projectView(view)};
}
export function readProject(value, current, {restoreDraft,restoreModels,themes}) {
  value=expandProject(value);
  if (value?.format === 'rijksmap-project' || String(value?.format ?? '').startsWith('rijksmap-project')) {
    if(value.format!=='rijksmap-project' || value.version!==1) throw Error('Deze projectversie wordt niet ondersteund. Het huidige project blijft behouden.');
    if(!value.workspace || !Array.isArray(value.workspace.openIds) ||
      !value.workspace.openIds.every(id=>typeof id==='string') ||
      !(value.workspace.activeId===null || typeof value.workspace.activeId==='string') ||
      !value.view || typeof value.view!=='object' || Array.isArray(value.view)) throw Error('Het projectbestand is onvolledig.');
    // Validate everything before returning; no partial import or writes.
    return {project:makeProject(restoreDraft(value.draft),restoreModels(value.modelLibrary),
      restoreWorkspace(value.workspace,themes),value.view),legacy:false};
  }
  return {project:makeProject(restoreDraft(value),current.modelLibrary,current.workspace,
    {...current.view,page:'framework'}),legacy:true};
}
// One atomic localStorage value. A stale tab may never knowingly replace a newer value.
// This compare-before-write guard does not claim a cross-browser transaction guarantee.
export function guardedProjectStore(storage, key = PROJECT_KEY) {
  let expected=storage.getItem(key);
  // Only the local encoder supplies these bytes. Recheck at completion, not
  // when encoding starts: another browser tab may have saved in the meantime.
  function saveSerialized(next){
    if(storage.getItem(key)!==expected)throw Error('Dit project is in een ander tabblad gewijzigd. Bewaar uw versie als bestand en herlaad om de opgeslagen versie te openen.');
    if(typeof next!=='string'||next.length>MAX_PROJECT_BYTES)throw Error('Het project is te groot voor automatisch bewaren. Bewaar het als bestand.');
    if(next!==expected)storage.setItem(key,next);
    expected=next;
  }
  return {
    raw:()=>expected,
    saveSerialized,
    save(project) {
      const actual=storage.getItem(key);
      if(actual!==expected) throw Error('Dit project is in een ander tabblad gewijzigd. Bewaar uw versie als bestand en herlaad om de opgeslagen versie te openen.');
      const next=serializeProject(project);
      saveSerialized(next);
    },
    checkpoint(preserve = false) {
      const actual=storage.getItem(key);
      if(actual!==expected) throw Error('Een ander tabblad heeft het project gewijzigd. Herlaad eerst of bewaar uw versie als bestand.');
      if(actual!==null) {
        let backup=key+'-before-open';
        if(preserve) {
          backup=key+'-recovery-'+Date.now();
          let suffix=0;const stem=backup;
          while(storage.getItem(backup)!==null) {
            if(++suffix>1000)throw Error('Te veel herstelkopieën. Bewaar eerst uw herstelbestand.');
            backup=stem+'-'+suffix;
          }
        }
        storage.setItem(backup,actual);
      }
    },
  };
}
