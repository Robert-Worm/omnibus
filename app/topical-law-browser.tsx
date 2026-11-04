'use client';
import {useMemo,useState,useSyncExternalStore} from 'react';
import {catalogueRevision,onCatalogueChange} from '@/lib/catalogue-runtime.mjs';
import {BookOpen} from 'lucide-react';
import CioLawBrowser,{type LawBrowserAdapter} from './cio-law-browser';
import CioNormSummary from './cio-norm-summary';
import {LawPointSourceLayout,LawSourceDocument,type LawPassage} from './law-point-source';
import {LawAboutIntro,LawAboutSpecifications} from './law-about-layout';
import FrameworkBackground from './framework-background';
import {frameworkBackgrounds} from '@/lib/framework-backgrounds.mjs';
import CatalogueContent from './catalogue-content';
import {topicalPackage,topicalRows,topicalGroups,topicalGoal,topicalMeasure,type TopicalPoint} from '@/lib/topical-content.mjs';
import {topicalRecordSources} from '@/lib/topical-source-reader.mjs';
import {topicalSourceFormat} from '@/lib/topical-document-identity.mjs';
import {topicalSelection,chooseTopicalPoints} from '@/lib/topical-selection.mjs';
import {cioContributionLabels,cioRoleLabels} from '@/lib/cio-law-data.mjs';
import {cioSourceGroups} from '@/lib/cio-source-groups.mjs';
import type {Point,Criterion} from './cio-law-workspace';
import {Approach} from './cio-law-workspace';
import {auditReadingText,currentAuditGuidance,distinctAuditLimitations,sourceSnapshotStatus} from '@/lib/audit-reading.mjs';
import type {Draft} from '@/lib/framework-types';
import type {LawOverviewProps} from './law-overview-state';

type Package=NonNullable<ReturnType<typeof topicalPackage>>;
function TopicalAbout({bundle}:{bundle:Package}){
 const c=bundle.context,sourceStatus=sourceSnapshotStatus(c);
 const background=Object.hasOwn(frameworkBackgrounds,bundle.id)?frameworkBackgrounds[bundle.id as keyof typeof frameworkBackgrounds]:undefined;
 const selectable=bundle.catalogue.points.filter(p=>p.selection_status==='SELECTABLE').length;
 const hold=bundle.catalogue.points.filter(p=>p.selection_status==='HOLD').length;
 const contextOnly=bundle.catalogue.points.length-selectable-hold;
 return <section className="law-about" aria-label={'Achtergrond '+c.title}>
  <LawAboutIntro title={c.title} links={[{label:'Officiële publicatie',url:bundle.status.official_url}]}><p>{background?.intro||c.intro}</p></LawAboutIntro>
  <LawAboutSpecifications><div><dt>Soort kader</dt><dd>{c.kind_label||'Brongebonden kader; raadpleeg de officiële publicatie'}</dd></div><div><dt>Uitgave</dt><dd>{c.edition}</dd></div><div><dt>Ingang volgens bronpakket</dt><dd>{sourceStatus.date}<small>{sourceStatus.asOf}</small></dd></div><div><dt>Omvang</dt><dd>{bundle.catalogue.criteria.length} normen · {bundle.catalogue.points.length} toetspunten<small>{selectable} selecteerbaar{hold>0&&` · ${hold} op HOLD`}{contextOnly>0&&` · ${contextOnly} contextpunten`}</small></dd></div></LawAboutSpecifications>
  <p>{sourceStatus.qualification}</p>
  <div className="law-about-columns"><section className="law-about-card"><h3>Voor wie en waarvoor?</h3>{c.audience.map(text=><p key={text}>{text}</p>)}<ul>{c.use_cases.map(text=><li key={text}>{text}</li>)}</ul></section><section className="law-about-card"><h3>Toepassing in je onderzoek</h3><p className="whitespace-pre-line">{c.applicability}</p></section></div>
  <FrameworkBackground sourceId={bundle.id}/>
  <section className="law-about-card"><h3>Gebruikte bronnen</h3>{c.documents.map(d=><p key={d.id}>{bundle.documents.find(source=>source.packageDocumentId===d.id)?.title||d.role}</p>)}<p className="whitespace-pre-line">{c.source_explanation||'Raadpleeg de genoemde brondocumenten voor de oorspronkelijke eisen en hun toelichting.'}</p>{background&&<details><summary>Afbakening van deze uitwerking</summary><p>{c.intro}</p></details>}</section>
  <section className="law-about-card law-about-quality"><h3>Bronkwaliteit en beperkingen</h3><p>Afzonderlijk beoordeeld vanuit brongetrouwheid, kaderbetekenis en praktische bruikbaarheid. AI-review, geen menselijke auditgoedkeuring. Selecteerbare punten zijn beschikbaar binnen de beschreven grenzen; open bronvragen blijven gelden.</p><div className="law-about-checks">{distinctAuditLimitations(c.limitations).map(l=><details key={l.title}><summary>{l.title}</summary><div><p>{currentAuditGuidance(l.text)}</p></div></details>)}</div></section>
 </section>;
}
function SourceContent({bundle,point}:{bundle:Package;point:TopicalPoint;parent:Criterion}){
 const recordFor=(id:string)=>bundle.bank.records.find(r=>r.id===id);
 const initial=Math.max(0,point.source_links.findIndex(l=>l.contribution==='PRIMARY'));
 const [index,setIndex]=useState(initial),[documentIndex,setDocumentIndex]=useState(0);
 const record=recordFor(point.source_links[index].record_id),choices:{document:Package['documents'][number];spans:unknown[];passages:LawPassage[]}[]=record?topicalRecordSources(bundle,record):[];
 const chosen=choices[documentIndex]||choices[0],first=chosen?.passages[0];
 const [page,setPage]=useState(first?.page||1),[target,setTarget]=useState<number|undefined>(first?.start),[focus,setFocus]=useState(0);
 const [active,setActive]=useState<'criterion'|'source'>('criterion');
 function selectLink(i:number){const r=recordFor(point.source_links[i].record_id),choice=r?topicalRecordSources(bundle,r)[0]:null;setIndex(i);setDocumentIndex(0);setPage(choice?.passages[0]?.page||1);setTarget(choice?.passages[0]?.start);setFocus(n=>n+1);setActive('source');}
 const labels=cioContributionLabels as Record<string,string>,roles=cioRoleLabels as Record<string,string>;
 const sourceGroups=cioSourceGroups(point.source_links) as {id:string;title:string;entries:{link:Point['source_links'][number];index:number}[]}[];
 const criterion=<div className="cio-source-explanation"><h3>Hoe is dit toetspunt onderbouwd?</h3>
  <div className="cio-source-links">{sourceGroups.map(group=><section key={group.id} aria-label={group.title}><h4>{group.title}</h4>{group.entries.map(({link,index:i})=>{const r=recordFor(link.record_id);return <article key={link.record_id} className={`cio-source-link-card${i===index?' is-active':''}`} data-record-id={link.record_id} data-contribution={link.contribution}><button onClick={()=>selectLink(i)} aria-pressed={i===index}><strong>{r?.title}</strong><BookOpen size={16}/><span>{r?.locator} · {labels[link.contribution]}</span></button><p>{r?.assertion}</p><p className="cio-link-contribution"><strong>Bijdrage aan dit toetspunt</strong>{link.explanation}</p><p>{link.supported_clause}</p>{r?.source_status==='EXPLANATORY_CONTEXT'&&<small>Toelichting — geen zelfstandige nieuwe plicht</small>}</article>;})}</section>)}</div>
  <section className="cio-source-text"><h4>Toepassing van dit toetspunt</h4><p>{point.scope}</p><dl className="cio-source-actors">{point.addressees.map((a,i)=><div key={i}><dt>{a.label}</dt><dd>{roles[a.role]}{a.condition&&<p>{a.condition}</p>}</dd></div>)}</dl>{[{title:'Voorwaarden',items:point.conditions},{title:'Uitzonderingen',items:point.exceptions}].map(g=>g.items.length>0&&<section key={g.title}><h4>{g.title}</h4><ul>{g.items.map((t,i)=><li key={i}>{t}</li>)}</ul></section>)}<p>{point.selection_reason}</p><p>{point.split_rationale}</p></section>
  {record&&<section className="cio-source-text"><h4>Context van de gekozen bepaling</h4>{[...record.conditions,...record.exceptions,...record.interpretation_notes].map((t,i)=><p key={i}>{t}</p>)}</section>}
  <div className="law-about-checks">{distinctAuditLimitations(bundle.context.limitations).map(l=><details key={l.title}><summary>{l.title}</summary><div><p>{currentAuditGuidance(l.text)}</p></div></details>)}</div>
 </div>;
 const source=chosen&&record?<><nav aria-label="Brondocument">{choices.length>1&&choices.map((c,i)=><button key={c.document.id} aria-pressed={i===documentIndex} onClick={()=>{setDocumentIndex(i);setPage(c.passages[0]?.page||1);setTarget(c.passages[0]?.start);setFocus(n=>n+1);}}>{c.document.title}</button>)}</nav><LawSourceDocument recordId={record.id} title={record.title} locator={record.locator} sourceKind={record.source_status==='EXPLANATORY_CONTEXT'?'Toelichting':'Hoofdtekst'} document={chosen.document} passages={chosen.passages} page={page} target={target} focusRequest={focus}
 onFocus={p=>{setPage(p.page);setTarget(p.start);setFocus(n=>n+1);}} onPage={p=>{setPage(p);setTarget(undefined);}} onReturn={()=>setActive('criterion')}
 pageLabel={topicalSourceFormat(chosen.document).pageLabel}
 notice={<><p className="cio-meta">{chosen.document.title} · {topicalSourceFormat(chosen.document).notice}</p>{chosen.passages.length!==chosen.spans.length&&<p role="alert">Niet alle bronmarkeringen konden worden bevestigd.</p>}</>}/></>:<p role="alert">De exacte bron is niet beschikbaar.</p>;
 return <LawPointSourceLayout label={'Bron bij '+point.title} summary={<CioNormSummary point={point}/>} publication={<a href={bundle.status.official_url} target="_blank" rel="noreferrer">Officiële publicatie ↗</a>} criterion={criterion} source={source} active={active} onActive={setActive}/>;
}
type Props=LawOverviewProps&{sourceId:string;draft:Draft;onChange:(d:Draft)=>void;navigate:(page:string)=>void;disabled?:boolean;initialPointId?:string;viewerOnly?:boolean;onClose?:()=>void;prepareDetails?:(action:()=>void)=>void};
function TopicalApproach({point}:{point:Point}){
 const phases={...point.phase_plans};
 for(const key of ['opzet','bestaan','werking'] as const)phases[key]={...phases[key],interpretation_boundary:currentAuditGuidance(phases[key].interpretation_boundary)};
 return <Approach point={{...point,phase_plans:phases}}/>;
}
export function TopicalSavedSource({serialized}:{serialized:string}){
 const trace=JSON.parse(serialized),bundle=topicalPackage(trace.sourceId);
 if(!bundle)return <p role="alert">Dit bronpakket is niet beschikbaar.</p>;
 return <CatalogueContent resource={'source:'+bundle.id}>{()=> <SourceContent key={trace.point.id} bundle={bundle} point={trace.point} parent={trace.criterion}/>}</CatalogueContent>;
}
export default function TopicalLawBrowser({sourceId,...props}:Props){
 const revision=useSyncExternalStore(onCatalogueChange,catalogueRevision,catalogueRevision);
 const bundle=topicalPackage(sourceId)!;
 const adapter=useMemo(()=>({revision,sourceId,readNorm:auditReadingText,title:bundle.context.title,heading:bundle.context.title,viewKey:'topical-'+sourceId+'-r2',
  catalogue:{...bundle.catalogue,criteria:bundle.catalogue.criteria.map(c=>({...c,text:auditReadingText(c.text)}))},points:bundle.catalogue.points,records:bundle.bank.records,rows:topicalRows(bundle),groups:topicalGroups(bundle),
  goalFor:(id:string)=>topicalGoal(bundle,id),measureFor:(id:string)=>topicalMeasure(bundle,id),
  selection:(draft:Draft,ids?:string[])=>topicalSelection(draft,sourceId,ids),choose:(draft:Draft,ids:string[],include:boolean)=>chooseTopicalPoints(draft,sourceId,ids,include),
  About:()=> <TopicalAbout bundle={bundle}/>,Approach:TopicalApproach,Source:(sourceProps:{point:Point;parent:Criterion})=><CatalogueContent resource={'source:'+sourceId}>{()=> <SourceContent bundle={bundle} {...sourceProps}/>}</CatalogueContent>,
 }) as unknown as LawBrowserAdapter,[bundle,sourceId,revision]);
 return <CioLawBrowser {...props} hideOpenStrip adapter={adapter}/>;
}
