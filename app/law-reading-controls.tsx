'use client';
import {useEffect,useState} from 'react';
import type {MatrixTextDensity} from './compact-matrix';

const TIP='omnibus-tekstweergave-tip-v1';
/** Keuze voor de tekstweergave. Standaard compact; de eerste keer licht de keuze even op met een korte tip
 *  (besluit beheerder 9 november 2026), zodat zichtbaar is waar je meer tekst kiest. */
export default function LawReadingControls({value,onChange}:{value:MatrixTextDensity;onChange:(value:MatrixTextDensity)=>void}){
 const [tip,setTip]=useState(false);
 const sluit=()=>{setTip(false);try{localStorage.setItem(TIP,'1');}catch{}};
 useEffect(()=>{let gezien=true;try{gezien=localStorage.getItem(TIP)==='1';}catch{}if(gezien)return;
  const aan=setTimeout(()=>setTip(true),400),uit=setTimeout(()=>{setTip(false);try{localStorage.setItem(TIP,'1');}catch{}},12000);
  return()=>{clearTimeout(aan);clearTimeout(uit);};},[]);
 return <label className={`law-reading-control${tip?' law-reading-control-tip':''}`}>Tekstweergave<select aria-label="Tekstweergave normen" value={value} onFocus={()=>tip&&sluit()} onChange={e=>{sluit();onChange(e.target.value as MatrixTextDensity);}}><option value="compact">Compact</option><option value="comfortable">Meer tekst</option><option value="full">Volledige tekst</option></select>
  {tip&&<output className="law-reading-tip">Meer tekst zien? Kies hier <strong>Volledige tekst</strong>.</output>}</label>;
}
