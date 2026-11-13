'use client';
// Lijstweergave van een catalogus: één tabel over de volle breedte, als alternatief voor de tegels.
// Sorteren, filteren en groeperen gebeurt hier; openen en selecteren blijft bij de pagina die de rijen levert.
import {useEffect,useRef,useState,type ReactNode} from 'react';
import {ArrowDown,ArrowRight,ArrowUp,ChevronDown,ChevronRight,ChevronsUpDown,FolderOpen,LayoutGrid,List} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Checkbox} from '@/components/ui/checkbox';
import {useBrowseState} from './browse-state';
import './catalogue-table.css';

export type CatalogueColumn<Row>={key:string;label:string;numeric?:boolean;width?:string;/** Kolom vervalt als de lijst op deze sleutel is gegroepeerd: de groepskop zegt het dan al. */groupKey?:string;/** Kolom vervalt als de tabel smaller is dan dit aantal pixels. */hideBelow?:number;sort?:(row:Row)=>string|number;render:(row:Row)=>ReactNode;title?:(row:Row)=>string};
export type CatalogueFilter<Row>={key:string;label:string;all:string;value:(row:Row)=>string[]};
export type CatalogueRowBase={id:string;title:string;opened:boolean;selected:number;total:number;all:boolean;partial:boolean};

/** Breed scherm: de lijst heeft ruimte nodig. Op een telefoon blijven het tegels. */
export function useWideScreen(min=980){
 const [wide,setWide]=useState(false);
 useEffect(()=>{const media=window.matchMedia(`(min-width:${min}px)`);const update=()=>setWide(media.matches);update();media.addEventListener('change',update);return()=>media.removeEventListener('change',update);},[min]);
 return wide;
}
export function useCatalogueView(key:string){
 const [view,setView,ready]=useBrowseState('catalogue-view-'+key,{mode:'tiles' as 'tiles'|'list'},'local'),wide=useWideScreen();
 return {list:ready&&wide&&view.mode==='list',available:wide,mode:view.mode,setMode:(mode:'tiles'|'list')=>setView({mode})};
}
export function CatalogueViewToggle({mode,onChange}:{mode:'tiles'|'list';onChange:(mode:'tiles'|'list')=>void}){
 return <fieldset className="catalogue-view-toggle"><legend className="sr-only">Weergave van het overzicht</legend>
  <button type="button" aria-pressed={mode==='tiles'} onClick={()=>onChange('tiles')}><LayoutGrid size={15} aria-hidden="true"/>Tegels</button>
  <button type="button" aria-pressed={mode==='list'} onClick={()=>onChange('list')}><List size={15} aria-hidden="true"/>Lijst</button>
 </fieldset>;
}

export default function CatalogueTable<Row extends CatalogueRowBase>({id,noun,rows,filters,groups,nameLabel='Naam',nameMeta,countLabel='Gekozen',selectLabel,onOpen,onSelect,disabled=false,empty,searching=false,defaultSort='title',columns:allColumns}:{
 id:string;noun:[string,string];rows:Row[];columns:CatalogueColumn<Row>[];filters:CatalogueFilter<Row>[];
 groups:{key:string;label:string;value:(row:Row)=>string;describe?:(name:string)=>string}[];
 nameLabel?:string;nameMeta:(row:Row)=>ReactNode;countLabel?:string;selectLabel:(row:Row)=>string;
 onOpen:(id:string)=>void;onSelect?:(ids:string[],checked:boolean)=>void;disabled?:boolean;empty:ReactNode;searching?:boolean;defaultSort?:string}){
 const [view,setView]=useBrowseState('catalogue-table-'+id,{sort:defaultSort,dir:'asc' as 'asc'|'desc',group:groups[0]?.key||'',filters:{} as Record<string,string>,closed:[] as string[]},'local');
 const box=useRef<HTMLElement>(null),[width,setWidth]=useState(1400);
 useEffect(()=>{const el=box.current;if(!el)return;const observer=new ResizeObserver(entries=>setWidth(Math.round(entries[0].contentRect.width)));observer.observe(el);return()=>observer.disconnect();},[]);
 const columns=allColumns.filter(c=>(!c.groupKey||c.groupKey!==view.group)&&(!c.hideBelow||width>=c.hideBelow));
 const active=filters.filter(f=>view.filters[f.key]);
 const shown=rows.filter(row=>active.every(f=>f.value(row).includes(view.filters[f.key])));
 const sortOf=(key:string)=>key==='title'?(row:Row)=>row.title.toLocaleLowerCase('nl'):key==='selected'?(row:Row)=>row.selected:columns.find(c=>c.key===key)?.sort;
 const pick=sortOf(view.sort)||sortOf('title')!,sign=view.dir==='asc'?1:-1,blank=(v:string|number)=>v===''||v===undefined;
 const sorted=[...shown].sort((a,b)=>{const x=pick(a),y=pick(b);
  if(blank(x)!==blank(y))return blank(x)?1:-1; // lege waarden altijd onderaan
  const order=typeof x==='number'&&typeof y==='number'?x-y:String(x).localeCompare(String(y),'nl',{numeric:true});
  return order?order*sign:a.title.localeCompare(b.title,'nl');});
 const group=groups.find(g=>g.key===view.group);
 const sections:{name:string;rows:Row[]}[]=[];
 if(!group)sections.push({name:'',rows:sorted});
 else{const map=new Map<string,Row[]>();for(const row of sorted){const name=group.value(row)||'Overig';if(!map.has(name))map.set(name,[]);map.get(name)!.push(row);}
  sections.push(...[...map].sort((a,b)=>a[0]==='Overig'?1:b[0]==='Overig'?-1:a[0].localeCompare(b[0],'nl')).map(([name,rows])=>({name,rows})));}
 const setSort=(key:string,numeric=false)=>setView(v=>({...v,sort:key,dir:v.sort===key?(v.dir==='asc'?'desc':'asc'):numeric?'desc':'asc'}));
 const head=(key:string,label:string,numeric=false,sortable=true,width?:string)=><th key={key} scope="col" data-column={key} data-numeric={numeric||undefined} style={width?{width}:undefined} aria-sort={view.sort===key?(view.dir==='asc'?'ascending':'descending'):undefined}>
  {sortable?<button type="button" onClick={()=>setSort(key,numeric)}>{label}{view.sort===key?(view.dir==='asc'?<ArrowUp size={13} aria-hidden="true"/>:<ArrowDown size={13} aria-hidden="true"/>):<ChevronsUpDown size={13} aria-hidden="true" data-idle=""/>}</button>:label}</th>;
 const span=columns.length+(onSelect?4:3);
 const filtered=active.length>0;
 return <section className="catalogue-table" aria-label={`Lijst van ${noun[1]}`} ref={box}>
  <div className="catalogue-table-tools">
   <output className="catalogue-table-count"><strong>{shown.length}</strong> {shown.length===1?noun[0]:noun[1]}{(filtered||searching)&&shown.length!==rows.length?` van ${rows.length}`:''}{group&&sections.length>1?<> · {sections.length} {group.label.toLowerCase()==='familie'?'families':'groepen'}</>:null}</output>
   <div className="catalogue-table-filters">
    {filters.map(f=>{const chosen=view.filters[f.key]||'',options=[...new Set([...rows.flatMap(f.value),chosen])].filter(Boolean).sort((a,b)=>a.localeCompare(b,'nl'));if(options.length<2&&!chosen)return null;
     return <label key={f.key}><span>{f.label}</span><select value={view.filters[f.key]||''} onChange={e=>setView(v=>({...v,filters:{...v.filters,[f.key]:e.target.value}}))}><option value="">{f.all}</option>{options.map(o=><option key={o} value={o}>{o}</option>)}</select></label>;})}
    {groups.length>0&&<label><span>Groeperen</span><select value={view.group} onChange={e=>setView(v=>({...v,group:e.target.value,sort:allColumns.some(c=>c.key===v.sort&&c.groupKey===e.target.value)?defaultSort:v.sort}))}>{groups.map(g=><option key={g.key} value={g.key}>Op {g.label.toLowerCase()}</option>)}<option value="">Niet groeperen</option></select></label>}
    <Button variant="ghost" aria-disabled={!filtered} data-idle={!filtered||undefined} onClick={()=>{if(filtered)setView(v=>({...v,filters:{}}));}}>Filters wissen</Button>
   </div>
  </div>
  {shown.length===0?<div className="catalogue-table-empty">{empty}</div>:
  <div className="catalogue-table-scroll"><table>
   <thead><tr>
    {onSelect&&<th scope="col" className="catalogue-table-check">{(()=>{const pickable=shown.filter(r=>r.total>0),all=pickable.length>0&&pickable.every(r=>r.all),some=pickable.some(r=>r.selected>0);
     return <span className="catalogue-check-area"><Checkbox checked={all} indeterminate={some&&!all} disabled={disabled||!pickable.length} aria-label={`Alles selecteren van de ${shown.length} getoonde ${shown.length===1?noun[0]:noun[1]}`} onCheckedChange={value=>onSelect(pickable.map(r=>r.id),value===true)}/></span>;})()}</th>}
    {head('title',nameLabel)}
    {columns.map(c=>head(c.key,c.label,c.numeric,Boolean(c.sort),c.width))}
    {head('selected',countLabel,true,true,'6.2rem')}
    <th scope="col" className="catalogue-table-open"><span className="sr-only">Openen</span></th>
   </tr></thead>
   {sections.map(section=>{const closed=Boolean(section.name)&&view.closed.includes(view.group+':'+section.name),pickable=section.rows.filter(r=>r.total>0),all=pickable.length>0&&pickable.every(r=>r.all),some=pickable.some(r=>r.selected>0),chosen=section.rows.filter(r=>r.selected>0).length,key=view.group+':'+section.name;
    return <tbody key={section.name||'all'}>
    {section.name&&<tr className="catalogue-table-group">
     {onSelect&&<td className="catalogue-table-check"><span className="catalogue-check-area"><Checkbox checked={all} indeterminate={some&&!all} disabled={disabled||!pickable.length} aria-label={`Alles selecteren in ${section.name}`} onCheckedChange={value=>onSelect(pickable.map(r=>r.id),value===true)}/></span></td>}
     <th colSpan={span-(onSelect?1:0)} scope="rowgroup"><button type="button" aria-expanded={!closed} onClick={()=>setView(v=>({...v,closed:closed?v.closed.filter(k=>k!==key):[...v.closed,key]}))}>{closed?<ChevronRight size={15} aria-hidden="true"/>:<ChevronDown size={15} aria-hidden="true"/>}<span>{section.name}</span></button><small>{section.rows.length} {section.rows.length===1?noun[0]:noun[1]}{chosen>0?` · ${chosen} met keuze`:''}</small>{group?.describe?.(section.name)&&<em>{group.describe(section.name)}</em>}</th></tr>}
    {!closed&&section.rows.map(row=><tr key={row.id} data-open={row.opened||undefined} data-chosen={row.selected>0||undefined}>
     {onSelect&&<td className="catalogue-table-check"><span className="catalogue-check-area"><Checkbox checked={row.all} indeterminate={row.partial} disabled={disabled||!row.total} aria-label={selectLabel(row)} onCheckedChange={value=>onSelect([row.id],value===true)}/></span></td>}
     <th scope="row" className="catalogue-table-name"><button type="button" onClick={()=>onOpen(row.id)}>{row.title}</button><span>{nameMeta(row)}{row.opened&&<em><FolderOpen size={12} aria-hidden="true"/>Geopend</em>}</span></th>
     {columns.map(c=><td key={c.key} data-numeric={c.numeric||undefined} data-column={c.key} title={c.title?.(row)}>{c.render(row)}</td>)}
     <td data-numeric="true" className="catalogue-table-selected" data-some={row.selected>0||undefined}>{row.total?<><span><strong>{row.selected}</strong><small> van {row.total}</small></span><i aria-hidden="true"><b style={{width:`${Math.round(100*row.selected/row.total)}%`}}/></i></>:<small>–</small>}</td>
     <td className="catalogue-table-open"><Button variant="ghost" tabIndex={-1} aria-hidden="true" onClick={()=>onOpen(row.id)}><ArrowRight size={16}/></Button></td>
    </tr>)}
   </tbody>;})}
  </table></div>}
 </section>;
}
