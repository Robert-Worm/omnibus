"use client";
import {applicabilityRows,applicabilityLabels,updateApplicability} from "@/lib/applicability.mjs";
import type {Draft} from "@/lib/framework-types";
import {Textarea} from "@/components/ui/textarea";
import {Input} from "@/components/ui/input";
type Requirement = {originKey:string;sourceControlId?:string;title:string};
type AssessmentRow = {originKey:string;id?:string;title:string;status:string;reason:string;evidence:string;selected:boolean;linked:boolean;complete:boolean};
export default function ApplicabilityRegister({draft,requirements,onChange,disabled}:{draft:Draft;requirements:Requirement[];onChange:(d:Draft)=>void;disabled:boolean}) {
  const rows:AssessmentRow[]=applicabilityRows(draft,requirements);
  if(!rows.length) return null;
  const unresolved=rows.filter(r=>!r.complete).length;
  return <details className="foundation-coverage">
    <summary>Toepasselijkheid auditvereisten · {unresolved} van {rows.length} nog te onderbouwen</summary>
    <p>Beoordeel elk auditvereiste. Selecteren of koppelen is geen toepasselijkheidsbeoordeling. Leg je afbakening en dossierverwijzing vast, ook bij uitsluiting of dekking door een andere opdracht.</p>
    {rows.map(r=><details className="applicability-record" key={r.originKey}>
      <summary>{r.id} · {r.title} <span>{applicabilityLabels[r.status as keyof typeof applicabilityLabels]}</span></summary>
      <p>{r.linked ? "Gekoppeld aan een onderzoeksvraag" : r.selected ? "Gekozen, nog niet gekoppeld" : "Niet in je werkselectie"}{!r.complete && r.status!=="pending" ? " · Motivering of dossierverwijzing ontbreekt" : ""}</p>
      <label>Toepasselijkheid
        <select aria-label={"Toepasselijkheid " + r.id} disabled={disabled} value={r.status} onChange={e=>onChange(updateApplicability(draft,r.originKey,{status:e.target.value}) as Draft)}>
          {Object.entries(applicabilityLabels).map(([id,label])=><option key={id} value={id}>{label}</option>)}
        </select>
      </label>
      <label htmlFor={"reason-"+encodeURIComponent(r.originKey)}>Motivering en afbakening
        <Textarea id={"reason-"+encodeURIComponent(r.originKey)} aria-label={"Motivering " + r.id} disabled={disabled} maxLength={4000} value={r.reason} onChange={e=>onChange(updateApplicability(draft,r.originKey,{reason:e.target.value}) as Draft)} />
      </label>
      <label htmlFor={"evidence-"+encodeURIComponent(r.originKey)}>Dossierverwijzing of andere opdracht
        <Input id={"evidence-"+encodeURIComponent(r.originKey)} aria-label={"Dossierverwijzing " + r.id} disabled={disabled} maxLength={2000} value={r.evidence} onChange={e=>onChange(updateApplicability(draft,r.originKey,{evidence:e.target.value}) as Draft)} />
      </label>
    </details>)}
  </details>;
}
