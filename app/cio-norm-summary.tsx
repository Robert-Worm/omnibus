import {ShieldCheck} from 'lucide-react';
import {cioKindLabels} from '@/lib/cio-law-data.mjs';
import type {Point} from './cio-law-workspace';

export default function CioNormSummary({point}:{point:Pick<Point,'id'|'text'|'normative_kind'|'selection_status'|'selection_reason'>}){
 return <section className="cio-norm-summary" aria-label="Inhoud van het toetspunt">
  <div className="cio-norm-heading"><ShieldCheck size={18} aria-hidden="true"/><h3>Wat houdt dit toetspunt in?</h3><span>{(cioKindLabels as Record<string,string>)[point.normative_kind]||point.normative_kind}</span></div>
  <p>{point.text}</p><small>{point.id}</small>
  {point.selection_status!=='SELECTABLE'&&<p className="cio-source-caution">Nog niet selecteerbaar · {point.selection_reason}</p>}
 </section>;
}
