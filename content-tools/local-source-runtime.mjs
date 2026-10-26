// Data-only publication into a NEW database. No authoring, package execution or
// activation; the original intake/reviews and base publication remain immutable.
import { digest } from "../local-data/repository.mjs";
import { readLocalRuntimeBase, addLocalModels } from "./local-model-runtime.mjs";
import { localSourceSnapshot } from "./local-source-review.mjs";
import { projectLocalReportViewer } from "./local-report-viewer.mjs";
import { applyCatalogueEdits } from "../lib/catalogue-runtime.mjs";
import { projectLocalFrameworkViewer } from "./local-framework-viewer.mjs";
import { additionalProcesses } from "../lib/additional-processes.mjs";
import { reportDiscoveryProcesses } from "../lib/report-discovery.mjs";
import { sourceCollections } from "../lib/source-collections.mjs";

export const requireRuntime = (ok, message) => { if (!ok) throw Error("Local publication: " + message); };
export function hydratedModule(prepared, id) {
  const data = structuredClone(prepared.content.modules[id]);
  requireRuntime(data, "missing base module " + id);
  for (const key of prepared.content.registrations[id] ?? []) applyCatalogueEdits(data, prepared.resources[key]);
  return data;
}

export function appendRuntimeEdits(prepared, module, prefix, edits) {
  const keys = prepared.content.registrations[module] ??= [];
  let chunk = [];
  const flush = () => {
    if (!chunk.length) return;
    const key = prefix + ":local:" + module + ":" + keys.length;
    requireRuntime(!Object.hasOwn(prepared.resources, key), "duplicate delivery identity");
    requireRuntime(Buffer.byteLength(JSON.stringify(chunk)) <= 2 * 1024 * 1024, "individual delivery record exceeds 2 MiB");
    prepared.resources[key] = chunk; keys.push(key); chunk = [];
  };
  for (const edit of edits) {
    if (chunk.length && Buffer.byteLength(JSON.stringify([...chunk, edit])) > 900_000) flush();
    chunk.push(edit);
  }
  flush();
}
const arrayEdits = (path, rows) => rows.map(row => ({ path, value: [row] }));
const mapEdits = (path, values) => Object.entries(values).map(([key, value]) => ({ path, value: { [key]: value } }));
const unique = values => [...new Set(values)];
const safeKey = value => typeof value === "string" && value.length > 0 && !["__proto__", "constructor", "prototype"].includes(value);
function sourceDataOnly(value) {
  if (!value || typeof value !== "object") return;
  requireRuntime(!Object.hasOwn(value, "databaseSource") &&
    Object.keys(value).sort().join(",") !== "bytes,hash,release", "incoming source cannot supply delivery references");
  for (const child of Object.values(value)) sourceDataOnly(child);
}

function addReport(prepared, snapshot) {
  const { content, resources } = prepared, id = snapshot.manifest.package.id;
  requireRuntime(/^[a-zA-Z0-9_-]+$/.test(id), "report identity cannot be used as a delivery key");
  const { read } = localSourceSnapshot(snapshot.manifest, snapshot.files);
  const projected = projectLocalReportViewer({ app: read("APP-FINAL.json"), reuse: read("REUSE-CANDIDATE.json"),
    projection: read("REUSE-VIEWER-PROJECTION.json"), locators: read("POINT-SOURCE-LOCATORS.json").locators });
  requireRuntime(!["HOLD", "REJECT", "REJECTED"].includes(projected.catalogue.status), "report reuse projection is still HOLD");
  requireRuntime(projected.catalogue.points.every(point => ![point.selection_status, point.review_status]
    .some(status => ["HOLD", "REJECT", "REJECTED"].includes(status))), "report point remains HOLD");
  const moduleId = "app/report-additions.json", data = content.modules[moduleId], full = hydratedModule(prepared, moduleId);
  requireRuntime(Array.isArray(full.corpus) && Array.isArray(data.corpus), "missing report addition boundary");
  const prior = ["app/trial-corpus.json", "app/reviewed-reports.json", moduleId].flatMap(name => hydratedModule(prepared, name).corpus ?? []);
  const ids = new Set(prior.flatMap(app => [app.framework.report.id, ...app.framework.lines.map(line => line.id)]).map(id => id.toLowerCase()));
  const app = projected.additions.corpus[0], lines = app.framework.lines, cat = read("CATALOGUE.json");
  sourceDataOnly(projected); sourceDataOnly(cat);
  const processGroups = reportDiscoveryProcesses(cat.process_mappings,
    [...(content.modules["lib/process-catalogue.mjs"]?.processes ?? []), ...additionalProcesses]);
  requireRuntime([id, cat.theme.id, ...lines.map(line => line.id)].every(safeKey), "unsafe catalogue identity");
  requireRuntime(!ids.has(id.toLowerCase()) && lines.every(line => !ids.has(line.id.toLowerCase())), "existing report or norm identity cannot be replaced");
  const pointIds = new Set(["app/report-point-catalogue.json", "app/reviewed-reports.json", moduleId].flatMap(name => {
    const prior = hydratedModule(prepared, name);
    return (prior.catalogue?.points ?? prior.points ?? []).map(point => point.id.toLowerCase());
  }));
  requireRuntime(projected.catalogue.points.every(point => !pointIds.has(point.id.toLowerCase())), "point identity already exists");
  const lineIds = lines.map(line => line.id), theme = { ...cat.theme, lineIds, reportIds: [id] };
  // Keep the preceding corpus identity valid for saved projects. No incoming
  // package may supply its own historical acceptance hashes.
  data.history = [...(data.history ?? []), { content_hash: data.content_hash,
    reportIds: [...content.modules["app/reviewed-reports.json"].corpus, ...data.corpus].map(c => c.framework.report.id) }];
  data.prior_content_hash = data.content_hash;
  data.content_hash = digest(JSON.stringify([data.content_hash, snapshot.checked.manifestSha256]));
  const index = data.corpus.length, source = snapshot.documents[0];
  app.source = { ...app.source, pages: [], databaseSource: { schema: 1, release: prepared.pins.release,
    version: digest(source), indexHash: "pending-new-document-index" } };
  data.corpus.push({ ...app, framework: { ...app.framework, lines: [], evidence: [] } });
  const putTheme = rows => {
    const existing = rows.find(row => row.id === theme.id);
    if (!existing) rows.push(structuredClone(theme));
    else { requireRuntime(existing.title === theme.title, "theme identity has a different title");
      existing.lineIds = unique([...existing.lineIds, ...lineIds]); existing.reportIds = unique([...existing.reportIds, id]); }
  };
  putTheme(data.themes);
  data.process_mappings.push(...cat.process_mappings);
  data.researchPresets.push({ ...cat.preset, themeId: theme.id, ids: lineIds, groups: cat.groups.map(group => group.key) });
  (data.researchGroups ??= []).push(...cat.groups);
  const reason = "Lokaal toegelaten door de eigenaar na vastgelegde bron- en reviewcontroles; geen openbare vrijgave.";
  Object.assign(data.scopeDecisions, Object.fromEntries(lineIds.map(line => [line, ["retain", reason]])));
  data.catalogue.reports.push(...projected.catalogue.reports);
  const snapshots = Object.fromEntries(lines.map(line => [line.id, { line: JSON.stringify(line), sourceHash: app.framework.report.source_hash }]));
  const edits = [...arrayEdits(["corpus", index, "framework", "lines"], lines),
    ...arrayEdits(["corpus", index, "framework", "evidence"], app.framework.evidence), ...mapEdits(["scopeSnapshots"], snapshots)];
  for (const field of ["organizational_goals", "control_objectives", "interview_questions", "visual_sources", "locators"])
    edits.push(...arrayEdits([field], projected.additions[field]));
  for (const field of ["blocks", "points", "sources"]) edits.push(...arrayEdits(["catalogue", field], projected.catalogue[field]));
  appendRuntimeEdits(prepared, moduleId, "report:" + id, edits);
  const nav = resources.catalogue;
  requireRuntime(nav && content.modules["lib/application-catalogue.mjs"]?.ref, "missing catalogue navigation boundary");
  for (const key of ["legacyThemes", "themes", "workspaces"]) putTheme(nav[key]);
  const view = { id: "report:" + id, title: id + " · " + app.framework.report.title, lineIds, reportIds: [id] };
  nav.reportViews.push(view); nav.workspaces.push(structuredClone(view));
  for (const rows of [nav.discoveryViews, nav.themes, nav.workspaces]) {
    const localTheme = rows.find(row => row.id === "theme:local-" + theme.id);
    if (localTheme) { localTheme.lineIds = unique([...localTheme.lineIds, ...lineIds]); localTheme.reportIds = unique([...localTheme.reportIds, id]); }
    else rows.push({ ...theme, id: "theme:local-" + theme.id, categoryId: "local-" + theme.id, axis: "themes", description: theme.title });
  }
  nav.reportSummaries[id] = { normIds: lineIds, admittedIds: lineIds };
  for (const group of processGroups) for (const rows of [nav.discoveryViews, nav.themes, nav.workspaces]) {
    const row = rows.find(row => row.axis === "processes" && row.categoryId === group.id);
    if (row) { row.lineIds = unique([...row.lineIds, ...group.lineIds]); row.reportIds = unique([...row.reportIds, id]); }
    else rows.push({ id: "process:" + group.id, categoryId: group.id, axis: "processes", title: group.title,
      description: group.reason, keywords: group.title, lineIds: group.lineIds, reportIds: [id] });
  }
  Object.assign(content.routing.reports, Object.fromEntries(lineIds.map(line => [line, id])));
  for (const row of nav.workspaces) content.routing.workspaces[row.id] = row.reportIds;
  content.modules["lib/application-catalogue.mjs"].routing = structuredClone(content.routing);
  content.summary.reports += 1; content.summary.pages += source.pages.length;
}

function addFramework(prepared, snapshot) {
  const { read, lookup } = localSourceSnapshot(snapshot.manifest, snapshot.files);
  const packet = projectLocalFrameworkViewer({ catalogue: read("CATALOGUE.json"), bank: read("RECONCILED-SOURCE.json"),
    pages: read("source/pages.json"), status: read("SOURCE-STATUS.json"), pdfHash: lookup("source/source.pdf").file.sha256,
    reviewBasis: snapshot.basisHash, title: snapshot.manifest.package.title });
  sourceDataOnly(packet);
  const { content, resources } = prepared, moduleId = "lib/topical-reviewed.json", id = packet.id;
  // Derived document IDs must also satisfy the saved sourceDocumentHashes gate.
  requireRuntime(/^[a-zA-Z0-9-]+$/.test(id) && safeKey(id), "framework identity cannot be used as a delivery key");
  const data = content.modules[moduleId], nav = resources.catalogue;
  requireRuntime(Array.isArray(data?.packages) && nav?.foundationSummaries, "missing shared framework boundary");
  requireRuntime(!data.packages.some(p => p.id.toLowerCase() === id.toLowerCase()) && !Object.keys(nav.foundationSummaries).some(key=>key.toLowerCase()===id.toLowerCase()), "existing framework cannot be replaced");
  const index = data.packages.length, edits = [];
  for (const field of ["criteria", "points", "objectives", "goals", "source_dispositions", "issues"]) {
    edits.push(...arrayEdits(["packages", index, "catalogue", field], packet.catalogue[field])); packet.catalogue[field] = [];
  }
  edits.push(...arrayEdits(["packages", index, "bank", "records"], packet.bank.records)); packet.bank.records = [];
  appendRuntimeEdits(prepared, moduleId, "foundation:" + id, edits);
  const sourceEdits = arrayEdits(["packages", index, "documents", 0, "pages"], packet.documents[0].pages);
  packet.documents[0].pages = [];
  appendRuntimeEdits(prepared, moduleId, "source:" + id, sourceEdits);
  data.packages.push(packet);
  const original = read("CATALOGUE.json");
  nav.foundationSummaries[id] = { groups: new Set(original.points.map(p => p.chapter)).size,
    norms: original.criteria.length, pointIds: original.points.filter(p => p.selection_status === "SELECTABLE").map(p => p.id) };
}

export function prepareLocalSourceRuntime(settings, snapshots) {
  requireRuntime(snapshots.every(item => item.admission), "Every viewer package needs its own checked local-owner admission");
  const prepared = addLocalModels(readLocalRuntimeBase(settings), snapshots.filter(item => item.model));
  const runtime = prepared.content.modules["lib/application-catalogue.mjs"];
  requireRuntime(runtime?.ref, "missing pinned collection boundary");
  requireRuntime(runtime.collections || prepared.bundle.manifest.scope !== "local-database-only",
    "older local composition has no collection provenance; rebuild from its pinned public base");
  const collections = structuredClone(sourceCollections(runtime));
  if (!runtime.collections) collections.origins[0].publication = prepared.pins.publication;
  runtime.collections = collections;
  prepared.sourcePackages = true;
  const ids = new Set(prepared.bundle.packages.map(p => p.id.toLowerCase()));
  for (const snapshot of snapshots.filter(item => !item.model)) {
    requireRuntime(!ids.has(snapshot.manifest.package.id.toLowerCase()), "existing package cannot be replaced");
    ids.add(snapshot.manifest.package.id.toLowerCase());
    requireRuntime(snapshot.review.viewerShapeValidated, "shared viewer shape must pass before publication");
    if (snapshot.manifest.package.kind === "report") addReport(prepared, snapshot);
    else addFramework(prepared, snapshot);
  }
  for (const snapshot of snapshots) {
    const kind = snapshot.model ? "model" : snapshot.manifest.package.kind === "report" ? "report" : "foundation";
    const id = snapshot.model?.id ?? snapshot.manifest.package.id;
    requireRuntime(!Object.hasOwn(collections.sources[kind], id), "existing collection source cannot be replaced");
    const intake = snapshot.checked.manifestSha256;
    const origin = { id: "own:" + intake, kind: "own", intake };
    collections.origins.push(origin);
    collections.sources[kind][id] = origin.id;
  }
  return prepared;
}
