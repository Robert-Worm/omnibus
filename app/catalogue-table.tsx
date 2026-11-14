'use client';
// Lijstweergave van een catalogus: één tabel over de volle breedte, als alternatief voor de tegels.
// Sorteren, filteren en groeperen gebeurt hier; openen en selecteren blijft bij de pagina die de rijen levert.
import {useEffect,useRef,useState,type ReactNode} from 'react';
import {ArrowDown,ArrowRight,ArrowUp,ChevronDown,ChevronRight,ChevronsUpDown,FolderOpen,LayoutGrid,List,Search,X} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Checkbox} from '@/components/ui/checkbox';
import {Select,SelectContent,SelectItem,SelectTrigger} from '@/components/ui/select';
import {useBrowseState} from './browse-state';
import './catalogue-table.css';

export type CatalogueColumn<Row>={key:string;label:string;numeric?:boolean;width?:string;/** Kolom vervalt als de lijst op deze sleutel is gegroepeerd: de groepskop zegt het dan al. */groupKey?:string;/** Kolom vervalt als de tabel smaller is dan dit aantal pixels. */hideBelow?:number;sort?:(row:Row)=>string|number;render:(row:Row)=>ReactNode;title?:(row:Row)=>string};
export type CatalogueFilter<Row>={key:string;label:string;all:string;value:(row:Row)=>string[]};
export type CatalogueGroup<Row>={key:string;label:string;/** Meervoud voor de teller, bijvoorbeeld 'families'. */plural?:string;value:(row:Row)=>string;describe?:(name:string)=>string;/** Vaste volgorde van de groepen; zonder is het alfabetisch. */order?:(name:string)=>number;};
const SLOTS=['11.5rem','12rem','7.5rem','10rem'];
export type CatalogueRowBase={id:string;title:string;opened:boolean;selected:number;total:number;all:boolean;partial:boolean};

/** Breed scherm: de lijst heeft ruimte nodig. Op een telefoon blijven het tegels. */
export function useWideScreen(min=980){
 const [wide,setWide]=useState(()=>typeof window!=='undefined'&&window.matchMedia(`(min-width:${min}px)`).matches);
 useEffect(()=>{const media=window.matchMedia(`(min-width:${min}px)`);const update=()=>setWide(media.matches);update();media.addEventListener('change',update);return()=>media.removeEventListener('change',update);},[min]);
 return wide;
}
// Eén voorkeur voor alle overzichten (wetten en kaders, modellen, thema's en processen) en voor stap 1 en stap 2:
// wie Lijst kiest, ziet overal de lijst. Alle schakelaars op de pagina lopen gelijk.
const viewListeners=new Set<(mode:'tiles'|'list')=>void>();
export function useCatalogueView(){
 const [view,setView,ready]=useBrowseState('catalogue-view',{mode:'tiles' as 'tiles'|'list'},'local'),wide=useWideScreen();
 useEffect(()=>{const listener=(mode:'tiles'|'list')=>setView({mode});viewListeners.add(listener);return()=>{viewListeners.delete(listener);};},[setView]);
 return {list:ready&&wide&&view.mode==='list',available:wide,mode:view.mode,setMode:(mode:'tiles'|'list')=>{for(const listener of viewListeners)listener(mode);}};
}
export function CatalogueViewToggle({mode,onChange}:{mode:'tiles'|'list';onChange:(mode:'tiles'|'list')=>void}){
 return <fieldset className="catalogue-view-toggle"><legend className="sr-only">Weergave van het overzicht</legend>
  <button type="button" aria-pressed={mode==='tiles'} onClick={()=>onChange('tiles')}><LayoutGrid size={15} aria-hidden="true"/>Tegels</button>
  <button type="button" aria-pressed={mode==='list'} onClick={()=>onChange('list')}><List size={15} aria-hidden="true"/>Lijst</button>
 </fieldset>;
}

/** Celinhoud met uitleg bij aanwijzen of focus; dezelfde vorm als de uitleg bij de symbolen in "Voor wie". */
export function CellTip({label,tip,children,plain=false}:{label:string;tip:ReactNode;children:ReactNode;/** Zonder stippellijn, voor een symbool of meter. */plain?:boolean}){
 return <button type="button" className="catalogue-cell-tip" data-plain={plain||undefined} aria-label={label}><span className="catalogue-cell-tip-text">{children}</span><span className="audience-tip" aria-hidden="true">{tip}</span></button>;
}

/** Keuzelijst als compacte knop: het label staat erin, de gekozen waarde ernaast. Het menu is het gedeelde Select-onderdeel
 * van de app, zodat het er in elke browser hetzelfde uitziet. */
const none='__geen';
function ToolSelect({label,value,onChange,options,active=false}:{label:string;value:string;onChange:(value:string)=>void;options:{value:string;label:string}[];active?:boolean}){
 const current=options.find(o=>o.value===value)?.label??value;
 return <Select value={value||none} onValueChange={next=>{if(typeof next==='string')onChange(next===none?'':next);}}>
  <SelectTrigger className="catalogue-tool" data-active={active||undefined} aria-label={`${label} ${current}`}><span className="catalogue-tool-label">{label}</span><span className="catalogue-tool-value">{current}</span></SelectTrigger>
  <SelectContent className="catalogue-tool-menu" alignItemWithTrigger={false} align="start">{options.map(o=><SelectItem key={o.value||none} value={o.value||none} className="catalogue-tool-option">{o.label}</SelectItem>)}</SelectContent>
 </Select>;
}

export default function CatalogueTable<Row extends CatalogueRowBase>({id,noun,unit,search,rows,filters,groups,nameLabel='Naam',nameMeta,describe:describeRow,countLabel='Gekozen',selectLabel,hint,chosenUnique,onOpen,onSelect,gutter=false,dense=false,disabled=false,empty,searching=false,defaultSort='title',columns:allColumns}:{
 id:string;noun:[string,string];/** Wat er gekozen wordt, bijvoorbeeld ['toetspunt','toetspunten']. */unit:[string,string];
 /** Zoekveld in de werkbalk: zoeken en filteren horen bij elkaar. */search?:{id:string;label:string;placeholder:string;value:string;onChange:(value:string)=>void};rows:Row[];columns:CatalogueColumn<Row>[];filters:CatalogueFilter<Row>[];
 groups:CatalogueGroup<Row>[];
 nameLabel?:string;nameMeta:(row:Row)=>ReactNode;/** Korte omschrijving die verschijnt als je de naam aanwijst. */describe?:(row:Row)=>ReactNode;countLabel?:string;selectLabel:(row:Row)=>string;/** Korte uitleg in de telregel zolang er niets gekozen is. */hint?:string;/** Aantal unieke gekozen onderdelen, als hetzelfde onderdeel in meer rijen voorkomt. */chosenUnique?:number;
 onOpen:(id:string)=>void;onSelect?:(ids:string[],checked:boolean)=>void;/** Lege eerste kolom als er geen vinkjes zijn, zodat de naam in elke lijst op dezelfde plek begint. */gutter?:boolean;/** Lagere rijen, voor lijsten met alleen symbolen en cijfers. */dense?:boolean;disabled?:boolean;empty:ReactNode;searching?:boolean;defaultSort?:string}){
 const [view,setView]=useBrowseState('catalogue-table-'+id,{sort:defaultSort,dir:'asc' as 'asc'|'desc',group:groups[0]?.key||'',filters:{} as Record<string,string>,closed:[] as string[]},'local');
 const box=useRef<HTMLElement>(null),[width,setWidth]=useState(1400);
 useEffect(()=>{const el=box.current;if(!el)return;const observer=new ResizeObserver(entries=>setWidth(Math.round(entries[0].contentRect.width)));observer.observe(el);return()=>observer.disconnect();},[]);
 // Vier vaste kolomplekken tussen de naam en "Gekozen", op elk tabblad even breed (besluit B-054). Heeft een lijst er
 // minder, dan blijft de plek leeg; zo staat elke kolom op elk tabblad op dezelfde plaats.
 const shownColumns=allColumns.filter(c=>c.key!=='spacer'&&(!c.groupKey||c.groupKey!==view.group)&&(!c.hideBelow||width>=c.hideBelow));
 const columns:CatalogueColumn<Row>[]=[...shownColumns,...Array.from({length:Math.max(0,SLOTS.length-shownColumns.length)},(_,i)=>({key:'slot-'+i,label:'',render:()=>null}))]
  .map((c,i)=>({...c,width:SLOTS[Math.min(i,SLOTS.length-1)]}));
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
  sections.push(...[...map].sort((a,b)=>a[0]==='Overig'?1:b[0]==='Overig'?-1:(group.order?group.order(a[0])-group.order(b[0]):0)||a[0].localeCompare(b[0],'nl')).map(([name,rows])=>({name,rows})));}
 const setSort=(key:string,numeric=false)=>setView(v=>({...v,sort:key,dir:v.sort===key?(v.dir==='asc'?'desc':'asc'):numeric?'desc':'asc'}));
 const head=(key:string,label:string,numeric=false,sortable=true,width?:string)=><th key={key} scope="col" data-column={key} data-numeric={numeric||undefined} style={width?{width}:undefined} aria-sort={view.sort===key?(view.dir==='asc'?'ascending':'descending'):undefined}>
  {sortable?<button type="button" onClick={()=>setSort(key,numeric)}>{label}{view.sort===key?(view.dir==='asc'?<ArrowUp size={13} aria-hidden="true"/>:<ArrowDown size={13} aria-hidden="true"/>):<ChevronsUpDown size={13} aria-hidden="true" data-idle=""/>}</button>:<span>{label}</span>}</th>;
 const lead=Boolean(onSelect)||gutter,span=columns.length+(lead?4:3);
 const filtered=active.length>0;
 const closedKeys=sections.filter(s=>s.name).map(s=>view.group+':'+s.name),allClosed=closedKeys.length>0&&closedKeys.every(k=>view.closed.includes(k));
 const chosenRows=shown.filter(r=>r.selected>0).length,chosenTotal=shown.reduce((sum,r)=>sum+r.selected,0);
 return <section className="catalogue-table" aria-label={`Lijst van ${noun[1]}`} ref={box}>
  <div className="catalogue-table-frame">
  <div className="catalogue-table-tools">
   {search&&<div className="catalogue-table-search"><Search size={15} aria-hidden="true"/><input id={search.id} type="search" aria-label={search.label} placeholder={search.placeholder} value={search.value} maxLength={500} onChange={e=>search.onChange(e.target.value)}/></div>}
   <div className="catalogue-table-filters">
    {filters.map(f=>{const chosen=view.filters[f.key]||'',options=[...new Set([...rows.flatMap(f.value),chosen])].filter(Boolean).sort((a,b)=>a.localeCompare(b,'nl'));if((options.length<2||f.key===view.group)&&!chosen)return null;
     return <ToolSelect key={f.key} label={f.label+':'} active={Boolean(chosen)} value={chosen} onChange={value=>setView(v=>({...v,filters:{...v.filters,[f.key]:value}}))} options={[{value:'',label:'Alle'},...options.map(o=>({value:o,label:o}))]}/>;})}
    {(filtered||Boolean(search?.value))&&<button type="button" className="catalogue-tool-clear" onClick={()=>{setView(v=>({...v,filters:{}}));if(search?.value)search.onChange('');}}><X size={14} aria-hidden="true"/>{search?.value?'Wis zoeken en filters':'Filters wissen'}</button>}
   </div>
   {groups.length>0&&<div className="catalogue-table-grouping">
    <ToolSelect label="Groeperen op:" value={view.group} onChange={value=>setView(v=>({...v,group:value,sort:allColumns.some(c=>c.key===v.sort&&c.groupKey===value)?defaultSort:v.sort}))} options={[...groups.map(g=>({value:g.key,label:g.label})),{value:'',label:'Niet groeperen'}]}/>
    {group&&<button type="button" className="catalogue-tool-clear" disabled={sections.length<1} onClick={()=>setView(v=>({...v,closed:allClosed?v.closed.filter(k=>!closedKeys.includes(k)):[...new Set([...v.closed,...closedKeys])]}))}>{allClosed?'Groepen uitklappen':'Groepen inklappen'}</button>}
   </div>}
  </div>
  <output className="catalogue-table-count"><span><strong>{shown.length}</strong>{(filtered||searching)&&shown.length!==rows.length?` van ${rows.length}`:''} {shown.length===1&&!((filtered||searching)&&shown.length!==rows.length)?noun[0]:noun[1]}{group&&sections.length>1?` · ${sections.length} ${group.plural||'groepen'}`:''}</span>{chosenTotal>0?<em>{chosenUnique===undefined?`${chosenTotal} ${chosenTotal===1?unit[0]:unit[1]} gekozen uit ${chosenRows} ${chosenRows===1?noun[0]:noun[1]}`:`${chosenUnique} ${chosenUnique===1?unit[0]:unit[1]} gekozen, te zien bij ${chosenRows} ${chosenRows===1?noun[0]:noun[1]}`}</em>:null}{hint&&<small className="sr-only">{hint}</small>}</output>
  {shown.length===0?<div className="catalogue-table-empty">{empty}</div>:
  <div className="catalogue-table-scroll"><table data-dense={dense||undefined}>
   <thead><tr>
    {onSelect&&<th scope="col" className="catalogue-table-check">{(()=>{const pickable=shown.filter(r=>r.total>0),all=pickable.length>0&&pickable.every(r=>r.all),some=pickable.some(r=>r.selected>0);
     return <span className="catalogue-check-area" title={`Kies alle ${unit[1]} van de ${shown.length} getoonde ${noun[1]}`}><Checkbox checked={all} indeterminate={some&&!all} disabled={disabled||!pickable.length} aria-label={`Kies alle ${unit[1]} van de ${shown.length} getoonde ${shown.length===1?noun[0]:noun[1]}`} onCheckedChange={value=>onSelect(pickable.map(r=>r.id),value===true)}/></span>;})()}</th>}
    {!onSelect&&gutter&&<td className="catalogue-table-check" aria-hidden="true"/>}
    {head('title',nameLabel)}
    {columns.map(c=>head(c.key,c.label,c.numeric,Boolean(c.sort)&&!c.key.startsWith('slot-'),c.width))}
    {head('selected',countLabel,true,true,'9.5rem')}
    <th scope="col" className="catalogue-table-open"><span className="sr-only">Openen</span></th>
   </tr></thead>
   {sections.map((section,index)=>{const closed=Boolean(section.name)&&view.closed.includes(view.group+':'+section.name),pickable=section.rows.filter(r=>r.total>0),all=pickable.length>0&&pickable.every(r=>r.all),some=pickable.some(r=>r.selected>0),chosen=section.rows.filter(r=>r.selected>0).length,key=view.group+':'+section.name,describe=group?.describe?.(section.name);
    return <tbody key={section.name||'all'}>
    {section.name&&<tr className="catalogue-table-group" data-closed={closed||undefined}>
     {onSelect&&<td className="catalogue-table-check"><span className="catalogue-check-area" title={`Kies alle ${unit[1]} in ${section.name}`}><Checkbox checked={all} indeterminate={some&&!all} disabled={disabled||!pickable.length} aria-label={`Kies alle ${unit[1]} in ${section.name}`} onCheckedChange={value=>onSelect(pickable.map(r=>r.id),value===true)}/></span></td>}
     {!onSelect&&gutter&&<td className="catalogue-table-check" aria-hidden="true"/>}
     <th colSpan={span-(lead?1:0)} scope="rowgroup" title={describe||undefined} aria-describedby={describe?`${id}-group-${index}`:undefined}><div><button type="button" aria-expanded={!closed} onClick={()=>setView(v=>({...v,closed:closed?v.closed.filter(k=>k!==key):[...v.closed,key]}))}>{closed?<ChevronRight size={15} aria-hidden="true"/>:<ChevronDown size={15} aria-hidden="true"/>}<span>{section.name}</span></button>{describe&&<p id={`${id}-group-${index}`} className="sr-only">{describe}</p>}{chosen>0&&<em>keuze in {chosen}</em>}<small className="sr-only">{section.rows.length} {section.rows.length===1?noun[0]:noun[1]}</small></div></th></tr>}
    {!closed&&section.rows.map(row=><tr key={row.id} data-row="" data-open={row.opened||undefined} data-chosen={row.selected>0||undefined} onClick={event=>{if(!(event.target as HTMLElement).closest('button,a,input,[role=checkbox],.catalogue-table-check'))onOpen(row.id);}}>
     {onSelect&&<td className="catalogue-table-check"><span className="catalogue-check-area" title={selectLabel(row)}><Checkbox checked={row.all} indeterminate={row.partial} disabled={disabled||!row.total} aria-label={selectLabel(row)} onCheckedChange={value=>onSelect([row.id],value===true)}/></span></td>}
     {!onSelect&&gutter&&<td className="catalogue-table-check" aria-hidden="true"/>}
     <th scope="row" className="catalogue-table-name">{(()=>{const text=describeRow?.(row);return <><button type="button" aria-describedby={text?`${id}-about-${row.id}`:undefined} onClick={()=>onOpen(row.id)}>{row.title}</button>{text&&<span id={`${id}-about-${row.id}`} role="tooltip" className="audience-tip catalogue-name-tip">{text}</span>}</>;})()}<span>{nameMeta(row)}{row.opened&&<em><FolderOpen size={12} aria-hidden="true"/>Geopend</em>}</span></th>
     {columns.map(c=><td key={c.key} data-numeric={c.numeric||undefined} data-column={c.key} title={c.title?.(row)}>{c.render(row)}</td>)}
     <td data-numeric="true" className="catalogue-table-selected" data-some={row.selected>0||undefined}>{row.total?<><span><strong>{row.selected}</strong> van {row.total}</span><i aria-hidden="true"><b style={{width:`${Math.round(100*row.selected/row.total)}%`}}/></i></>:<small>–</small>}</td>
     <td className="catalogue-table-open"><Button variant="ghost" tabIndex={-1} aria-hidden="true" onClick={()=>onOpen(row.id)}><ArrowRight size={16}/></Button></td>
    </tr>)}
   </tbody>;})}
  </table></div>}
  </div>
 </section>;
}
