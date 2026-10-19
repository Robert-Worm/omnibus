'use client';
import {countLabel} from '@/lib/display-count.mjs';
import {useState} from 'react';
import {BookOpen,Users,ShieldCheck,Layers} from 'lucide-react';
import {Button} from '@/components/ui/button';
import type {Framework,Line} from '@/lib/framework-types';
import {LawAboutIntro,LawAboutSpecifications} from './law-about-layout';
import {reportDateLabel} from '@/lib/report-display.mjs';
import {reportAboutContent,reportSourceGuidance} from '@/lib/report-about-content.mjs';
import './report-framework-about.css';
export default function ReportFrameworkAbout({title,workspaces,reports,lines,allLines,onRead,onChoice}:{title:string;workspaces:{id:string;title:string}[];reports:Framework[];lines:Line[];allLines:Line[];onRead:(id:string)=>void;onChoice:()=>void}){
 const [selected,setSelected]=useState('');
 const current=reports.find(f=>f.report.id===selected)||reports[0];
 const used=reports.filter(f=>lines.some(l=>l.report_id===f.report.id));
 const content=reportAboutContent(workspaces,lines);
 const guidance=reportSourceGuidance(current);
 return <section className="law-about report-framework-about" aria-label="Achtergrond bij dit thema of proces">
  <LawAboutIntro title={title} links={[]}><p>{content.intro}</p><p className="law-about-note">De uitleg op deze pagina helpt je het kader te gebruiken. De normen en toetspunten zijn afgeleide onderzoeksvoorstellen, geen actuele bevindingen of zelfstandige wettelijke verplichtingen.</p></LawAboutIntro>
  <LawAboutSpecifications>
   <div><dt>Soort kader</dt><dd>Thema- of procesgericht onderzoekskader</dd></div>
   <div><dt>Bronrapporten</dt><dd>{used.length} in gebruik · {reports.length} beschikbaar</dd></div>
   <div><dt>Normen binnen rapportkeuze</dt><dd>{lines.length} van {allLines.length}</dd></div>
   <div><dt>Herkomst</dt><dd>Bronanalyses en afgeleide onderzoeksvoorstellen</dd></div>
   <div><dt>Actualiteit</dt><dd>Historische rapportcontext; controleer je onderzoeksperiode</dd></div>
   <div><dt>Broncontrole</dt><dd>Per toetspunt via Bronpassage<small>Letterlijke passages blijven onderscheiden van interpretaties.</small></dd></div>
  </LawAboutSpecifications>
  <div className="law-about-columns">
   <section className="law-about-card"><h3><Layers size={18}/>Wat onderzoek je met dit kader?</h3><p>{content.focus}</p>{content.titles.length>0?<><ul className="report-about-topics">{content.titles.slice(0,6).map(t=><li key={t}>{t}</li>)}</ul>{content.titles.length>6&&<details className="report-about-more"><summary>Nog {countLabel(content.titles.length-6,'normen')} bekijken</summary><ul className="report-about-topics">{content.titles.slice(6).map(t=><li key={t}>{t}</li>)}</ul></details>}</>:<p>Alle rapporten zijn verborgen. Wijzig de rapportkeuze om de onderwerpen in dit kader te bekijken.</p>}</section>
   <section className="law-about-card"><h3><Users size={18}/>Voor wie en wanneer bruikbaar?</h3><p>{content.audience}</p><h4>Zo baken je je onderzoek af</h4><p>{content.use}</p></section>
  </div>
  <section className="law-about-card"><h3><BookOpen size={18}/>Welke rapporten zijn gebruikt?</h3><p>Dit zijn de rapporten die bij het geopende thema of proces horen. Rapportkeuze bepaalt welke normen je ziet; eerder gekozen toetspunten, eigen formuleringen en vraagkoppelingen blijven bewaard als je een rapport verbergt.</p><Button variant="outline" onClick={onChoice}>Rapportkeuze wijzigen</Button>
   <div className="report-about-list">{reports.map(f=>{const count=lines.filter(l=>l.report_id===f.report.id).length;return <article key={f.report.id}><div><small>{f.report.id} · {reportDateLabel(f.report)}</small><h4>{f.report.title}</h4><p>{count} {count===1?'norm':'normen'} in beeld · {used.includes(f)?'In gebruik':'Verborgen door rapportkeuze'}</p></div><Button variant="outline" onClick={()=>onRead(f.report.id)}>Lees rapport</Button></article>;})}</div>
  </section>
  <section className="law-about-card law-about-quality"><h3><ShieldCheck size={18}/>Aandachtspunten bij gebruik</h3><p>Wat kun je uit dit rapport afleiden, en wat moet je zelf nog onderzoeken? Kies een rapport voor de bijbehorende context en aandachtspunten. Ontbrekende broninformatie betekent niet dat een maatregel ontbreekt.</p>
   <fieldset className="report-about-selector"><legend className="sr-only">Rapport voor broncontext</legend>{reports.map(f=><Button variant="outline" key={f.report.id} aria-pressed={current?.report.id===f.report.id} onClick={()=>setSelected(f.report.id)}>{f.report.id} · {f.report.year}</Button>)}</fieldset>
   {current&&<div className="report-about-context" key={current.report.id}><h4>{current.report.title}</h4><h5>Onderzoekscontext</h5><p>{current.report.scope||current.scope}</p>
    <div className="report-usage-notes">{guidance.cards.map((c:{title:string;meaning?:string;action:string;notes?:string[]})=><section key={c.title}><h5>{c.title}</h5>{c.meaning&&<p>{c.meaning}</p>}<p className="report-usage-action"><strong>Voor jouw onderzoek</strong>{c.action}</p>{c.notes&&<details><summary>Bijbehorende bronbeperkingen lezen ({c.notes.length})</summary><ul>{c.notes.map((t,i)=><li key={i}>{t}</li>)}</ul></details>}</section>)}</div>
    {!current.limitations.length&&<p>Geen afzonderlijke beperkingen opgenomen in deze bronversie. Dat is geen bevestiging van volledigheid.</p>}
    <details className="report-source-accountability"><summary>Volledige bronverantwoording · {current.limitations.length} bronbeperkingen{current.gaps.length>0?` · ${current.gaps.length} open punten`:''}</summary><p>De oorspronkelijke verantwoording bij de bronuitwerking, ongewijzigd. De leeswijzer hierboven vervangt deze niet.</p><h5>Bronbeperkingen</h5><ul>{current.limitations.map((t,i)=><li key={i}>{t}</li>)}</ul>{current.gaps.length>0&&<><h5>Nog vast te stellen voor nieuw onderzoek</h5><ul>{current.gaps.map((t,i)=><li key={i}>{t}</li>)}</ul></>}</details>
    <Button variant="outline" onClick={()=>onRead(current.report.id)}>Bekijk oorspronkelijke bron</Button></div>}
  </section>
 </section>;
}
