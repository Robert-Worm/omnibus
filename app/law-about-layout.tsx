import type {ReactNode} from 'react';
import {BookOpen,ExternalLink,Landmark,ListChecks} from 'lucide-react';
import './cio-source-about.css';
import {frameworkTitle} from '@/lib/framework-title.mjs';
import {frameworkSourceRole,frameworkSourceLink} from '@/lib/framework-source-labels.mjs';

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
   <h4>{frameworkTitle(document.title)}</h4>{document.title!==document.role&&<p>{frameworkSourceRole(document.role)}</p>}
   {url&&<a href={url} target="_blank" rel="noreferrer" aria-label={`Bekijk bij de uitgever: ${frameworkTitle(document.title)}`}><span>Bekijk bij de uitgever</span><ExternalLink size={13} aria-hidden="true"/></a>}
  </li>;})}</ul>{children&&<div className="law-about-source-explanation">{children}</div>}
 </section>;
}
