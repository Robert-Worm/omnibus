/** @typedef {{status:string,action?:string,expected_evidence?:string,interpretation_boundary?:string,reason:string}} Phase */

const reviewNotes=new Set([
  'Beoordeelde brongebonden toetsuitwerking.',
  'Gereviewd voorstel; gelijkwaardig bewijs mogelijk.',
  'Gereviewd onderzoeksvoorstel; gelijkwaardig bewijs mogelijk.',
  'Beoordeeld onderzoeksvoorstel; bewijsvoorbeelden zijn geen extra documentplicht.',
  'Afzonderlijk gereviewd onderzoeksvoorstel; geen extra toetsfase.',
  'Exacte afgebakende gereviewde toetsuitwerking.',
  'Beoordeelde auteursuitwerking voor opzet; geen extra bronplicht.',
  'Beoordeelde auteursuitwerking voor bestaan; geen extra bronplicht.',
  'Brongebonden auteursvoorstel; geen aanvullende wettelijke eis of geconstateerde tekortkoming.',
  'Aanvullend auditontwerp op basis van de reeds gelezen periodieke/jaarlijkse en wijzigingsgestuurde testhandelingen. De periode- en populatieaanpak is een auteursvoorstel; de bronvoorwaarden blijven ongewijzigd.',
  'Conceptaanvulling van de bewijsaanwijzing bij de reeds aanwezige vergelijking met BIA en ICT-risicobeoordeling; afzonderlijke review volgt.',
]);

/** Internal review labels stay in evidence. Preserve substantive, unfamiliar
 * phase qualifications, including reasons why a phase does not apply.
 * @param {Phase} plan */
export function lawPhaseContext(plan){
  const reason=plan.reason?.trim();
  if(!reason||reviewNotes.has(reason))return undefined;
  const text=(reason==='Eerdere visuele formulereview hergebruikt; minimum hoort bij reguliere route en wordt niet universeel op artikel 4 toegepast.'
    ?'Het minimum hoort bij de reguliere route en wordt niet universeel op artikel 4 toegepast.'
    :reason.replace(/^(?:ANALYST_PROPOSAL|REVIEWED_PROPOSAL|REVIEWED)\s*:\s*/u,'')).trim();
  if(!text||/^(?:ANALYST_PROPOSAL|REVIEWED_PROPOSAL|REVIEWED)$/u.test(text)||reviewNotes.has(text))return undefined;
  if([plan.action,plan.expected_evidence,plan.interpretation_boundary].some(value=>value?.includes(text)))return undefined;
  return text;
}

/** @param {{opzet:Phase,bestaan:Phase,werking?:Phase}} plans */
export function lawTestPhases(plans) {
  const phases = [
    {key:'opzet',label:'Opzet',plan:plans.opzet},
    {key:'bestaan',label:'Bestaan',plan:plans.bestaan},
  ];
  // Display an authored, applicable phase only. This does not generate a plan,
  // change the user's export choices or authorize an unreviewed source package.
  if (plans.werking?.status === 'APPLICABLE')
    phases.push({key:'werking',label:'Werking',plan:plans.werking});
  const boundaries = new Map();
  for (const phase of phases) {
    const text = phase.plan.interpretation_boundary;
    if (!text) continue;
    if (!boundaries.has(text)) boundaries.set(text,[]);
    boundaries.get(text).push(phase.label);
  }
  // Exact equality only: never normalize or merge different legal qualifiers.
  const shared = [...boundaries].filter(([,labels])=>labels.length>1)
    .map(([text,labels])=>({text,labels}));
  return {phases,shared};
}
