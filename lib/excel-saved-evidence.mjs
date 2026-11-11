import {provisionStatusText} from './provision-status.mjs';
import {leesbareEditie} from './framework-source-labels.mjs';
import {currentAuditGuidance} from './audit-reading.mjs';
import {lezersbroncontext} from './reader-notes.mjs';

// The compact workbooks replace the old source worksheet, not its evidence.
// Keep saved text separate from current catalogue data and editable overrides.
export function identifySavedSourceVersions(records){
 const groups=new Map(),identities=new Map();
 for(const record of records){
  const m=record.material;if(!m?.sourceTitle)continue;
  let documents=m.sourceDocumentHashes||'';
  try{documents=Object.entries(JSON.parse(documents)).sort(([a],[b])=>a.localeCompare(b));}catch{}
  const identity={title:m.sourceTitle,edition:m.edition||'',url:m.sourceUrl||'',sourceHash:m.sourceHash||'',
   sourceDocumentHashes:m.sourceDocumentHashes||'',license:m.sourceLicense||'',changes:m.sourceChanges||''};
  const key=JSON.stringify({...identity,sourceDocumentHashes:documents});
  const versions=groups.get(m.sourceTitle)||new Map();versions.set(key,identity);groups.set(m.sourceTitle,versions);
  identities.set(record,key);
 }
 // Labels are workbook-local, and only appear when a title is ambiguous. Never
 // fetch current catalogue metadata or replace a saved source with that version.
 const labels=new Map();
 // Panel 11 november 2026: alleen een label als de lezer het verschil kan zien (andere editie of ander adres).
 // Controlegetallen staan niet in het werkdocument; een verschil dat alleen daarin zit, geeft geen label.
 for(const versions of groups.values())if(new Set([...versions.values()].map(v=>v.edition+'|'+v.url)).size>1)for(const [key,identity] of versions)
  labels.set(key,{id:'B'+String(labels.size+1).padStart(2,'0'),...identity});
 return records.map(record=>{
  const sourceVersion=labels.get(identities.get(record));
  return sourceVersion?{...record,sourceVersion,sources:record.sources.map(source=>({...source,versionLabel:'Bronversie '+sourceVersion.id}))}:record;
 });
}

export function workbookEvidence(records,draft){
 return records.map(e=>{
  const {cioTrace,lawTrace,reportTrace,...savedMaterial}=e.material||{};
  return {lineId:e.lineId,pointId:e.pointId,sources:e.sources,
   sourceContext:e.material?.sourceContext||'',cioTrace:cioTrace??null,lawTrace:lawTrace??null,reportTrace:reportTrace??null,
   // Large structured traces remain at their established top-level keys once.
   savedMaterial:e.material?savedMaterial:null,overrides:structuredClone(draft.overrides?.[e.lineId]||{}),note:draft.notes?.[e.lineId]||'',
   ...(e.modelItem?{modelItem:e.modelItem}:{}),...(e.sourceVersion?{sourceVersion:e.sourceVersion}:{})};
 });
}

// Kaderbrede open vragen en bronuitleg staan één keer in 01 Versiebeheer, niet bij elk toetspunt
// (panel 9 november 2026). Alleen uit de opgeslagen snapshots: een alinea met kop (titel + tekst) die bij
// alle gekozen toetspunten van dezelfde bron gelijk is, is kaderbreed.
let kaderbreed=new Map();
const leesContext=m=>m.topicalTrace?lezersbroncontext(currentAuditGuidance(m.sourceContext||'')):(m.sourceContext||'');
export function bereidKaderbreed(records){
 const perBron=new Map();
 for(const r of records){const m=r.material;if(!m?.topicalTrace)continue;const k=m.foundationId||m.sourceTitle;(perBron.get(k)||perBron.set(k,[]).get(k)).push(m);}
 kaderbreed=new Map();
 for(const [k,ms] of perBron){
  const delen=ms.map(m=>new Set(leesContext(m).split('\n\n').filter(d=>d.includes('\n'))));
  const samen=ms.length>1?[...delen[0]].filter(d=>delen.every(s=>s.has(d))):[];
  // Een open vraag over een artikel dat bij geen enkel gekozen toetspunt hoort (ook niet als context), staat niet op
  // het versieblad (panel 11 november 2026). Een alinea zonder artikelnummer geldt voor het hele kader en blijft.
  const artikelen=t=>new Set([...String(t).matchAll(/\bartikel(?:en)? (\d+)(?:(?:, | en | tot en met )(\d+))*/giu)].flatMap(m=>m[0].match(/\d+/gu)));
  const gekozen=new Set(ms.flatMap(m=>[...String(m.topicalTrace).matchAll(/"locator":"([^"]*)"/gu)].flatMap(x=>[...String(x[1]).matchAll(/artikel ?(\d+)/giu)].map(y=>y[1]))));
  const relevant=samen.filter(d=>{const a=artikelen(d);return !a.size||!gekozen.size||[...a].some(n=>gekozen.has(n));});
  kaderbreed.set(k,{titel:ms[0].sourceTitle,alineas:relevant,verborgen:samen.filter(d=>!relevant.includes(d)),gebruik:ms[0].sourceMethodology||'',licentie:ms[0].sourceLicense||'',bewerking:ms[0].sourceChanges||''});
 }
 return kaderbreed;
}
export function sourceBackground(record){
 const m=record.material;if(!m)return '';
 const kb=m.topicalTrace?kaderbreed.get(m.foundationId||m.sourceTitle):null;
 // Read the saved snapshot only. A later date or catalogue edition must not
 // promote a future/conditional status or replace its recorded qualification.
 const weg=new Set([...(kb?.alineas||[]),...(kb?.verborgen||[])]),context=leesContext(m).split('\n\n').filter(d=>!weg.has(d)).join('\n\n');
 // An unconfirmed status is explained once per source in the version sheet (#304).
 const sections=[['Bronstatus bij vastlegging',m.effectiveStatus==='unknown'?'':provisionStatusText(m)],['Broncontext',context],...(kb?[]:[['Gebruik van de bron',m.sourceMethodology],
  ['Bronlicentie',m.sourceLicense],['Bewerking van de bron',m.sourceChanges]])];
 if(record.sourceVersion){
  const version=record.sourceVersion;
  sections.unshift(['Bronversie '+version.id,[version.edition&&'Editie: '+leesbareEditie(version.edition),version.url].filter(Boolean).join('\n')||'Versiegegevens ontbreken in het opgeslagen onderzoek.']);
 }
 // Display the saved original only when the editable text differs. Model
 // questions remain questions, and an intentional blank remains an override.
 if(['criterion','audit-coverage'].includes(m.kind)&&m.body!==record.point)
  sections.push([m.kind==='audit-coverage'?'Oorspronkelijk beoordelingsonderwerp':'Oorspronkelijke norm / toetspunt',m.body]);
 return sections.filter(([,text])=>text).map(([label,text])=>label+'\n'+text).join('\n\n');
}
