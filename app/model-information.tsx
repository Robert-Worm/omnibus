"use client";
import {BookOpen, Info, X} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription, DialogClose} from '@/components/ui/dialog';
import {modelChoiceGuide, modelAttribution} from '@/lib/content-adapters/model-choice-guide.mjs';
import {questionWorkbenchPresentation} from '@/lib/content-adapters/research-models.mjs';
import {modelDisplayName} from '@/lib/interview-structure.mjs';
import type {LibraryModel} from './model-library';

export default function ModelInformation({model,onAbout}:{model:LibraryModel;onAbout?:()=>void}) {
  const guide=modelChoiceGuide(model), presentation=questionWorkbenchPresentation(model);
  return <div className="model-information-actions" aria-label="Modelinformatie">
    {(['concepts','about'] as const).map(kind=>{
      const title=kind==='concepts'?'Begrippen en toepassingen':'Over dit model';
      const Icon=kind==='concepts'?BookOpen:Info;
      if(kind==='about'&&onAbout)return <Button key={kind} variant="outline" className="model-information-trigger" aria-label={title} title={title} onClick={onAbout}><Icon size={18} aria-hidden="true"/></Button>;
      return <Dialog key={kind}>
        <DialogTrigger render={<Button variant="outline" className="model-information-trigger" aria-label={title} title={title}/>}>
          <Icon size={18} aria-hidden="true"/>
        </DialogTrigger>
        <DialogContent className="model-information-dialog" showCloseButton={false}>
          <div className="model-information-heading">
            <DialogTitle>{title}</DialogTitle>
            <DialogClose render={<Button variant="ghost" size="icon-sm" aria-label="Sluiten"/>}><X size={18} aria-hidden="true"/></DialogClose>
          </div>
          <DialogDescription>{modelDisplayName(model)}</DialogDescription>
          {kind==='concepts'?<div className="model-information-body model-choice-details">
            <p><strong>Begrippen</strong>{guide.concepts}</p>
            <p><strong>Toepassing</strong>{guide.use}</p>
            <p><strong>Afbakening</strong>{guide.boundary}</p>
            {presentation.hint&&<p><strong>Onderzoekscontext</strong>{presentation.hint}</p>}
          </div>:<div className="model-information-body">
            <p className="model-attribution"><strong>Modelbron</strong>{modelAttribution(model)}</p>
            <p><strong>Interviewuitwerking</strong>Omnibus gebruikt dit model als basis voor open interviewvragen in een audit. De vragen zijn een eigen kwalitatieve uitwerking, geen officiële of gevalideerde vragenlijst van de modelmakers.</p>
            {model.description&&<p>{model.description}</p>}
            {model.limitation&&<p>{model.limitation}</p>}
            <p>{presentation.structure} · Omnibus-uitwerking {model.version}</p>
            <ul>{model.sources?.map(source=><li key={source.id}>{source.url?<a href={source.url} target="_blank" rel="noreferrer">{source.title}</a>:source.title}</li>)}</ul>
          </div>}
        </DialogContent>
      </Dialog>;
    })}
  </div>;
}
