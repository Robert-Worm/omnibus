'use client';
import {BookOpen,Info} from 'lucide-react';
import {modelChoiceGuide,modelAttribution} from '@/lib/content-adapters/model-choice-guide.mjs';
import {questionWorkbenchPresentation} from '@/lib/content-adapters/research-models.mjs';
import {modelDisplayName} from '@/lib/interview-structure.mjs';
import type {LibraryModel} from './model-library';
import {LawAboutIntro} from './law-about-layout';

export default function ModelAbout({model}:{model:LibraryModel}) {
 const guide=modelChoiceGuide(model),presentation=questionWorkbenchPresentation(model);
 return <section className="law-about model-about" aria-label="Over dit model">
  <LawAboutIntro title={modelDisplayName(model)} links={[]}><p>{model.description}</p><p>{presentation.structure} · Omnibus-uitwerking {model.version}</p></LawAboutIntro>
  <div className="law-about-columns">
   <section className="law-about-card"><h3><BookOpen size={18}/> Wat voor model is dit?</h3>{guide.summary!==guide.use&&<p>{guide.summary}</p>}<p>{guide.concepts}</p><p>{modelAttribution(model)}</p></section>
   <section className="law-about-card"><h3><Info size={18}/> Voor wie en wanneer bruikbaar?</h3><p>{guide.use}</p>{presentation.hint&&<p>{presentation.hint}</p>}</section>
  </div>
  <section className="law-about-card"><h3>Uitwerking en afbakening</h3><p>Omnibus gebruikt dit model als basis voor open interviewvragen in een audit. De vragen zijn een eigen kwalitatieve uitwerking, geen officiële of gevalideerde vragenlijst van de modelmakers.</p><p>{guide.boundary}</p>{model.limitation&&<p>{model.limitation}</p>}</section>
  <section className="law-about-card"><h3>Bronnen bij dit model</h3><ul>{model.sources?.map(source=><li key={source.id}>{source.url?<a href={source.url} target="_blank" rel="noreferrer">{source.title}</a>:source.title}</li>)}</ul></section>
 </section>;
}
