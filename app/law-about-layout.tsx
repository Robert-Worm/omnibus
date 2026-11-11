import type {ReactNode} from 'react';
import {BookOpen,CalendarDays,ExternalLink,History,Landmark,ListChecks,Scale,ShieldCheck,Users} from 'lucide-react';
import './cio-source-about.css';
import {frameworkTitle} from '@/lib/framework-title.mjs';
import {frameworkSourceRole,frameworkSourceLink,frameworkDocumentTitle,leesbareDocumentTitel} from '@/lib/framework-source-labels.mjs';

// Shared source-background layout. New laws/frameworks use the CIO presentation,
// while their reviewed content, scope and source limitations remain independent.
export function LawAboutIntro({title,children,links}:{title:string;children:ReactNode;links:{label:string;url:string}[]}){
 return <header className="law-about-intro"><div className="law-about-eyebrow"><Landmark size={17} aria-hidden="true"/>Achtergrond bij de bron</div><h2>{frameworkTitle(title)}</h2>{children}{links.length>0&&<nav className="law-about-primary-links" aria-label="Officiële bronnen bij dit kader">{links.map(link=><a key={link.url} href={link.url} target="_blank" rel="noreferrer"><span>{link.label}</span><ExternalLink size={14} aria-hidden="true"/></a>)}</nav>}</header>;
}
export function LawAboutSpecifications({children}:{children:ReactNode}){
 return <section className="law-about-specifications" aria-label="Specificaties"><h3><ListChecks size={18} aria-hidden="true"/>Specificaties</h3><dl className="law-about-facts">{children}</dl></section>;
}

export function LawAboutParagraphs({text}:{text:string}){
 return <>{text.split(/\n+/u).filter(line=>line.trim()).map((line,index)=><p key={index}>{line}</p>)}</>;
}

export function LawAboutSources({documents,children}:{documents:{id:string;title:string;role:string;url?:string}[];children?:ReactNode}){
 return <section className="law-about-card law-about-sources"><h3><BookOpen size={18} aria-hidden="true"/>Gebruikte bronnen</h3>
  <ul className="law-about-document-list">{documents.map(document=>{const url=frameworkSourceLink(document.url);return <li key={document.id}>
   <h4>{leesbareDocumentTitel(frameworkTitle(frameworkDocumentTitle(document.title,document.role)))}</h4>{frameworkDocumentTitle(document.title,document.role)===document.title&&document.title!==document.role&&<p>{frameworkSourceRole(document.role)}</p>}
   {url&&<a href={url} target="_blank" rel="noreferrer" aria-label={`Bekijk bij de uitgever: ${leesbareDocumentTitel(frameworkTitle(frameworkDocumentTitle(document.title,document.role)))}`}><span>Bekijk bij de uitgever</span><ExternalLink size={13} aria-hidden="true"/></a>}
  </li>;})}</ul>{children&&<div className="law-about-source-explanation">{children}</div>}
 </section>;
}

export type LawAboutCheck={title:string;status?:string;body:ReactNode};
export type LawAboutHistory={period:string;title:string;text:string};
export type LawAboutLink={label:string;url:string};

/** The standard text above source quality; identical for every law and framework. */
export const LAW_ABOUT_QUALITY_INTRO='Normen en toetspunten zijn gekoppeld aan de oorspronkelijke bronpassages, zodat je de herkomst en uitwerking kunt controleren. Geautomatiseerde extractie en uitwerking kunnen onduidelijkheden opleveren; soms zit de onduidelijkheid al in de bron. Punten die nog onvoldoende onderbouwd zijn, zijn nog niet vrijgegeven; je kunt ze niet kiezen. Hieronder staan de grenzen van de uitwerking en de open bronvragen.';

export function LawAboutLinks({links}:{links:LawAboutLink[]}){
 return links.length>0?<div className="law-about-references">{links.map(link=><a key={link.url+link.label} href={link.url} target="_blank" rel="noreferrer"><span>{link.label}</span><ExternalLink size={12} aria-hidden="true"/></a>)}</div>:null;
}

/**
 * The one page layout for "Over dit kader" (B-034). It follows the CIO-stelsel page:
 * introduction, specifications, two columns (what kind of source / for whom),
 * history, application in the research, sources used, and source quality with
 * HOLD cards and collapsible open points. New laws and frameworks fill these
 * slots; they cannot add, drop or reorder sections.
 */
export function LawAboutPage({label,title,intro,links,specifications,kind,audience,history,application,related,sources,sourceExplanation,quality}:{
 label:string;title:string;intro:ReactNode;links:LawAboutLink[];specifications:ReactNode;
 kind:{title:string;body:ReactNode};audience:ReactNode;
 history?:{title?:string;items:LawAboutHistory[];links:LawAboutLink[];note?:string};
 application?:ReactNode;related?:string;
 sources?:{id:string;title:string;role:string;url?:string}[];sourceExplanation?:ReactNode;
 quality:{meta:ReactNode[];holds?:ReactNode;checks:LawAboutCheck[];note?:string};
}){
 return <section className="law-about" aria-label={label}>
  <LawAboutIntro title={title} links={links}>{intro}</LawAboutIntro>
  <LawAboutSpecifications>{specifications}</LawAboutSpecifications>
  <div className="law-about-columns">
   <section className="law-about-card"><h3><Scale size={18} aria-hidden="true"/>{kind.title}</h3>{kind.body}</section>
   <section className="law-about-card"><h3><Users size={18} aria-hidden="true"/>Voor wie en waarvoor?</h3>{audience}</section>
  </div>
  {history&&history.items.length>0&&<section className="law-about-card"><h3><History size={18} aria-hidden="true"/>{history.title||'Ontstaan en ontwikkeling'}</h3>
   <ol className="law-about-timeline">{history.items.map(item=><li key={item.period+item.title}><span>{item.period}</span><div><h4>{item.title}</h4><p>{item.text}</p></div></li>)}</ol>
   <LawAboutLinks links={history.links}/>{history.note&&<p className="law-about-quality-meta">{history.note}</p>}
  </section>}
  {(application||related)&&<section className="law-about-card"><h3><ListChecks size={18} aria-hidden="true"/>Toepassing in je onderzoek</h3>{application}{related&&<><h4>Samenhang met andere kaders</h4><p>{related}</p></>}</section>}
  {sources&&sources.length>0&&<LawAboutSources documents={sources}>{sourceExplanation}</LawAboutSources>}
  <section className="law-about-card law-about-quality"><h3><ShieldCheck size={18} aria-hidden="true"/>Bronkwaliteit en open punten</h3>
   {/* De zin over niet-vrijgegeven punten alleen als dit kader zulke punten heeft (panel 11 november 2026). */}
   <p>{quality.meta.some(line=>typeof line==='string'&&/nog niet vrijgegeven/u.test(line))||quality.holds?LAW_ABOUT_QUALITY_INTRO:LAW_ABOUT_QUALITY_INTRO.replace(' Punten die nog onvoldoende onderbouwd zijn, zijn nog niet vrijgegeven; je kunt ze niet kiezen.','')}</p>
   {quality.meta.length>0&&<p className="law-about-quality-meta">{quality.meta.map((line,index)=><span key={index}>{index>0&&<br/>}{line}</span>)}</p>}
   {quality.holds}
   {quality.checks.length>0&&<div className="law-about-checks">{quality.checks.map(item=><details key={item.title+(item.status||'')}><summary><span>{item.title}</span>{item.status&&<small>{item.status}</small>}</summary><div>{item.body}</div></details>)}</div>}
   {quality.note&&<p className="law-about-note"><CalendarDays size={14} aria-hidden="true"/>{quality.note}</p>}
  </section>
 </section>;
}
