// De vaste set taalregels voor de documentatie (B1), gebruikt door scripts/check-docs.mjs (#203).
// Elke regel heeft een fout en een goed voorbeeld, en verwijst naar de plek in de stijlgids
// (docs/bijdragen/stijlgids.md) waar hij wordt uitgelegd. Voeg alleen een regel toe die je met
// een voorbeeld kunt toetsen. Voorbeeld voor deze opzet: talkstream/ru-text (MIT).
//
// Dit zijn waarschuwingen: ze laten de documentatiecheck niet mislukken.

const VAST = "stijlgids, Vaste woorden";
const MOEILIJK = "stijlgids, Moeilijke woorden";
const VERMIJDEN = "stijlgids, Te vermijden";

export const TAALREGELS = [
  { id: "projectcode", patroon: /\bEP\d{2}(?:-S\d{2})?\b/g, alternatief: "interne projectcode; noem wat er bedoeld wordt", soort: "code", bron: VERMIJDEN,
    fout: "Dit staat in EP13-S01.", goed: "Dit staat in de epic over de online versie." },
  { id: "contractcode", patroon: /\bK\d{2}\b/g, alternatief: "code van een acceptatiecontract; noem wat er bedoeld wordt of link naar de afspraak", soort: "code", bron: VERMIJDEN,
    fout: "Volgens K06 mag dat niet.", goed: "Volgens de afspraak over misbruik mag dat niet." },
  { id: "workflow", patroon: /(?<!GitHub-)\bworkflows?\b/gi, alternatief: "werkwijze (of: GitHub-workflow)", bron: VERMIJDEN,
    fout: "Volg de workflow.", goed: "Volg de werkwijze. De GitHub-workflow draait vanzelf." },
  { id: "handoff", patroon: /\bhandoffs?\b/gi, alternatief: "overdracht", bron: VERMIJDEN,
    fout: "Na de handoff begint de beheerder.", goed: "Na de overdracht begint de beheerder." },
  { id: "deploy", patroon: /\bdeploy\w*/gi, alternatief: "online zetten of uitrollen", bron: VERMIJDEN,
    fout: "We deployen elke week.", goed: "We zetten elke week een nieuwe versie online." },
  { id: "fixture", patroon: /\bfixtures?\b/gi, alternatief: "testgegevens", bron: VAST,
    fout: "De test gebruikt een fixture.", goed: "De test gebruikt fictieve testgegevens." },
  { id: "evidence", patroon: /\bevidence\b/gi, alternatief: "bewijs", bron: VAST,
    fout: "Bewaar de evidence.", goed: "Bewaar het bewijs." },
  { id: "gate", patroon: /\bgates?\b/gi, alternatief: "controle", bron: VAST,
    fout: "De gate keurt het af.", goed: "De controle keurt het af." },
  { id: "maintainer", patroon: /\bmaintainers?\b/gi, alternatief: "beheerder", bron: VAST,
    fout: "Vraag het de maintainer.", goed: "Vraag het de beheerder." },
  { id: "integrator", patroon: /\bintegrator\b/gi, alternatief: "beheerder of ontwikkelaar", bron: VAST,
    fout: "De integrator neemt het over.", goed: "De beheerder neemt het over." },
  { id: "bundle", patroon: /\bbundles?\b/gi, alternatief: "pakket", bron: VAST,
    fout: "Lever de bundle in.", goed: "Lever het pakket in." },
  { id: "rollback", patroon: /\brollback\b/gi, alternatief: "terugzetten", bron: VERMIJDEN,
    fout: "Doe een rollback.", goed: "Zet de vorige versie terug." },
  { id: "kader-woord", patroon: /\b(?:toetsingskader|auditkader|onderzoekskader)s?\b/gi, alternatief: "referentiekader (het vaste woord in Omnibus)", bron: VAST,
    fout: "Maak een toetsingskader.", goed: "Maak een referentiekader." },
  { id: "middels", patroon: /\b(?:middels|door middel van)\b/gi, alternatief: "met of via", bron: MOEILIJK,
    fout: "Controleer middels het script.", goed: "Controleer met het script." },
  { id: "teneinde", patroon: /\bteneinde\b/gi, alternatief: "om", bron: MOEILIJK,
    fout: "Teneinde fouten te voorkomen, test je eerst.", goed: "Om fouten te voorkomen, test je eerst." },
  { id: "alsmede", patroon: /\balsmede\b/gi, alternatief: "en of ook", bron: MOEILIJK,
    fout: "De database alsmede de webbuild.", goed: "De database en de webbuild." },
  { id: "derhalve", patroon: /\b(?:derhalve|dientengevolge)\b/gi, alternatief: "daarom", bron: MOEILIJK,
    fout: "Derhalve stopt de controle.", goed: "Daarom stopt de controle." },
  { id: "indien", patroon: /\bindien\b/gi, alternatief: "als of wanneer", bron: MOEILIJK,
    fout: "Indien het mislukt, probeer opnieuw.", goed: "Als het mislukt, probeer het opnieuw." },
  { id: "dienen-te", patroon: /\bdien(?:t|en) te\b/gi, alternatief: "moet of moeten", bron: MOEILIJK,
    fout: "Je dient te controleren.", goed: "Je moet controleren." },
];
