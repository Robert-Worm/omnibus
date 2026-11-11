'use client';
import {leesbareVindplaats,leesbareAlinea} from '@/lib/vindplaats.mjs';
import {verwanteNormen} from '@/lib/norea-verwant.mjs';
import {useMemo,useState,useSyncExternalStore} from 'react';
import {catalogueRevision,onCatalogueChange} from '@/lib/catalogue-runtime.mjs';
import {BookOpen} from 'lucide-react';
import {uitwerkingenBijGroep,uitgewerktVanuit} from '@/lib/dora-uitwerkingen.mjs';
import CioLawBrowser,{type LawBrowserAdapter} from './cio-law-browser';
import CioNormSummary from './cio-norm-summary';
import {LawPointSourceLayout,LawSourceDocument,type LawPassage} from './law-point-source';
import {LawAboutPage,LawAboutParagraphs} from './law-about-layout';
import {frameworkBackgrounds,backgroundCheckedOn} from '@/lib/framework-backgrounds.mjs';
import {frameworkPublication} from '@/lib/framework-publication-facts.mjs';
import {frameworkSourceRole,frameworkSourceLink,frameworkDocumentTitle,leesbareDocumentTitel,leesbareEditie} from '@/lib/framework-source-labels.mjs';
import {frameworkContextText} from '@/lib/framework-context-wording.mjs';
import {frameworkAboutLimitations} from '@/lib/framework-limitations-wording.mjs';
import {frameworkAboutGuidance} from '@/lib/framework-about-guidance.mjs';
import CatalogueContent from './catalogue-content';
import {topicalPackage,topicalRows,topicalGroups,topicalGoal,topicalMeasure,type TopicalPoint} from '@/lib/topical-content.mjs';
import {topicalRecordSources} from '@/lib/topical-source-reader.mjs';
import {pakketNotities,standaardzinnen} from '@/lib/reader-notes.mjs';
import {topicalSourceFormat} from '@/lib/topical-document-identity.mjs';
import {topicalSelection,chooseTopicalPoints} from '@/lib/topical-selection.mjs';
import {cioContributionLabels,cioRoleLabels} from '@/lib/cio-law-data.mjs';
import {cioSourceGroups} from '@/lib/cio-source-groups.mjs';
import type {Point,Criterion} from './cio-law-workspace';
import {Approach} from './cio-law-workspace';
import {auditReadingText,currentAuditGuidance,sourceSnapshotStatus} from '@/lib/audit-reading.mjs';
import type {Draft} from '@/lib/framework-types';
import type {LawOverviewProps} from './law-overview-state';

type Package=NonNullable<ReturnType<typeof topicalPackage>>;
function TopicalAbout({bundle}:{bundle:Package}){
 const c=bundle.context,sourceStatus=sourceSnapshotStatus(c);
 const guidance=useMemo(()=>frameworkAboutGuidance(bundle.id,c),[bundle.id,c]);
 const limitations=frameworkAboutLimitations(bundle.id,c.limitations);
 const wording=(field:string,text:string)=>frameworkContextText(bundle.id,field,text);
 const background=Object.hasOwn(frameworkBackgrounds,bundle.id)?frameworkBackgrounds[bundle.id as keyof typeof frameworkBackgrounds]:undefined;
 const publication=frameworkPublication(bundle.id),officialUrl=frameworkSourceLink(bundle.status.official_url);
 const documents=c.documents.map(d=>{const source=bundle.documents.find(source=>source.packageDocumentId===d.id);return {id:d.id,title:source?.title||d.role,role:d.role,url:source?.url};});
 const sourceRoles=[...new Set(documents.map(d=>frameworkSourceRole(d.role)))];
 const selectable=bundle.catalogue.points.filter(p=>p.selection_status==='SELECTABLE').length;
 const hold=bundle.catalogue.points.filter(p=>p.selection_status==='HOLD').length;
 const contextOnly=bundle.catalogue.points.length-selectable-hold;
 const kind=background?.meaning?<p>{background.meaning}</p>:<p>{c.kind_label||'Brongebonden kader; raadpleeg de officiële publicatie.'}</p>;
 return <LawAboutPage label={'Achtergrond '+c.title} title={c.title} links={[{label:'Officiële publicatie',url:bundle.status.official_url}]}
  intro={<p>{background?.intro||c.intro}</p>}
  specifications={<>
   <div><dt>Soort kader en opgenomen uitgave</dt><dd>{c.kind_label||'Brongebonden kader; raadpleeg de officiële publicatie'}<small>{leesbareEditie(c.edition)}</small></dd></div>
   {publication&&<div><dt>Uitgebracht door</dt><dd>{publication.issuer}{publication.adopted&&<small>Vastgesteld op {publication.adopted}</small>}</dd></div>}
   <div><dt>Officiële publicatie</dt><dd>{officialUrl?<a href={officialUrl} target="_blank" rel="noreferrer">{publication?.publication||c.title}</a>:publication?.publication||c.title}{publication&&<small>{publication.dateLabel}: {publication.published}</small>}</dd></div>
   <div><dt>{publication?.effective?'In werking vanaf':publication?'Toepassing':'Ingang volgens bronpakket'}</dt><dd>{publication?.effective||(!publication?sourceStatus.date:'')}{publication?.entryNote&&<small>{publication.entryNote}</small>}{publication?.application&&<small>{publication.application}</small>}{!publication&&<small>{sourceStatus.asOf}</small>}</dd></div>
   <div><dt>Bronnen in deze viewer</dt><dd>{documents.length} {documents.length===1?'brondocument':'brondocumenten'}<small>{sourceRoles.join('; ')}. Hieronder staan de afzonderlijke bronnen en links.</small></dd></div>
   <div><dt>Omvang van de uitwerking</dt><dd>{bundle.catalogue.criteria.length} normen · {bundle.catalogue.points.length} toetspunten<small>{selectable} selecteerbaar{hold>0&&` · ${hold} nog niet vrijgegeven`}{contextOnly>0&&` · ${contextOnly} contextpunten`}</small></dd></div>
  </>}
  kind={{title:c.kind==='law'?'Wat voor regeling is dit?':'Wat voor kader is dit?',body:kind}}
  audience={<>{(guidance?.audience||c.audience).map(text=><p key={text}>{wording('audience',text)}</p>)}{!guidance&&c.use_cases.length>0&&<><h4>Waarvoor kun je het gebruiken?</h4><ul className="law-about-use-cases">{c.use_cases.map(text=><li key={text}>{wording('use_cases',text)}</li>)}</ul></>}</>}
  history={background&&{items:background.history,links:background.references,note:`Aanvullende achtergrond · geraadpleegd op ${backgroundCheckedOn}. Voor de toetspunten zelf geldt de opgenomen uitgave van de bron.`}}
  application={<><LawAboutParagraphs text={guidance?.application||wording('applicability',c.applicability)}/>{background&&!guidance&&<ol className="law-about-practice">{background.practice.map(text=><li key={text}>{text}</li>)}</ol>}</>}
  related={background?.related}
  sources={documents}
  sourceExplanation={<><h4>Hoe zijn deze bronnen gebruikt?</h4><LawAboutParagraphs text={wording('source_explanation',c.source_explanation||(['TR-CYBER','TR-BEHAV','TR-RESIL','TR-THIRD'].includes(bundle.id)?'De vereisten vormen de normatieve basis voor de audit. De gebruikershandleiding licht het gebruik toe en geeft voorbeelden; die voorbeelden zijn geen aanvullende verplichtingen.':'Raadpleeg de genoemde brondocumenten voor de oorspronkelijke eisen en hun toelichting.'))}/>
   {guidance?.sourceExplanationExtra&&<LawAboutParagraphs text={guidance.sourceExplanationExtra}/>}
   {background&&!guidance&&<><h4>Onderwerp van deze uitwerking</h4><LawAboutParagraphs text={c.intro}/></>}</>}
  quality={{meta:[`${bundle.catalogue.criteria.length} normen · ${selectable} selecteerbare toetspunten${hold>0?` · ${hold} nog niet vrijgegeven`:''}${contextOnly>0?` · ${contextOnly} contextpunten`:''}`,`${sourceStatus.asOf}. ${sourceStatus.qualification}`,'AI-review op brontrouw, betekenis en bruikbaarheid; geen menselijke audit- of juridische goedkeuring.'],
   checks:[...(guidance?.qualityNotes?[{title:guidance.qualityTitle,body:<LawAboutParagraphs text={guidance.qualityNotes}/>}]:[]),
    ...limitations.map(reading=>({title:reading.title,status:reading.guide||undefined,body:<LawAboutParagraphs text={currentAuditGuidance(reading.text)}/>})),
    ...(contextOnly>0?[{title:'Contextpunten',status:'Geen zelfstandige normen',body:<p>Contextpunten geven uitleg bij de bron en zijn niet selecteerbaar als norm.</p>}]:[])],
   note:''}}/>;
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
 // Standard sentences of the elaboration and review notes stay in the evidence trail, not in the reader (B-035).
 const docLabel=(d:{title:string;packageDocumentId:string})=>leesbareDocumentTitel(frameworkDocumentTitle(d.title,bundle.context.documents.find(x=>x.id===d.packageDocumentId)?.role||''));
 const standard=useMemo(()=>standaardzinnen([...pakketNotities(bundle.catalogue.points,bundle.bank.records),...bundle.catalogue.points.flatMap(p=>p.addressees.map(a=>a.condition))]),[bundle]);
 // Elke bepaling één keer als kaart: dezelfde titel en vindplaats stond soms twee keer (uit twee tekstversies) of nog eens onder
 // "Reikwijdte en uitzonderingen" (panel 11 november 2026). De eerste kaart blijft; de actieve kaart blijft altijd staan.
 // Onder "Reikwijdte" stond ook de hoofdbepaling van een ander toetspunt van dezelfde norm; die hoort bij dat toetspunt.
 const eigen=new Set(point.source_links.filter(l=>l.contribution==='PRIMARY').map(l=>l.record_id));
 const zusterBepalingen=new Set(bundle.catalogue.points.filter(q=>q.criterion_id===point.criterion_id&&q.id!==point.id).flatMap(q=>q.source_links.filter(l=>l.contribution==='PRIMARY').map(l=>l.record_id)).filter(id=>!eigen.has(id)));
 const kaartGezien=new Set<string>();
 const sourceGroups=(cioSourceGroups(point.source_links) as {id:string;title:string;entries:{link:Point['source_links'][number];index:number}[]}[])
  .map(group=>({...group,entries:group.entries.filter(({link,index:i})=>{if(link.contribution==='SCOPE'&&zusterBepalingen.has(link.record_id)&&i!==index)return false;const r=recordFor(link.record_id),k=r?leesbareAlinea(r.title)+'|'+leesbareVindplaats(r):link.record_id;if(kaartGezien.has(k)&&i!==index)return false;kaartGezien.add(k);return true;})})).filter(group=>group.entries.length);
 const criterion=<div className="cio-source-explanation"><h3>Hoe is dit toetspunt onderbouwd?</h3>
  <div className="cio-source-links">{sourceGroups.map(group=><section key={group.id} aria-label={group.title}><h4>{group.title}</h4>{group.entries.map(({link,index:i})=>{const r=recordFor(link.record_id);return <article key={link.record_id} className={`cio-source-link-card${i===index?' is-active':''}`} data-record-id={link.record_id} data-contribution={link.contribution}><button onClick={()=>selectLink(i)} aria-pressed={i===index}><strong>{leesbareAlinea(r?.title)}</strong><BookOpen size={16}/><span>{r?leesbareVindplaats(r):''} · {labels[link.contribution]}</span></button>{r?.source_status==='EXPLANATORY_CONTEXT'&&<small>Toelichting — geen zelfstandige nieuwe plicht</small>}</article>;})}</section>)}</div>
  <section className="cio-source-text"><h4>Toepassing van dit toetspunt</h4><p>{point.scope}</p><dl className="cio-source-actors">{point.addressees.filter((a,i,all)=>all.findIndex(b=>b.label===a.label&&b.role===a.role&&(standard.has(b.condition||'')?'':b.condition||'')===(standard.has(a.condition||'')?'':a.condition||''))===i).map((a,i)=><div key={i}><dt>{a.label.replace(ROL_IN_NAAM,'')}</dt><dd>{a.label.match(ROL_IN_NAAM)?.[1]==='wie de plicht heeft'?'Verantwoordelijk volgens het kader':a.label.match(ROL_IN_NAAM)?'Uitvoerder volgens eigen taakverdeling':a.role==='OTHER'&&bundle.context.kind==='framework'?'Genoemd in het kader':roles[a.role]}{a.condition&&!standard.has(a.condition)&&<p>{a.condition}</p>}</dd></div>)}</dl>{[{title:'Voorwaarden',items:point.conditions},{title:'Uitzonderingen',items:point.exceptions}].map(g=>g.items.length>0&&<section key={g.title}><h4>{g.title}</h4><ul>{g.items.map((t,i)=><li key={i}>{t}</li>)}</ul></section>)}</section>
 </div>;
 const source=chosen&&record?<><nav aria-label="Brondocument">{choices.length>1&&choices.map((c,i)=><button key={c.document.id} aria-pressed={i===documentIndex} onClick={()=>{setDocumentIndex(i);setPage(c.passages[0]?.page||1);setTarget(c.passages[0]?.start);setFocus(n=>n+1);}}>{docLabel(c.document)}</button>)}</nav><LawSourceDocument recordId={record.id} title={leesbareAlinea(record.title)} locator={leesbareVindplaats(record)} sourceKind={record.source_status==='EXPLANATORY_CONTEXT'?'Toelichting':'Hoofdtekst'} document={chosen.document} passages={chosen.passages} page={page} target={target} focusRequest={focus}
 onFocus={p=>{setPage(p.page);setTarget(p.start);setFocus(n=>n+1);}} onPage={p=>{setPage(p);setTarget(undefined);}} onReturn={()=>setActive('criterion')}
 pageLabel={topicalSourceFormat(chosen.document).pageLabel}
 notice={<><p className="cio-meta">{docLabel(chosen.document)} · {topicalSourceFormat(chosen.document).notice}</p>{chosen.passages.length!==chosen.spans.length&&<p role="alert">Niet alle bronmarkeringen konden worden bevestigd.</p>}</>}/></>:<p role="alert">De exacte bron is niet beschikbaar.</p>;
 return <LawPointSourceLayout label={'Bron bij '+point.title} summary={<CioNormSummary point={point}/>} publication={<a href={bundle.status.official_url} target="_blank" rel="noreferrer">Officiële publicatie ↗</a>} criterion={criterion} source={source} active={active} onActive={setActive}/>;
}
type Props=LawOverviewProps&{sourceId:string;draft:Draft;onChange:(d:Draft)=>void;navigate:(page:string)=>void;disabled?:boolean;initialPointId?:string;viewerOnly?:boolean;onClose?:()=>void;prepareDetails?:(action:()=>void)=>void;onOpenSource?:(id:string)=>void};
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
// NOREA zet de rol achter de naam: "Financiële instelling (wie de plicht heeft)". De viewer toont de rol één keer, eronder.
const ROL_IN_NAAM=/ \((wie de plicht heeft|uitvoerder volgens eigen taakverdeling)\)$/u;
export default function TopicalLawBrowser({sourceId,...props}:Props){
 const revision=useSyncExternalStore(onCatalogueChange,catalogueRevision,catalogueRevision);
 const bundle=topicalPackage(sourceId)!;
 const adapter=useMemo(()=>({revision,sourceId,readNorm:auditReadingText,groupLinks:(t:string)=>uitwerkingenBijGroep(sourceId,t),relatedNorms:(id:string)=>verwanteNormen(sourceId,id),sourceLinks:uitgewerktVanuit(sourceId).map(u=>({id:u.sourceId,label:u.groep,grondslag:u.grondslag})),title:bundle.context.title,heading:bundle.context.title,viewKey:'topical-'+sourceId+'-r2',
  catalogue:{...bundle.catalogue,criteria:bundle.catalogue.criteria.map(c=>({...c,text:auditReadingText(c.text)}))},points:bundle.catalogue.points,records:bundle.bank.records,rows:topicalRows(bundle),groups:topicalGroups(bundle),
  goalFor:(id:string)=>topicalGoal(bundle,id),measureFor:(id:string)=>topicalMeasure(bundle,id),
  selection:(draft:Draft,ids?:string[])=>topicalSelection(draft,sourceId,ids),choose:(draft:Draft,ids:string[],include:boolean)=>chooseTopicalPoints(draft,sourceId,ids,include),
  About:()=> <TopicalAbout bundle={bundle}/>,Approach:TopicalApproach,Source:(sourceProps:{point:Point;parent:Criterion})=><CatalogueContent resource={'source:'+sourceId}>{()=> <SourceContent bundle={bundle} {...sourceProps}/>}</CatalogueContent>,
 }) as unknown as LawBrowserAdapter,[bundle,sourceId,revision]);
 return <CioLawBrowser {...props} hideOpenStrip adapter={adapter}/>;
}
