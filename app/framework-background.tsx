import {History,Scale,ListChecks,ExternalLink} from 'lucide-react';
import {frameworkBackgrounds,backgroundCheckedOn} from '@/lib/framework-backgrounds.mjs';

/** Additional orientation. The source package remains authoritative for the
 * selected edition, applicability, evidence and open source questions. */
export default function FrameworkBackground({sourceId}:{sourceId:string}){
 const background=Object.hasOwn(frameworkBackgrounds,sourceId)?frameworkBackgrounds[sourceId as keyof typeof frameworkBackgrounds]:undefined;
 if(!background)return null;
 return <div className="framework-background">
  <section className="law-about-card"><h3><Scale size={18} aria-hidden="true"/>Wat voor kader is dit?</h3><p>{background.meaning}</p></section>
  <section className="law-about-card"><h3><History size={18} aria-hidden="true"/>Ontstaan en ontwikkeling</h3>
   <ol className="law-about-timeline">{background.history.map(item=><li key={item.title}><span>{item.period}</span><div><h4>{item.title}</h4><p>{item.text}</p></div></li>)}</ol>
   <div className="law-about-references">{background.references.map(link=><a key={link.url} href={link.url} target="_blank" rel="noreferrer"><span>{link.label}</span><ExternalLink size={12} aria-hidden="true"/></a>)}</div>
   <p className="law-about-quality-meta">Aanvullende achtergrondtoelichting · broncontrole {backgroundCheckedOn}. De gekozen broneditie en haar toepassingsvoorwaarden blijven afzonderlijk vermeld.</p>
  </section>
  <section className="law-about-card"><h3><ListChecks size={18} aria-hidden="true"/>Zo gebruik je dit in je onderzoek</h3><ol>{background.practice.map(text=><li key={text}>{text}</li>)}</ol><h4>Samenhang met andere kaders</h4><p>{background.related}</p></section>
 </div>;
}
