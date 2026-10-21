import {reportBrowseGroups} from './report-browse-groups.mjs';
export function reportSelection(lines,counts,included=[]){
 const units=lines.map(l=>counts[l.id]||{total:1,selected:included.includes(l.id)?1:0});
 const total=units.reduce((n,c)=>n+c.total,0),selected=units.reduce((n,c)=>n+c.selected,0);
 return {total,selected,all:total>0&&selected===total,partial:selected>0&&selected<total};
}
export function reportBrowserGroups(lines,counts,view,included=[],points=[]){
 const query=String(view.query||'').trim().toLocaleLowerCase('nl');
 const pointText=new Map();
 // Do not scan every point for every row, especially on the unfiltered first open.
 if(query)for(const point of points){
  const texts=pointText.get(point.legacy_line_id)||[];
  texts.push(point.id,point.title,point.text);pointText.set(point.legacy_line_id,texts);
 }
 const groups=reportBrowseGroups(lines);
 return groups.filter(g=>!view.group||g.id===view.group).map(g=>({...g,allRows:g.lines,lines:g.lines.filter(l=>{
  const c=counts[l.id];if(view.selectedOnly&&!(c?.selected||c?.legacySelected||included.includes(l.id)))return false;
  if(!query)return true;
  const text=[l.id,l.title,l.entity,...['objective','risk','controlObjective','control','criterion'].map(k=>l[k]?.text||''),...(pointText.get(l.id)||[])].join(' ').toLocaleLowerCase('nl');
  return text.includes(query);
 })})).filter(g=>g.lines.length);
}
