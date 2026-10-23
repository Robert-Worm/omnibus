import { starrPrompts, modelStarrPrompts, interviewLevels } from "./interview-structure.mjs";
import {MAX_SOURCE_TRACE_CHARACTERS, MAX_PROJECT_MATERIALS} from './project-limits.mjs';
import {validateReportTrace} from './report-point-source.mjs';
import { contextualQuestion } from "./model-context.mjs";
import {pointInterviewVariants,pointLevelProbe} from './point-interview.mjs';
import { validateTestingAspects, validateTestingTerminology } from "./testing-aspects.mjs";
import { importedFoundationItems, importedFoundationMetadata } from "./foundations/registry.mjs";
import { validateApplicability } from "./applicability.mjs";
import { exportFonts, exportFontSizes, exportPalettes } from './export-design.mjs';
import { processes } from './process-catalogue.mjs';
import { validateResearchGoal } from './research-goal.mjs';
import { validateResearchApproach } from './research-approach.mjs';
import {provisionStatusLabel,provisionStatusText,documentHashes} from './provision-status.mjs';
import {cioMetadata,cioProposals,cioPoints,cioReviewBasis} from './cio-law-data.mjs';
import {validateCioEditorialTrace} from './cio-content.mjs';
import {catalogueDerived,catalogueRevision} from './catalogue-runtime.mjs';
import {createScalarValidationCache,scalarRecordMatches} from './scalar-validation-cache.mjs';
import {isUnchangedScopeRationale} from './material-scope.mjs';
import {topicalMetadata,topicalProposals,topicalIds,validateTopicalMaterial} from './topical-content.mjs';
// One portable investigation. Source selections never silently select criteria.
export const foundationKinds = {
  law: "Wetgeving",
  framework: "Beheersingskader",
  audit: "Auditvereisten",
  model: "Model",
};
const iia = "https://www.theiia.org/en/standards/2024-standards/topical-requirements/";
const entry = (id, title, kind, url, usage, edition = "") => ({
  id,
  title,
  kind,
  url,
  usage,
  edition,
  readiness: "Bron beschikbaar · normen niet geïmporteerd",
});
export const legacyFoundations = [
  entry('ISO31000','ISO 31000:2018 — Risk management — Guidelines','framework','https://www.iso.org/standard/65694.html','Risicomanagement laten bijdragen aan besluiten en doelen: inrichting, beoordeling, maatregelen en opvolging.','Tweede editie · februari 2018'),
  entry('IIAERM','The Role of the Internal Audit Function in Enterprise Risk Management','model','https://www.theiia.org/en/resources/statements-of-position','De bijdrage van internal audit aan organisatiebreed risicomanagement, met grenzen aan advies en uitvoerende taken.','IIA · Statement of Position, 8 juli 2026'),
  entry('CLOUD2026','Rijksbreed cloudbeleid 2026','framework','https://www.tweedekamer.nl/downloads/document?id=2026D35295','Cloudkeuzes, leveranciersrisico’s, exit en gegevensbescherming bij het Rijk.','Definitief · 3 juli 2026'),
  entry('NISTCSF','NIST Cybersecurity Framework (CSF) 2.0','framework','https://doi.org/10.6028/NIST.CSWP.29','Cyberrisico’s, beveiligingsuitkomsten, incidentaanpak en herstel.','NIST CSWP 29 · 26 februari 2024'),
  entry('AIRMF','NIST Artificial Intelligence Risk Management Framework (AI RMF 1.0)','framework','https://doi.org/10.6028/NIST.AI.100-1','AI-doelen, gebruikscontext, risico’s en gevolgen onderzoeken en beheersen.','NIST AI 100-1 · januari 2023'),
  entry('EED','Energie-efficiëntierichtlijn (EED)','law','https://eur-lex.europa.eu/eli/dir/2023/1791/oj','Energiebeheer, overheidsgebouwen, inkoop, datacentra en energiediensten. Rol en nationale uitvoering afzonderlijk bepalen.','EU 2023/1791 en datacentrumverordening 2024/1364'),
  entry(
    "AVG",
    "Algemene verordening gegevensbescherming (AVG)",
    "law",
    "https://eur-lex.europa.eu/eli/reg/2016/679/oj",
    "Verwerking van persoonsgegevens; toepasselijkheid per verwerking beoordelen.",
    "EU 2016/679",
  ),
  entry(
    "NIS2",
    "NIS2-richtlijn",
    "law",
    "https://eur-lex.europa.eu/eli/dir/2022/2555/oj",
    "Cyberbeveiliging; nationale implementatie en toepassingsbereik controleren.",
    "EU 2022/2555",
  ),
  entry(
    "AIA",
    "AI-verordening (AI Act)",
    "law",
    "https://eur-lex.europa.eu/eli/reg/2024/1689/oj",
    "AI-systemen; rol, risicoklasse en toepassingsdatum bepalen.",
    "EU 2024/1689",
  ),
  entry(
    "DORA",
    "Digital Operational Resilience Act (DORA)",
    "law",
    "https://eur-lex.europa.eu/eli/reg/2022/2554/oj",
    "Digitale operationele weerbaarheid in de financiële sector.",
    "EU 2022/2554",
  ),
  entry(
    "CSRD",
    "Corporate Sustainability Reporting Directive (CSRD)",
    "law",
    "https://eur-lex.europa.eu/eli/dir/2022/2464/oj",
    "Duurzaamheidsrapportage; actuele reikwijdte en wijzigingen controleren.",
    "EU 2022/2464",
  ),
  entry(
    "PCF",
    "Privacy Control Framework",
    "framework",
    "https://www.norea.nl/uploads/bfile/6ffdfb84-7449-4106-b109-fc5f6ba0636a",
    "Privacybeheersing en mogelijke normen.",
    "NOREA · 3.0, juli 2025",
  ),
  entry(
    "CBW",
    "Cbw (NIS2) Control Framework",
    "framework",
    "https://www.norea.nl/uploads/bfile/a5ccfff5-55e9-41b5-a5d3-145f99c452dc",
    "Beheersingsmaatregelen rond cyberbeveiliging.",
    "NOREA · editie controleren",
  ),
  entry(
    "DEVOPS",
    "DevOps in control",
    "framework",
    "https://www.norea.nl/uploads/bfile/14b7aa29-bd9a-4e00-b3ef-23e7258ed9cf",
    "Beheersing van ontwikkeling en beheer van IT-diensten.",
    "NOREA · 22 januari 2026",
  ),
  entry(
    "DIGID",
    "ICT-beveiligingsassessment DigiD",
    "framework",
    "https://www.norea.nl/uploads/bfile/e72506b1-3b29-4cbe-97a2-d6e1c2458992",
    "Onderzoek naar de beveiliging van DigiD-aansluitingen.",
    "NOREA · 2025",
  ),
  entry(
    "SUWI",
    "Suwinet-beheersing · ENSIA 2024",
    "framework",
    "https://www.norea.nl/uploads/bfile/ff4efdd3-07c4-41d6-b6a3-ab3c408f3e00",
    "Beveiliging, privacy en verantwoording van Suwinet-gebruik bij gemeenten; historische broneditie.",
    "NOREA · 2024, 1.0",
  ),
  entry(
    "ITDIENST",
    "Algemene Beheersing van IT-diensten",
    "framework",
    "https://www.norea.nl/uploads/bfile/fb132495-5b54-47ed-b213-617de85977fb",
    "Algemene beheersing van IT-dienstverlening.",
    "NOREA/PvIB · 2015",
  ),
  entry(
    "TR-CYBER",
    "Cybersecurity Topical Requirement",
    "audit",
    iia,
    "Minimale auditdekking bij toepasselijke assurance-opdrachten.",
    "IIA · van kracht 5 februari 2026",
  ),
  entry(
    "TR-THIRD",
    "Third-Party Topical Requirement",
    "audit",
    iia,
    "Auditdekking van risico’s rond derde partijen.",
    "IIA · van kracht 15 september 2026",
  ),
  entry(
    "TR-BEHAV",
    "Organizational Behavior Topical Requirement",
    "audit",
    iia,
    "Auditdekking rond organisatiegedrag.",
    "IIA · van kracht 15 december 2026",
  ),
  entry(
    "TR-RESIL",
    "Organizational Resilience Topical Requirement",
    "audit",
    iia,
    "Auditdekking rond organisatorische weerbaarheid.",
    "IIA · van kracht 30 april 2027",
  ),
  entry(
    "COBIT",
    "COBIT 2019 — Governance and Management Objectives",
    "framework",
    "https://www.isaca.org/bookstore/cobit-19/cb19fgm",
    "Eigen auditpunten voor IT-besluitvorming, beheerst veranderen, dienstverlening en onafhankelijke beoordeling.",
    "ISACA · COBIT 2019 · publicatie 2018",
  ),
  entry(
    "ISO27001",
    "ISO/IEC 27001",
    "framework",
    "https://www.iso.org/isoiec-27001-information-security.html",
    "Managementsysteem voor informatiebeveiliging; inhoud vereist passende gebruiksrechten.",
    "ISO/IEC · editie vastleggen",
  ),
  entry(
    "ISO27002",
    "ISO/IEC 27002:2022 — Beheersmaatregelen voor informatiebeveiliging",
    "framework",
    "https://www.iso.org/standard/75652.html",
    "Eigen auditleidraad voor geselecteerde organisatorische, menselijke, fysieke en technische beveiligingsmaatregelen.",
    "ISO/IEC · februari 2022",
  ),
  entry(
    "GIAS",
    "Global Internal Audit Standards — kwaliteit van internal audit",
    "framework",
    "https://www.theiia.org/en/products/bookstore/global-internal-audit-standards-2024-edition",
    "Eigen auditpunten voor onafhankelijkheid, kwaliteit en opdrachtuitvoering van de internal-auditfunctie.",
    "IIA · 2024 · effectief 9 januari 2025",
  ),
  entry(
    "COSOCOMP",
    "COSO — Compliancerisico’s beheersen met ERM",
    "framework",
    "https://www.coso.org/erm-framework",
    "Eigen auditleidraad voor het herkennen en beheersen van nalevingsrisico’s en het verbeteren van de complianceaanpak.",
    "COSO / SCCE & HCCA · november 2020",
  ),
  entry(
    "DORAFC",
    "NOREA — DORA in Control",
    "framework",
    "https://www.norea.nl/dora",
    "Praktische beheersmaatregelen voor ICT-risico’s, leveranciers, continuïteit, incidenten en digitale weerbaarheid.",
    "NOREA · v3.2, 25 november 2025",
  ),
  entry(
    "GOVCODE",
    "Nederlandse Corporate Governance Code",
    "framework",
    "https://www.mccg.nl/",
    "Governance; toepasselijkheid en gebruikte editie vastleggen.",
    "Editie vastleggen",
  ),
  entry(
    "3LINES",
    "Three Lines Model: Assurance and Advice in Support of Effective Governance",
    "model",
    "https://www.theiia.org/en/resources/statements-of-position",
    "Rollen en verantwoordelijkheden rond governance, risicomanagement en assurance.",
    "IIA · Statement of Position, 8 juli 2026",
  ),
  entry(
    "CIO2026",
    "Besluit CIO-stelsel Rijksdienst 2026",
    "law",
    "https://zoek.officielebekendmakingen.nl/stcrt-2025-40208.html",
    "Digitale sturing, rollen en bevoegdheden binnen de rijksdienst.",
    "Staatscourant 2025, 40208 · vanaf 1 januari 2026",
  ),
  entry('WBK','Wet bescherming klokkenluiders (WBK)','law','https://wetten.overheid.nl/BWBR0037852/2023-02-18','Interne meldprocedure en bescherming van melders.'),
  entry('BVA2021','Besluit BVA-stelsel Rijksdienst 2021','law','https://wetten.overheid.nl/BWBR0044617/2021-01-01','Rollen, bevoegdheden en samenwerking voor integrale beveiliging binnen de Rijksdienst.','Lokale bronversie 1 januari 2021'),
  entry('WDO','Wet digitale overheid (Wdo)','law','https://wetten.overheid.nl/BWBR0048156/2025-11-11','Veilige digitale toegang en landelijke voorzieningen.'),
  entry('WOO','Wet open overheid (Woo)','law','https://wetten.overheid.nl/BWBR0045754/2026-08-15','Informatiebeheer, openbaarmaking en verzoekafhandeling.'),
  entry('ARCHIEF2026','Archiefwet 2026 · voorbereiding','law','https://wetten.overheid.nl/BWBR0052739/9999-12-31','Voorbereiden op duurzaam documentbeheer, overbrenging en toegang tot archieven.'),
  entry('WWKE','Wet weerbaarheid kritieke entiteiten (Wwke)','law','https://zoek.officielebekendmakingen.nl/stb-2026-188.html','Bescherming en continuïteit van essentiële diensten; toepasselijkheid per aanwijzing.'),
  entry('WPG','Wet politiegegevens (Wpg)','law','https://wetten.overheid.nl/BWBR0022463/2026-09-01','Politiegegevens zorgvuldig gebruiken, beveiligen, delen en bewaren; reikwijdte per taak bepalen.'),
  entry('WJSG','Wet justitiële en strafvorderlijke gegevens (Wjsg)','law','https://wetten.overheid.nl/BWBR0014194/2026-09-01','Gegevens in de strafrechtsketen en VOG-aanvragen; kies de regels die bij de eigen taak horen.'),
  entry('BIO2','Baseline Informatiebeveiliging Overheid 2 (BIO2)','framework','https://www.digitaleoverheid.nl/nieuws/bio2-versie-1-3-voor-alle-overheidslagen/','Overheidsinformatie en IT beveiligen: risico’s, toegang, leveranciers, incidenten en herstel.','BIO2 1.3'),
  entry('AW','Aanbestedingswet 2012','law','https://wetten.overheid.nl/BWBR0032203/2026-04-30/0','Inkoop, selectie, gunning en contractwijzigingen.','Consolidatie 30 april 2026'),
].map((s) => ({ ...s, ...importedFoundationMetadata[s.id] }));
// Historical sources remain available to saved projects, never silently migrated.
const withdrawnModelIds = new Set(['IIAERM','3LINES']);
import {wwkeMetadata,wwkeProposals,wwkeSourceId,validateWwkeMaterial} from './wwke-law-data.mjs';
import {isAdmittedFoundation} from './admitted-foundation.mjs';
export const foundations = [cioMetadata,wwkeMetadata,...topicalMetadata,...legacyFoundations.filter(s=>isAdmittedFoundation(s)||(s.kind==='model'&&!withdrawnModelIds.has(s.id)))];
import {validateRiskIntake} from './research-entry.mjs';
export const emptyInvestigation = () => ({
  version: 1,
  purpose: "",
  scope: "",
  sourceIds: /** @type {string[]} */ ([]),
  materials: [],
});
// Retired illustrative AVG proposals remain valid in saved snapshots, but new
// selections use the reviewed, source-bound catalogue only.
export const foundationProposals = [];
catalogueDerived(()=>foundationProposals.splice(0,foundationProposals.length,...cioProposals,...wwkeProposals,...topicalProposals,...importedFoundationItems.filter(p=>legacyFoundations.some(s=>s.id===p.sourceId&&(isAdmittedFoundation(s)||(s.kind==='model'&&!withdrawnModelIds.has(s.id)))))));
// No longer offered. Recognize only the old browsing ID on project import;
// saved materials, questions and source evidence remain the user's own work.
const retiredFoundationIds = new Set(['EPBD',...legacyFoundations.map(s=>s.id)]);
const MATERIAL_LIMIT = MAX_PROJECT_MATERIALS;
function checkMaterialCapacity(count) {
  if (count > MATERIAL_LIMIT)
    throw Error('Dit lokale concept ondersteunt maximaal 1.000 eigen bouwstenen. Verklein je selectie; er is niets gewijzigd.');
}
const text = (value, max = 10000) => typeof value === "string" && value.length <= max;
export function validateInvestigation(value) {
  if (value === undefined) return emptyInvestigation();
  if (
    !value ||
    value.version !== 1 ||
    !text(value.purpose, 2000) ||
    !text(value.scope, 2000) ||
    (value.processId !== undefined && !processes.some(p => p.id === value.processId)) ||
    !Array.isArray(value.sourceIds) ||
    !Array.isArray(value.materials) ||
    value.materials.length > MATERIAL_LIMIT ||
    value.sourceIds.some((id) => !foundations.some((s) => s.id === id) && !retiredFoundationIds.has(id))
  )
    throw Error("Ongeldige onderzoeksgegevens.");
  const ids = new Set();
  const materials = value.materials.map((m) => {
    if (!m || ids.has(m.id)) throw Error("Ongeldige eigen bouwsteen.");
    ids.add(m.id);
    return validatedMaterial(m);
  });
  return {
    version: 1,
    purpose: value.purpose,
    scope: value.scope,
    ...(value.riskIntake !== undefined ? {riskIntake:validateRiskIntake(value.riskIntake)} : {}),
    ...(value.goal !== undefined ? {goal: validateResearchGoal(value.goal)} : {}),
    ...(value.researchApproach !== undefined ? {researchApproach: validateResearchApproach(value.researchApproach)} : {}),
    ...(value.processId ? {processId: value.processId} : {}),
    sourceIds: [...new Set(value.sourceIds)],
    materials,
    ...(value.applicability !== undefined ? {applicability:validateApplicability(value.applicability)} : {}),
  };
}
const validatedMaterial = createScalarValidationCache(normalizeMaterial, catalogueRevision);
function normalizeMaterial(m) {
    if (
      !m ||
      !/^WB-[1-9][0-9]*$/.test(m.id) ||
      !["criterion", "model-question", "audit-coverage"].includes(m.kind) ||
      !text(m.title, 500) ||
      !m.title.trim() ||
      !text(m.body) ||
      !m.body.trim() ||
      !text(m.question) ||
      !text(m.procedure) ||
      !text(m.sourceTitle, 1000) ||
      !text(m.sourceUrl, 2000) ||
      (m.sourceUrl && !m.sourceUrl.startsWith("https://")) ||
      !text(m.location, m.lawTrace ? 10000 : 1000) ||
      !text(m.originKey, 300) ||
      !text(m.rationale) ||
      !text(m.edition, 500)
    )
      throw Error("Ongeldige eigen bouwsteen.");
    if(m.topicalTrace||topicalIds.some(id=>m.originKey.startsWith(id+':IIA-')))validateTopicalMaterial(m);
    if(m.foundationId===wwkeSourceId||m.originKey.startsWith(wwkeSourceId+':')||m.sourcePointId?.startsWith('WWA-P-')||m.lawTrace)validateWwkeMaterial(m);
    if(m.originKey.startsWith(cioMetadata.id+':') || m.sourcePointId?.startsWith('C26-P-')) {
      const canonical=cioPoints.find(p=>p.id===m.sourcePointId);
      if(!canonical || canonical.selection_status!=='SELECTABLE' || m.originKey!==cioMetadata.id+':'+canonical.id || !m.cioTrace)throw Error('CIO-bouwsteen mist geldige selectiestatus of herleiding.');
    }
    if(m.effectiveStatus && !['future','draft','unknown','in-force','conditional','optional'].includes(m.effectiveStatus))throw Error('Onbekende inwerkingtredingsstatus.');
    if(m.sourceDocumentHashes && !Object.keys(documentHashes(m)).length)throw Error('Ongeldige bronversies bij bouwsteen.');
    if (m.interviewLevel && !interviewLevels.some(l => l.id === m.interviewLevel))
      throw Error("Onbekend gespreksniveau bij bouwsteen.");
    const extra = {};
    for (const k of [
      "questionOperational",
      "questionManagement",
      "questionStrategic",
      "interviewLevel",
      "documents",
      "observation",
      "risk",
      "control",
      "foundationId",
      "sourceControlId",
      "sourceHash",
      "sourceAccess",
      "sourceContext",
      "sourceText",
      "sourceAssessment",
      "sourceMappings",
      "sourceMaturity",
      "sourceLicense",
      "sourceChanges",
      "sourceMethodology",
      "reviewStatus",
      "effectiveStatus", "effectiveFrom", "statusAsOf", "statusNote", "statusSource", "sourceDocumentHashes",
      "topic",
      "testDesign",
      "testExistence",
      "testOperation",
      "objective", "controlObjective", "controlObjectiveId", "controlObjectiveTitle", "parentCriterion",
      "sourcePointId", "originalLineId", "wordingMode",
      "cioTrace", "lawTrace", "reportTrace", "topicalTrace",
    ]) {
      // Report-reuse fields are additive: opening an older non-report building
      // block must not insert new blank fields into its saved snapshot.
      if (["objective", "controlObjective", "controlObjectiveId", "controlObjectiveTitle", "parentCriterion", "sourcePointId", "originalLineId", "wordingMode", "cioTrace", "lawTrace", "reportTrace", "topicalTrace"].includes(k) && m[k] === undefined) continue;
      // A reviewed criterion can cite several complete legal clauses. Keep the
      // bounded source and its context intact without widening editable questions.
      if (m[k] !== undefined && !text(m[k], ['reportTrace','lawTrace','topicalTrace'].includes(k)?MAX_SOURCE_TRACE_CHARACTERS:k==='cioTrace' ? 300000 : ['sourceText','sourceContext'].includes(k) ? 100000 : 10000)) throw Error("Ongeldige modelvraag.");
      if(k==='reportTrace'&&m[k])validateReportTrace(m);
      if(k==='cioTrace' && m[k]) {
        let trace;try{trace=JSON.parse(m[k]);}catch{throw Error('Ongeldige CIO-herleiding.');}
        if(trace?.source?.source_id!==cioMetadata.id || trace?.point?.id!==m.sourcePointId || !Array.isArray(trace.records) || !trace.criterion?.text || trace.reviewBasis!==cioReviewBasis || !cioPoints.some(p=>p.id===trace.point.id&&p.selection_status==='SELECTABLE'))throw Error('Onvolledige CIO-herleiding.');
        validateCioEditorialTrace(trace);
      }
      extra[k] = m[k] || "";
    }
    return {
      ...Object.fromEntries(
        [
          "id",
          "kind",
          "title",
          "body",
          "question",
          "procedure",
          "sourceTitle",
          "sourceUrl",
          "location",
          "originKey",
          "rationale",
          "edition",
        ].map((k) => [k, m[k]]),
      ),
      ...extra,
    };
}
export function addMaterial(draft, material) {
  const wb = validateInvestigation(draft.investigation);
  const old = material.originKey && wb.materials.find((m) => m.originKey === material.originKey &&
    (material.kind !== 'model-question' || (m.topic||'').trim().toLocaleLowerCase('nl') === (material.topic||'').trim().toLocaleLowerCase('nl') || (!m.topic && m.question===material.question)));
  if (old) return { ...draft, included: [...new Set([...draft.included, old.id])],
    ...(material.kind==='model-question' && !old.topic && material.topic && old.question===material.question
      ? {investigation:validateInvestigation({...wb,materials:wb.materials.map(m=>m.id===old.id ? {...m,topic:material.topic}:m)})} : {}) };
  // Explicit re-adoption of an unchanged legacy question adds level identity, not
  // a duplicate. Preserve its ID, manual wording, research links and all other fields.
  const legacy = material.interviewLevel && wb.materials.find(m => !m.interviewLevel &&
    m.kind === 'model-question' && m.originKey === material.originKey.slice(0,-material.interviewLevel.length-1) &&
    m.question === material.question);
  if (legacy) return {...draft, included:[...new Set([...draft.included,legacy.id])],
    investigation:validateInvestigation({...wb, materials:wb.materials.map(m => m.id === legacy.id
      ? {...m, originKey:material.originKey, interviewLevel:material.interviewLevel, topic:material.topic||''} : m)})};
  checkMaterialCapacity(wb.materials.length + 1);
  const n = Math.max(0, ...wb.materials.map((m) => Number(m.id.slice(3)))) + 1;
  const m = {
    kind: "criterion",
    question: "",
    procedure: "",
    sourceTitle: "Eigen uitwerking",
    sourceUrl: "",
    location: "",
    originKey: "",
    rationale: "",
    edition: "",
    ...material,
    id: `WB-${n}`,
  };
  return {
    ...draft,
    included: [...draft.included, m.id],
    investigation: validateInvestigation({ ...wb, materials: [...wb.materials, m] }),
  };
}
// Adding a whole source one criterion at a time meant addMaterial validated the
// growing material list twice per item: for a 183-criterion source that is 366
// full validations of up to 183 materials each, which is what made the source
// checkbox take most of a second. This inserts a batch with one validation at
// the start and one at the end.
//
// Only plain criteria take the fast path. Model questions and re-adopted legacy
// questions have matching rules that depend on the state after each insert, so
// those fall back to the original per-item behaviour.
export function addMaterials(draft, materials) {
  if (!materials.length) return draft;
  if (materials.some((m) => m.kind === "model-question" || m.interviewLevel))
    return materials.reduce((d, m) => addMaterial(d, m), draft);
  const wb = validateInvestigation(draft.investigation);
  const byKey = new Map(wb.materials.filter((m) => m.originKey).map((m) => [m.originKey, m]));
  const included = new Set(draft.included);
  const added = [];
  let n = Math.max(0, ...wb.materials.map((m) => Number(m.id.slice(3))));
  for (const material of materials) {
    const old = material.originKey && byKey.get(material.originKey);
    if (old) {
      included.add(old.id);
      continue;
    }
    checkMaterialCapacity(wb.materials.length + added.length + 1);
    const m = {
      kind: "criterion",
      question: "",
      procedure: "",
      sourceTitle: "Eigen uitwerking",
      sourceUrl: "",
      location: "",
      originKey: "",
      rationale: "",
      edition: "",
      ...material,
      id: `WB-${++n}`,
    };
    if (m.originKey) byKey.set(m.originKey, m);
    added.push(m);
    included.add(m.id);
  }
  return {
    ...draft,
    included: [...included],
    investigation: added.length
      ? validateInvestigation({ ...wb, materials: [...wb.materials, ...added] })
      : draft.investigation,
  };
}
// Rebuild on publication, including corrected/replaced sources and rollbacks.
// New reports/frameworks use this same lookup; no source-specific cache keys.
const importedByOriginKey = new Map();
catalogueDerived(()=>{importedByOriginKey.clear();for (const p of importedFoundationItems) {
  if (p.originKey && !importedByOriginKey.has(p.originKey)) importedByOriginKey.set(p.originKey, p);
}});
export function materialLine(m) {
  const original=m.originKey && importedByOriginKey.get(m.originKey);
  // Only suppress recognizable, unchanged library defaults. Saved edits remain literal.
  const auditInstruction=original && m.control===original.control && /^Onderzoeksvoorstel:\s*/.test(m.control||'') &&
    (m.control.replace(/^Onderzoeksvoorstel:\s*/,'')===m.procedure ||
     (m.testDesign===original.testDesign && m.control.replace(/^Onderzoeksvoorstel:\s*/,'')===m.testDesign));
  const scopeAsGoal=isUnchangedScopeRationale(m, original);
  const field = (value) => ({
    text: value,
    basis: value ? "PROPOSED" : "NOT_ESTABLISHED",
    evidence_ids: [],
    reason:
      m.kind === "model-question"
        ? "Onderzoeksvraag uit modelselectie; geen norm."
        : "Eigen operationalisering; toepasselijkheid en onderbouwing beoordelen.",
  });
  const status = {
    value: "NOT_ESTABLISHED",
    explanation: "Geen huidige werking onderzocht.",
    evidence_ids: [],
  };
  return {
    id: m.id,
    title: m.title,
    ...(m.sourcePointId ? {sourcePointId:m.sourcePointId, parentCriterion:m.parentCriterion} : {}),
    // Presentation-only group context. Existing saved criteria/questions are not rewritten.
    ...(m.controlObjectiveId && m.controlObjective ? {collectionGroup:{
      id:'control-objective:'+m.controlObjectiveId, title:'Beheersdoelstelling · '+(m.controlObjectiveTitle || m.controlObjective), sourceTitle:'Voorgestelde groepering',
    }} : original && original.sourceId===m.foundationId ? {collectionGroup:{
      id: `${m.foundationId}:${original.groupId || 'general'}`,
      title: original.groupTitle || original.topic || 'Overige normen',
      sourceTitle: m.sourceTitle,
    }} : m.kind==='model-question' && m.title.includes(' · ') ? {collectionGroup:{
      id: `model:${m.originKey.split(':')[0]}:${m.title.split(' · ')[0]}`,
      title: m.title.split(' · ')[0], sourceTitle:m.sourceTitle,
    }} : {}),
    provisionStatus:provisionStatusLabel(m),
    provisionStatusDetails:provisionStatusText(m),
    entity:
      m.kind === "model-question"
        ? "Modelvraag · geen norm"
        : m.kind === "audit-coverage"
          ? m.sourceControlId ? "Auditdekkingspunt · bronbewerking" : "Auditdekking · eigen uitwerking"
          : m.sourceAccess === 'reference-only' ? "Eigen onderzoekspunt · bronverwijzing"
          : m.sourceControlId ? "Bronnorm · Nederlandse bewerking" : "Norm · eigen uitwerking",
    materialKind: m.kind,
    sourceControlId: m.sourceControlId || "",
    source_id: m.id,
    objective: field(m.objective ?? (scopeAsGoal ? '' : m.rationale)),
    risk: field(m.risk || ""),
    controlObjective: field(m.controlObjective || ""),
    control: field(auditInstruction ? '' : m.control || ""),
    criterion: field(m.body),
    finding: field(""),
    auditQuestion: field(m.question),
    procedure: field(m.procedure),
    owner: field(""),
    relationships: [],
    controlStatus: { design: status, implementation: status, operation: status },
  };
}
export function investigationFramework(base, draft) {
  return prepareInvestigationFramework(base, draft).framework;
}
// Only our transient viewer projections are immutable, never the investigation
// or saved project. A private receipt avoids rebuilding and serializing these
// nested fields during scope checks. Every owner field and the catalogue
// revision still have to match; copied/imported/changed lines use the exact
// comparison below. Receipts are not persisted or supplied by callers.
const materialProjections = new WeakMap();
function freezeProjection(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freezeProjection(child);
    Object.freeze(value);
  }
  return value;
}
function preparedMaterialLine(material) {
  const line = freezeProjection(materialLine(material));
  materialProjections.set(line, {material: {...material}, revision: catalogueRevision()});
  return line;
}
export function materialMatchesLine(material, line) {
  const receipt = materialProjections.get(line);
  if (receipt && receipt.revision === catalogueRevision() &&
      scalarRecordMatches(material, receipt.material)) return true;
  return JSON.stringify(materialLine(material)) === JSON.stringify(line);
}
// Return both products of the same validation pass. Callers that save the
// normalized investigation and inspect its projected lines need not validate
// the identical materials again. There is no caller-supplied "already valid" flag.
export function prepareInvestigationFramework(base, draft) {
  const wb = validateInvestigation(draft?.investigation);
  // Strip prior projections when called with an already enriched framework.
  const framework = {
    ...base,
    lines: [...base.lines.filter((l) => !l.source_id), ...wb.materials.map(preparedMaterialLine)],
    workbenchMaterials: wb.materials,
    sources: wb.materials.map((m) => ({
      id: m.id,
      title: m.sourceTitle || "Eigen uitwerking",
      url: m.sourceUrl,
      location: m.location,
      edition: m.edition,
      year: 0,
      source_hash: m.sourceHash || "Niet vastgelegd",
      sourceDocumentHashes:m.sourceDocumentHashes || '',
      controlId: m.sourceControlId || "",
      context: m.sourceContext || "",
      license: m.sourceLicense || "",
      changes: m.sourceChanges || "",
    })),
  };
  return {investigation:wb,framework};
}
export function selectedModelMaterials(model) {
  if (!model.selected) return [];
  return model.items
    .filter((i) => i.included)
    .flatMap((i) =>
      (i.questions || [{ id: i.id, question: i.question, probes: i.probes, included: true }])
        .filter(
          (q) =>
            q.included &&
            (!i.indicators || i.indicators.some((d) => d.id === q.indicatorId && d.included)),
        )
        .flatMap(q => q.selectedLevels
          ? q.selectedLevels.map(level => ({...q, selectedLevel: level})) : [q])
        .filter((q) => q.selectedLevel || model.id === "CEV-AI" ? q.variants?.[q.selectedLevel || model.interviewLevel || "operational"]?.trim() : q.question?.trim())
        .map((q) => ({
          kind: "model-question",
          topic: model.researchSubject?.trim() || '',
          title: i.title + " · " + (q.title || "Interviewvraag") + (q.selectedLevel ? " · " + interviewLevels.find(l => l.id === q.selectedLevel).label : ""),
          body: i.indicators?.find((d) => d.id === q.indicatorId)?.definition || i.title,
          question: contextualQuestion(q.selectedLevel || model.id === "CEV-AI" ? q.variants?.[q.selectedLevel || model.interviewLevel || "operational"] : q.question, model.researchSubject),
          ...(q.selectedLevel ? {interviewLevel: q.selectedLevel} : {}),
          questionOperational: contextualQuestion(q.question, model.researchSubject),
          questionManagement:
            q.question === q.variants?.operational ? contextualQuestion(q.variants?.management, model.researchSubject) : "",
          questionStrategic:
            q.question === q.variants?.operational ? contextualQuestion(q.variants?.strategic, model.researchSubject) : "",
          documents: i.indicators?.find((d) => d.id === q.indicatorId)?.documents || "",
          observation: i.indicators?.find((d) => d.id === q.indicatorId)?.observation || "",
          procedure: contextualQuestion(q.probes, model.researchSubject),
          sourceTitle: model.officialName || model.title,
          sourceUrl: model.sources?.[0]?.url || "",
          ...(q.sourcePage ? {
            sourceContext: [model.source, ...(model.sources || []).filter(s => q.sourceIds?.includes(s.id) && (!s.url || !model.source.includes(s.url))).map(s => [s.title, s.url].filter(Boolean).join('. ')),
              `Theoretische basis: ${q.sourcePage} Eigen kwalitatieve interviewvraag; niet letterlijk uit de publicatie.`].join('\n'),
            sourceMethodology: 'Modelconstruct uit primaire publicatie; eigen kwalitatieve operationalisering, geen gevalideerde meetschaal.',
          } : {}),
          edition: model.version,
          location: [i.id, q.indicatorId, q.id, q.sourcePage].filter(Boolean).join(" / "),
          originKey: `${model.id}:${model.version}:${q.id}` + (q.selectedLevel ? `:${q.selectedLevel}` : ""),
          rationale:
            (model.researchSubject ? "Onderwerp: " + model.researchSubject + ". " : "") + (q.purpose || i.relevance ? (q.purpose || i.relevance) + " " : "") + "Verkennen van " +
            i.title.toLocaleLowerCase("nl") +
            "; deze vraag is geen gevalideerde schaal of compliancecriterium.",
        })),
    );
}
export function workflowStage(page) {
  return page === 'entry' ? -1 : page === "start" || page === 'risk-start' ? 0 : page === "framework" ? 2 : page === "export" ? 3 : 1;
}
export function materialInterview(material, settings, editedQuestion, editedProcedure, additions = {}) {
  const generated=material.kind!=='model-question'&&!material.question?.trim()?pointInterviewVariants(material):null;
  // The full audit plan remains in the detail viewer. Do not repeat it inside
  // the interview-question cell; explicitly authored additions are retained.
  const procedure = [additions.excludeProcedure ? "" : (editedProcedure ?? (additions.separateProcedure ? '' : material.procedure)), additions.procedures].filter(Boolean).join("\n\n");
  const baseQuestion = additions.excludeQuestion ? "" : (editedQuestion ?? (material.question || generated?.questionOperational));
  const procedureLabel = material.kind === "model-question" ? "Doorvragen: " : "Toetsinstructie voor de auditor: ";
  if (!settings) return [baseQuestion, additions.questions, procedure && procedureLabel + procedure].filter(Boolean).join("\n\n");
  if (!settings.levels?.length && !material.interviewLevel) throw Error("Kies het niveau van de geïnterviewde.");
  const levels = [...new Set(material.interviewLevel ? [material.interviewLevel] : settings.levels)];
  // A criterion has one audit procedure, not a different procedure per audience.
  // Keep each chosen question level, but show their identical instruction once.
  const sharedProcedure = material.kind !== 'model-question' && levels.length > 1 && procedure;
  const sharedStarr=material.kind!=='model-question'&&levels.length>1&&settings.starr&&additions.separateProcedure;
  const interviews = levels
    .map((level) => {
      const label = interviewLevels.find((l) => l.id === level)?.label;
      if (!label) throw Error("Onbekend interviewniveau.");
      const variantKey={operational:'questionOperational',management:'questionManagement',strategic:'questionStrategic'}[level];
      const variant = material.interviewLevel ? material.question :
        material[
          {
            operational: "questionOperational",
            management: "questionManagement",
            strategic: "questionStrategic",
          }[level]
        ] || generated?.[variantKey] || (material.kind!=='model-question'&&material.question?material.question+'\n\n'+pointLevelProbe[level]:'');
      if (material.kind === "model-question" && !variant && !editedQuestion)
        throw Error(
          "Voor " +
            material.title +
            " ontbreekt een formulering op " +
            label +
            ". Kies een ander niveau of werk de vraag zelf uit.",
        );
      const question = [additions.excludeQuestion ? "" :
        (editedQuestion ?? (variant || material.question || "Vraag nog uit te werken")), additions.questions].filter(Boolean).join("\n\n");
      return (
        label +
        "\n" +
        question +
        (procedure && !sharedProcedure ? "\n\n" + procedureLabel + procedure : "") +
        (settings.starr && !sharedStarr
          ? "\n\n" +
            (material.kind === 'model-question'
              ? modelStarrPrompts(material.originKey?.split(':')[0], level, material.topic || material.title)
              : starrPrompts(level, material.title))
              .map((p) => p.phase + ": " + p.prompt)
              .join("\n")
          : "")
      );
    })
    .join("\n\n");
  return interviews + (sharedStarr ? '\n\nDoorvragen bij ieder gekozen niveau\nSituatie: Welke concrete situatie heeft u meegemaakt, wat speelde er en wie waren betrokken?\nTaak: Wat waren uw taak, verantwoordelijkheid en mandaat, en wat lag bij anderen?\nActie: Wat deed of besloot u, welke afwegingen maakte u en hoe organiseerde u de opvolging?\nResultaat: Wat gebeurde er vervolgens, waaruit blijkt het resultaat en wat weet u nog niet?\nReflectie: Wat zou u behouden of anders doen, en waarom?' : '') + (sharedProcedure ? "\n\nVoor alle gekozen niveaus\n" + procedureLabel + procedure : "");
}
export function validateExportSettings(value) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    JSON.stringify(value).length > 100000
  )
    throw Error("Ongeldige exportinstellingen.");
  const out = {};
  if(value.fontFamily !== undefined) {
    if(!exportFonts.includes(value.fontFamily))throw Error('Onbekend exportlettertype.');
    out.fontFamily=value.fontFamily;
  }
  if(value.fontSize !== undefined) {
    if(!exportFontSizes.includes(value.fontSize))throw Error('Onbekende exporttekstgrootte.');
    out.fontSize=value.fontSize;
  }
  if (value.testingAspects !== undefined)
    out.testingAspects = validateTestingAspects(value.testingAspects);
  if (value.testingTerminology !== undefined)
    out.testingTerminology = validateTestingTerminology(value.testingTerminology);
  if (value.phaseAccents !== undefined) {
    if (!value.phaseAccents || typeof value.phaseAccents !== 'object' || Array.isArray(value.phaseAccents)) throw Error('Ongeldige werkfasekleuren.');
    out.phaseAccents = {};
    for (const [key, palette] of Object.entries(value.phaseAccents)) {
      if (!['7','9','11','13','15'].includes(key) || !Object.hasOwn(exportPalettes, palette)) throw Error('Onbekende werkfasekleur.');
      out.phaseAccents[key] = palette;
    }
  }
  for (const k of ["profile", "basis", "focus", "accent", "colorMode", "filename"])
    if (value[k] !== undefined) {
      if (!text(value[k], 500)) throw Error("Ongeldige exportkeuze.");
      out[k] = value[k];
    }
  if (out.profile !== undefined && !["testing", "risk", "interview"].includes(out.profile))
    throw Error("Onbekende werkvorm.");
  for (const k of ["questions", "notes", "scopeFromInvestigation"])
    if (value[k] !== undefined) {
      if (typeof value[k] !== "boolean") throw Error("Ongeldige exportkeuze.");
      out[k] = value[k];
    }
  for (const k of ["fields", "excludedNorms"])
    if (value[k] !== undefined) {
      if (!Array.isArray(value[k]) || value[k].length > 1000 || value[k].some((v) => !text(v, 200)))
        throw Error("Ongeldige exportselectie.");
      out[k] = [...new Set(value[k])];
    }
  if (value.meta) {
    out.meta = {};
    for (const k of ["version", "author", "team", "scope", "change"]) {
      if (!text(value.meta[k], 2000)) throw Error("Ongeldige exportmetadata.");
      out.meta[k] = value.meta[k];
    }
  }
  if (value.interview) {
    const i = value.interview;
    if (
      !Array.isArray(i.levels) ||
      i.levels.some((v) => !["operational", "management", "strategic"].includes(v)) ||
      typeof i.starr !== "boolean" ||
      typeof i.triangulation !== "boolean" ||
      !i.overrides ||
      typeof i.overrides !== "object" ||
      Array.isArray(i.overrides)
    )
      throw Error("Ongeldige interviewkeuze.");
    out.interview = JSON.parse(JSON.stringify(i));
  }
  return out;
}
