// Herkomst van een onderzoeksmodel: wie het heeft gemaakt, wanneer het voor het eerst is gepubliceerd en wat voor soort
// model het is. Redactioneel voorstel (ingedeeld door een AI-assistent op basis van de bronvermelding bij elk model en
// algemeen bekende literatuur; nog te controleren door de beheerder). Het jaar is het jaar van de eerste publicatie over
// het model, niet van de uitgave die Omnibus gebruikt. De soort zegt iets over de herkomst, niet over de kwaliteit.

export const modelKinds = {
  wetenschappelijk: {label: 'Wetenschappelijk', description: 'Verschenen in wetenschappelijke literatuur en met onderzoek onderbouwd.'},
  bedrijfskundig: {label: 'Bedrijfskundig', description: 'Ontwikkeld in de praktijk, door adviseurs of een beroepsgroep. Veel gebruikt, minder wetenschappelijk getoetst.'},
};

const origins = {
  KAD: {authors: 'Hartog, Molenkamp & Otten', year: 1992, kind: 'bedrijfskundig'},
  SERVQUAL: {authors: 'Parasuraman, Zeithaml & Berry', year: 1985, kind: 'wetenschappelijk'},
  WESTRUM: {authors: 'Westrum', year: 1993, kind: 'wetenschappelijk'},
  CVF: {authors: 'Quinn & Rohrbaugh; Cameron & Quinn', year: 1983, kind: 'wetenschappelijk'},
  'CEV-AI': {authors: 'Kaptein', year: 2008, kind: 'wetenschappelijk'},
  L01: {authors: 'Kaptein', year: 2008, kind: 'wetenschappelijk'},
  'JUST-CULTURE': {authors: 'ATM Partners for Just Culture', year: 2018, kind: 'bedrijfskundig'},
  EDMONDSON: {authors: 'Edmondson', year: 1999, kind: 'wetenschappelijk'},
  HRO: {authors: 'Weick, Sutcliffe & Obstfeld; Vogus & Sutcliffe', year: 1999, kind: 'wetenschappelijk'},
  'FRAUD-DIAMOND': {authors: 'Wolfe & Hermanson', year: 2004, kind: 'bedrijfskundig'},
  'SWISS-CHEESE': {authors: 'Reason', year: 1990, kind: 'wetenschappelijk'},
  KOTTER: {authors: 'Kotter', year: 1995, kind: 'bedrijfskundig'},
  'COM-B': {authors: 'Michie, Van Stralen & West', year: 2011, kind: 'wetenschappelijk'},
  ADKAR: {authors: 'Hiatt (Prosci)', year: 2006, kind: 'bedrijfskundig'},
};

/** Herkomst van een model; onbekend geeft null, dan tonen we niets in plaats van te raden. */
export function modelOrigin(id = '') {
  const own = origins[id];
  return own ? {...own, kindLabel: modelKinds[own.kind].label, kindDescription: modelKinds[own.kind].description} : null;
}
export const originModelIds = Object.keys(origins);
