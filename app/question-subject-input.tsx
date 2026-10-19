"use client";
import {useEffect,useState} from 'react';
import {Pause,Play} from 'lucide-react';
import {Input} from '@/components/ui/input';
import {subjectExamples} from '@/lib/question-writing.mjs';

export default function QuestionSubjectInput({value,disabled,onChange}:{value:string;disabled:boolean;onChange:(value:string)=>void}) {
 const [index,setIndex]=useState(0);
 const [focused,setFocused]=useState(false);
 const [paused,setPaused]=useState(false);
 const [reduced,setReduced]=useState(false);
 useEffect(()=>{
  const media=window.matchMedia('(prefers-reduced-motion: reduce)');
  const update=()=>setReduced(media.matches);update();media.addEventListener('change',update);
  return ()=>media.removeEventListener('change',update);
 },[]);
 useEffect(()=>{
  if(value||focused||paused||reduced||disabled)return;
  const timer=window.setInterval(()=>{if(!document.hidden)setIndex(i=>(i+1)%subjectExamples.length);},6000);
  return ()=>window.clearInterval(timer);
 },[value,focused,paused,reduced,disabled]);
 return <div className="composer-subject">
  <div className="subject-label-row"><label htmlFor="question-subject">Onderwerp <span>optioneel</span></label>
   {!value&&!reduced&&<button type="button" disabled={disabled} className="subject-example-pause" aria-label={paused?'Onderwerpvoorbeelden hervatten':'Onderwerpvoorbeelden pauzeren'} title={paused?'Voorbeelden hervatten':'Voorbeelden pauzeren'} onClick={()=>setPaused(v=>!v)}>{paused?<Play size={14}/>:<Pause size={14}/>}</button>}
  </div>
  <Input id="question-subject" value={value} maxLength={1000} disabled={disabled} placeholder={'Bijvoorbeeld: '+subjectExamples[index]} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} onChange={e=>onChange(e.target.value)}/>
 </div>;
}
