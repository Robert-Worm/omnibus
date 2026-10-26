// Backlog: één manier om rapporten te vinden en te claimen. Afgesproken met de beheerder op
// 26 oktober 2026. Aanleiding: de 542 aanbevolen ADR-rapporten zijn te claimen, maar de overige
// 9.116 rapporten staan alleen in een CSV-bestand zonder werkende claimlink en zonder auteur.

const dod = [
  "**Klaar wanneer**",
  "- Alle user stories hieronder zijn afgerond.",
  "- Elk openbaar rapport is op dezelfde manier te vinden en te claimen.",
  "- De voortgang en de documentatie beschrijven alleen wat er werkelijk is.",
].join("\n");

export default {
  id: "werklijst-2026-10",
  labels: ["routekaart"],
  epics: [
    {
      id: "EP-W1",
      titel: "Werklijst: elk rapport vinden, beoordelen en claimen op één manier",
      onderdeel: "Werklijst",
      doel: "Een bijdrager vindt een geschikt rapport op auteur, soort en ministerie, ziet of het geschikt is, en claimt het met dezelfde knop als de aanbevolen rapporten. Nieuwe rapporten kunnen worden voorgesteld.",
      dod,
      stories: [
        { id: "W1-1", titel: "Alle rapporten in bladerbare werklijsten met claimlink",
          verhaal: "Als bijdrager wil ik alle rapporten kunnen bekijken en claimen zoals de aanbevolen rapporten, zodat ik niet in een CSV-bestand hoef te zoeken.",
          bron: "Vraag van de beheerder (26 oktober 2026): de knop *Claimen* werkt bij de 542 aanbevolen rapporten, maar niet bij de rest. Het CSV-bestand toont op GitHub geen klikbare links.",
          waar: ["`.github/scripts/voortgang-lib.mjs`: de gegenereerde werklijsten", "`docs/bijdragen/voortgang.md` en `docs/bijdragen/README.md`"],
          aanpak: ["Eén overzichtspagina *Alle rapporten*, met per groep een eigen pagina: Auditdienst Rijk, Algemene Rekenkamer, inspecties en toezichthouders, overige onderzoeken", "Grote groepen per ministerie opgesplitst, zodat elke pagina snel laadt", "Dezelfde kolommen en claimknop als de aanbevolen werklijst", "Het CSV-bestand blijft, alleen als download"],
          criteria: ["Elk open, openbaar rapport heeft een werkende claimlink op een werklijstpagina", "Geen pagina is te groot voor GitHub om te tonen", "De voortgang verwijst naar *Alle rapporten* in plaats van naar het CSV-bestand", "Bestaande claimlinks en de claimbot werken ongewijzigd"],
          labels: ["Opus 5.5", "P2", "klaar"] },
        { id: "W1-2", titel: "Auteur zichtbaar in alle werklijsten",
          verhaal: "Als bijdrager wil ik zien wie een rapport schreef, zodat ik weet of het een audit, inspectie of evaluatie is.",
          bron: "De bronlijst `.github/voortgang/rapporten.csv` heeft al een kolom `auteur` (2.251 verschillende auteurs, 137 leeg), maar die komt in geen werklijst.",
          waar: ["`.github/scripts/voortgang-lib.mjs`", "`docs/bijdragen/werklijst-rapporten.csv`"],
          aanpak: ["Toon de auteur onder de titel, net als de datum", "Voeg de kolom `auteur` toe aan het CSV-bestand", "Lege auteur: *onbekend*"],
          criteria: ["De auteur staat in elke werklijst en in het CSV-bestand", "Zoeken op auteur werkt met Ctrl+F"],
          labels: ["Opus 5.5", "P2", "klaar"] },
        { id: "W1-3", titel: "Geschikt voor Omnibus: een filter op de werklijst",
          verhaal: "Als bijdrager wil ik alleen rapporten zien die normen of toetsbare bevindingen bevatten, zodat ik geen tijd steek in een rapport dat niets oplevert.",
          bron: "Niet alle 9.116 rapporten passen bij Omnibus, bijvoorbeeld ramingen of beleidsverkenningen zonder normenkader. Nu is alleen *aanbevolen* een filter, en dat geldt alleen voor de Auditdienst Rijk.",
          waar: ["`.github/voortgang/rapporten.csv` of een apart bestand met beoordelingen", "`.github/scripts/voortgang-lib.mjs`", "`docs/beheer/besluiten.md`: de criteria"],
          aanpak: ["De beheerder legt de criteria vast in een besluit: wanneer is een rapport geschikt?", "Een AI beoordeelt per rapport titel, auteur en samenvatting: geschikt, niet geschikt of twijfel, met een korte reden", "Werklijsten tonen standaard geschikt en twijfel; niet geschikt staat apart"],
          criteria: ["Elk rapport heeft een beoordeling met reden", "Een steekproef van 50 beoordelingen is door de beheerder nagelopen", "Een bijdrager kan een beoordeling betwisten via de claim of Discussions"],
          niet: ["Een rapport stil verwijderen; niet geschikt blijft vindbaar"],
          labels: ["ChatGPT Astra", "Opus 5.5", "P3", "klaar"] },
        { id: "W1-4", titel: "Een rapport voorstellen dat nog niet in de lijst staat",
          verhaal: "Als bijdrager wil ik een openbaar rapport voorstellen dat niet op de Rijksmap staat, zodat het na akkoord van de beheerder te claimen is zoals elk ander rapport.",
          bron: "Vraag van de beheerder (26 oktober 2026). Nu zegt de claimbot alleen ‘stel het voor in Discussions’; daarna gebeurt er niets vast.",
          waar: ["`.github/ISSUE_TEMPLATE/`: een formulier *Rapport voorstellen*", "`.github/voortgang/`: een lijst met toegevoegde rapporten", "`.github/scripts/voortgang-lib.mjs`: herkennen en tonen"],
          aanpak: ["Formulier met link naar de openbare publicatie, titel, auteur, datum en waarom het geschikt is", "De beheerder keurt goed met een label; de bot zet het rapport in de lijst en antwoordt met de claimlink", "Afgewezen of niet openbaar: de bot zegt waarom"],
          criteria: ["Een goedgekeurd voorstel staat in de werklijst, met dezelfde claimknop", "De claimbot herkent een claim op een voorgesteld rapport", "Niet-openbare rapporten worden niet opgenomen"],
          labels: ["Opus 5.5", "P3", "klaar"] },
      ],
    },
  ],
};
