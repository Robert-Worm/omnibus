import {provisionStatusText} from './provision-status.mjs';

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
 for(const versions of groups.values())if(versions.size>1)for(const [key,identity] of versions)
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

export function sourceBackground(record){
 const m=record.material;if(!m)return '';
 // Read the saved snapshot only. A later date or catalogue edition must not
 // promote a future/conditional status or replace its recorded qualification.
 const sections=[['Bronstatus bij vastlegging',provisionStatusText(m)],['Broncontext',m.sourceContext],['Gebruik van de bron',m.sourceMethodology],
  ['Bronlicentie',m.sourceLicense],['Bewerking van de bron',m.sourceChanges]];
 if(record.sourceVersion){
  const version=record.sourceVersion;
  sections.unshift(['Bronversie '+version.id,[version.edition&&'Editie: '+version.edition,version.url,
   version.sourceHash&&'Bronhash: '+version.sourceHash,
   version.sourceDocumentHashes&&'Documenthashes: '+version.sourceDocumentHashes].filter(Boolean).join('\n')||'Versiegegevens ontbreken in het opgeslagen onderzoek.']);
 }
 // Display the saved original only when the editable text differs. Model
 // questions remain questions, and an intentional blank remains an override.
 if(['criterion','audit-coverage'].includes(m.kind)&&m.body!==record.point)
  sections.push([m.kind==='audit-coverage'?'Oorspronkelijk beoordelingsonderwerp':'Oorspronkelijke norm / toetspunt',m.body]);
 return sections.filter(([,text])=>text).map(([label,text])=>label+'\n'+text).join('\n\n');
}
