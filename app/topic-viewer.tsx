'use client';
// Een onderwerp als één geheel (B-072): de normen van alle bronnen onder elkaar, per bron een sectie. Elke sectie is de
// gewone viewer van die bron, vast gefilterd op het onderwerp. Er is dus één selectie: wat je hier kiest, staat ook in de
// viewer van de bron en in de lijst, en omgekeerd.
import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import {ArrowLeft,ArrowRight,BookOpen,Layers,ShieldCheck,SlidersHorizontal,Users} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {catalogueRevision,onCatalogueChange} from '@/lib/catalogue-runtime.mjs';
import {foundations} from '@/lib/investigation.mjs';
import {sourceAudienceNotice} from '@/lib/source-scope.mjs';
import {frameworkTitle} from '@/lib/framework-title.mjs';
import {countLabel} from '@/lib/display-count.mjs';
import {topicalPackage} from '@/lib/topical-content.mjs';
import {topicalSelection,chooseTopicalPoints} from '@/lib/topical-selection.mjs';
import type {TopicFamily} from '@/lib/family-topics.mjs';
import type {Draft} from '@/lib/framework-types';
import TopicalLawBrowser from './topical-law-browser';
import './topic-viewer.css';

type Props={family:TopicFamily;value:string;draft:Draft;onChange:(draft:Draft)=>void;disabled?:boolean;navigate:(page:string)=>void;
 /** Haal de volledige bron op en voer daarna de handeling uit. */prepare:(id:string,action:()=>void)=>void;
 /** Is deze bron beschikbaar in de huidige verzameling? */allowed:(id:string)=>boolean;onOpenSource:(id:string)=>void;/** Alleen bij één open onderwerp: terug naar het overzicht, links van Kies alle. */onBack?:()=>void;/** Vervang dit onderwerp door een ander (links in Over dit onderwerp). */onSwitch?:(value:string)=>void};

const pointsOf=(sourceId:string,normIds:string[])=>{const pack=topicalPackage(sourceId),norms=new Set(normIds);
 return pack?.catalogue?.points?.length?pack.catalogue.points.filter((point:{id:string;criterion_id:string})=>norms.has(point.criterion_id)).map((point:{id:string})=>point.id) as string[]:null;};

export default function TopicViewer({family,value,draft,onChange,disabled,navigate,prepare,allowed,onOpenSource,onBack,onSwitch}:Props){
 useSyncExternalStore(onCatalogueChange,catalogueRevision,catalogueRevision);
 const [tab,setTab]=useState<'norms'|'about'>('norms');
 const sources=family.choiceSources(value).filter(source=>allowed(source.id)),basis=family.basis(value);
 const regimeOnly=family.otherRegimeSourceIds(value).filter(id=>allowed(id)&&!sources.some(source=>source.id===id));
 // De bronnen laden zodra het onderwerp in beeld komt; een sectie verschijnt als haar bron er is.
 const load=useRef(prepare),ids=[...sources.map(source=>source.id),...regimeOnly].join('|');
 useEffect(()=>{load.current=prepare;});
 useEffect(()=>{for(const id of ids.split('|').filter(Boolean))load.current(id,()=>{});},[ids]);
 const parts=sources.map(source=>{const points=pointsOf(source.id,source.normIds),state=points?topicalSelection(draft,source.id,points):null;return {...source,points,state};});
 const own=parts.filter(part=>part.laag===basis),ready=own.length>0&&own.every(part=>part.points);
 const total=own.reduce((sum,part)=>sum+(part.state?.total||0),0),selected=own.reduce((sum,part)=>sum+(part.state?.selected||0),0);
 const chooseAll=(include:boolean)=>{let next=draft;const open=draft.investigation?.sourceIds||[];
  for(const part of own){if(!part.points)return;next=chooseTopicalPoints(next,part.id,part.points,include) as Draft;
   const drop=include?pointsOf(part.id,family.otherRegimeNormIds(part.id,value)):null;if(drop?.length)next=chooseTopicalPoints(next,part.id,drop,false) as Draft;}
  // Ook bronnen die onder dit kader niets hebben, maar wel normen alleen voor het andere kader (testronde 19 november 2026).
  if(include)for(const id of regimeOnly){const drop=pointsOf(id,family.otherRegimeNormIds(id,value));if(drop?.length)next=chooseTopicalPoints(next,id,drop,false) as Draft;}
  // Kiezen opent geen bronnen: de lijst met geopende bronnen blijft zoals ze was.
  onChange({...next,investigation:{...next.investigation,sourceIds:open}} as Draft);};
 const title=(id:string)=>frameworkTitle(foundations.find(source=>source.id===id)?.title||id);
 const beside=basis==='wet'&&parts.some(part=>part.laag!=='wet')&&family.labels.practice?.name?`, ${family.labels.practice.name} ernaast`:'';
 const what=basis==='wet'?`${countLabel(own.length,'bronnen')}${beside}`:family.labels.practice?.full||'';
 const notice=(()=>{const found=own.map(part=>sourceAudienceNotice(part.id)).find(Boolean);return found?{...found,text:found.text.replace(/^Dit kader/u,'Dit onderwerp')}:null;})();
 const topic=family.topics.find(item=>item.id===family.decode(value)?.topic);
 const allChosen=ready&&total>0&&selected>=total;
 // Dezelfde opbouw als de viewer van één bron (B-078): tabs met Terug rechts, kop met een rustige knop, de regel voor wie.
 return <section className="topic-viewer" aria-labelledby="topic-viewer-title">
  <div className="law-view-actions topic-viewer-bar"><nav className="law-overview-tabs" aria-label="Onderwerpweergave">
    <button aria-pressed={tab==='norms'} onClick={()=>setTab('norms')}>Normen</button><button aria-pressed={tab==='about'} onClick={()=>setTab('about')}>Over dit onderwerp</button></nav>
   {onBack&&<Button variant="outline" className="topic-viewer-back" onClick={onBack}><ArrowLeft aria-hidden="true"/>Terug naar alle wetten &amp; kaders</Button>}</div>
  <div className="law-browse-intro"><div className="law-viewer-heading"><h2 id="topic-viewer-title">{family.label(value)}</h2>
    <output aria-live="polite">{what}{ready&&<> · {selected} van {total} toetspunten gekozen</>}</output></div>
   {notice&&<p className={`law-audience-notice law-audience-${notice.role}`}><Users size={15} aria-hidden="true"/><span><strong>{notice.title}.</strong> {notice.text}</span></p>}
   <div className="law-selection-actions"><Button variant="outline" className="law-topic-choose" disabled={disabled||!ready||!total} aria-pressed={allChosen} onClick={()=>chooseAll(!allChosen)}>{allChosen?'Deselecteer onderwerp':ready?`Kies alle ${total} toetspunten`:'Toetspunten tellen…'}</Button></div></div>
  {tab==='about'?<TopicAbout family={family} value={value} topic={topic} parts={parts} basis={basis} title={title} onSwitch={onSwitch} onBack={onBack}/>:parts.map(part=><section className="topic-viewer-source" key={part.id} aria-label={title(part.id)}>
   <header><div><h3>{title(part.id)}</h3><p><span className="catalogue-pill" data-tone={part.laag==='wet'&&family.tone?family.tone:undefined}>{part.soort}</span>
     <span>{part.normIds.length} {part.normIds.length===1?'norm':'normen'}{part.state&&<> · {part.state.selected} van {part.state.total} toetspunten gekozen</>}</span></p></div>
    <Button variant="outline" onClick={()=>onOpenSource(part.id)}>Open bron<ArrowRight size={14} aria-hidden="true"/></Button></header>
   {topicalPackage(part.id)?<TopicalLawBrowser embedTopic={value} sourceId={part.id} draft={draft} onChange={onChange} navigate={navigate} disabled={disabled}
     overview="norms" onOverviewChange={()=>{}} prepareDetails={action=>prepare(part.id,action)}/>:<p className="topic-viewer-loading">Normen laden…</p>}
  </section>)}
 </section>;
}

/** Over dit onderwerp: wat erin zit en wat niet, uit welke bronnen, wat je erbij kunt kiezen, hoe je een andere keuze maakt
 * en hoe de indeling is gemaakt. De teksten komen met de familie uit de database (B-080); [[T1]] wordt een link naar dat
 * onderwerp. Zonder die teksten valt de kaart terug op de korte omschrijving uit de indeling. */
function TopicAbout({family,value,topic,parts,basis,title,onSwitch,onBack}:{family:TopicFamily;value:string;topic?:TopicFamily['topics'][number];parts:{id:string;soort:string;laag:string;normIds:string[]}[];basis:string;title:(id:string)=>string;onSwitch?:(value:string)=>void;onBack?:()=>void}){
 const labels=family.labels,about=family.about,law=parts.filter(part=>part.laag==='wet'),practice=parts.filter(part=>part.laag!=='wet');
 // Alleen opties die bij dit onderwerp iets veranderen: een optie zonder normen noemen we niet.
 const choice=family.decode(value),changes=(extra:Record<string,unknown>)=>{if(!choice)return false;const base=family.choiceSources(choice).flatMap(part=>part.normIds).join('|');
  return family.choiceSources({...choice,...extra} as never).flatMap(part=>part.normIds).join('|')!==base;};
 const options=[labels.regime&&changes({regime:choice?.regime==='vereenvoudigd'?'volledig':'vereenvoudigd'})?labels.regime:null,
  labels.related&&!choice?.sub&&changes({related:!choice?.related})?labels.related:null,labels.sector&&changes({sector:!choice?.sector})?labels.sector:null,
  labels.practice&&practice.length>0?labels.practice:null].filter(Boolean) as {label:string;title:string}[];
 const sub=topic?.subs?.find(item=>item.id===family.decode(value)?.sub);
 // Een link naar een ander onderwerp houdt de gekozen opties (kader, NOREA, sector, verwante normen) vast (testronde 19 november 2026).
 const keep=(topicId:string,subId='')=>{const c=family.decode(value);return family.encode({...c,topic:topicId,sub:subId,related:subId?false:Boolean(c?.related)});};
 const relatedOnWhole=Boolean(sub&&labels.related&&changes({sub:'',related:true}));
 // Een verwijzing [[T6]] wordt de naam van het onderwerp, klikbaar als de viewer kan wisselen; **knop** wordt vet.
 const rich=(text:string)=>text.split(/(\[\[[^\]]+\]\]|\*\*[^*]+\*\*)/u).map((piece,index)=>{const bold=/^\*\*([^*]+)\*\*$/u.exec(piece)?.[1];if(bold)return <strong key={index}>{bold}</strong>;
  const ref=/^\[\[([^\]]+)\]\]$/u.exec(piece)?.[1];if(!ref)return piece;
  const name=family.topicTitle(ref);if(!name)return piece;
  return onSwitch&&ref!==topic?.id?<button key={index} type="button" className="topic-about-link" onClick={()=>onSwitch(keep(ref))}>{name}</button>:<em key={index}>{name}</em>;});
 const fill=(text:string)=>text.replaceAll('{practice}',labels.practice?.full||labels.practice?.name||'').replaceAll('{option}',labels.practice?.label||'');
 return <section className="law-about topic-about" aria-label="Over dit onderwerp">
  <header className="law-about-intro"><div className="law-about-eyebrow"><Layers size={17} aria-hidden="true"/>Onderwerp binnen {family.listFamily}</div><h2>{family.label(value)}</h2>
   {sub?<>
    {/* Een deelonderwerp: eigen omschrijving, waar het bij hoort en de andere delen (B-080). */}
    <p className="topic-about-parent">Onderdeel van {onSwitch?<button type="button" className="topic-about-link" onClick={()=>onSwitch(keep(topic!.id))}>{topic!.title}</button>:<strong>{topic!.title}</strong>}</p>
    <p>{sub.description||topic?.includes}</p></>
   :topic?.about?.length?topic.about.map((text,index)=><p key={index}>{rich(text)}</p>):topic&&<p>{topic.includes}</p>}
   {topic?.subs?.some(item=>item.description)&&<>{sub&&<h3 className="topic-about-subhead">Andere delen</h3>}<ul className="topic-about-subs">{topic.subs.filter(item=>item.id!==sub?.id).map(item=><li key={item.id}>
    {onSwitch?<button type="button" className="topic-about-link" onClick={()=>onSwitch(keep(topic.id,item.id))}>{item.title}</button>:<strong>{item.title}</strong>}{item.description&&<span>{item.description}</span>}</li>)}</ul></>}
   {topic?.notIn?.length?<div className="topic-about-notin"><h3>Wat hier niet in zit</h3>{topic.notIn.map((item,index)=><p key={index}>{rich(item.text)}</p>)}</div>
    :topic?.excludes&&<p><strong>Niet in dit onderwerp:</strong> {topic.excludes}</p>}</header>
  <div className="law-about-columns">
   <section className="law-about-card"><h3><BookOpen size={18} aria-hidden="true"/>Uit welke bronnen?</h3>
    {about.sourcesIntro&&<p>{about.sourcesIntro.replaceAll('{dit}',sub?'dit deelonderwerp':'dit onderwerp')}</p>}
    <ul className="topic-about-sources">{law.map(part=><li key={part.id}><strong>{title(part.id)}</strong><span>{part.soort} · {part.normIds.length} {part.normIds.length===1?'norm':'normen'}</span></li>)}</ul>
    {practice.length>0&&<p>{basis==='wet'?(about.practiceLaw?fill(about.practiceLaw):<>Hetzelfde onderwerp staat ook in {practice.map(part=>title(part.id)).join(', ')}. Dat is een praktijkkader, geen wet; kies het met de optie <em>{labels.practice?.label}</em>.</>)
     :(about.practicePractice?fill(about.practicePractice):<>Je kijkt naar het praktijkkader. De wet stelt dezelfde eisen.</>)}</p>}</section>
   {(options.length>0||relatedOnWhole)&&<section className="law-about-card"><h3><SlidersHorizontal size={18} aria-hidden="true"/>Wat kun je erbij kiezen?</h3>
    <ul className="topic-about-options">{options.map(option=><li key={option.label}><strong>{option.label}</strong><span>{option.title}</span></li>)}</ul>
    {relatedOnWhole&&<p>Verwante normen uit andere onderwerpen voeg je toe bij het hele onderwerp {onSwitch?<button type="button" className="topic-about-link" onClick={()=>onSwitch(family.encode({topic:topic!.id,related:true}))}>{topic!.title}</button>:topic!.title}.</p>}</section>}
  </div>
  {(about.choose?.length||onBack)&&<section className="law-about-card"><h3><ArrowLeft size={18} aria-hidden="true"/>Een andere keuze maken</h3>
   {about.choose?.map((text,index)=><p key={index}>{rich(text)}</p>)}
   {onSwitch&&<h4>Andere onderwerpen</h4>}{onSwitch&&<nav className="topic-about-others" aria-label="Andere onderwerpen">{family.topics.filter(item=>sub||item.id!==topic?.id).map(item=>
    <button key={item.id} type="button" className="topic-about-link" onClick={()=>onSwitch(keep(item.id))}>{item.title}</button>)}</nav>}
   {onBack&&<p><Button variant="outline" onClick={onBack}><ArrowLeft aria-hidden="true"/>Terug naar alle wetten &amp; kaders</Button></p>}</section>}
  <section className="law-about-card"><h3><ShieldCheck size={18} aria-hidden="true"/>Hoe is deze indeling gemaakt?</h3>
   {about.method?.length?about.method.map((text,index)=><p key={index}>{rich(text)}</p>):<>
    <p>Een onderwerp bundelt normen uit verschillende bronnen. Het is een selectiehulp: er verandert geen norm of toetspunt, en de bron blijft bij elke norm staan.</p>
    <p className="law-about-quality-meta">{family.review.note}</p></>}
   {family.outside.length>0&&<details className="topic-about-details"><summary>Bewust niet ingedeeld: {family.outside.length} {family.outside.length===1?'bron':'bronnen'}</summary><ul className="topic-about-outside">{family.outside.map(item=><li key={item.id}><strong>{title(item.id)}</strong><span>{item.reason}</span></li>)}</ul></details>}
  </section>
 </section>;
}
