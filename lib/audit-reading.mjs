// Reading aids for authored audit guidance only. Never pass original quotations,
// source records, evidence snapshots or personal questions through these helpers.
const preparationNotes = [
  'Alle ketens en toetsen zijn auteursvoorstel/HOLD; geen eigen review, toelating of juridische eindclaim.',
  'Vragen en pakketbrede eindreviews volgen afzonderlijk; geen integratie en geen roottrackingmutatie.',
];

export const auditAspectInstruction = 'Bevat een toetspunt meerdere aspecten? Leg de uitkomst per aspect vast en benoem wat ontbreekt of niet beoordeelbaar is.';

export function auditReadingText(text = '') {
  return text.replace(/\bartikel(?=\d)/gu, 'artikel ')
    .replace(/\bbinnen(\d+)\((\d+)\)/gu, 'binnen het kader van artikel $1, lid $2');
}

export function currentAuditGuidance(text = '') {
  // Exact historical process sentences, not a filter for HOLD or legal limits.
  // Their original bytes remain in the source trace and workbook evidence.
  for (const note of preparationNotes) text = text.replaceAll(note, '');
  return text.replace(/[ \t]+\n/gu, '\n').replace(/\n{3,}/gu, '\n\n').trim();
}

/** @template {{text:string}} T @param {T[]} items @returns {T[]} */
export function distinctAuditLimitations(items) {
  const seen = new Set();
  return items.filter(item => {
    if (seen.has(item.text)) return false;
    seen.add(item.text);
    return true;
  });
}

export function sourceSnapshotStatus(context) {
  return {
    date: context.effective_from || 'Geen ingangsdatum vastgelegd in dit bronpakket',
    asOf: context.as_of ? `Peildatum bronpakket: ${context.as_of}` : 'Peildatum niet vastgelegd',
    qualification: context.status === 'UNKNOWN'
      ? 'De actuele bronstatus is niet bevestigd. Een vermelde datum bepaalt niet of het kader op jouw organisatie van toepassing is.'
      : 'Beoordeel afzonderlijk of dit kader op jouw organisatie en onderzoeksperiode van toepassing is.',
  };
}
