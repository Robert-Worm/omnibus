// Keuzelijst voor het toetspunt dat je bekijkt in de tabbladen Bronpassage en Toetsaanpak (9 november 2026).
// Ontwerp van een panel (interactie, visueel, auditor/toegankelijkheid): één blok met daarboven "welk punt bekijk je"
// (Select met nummer, titel en status, plus vorige/volgende) en daaronder "neem je het op" (checkbox).
// Bekijken en kiezen blijven gescheiden: de lijst wisselt alleen het bekeken punt, de checkbox kiest.
import {useState} from 'react';
import {Check,ChevronLeft,ChevronRight,Lock} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Checkbox} from '@/components/ui/checkbox';
import {Select,SelectContent,SelectItem,SelectTrigger} from '@/components/ui/select';
import {AfkortingText} from './term-help';

type PickerPoint={id:string;title:string;selection_status:string};
type Props={points:PickerPoint[];currentId:string;selected:ReadonlySet<unknown>;disabled?:boolean;onView:(id:string)=>void;onChoose?:(id:string,value:boolean)=>void};

const statusText=(p:PickerPoint,selected:ReadonlySet<unknown>)=>p.selection_status!=='SELECTABLE'?'nog niet vrijgegeven':selected.has(p.id)?'gekozen':'niet gekozen';

export default function LawPointPicker({points,currentId,selected,disabled,onView,onChoose}:Props){
 const [melding,setMelding]=useState('');
 const index=Math.max(0,points.findIndex(p=>p.id===currentId)),point=points[index];
 if(!point)return null;
 const total=points.length,chosen=points.filter(p=>selected.has(p.id)).length,hold=points.filter(p=>p.selection_status!=='SELECTABLE').length;
 const view=(id:string)=>{const i=points.findIndex(p=>p.id===id);if(i<0||id===currentId)return;onView(id);setMelding(`Toetspunt ${i+1} van ${total}: ${points[i].title}, ${statusText(points[i],selected)}`);};
 const selectable=point.selection_status==='SELECTABLE';
 return <section className="law-point-picker" aria-label="Toetspunt">
  {total>1&&<div className="law-point-picker-row">
   <Select value={point.id} onValueChange={v=>{if(typeof v==='string')view(v);}}>
    <SelectTrigger className="law-point-select" aria-label={`Toetspunt bekijken, ${index+1} van ${total}: ${point.title}`}>
     <span className="law-point-select-body">
      <small>Toetspunt bekijken · {index+1} van {total}<span className="law-point-select-count"> · {chosen} gekozen{hold>0&&` · ${hold} niet vrijgegeven`}</span></small>
      <span className="law-point-select-title"><span className={'law-point-num'+(selected.has(point.id)?' is-chosen':'')}>{index+1}</span><strong>{point.title}</strong></span>
     </span>
    </SelectTrigger>
    <SelectContent className="law-point-menu" alignItemWithTrigger={false} align="start">
     {points.map((p,i)=>{const isChosen=selected.has(p.id),isHold=p.selection_status!=='SELECTABLE';return <SelectItem key={p.id} value={p.id} className="law-point-option" aria-label={`${i+1}. ${p.title}, ${statusText(p,selected)}`}>
      <span className={'law-point-num'+(isChosen?' is-chosen':'')}>{i+1}</span>
      <span className="law-point-option-text"><span>{p.title}</span><small className={isChosen?'is-chosen':isHold?'is-hold':undefined}>{isChosen?<Check size={12}/>:isHold?<Lock size={12}/>:null}{statusText(p,selected)}</small></span>
     </SelectItem>;})}
    </SelectContent>
   </Select>
   <div className="law-point-step">
    <Button variant="outline" size="icon" aria-label="Vorig toetspunt" disabled={index===0} onClick={()=>view(points[index-1].id)}><ChevronLeft size={16}/></Button>
    <Button variant="outline" size="icon" aria-label="Volgend toetspunt" disabled={index===total-1} onClick={()=>view(points[index+1].id)}><ChevronRight size={16}/></Button>
   </div>
  </div>}
  {onChoose&&<div className="law-active-choice"><label htmlFor={`law-active-${point.id}`}><Checkbox id={`law-active-${point.id}`} disabled={disabled||!selectable} checked={selected.has(point.id)} onCheckedChange={value=>onChoose(point.id,value===true)}/><span><strong>{total>1?(selected.has(point.id)?'Opgenomen in je kader':'Neem dit toetspunt op in je kader'):<AfkortingText text={point.title}/>}</strong><small>{point.id} · {selectable?(selected.has(point.id)?'gekozen':'nog niet gekozen'):'nog niet vrijgegeven'}</small></span></label></div>}
  <p className="sr-only" aria-live="polite">{melding}</p>
 </section>;
}
