"use client";
import {Input} from '@/components/ui/input';
import {subjectExamples} from '@/lib/question-writing.mjs';

// Eén vast voorbeeld in het veld. Wisselende voorbeelden vroegen om een pauzeknop die gebruikers niet begrepen (B-058);
// meer voorbeelden staan onder "Inspiratie nodig?".
export default function QuestionSubjectInput({value,disabled,onChange}:{value:string;disabled:boolean;onChange:(value:string)=>void}) {
 return <div className="composer-subject">
  <div className="subject-label-row"><label htmlFor="question-subject">Onderwerp <span>optioneel</span></label></div>
  <Input id="question-subject" value={value} maxLength={1000} disabled={disabled} placeholder={'Bijvoorbeeld: '+subjectExamples[0]} onChange={e=>onChange(e.target.value)}/>
 </div>;
}
