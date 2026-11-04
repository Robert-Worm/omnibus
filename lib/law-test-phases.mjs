/** @typedef {{status:string,action?:string,expected_evidence?:string,interpretation_boundary?:string,reason:string}} Phase */

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
