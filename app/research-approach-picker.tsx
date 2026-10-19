"use client";
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { approachCombinations, researchApproachText, causalApproachNote } from '@/lib/research-approach.mjs';
import { directionPlan, directionLabel } from '@/lib/research-directions.mjs';

type Approach = {breadth?:string;lens?:string};
export default function ResearchApproachPicker({direction,topic,value,disabled,onChange,onUse}: {
  direction:string;topic:string;value?:Approach;disabled:boolean;
  onChange:(value:Approach)=>void;onUse:(text:string,topic:string)=>void;
}) {
  const [showOther,setShowOther]=useState(false);
  const [subject,setSubject]=useState<{original:string;text:string}|null>(null);
  const chosenSubject=subject?.original===topic ? subject.text : topic;
  const combinations=approachCombinations(direction);
  const selected=combinations.find(c=>c.breadth===value?.breadth && c.lens===value?.lens);
  const visible=combinations.filter(c=>c.inSourceTable || showOther || c.id===selected?.id);
  const preview=selected && chosenSubject.trim() ? directionPlan(direction,chosenSubject,value) : null;
  if(!directionLabel(direction))return <p className="edit-note">Kies hierboven een onderzoeksrichting om de bijbehorende combinaties uit de brontabel te zien.</p>;
  return <section className="research-approach" aria-label="Onderzoeksstrategie bij je vraag">
    <h3>Wat wil je te weten komen?</h3>
    <p>Kies bij <strong>{directionLabel(direction).toLocaleLowerCase('nl')}</strong> onderzoek wat je wilt weten. De toelichting hieronder volgt de brontabel.</p>
    <details className="approach-definitions"><summary>Wat betekenen breed, diep, procedureel en causaal?</summary><p><strong>Breedtestrategie:</strong> breed overzicht. <strong>Dieptestrategie:</strong> een beperkt aantal situaties grondig begrijpen.<br/>
      <strong>Procedureel (beschrijvend):</strong> beschrijven wat er gebeurt. <strong>Causaal (toetsend):</strong> toetsen of een verondersteld oorzakelijk verband bestaat.</p></details>
    <fieldset className="approach-combinations"  aria-label="Combinaties van strategie en optiek">
      {visible.map(c=><button key={c.id} type="button" disabled={disabled} aria-pressed={c.id===selected?.id}
        className="approach-combination" onClick={()=>onChange({breadth:c.breadth,lens:c.lens})}>
        <strong>{c.label}</strong>
        {c.inSourceTable ? <span>{c.description}</span>
          : <span>Niet uitgewerkt in de brontabel voor deze onderzoeksrichting. Deze combinatie vraagt een eigen methodologische onderbouwing.</span>}
      </button>)}
    </fieldset>
    <div className="approach-actions">
      {combinations.some(c=>!c.inSourceTable) && <Button variant="ghost" size="sm" disabled={disabled} onClick={()=>setShowOther(!showOther)}>{showOther ? 'Alleen bronvoorbeelden tonen' : 'Andere combinaties bekijken'}</Button>}
      {researchApproachText(value) && <Button variant="ghost" size="sm" disabled={disabled} onClick={()=>onChange({})}>Strategiekeuze wissen</Button>}
    </div>
    {value && !selected && researchApproachText(value) && <p className="edit-note">Eerder gekozen: {researchApproachText(value)}. Kies een combinatie om een vraagvoorstel te bekijken.</p>}
    {selected && <div className="approach-question-preview">
      {selected.inSourceTable && <p className="approach-example"><strong>Bronvoorbeeld:</strong> {selected.example}</p>}
      <label htmlFor="approach-subject">Onderwerp voor dit vraagvoorstel</label>
      <Input id="approach-subject" value={chosenSubject} disabled={disabled} maxLength={500}
        placeholder="Bijvoorbeeld: de invoering van de nieuwe werkwijze"
        onChange={e=>setSubject({original:topic,text:e.target.value})}/>
      <small>{selected.breadth==='broad' ? 'Baken af welke teams, gevallen of onderdelen je vergelijkt en over welke periode.' : 'Benoem de situatie, het team of de casus die je grondig onderzoekt en de periode.'}</small>
      {preview ? <><strong>Voorstel voor jouw centrale vraag</strong><p>{preview.text}</p>
        <Button disabled={disabled} onClick={()=>onUse(preview.text,chosenSubject)}>Gebruik dit voorstel</Button>
        <small>Dit vult het vraagveld in. Je kunt de tekst aanpassen voordat je de vraag opneemt.</small></>
        : <p>Vul het onderwerp in om een passend vraagvoorstel te bekijken.</p>}
      {selected.lens==='causal' && <p className="research-approach-note">{causalApproachNote}</p>}
    </div>}
  </section>;
}
