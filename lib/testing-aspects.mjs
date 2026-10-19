export const testingAspects = [
  { id: "opzet", label: "Opzet", description: "Is de maatregel passend ontworpen?" },
  { id: "bestaan", label: "Bestaan", description: "Is de maatregel daadwerkelijk ingericht?" },
  {
    id: "werking",
    label: "Werking",
    description: "Werkt de maatregel gedurende de onderzoeksperiode?",
  },
];
// Export labels only. These profiles never change aspect IDs or test content.
// Design/operating effectiveness terminology: PCAOB AS 2201 .42-.45,
// https://pcaobus.org/oversight/standards/auditing-standards/details/AS2201
// Implementation remains a separate local aspect; this is not a universal
// equivalence between audit methods or a claim of compliance with AS 2201.
export const testingTerminologies = [
  { id: "obw", label: "Opzet / Bestaan / Werking (standaard)" },
  { id: "design-effectiveness", label: "Design effectiveness / Implementation / Operating effectiveness" },
];
export const testingTerminologyHelp = "Alleen de toetslabels veranderen; de inhoud wordt niet vertaald. Bestaan blijft apart als Implementation.";
export function validateTestingTerminology(value = "obw") {
  if (!testingTerminologies.some(profile => profile.id === value))
    throw Error("Onbekende terminologie voor toetsaspecten.");
  return value;
}
export function testingAspectLabel(id, terminology = "obw") {
  validateTestingTerminology(terminology);
  const aspect = testingAspects.find(aspect => aspect.id === id);
  if (!aspect) throw Error("Onbekend toetsaspect.");
  return terminology === "design-effectiveness"
    ? { opzet: "Design effectiveness", bestaan: "Implementation", werking: "Operating effectiveness" }[id]
    : aspect.label;
}
export function validateTestingAspects(value, required = false) {
  if (!Array.isArray(value) || value.some((id) => !testingAspects.some((a) => a.id === id)))
    throw Error("Ongeldige keuze voor opzet, bestaan of werking.");
  const selected = testingAspects.filter((a) => value.includes(a.id)).map((a) => a.id);
  if (required && !selected.length)
    throw Error("Kies minimaal één toetsaspect: opzet, bestaan of werking.");
  return selected;
}

// Planning proposals, not source requirements, sample-size rules or audit conclusions.
export function aspectTestPlan(aspect, title, procedure = "", documents = "") {
  if (!testingAspects.some((a) => a.id === aspect)) throw Error("Onbekend toetsaspect.");
  const plans = {
    opzet: {
      procedure:
        "Beoordeel of het ontwerp het criterium en risico afdekt: verantwoordelijkheden, werkwijze, frequentie en uitzonderingen. Leg ontwerpleemten vast.",
      documentation:
        "Actuele procedure of ontwerp, verantwoordelijkheden, risicoanalyse en vastgestelde beslisregels.",
    },
    bestaan: {
      procedure:
        "Leg de peildatum vast. Loop een concreet geval door en inspecteer feitelijke instellingen, rollen en vastlegging. Verifieer uitleg met documenten of waarneming.",
      documentation:
        "Peildatum, waargenomen instellingen of werkwijze, bevoegdheden en een concreet dossier met bewijs van inrichting.",
    },
    werking: {
      procedure:
        "Leg periode, gecontroleerde populatie en onderbouwde selectie of toetsmethode vast. Onderzoek uitvoering, afwijkingen en opvolging. Geen voorkomens betekent niet automatisch aantoonbare werking.",
      documentation:
        "Onderzoeksperiode, onderbouwde populatie en selectie, uitvoeringsregistraties, afwijkingen en opvolgbewijs.",
    },
  };
  const plan = plans[aspect];
  return {
    procedure:
      "Toetsvoorstel: " +
      plan.procedure +
      (procedure.trim() ? "\n\nInhoudelijke aandachtspunten:\n" + procedure : ""),
    documentation:
      plan.documentation + (documents.trim() ? "\n\nBij dit criterium:\n" + documents : ""),
  };
}
