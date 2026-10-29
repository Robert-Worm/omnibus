// Editorial research-design aids, not an official IIA classification of engagements.
import {renderReviewedDirectionQuestion} from './research-direction-review.mjs';
// Meanings follow the user's supplied source excerpt (11 September 2026).
// Bibliographic details are not supplied; do not attribute these five directions to IIA.
// Advice can be a question; it is not a separate mode.
// An assignment often contains two directions at once ("waarom gebeurt dit en
// wat moeten we eraan doen"). The five are mutually exclusive, so choosing one
// leaves something out. 'boundary' names what that is and where it belongs, so
// the auditor can take that difference back to the assignment giver instead of
// discovering it at delivery.
export const researchDirections = [
  { id: "signaling", label: "Probleemsignalerend", aim: "Is er een probleem, hoe groot is het en wie raakt het?",
    boundary: "Dit stelt vast \u00f3f er een probleem is en hoe groot. Verklaren waardoor het ontstaat is diagnostisch onderzoek; leg vast of dat binnen deze opdracht valt." },
  { id: "diagnostic", label: "Diagnostisch", aim: "Waardoor ontstaat het probleem en waar kan verbetering beginnen?",
    boundary: "Dit verklaart oorzaken. Beoordelen of een voorgestelde maatregel het probleem verhelpt is ontwerpgericht onderzoek; leg vast of dat binnen deze opdracht valt." },
  { id: "design", label: "Ontwerpgericht", aim: "Kan de voorgestelde oplossing het probleem oplossen?",
    boundary: "Dit beoordeelt een voorstel vooraf. Of de invoering slaagt is veranderingsgericht onderzoek en of de doelen zijn bereikt evaluatiegericht; leg vast of dat binnen deze opdracht valt." },
  { id: "change", label: "Veranderingsgericht", aim: "Verloopt de invoering volgens plan en evenwichtig?",
    boundary: "Dit volgt de invoering. Of de beoogde doelen uiteindelijk zijn bereikt is evaluatiegericht onderzoek; leg vast of dat binnen deze opdracht valt." },
  { id: "evaluative", label: "Evaluatiegericht", aim: "Zijn de doelen bereikt en is het probleem opgelost?",
    boundary: "Dit beoordeelt achteraf of doelen zijn bereikt. Verklaren waardoor een resultaat uitbleef is diagnostisch onderzoek; leg vast of dat binnen deze opdracht valt." },
];
export const directionBoundary = id => researchDirections.find(d => d.id === id)?.boundary || "";
export const directionLabel = id => researchDirections.find(d => d.id === id)?.label || "";

// The goal already records what the assignment giver must be able to do with the
// answer. A question that names only the subject leaves that decision out of
// view. What the answer has to deliver differs per direction, so the wording
// does too. This is an aid for formulating, not a judgement about the question.
const intendedUseBridges = {
  signaling: "welke bevindingen zijn nodig om",
  diagnostic: "welke bevindingen zijn van belang om",
  design: "welk oordeel over het voorstel is nodig om",
  change: "welke signalen uit de invoering zijn van belang om",
  evaluative: "welke uitkomsten zijn van belang om",
};
export function intendedUseTemplate(text, direction) {
  const bridge = intendedUseBridges[direction];
  const stem = String(text || '').trim().replace(/\?+$/u, '').trim();
  return bridge && stem ? `${stem}, en ${bridge} {{gebruik}}?` : '';
}
/** @param {string} text @param {string} direction @param {string} intendedUse */
export function intendedUseQuestion(text, direction, intendedUse, context = {}) {
  const bridge = intendedUseBridges[direction];
  const use = String(intendedUse || "").trim().replace(/[.!?]+$/u, "").trim();
  const stem = String(text || "").trim().replace(/\?+$/u, "").trim();
  if (!bridge || !use || !stem) return "";
  const values = {onderwerp:context.topic,gebruik:use};
  if (!context.questionTemplate || renderReviewedDirectionQuestion(context.questionTemplate,values) !== text) return '';
  return renderReviewedDirectionQuestion(intendedUseTemplate(context.questionTemplate,direction),values);
}
export const isProposalSubject = topic => /^(?:het|de|een) (?:(?:voorgestelde|beoogde)\s+|(?:[\p{L}-]*plan|voorstel|ontwerp|oplossing|raamovereenkomst)\b)/iu.test(topic);

import { refineDirectionPlan } from './research-approach.mjs';

// Wat elke richting van het bewijs vraagt. Deze zinnen stonden alleen in het
// plan en bereikten daardoor geen scherm; ze horen bij de keuze zelf, dus ze
// staan hier los en worden van daaruit in het plan gezet.
export const directionApproaches = {
  signaling: "Vergelijk verwachtingen met dossiers, gegevens en ervaringen. Stel eerst vast of en waar een knelpunt bestaat.",
  diagnostic: "Onderzoek meerdere verklaringen. Vergelijk situaties met en zonder het knelpunt; een vermoeden of interviewantwoord is nog geen bewezen oorzaak.",
  design: "Beoordeel een bestaand voorstel aan het probleem, de eisen en een scenario of praktijktest. Maak aannames en ontbrekende onderdelen zichtbaar; verwachte effecten zijn nog geen bereikte effecten. De organisatie blijft eigenaar van ontwerp en besluit.",
  change: "Vergelijk de invoering met planning en afspraken. Onderzoek ook samenhang, belasting en ervaringen van betrokkenen; alleen tijdige mijlpalen bewijzen geen evenwichtig verloop. De organisatie stuurt de invoering.",
  evaluative: "Beoordeel bereikte resultaten, niet alleen uitgevoerde activiteiten of naleving. Leg periode, uitgangssituatie en beoordelingscriteria vast; onderzoek andere verklaringen en onbedoelde gevolgen voordat u effecten aan de aanpak toeschrijft."
};
/** @param {string} id */
export const directionApproach = (id) => directionApproaches[id] || '';

// A design study that builds on established causes presupposes that such a study
// has been done. Where that is not the case, adopting the question promises a
// conclusion no earlier work supports. The remark follows the wording rather
// than a position in the list, because breadth and lens rewrite the questions.
const questionPresumption = text => /onderbouwde oorzaken/iu.test(text)
  ? 'Veronderstelt dat de oorzaken al zijn onderbouwd. Is dat niet gebeurd, dan hoort daar eerst diagnostisch onderzoek bij.'
  : '';
/** @param {{breadth?:string,lens?:string}} [researchApproach] */
export function directionPlan(direction, topic, researchApproach = undefined) {
  if (!directionLabel(direction) || !topic?.trim()) return null;
  const subject = topic.trim(), template = directionPlanTemplate(direction, {
    proposal:isProposalSubject(subject),
    change:/^(?:de |het )?(?:invoering|implementatie|overstap|uitrol)\b/iu.test(subject),
  }, researchApproach);
  const render = text => renderReviewedDirectionQuestion(text,{onderwerp:subject});
  const text=render(template.text), questions=template.questions.map(render), advice=render(template.advice.text);
  if (!text || questions.some(q=>!q) || !advice) return null;
  return {...template,topic:subject,text,questionTemplate:template.text,reviewedDirectionTemplate:true,
    questions,advice:{...template.advice,text:advice},
    subquestions:template.subquestions.map((q,i)=>({...q,text:questions[i]}))};
}

// Inventory the authored template separately from personal subject text. The
// same projection supplies the picker and the question menu; no saved text enters here.
export function directionPlanTemplate(direction, subjectKind = {}, researchApproach = undefined) {
  if (!directionLabel(direction)) return null;
  const t = '{{onderwerp}}';
  const plans = {
    signaling: {
      text: `Welke knelpunten doen zich eventueel voor bij ${t}, hoe groot zijn ze en wie ondervindt de gevolgen?`,
      questions: [
        "Welke verwachtingen, afspraken en eisen gelden?",
        "Waar wijkt de praktijk af, hoe groot is het verschil en hoe vaak komt het voor?",
        "Wie ondervindt gevolgen en wie is verantwoordelijk voor de aanpak?",
      ],
      approach: directionApproaches.signaling,
    },
    diagnostic: {
      text: `Hoe zijn de knelpunten bij ${t} te verklaren?`,
      questions: [
        "Welke knelpunten zijn aantoonbaar, en waar en wanneer treden ze op?",
        "Welke oorzaken noemen betrokkenen en welke andere verklaringen zijn mogelijk?",
        "Welke verklaringen ondersteunt of weerlegt het bewijs?",
      ],
      approach: directionApproaches.diagnostic,
    },
    design: {
      text: subjectKind.proposal
        ? `In hoeverre biedt ${t} een passende oplossing voor het beoogde probleem?`
        : `Kan de voorgestelde oplossing het probleem bij ${t} verhelpen?`,
      questions: [
        "Welk probleem moet de oplossing verhelpen en welke eisen gelden?",
        "Hoe pakt de oplossing de onderbouwde oorzaken aan en welke aannames gelden?",
        "In hoeverre houdt het ontwerp rekening met de relevante randvoorwaarden, betrokkenen en risico’s?",
      ],
      approach: directionApproaches.design,
    },
    change: {
      text: subjectKind.change
        ? `Verloopt ${t} volgens plan en evenwichtig?`
        : `Verloopt de invoering bij ${t} volgens plan en evenwichtig?`,
      questions: [
        "Welke planning, mijlpalen en afspraken gelden voor de invoering?",
        "Hoe verloopt de voortgang en hoe worden afwijkingen aangepakt?",
        "Passen de stappen bij elkaar, de beschikbare middelen en de gevolgen voor betrokkenen?",
      ],
      approach: directionApproaches.change,
    },
    evaluative: {
      text: `In hoeverre zijn de beoogde doelen bij ${t} bereikt?`,
      questions: [
        "Welke doelen waren beoogd en wat was de uitgangssituatie?",
        "Welke doelen zijn bereikt en in hoeverre is het oorspronkelijke probleem opgelost?",
        "Wat heeft de aanpak bijgedragen en welke andere verklaringen zijn aannemelijk?",
      ],
      approach: directionApproaches.evaluative,
    },
  };
  const plan = refineDirectionPlan(plans[direction], direction, t, researchApproach, subjectKind);
  return { ...plan, direction, topic: t,
    subquestions: plan.questions.map((text, i) => ({ key: `direction:${direction}:${i}`, text, ids: [],
      ...(questionPresumption(text) ? { hint: questionPresumption(text) } : {}) })),
    advice: { key: `direction:${direction}:advice`, text: direction === "diagnostic" && researchApproach?.lens === 'descriptive'
      ? 'Welk nader onderzoek is aan te bevelen op basis van de aangetroffen patronen?'
      : direction === "diagnostic"
      ? "Welke verbeteringen zijn aan te bevelen op basis van de onderbouwde oorzaken?"
      : direction === "design" ? "Welke aanpassingen aan het voorstel zijn aan te bevelen op basis van de ontwerpbeoordeling?"
      : direction === "change" ? "Welke aanpassingen in de invoering zijn aan te bevelen op basis van het onderzoek?"
      : "Welke verbeteringen zijn aan te bevelen op basis van de onderzoeksbevindingen?", ids: [] },
  };
}
