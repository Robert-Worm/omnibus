export type MissingCriterion = {originKey:string;code:string;title:string;available:boolean};

export default function ProposalCoverage({scopeNote,missingCriteria=[]}:{scopeNote?:string;missingCriteria?:MissingCriterion[]}) {
  if(!missingCriteria.length) return scopeNote?<p className="proposal-scope-note">{scopeNote}</p>:null;
  const known=missingCriteria.filter(item=>item.available).length;
  const unknown=missingCriteria.length-known;
  const summary=[known?`${known} ${known===1?'norm niet gekozen':'normen niet gekozen'}`:'',unknown?`${unknown} ${unknown===1?'bronverwijzing niet beschikbaar':'bronverwijzingen niet beschikbaar'}`:''].filter(Boolean).join(' · ');
  return <details className="proposal-coverage">
    <summary>{summary}</summary>
    {scopeNote&&<p>{scopeNote}</p>}
    <ul>{missingCriteria.map(item=><li key={item.originKey}><strong>{item.code}</strong> — {item.title}</li>)}</ul>
    {known>0&&<p>Beperk de vraag tot je selectie, of voeg de passende normen toe via Wetten &amp; kaders.</p>}
  </details>;
}
