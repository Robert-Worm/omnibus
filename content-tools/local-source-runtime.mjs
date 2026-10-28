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
  edits.push(...mapEdits(["interviewReviews"], projected.additions.interviewReviews));
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
  edits.push(...mapEdits(["interviewReviews"], packet.catalogue.interviewReviews ?? {}));
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

// A correction replaces only a previously admitted local source, after the
// ordinary source gate has checked BOTH versions and dependency reviews.
const same = (left, right, label) => requireRuntime(digest(left) === digest(right), "correction differs from current " + label);
function frameworkPacket(snapshot) {
  const { read, lookup } = localSourceSnapshot(snapshot.manifest, snapshot.files);
  return projectLocalFrameworkViewer({ catalogue: read("CATALOGUE.json"), bank: read("RECONCILED-SOURCE.json"),
    pages: read("source/pages.json"), status: read("SOURCE-STATUS.json"), pdfHash: lookup("source/source.pdf").file.sha256,
    reviewBasis: snapshot.basisHash, title: snapshot.manifest.package.title });
}
function reportPacket(snapshot) {
  const { read } = localSourceSnapshot(snapshot.manifest, snapshot.files);
  return projectLocalReportViewer({ app: read("APP-FINAL.json"), reuse: read("REUSE-CANDIDATE.json"),
    projection: read("REUSE-VIEWER-PROJECTION.json"), locators: read("POINT-SOURCE-LOCATORS.json").locators });
}
function replaceRows(rows, before, after, label) {
  same(before.map(row => row.id ?? row.point_id), after.map(row => row.id ?? row.point_id), label + " identity inventory");
  for (const [i, old] of before.entries()) {
    const matches = rows.map((row, index) => digest(row) === digest(old) ? index : -1).filter(index => index >= 0);
    requireRuntime(matches.length === 1, "correction requires exactly one unchanged published " + label);
    rows[matches[0]] = structuredClone(after[i]);
  }
}
function removeSourceDelivery(prepared, moduleId, prefixes) {
  const keys = prepared.content.registrations[moduleId] ?? [];
  const removed = keys.filter(key => prefixes.some(prefix => key.startsWith(prefix)));
  requireRuntime(removed.length > 0, "correction requires original source delivery fragments");
  for (const key of removed) {
    requireRuntime(Object.entries(prepared.content.registrations).every(([id, registrations]) => id === moduleId || !registrations.includes(key)),
      "correction cannot rewrite a shared delivery fragment");
    delete prepared.resources[key];
  }
  prepared.content.registrations[moduleId] = keys.filter(key => !removed.includes(key));
}
function replaceFramework(prepared, before, after) {
  const moduleId = "lib/topical-reviewed.json", data = hydratedModule(prepared, moduleId);
  const old = frameworkPacket(before), next = frameworkPacket(after);
  sourceDataOnly(next);
  const index = data.packages.findIndex(packet => packet.id === old.id);
  requireRuntime(index >= 0, "correction framework is missing from current viewer");
  same(data.packages[index], old, "framework viewer");
  for (const field of ["goals", "objectives", "criteria", "points"])
    same(old.catalogue[field].map(row => row.id), next.catalogue[field].map(row => row.id), field + " identity inventory");
  data.packages[index] = structuredClone(next);
  for (const key of Object.keys(old.catalogue.interviewReviews ?? {})) delete data.interviewReviews[key];
  Object.assign(data.interviewReviews ??= {}, structuredClone(next.catalogue.interviewReviews ?? {}));
  removeSourceDelivery(prepared, moduleId, ["foundation:" + old.id + ":", "source:" + old.id + ":"]);
  const edits = [], sources = [];
  edits.push(...mapEdits(["interviewReviews"], next.catalogue.interviewReviews ?? {}));
  for (const field of ["criteria", "points", "objectives", "goals", "source_dispositions", "issues"]) {
    edits.push(...arrayEdits(["packages", index, "catalogue", field], next.catalogue[field])); next.catalogue[field] = [];
  }
  edits.push(...arrayEdits(["packages", index, "bank", "records"], next.bank.records)); next.bank.records = [];
  for (const [j, document] of next.documents.entries()) {
    sources.push(...arrayEdits(["packages", index, "documents", j, "pages"], document.pages)); document.pages = [];
  }
  prepared.content.modules[moduleId].packages[index] = next;
  appendRuntimeEdits(prepared, moduleId, "foundation:" + old.id + ":correction:" + after.checked.manifestSha256, edits);
  appendRuntimeEdits(prepared, moduleId, "source:" + old.id + ":correction:" + after.checked.manifestSha256, sources);
  same(hydratedModule(prepared, moduleId), data, "complete corrected framework module");
  const cat = localSourceSnapshot(after.manifest, after.files).read("CATALOGUE.json");
  prepared.resources.catalogue.foundationSummaries[old.id] = { groups: new Set(cat.points.map(point => point.chapter)).size,
    norms: cat.criteria.length, pointIds: cat.points.filter(point => point.selection_status === "SELECTABLE").map(point => point.id) };
}
function replaceReport(prepared, before, after) {
  const moduleId = "app/report-additions.json", data = hydratedModule(prepared, moduleId);
  const old = reportPacket(before), next = reportPacket(after), id = before.manifest.package.id;
  sourceDataOnly(next);
  const insertionIndex = (prepared.content.registrations[moduleId] ?? []).findIndex(key => key.startsWith("report:" + id + ":"));
  requireRuntime(insertionIndex >= 0, "correction report delivery is missing");
  const readBefore = localSourceSnapshot(before.manifest, before.files).read;
  const readAfter = localSourceSnapshot(after.manifest, after.files).read;
  // Group/routing migrations have wider ownership than a content correction.
  for (const field of ["theme", "groups", "preset", "process_mappings"])
    same(readBefore("CATALOGUE.json")[field], readAfter("CATALOGUE.json")[field], "report navigation " + field);
  same(before.manifest.package.title, after.manifest.package.title, "report title");
  const oldApp = old.additions.corpus[0], nextApp = next.additions.corpus[0];
  same(oldApp.framework.report.title, nextApp.framework.report.title, "report navigation title");
  same(oldApp.framework.lines.map(line => line.id), nextApp.framework.lines.map(line => line.id), "report line identities");
  const index = data.corpus.findIndex(app => app.framework.report.id === id);
  requireRuntime(index >= 0, "correction report is missing from current viewer");
  const app = data.corpus[index], original = structuredClone(app);
  same(app.source.databaseSource?.version, digest(before.documents[0]), "report document version");
  delete original.source.databaseSource; original.source.pages = before.documents[0].pages;
  same(original, oldApp, "report viewer");
  nextApp.source = { ...nextApp.source, pages: [], databaseSource: { schema: 1, release: prepared.pins.release,
    version: digest(after.documents[0]), indexHash: "pending-new-document-index" } };
  data.corpus[index] = nextApp;
  for (const [key, capsule] of Object.entries(old.additions.interviewReviews)) {
    same(data.interviewReviews?.[key], capsule, "report interview review");
    delete data.interviewReviews[key];
  }
  Object.assign(data.interviewReviews, structuredClone(next.additions.interviewReviews));
  for (const field of ["organizational_goals", "control_objectives", "interview_questions", "visual_sources", "locators"])
    replaceRows(data[field], old.additions[field], next.additions[field], field);
  for (const field of ["reports", "blocks", "points", "sources"])
    replaceRows(data.catalogue[field], old.catalogue[field], next.catalogue[field], "report catalogue " + field);
  for (const [i, line] of oldApp.framework.lines.entries()) {
    same(data.scopeSnapshots[line.id], { line: JSON.stringify(line), sourceHash: oldApp.framework.report.source_hash }, "report scope snapshot");
    data.scopeSnapshots[line.id] = { line: JSON.stringify(nextApp.framework.lines[i]), sourceHash: nextApp.framework.report.source_hash };
  }
  data.history = [...(data.history ?? []), { content_hash: data.content_hash,
    reportIds: [...hydratedModule(prepared, "app/reviewed-reports.json").corpus, ...data.corpus].map(app => app.framework.report.id) }];
  data.prior_content_hash = data.content_hash;
  data.content_hash = digest(JSON.stringify([data.content_hash, after.checked.manifestSha256]));
  const skeleton = prepared.content.modules[moduleId];
  skeleton.corpus[index] = { ...nextApp, framework: { ...nextApp.framework, lines: [], evidence: [] } };
  for (const field of ["history", "prior_content_hash", "content_hash"]) skeleton[field] = data[field];
  skeleton.catalogue.reports = data.catalogue.reports;
  removeSourceDelivery(prepared, moduleId, ["report:" + id + ":"]);
  const edits = [...arrayEdits(["corpus", index, "framework", "lines"], nextApp.framework.lines),
    ...arrayEdits(["corpus", index, "framework", "evidence"], nextApp.framework.evidence),
    ...mapEdits(["scopeSnapshots"], Object.fromEntries(nextApp.framework.lines.map(line => [line.id, data.scopeSnapshots[line.id]])))];
  edits.push(...mapEdits(["interviewReviews"], next.additions.interviewReviews));
  for (const field of ["organizational_goals", "control_objectives", "interview_questions", "visual_sources", "locators"])
    edits.push(...arrayEdits([field], next.additions[field]));
  for (const field of ["blocks", "points", "sources"]) edits.push(...arrayEdits(["catalogue", field], next.catalogue[field]));
  // Put new report fragments where the old ones occurred, preserving ordering
  // of shared arrays belonging to every other report.
  const oldKeys = prepared.content.registrations[moduleId].length;
  appendRuntimeEdits(prepared, moduleId, "report:" + id + ":correction:" + after.checked.manifestSha256, edits);
  const keys = prepared.content.registrations[moduleId], added = keys.splice(oldKeys);
  keys.splice(insertionIndex, 0, ...added);
  same(hydratedModule(prepared, moduleId), data, "complete corrected report module");
  prepared.content.summary.pages += after.documents[0].pages.length - before.documents[0].pages.length;
}

export function prepareLocalSourceCorrection(settings, previous, current, previousBundle) {
  requireRuntime([...previous, ...current].every(item => !item.model && item.admission), "correction requires admitted source packages");
  const prepared = readLocalRuntimeBase(settings), { bundle, content } = prepared;
  const collections = content.modules["lib/application-catalogue.mjs"].collections;
  requireRuntime(collections, "correction requires retained local source provenance");
  // Compare every archived byte and record. A matching package ID alone can
  // never authorize replacing a different edition or an unrelated publication.
  for (const packet of previousBundle.packages) {
    const admitted = { ...packet, records: packet.records.map(record => ({ ...record,
      status: record.data?.selection_status === "HOLD" ? "HOLD" : "LOCAL_OWNER_ADMITTED" })) };
    same(bundle.packages.find(item => item.id === packet.id) ?? null, admitted, "package " + packet.id);
  }
  for (const field of ["documents", "artifacts"]) for (const row of previousBundle[field]) {
    const key = field === "documents" ? "id" : "name";
    same(bundle[field].find(item => item[key] === row[key]) ?? null, row, field + " " + row[key]);
  }
  for (const before of previous) {
    const id = before.manifest.package.id, after = current.find(item => item.manifest.package.id === id);
    requireRuntime(after && before.manifest.package.kind === after.manifest.package.kind, "correction scope/kind differs");
    same(before.documents.map(doc => doc.id), after.documents.map(doc => doc.id), "document identities");
    const kind = before.manifest.package.kind === "report" ? "report" : "foundation";
    const origin = collections.origins.find(origin => origin.id === collections.sources[kind][id]);
    requireRuntime(origin?.kind === "own" && origin.intake === before.checked.manifestSha256, "correction must match current local origin");
    if (kind === "report") replaceReport(prepared, before, after); else replaceFramework(prepared, before, after);
    const intake = after.checked.manifestSha256, nextOrigin = { id: "own:" + intake, kind: "own", intake };
    if (!collections.origins.some(origin => origin.id === nextOrigin.id)) collections.origins.push(nextOrigin);
    collections.sources[kind][id] = nextOrigin.id;
  }
  // The existing append-only writer still rejects every collision. Remove only
  // exact checked old rows from this in-memory copy, never from the input DB.
  const archived = { manifest: bundle.manifest };
  for (const field of ["packages", "documents", "artifacts"]) {
    const key = field === "artifacts" ? "name" : "id", replaced = new Set(previousBundle[field].map(row => row[key]));
    archived[field] = bundle[field].filter(row => replaced.has(row[key]));
    bundle[field] = bundle[field].filter(row => !replaced.has(row[key]));
  }
  bundle.artifacts.push({ name: "correction-history/" + prepared.pins.release, data: archived });
  prepared.sourcePackages = true;
  return prepared;
}
