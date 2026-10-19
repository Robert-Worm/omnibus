import {reportBrowseGroups} from './report-browse-groups.mjs';
export function reportSelection(lines,counts,included=[]){
 const units=lines.map(l=>counts[l.id]||{total:1,selected:included.includes(l.id)?1:0});
 const total=units.reduce((n,c)=>n+c.total,0),selected=units.reduce((n,c)=>n+c.selected,0);
 return {total,selected,all:total>0&&selected===total,partial:selected>0&&selected<total};
}
export function reportBrowserGroups(lines,counts,view,included=[],points=[]){
 const query=String(view.query||'').trim().toLocaleLowerCase('nl');
 const groups=reportBrowseGroups(lines);
 return groups.filter(g=>!view.group||g.id===view.group).map(g=>({...g,allRows:g.lines,lines:g.lines.filter(l=>{
  const c=counts[l.id];if(view.selectedOnly&&!(c?.selected||c?.legacySelected||included.includes(l.id)))return false;
  const text=[l.id,l.title,l.entity,...['objective','risk','controlObjective','control','criterion'].map(k=>l[k]?.text||''),...points.filter(p=>p.legacy_line_id===l.id).flatMap(p=>[p.id,p.title,p.text])].join(' ').toLocaleLowerCase('nl');
  return !query||text.includes(query);
 })})).filter(g=>g.lines.length);
}
