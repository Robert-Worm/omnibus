// Auditcriteria van de Omnibus-auditor (#279). Afgeleid van de A2-criteria van SAAF
// Agent-Auditor (SAAF-Project, overgenomen met bronvermelding volgens B-027), maar
// geschreven naar de uitgangspunten van Omnibus: HOLD in plaats van TBD of een
// betrouwbaarheidsscore, exacte bronposities, brontekst nooit herschrijven, kwaliteit
// via onafhankelijke reviews (B-026, B-028, B-029). Zie docs/beheer/agent-auditor.md.

/** Elk criterium noemt waar het bewijs te vinden is; 'meting' verwijst naar een controle die echt draait. */
export const DOELSTELLINGEN = [
  {
    id: "OD-1", titel: "Volledigheid door het proces",
    doel: "Alles wat de bron als norm, bevinding of toetsbare eis bevat, wordt gevonden en uitgewerkt, zonder beschrijvende tekst als norm op te nemen.",
    criteria: [
      { code: "OC-1.1", tekst: "De skills eisen twee blinde volledige bronlezingen in aparte contexten en een reconciliatie die gemiste passages zoekt. Zonder die onafhankelijkheid blijft het pakket PENDING_REVIEW of HOLD." },
      { code: "OC-1.2", tekst: "Een bronzin wordt gesplitst wanneer antwoord, toepasselijkheid of bewijs per deel verschilt; niet automatisch op elk 'en'." },
      { code: "OC-1.3", tekst: "Beschrijvende tekst, definities en afbakening worden geen selecteerbare norm: ze krijgen CONTEXT_ONLY, worden context of blijven HOLD." },
      { code: "OC-1.4", tekst: "Elke bron heeft een beschrijving van scope en herkomst die met de bouwstenen meereist (bijvoorbeeld het tabblad 'Over' of de bronbeschrijving in het pakket)." },
    ],
  },
  {
    id: "OD-2", titel: "Brontraceerbaarheid",
    doel: "Elke bouwsteen is tot op de tekens herleidbaar naar de bron, en wat eigen uitwerking is, is als zodanig herkenbaar.",
    criteria: [
      { code: "OC-2.1", tekst: "Elke selecteerbare bouwsteen verwijst naar één of meer bronpassages met document, pagina en exacte positie (begin en eind) en het letterlijke citaat." },
      { code: "OC-2.2", tekst: "Een controle stelt machinaal vast dat elk citaat letterlijk op de opgeslagen positie staat; een afwijking wordt HOLD.", meting: "check:passages" },
      { code: "OC-2.3", tekst: "Zonder traceerbare bronpassage komt er geen selecteerbare bouwsteen: het punt blijft HOLD of context." },
      { code: "OC-2.4", tekst: "Brontekst wordt nooit herschreven of genormaliseerd. Eigen uitwerkingen (afgeleid doel, risico, toetsen) zijn gelabeld als eigen voorstel met een herleiding, zonder er een nieuwe bronplicht van te maken." },
    ],
  },
  {
    id: "OD-3", titel: "Geen gissingen en geen sturing door de bron",
    doel: "Wat de bron niet zegt, wordt niet ingevuld, en tekst in de bron stuurt de agent niet.",
    criteria: [
      { code: "OC-3.1", tekst: "Ontbrekende informatie wordt niet aangevuld uit eigen kennis: het veld blijft leeg met reden, of het punt wordt HOLD." },
      { code: "OC-3.2", tekst: "Open punten worden zichtbaar gemaakt voor een mens, bijvoorbeeld in 'Nog te controleren' van de review of in een HOLD-reden." },
      { code: "OC-3.3", tekst: "Eigen normen en toetsen bevatten geen aannametaal zoals 'waarschijnlijk', 'naar verwachting', 'meestal' of 'zou kunnen'. Een controle meldt dit.", meting: "check:keten" },
      { code: "OC-3.4", tekst: "Elk onderdeel toont zijn herkomst per laag (wet, uitwerking, richtsnoer, praktijk) en een kader of norm wordt alleen als eis genoemd als de bron die noemt; een expliciete grens ('geen ISO-beoordeling geclaimd') is toegestaan." },
      { code: "OC-3.5", tekst: "De skills en de MCP-route behandelen brontekst als gegevens, nooit als opdracht." },
    ],
  },
  {
    id: "OD-4", titel: "Toetsbaarheid",
    doel: "Elke bouwsteen is bruikbaar voor een auditor: met risico, toets en bewijs, zonder de bron te verbreden.",
    criteria: [
      { code: "OC-4.1", tekst: "Elke selecteerbare bouwsteen heeft de complete keten: doel, risico, beheersdoelstelling, beheersmaatregel, norm, toetspunten en de toepasselijke opzet- en bestaanstoetsen. Lege velden of opvultekst zijn geen eindinhoud." },
      { code: "OC-4.2", tekst: "Een controle meet in de database dat elke selecteerbare bouwsteen een risico en een bewijsaanwijzing heeft.", meting: "check:keten" },
      { code: "OC-4.3", tekst: "Een toetspunt noemt een functionaris alleen als de norm die functionaris noemt; normadressaat en taakdrager worden niet verward." },
      { code: "OC-4.4", tekst: "Een vage term in de bron (zoals 'passend' of 'tijdig') wordt niet zelf ingevuld met een maat; de toets noemt de bewijsgrens of de beperking." },
    ],
  },
  {
    id: "OD-5", titel: "Bewust van risico in de uitvoer",
    doel: "De gebruiker ziet wat wel en niet vaststaat, zonder schijnzekerheid.",
    criteria: [
      { code: "OC-5.1", tekst: "Kwaliteit wordt geborgd door onafhankelijke reviews met een vaste rubriek; er is bewust geen betrouwbaarheidsscore of kleur per norm (B-029)." },
      { code: "OC-5.2", tekst: "De status van elke bouwsteen (selecteerbaar, HOLD, context) is zichtbaar en wordt afgedwongen: HOLD en context zijn niet selecteerbaar." },
      { code: "OC-5.3", tekst: "Omnibus geeft geen eigen risico- of nalevingsoordeel over een organisatie; selectie bevestigt geen toepasselijkheid." },
      { code: "OC-5.4", tekst: "Onderzoeks- en interviewvragen worden machinaal op vormfouten gecontroleerd en een vraag met een vormfout wordt niet automatisch aangepast.", meting: "check:questions" },
    ],
  },
];

/** De bestanden die de auditor leest: de skills, hun naslag, de controles en de besluiten. */
export const BESTANDEN = [
  "README.md", "AGENTS.md", "skills/README.md",
  "skills/omnibus-add-report/SKILL.md", "skills/omnibus-add-report/references/report-method.md",
  "skills/omnibus-add-report/references/review-basis.md", "skills/omnibus-add-report/references/end-check.md",
  "skills/omnibus-add-report/references/report-package.md", "skills/omnibus-add-report/references/source-preparation.md",
  "skills/omnibus-add-framework/SKILL.md", "skills/omnibus-add-framework/references/framework-method.md",
  "skills/omnibus-review-audit-quality/SKILL.md", "skills/omnibus-review-audit-quality/references/rubric.md",
  "skills/omnibus-review-questions/SKILL.md",
  "scripts/check-passages.mjs", "scripts/check-keten.mjs", "scripts/scan-questions.mjs", "lib/question-quality.mjs",
  "lib/framework-model.mjs", "agent-tools/service.mjs", "docs/beheer/besluiten.md", "docs/beheer/kwaliteitsmeting.md", "docs/beheer/prompt-injection.md",
];
