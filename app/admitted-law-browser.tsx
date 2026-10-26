'use client';
import {useMemo,useState,useSyncExternalStore} from 'react';
import {catalogueRevision,onCatalogueChange} from '@/lib/catalogue-runtime.mjs';
import CioLawBrowser,{type LawBrowserAdapter} from './cio-law-browser';
import {LawAboutIntro,LawAboutSpecifications} from './law-about-layout';
import {LawPointSourceLayout} from './law-point-source';
import FoundationSourceReader from './lazy-foundation-reader';
import {foundations,foundationProposals} from '@/lib/investigation.mjs';
import {chooseFoundationItems} from '@/lib/foundation-workspace.mjs';
import {flatLawPresentation,flatLawSelection} from '@/lib/admitted-foundation.mjs';
import type {Draft} from '@/lib/framework-types';
import type {LawOverviewProps} from './law-overview-state';
import {foundationQuestionPresentation} from '@/lib/source-question-presentation.mjs';
import {NO_APPROVED_QUESTION} from '@/lib/investigation.mjs';
type Item=(typeof foundationProposals)[number];
type Source=(typeof foundations)[number];
function About({source,items}:{source:Source;items:Item[]}){
 const context=items.filter(p=>p.auditRole!=='norm');
 return <section className="law-about" aria-label={'Achtergrond '+source.title}>
  <LawAboutIntro title={source.title} links={[{label:'Officiële publicatie',url:source.url}]}><p>{source.usage}</p></LawAboutIntro>
  <LawAboutSpecifications><div><dt>Uitgave</dt><dd>{source.edition}</dd></div><div><dt>Omvang</dt><dd>{items.filter(p=>p.auditRole==='norm').length} normen · {context.length} afbakeningspunten</dd></div></LawAboutSpecifications>
  <section className="law-about-card"><h3>Voor wie en waarvoor?</h3><p>{source.context}</p></section>
  <section className="law-about-card"><h3>Toepassing en afbakening</h3>{context.map(p=><div key={p.id}><h4>{p.title}</h4><p>{p.auditNorm}</p><p>{p.sourceContext}</p></div>)}</section>
  <section className="law-about-card"><h3>Bronkwaliteit en beperkingen</h3><p>{source.coverage}</p><p>{items[0]?.statusNote}</p><p>{items[0]?.sourceChanges}</p></section>
 </section>;
}
function SourceContent({item}:{item:Item}){
 const [active,setActive]=useState<'criterion'|'source'>('criterion');
 return <LawPointSourceLayout label={'Bron bij '+item.title} summary={<header className="cio-norm-summary"><h3>{item.title}</h3><p>{item.auditNorm}</p></header>}
  publication={<a href={item.sourceUrl} target="_blank" rel="noreferrer">Officiële publicatie ↗</a>}
  criterion={<div className="cio-source-explanation"><h3>Toepassing en voorwaarden</h3><p>{item.sourceContext}</p><h3>Herleiding</h3><p>{item.location}</p><p>{item.sourceChanges}</p><p>{item.statusNote}</p></div>}
  source={<FoundationSourceReader reference={item} inline lawDocument onReturn={()=>setActive('criterion')}/>}
  active={active} onActive={setActive}/>;
}
function Approach({item}:{item:Item}){
 const question=foundationQuestionPresentation(item);
 return <div className="cio-approach">{item.question&&<section className="cio-phase"><h4>Vraag aan de gesprekspartner</h4><p>{question.text || NO_APPROVED_QUESTION}</p>{question.text && !question.review.approved && <small>Inhoudelijke beoordeling van deze vraag niet vastgesteld.</small>}</section>}<div className="cio-phase-grid">{[['Opzet',item.testDesign],['Bestaan',item.testExistence]].map(([title,text])=><section key={title} className="cio-phase"><h4>{title}</h4><p>{text}</p></section>)}</div>
  {item.testOperation&&<section className="cio-phase"><h4>Werking · uit te werken voor je onderzoek</h4><p>{item.testOperation}</p></section>}
  <section className="cio-phase"><h4>Bewijsmateriaal · suggesties</h4><p>{item.documents}</p></section></div>;
}
type Props=LawOverviewProps&{sourceId:string;draft:Draft;onChange:(draft:Draft)=>void;navigate:(page:string)=>void;disabled?:boolean;initialPointId?:string;viewerOnly?:boolean;onClose?:()=>void;prepareDetails?:(action:()=>void)=>void};
export default function AdmittedLawBrowser({sourceId,...props}:Props){
 const revision=useSyncExternalStore(onCatalogueChange,catalogueRevision,catalogueRevision);
 const source=foundations.find(s=>s.id===sourceId)!;
 const adapter=useMemo(()=>{
  const members=foundationProposals.filter(p=>p.sourceId===sourceId),presentation=flatLawPresentation(source,members);
  const item=(id:string)=>members.find(p=>p.id===id)!;
  return {...presentation,revision,sourceId,title:source.title,heading:source.title,viewKey:'admitted-'+sourceId+'-v1',
   analysisNotice:'Doel, risico en beheersing zijn analytische voorstellen bij de norm, geen aanvullende wettelijke eisen.',
   selection:(draft:Draft,ids?:string[])=>flatLawSelection(draft,members,ids),
   choose:(draft:Draft,ids:string[],include:boolean)=>{
    const sourceIds=draft.investigation?.sourceIds||[];
    const opened={...draft,investigation:{...draft.investigation,sourceIds:[...new Set([...sourceIds,sourceId])]}};
    // This callback may have been created before full content finished loading.
    const current=flatLawPresentation(source,foundationProposals.filter(p=>p.sourceId===sourceId));
    const next=chooseFoundationItems(opened,current.items.filter((p:Item)=>ids.includes(p.id)),include);
    return {...next,investigation:{...next.investigation,sourceIds}};
   },
   About:()=> <About source={source} items={members}/>,Source:({point}:{point:{id:string}})=><SourceContent item={item(point.id)}/>,
   Approach:({point}:{point:{id:string}})=><Approach item={item(point.id)}/>,
  } as unknown as LawBrowserAdapter;
 },[sourceId,source,revision]);
 return <CioLawBrowser {...props} adapter={adapter} hideOpenStrip/>;
}
