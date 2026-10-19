import type {LibraryModel} from './model-library';
import type {ReactNode} from 'react';
import {modelChoiceGuide,modelAttribution} from '@/lib/content-adapters/model-choice-guide.mjs';

export default function ModelIntroduction({model,expanded=false,compact=false,showDetails=true,children}:{model:LibraryModel;expanded?:boolean;compact?:boolean;showDetails?:boolean;children?:ReactNode}) {
  const guide=modelChoiceGuide(model);
  return <div className="model-introduction">
    {!compact&&<p className="model-attribution"><strong>Modelbron:</strong> {modelAttribution(model)}</p>}
    <p className="model-orientation">{guide.summary}</p>
    {children}
    {showDetails&&<details className={'model-choice-details'+(compact?' catalogue-card-details':'')}>
      <summary>{compact?'Modelbron & toepassing':expanded?'Begrippen, toepassingen en afbakening':'Begrippen en toepassingen'}</summary>
      {compact&&<p><strong>Modelbron:</strong> {modelAttribution(model)}</p>}
      <p><strong>Begrippen:</strong> {guide.concepts}</p>
      <p><strong>Bijvoorbeeld:</strong> {guide.use}</p>
      <p className="model-boundary"><strong>Houd rekening met:</strong> {guide.boundary}</p>
    </details>}
  </div>;
}
