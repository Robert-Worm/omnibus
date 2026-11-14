// Taxonomie van processen bij de overheid: primair (het werk waarvoor de organisatie bestaat) en
// ondersteunend (wat dat werk mogelijk maakt). Bedoeld om thema's en processen in Omnibus in te delen,
// en zo opgezet dat dezelfde indeling later ook op andere verzamelingen kan worden gebruikt.
// De indeling per thema en proces is een redactioneel voorstel (ingedeeld door een AI-assistent op basis van de titel
// en de bronrapporten, besluit B-049); ze zegt niets over toepasselijkheid in een eigen onderzoek.

export const processKinds = {
  primair: {label: 'Primair proces', description: 'Het werk waarvoor de organisatie bestaat.'},
  ondersteunend: {label: 'Ondersteunend proces', description: 'Maakt het primaire werk mogelijk.'},
};

/** De vaste volgorde is ook de volgorde van de symbolen. */
export const processClasses = {
  beleid: {kind: 'primair', label: 'Beleid en regelgeving', description: 'Beleid voorbereiden, kiezen en evalueren.'},
  uitvoering: {kind: 'primair', label: 'Uitvoering en dienstverlening', description: 'Regelingen uitvoeren en burgers en organisaties bedienen.'},
  toezicht: {kind: 'primair', label: 'Toezicht en handhaving', description: 'Toezien op naleving en waar nodig ingrijpen.'},
  sturing: {kind: 'ondersteunend', label: 'Sturing en beheersing', description: 'Besturen, risico’s beheersen, verantwoorden en verbeteren.'},
  financien: {kind: 'ondersteunend', label: 'Financiën', description: 'Begroten, betalen, administreren en financieel verantwoorden.'},
  inkoop: {kind: 'ondersteunend', label: 'Inkoop en contracten', description: 'Inkopen, contracteren en leveranciers aansturen.'},
  informatie: {kind: 'ondersteunend', label: 'Informatie en gegevens', description: 'Informatie bewaren, delen, beoordelen en openbaar maken.'},
  ict: {kind: 'ondersteunend', label: 'ICT', description: 'Systemen kiezen, beveiligen, wijzigen en in de lucht houden.'},
  personeel: {kind: 'ondersteunend', label: 'Personeel en gedrag', description: 'Mensen, kennis, cultuur en veilig werkgedrag.'},
  facilitair: {kind: 'ondersteunend', label: 'Huisvesting en duurzaamheid', description: 'Gebouwen, energie, materialen en duurzame bedrijfsvoering.'},
};

// Sleutel: de categorie van het thema of proces (bij rapportprocessen zonder het voorvoegsel "report-").
const classification = {
  // Thema's
  digital: ['uitvoering', 'ict'], information: ['informatie'], governance: ['sturing'], policy: ['beleid', 'uitvoering'], service: ['uitvoering'],
  sustainability: ['facilitair'], people: ['personeel'], suppliers: ['inkoop'], 'organisation-decisions': ['sturing'], 'risk-control': ['toezicht', 'sturing'],
  'budget-finance': ['financien'], 'accountability-learning': ['sturing'], 'information-management': ['informatie'], 'information-security': ['informatie', 'ict'],
  'financial-information': ['financien'],
  // Vaste processen
  PR01: ['ict'], PR02: ['ict'], PR03: ['informatie'], PR04: ['financien'], PR05: ['inkoop'], PR06: ['facilitair'], PR07: ['facilitair'], PR08: ['ict'], PR09: ['ict'],
  PR10: ['ict'], PR11: ['informatie'], PR12: ['sturing'], PR13: ['sturing'],
  // Processen uit rapporten
  'procurement-route': ['inkoop'], 'contract-obligations': ['inkoop', 'financien'], 'advance-settlement': ['financien'], 'revenue-forecast': ['financien'],
  'invoice-rates': ['financien', 'inkoop'], 'invoice-approval': ['financien', 'inkoop'], 'financial-reconciliation': ['financien'], 'recourse-remittance': ['financien'],
  'subsidy-accountability': ['uitvoering', 'financien'], 'milestone-planning': ['sturing'], 'budget-estimates': ['financien'], 'budget-decisions': ['financien'],
  'budget-instruments': ['financien'], 'budget-presentation': ['financien'], 'maintenance-planning': ['uitvoering', 'inkoop'], 'contract-handover': ['inkoop'],
  'additional-work': ['inkoop'], 'contract-incentives': ['inkoop'], 'supplier-payment': ['inkoop', 'financien'], 'programme-goals': ['sturing'],
  'programme-risk': ['sturing'], 'programme-quality': ['sturing'], 'programme-costs': ['sturing', 'financien'], 'risk-prioritisation': ['toezicht'],
  'legal-task-scope': ['toezicht'], 'data-supply': ['informatie'], 'decision-support': ['sturing'], 'leadership-dialogue': ['sturing'],
  'professional-learning': ['personeel'], commitments: ['sturing'], 'visit-planning': ['toezicht'], 'system-choices': ['ict'], 'control-framework': ['sturing'],
  'it-risk-analysis': ['ict'], 'chain-continuity': ['ict'], 'it-incident-response': ['ict'], 'security-monitoring': ['ict'], 'security-testing': ['ict'],
  'assurance-planning': ['sturing'], 'fraud-policy': ['sturing'], 'fraud-analysis': ['sturing'], 'fraud-awareness': ['personeel'], 'fraud-reporting': ['sturing'],
  'fraud-investigation': ['sturing'], 'fraud-detection': ['sturing'], 'safe-sharing': ['informatie'], access: ['ict'], credentials: ['ict'],
  'physical-access': ['facilitair'], incidents: ['ict'], awareness: ['personeel'], backup: ['ict'], restore: ['ict'], changes: ['ict'], 'cloud-assessment': ['ict'],
  'supplier-evidence': ['inkoop', 'ict'], capacity: ['ict'], 'policy-test': ['beleid'], 'policy-choice': ['beleid'], collaboration: ['sturing'], records: ['informatie'],
  staffing: ['personeel'], roles: ['sturing'], monitoring: ['sturing'], payments: ['uitvoering'], complaints: ['uitvoering'], communication: ['uitvoering'],
  'sustainable-choice': ['facilitair'], procurement: ['inkoop'], reuse: ['facilitair'], 'contract-delivery': ['inkoop'], improvement: ['sturing'],
  independence: ['sturing'], 'data-quality': ['informatie'], disclosure: ['informatie'], 'internal-controls': ['sturing'], 'data-requests': ['informatie'],
  evaluation: ['beleid'],
};

/** De klassen van een thema of proces, in vaste volgorde. Onbekend geeft een lege lijst: dan tonen we niets in plaats van te raden. */
export function processClassesOf(categoryId = '') {
  const own = classification[String(categoryId).replace(/^report-/, '')] || [];
  return Object.keys(processClasses).filter(id => own.includes(id));
}
/** De hoofdklasse: de eerste in de indeling. Daarop wordt de lijst gegroepeerd; een tweede klasse is extra informatie. */
export function processMainClass(categoryId = '') {
  return (classification[String(categoryId).replace(/^report-/, '')] || [])[0] || '';
}
export const classifiedCategoryIds = Object.keys(classification);
