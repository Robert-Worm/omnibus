import {History,Scale,ListChecks,ExternalLink} from 'lucide-react';
import type {ReactNode} from 'react';
import {frameworkBackgrounds,backgroundCheckedOn} from '@/lib/framework-backgrounds.mjs';

/** Additional orientation. The source package remains authoritative for the
 * selected edition, applicability, evidence and open source questions. */
export default function FrameworkBackground({sourceId,audience,application}:{sourceId:string;audience:ReactNode;application:ReactNode}){
 const background=Object.hasOwn(frameworkBackgrounds,sourceId)?frameworkBackgrounds[sourceId as keyof typeof frameworkBackgrounds]:undefined;
 if(!background)return <>{audience}<section className="law-about-card"><h3><ListChecks size={18} aria-hidden="true"/>Toepassing in je onderzoek</h3>{application}</section></>;
 return <div className="framework-background">
  <div className="law-about-columns"><section className="law-about-card"><h3><Scale size={18} aria-hidden="true"/>Wat voor kader is dit?</h3><p>{background.meaning}</p></section>{audience}</div>
  <section className="law-about-card"><h3><History size={18} aria-hidden="true"/>Ontstaan en ontwikkeling</h3>
   <ol className="law-about-timeline">{background.history.map(item=><li key={item.title}><span>{item.period}</span><div><h4>{item.title}</h4><p>{item.text}</p></div></li>)}</ol>
   <div className="law-about-references">{background.references.map(link=><a key={link.url} href={link.url} target="_blank" rel="noreferrer"><span>{link.label}</span><ExternalLink size={12} aria-hidden="true"/></a>)}</div>
   <p className="law-about-quality-meta">Aanvullende achtergrond · geraadpleegd op {backgroundCheckedOn}. De broneditie, toepassingsvoorwaarden en genoemde bronbeperkingen blijven bepalend voor deze uitwerking.</p>
  </section>
  <section className="law-about-card"><h3><ListChecks size={18} aria-hidden="true"/>Toepassing in je onderzoek</h3>{application}<ol className="law-about-practice">{background.practice.map(text=><li key={text}>{text}</li>)}</ol><h4>Samenhang met andere kaders</h4><p>{background.related}</p></section>
 </div>;
}
