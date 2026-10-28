import {RefreshCw} from 'lucide-react';
import {researchQuestionFormulations, nextResearchQuestionFormulation} from '@/lib/research-question-formulations.mjs';

export default function QuestionWordingCycle({text,label,disabled,exactReviewedText=false,onChange}:{text:string;label:string;disabled:boolean;exactReviewedText?:boolean;onChange:(text:string)=>void}) {
  if(exactReviewedText)return null;
  const variants=researchQuestionFormulations(text);
  if(variants.length<2)return null;
  return <button type="button" className="question-wording-cycle" data-no-drop data-no-drag disabled={disabled}
    aria-label={'Andere formulering voor '+label}
    title={`Andere formulering · ${variants.indexOf(text)+1} van ${variants.length}. Betekenis en bouwstenen blijven gelijk.`}
    onClick={()=>onChange(nextResearchQuestionFormulation(text))}>
    <RefreshCw size={13} aria-hidden="true"/>
  </button>;
}
