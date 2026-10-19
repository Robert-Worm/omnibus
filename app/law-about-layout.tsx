import type {ReactNode} from 'react';
import {ExternalLink,Landmark,ListChecks} from 'lucide-react';
import './cio-source-about.css';

// Shared source-background layout. New laws/frameworks use the CIO presentation,
// while their reviewed content, scope and source limitations remain independent.
export function LawAboutIntro({title,children,links}:{title:string;children:ReactNode;links:{label:string;url:string}[]}){
 return <header className="law-about-intro"><div className="law-about-eyebrow"><Landmark size={17} aria-hidden="true"/>Achtergrond bij de bron</div><h2>{title}</h2>{children}{links.length>0&&<nav className="law-about-primary-links" aria-label="Officiële bronnen bij dit kader">{links.map(link=><a key={link.url} href={link.url} target="_blank" rel="noreferrer"><span>{link.label}</span><ExternalLink size={14} aria-hidden="true"/></a>)}</nav>}</header>;
}
export function LawAboutSpecifications({children}:{children:ReactNode}){
 return <section className="law-about-specifications" aria-label="Specificaties"><h3><ListChecks size={18} aria-hidden="true"/>Specificaties</h3><dl className="law-about-facts">{children}</dl></section>;
}
