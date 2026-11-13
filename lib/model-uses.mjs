// Waar een onderzoeksmodel bij helpt, als vaste indeling met één symbool per doel (besluit B-050).
// Redactioneel voorstel op basis van de keuzehulp bij elk model; het is een zoekhulp en zegt niet dat het model bij een bepaalde audit past.

/** De vaste volgorde is ook de volgorde van de symbolen. */
export const modelUses = {
  gedrag: {label: 'Gedrag begrijpen', description: 'Waarom mensen doen wat ze doen, en wat ze daarvoor nodig hebben.'},
  cultuur: {label: 'Cultuur en waarden', description: 'Hoe mensen samenwerken, informatie delen en afwegingen maken.'},
  veiligheid: {label: 'Leren en veilig melden', description: 'Of mensen zich durven uitspreken en of de organisatie van signalen leert.'},
  integriteit: {label: 'Integriteit en fraude', description: 'Wat integer handelen helpt of onder druk zet.'},
  risico: {label: 'Risico’s en betrouwbaarheid', description: 'Hoe maatregelen samen beschermen en waar kwetsbaarheden zitten.'},
  verandering: {label: 'Verandering begeleiden', description: 'Wat nodig is om een verandering te laten slagen en vast te houden.'},
  dienstverlening: {label: 'Kwaliteit van dienstverlening', description: 'Wat afnemers verwachten en hoe de organisatie daarop inspeelt.'},
  sturing: {label: 'Sturing en organisatie', description: 'Hoe doelen, processen en inrichting op elkaar aansluiten.'},
};

const uses = {
  KAD: ['dienstverlening', 'sturing'], SERVQUAL: ['dienstverlening'],
  WESTRUM: ['cultuur'], CVF: ['cultuur', 'sturing'], 'CEV-AI': ['integriteit', 'cultuur'], L01: ['integriteit', 'cultuur'],
  'JUST-CULTURE': ['veiligheid', 'cultuur'], EDMONDSON: ['veiligheid'],
  HRO: ['risico', 'veiligheid'], 'FRAUD-DIAMOND': ['integriteit', 'risico'], 'SWISS-CHEESE': ['risico'],
  KOTTER: ['verandering'], 'COM-B': ['gedrag', 'verandering'], ADKAR: ['verandering', 'gedrag'],
};

/** De doelen van een model, in vaste volgorde. Onbekend geeft een lege lijst. */
export function modelUsesOf(id = '') {
  const own = uses[id] || [];
  return Object.keys(modelUses).filter(use => own.includes(use));
}
export const classifiedModelIds = Object.keys(uses);
