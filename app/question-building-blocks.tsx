"use client";
import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {Checkbox} from '@/components/ui/checkbox';
import {normId} from '@/lib/norm-navigation.mjs';
import {groupBuildingBlocks} from '@/lib/workflow-readability.mjs';
import type {Framework} from '@/lib/framework-types';
import {ResearchMaterialList} from './research-material-list';
import DeferredViewerSection from './deferred-viewer-section';

export default function QuestionBuildingBlocks({lines,attached,linkedElsewhere,disabled,onLink,questions,targetId,onTargetChange}:{
  lines:Framework['lines']; attached:string[]; linkedElsewhere:string[]; disabled:boolean;
  onLink:(ids:string[])=>boolean;
  questions:{id:string;label:string}[];targetId:string;onTargetChange:(id:string)=>void;
}) {
  const [open,setOpen]=useState(false);
  const [chosen,setChosen]=useState<string[]>([]);
  const available=lines.filter(l=>!attached.includes(l.id));
  const visible=available;
  const ids=available.filter(l=>chosen.includes(l.id)).map(l=>l.id);
  const allVisible=visible.length>0&&visible.every(l=>chosen.includes(l.id));
  const groups:{id:string;title:string;sourceTitle:string;lines:Framework['lines']}[]=groupBuildingBlocks(visible);
  return <details className="bulk-link-panel question-bulk-link" data-no-drop open={open} onToggle={e=>setOpen(e.currentTarget.open)}>
    <summary>Meerdere bouwstenen koppelen <span>({available.length} gekozen {available.length===1?'bouwsteen':'bouwstenen'})</span></summary>
    {open && <div className="question-bulk-body">
      <label className="bulk-link-destination">Koppelen aan
        <select value={targetId} disabled={disabled} onChange={e=>onTargetChange(e.target.value)}>
          <option value="">Kies een centrale vraag of deelvraag</option>
          {questions.map(q=><option key={q.id} value={q.id}>{q.label}</option>)}
        </select>
      </label>
      {available.length>0 ? <>
        <Button variant="link" disabled={disabled||!visible.length} onClick={()=>setChosen(previous=>allVisible ? previous.filter(id=>!visible.some(l=>l.id===id)) : [...new Set([...previous,...visible.map(l=>l.id)])])}>
          {allVisible ? 'Getoonde selectie wissen' : `Selecteer alle ${visible.length} getoonde bouwstenen`}
        </Button>
        <div className="bulk-link-items">{groups.map((group,index)=><DeferredViewerSection key={group.id}
          immediate={index===0} count={group.lines.length} label={group.title+' tonen'}>
          <fieldset className="bulk-link-group">
          <legend>{group.sourceTitle && <small>{group.sourceTitle}</small>}{group.title} ({group.lines.length})</legend>
          <Button variant="outline" disabled={disabled||!targetId} aria-label={'Koppel getoonde groep '+group.title+' aan de gekozen vraag'}
            onClick={()=>{const groupIds=group.lines.map(l=>l.id);if(onLink(groupIds))setChosen(previous=>previous.filter(id=>!groupIds.includes(id)));}}>
            Koppel {group.lines.length} uit deze groep
          </Button>
          <ResearchMaterialList lines={group.lines} renderItem={l=><label key={l.id}>
          <Checkbox disabled={disabled} checked={chosen.includes(l.id)} onCheckedChange={v=>setChosen(previous=>v ? [...new Set([...previous,l.id])] : previous.filter(id=>id!==l.id))}/>
          <span>{normId(l.id)} · {l.title}{linkedElsewhere.includes(l.id)&&<small>Ook gekoppeld aan een andere vraag</small>}</span>
        </label>}/></fieldset></DeferredViewerSection>)}</div>
        <Button disabled={disabled||!targetId||!ids.length} onClick={()=>{if(onLink(ids))setChosen([]);}}>Koppel {ids.length} {ids.length===1 ? 'bouwsteen' : 'bouwstenen'} aan de gekozen vraag</Button>
      </> : <p>{lines.length ? 'Alle gekozen bouwstenen zijn al aan deze vraag gekoppeld.' : 'Verzamel eerst bouwstenen in stap 2.'}</p>}
    </div>}
  </details>;
}
