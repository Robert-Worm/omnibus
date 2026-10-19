import { activeProcesses, sourceDomains } from "./process-catalogue.mjs";
import { reviewedThemeIds } from './reviewed-reports.mjs';
import { reviewedThemeProcesses } from './reviewed-process-links.mjs';

// Editorial navigation aids for the Verzamel tabs, in the same spirit as the
// process catalogue itself: they help find a theme, a model or a process
// faster. They are not a normative classification, they do not claim complete
// coverage and they never state that a model is suitable for an audit.
// A filter only limits what a list shows; themes, models, their questions,
// their building blocks and their source references are untouched.

// Themes carry no domain or process of their own in the corpus: each one comes
// from a single report and its navigation subject is unique to it. These
// groupings are therefore authored here rather than derived, and are meant to
// be corrected by the audit team as the corpus grows.
export const themeSubjects = [
  {
    id: "informatie",
    title: "Informatie & beveiliging",
    themeIds: ["informatieveilig-gedrag", "backup-herstel", "informatie-op-orde", "gegevensbevragingen"],
  },
  {
    id: "beleid",
    title: "Beleid & uitvoering",
    themeIds: ["uitvoerbaarheid-beleid", "samenwerking-beleid-uitvoering", "crisisregelingen"],
  },
  { id: "dienstverlening", title: "Dienstverlening", themeIds: ["betaalprocessen"] },
  {
    id: "bedrijfsvoering",
    title: "Bedrijfsvoering & organisatie",
    themeIds: ["duurzame-bedrijfsvoering", "organisatie-inrichting"],
  },
];
// Neutral fallback for newly reviewed report themes: no inferred subject or
// normative process classification. Existing authored groupings remain unchanged.
const groupedThemeIds=new Set(themeSubjects.flatMap(group=>group.themeIds));
const otherReviewedThemes=reviewedThemeIds.filter(id=>!groupedThemeIds.has(id));
if(otherReviewedThemes.length)themeSubjects.push({id:'overige-rapportthemas',title:'Overige rapportthema’s',themeIds:otherReviewedThemes});

// Which process a theme is useful to look at from. A theme without an entry
// stays visible until a process is chosen; an empty mapping is honest where a
// theme has no counterpart in the process catalogue.
export const themeProcessIds = {
  "informatieveilig-gedrag": ["PR02", "PR10"],
  "backup-herstel": ["PR08", "PR10"],
  "uitvoerbaarheid-beleid": ["PR12"],
  "informatie-op-orde": ["PR11", "PR12"],
  "samenwerking-beleid-uitvoering": ["PR12"],
  betaalprocessen: ["PR12"],
  "duurzame-bedrijfsvoering": ["PR05", "PR06", "PR07"],
  "organisatie-inrichting": ["PR12"],
  gegevensbevragingen: ["PR02", "PR03"],
  crisisregelingen: ["PR10", "PR12"],
  cloudbeoordeling: reviewedThemeProcesses('cloudbeoordeling'),
};

// The models carry only an internal kind ('own', 'kaptein') and a single
// interview level, so a subject grouping is authored here as well. It follows
// what each model lets you investigate, as described in its own choice guide.
export const modelSubjects = [
  {
    id: "gedrag",
    title: "Gedrag & cultuur",
    modelIds: ["CEV-AI", "L01", "EDMONDSON", "WESTRUM", "CVF", "JUST-CULTURE"],
  },
  { id: "verandering", title: "Verandering", modelIds: ["ADKAR", "KOTTER", "COM-B"] },
  { id: "dienstverlening", title: "Dienstverlening", modelIds: ["KAD", "SERVQUAL"] },
  { id: "risico", title: "Risico & beheersing", modelIds: ["SWISS-CHEESE", "HRO", "FRAUD-DIAMOND"] },
];

// Which process a model gives a usable angle on. A suggestion for searching,
// never a statement that the model measures that process or fits the audit.
export const modelProcessIds = {
  "CEV-AI": ["PR12", "PR13"],
  L01: ["PR12", "PR13"],
  EDMONDSON: ["PR10", "PR13"],
  WESTRUM: ["PR10", "PR11", "PR12"],
  CVF: ["PR12"],
  "JUST-CULTURE": ["PR10", "PR13"],
  ADKAR: ["PR01", "PR08", "PR09"],
  KOTTER: ["PR01", "PR12"],
  "COM-B": ["PR01", "PR02", "PR11"],
  KAD: ["PR05", "PR12"],
  SERVQUAL: ["PR05", "PR10"],
  "SWISS-CHEESE": ["PR02", "PR10", "PR12"],
  HRO: ["PR01", "PR10"],
  "FRAUD-DIAMOND": ["PR02", "PR05", "PR12"],
};

const idsOf = (groups, id) => groups.find((g) => g.id === id);

/**
 * @template {{id:string}} T
 * @param {T[]} themes
 * @param {{subject?:string,processId?:string,openOnly?:boolean,openIds?:string[]}} [options]
 * @returns {T[]}
 */
export function filterThemes(themes, { subject = "all", processId = "", openOnly = false, openIds = [] } = {}) {
  const group = idsOf(themeSubjects, subject);
  return themes.filter(
    (t) =>
      (!group || group.themeIds.includes(t.id)) &&
      (!processId || (themeProcessIds[t.id] || []).includes(processId)) &&
      (!openOnly || openIds.includes(t.id)),
  );
}

/**
 * @template {{id:string,selected?:boolean}} T
 * @param {T[]} models
 * @param {{subject?:string,processId?:string,selectedOnly?:boolean}} [options]
 * @returns {T[]}
 */
export function filterModels(models, { subject = "all", processId = "", selectedOnly = false } = {}) {
  const group = idsOf(modelSubjects, subject);
  return models.filter(
    (m) =>
      (!group || group.modelIds.includes(m.id)) &&
      (!processId || (modelProcessIds[m.id] || []).includes(processId)) &&
      (!selectedOnly || m.selected),
  );
}

// A process does carry its own sources, so its domains are derived, not authored.
/** @param {{sourceIds?:string[]}} process */
export function processDomainIds(process) {
  return Object.keys(sourceDomains).filter((key) =>
    (process.sourceIds || []).some((id) => sourceDomains[key].ids.includes(id)),
  );
}

/**
 * @template {{id:string,sourceIds?:string[]}} T
 * @param {T[]} processes
 * @param {{domain?:string,sourceId?:string}} [options]
 * @returns {T[]}
 */
export function filterProcesses(processes, { domain = "all", sourceId = "" } = {}) {
  return processes.filter(
    (p) =>
      (domain === "all" || processDomainIds(p).includes(domain)) &&
      (!sourceId || (p.sourceIds || []).includes(sourceId)),
  );
}

// Only offer what can actually be chosen: domains and sources that occur in the
// visible process catalogue, so no filter can empty the list on its own.
export function processDomainOptions(processes = activeProcesses) {
  const used = new Set(processes.flatMap((p) => processDomainIds(p)));
  return [...used]
    .map((id) => ({ id, title: sourceDomains[id].title }))
    .sort((a, b) => a.title.localeCompare(b.title, "nl"));
}

/** @param {{id:string,title:string}[]} sources */
export function processSourceOptions(sources, processes = activeProcesses) {
  const used = new Set(processes.flatMap((p) => p.sourceIds || []));
  return sources
    .filter((s) => used.has(s.id))
    .map((s) => ({ id: s.id, title: s.title }))
    .sort((a, b) => a.title.localeCompare(b.title, "nl"));
}

// Only the processes a catalogue actually maps onto, so choosing one never
// leaves the reader with an empty list and no explanation.
/** @param {Record<string,string[]>} mapping */
export function processOptionsFrom(mapping, processes = activeProcesses) {
  const used = new Set(Object.values(mapping).flat());
  return processes
    .filter((p) => used.has(p.id))
    .map((p) => ({ id: p.id, title: p.title }))
    .sort((a, b) => a.title.localeCompare(b.title, "nl"));
}
