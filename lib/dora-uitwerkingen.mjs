// Welke uitvoeringsregelingen een groep uit DORA uitwerken (#312). Elke koppeling volgt het
// bevoegdheidsartikel in DORA zelf (Verordening (EU) 2022/2554), niet een eigen inschatting.
// De groepstitels zijn die van het DORA-kader in Omnibus.
const RTS_ICT = {id: 'DORA-2024-1774', label: 'RTS ICT-risicobeheer (2024/1774)'};
const ICT_RISICO = [{...RTS_ICT, grondslag: 'artikel 15'}];

export const doraUitwerkingen = {
  'DORA-2022-2554': {
    'Bestuur en ICT-risicobeheerkader': ICT_RISICO,
    'ICT-middelen, afhankelijkheden en risicoanalyse': ICT_RISICO,
    'Bescherming, preventie en detectie': ICT_RISICO,
    'Continuïteit, back-ups en herstel': ICT_RISICO,
    'Leren, opleiding en crisiscommunicatie': ICT_RISICO,
    'Vereenvoudigd ICT-risicobeheerkader': [{...RTS_ICT, grondslag: 'artikel 16, lid 3'}],
    'Incidentbeheer, classificatie en rapportage': [
      {id: 'DORA-2024-1772', label: 'RTS incidentclassificatie (2024/1772)', grondslag: 'artikel 18, lid 3'},
      {id: 'DORA-2025-301', label: 'RTS meldinhoud en termijnen (2025/301)', grondslag: 'artikel 20, eerste alinea, onder a'},
      {id: 'DORA-2025-302', label: 'ITS incidentrapportage (2025/302)', grondslag: 'artikel 20, eerste alinea, onder b'},
      {id: 'DORA-INCIDENT-COSTS-GL34', label: 'Richtsnoeren incidentkosten en verliezen', grondslag: 'artikel 11, lid 11'},
    ],
    'Dreigingsgestuurde penetratietests (TLPT)': [
      {id: 'DORA-2025-1190', label: 'RTS dreigingsgestuurde penetratietests (2025/1190)', grondslag: 'artikel 26, lid 11'},
    ],
    'ICT-dienstverleners, contracten en exit': [
      {id: 'DORA-2024-1773', label: 'RTS beleid voor derden-ICT-diensten (2024/1773)', grondslag: 'artikel 28, lid 10'},
      {id: 'DORA-2024-2956', label: 'ITS informatieregister (2024/2956)', grondslag: 'artikel 28, lid 9'},
      {id: 'DORA-2025-532', label: 'RTS onderaanneming (2025/532)', grondslag: 'artikel 30, lid 5'},
    ],
  },
};

/** De uitvoeringsregelingen bij een groep van een kader, of een lege lijst. */
export function uitwerkingenBijGroep(sourceId, groepTitel) {
  return doraUitwerkingen[sourceId]?.[groepTitel] ?? [];
}

/** Andersom: bij een uitvoeringsregeling de DORA-groepen die zij uitwerkt, met het artikel. */
export function uitgewerktVanuit(uitwerkingId) {
  const uit = [];
  for (const [sourceId, groepen] of Object.entries(doraUitwerkingen))
    for (const [groep, lijst] of Object.entries(groepen))
      for (const u of lijst) if (u.id === uitwerkingId) uit.push({sourceId, groep, grondslag: u.grondslag});
  return uit;
}
