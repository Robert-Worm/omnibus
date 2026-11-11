"use client";
import {useId} from 'react';
import {MessageSquare,ScanSearch,ArrowRight} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import type {Draft} from '@/lib/framework-types';
import {TermText} from './term-help';
import {WorkflowOutcome} from './workflow-patterns';
export function ResearchEntry({route,onChoose,disabled}:{route:string;onChoose:(route:'question'|'risk')=>void;disabled:boolean}){
 return <section className="entry-options" aria-label="Kies je onderzoeksroute">
  <article className={route==='question'?'entry-card is-current':'entry-card'}><div className="entry-card-top"><span className="discovery-icon"><MessageSquare aria-hidden="true" size={25}/></span><span><TermText text="Vraaggestuurd"/>{route==='question'?' · huidige route':''}</span></div><h2>Mijn opdrachtgever wil inzicht</h2>
   <p><TermText text="Bepaal samen het doel en het gewenste inzicht. Kies passende normen en/of modelvariabelen en werk daarmee je onderzoeksvragen uit."/></p>
   <div className="entry-path"><span><TermText text="Doel en inzicht"/></span><ArrowRight size={14} aria-hidden="true"/><span><TermText text="Normen / variabelen"/></span><ArrowRight size={14} aria-hidden="true"/><span><TermText text="Onderzoeksvragen"/></span></div>
   <Button disabled={disabled} onClick={()=>onChoose('question')}>{route==='question'?'Verder met de behoefte':'Start vanuit deze behoefte'}<ArrowRight size={16}/></Button>
  </article>
  <article className={route==='risk'?'entry-card is-current':'entry-card'}><div className="entry-card-top"><span className="discovery-icon"><ScanSearch aria-hidden="true" size={25}/></span><span><TermText text="Risk-based"/>{route==='risk'?' · huidige route':''}</span></div><h2>Er zijn signalen en/of zorgen</h2>
   <p><TermText text="Je intake, gesprekken of eerder onderzoek wijzen op een thema of proces. Verken de risico’s en kies passende normen en/of modelvariabelen voor je onderzoeksvragen."/></p>
   <div className="entry-path"><span><TermText text="Thema of proces"/></span><ArrowRight size={14} aria-hidden="true"/><span><TermText text="Risico’s, normen / variabelen"/></span><ArrowRight size={14} aria-hidden="true"/><span><TermText text="Onderzoeksvragen"/></span></div>
   <Button disabled={disabled} onClick={()=>onChoose('risk')}>{route==='risk'?'Verder vanuit je signalen':'Start vanuit signalen'}<ArrowRight size={16}/></Button>
  </article>
  <WorkflowOutcome title={<>Beide routes → jouw <TermText text="referentiekader"/></>}><TermText text="Combineer normen, variabelen en onderzoeksvragen en exporteer je referentiekader naar Excel. Je kunt stappen herhalen en van route wisselen; je werk blijft behouden."/></WorkflowOutcome>
 </section>;
}
export function RiskIntake({draft,onChange,disabled}:{draft:Draft;onChange:(draft:Draft)=>void;disabled:boolean}){
 const inputId=useId();
 const intake=draft.investigation?.riskIntake||{context:'',signals:''};
 const change=(key:'context'|'signals',value:string)=>onChange({...draft,investigation:{...draft.investigation!,riskIntake:{...intake,[key]:value}}});
 return <details className="risk-context"><summary>Mijn context en signalen <span>{intake.context||intake.signals?'Opgeslagen · bekijken of wijzigen':'Optioneel · leg vast wat je wilt verkennen'}</span></summary><section className="risk-intake" aria-label="Context van je risicoverkenning">
  <label htmlFor={inputId+'-context'}>Organisatie, onderdeel of proces<Input id={inputId+'-context'} disabled={disabled} maxLength={5000} value={intake.context} placeholder="Bijvoorbeeld: de overgang naar clouddiensten" onChange={e=>change('context',e.target.value)}/></label>
  <label htmlFor={inputId+'-signals'}>Welke signalen of zorgen wil je verkennen?<Textarea id={inputId+'-signals'} disabled={disabled} maxLength={5000} value={intake.signals} placeholder="Bijvoorbeeld: onduidelijkheid over risicoacceptatie. Een onderzoeksvraag is nog niet nodig." onChange={e=>change('signals',e.target.value)}/></label>
  <p className="creator-help">Deze notities blijven bij je project. Ze filteren de lijst niet automatisch en berekenen geen risicoscore.</p>
 </section></details>;
}
