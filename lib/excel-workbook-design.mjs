// Workbook presentation and editable Excel navigation. Never changes the saved audit draft.
import { importedFoundationItems } from './foundations/registry.mjs';
import {reportQualityPhaseText} from './report-quality-revisions.mjs';
import {exportTypography} from './export-design.mjs';
import { researchGoalText } from './research-goal.mjs';
import { researchApproachText } from './research-approach.mjs';
import { testingAspectLabel, testingTerminologyHelp } from './testing-aspects.mjs';
const col = n => { let s=''; for(n++;n;n=Math.floor((n-1)/26)) s=String.fromCharCode(65+(n-1)%26)+s; return s; };
const quote = s => '"'+String(s).replace(/"/g,'""')+'"';
const plain = s => String(s ?? '').replace(/^(?:(?:Voorstel|Afgeleid|Eigen formulering):\s*)/i,'');
const formula = (f,value='') => ({formula:f,value});
const scalar = v => v && typeof v==='object' && 'formula' in v ? v.value : v;
const sheetBase = (name,widths) => ({name,widths,rows:[],merges:[],rowStyles:{},cellStyles:{},heights:{},rowKinds:{},validations:[],freeze:5,notes:[]});
function row(s,values,style=0,height=30) {
  const r=s.rows.push(s.widths.map((_,i)=>values[i]??''));s.rowStyles[r]=style;s.heights[r]=height;return r;
}
function bodyHeight(values,widths) {
  return Math.min(409,Math.max(42,...values.map((v,i)=>String(scalar(v)??'').split('\n').reduce((n,t)=>n+Math.max(1,Math.ceil(t.length/Math.max(8,widths[i]-4))),0)*15+14)));
}
// Keep one independently editable ID per norm. A 409pt clamp alone can hide the
// end of a long norm; widen that column before calculating the final row height.
// Other columns and the chosen font remain unchanged. The bound avoids turning
// arbitrary pasted documents into an unmanageably wide register.
export function fitLongCriterionColumn(sheet,meta={}) {
 const c=sheet.columnIds?.indexOf('criterion');
 if(c==null||c<0)return;
 const {fontSize}=exportTypography(meta),factor=fontSize>11?(fontSize/11)**2:1;
 const linesAt=(value,width)=>String(scalar(value)??'').split('\n').reduce((n,t)=>n+Math.max(1,Math.ceil(t.length/Math.max(8,(width-4)*.88))),0);
 let width=sheet.widths[c];
 for(const e of sheet.entries){
  const value=sheet.rows[e.row-1][c];
  while(width<116&&(linesAt(value,width)*15+14)*factor>409)width+=2;
 }
 if(width===sheet.widths[c])return;
 sheet.widths[c]=Math.min(116,width);
 for(const e of sheet.entries)sheet.heights[e.row]=bodyHeight(sheet.rows[e.row-1],sheet.widths);
}
// Multiple selected interview levels can exceed Excel's 409pt row limit.
// Keep the full question/instruction and one editable record; fit the conversation
// column, not the font or identifiers. Account for wrapping at word boundaries.
export function fitLongInterviewColumn(sheet,meta={}) {
 const c=sheet.columnIds?.indexOf('interview');
 if(c==null||c<0)return;
 const {fontSize}=exportTypography(meta),factor=fontSize>11?(fontSize/11)**2:1;
 const linesAt=(value,width)=>String(scalar(value)??'').split('\n').reduce((total,paragraph)=>{
   const capacity=Math.max(8,Math.floor((width-4)*.88));
   let lines=1,used=0;
   for(const word of paragraph.split(/\s+/).filter(Boolean)) {
     if(used&&used+1+word.length>capacity){lines++;used=0;}
     if(used)used++;
     used+=word.length;
     while(used>capacity){lines++;used-=capacity;}
   }
   return total+lines;
 },0);
 let width=sheet.widths[c];
 for(const e of sheet.entries) {
   const value=sheet.rows[e.row-1][c];
   while(width<116&&(linesAt(value,width)*15+24)*factor>385)width+=2;
 }
 sheet.widths[c]=Math.min(116,width);
 for(const e of sheet.entries) {
   const required=linesAt(sheet.rows[e.row-1][c],sheet.widths[c])*15+24;
   if(required*factor>409)throw new Error('De interviewtekst bij '+sheet.rows[e.row-1][0]+' past niet leesbaar in een Excel-rij. Kies minder interviewniveaus of een kleinere tekstgrootte, of verkort uw eigen instructie. Uw opgeslagen tekst blijft ongewijzigd.');
   sheet.heights[e.row]=Math.min(409,Math.max(sheet.heights[e.row],required));
 }
}
function table(s,name,range) { s.tables=[{name,ref:range}];delete s.filter; }
// The execution sheet reads the norm text from the register by ID, so an edited
// criterion stays in step and the wording is never stored twice. The register
// renames this column for audit-coverage and model-question exports, so the
// structured reference must use its actual header.
const criterionHeaderOf = main => main.rows[4][main.columnIds.indexOf('criterion')] || 'Norm / criterium';
function criterionFormula(header,rowNumber,cache='') {
  return formula(`IF(A${rowNumber}="","",IF(COUNTIF(Toetspunten[ID],A${rowNumber})<>1,"",INDEX(Toetspunten[${header}],MATCH(A${rowNumber},Toetspunten[ID],0))&""))`,cache);
}
function criterionCalculated(header) {
  return `IF([[#This Row],[ID]]="","",IF(COUNTIF(Toetspunten[ID],[[#This Row],[ID]])<>1,"",INDEX(Toetspunten[${header}],MATCH([[#This Row],[ID]],Toetspunten[ID],0))&""))`;
}
function lookup(header,input,cache) {
  return formula(`IF(${input}="","",IF(COUNTIF(Toetspunten[ID],${input})=0,"ID niet gevonden",IF(COUNTIF(Toetspunten[ID],${input})>1,"Dubbel ID",INDEX(Toetspunten[${header}],MATCH(${input},Toetspunten[ID],0))&"")))`,cache);
}
const matchCount = (key) => [''+key,key+';*','*;'+key,'*;'+key+';*'].map(v=>`COUNTIFS(Toetspunten[Vragen],${quote(v)},Toetspunten[Selectie],"Meenemen")`).join('+');

// One compact goal block, never repeated per criterion or confused with its control objective.
// Reuse a header row so testpoint tables, formulas and links keep their addresses.
export function includeResearchGoal(model, draft) {
  const goal = researchGoalText(draft.investigation?.goal);
  const approach = researchApproachText(draft.investigation?.researchApproach);
  if (!goal && !approach) return model;
  const questions = model.sheets.find(s => s.questionEntries);
  const sheet = questions || model.sheets.find(s => s.columnIds && s.registerKind !== 'testing');
  if (!sheet) return model;
  const r = questions ? 4 : 3;
  const prefix = questions ? '' : String(sheet.rows[r-1][0] || '') + '\n';
  const text = prefix + [goal ? 'Onderzoeksdoelstelling: ' + goal : '', approach ? 'Onderzoeksaanpak: ' + approach : ''].filter(Boolean).join('\n');
  sheet.rows[r-1][0] = text;
  const merge = sheet.merges.find(m => m.startsWith(`A${r}:`)) || `A${r}:${col(sheet.widths.length-1)}${r}`;
  if (!sheet.merges.includes(merge)) sheet.merges.push(merge);
  sheet.rowStyles[r] = 19;
  const endColumn = [...merge.split(':')[1].replace(/\d/g,'')].reduce((n,c)=>n*26+c.charCodeAt(0)-64,0);
  const capacity = Math.max(30, Math.floor((sheet.widths.slice(0,endColumn).reduce((a,b)=>a+b,0)-8)*.85));
  const lines = text.split('\n').reduce((sum,p)=>sum+Math.max(1,Math.ceil(p.length/capacity)),0);
  sheet.heights[r] = Math.max(48,lines*17+20);
  return model;
}

export function refineWorkbook(model,{draft,selected,links,numbers,options}) {
  const log=model.sheets[0], main=model.sheets.find(s=>s.columnIds && s.registerKind!=='testing');
  const questions=model.sheets.find(s=>s.questionEntries), execution=model.sheets.find(s=>s.registerKind==='testing');
  if(!main) return model;
  const mainName=main.name;
  const mainEntries=main.entries.map(e=>({...e}));
  const sourceName=String(model.sheets.length+1).padStart(2,'0')+' Bronverantwoording';
  // Required source applicability is not a team's version log. Keep it on its own
  // conditional sheet; no methodology or licensing content is discarded.
  if(log.rows.length>16) {
    const src=sheetBase(sourceName,[...log.widths]);
    row(src,[],0,12);row(src,['Bronverantwoording'],2,32);row(src,[model.title],3,30);
    src.merges.push('A2:F2','A3:F3');src.freeze=3;
    for(let old=17;old<=log.rows.length;old++) {
      const r=row(src,log.rows[old-1],log.rowStyles[old]??0,log.heights[old]??30);
      src.cellStyles[r]=log.cellStyles[old]||{};
    }
    for(const m of log.merges) if(Number(m.match(/\d+/)[0])>=17)
      src.merges.push(m.replace(/\d+/g,n=>Number(n)-13));
    src.applicabilityEntries=log.applicabilityEntries?.map(e=>({...e,row:e.row-13,endRow:e.endRow-13}));
    src.cioTraceEntries=log.cioTraceEntries?.map(e=>({...e,row:e.row-13,endRow:e.endRow-13}));
    model.sheets.push(src);
  }
  log.rows=log.rows.slice(0,15);log.merges=log.merges.filter(m=>Number(m.match(/\d+/)[0])<=4);
  delete log.applicabilityEntries;delete log.cioTraceEntries;delete log.filter;log.freeze=0;
  log.rows[1][0]='Versiebeheer';log.rows[2][0]=model.meta.scope || model.title;log.rows[3]=log.widths.map(()=> '');
  log.rows[4]=['Versie','Datum','Gewijzigd door','Wijziging','','Teamleden'];
  log.rowStyles[3]=3;log.rowStyles[4]=0;log.heights[4]=14;
  log.widths=[12,16,25,55,4,26];
  log.tables=[{name:'Versies',ref:'A5:D15',hideFilters:true}];
  for(let r=6;r<=15;r++) { log.rowStyles[r]=r%2?0:17; log.cellStyles[r]={4:0,5:r<11?5:0};log.heights[r]=32; }
  for(let r=6;r<=10;r++) if(!log.rows[r-1][5]) log.rows[r-1][5]=`Teamlid ${r-5}`;
  log.rows[10][5]='Vervang de namen hierboven; kies ze bij Gewijzigd door.';
  log.cellStyles[11][5]=3;log.heights[11]=44;log.notes=[];

  // Collapse legacy continuation rows back into complete, independently editable records.
  const fields=[...main.columnIds], oldRows=main.rows;
  const data=mainEntries.map(e=>fields.map((_,c)=>c<2?oldRows[e.row-1][c]:oldRows.slice(e.row-1,e.endRow).map(r=>r[c]).join('')));
  main.rows=oldRows.slice(0,5);main.notes=[];main.hyperlinks=[];
  main.widths[0]=16;main.widths[1]=36;
  const qCol=main.widths.length;main.widths.push(18);main.columnIds.push('questionRefs');
  const selectionCol=main.widths.length;main.widths.push(23);main.columnIds.push('selection');
  main.rows=main.rows.map(r=>[...r,'','']);main.rows[4][qCol]='Vragen';main.rows[4][selectionCol]='Selectie';
  main.rows[3][qCol]='Onderzoeksopzet';main.cellStyles[4][qCol]=7;main.cellStyles[5][qCol]=8;
  main.cellStyles[4][selectionCol]=7;main.cellStyles[5][selectionCol]=8;
  main.merges.push(`${col(qCol)}4:${col(selectionCol)}4`);
  main.rows[1][0]=mainName.replace(/^\d+\s+/,'');main.rowStyles[3]=3;
  main.merges=main.merges.filter(m=>Number(m.match(/\d+/)[0])<=4);
  main.entries=[];
  for(let i=0;i<data.length;i++) {
    const e=mainEntries[i], line=selected.find(l=>l.id===e.lineId), values=data[i];
    values[1]=[line.title,line.provisionStatus].filter(Boolean).join('\n');
    const provenance=[];
    for(let c=2;c<fields.length;c++) {
      const id=fields[c], original=values[c];
      if(['criterion','control','auditQuestion','objective','risk'].includes(id) && typeof original==='string') {
        if(plain(original)!==original) provenance.push(`${main.rows[4][c]}: ${original}`);
        values[c]=plain(original);
      }
      if(id==='source') values[c]=String(values[c]).replace(/01 Versiebeheer\./g,sourceName+'.');
      // Test steps are organization-specific. Keep deliberate edits, not library boilerplate.
      if((!options.profile || options.profile==='testing') && ['procedure','documentation'].includes(id)) {
        if(id==='procedure') values[c]=ownProcedure(draft,line.id);
        else values[c]=line.materialKind==='model-question' && options.researchInterview?.triangulation ? original : ownEvidence(draft,line.id);
      }
      // The interview template has no separate auditQuestion column. Its
      // required question must survive even when both prepared texts match.
      if(id==='interview' && options.profile!=='interview' && fields.includes('auditQuestion') && plain(original)===plain(values[fields.indexOf('auditQuestion')])) values[c]='';
      if(id==='relevance') values[c]='';
    }
    values.push([...new Set(links.filter(l=>l.line_id===e.lineId).map(l=>numbers[l.question_id]))].join(';'));
    values.push('Meenemen');
    const sourceColumn=fields.indexOf('source');
    if(sourceColumn>=0 && !line.source_id && provenance.length) {
      const kinds=[...new Set(provenance.flatMap(t=>[
        /Afgeleid:/.test(t)?'AI-afleiding':null,
        /Voorstel:/.test(t)?'Auditvoorstel':null,
        /Eigen formulering:/.test(t)?'Eigen formulering':null,
      ].filter(Boolean)))];
      if(kinds.length)values[sourceColumn]+='\nHerkomst velden: '+kinds.join(' · ');
    }
    const r=row(main,values,i%2?17:0,bodyHeight(values,main.widths));
    main.entries.push({...e,row:r,endRow:r});
    if(sourceColumn>=0 && /^https?:\/\//i.test(e.sourceUrl||''))main.hyperlinks.push({ref:`${col(sourceColumn)}${r}`,target:e.sourceUrl,tooltip:'Open vastgelegde bron · volledige verantwoording op '+sourceName});
    // Keep provenance at the source, not as a duplicate popup over the criterion.
    if(provenance.length) main.notes.push({ref:`${col(fields.indexOf('source')>=0?fields.indexOf('source'):0)}${r}`,text:'Herkomst bij export\n'+provenance.join('\n\n')});
  }
  fitLongCriterionColumn(main,model.meta);
  fitLongInterviewColumn(main,model.meta);
  for(let i=0;i<3;i++) row(main,[],0,36);
  main.notes.push({ref:`${col(qCol)}5`,text:'Nummers uit Onderzoeksvragen. Meerdere vragen scheiden met een puntkomma, zonder spaties: 1.1;1.2. Filter deze kolom om de bijbehorende toetspunten te zien.'},
    {ref:'A5',text:'Gebruik een blijvend, uniek ID. Voor eigen punten bijvoorbeeld TP-E001. Voeg onderaan de Excel-tabel een rij toe met Tab.'});
  const pointTitle=options.profile==='interview' && selected.length && selected.every(l=>l.materialKind==='model-question') ? 'Vraagonderwerp' : 'Toetspunt';
  main.rows[4][1]=pointTitle;
  table(main,'Toetspunten',`A5:${col(selectionCol)}${main.rows.length}`);
  main.validations.push({range:`${col(selectionCol)}6:${col(selectionCol)}${Math.max(1005,main.rows.length+100)}`,formula:'"Meenemen,Niet meenemen"'});
  main.rows[2][0]=(model.meta.scope||model.title)+' · Selectie: Meenemen / Niet meenemen. Verbergen met het filter; na wijzigen: Gegevens > Opnieuw toepassen.';
  main.heights[3]=30;
  model.definedNames.push({name:'ToetspuntIDs',formula:'Toetspunten[ID]'});
  main.lookupChoices={idHeader:'ID',titleHeader:pointTitle,titleColumn:'B',titleIndex:1};
  model.definedNames.push({name:'ToetspuntKeuzes',formula:'Toetspunten[Keuzenaam]'});
  if(options.profile==='risk'||options.profile==='interview') styleProfileRegister(main,options.profile);
  // Keep extension space validated, without creating hundreds of visible empty records.
  main.validations=main.validations.map(v=>({...v,range:v.range.replace(/\d+$/,String(Math.max(1005,main.rows.length+100)))}));

  if(questions) {
    const q=sheetBase(questions.name,[48,62,18]);q.questionEntries=[];
    row(q,[],0,12);row(q,['Onderzoeksvragen'],2,32);row(q,[model.meta.scope||model.title],3,30);row(q,[],0,14);
    q.merges.push('A2:C2','A3:C3');row(q,['Centrale vraag','Deelvraag','Meegenomen'],1,32);
    const roots=(draft.research?.questions||[]).filter(v=>v.parent_id===null);
    for(const root of roots) {
      const children=(draft.research?.questions||[]).filter(v=>v.parent_id===root.id);
      const direct=main.entries.some(e=>e.questionIds.includes(root.id));
      const qs=[...(direct || !children.length?[root]:[]),...children]; const first=q.rows.length+1;
      for(const child of qs) {
        const matches=main.entries.filter(e=>e.questionIds.includes(child.id)), key=numbers[child.id];
        const text=child.parent_id?key+'  '+(child.text||'Vraag nog te formuleren'):'Rechtstreeks gekoppeld';
        const r=row(q,['',text,formula(matchCount(key),matches.length)],0,Math.max(60,Math.ceil(text.length/56)*15+18));
        q.questionEntries.push({row:r,questionId:child.id,pointIds:matches.map(e=>e.pointId)});
      }
      const label=numbers[root.id]+'  '+(root.text||'Vraag nog te formuleren'),needed=Math.ceil(label.length/42)*15+18;
      while((q.rows.length-first+1)*409<needed) row(q,[],0,30);
      q.rows[first-1][0]=label;
      const last=q.rows.length;if(last>first) q.merges.push(`A${first}:A${last}`);
      let extra=Math.max(0,needed-Array.from({length:last-first+1},(_,i)=>q.heights[first+i]).reduce((a,b)=>a+b,0));
      for(let r=first;r<=last;r++){const add=Math.min(409-q.heights[r],extra);q.heights[r]+=add;extra-=add;q.cellStyles[r]={0:17,2:18};}
    }
    const unassigned=main.entries.filter(e=>!e.questionIds.length);
    if(unassigned.length) row(q,['Nog te koppelen','',formula('COUNTIFS(Toetspunten[ID],"<>",Toetspunten[Vragen],"",Toetspunten[Selectie],"Meenemen")',unassigned.length)],5,32);
    if(!roots.length) row(q,['Centrale vraag nog te formuleren','',''],0,40);
    row(q,[],0,14);const heading=row(q,['Toetspunt bekijken en selectie wijzigen'],1,30);q.merges.push(`A${heading}:C${heading}`);
    const first=main.rows[5]||[];
    const input=row(q,['Kies een toetspunt (ID en naam)',first[0]?`${first[0]} · ${first[1]}`:''],19,48);q.cellStyles[input]={1:5};q.merges.push(`B${input}:C${input}`);
    q.inspector={heading,input};
    q.validations.push({range:`B${input}`,formula:'ToetspuntKeuzes'});
    // Labels are readable; the stable ID keeps links valid after a title changes.
    const selector=`LEFT($B$${input},FIND(" · ",$B$${input}&" · ")-1)`;
    const titleRow=row(q,['Naam',lookup(pointTitle,selector,first[1]||'')],19,46);q.merges.push(`B${titleRow}:C${titleRow}`);
    const criterion=main.columnIds.indexOf('criterion');
    if(criterion>=0) {const r=row(q,['Norm / criterium',lookup(main.rows[4][criterion],selector,first[criterion]||'')],19,100);q.merges.push(`B${r}:C${r}`);}
    if(options.profile==='risk'||options.profile==='interview') for(const id of (options.profile==='risk'?['risk','control']:['interview'])) {
      const c=main.columnIds.indexOf(id);if(c<0)continue;
      const r=row(q,[main.rows[4][c],lookup(main.rows[4][c],selector,first[c]||'')],19,80);q.merges.push(`B${r}:C${r}`);
    }
    const refs=row(q,['Gekoppeld aan vraag',lookup('Vragen',selector,first[qCol]||'')],19,28);q.merges.push(`B${refs}:C${refs}`);
    const status=row(q,['Selectie',lookup('Selectie',selector,first[selectionCol]||'')],19,28);q.merges.push(`B${status}:C${status}`);
    const jump=row(q,['Open het register',formula(`IF(COUNTIF(Toetspunten[ID],${selector})=1,HYPERLINK("#'${mainName}'!${col(selectionCol)}"&(MATCH(${selector},Toetspunten[ID],0)+5),"Selectie wijzigen / punt bewerken"),"Kies een uniek ID")`,'Selectie wijzigen / punt bewerken')],19,32);q.cellStyles[jump]={1:18};q.merges.push(`B${jump}:C${jump}`);
    const help=row(q,['Filter in het register op Vragen om alle punten bij een vraag te zien. Selectie bepaalt welke punten hierboven meetellen.'],3,32);q.merges.push(`A${help}:C${help}`);
    q.freeze=0;model.sheets[model.sheets.indexOf(questions)]=q;
  }
  if(execution) {
    const ex=execution, criterionHeader=criterionHeaderOf(main), aspectIds=ex.entries[0]?.aspects || options.testingAspects || [];
    const oldEntries=ex.entries;
    ex.rows=ex.rows.slice(0,5);ex.rows[1][0]='Toetsuitvoering';ex.rows[2][0]=model.meta.scope||model.title;
    ex.rowStyles[3]=3;ex.heights[3]=30;ex.merges=ex.merges.filter(m=>Number(m.match(/\d+/)[0])<=4);
    ex.hyperlinks=[];ex.notes=[];ex.entries=[];delete ex.instructionEntries;
    // Unique native table headers use the same export labels as the group headings.
    aspectIds.forEach((id,i)=> {
      const label=testingAspectLabel(id,model.meta.testingTerminology);
      ex.rows[4].splice(3+i*3,3,`${label} · Aanpak`,`${label} · Bevinding en bewijs`,`${label} · Oordeel`);
      ex.notes.push({ref:`${col(3+i*3)}5`,text:{opzet:'Beschrijf hoe u beoordeelt of de inrichting passend is.',bestaan:'Beschrijf hoe u vaststelt dat de maatregel op de gekozen peildatum aanwezig is.',werking:'Beschrijf hoe u de uitvoering in de gekozen periode onderzoekt. Bepaal populatie en selectie.'}[id]});
    });
    if(model.meta.testingTerminology === 'design-effectiveness') {
      const terminology = 'Toetsterminologie: Opzet = Design effectiveness; Bestaan = Implementation; Werking = Operating effectiveness. ' + testingTerminologyHelp;
      log.notes.push({ref:'A2',text:terminology});
      ex.notes.push({ref:'A2',text:terminology});
    }
    ex.widths.push(24,16,22);ex.columnIds.push('tester','testedOn','status');
    ex.rows=ex.rows.map(r=>[...r,'','','']);ex.rows[4].splice(-3,3,'Getoetst door','Datum','Status');
    ex.rows[3][ex.widths.length-3]='Administratie';ex.merges.push(`${col(ex.widths.length-3)}4:${col(ex.widths.length-1)}4`);
    for(let c=ex.widths.length-3;c<ex.widths.length;c++){ex.cellStyles[4][c]=15;ex.cellStyles[5][c]=16;}
    for(const e of oldEntries) {
      const point=main.entries.find(p=>p.lineId===e.lineId), title=main.rows[point.row-1][1];
      const criterionText=scalar(main.rows[point.row-1][main.columnIds.indexOf('criterion')]) || '';
      const own=[ownProcedure(draft,e.lineId,true),ownEvidence(draft,e.lineId)].filter(Boolean).join('\n\n');
      const values=[e.pointId,formula(`IF(A${ex.rows.length+1}="","",IF(COUNTIF(Toetspunten[ID],A${ex.rows.length+1})<>1,"Controleer ID",INDEX(Toetspunten[Toetspunt],MATCH(A${ex.rows.length+1},Toetspunten[ID],0))&""))`,title),criterionFormula(criterionHeader,ex.rows.length+1,criterionText),...aspectIds.flatMap(()=>['','','']),'','',''];
      if(own) values[3]=own; // Preserve a deliberate own plan once, not as three repeated prescriptions.
      const material=draft.investigation?.materials.find(m=>m.id===e.lineId);
      const line=selected.find(l=>l.id===e.lineId);
      const baseline=material && importedFoundationItems.find(m=>m.originKey===material.originKey);
      aspectIds.forEach((aspect,i)=>{
        const key={opzet:'testDesign',bestaan:'testExistence',werking:'testOperation'}[aspect];
        const currentPlan=reportQualityPhaseText(line,aspect);
        if(currentPlan!==undefined) {
          values[3+i*3]=[...new Set([values[3+i*3],currentPlan].filter(Boolean))].join('\n\n');
          return;
        }
        if((material?.cioTrace||material?.lawTrace||material?.topicalTrace) && aspect==='werking') {
          values[3+i*3]='Niet geselecteerd in dit bronpakket (NOT_SELECTED). Geen toetsvoorstel voor werking.';
          return;
        }
        // A historical procedure can equal its saved phase help. Retain that
        // complete block once; never merge merely similar text or other phases.
        if(material?.[key] && material[key]!==baseline?.[key]) values[3+i*3]=[...new Set([values[3+i*3],material[key]].filter(Boolean))].join('\n\n');
      });
      const r=row(ex,values,ex.entries.length%2?17:0,Math.max(60,bodyHeight(values,ex.widths)));
      ex.entries.push({...e,row:r,endRow:r});
      ex.notes.push({ref:`A${r}`,text:e.pointId+' · '+title});
    }
    for(let i=0;i<3;i++) { const r=ex.rows.length+1;row(ex,['',formula(`IF(A${r}="","",IF(COUNTIF(Toetspunten[ID],A${r})<>1,"Controleer ID",INDEX(Toetspunten[Toetspunt],MATCH(A${r},Toetspunten[ID],0))&""))`),criterionFormula(criterionHeader,r)],0,48); }
    ex.validations=ex.validations.map(v=>({...v,range:v.range.replace(/\d+$/,'1005')}));
    ex.validations.push({range:'A6:A1005',formula:'ToetspuntIDs'},{range:`${col(ex.widths.length-3)}6:${col(ex.widths.length-3)}1005`,formula:'Teamleden'},
      {range:`${col(ex.widths.length-1)}6:${col(ex.widths.length-1)}1005`,formula:'"Niet gestart,In uitvoering,Gereed voor review,Afgerond"'});
    ex.tables=[{name:'Uitvoering',ref:`A5:${col(ex.widths.length-1)}${ex.rows.length}`,calculatedColumns:{1:'IF([[#This Row],[ID]]="","",IF(COUNTIF(Toetspunten[ID],[[#This Row],[ID]])<>1,"Controleer ID",INDEX(Toetspunten[Toetspunt],MATCH([[#This Row],[ID]],Toetspunten[ID],0))&""))',2:criterionCalculated(criterionHeader)}}];delete ex.filter;
    for(let r=6;r<=ex.rows.length;r++) ex.cellStyles[r]={...ex.cellStyles[r],[ex.widths.length-2]:6};
    const sc=ex.widths.length;ex.widths.push(23);ex.columnIds.push('selection');
    ex.rows=ex.rows.map(r=>[...r,'']);ex.rows[4][sc]='Selectie';ex.cellStyles[5][sc]=8;ex.rows[3][sc]='Onderzoeksopzet';ex.cellStyles[4][sc]=7;
    for(let r=6;r<=ex.rows.length;r++) ex.rows[r-1][sc]=lookup('Selectie',`A${r}`,ex.rows[r-1][0]?'Meenemen':'');
    ex.tables[0].ref=`A5:${col(sc)}${ex.rows.length}`;
    ex.tables[0].calculatedColumns[sc]=lookup('Selectie','[[#This Row],[ID]]').formula;
    ex.heights[5]=Math.max(ex.heights[5],bodyHeight(ex.rows[4],ex.widths));
    ex.rows[2][0]='Selectie volgt het toetsregister. Filter op Meenemen; na wijzigen: Gegevens > Opnieuw toepassen.';
  }
  for(const s of model.sheets) {s.zoom=85;s.notes??=[];}
  return includeResearchGoal(model,draft);
}
function ownProcedure(draft,id,phaseRegister=false) {
  const m=draft.investigation?.materials.find(m=>m.id===id);
  const baseline=m && importedFoundationItems.find(p=>p.originKey===m.originKey);
  // Choosing a report child deliberately adopts its authored execution proposal.
  // In a phase register that default is placed in its own phase columns below,
  // not repeated as a combined plan in the first (opzet) column.
  return [draft.overrides[id]?.procedure ?? (m && ((!phaseRegister && m.sourcePointId) || !m.originKey || (baseline && m.procedure!==baseline.procedure)) ? m.procedure : ''),
    ...(draft.branchItems[id]||[]).filter(n=>n.kind==='procedure').map(n=>{
      const parent=(draft.branchItems[id]||[]).find(p=>p.id===n.parent_id);
      return n.text+(n.parent_id ? '\nBij '+n.parent_id+': '+(parent?.text || draft.overrides[id]?.[n.parent_id] || m?.[n.parent_id] || n.parent_id) : '');
    })].filter(Boolean).join('\n\n');
}
function ownEvidence(draft,id) {
  const m=draft.investigation?.materials.find(m=>m.id===id);
  const baseline=m && importedFoundationItems.find(p=>p.originKey===m.originKey);
  return m ? ['documents','observation'].filter(k=>m.cioTrace || m.lawTrace || m.topicalTrace || !m.originKey || (baseline && m[k]!==baseline[k])).map(k=>m[k]).filter(Boolean).join('\n\n') : '';
}

export function styleProfileRegister(s,profile) {
  const groups=s.columnIds.map(id=>{
    if(['questionRefs','selection'].includes(id))return ['Onderzoeksopzet',7];
      if(['source','location','category','basis'].includes(id))return ['Bron',7];
    if(['comments','notes'].includes(id))return ['Notities',15];
    if(['inScope','relevance'].includes(id))return ['Scope',7];
    if(['observation','evidenceLocation','verdict'].includes(id))return ['Bevindingen',13];
    if(['tester','testedOn','status'].includes(id))return ['Administratie',15];
    if(profile==='risk') {
      if(['control','criterion'].includes(id))return ['Beheersing',9];
      if(['auditQuestion','procedure','documentation','interview'].includes(id))return ['Toetsing',11];
      return ['Doel en risico',7];
    }
    if(id==='interview')return ['Gesprek',9];
    if(['auditQuestion','procedure'].includes(id))return ['Gesprek',9];
    if(id==='documentation')return ['Verificatie',11];
    return ['Onderzoek',7];
  });
  applyHeaderGroups(s,groups);
}
function applyHeaderGroups(s,groups) {
  s.merges=s.merges.filter(m=>!/^\D+4:/.test(m));s.rows[3]=s.widths.map(()=>'');s.cellStyles[4]={};s.cellStyles[5]={};
  for(let i=0;i<groups.length;) {
    let j=i;while(j+1<groups.length&&groups[j+1][0]===groups[i][0])j++;
    s.rows[3][i]=groups[i][0];if(j>i)s.merges.push(`${col(i)}4:${col(j)}4`);
    for(let c=i;c<=j;c++){s.cellStyles[4][c]=groups[i][1];s.cellStyles[5][c]=groups[i][1]+1;}
    i=j+1;
  }
  s.heights[4]=28;s.heights[5]=42;
}

export function refineModelInterview(model,sheet,items,options) {
  const oldRows=sheet.rows, end=sheet.entries.at(-1)?.endRow||5;
  const footer=oldRows.slice(end+3).filter(r=>r.some(Boolean));
  const intro=oldRows[3][0];
  const records=sheet.entries.map((e,i)=>({e,values:sheet.columnIds.map((id,c)=>{
    if(c===0)return items[i].id;
    // Legacy continuation rows repeat the label; retain the complete authored label once.
    if(id==='variable')return items[i].variable+'\n'+items[i].variableId;
    if(c===1)return items[i].title;
    return oldRows.slice(e.row-1,e.endRow).map(r=>r[c]).join('');
  })}));
  sheet.rows=oldRows.slice(0,5);sheet.merges=sheet.merges.filter(m=>Number(m.match(/\d+/)[0])<4);sheet.entries=[];
  const sc=sheet.widths.length;sheet.widths.push(23);sheet.columnIds.push('selection');sheet.rows=sheet.rows.map(r=>[...r,'']);sheet.rows[4][sc]='Selectie';
  const groups=sheet.columnIds.map(id=>['selection'].includes(id)?['Selectie',7]:['notes'].includes(id)?['Gespreksnotities',15]:['documents','observation'].includes(id)?['Verificatie',11]:['question','probes','starr'].includes(id)?['Gesprek',9]:['Onderzoeksmodel',7]);
  applyHeaderGroups(sheet,groups);
  for(const {e,values} of records) {values.push('Meenemen');const r=row(sheet,values,sheet.entries.length%2?17:0,bodyHeight(values,sheet.widths));sheet.entries.push({...e,row:r,endRow:r});}
  for(let i=0;i<3;i++)row(sheet,[],0,40);
  table(sheet,'Interviewvragen',`A5:${col(sc)}${sheet.rows.length}`);
  sheet.validations.push({range:`${col(sc)}6:${col(sc)}${Math.max(1005,sheet.rows.length+100)}`,formula:'"Meenemen,Niet meenemen"'});
  const hint=row(sheet,['Selectie: Meenemen / Niet meenemen. Verberg vragen met het filter; na wijzigen: Gegevens > Opnieuw toepassen.'],3,30);sheet.merges.push(`A${hint}:${col(sc)}${hint}`);
  for(const text of [intro,...footer.map(r=>r[0])].filter(Boolean)) {const r=row(sheet,[text],3,Math.max(30,Math.ceil(text.length/180)*15+12));sheet.merges.push(`A${r}:${col(sc)}${r}`);}
  sheet.zoom=85;sheet.notes=[];
  // Count selections without repeating every selected question above the guide.
  sheet.merges=sheet.merges.filter(m=>!/^A3:/.test(m));
  sheet.merges.push(`A3:${col(sc-2)}3`,`${col(sc-1)}3:${col(sc)}3`);
  sheet.rows[2][sc-1]=formula('COUNTIF(Interviewvragen[Selectie],"Meenemen")&" vragen meegenomen"',items.length+' vragen meegenomen');
  sheet.cellStyles[3]={[sc-1]:18};
  model.sheets=[model.sheets[0],sheet];
  model.sheets[0].rows[3][0]='';
  model.definedNames=model.definedNames.filter(n=>!['ToetspuntIDs','ToetspuntKeuzes'].includes(n.name));
  return model;
}
