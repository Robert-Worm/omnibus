// Beoordeelde tekstcorrecties op de Topical-bronpakketten (B-094). De pakketten zelf en hun vraagreviews blijven zoals
// ze zijn beoordeeld; deze laag zet een gecorrigeerde tekst over het oude veld heen. Elke correctie noemt de controlegetallen
// van de oude en de nieuwe waarde, zodat een correctie nooit stil iets anders overschrijft. Een gewijzigd toetspunt krijgt
// een beoordeelde overgang, zodat een eerder bewaard project blijft openen.
//
// Toegestaan zijn alleen eigen teksten en koppelingen van Omnibus: geen bronpassages (citaten), geen identiteiten of
// selectiestatus. De laag wordt toegepast zodra de gegevens van een bron zijn geladen (catalogueDerived).
export const TOPICAL_TEXT_REVISION_FORMAT='omnibus-topical-text-revision/1';

const ID=/^[A-Za-z0-9][A-Za-z0-9._-]{0,120}$/u;
const HASH=/^[a-f0-9]{64}$/u;
const PHASE=/^phase_plans\.(?:opzet|bestaan|werking)(?:\.(?:status|action|expected_evidence|interpretation_boundary|reason))?$/u;
const FIELDS={
 points:field=>/^(?:title|text|scope|relevance|chapter|conditions\.\d{1,3}|exceptions\.\d{1,3}|interpretation_notes\.\d{1,3})$/u.test(field)||PHASE.test(field)||
  /^source_links\[[A-Za-z0-9._-]{1,120}\]\.(?:contribution|supported_clause|explanation)$/u.test(field)||
  /^source_links\.\d{1,3}\.(?:supported_clause|explanation)$/u.test(field),
 criteria:field=>/^(?:title|text|chapter)$/u.test(field),
 objectives:field=>/^(?:title|text|risk|control_measure)$/u.test(field),
 goals:field=>/^(?:title|text)$/u.test(field),
 context:field=>/^(?:title|intro|edition|as_of|applicability|source_explanation|coverage)$/u.test(field),
 status:field=>/^official_url$/u.test(field),
};
const CONTRIBUTIONS=new Set(['PRIMARY','DEFINITION','QUALIFICATION','EXCEPTION','EXPLANATION']);

/** De segmenten van een veldpad: "source_links[X].contribution" wordt [{link:'X'},'contribution']. */
function segments(field){
 return field.split(/\.(?![^[]*\])/u).map(part=>{const link=/^source_links\[(.+)\]$/u.exec(part);return link?{link:link[1]}:/^\d+$/u.test(part)?Number(part):part;});
}
/** De plek van het veld: {parent,key}, of null als het object (nog) niet is geladen. */
export function topicalRevisionTarget(packet,edit){
 let parent;
 if(edit.collection==='context'||edit.collection==='status')parent=packet[edit.collection];
 else{
  const list=packet.catalogue?.[edit.collection];
  if(!Array.isArray(list))return null;
  parent=list.find(entry=>entry.id===edit.id);
  if(!parent)return null;
 }
 const path=segments(edit.field);
 for(const [index,part] of path.entries()){
  const last=index===path.length-1;
  if(typeof part==='object'){
   const links=(parent.source_links??[]).filter(link=>link.record_id===part.link);
   if(links.length!==1)throw Error('Onduidelijke bronkoppeling in correctie: '+edit.id+':'+part.link);
   parent=links[0];continue;
  }
  if(last)return {parent,key:part};
  parent=parent?.[part];
  if(!parent||typeof parent!=='object')throw Error('Onbekend veld in correctie: '+edit.id+':'+edit.field);
 }
 return null;
}
/** De nieuwe waarde van een correctie, gegeven de huidige waarde. */
export function topicalRevisedValue(edit,current){
 if(Object.hasOwn(edit,'value'))return structuredClone(edit.value);
 let text=current;
 for(const [from,to] of edit.replace){
  if(typeof text!=='string'||!text.includes(from))throw Error('Correctie past niet op de tekst: '+edit.id+':'+edit.field);
  text=text.split(from).join(to);
 }
 return text;
}

/** Vormcontrole van de correctielaag (zonder de gegevens). */
export function validateTopicalTextRevisions(revisions){
 if(revisions===undefined)return;
 const fail=message=>{throw Error('Ongeldige tekstcorrecties: '+message);};
 if(!revisions||revisions.format!==TOPICAL_TEXT_REVISION_FORMAT||!Array.isArray(revisions.batches)||!Array.isArray(revisions.edits)||!Array.isArray(revisions.transitions))fail('vorm');
 const batches=new Set();
 for(const batch of revisions.batches){
  if(!batch||!/^\d{8}\.\d{2}$/u.test(batch.id||'')||batches.has(batch.id)||!HASH.test(batch.reviewSha256||'')||!String(batch.reviewer||'').trim()||batch.humanValidation!==false)fail('reeks');
  batches.add(batch.id);
 }
 // Een reden staat één keer in reasons; een correctie verwijst ernaar met haar positie (of noemt de tekst zelf).
 if(revisions.reasons!==undefined&&(!Array.isArray(revisions.reasons)||revisions.reasons.some(text=>typeof text!=='string'||!text.trim())))fail('redenen');
 const reasonOk=reason=>typeof reason==='string'?Boolean(reason.trim()):Number.isInteger(reason)&&reason>=0&&reason<(revisions.reasons?.length??0);
 const targets=new Set();
 for(const edit of revisions.edits){
  const where=[edit?.sourceId,edit?.collection,edit?.id,edit?.field].join(':');
  if(!edit||!ID.test(edit.sourceId||'')||!Object.hasOwn(FIELDS,edit.collection)||!FIELDS[edit.collection](edit.field||'')||
   (['context','status'].includes(edit.collection)?edit.id!==undefined:!ID.test(edit.id||''))||
   !HASH.test(edit.before||'')||!HASH.test(edit.after||'')||edit.before===edit.after||!batches.has(edit.batch)||!reasonOk(edit.reason)||
   Object.hasOwn(edit,'value')===Object.hasOwn(edit,'replace'))fail(where);
  if(Object.hasOwn(edit,'replace')&&(!Array.isArray(edit.replace)||!edit.replace.length||edit.replace.some(pair=>!Array.isArray(pair)||pair.length!==2||
   typeof pair[0]!=='string'||!pair[0]||typeof pair[1]!=='string'||pair[0]===pair[1])))fail(where);
  if(edit.field.endsWith('.contribution')&&!CONTRIBUTIONS.has(edit.value))fail(where);
  if(targets.has(where))fail('dubbel '+where);
  targets.add(where);
 }
 for(const entry of revisions.transitions){
  if(!entry||entry.format!=='omnibus-reviewed-trace-transition/1'||!ID.test(entry.sourceId||'')||!ID.test(entry.pointId||'')||
   !HASH.test(entry.previousTraceHash||'')||!HASH.test(entry.currentTraceHash||'')||entry.review?.decision!=='ACCEPT'||!HASH.test(entry.review.basisSha256||'')||
   !String(entry.review.reviewer||'').trim())fail('overgang '+entry?.pointId);
 }
}

/**
 * Zet de correcties op de geladen pakketten. Een veld dat al gecorrigeerd is, blijft staan; een veld met een andere
 * waarde dan verwacht stopt het laden. Een nog niet geladen toetspunt wacht tot zijn gegevens er zijn.
 * @param {{packages:any[],textRevisions?:any}} data
 * @param {(text:string)=>string} hashString sha256 in hex
 */
const added=new WeakSet();
export function applyTopicalTextRevisions(data,hashString){
 const revisions=data?.textRevisions;
 if(!revisions)return 0;
 const digest=value=>hashString(JSON.stringify(value));
 let applied=0;
 for(const edit of revisions.edits){
  const packet=data.packages.find(p=>p.id===edit.sourceId);
  if(!packet)throw Error('Correctie voor een onbekende bron: '+edit.sourceId);
  const target=topicalRevisionTarget(packet,edit);
  if(!target)continue;
  if(!Object.hasOwn(target.parent,target.key))throw Error('Onbekend veld in correctie: '+(edit.id??edit.sourceId)+':'+edit.field);
  const current=digest(target.parent[target.key]);
  if(current===edit.after)continue;
  if(current!==edit.before)throw Error('Correctie hoort bij een andere versie: '+(edit.id??edit.sourceId)+':'+edit.field);
  const next=topicalRevisedValue(edit,target.parent[target.key]);
  if(digest(next)!==edit.after)throw Error('Correctie geeft een andere tekst dan beoordeeld: '+(edit.id??edit.sourceId)+':'+edit.field);
  target.parent[target.key]=next;applied++;
 }
 // De overgangen horen bij het pakket, naast de bestaande (elke overgang eenmaal toevoegen, ook als ze later binnenkomen).
 for(const packet of data.packages){
  const own=revisions.transitions.filter(entry=>entry.sourceId===packet.id&&!added.has(entry));
  if(!own.length)continue;
  const list=packet.reviewedTraceTransitions??(packet.reviewedTraceTransitions=[]);
  for(const entry of own){if(!list.includes(entry))list.push(entry);added.add(entry);}
 }
 return applied;
}
