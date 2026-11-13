// Bij welk ministerie een bronrapport is onderzocht. Afgeleid uit de reikwijdte die het rapport zelf noemt;
// het is oriëntatie voor de lijst van thema's en processen en geen officiële indeling (besluit B-049).
// "RIJK" staat voor een onderzoek bij meerdere departementen of rijksbreed.

export const organisations = {
  RIJK: {label: 'Rijksbreed', name: 'Rijksbreed of meerdere departementen'},
  AZ: {label: 'AZ', name: 'Ministerie van Algemene Zaken'},
  BZ: {label: 'BZ', name: 'Ministerie van Buitenlandse Zaken'},
  BZK: {label: 'BZK', name: 'Ministerie van Binnenlandse Zaken en Koninkrijksrelaties'},
  DEF: {label: 'DEF', name: 'Ministerie van Defensie'},
  EZ: {label: 'EZ', name: 'Ministerie van Economische Zaken'},
  FIN: {label: 'FIN', name: 'Ministerie van Financiën'},
  IenW: {label: 'IenW', name: 'Ministerie van Infrastructuur en Waterstaat'},
  JenV: {label: 'JenV', name: 'Ministerie van Justitie en Veiligheid'},
  LVVN: {label: 'LVVN', name: 'Ministerie van Landbouw, Visserij, Voedselzekerheid en Natuur'},
  OCW: {label: 'OCW', name: 'Ministerie van Onderwijs, Cultuur en Wetenschap'},
  SZW: {label: 'SZW', name: 'Ministerie van Sociale Zaken en Werkgelegenheid'},
  VWS: {label: 'VWS', name: 'Ministerie van Volksgezondheid, Welzijn en Sport'},
};

// Per rapport: het ministerie (of de ministeries) waaronder de onderzochte organisatie valt, en die organisatie zelf.
export const reportOrganisations = {
  OCW26: {ministries: ['OCW'], at: 'Ministerie van OCW'},
  M36526: {ministries: ['FIN'], at: 'Belastingdienst'},
  IENW26: {ministries: ['IenW'], at: 'Ministerie van IenW'},
  IHH26: {ministries: ['RIJK'], at: 'Zes rijksorganisaties'},
  LVVN26: {ministries: ['LVVN'], at: 'Ministerie van LVVN en RVO'},
  TOES26: {ministries: ['FIN'], at: 'Dienst Toeslagen en Belastingdienst'},
  DUUR25: {ministries: ['OCW'], at: 'Nationaal Archief, DUO en OCW'},
  ADV26: {ministries: ['LVVN'], at: 'Autoriteit Dierwaardige Veehouderij (in oprichting)'},
  CIOT25: {ministries: ['SZW'], at: 'Opsporingsdienst van de Nederlandse Arbeidsinspectie'},
  TEK25: {ministries: ['EZ'], at: 'TEK-regeling'},
  CLOUD25: {ministries: ['FIN'], at: 'Douane'},
  FRAUDE25: {ministries: ['RIJK'], at: 'Kerndepartementen'},
  ERP25: {ministries: ['RIJK'], at: 'Kerndepartementen'},
  IVHO25: {ministries: ['OCW'], at: 'Inspectie van het Onderwijs'},
  ILTRISK25: {ministries: ['IenW'], at: 'Inspectie Leefomgeving en Transport'},
  BOC25: {ministries: ['IenW'], at: 'Rijkswaterstaat'},
  DIGIINKOOP25: {ministries: ['RIJK'], at: 'Programma DigiInkoop en betrokken departementen'},
  BEGVOORB25: {ministries: ['RIJK'], at: 'Alle departementen'},
  HVP25: {ministries: ['RIJK'], at: 'Herstel- en Veerkrachtplan, meerdere departementen'},
  BSA2324: {ministries: ['RIJK'], at: 'O&P Rijk en deelnemende rijksorganisaties'},
  F35V25: {ministries: ['DEF', 'EZ'], at: 'Ministerie van Defensie, met Economische Zaken'},
  CIBGBIO24: {ministries: ['VWS'], at: 'CIBG'},
  UVB25: {ministries: ['JenV'], at: 'Unit Vitale Belangen (NCTV)'},
  SKAL25: {ministries: ['LVVN'], at: 'Skal Biocontrole'},
  VIM25: {ministries: ['RIJK'], at: 'Programma VIM en deelnemende organisaties'},
  PROO26: {ministries: ['BZK'], at: 'Programma Open Overheid'},
  OCWCO224: {ministries: ['OCW'], at: 'Ministerie van OCW'},
};

/** Ministeries achter een reeks rapporten, het vaakst voorkomende eerst. Onbekende rapporten tellen niet mee. */
export function organisationsOf(reportIds = []) {
  const count = new Map();
  for (const id of reportIds) for (const m of reportOrganisations[id]?.ministries || []) count.set(m, [...(count.get(m) || []), id]);
  return [...count].map(([id, reports]) => ({id, ...organisations[id], reports}))
    .sort((a, b) => (a.id === 'RIJK' ? -1 : b.id === 'RIJK' ? 1 : b.reports.length - a.reports.length || a.label.localeCompare(b.label, 'nl')));
}
