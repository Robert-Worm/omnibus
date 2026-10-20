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
      ...(s.excluded ? [`Niet opgenomen: ${s.excluded} gekoppelde bouwstenen buiten de exportselectie.`] : []),'');
  }
  if(options.questions!==false)out.push(...exportResearch(framework,draft));
  if(main)for(const entry of main.entries) {
    const row=main.rows[entry.row-1];
    out.push(`## ${heading(entry.pointId)} — ${heading(row[main.columnIds.indexOf('title')])}`,'');
    for(let col=0;col<main.columnIds.length;col++) {
      if(['pointId','title','selection','questionRefs'].includes(main.columnIds[col]))continue;
      const value=Array.from({length:entry.endRow-entry.row+1},(_,i)=>text(main.rows[entry.row-1+i]?.[col])).filter(Boolean).join('\n');
      if(value)out.push(`### ${heading(main.rows[4][col])}`,value,'');
    }
  }
  for(const sheet of model.sheets.filter(s=>s.registerKind==='testing')) {
    out.push('## Toetsuitvoering','');
    for(const entry of sheet.entries) {
      out.push(`### ${heading(entry.pointId)} — ${heading(sheet.rows[entry.row-1][1])}`,'');
      for(let col=2;col<sheet.columnIds.length;col++) {
        if(sheet.columnIds[col]==='selection')continue;
        out.push(`- ${heading(sheet.rows[4][col])}: ${text(sheet.rows[entry.row-1][col]) || 'Nog in te vullen'}`);
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
