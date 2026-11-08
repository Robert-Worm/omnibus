import {creatorWorkbookModel} from './creator-model.mjs';
import {exportResearch} from './research-plan.mjs';
import {researchGoalText} from './research-goal.mjs';
import {researchApproachText} from './research-approach.mjs';

const text = cell => String(cell && typeof cell==='object' && 'value' in cell ? cell.value ?? '' : cell ?? '');
const heading = value => text(value).replace(/[\r\n]+/g,' ').trim();

// The selected workform has one content model for preview, Excel and text.
// Never append unrelated historical report analyses to a model-only interview.
export function workformMarkdown(framework,draft,options={}) {
  const model=creatorWorkbookModel(framework,draft,options);
  const main=model.sheets.find(s=>s.entries && s.columnIds && s.registerKind!=='testing');
  const out=[`# ${heading(draft.title)}`,'',
    `Werkvorm: ${{interview:'Interviewleidraad',risk:'Risico-controlmatrix',testing:'Normtoetsing'}[options.profile] || 'Referentiekader'}`,
    ...(options.focus ? [`Onderzoeksobject: ${heading(options.focus)}`]:[]),
    ...(options.version ? [`Versie: ${heading(options.version)}`]:[]),''];
  const goal=researchGoalText(draft.investigation?.goal);
  if(goal)out.push('## Onderzoeksdoelstelling','',goal,'');
  const approach=researchApproachText(draft.investigation?.researchApproach);
  if(approach)out.push('Onderzoeksaanpak: '+approach,'');
  if (draft.exportSelection) {
    const s=draft.exportSelection;
    out.push(`Selectie: ${s.chosen} gekozen · ${s.exported} opgenomen in deze export.`,
      ...(s.unlinked ? [`Niet opgenomen: ${s.unlinked} bouwstenen zonder koppeling aan een onderzoeksvraag.`] : []),
      ...(s.autoLinked ? [`Niet aan een vraag gekoppeld en toch opgenomen: ${s.autoLinked} bouwstenen${s.underSub?`, waarvan ${s.underSub} bij een deelvraag met een verwant toetspunt en ${s.autoLinked-s.underSub} onder de centrale vraag`:' onder de centrale vraag'}${s.central?' ‘'+s.central+'’':''}.`] : []),
      ...(s.excluded ? [`Niet opgenomen: ${s.excluded} gekoppelde bouwstenen buiten de exportselectie.`] : []),'');
  }
  if(options.questions!==false)out.push(...exportResearch(framework,draft));
  // Each workbook design sets its own header row; the testing template has it on row 4 (#309).
  const kop=main?main.rows[(main.headerRow||5)-1]||[]:[];
  if(main)for(const entry of main.entries) {
    const row=main.rows[entry.row-1],titleCol=main.columnIds.indexOf('title');
    out.push(`## ${heading(entry.pointId)} — ${heading(titleCol>=0?row[titleCol]:entry.title)}`,'');
    for(let col=0;col<main.columnIds.length;col++) {
      if(['pointId','title','selection','questionRefs'].includes(main.columnIds[col]))continue;
      const value=Array.from({length:entry.endRow-entry.row+1},(_,i)=>text(main.rows[entry.row-1+i]?.[col])).filter(Boolean).join('\n');
      if(value&&heading(kop[col]))out.push(`### ${heading(kop[col])}`,value,'');
    }
  }
  for(const sheet of model.sheets.filter(s=>s.registerKind==='testing')) {
    out.push('## Toetsuitvoering','');
    // Kopregel en titel volgen het ontwerp van het werkblad; kolommen zonder kop slaan we over (panelronde 3).
    const kopRij=sheet.rows[(sheet.headerRow||5)-1]||[],titel=sheet.columnIds.indexOf('title');
    for(const entry of sheet.entries) {
      out.push(`### ${heading(entry.pointId)} — ${heading(sheet.rows[entry.row-1][titel>=0?titel:1]||entry.title)}`,'');
      for(let col=0;col<sheet.columnIds.length;col++) {
        if(['pointId','title','selection'].includes(sheet.columnIds[col])||!heading(kopRij[col]))continue;
        out.push(`- ${heading(kopRij[col])}: ${text(sheet.rows[entry.row-1][col]) || 'Nog in te vullen'}`);
      }
      out.push('');
    }
  }
  for(const sheet of model.sheets.filter(s=>/Bronverantwoording/.test(s.name))) {
    out.push('## Bronverantwoording','');
    for(const row of sheet.rows.slice(4)) {
      const values=row.map(text).filter(Boolean);
      if(values.length)out.push(values.join('\n'),'');
    }
  }
  return out.join('\n');
}
