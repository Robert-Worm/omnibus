export type MissingCriterion = {originKey:string;code:string;title:string;available:boolean};

export default function ProposalCoverage({scopeNote,missingCriteria:all=[]}:{scopeNote?:string;missingCriteria?:MissingCriterion[]}) {
  // Verwijzingen naar toetspunten die niet (meer) in de catalogus staan, zeggen de gebruiker niets (panel 10 november 2026).
  const missingCriteria=all.filter(item=>item.available);
  if(!missingCriteria.length) return scopeNote?<p className="proposal-scope-note">{scopeNote}</p>:null;
  const known=missingCriteria.filter(item=>item.available).length;
  const summary=[known?`${known} ${known===1?'norm niet gekozen':'normen niet gekozen'}`:''].filter(Boolean).join(' · ');
  return <details className="proposal-coverage">
    <summary>{summary}</summary>
    {scopeNote&&<p>{scopeNote}</p>}
    <ul>{missingCriteria.map(item=><li key={item.originKey}><strong>{item.code}</strong> — {item.title}</li>)}</ul>
    {known>0&&<p>Beperk de vraag tot je selectie, of voeg de passende normen toe via Wetten &amp; kaders.</p>}
  </details>;
}
