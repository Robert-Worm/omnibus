import { directionLabel, isProposalSubject } from './research-directions.mjs';

// Own formulation aid based on the user's excerpt E2.3.3 Opstellen auditontwerp.
// A goal is not a research question. Never infer or replace either from legacy purpose text.
// Intended-use examples are our own wording, informed by local non-assurance reports:
// OCW26, p.7 sections 1.1–1.2 (steering and a baseline); IENW26, pp.6–7 section 2.3
// (improving execution and follow-up). They are optional, not quotes or IIA classifications.
// See ../../tmp/research-goal-practice-20260917/REVIEW.md for the source-to-design review.
export const goalTemplates = {
  signaling: { lead: 'Inzicht geven in de aanwezigheid, omvang en gevolgen van mogelijke problemen bij', uses: ['te bepalen welke knelpunten als eerste aandacht vragen', 'een startpunt te hebben om latere verbeteringen te volgen'] },
  diagnostic: { lead: 'Inzicht geven in de oorzaken van de knelpunten bij', uses: ['te bepalen welke belemmeringen moeten worden aangepakt', 'te kiezen hoe de werkwijze kan worden verbeterd'] },
  design: { lead: 'Inzicht geven in de mate waarin de voorgestelde oplossing het probleem kan verhelpen bij', uses: ['te besluiten over het voorstel en eventuele aanpassingen', 'te bepalen welke onderdelen van het voorstel nog uitwerking vragen'] },
  change: { lead: 'Inzicht geven in de voortgang en het evenwichtige verloop van de invoering bij', uses: ['te bepalen of bijsturing van de invoering nodig is', 'besluiten te nemen over het vervolg van de invoering'] },
  evaluative: { lead: 'Inzicht geven in de mate waarin de beoogde doelen zijn bereikt en het probleem is opgelost bij', uses: ['te besluiten over voortzetting of aanpassing van de aanpak', 'lessen te trekken voor een volgende aanpak'] },
};
export function validateResearchGoal(value) {
  if (value === undefined) return undefined;
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      typeof value.direction !== 'string' || (value.direction !== '' && !directionLabel(value.direction)) ||
      typeof value.subject !== 'string' || value.subject.length > 500 ||
      typeof value.intendedUse !== 'string' || value.intendedUse.length > 700)
    throw Error('Ongeldige onderzoeksdoelstelling.');
  return {direction: value.direction, subject: value.subject, intendedUse: value.intendedUse};
}
const phrase = value => value.trim().replace(/[.!?]+$/u, '').trim();

// Wording that every intended use carries ('te bepalen', 'te kiezen') says
// nothing about the subject, so it cannot show that the question and the use
// meet. Only the words that carry the subject count.
const useBoilerplate = new Set(['bepalen','kiezen','besluiten','hebben','worden','kunnen','moeten','welke','waarin','waarop','zodat','omdat','nodig','opdrachtgever','staat','stellen','eventueel','eventuele','latere','later','volgen','trekken','maken','geven','onderzoek','onderzoeken']);
const subjectWords = text => new Set(String(text || '').toLocaleLowerCase('nl')
  .split(/[^\p{L}]+/u).filter(word => word.length >= 5 && !useBoilerplate.has(word)));
// A soft check, never a verdict on the question: it reports only whether the
// central question repeats anything from what the assignment giver must be able
// to do. With nothing to compare it reports true, so no remark appears.
/** @param {string} question @param {string} intendedUse */
export function intendedUseEcho(question, intendedUse) {
  const asked = subjectWords(question), use = subjectWords(intendedUse);
  if (!asked.size || !use.size) return true;
  for (const word of use) if (asked.has(word)) return true;
  return false;
}
export function researchGoalText(value, preview = false) {
  const goal = validateResearchGoal(value);
  if (!goal || !goalTemplates[goal.direction]) return '';
  const subject = phrase(goal.subject), use = phrase(goal.intendedUse);
  if (!preview && (!subject || !use)) return '';
  const lead = goal.direction === 'change' && /^(?:de |het )?(?:invoering|implementatie|overstap|uitrol)\b/iu.test(subject)
    ? 'Inzicht geven in de voortgang en het evenwichtige verloop van'
    : goal.direction === 'design' && isProposalSubject(subject)
      ? 'Inzicht geven in de geschiktheid van' : goalTemplates[goal.direction].lead;
  return `${lead} ${subject || '[onderwerp]'}, ten einde de opdrachtgever in staat te stellen ${use || '[beoogd gebruik van de uitkomst]'}.`;
}
