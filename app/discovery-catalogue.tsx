"use client";
import {countLabel} from '@/lib/display-count.mjs';
import {useEffect,useRef} from 'react';
import type {ReactNode} from 'react';
import {Layers,ListFilter,ArrowRight,ArrowLeft,FolderOpen,Landmark,Users,Monitor,ShieldCheck,Database,Network,HandHeart,Package,BookOpen,Brain,Scale} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {groupedDiscovery} from '@/lib/discovery-navigation.mjs';
import type {Theme} from './workspace-catalogues';
import DirectorySearch from './directory-search';
import {TermText} from './term-help';
import CatalogueCardActions from './catalogue-card-actions';
import {catalogueSelection} from '@/lib/catalogue-selection.mjs';

type View=Theme&{axis:string;categoryId:string;description:string};
export type DirectoryView={query:string;expanded:string[];closedSearchGroups:string[];limits:Record<string,number>};
export const emptyDirectoryView=():DirectoryView=>({query:'',expanded:[],closedSearchGroups:[],limits:{}});
const familyIcons:Record<string,typeof Layers>={public:Landmark,organisation:Users,operations:Monitor,security:ShieldCheck,technology:Monitor,policy:Landmark,information:Database,governance:Network,integrity:ShieldCheck,service:HandHeart,resources:Package};

export default function DiscoveryCatalogue({views,axis,onAxis,openIds,onOpen,onToggle,onWorkspace,view,onViewChange,guided=false,onSources,onFrameworks,onModels,area=axis,children,included=[],onSelect,disabled=false}:{views:View[];axis:'themes'|'processes';onAxis:(axis:'themes'|'processes')=>void;openIds:string[];onOpen:(id:string)=>void;onToggle:(id:string,open:boolean)=>void;onWorkspace:()=>void;view:DirectoryView;onViewChange:(patch:Partial<DirectoryView>)=>void;guided?:boolean;onSources?:()=>void;onFrameworks?:()=>void;onModels?:()=>void;area?:'themes'|'processes'|'laws'|'frameworks'|'models';children?:ReactNode;included?:string[];onSelect?:(ids:string[],include:boolean)=>void;disabled?:boolean}){
 const {query,expanded,closedSearchGroups,limits}=view;
 const groups=groupedDiscovery(views,axis,query);
 const selectedGroup=!query&&groups.find(g=>g.id===expanded.at(-1));
 const detailGroups=query?groups:selectedGroup?[selectedGroup]:[];
 const noun=axis==='themes'?'thema’s':'processen';
 const familyHeading=useRef<HTMLHeadingElement>(null);
 const focusRequest=useRef(false);
 const returnCard=useRef('');
 const cards=useRef<HTMLDivElement>(null);
 const focusSearch=()=>{if(typeof document!=='undefined')document.getElementById('directory-search')?.focus();};
 useEffect(()=>{
  if(focusRequest.current){familyHeading.current?.focus();focusRequest.current=false;}
  if(returnCard.current){cards.current?.querySelector<HTMLButtonElement>('[data-family="'+returnCard.current+'"]')?.focus();returnCard.current='';}
 },[selectedGroup]);
 return <section className="catalogue-explorer discovery-directory foundation-catalogue" aria-label="Thema’s en processen openen">
  <header className="directory-heading"><div><h2>{guided?'Waar wil je beginnen?':'Verken thema’s en processen'}</h2><p className="directory-lead"><TermText text={guided?'Verken eerdere risico’s via thema’s of processen, of begin bij een wet, kader of model.':'Open een thema of proces om de inzichten uit eerdere onderzoeken te bekijken.'}/></p></div>{guided&&openIds.length>0&&<Button variant="outline" onClick={onWorkspace}><FolderOpen size={16} aria-hidden="true"/>Geopend ({openIds.length})</Button>}</header>
  <fieldset className="directory-axis" data-guided={guided}  aria-label="Bladeren op">
   <button type="button" aria-pressed={area==='themes'} onClick={()=>onAxis('themes')}><Layers size={22} aria-hidden="true"/><span><strong>Thema’s</strong><small>Breed verkennen · meerdere processen</small></span></button>
   <button type="button" aria-pressed={area==='processes'} onClick={()=>onAxis('processes')}><ListFilter size={22} aria-hidden="true"/><span><strong>Processen</strong><small>Gericht zoeken · één activiteit</small></span></button>
   {guided&&onSources&&<button type="button" aria-pressed={area==='laws'} onClick={onSources}><Scale size={22} aria-hidden="true"/><span><strong>Wetten</strong><small>Verken wettelijke eisen</small></span></button>}
   {guided&&onFrameworks&&<button type="button" aria-pressed={area==='frameworks'} onClick={onFrameworks}><BookOpen size={22} aria-hidden="true"/><span><strong>Kaders</strong><small>Verken beheersing en normen</small></span></button>}
   {guided&&onModels&&<button type="button" aria-pressed={area==='models'} onClick={onModels}><Brain size={22} aria-hidden="true"/><span><strong>Wetenschappelijke modellen</strong><small>Verken begrippen, variabelen en vragen</small></span></button>}
  </fieldset>
  {guided&&(area==='laws'||area==='frameworks'||area==='models')?<div className="directory-inline-catalogue">{children}</div>:<>
  <DirectorySearch id="directory-search" label={axis==='themes'?'Zoek thema of themagroep':'Zoek proces of procesfamilie'} value={query} onChange={value=>onViewChange({query:value,closedSearchGroups:[],limits:{}})} placeholder={axis==='themes'?'Bijvoorbeeld: informatie of dienstverlening':'Bijvoorbeeld: toegang of betalingen'}/>
  {!query&&!selectedGroup&&<div className="directory-family-cards" ref={cards}>{groups.map(group=>{const Icon=familyIcons[group.id]||Layers;return <button type="button" key={group.id} data-family={group.id} className="directory-family-card" onClick={()=>{focusRequest.current=true;onViewChange({expanded:[group.id]});}}>
   <Icon size={24} aria-hidden="true"/><strong>{group.title}</strong><span>{group.description}</span><small>Verken {countLabel(group.children.length,noun)}<ArrowRight size={16} aria-hidden="true"/></small>
  </button>;})}</div>}
  {selectedGroup&&<Button variant="ghost" className="directory-back" onClick={()=>{returnCard.current=selectedGroup.id;onViewChange({expanded:[]});}}><ArrowLeft size={15} aria-hidden="true"/>Alle {axis==='themes'?'themagroepen':'procesfamilies'}</Button>}
  {query&&<output className="directory-result-count" data-status-block="">{countLabel(groups.reduce((sum,g)=>sum+g.children.length,0),noun)} gevonden in {countLabel(groups.length,'groepen')}</output>}
  <div className="directory-families">{detailGroups.map(group=>{const Icon=familyIcons[group.id]||Layers;return <section className="directory-family" key={group.id} id={'family-'+axis+'-'+group.id}>
   <header className="directory-family-heading"><h3 ref={selectedGroup?familyHeading:undefined} tabIndex={-1}>{query?<button type="button" aria-expanded={!closedSearchGroups.includes(group.id)} aria-controls={'children-'+axis+'-'+group.id} onClick={()=>onViewChange({closedSearchGroups:closedSearchGroups.includes(group.id)?closedSearchGroups.filter(id=>id!==group.id):[...closedSearchGroups,group.id]})}><span className="directory-family-title"><Icon size={20} aria-hidden="true"/>{group.title}</span><span aria-hidden="true">{closedSearchGroups.includes(group.id)?'+':'−'}</span></button>:<span className="directory-family-title"><Icon size={20} aria-hidden="true"/>{group.title}</span>}</h3>{selectedGroup&&<p>{group.description}</p>}</header>
   {(!query||!closedSearchGroups.includes(group.id))&&<div id={'children-'+axis+'-'+group.id} className="directory-children">{group.children.slice(0,limits[group.id]||12).map((item:View)=><article key={item.id} data-open={openIds.includes(item.id)}>
    <div className="directory-child-body"><span className="catalogue-card-id">{axis==='themes'?'Thema':'Proces'}</span><h4>{item.title}</h4>{item.description&&<p>{item.description}</p>}<div className="catalogue-card-stats"><span><strong>{item.lineIds.length}</strong> {item.lineIds.length===1?'bouwsteen':'bouwstenen'}</span><span><strong>{item.reportIds.length}</strong> {item.reportIds.length===1?'bronrapport':'bronrapporten'}</span><span className="catalogue-card-selected"><strong>{catalogueSelection({included},item.lineIds).selected}</strong> gekozen</span></div></div>
    <CatalogueCardActions layout="buttons" title={item.title} opened={openIds.includes(item.id)} onOpen={()=>onOpen(item.id)} onToggle={value=>onToggle(item.id,value)} disabled={disabled}
      selection={onSelect?{label:'Alle bouwstenen',checked:catalogueSelection({included},item.lineIds).all,partial:catalogueSelection({included},item.lineIds).partial,disabled:!item.lineIds.length,onChange:value=>onSelect(item.lineIds,value)}:undefined}/>
   </article>)}{group.children.length>(limits[group.id]||12)&&<Button variant="link" onClick={()=>onViewChange({limits:{...limits,[group.id]:(limits[group.id]||12)+12}})}>Toon meer onderdelen</Button>}</div>}
  </section>;})}</div>
  {!groups.length&&<output data-status-block="">Geen passend onderdeel gevonden. <Button variant="link" onClick={()=>{onViewChange({query:'',expanded:[]});focusSearch();}}>Toon alle groepen</Button></output>}
  <p className="directory-note"><TermText text="Risico’s uit eerdere onderzoeken zijn aanknopingspunten, geen oordeel over jouw organisatie."/></p>
 </>}
 </section>;
}
