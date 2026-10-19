"use client";
import {useState} from 'react';
import {ArrowLeft,ArrowRight,Lightbulb,Plus} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Dialog,DialogTrigger,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogClose} from '@/components/ui/dialog';
import {questionExamples,hasQuestion,nextUnusedExample} from '@/lib/question-writing.mjs';
import TermHelp from './term-help';

export default function QuestionExamples({subject,disabled,centralText,subquestions,canAddSub,onCentral,onSub}:{
 subject:string;disabled:boolean;centralText:string;subquestions:string[];canAddSub:boolean;
 onCentral:(text:string)=>void;onSub:(text:string)=>void;
}) {
 const [kind,setKind]=useState<'central'|'sub'>('central');
 const [route,setRoute]=useState(0);
 const [subIndex,setSubIndex]=useState(0);
 const [replace,setReplace]=useState<{text:string;subject:string;previous:string}|null>(null);
 const pendingReplace=replace?.subject===subject&&replace?.previous===centralText?replace:null;
 const sets=questionExamples(subject,route);
 const examples=sets[kind];
 const index=kind==='central'?route:subIndex;
 const text=examples[index] || examples[0];
 const used=kind==='central'?hasQuestion([centralText],text):hasQuestion(subquestions,text);
 function step(){setReplace(null);}
 function applyCentral(text:string){onCentral(text);setReplace(null);if(canAddSub){setKind('sub');setSubIndex(nextUnusedExample(sets.sub,subquestions,-1));}}
 function useExample(){
  if(used)return;
  if(kind==='sub'){onSub(text);setSubIndex(nextUnusedExample(examples,[...subquestions,text],index));return;}
  if(centralText.trim()&&centralText!==text){setReplace({text,subject,previous:centralText});return;}
  applyCentral(text);
 }
 return <Dialog>
  <DialogTrigger render={<Button variant="outline" disabled={disabled} className="question-inspiration-trigger"/>}><Lightbulb size={16}/>Inspiratie nodig?</DialogTrigger>
  <DialogContent className="question-inspiration-dialog" showCloseButton={false}>
  <DialogHeader><DialogTitle>Inspiratie voor je onderzoeksvragen</DialogTitle><DialogDescription className="sr-only">Blader door voorbeelden van centrale vragen en deelvragen. Je kiest zelf wat je overneemt.</DialogDescription></DialogHeader>
  <aside className="question-examples" aria-label="Hulp bij formuleren">
  <header><Lightbulb size={20} aria-hidden="true"/><h3>Voorbeeld bij je onderwerp</h3></header>
  <fieldset className="example-tabs"><legend className="sr-only">Soort voorbeeld</legend>
   <button type="button" aria-pressed={kind==='central'} onClick={()=>{setKind('central');step();}}>Centrale vraag</button>
   <button type="button" aria-pressed={kind==='sub'} onClick={()=>{setKind('sub');setSubIndex(nextUnusedExample(sets.sub,subquestions,-1));step();}}>Deelvragen</button>
  </fieldset>
  <div className="example-card" aria-live="polite"><small>Voorbeeld · {sets.routes[route].label}</small>{kind==='sub'&&<div className="example-central-context"><span>Centrale voorbeeldvraag</span><p>{sets.central[route]}</p></div>}<p>{text}</p></div>
  <nav className="example-controls" aria-label="Blader door voorbeelden">
   <Button variant="ghost" aria-label="Vorig voorbeeld" onClick={()=>{if(kind==='central'){setRoute(i=>(i+sets.central.length-1)%sets.central.length);setSubIndex(0);}else setSubIndex(i=>(i+examples.length-1)%examples.length);step();}}><ArrowLeft size={16}/></Button>
   <span>{index+1} / {examples.length}</span>
   <Button variant="ghost" aria-label="Volgend voorbeeld" onClick={()=>{if(kind==='central'){setRoute(i=>(i+1)%sets.central.length);setSubIndex(0);}else setSubIndex(i=>(i+1)%examples.length);step();}}><ArrowRight size={16}/></Button>
  </nav>
  {(kind==='central'||canAddSub)&&<Button variant="outline" disabled={disabled||used} onClick={useExample}><Plus size={16}/>{used?'Al toegevoegd':kind==='central'?'Gebruik deze vraag':'Voeg deelvraag toe'}</Button>}
  {pendingReplace!==null&&<div className="example-replace" role="alert"><p>Je huidige centrale vraag vervangen?</p><Button disabled={disabled} onClick={()=>applyCentral(pendingReplace.text)}>Vervangen</Button><Button variant="ghost" onClick={()=>setReplace(null)}>Behouden</Button></div>}
  <p className="example-check">{!subject.trim()?'Je kunt [onderwerp] en de andere invulvelden later aanpassen.':kind==='central'?'Pas de [invulvelden] aan voor jouw onderzoek.':<>Laat je <TermHelp id="subquestion">deelvragen</TermHelp> aansluiten op je <TermHelp id="central">centrale vraag</TermHelp>.</>}</p>
 </aside>
 <DialogClose render={<Button variant="outline"/>}>Terug naar mijn vraag</DialogClose>
 </DialogContent>
 </Dialog>;
}
