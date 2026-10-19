export type CioEditorialEdition={version:string;pointChange?:{before:string;after:string;reason:string}|null;criterionChange?:{before:string;after:string;reason:string}|null};
export default function CioEditorialHistory({edition}:{edition?:CioEditorialEdition}) {
  if(!edition)return null;
  return <details className="cio-editorial-history">
    <summary>Redactie en herkomst</summary>
    <p>Nederlandse redactie {edition.version}. De oorspronkelijke broncitaten, voorwaarden en uitzonderingen zijn behouden. De redactie is afzonderlijk door een AI-panel beoordeeld; dit is geen menselijke juridische goedkeuring.</p>
    {([['Toetspunt',edition.pointChange],['Bovenliggende norm',edition.criterionChange]] as const).map(([label,change])=>change?<section key={label}>
      <h4>{label}</h4><p>{change.reason}</p>
      <details><summary>Eerdere extractietekst vergelijken</summary><p>{change.before}</p></details>
    </section>:null)}
  </details>;
}
