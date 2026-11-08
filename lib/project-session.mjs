import {restoreWorkspace} from './theme-workspaces.mjs';
import {serializeProject,expandProject} from './project-codec.mjs';
import {rememberCollectionPage} from './collection-start.mjs';
import {PROJECT_VERSION,migrateProject} from './project-session-migrations.mjs';
import {validateCollectionPreference,assertProjectCollections,bindCollectionPreference,projectCollectionPreference} from './source-collections.mjs';
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
export function makeProject(draft, modelLibrary, workspace, view = {}, collections = {mode:'both',origins:[]}) {
  return {format:'rijksmap-project',version:PROJECT_VERSION,draft,modelLibrary,workspace,view:projectView(view),collections:projectCollectionPreference(collections,draft,modelLibrary)};
}
export function readProject(value, current, {restoreDraft,restoreModels,themes,collections}) {
  value=expandProject(value);
  if (value?.format === 'rijksmap-project' || String(value?.format ?? '').startsWith('rijksmap-project')) {
    const migrated=migrateProject(value);
    value=migrated.value;
    const preference=validateCollectionPreference(value.collections,true);
    if(collections)assertProjectCollections(value,collections);
    if(!value.workspace || !Array.isArray(value.workspace.openIds) ||
      !value.workspace.openIds.every(id=>typeof id==='string') ||
      !(value.workspace.activeId===null || typeof value.workspace.activeId==='string') ||
      !value.view || typeof value.view!=='object' || Array.isArray(value.view)) throw Error('Het projectbestand is onvolledig.');
    // Validate everything before returning; no partial import or writes.
    const project=makeProject(restoreDraft(value.draft),restoreModels(value.modelLibrary),
      restoreWorkspace(value.workspace,themes),value.view,collections?bindCollectionPreference(preference,collections):preference);
    return {project,legacy:false,migration:migrated.migration,
      preserveOriginal:migrated.migration!==null || !projectContentEqual(value.collections,project.collections) || !projectContentEqual(value.draft,project.draft) ||
        !projectContentEqual(value.modelLibrary,project.modelLibrary)};
  }
  return {project:makeProject(restoreDraft(value),current.modelLibrary,current.workspace,
    {...current.view,page:'framework'},collections?bindCollectionPreference(current.collections,collections):current.collections),legacy:true,migration:null,preserveOriginal:false};
}
// Only wrap persistence AFTER readProject has validated a file completely.
// An unchanged current-format file stays usable/downloadable when browser
// storage is full or denied. Migration, source changes and conflicts fail closed.
export function acceptProjectFile(opened, persist) {
  try { return {...persist(),savedLocally:true}; }
  catch(error) {
    if(opened.legacy || opened.migration!==null || opened.preserveOriginal ||
      !(error instanceof DOMException) || !['QuotaExceededError','SecurityError'].includes(error.name))throw error;
    return {originalKey:null,notice:'',savedLocally:false};
  }
}
// Recovery copies are full projects; browser storage is small. Keep the newest
// few of each kind so a full storage never blocks opening a project (#294).
export const KEEP_RECOVERY_COPIES=3;
const isQuota=error=>error instanceof DOMException&&error.name==='QuotaExceededError';
/** Melding bij een mislukte automatische opslag: Nederlands, ook als de browser een technische fout geeft (panelronde 4). */
export function opslagfoutTekst(error){
  if(isQuota(error))return 'De opslag van deze browser is vol, dus je project wordt niet meer automatisch bewaard.';
  if(error instanceof DOMException&&error.name==='SecurityError')return 'Deze browser staat automatisch bewaren niet toe.';
  return error instanceof Error&&!(error instanceof DOMException)?error.message:'Automatisch bewaren is niet gelukt.';
}
/** Recovery copies of one kind, oldest first: originals by index, recovery copies by time. */
export function recoveryCopies(storage,key){
  const originals=[],recoveries=[];
  for(let index=0;index<1000;index++)if(storage.getItem(key+'-original-'+index)!==null)originals.push(key+'-original-'+index);
  if(typeof storage.key==='function'&&Number.isInteger(storage.length))
    for(let i=0;i<storage.length;i++){
      const name=storage.key(i),m=name?.startsWith(key+'-recovery-')&&/^(\d+)(?:-(\d+))?$/.exec(name.slice(key.length+10));
      if(m)recoveries.push({name,order:[Number(m[1]),Number(m[2]??0)]});
    }
  recoveries.sort((a,b)=>a.order[0]-b.order[0]||a.order[1]-b.order[1]);
  return {originals,recoveries:recoveries.map(r=>r.name)};
}
/** Remove the oldest copies beyond `keep` per kind. Never touches the active project or `keepName`. */
export function pruneRecoveryCopies(storage,key,{keep=KEEP_RECOVERY_COPIES,keepName=null}={}){
  const removed=[];
  for(const list of Object.values(recoveryCopies(storage,key))){
    const old=list.filter(name=>name!==keepName);
    const room=keep-(list.length-old.length);
    for(const name of old.slice(0,Math.max(0,old.length-room))){storage.removeItem?.(name);removed.push(name);}
  }
  return removed;
}
// Write a recovery copy; if storage is full, make room among older copies once and retry.
function writeCopy(storage,key,name,text){
  try{storage.setItem(name,text);}
  catch(error){
    if(!isQuota(error)||typeof storage.removeItem!=='function')throw error;
    pruneRecoveryCopies(storage,key,{keep:KEEP_RECOVERY_COPIES-1});
    storage.setItem(name,text);
  }
  pruneRecoveryCopies(storage,key,{keepName:name});
}
// One atomic localStorage value. A stale tab may never knowingly replace a newer value.
// This compare-before-write guard does not claim a cross-browser transaction guarantee.
export function guardedProjectStore(storage, key = PROJECT_KEY) {
  let expected=storage.getItem(key);
  function assertCurrent() {
    if(storage.getItem(key)!==expected)throw Error('Dit project is in een ander tabblad gewijzigd. Bewaar uw versie als bestand en herlaad om de opgeslagen versie te openen.');
  }
  function preserveOriginal(text) {
    if(typeof text!=='string'||text.length>MAX_PROJECT_BYTES)throw Error('Het oorspronkelijke project kon niet veilig worden bewaard.');
    // Never overwrite an older original. Reuse identical bytes after a failed
    // adoption/retry, without a backup index that could itself fail to save.
    // A new copy goes after the newest one, so index order stays age order after pruning.
    let next=0;
    for(let index=0;index<1000;index++) {
      const backup=key+'-original-'+index,existing=storage.getItem(backup);
      if(existing===text)return backup;
      if(existing!==null)next=index+1;
    }
    if(next>=1000)throw Error('Te veel herstelkopieën. Bewaar eerst uw herstelbestand.');
    const backup=key+'-original-'+next;
    assertCurrent();writeCopy(storage,key,backup,text);return backup;
  }
  // Only the local encoder supplies these bytes. Recheck at completion, not
  // when encoding starts: another browser tab may have saved in the meantime.
  function saveSerialized(next){
    assertCurrent();
    if(typeof next!=='string'||next.length>MAX_PROJECT_BYTES)throw Error('Het project is te groot voor automatisch bewaren. Bewaar het als bestand.');
    if(next!==expected)storage.setItem(key,next);
    expected=next;
  }
  return {
    raw:()=>expected,
    saveSerialized,
    // Call after complete validation and before applying any state to the UI.
    // A backup may remain after failure; active bytes and expected stay intact.
    acceptProject(opened, originalText, {replace=false,preservePrevious=false}={}) {
      assertCurrent();
      const preserve=opened.preserveOriginal || opened.migration!==null;
      const next=replace||preserve ? serializeProject(opened.project) : null;
      if(next!==null && next.length>MAX_PROJECT_BYTES)throw Error('Het project is te groot voor automatisch bewaren. Bewaar het als bestand.');
      if(replace)this.checkpoint(preservePrevious);
      const originalKey=preserve ? preserveOriginal(originalText) : null;
      if(next!==null)saveSerialized(next);
      return {originalKey,notice:opened.migration!==null
        ? 'Het project is omgezet naar de huidige projectversie. Het oorspronkelijke project is als herstelkopie bewaard.'
        : preserve ? 'Het opgeslagen project is aangepast aan de huidige indeling. Het oorspronkelijke project is als herstelkopie bewaard.' : ''};
    },
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
        if(preserve)writeCopy(storage,key,backup,actual);else storage.setItem(backup,actual);
      }
    },
  };
}
