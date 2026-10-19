import { prepareWebResources } from "../local-data/web-resources.mjs";
import { applyCatalogueEdits } from "../lib/catalogue-runtime.mjs";

const impactId = "lib/wwke-reviewed/impact.json";
const catalogueId = "lib/wwke-content.mjs";
const maxChunkBytes = 900_000;

// Operator-side delivery projection, after source review and before publication.
// Reuse the framework's existing loading boundary; no new API or content edition.
// Call only on the separate publication database, never during a web build.
export function prepareDeferredWwkeImpact(repository, publication) {
  const impact = publication.modules[impactId];
  if (!impact || !Array.isArray(impact.issues))
    throw Error("WWKE delivery projection requires the reviewed issue assessments.");
  if (publication.registrations[impactId]?.length)
    throw Error("WWKE issue assessments already have a delivery projection.");
  if (!impact.issues.length) return publication;

  const groups = new Set(
    (publication.registrations[catalogueId] ?? []).map(
      (key) => key.match(/^(foundation:[^:]+:)/)?.[1],
    ),
  );
  if (groups.size !== 1 || groups.has(undefined))
    throw Error("WWKE delivery projection requires one existing framework boundary.");
  const prefix = [...groups][0] + "wwke-impact:";
  const resources = {};
  const edit = (value) => [{ path: ["issues"], value }];
  let chunk = [],
    bytes = Buffer.byteLength(JSON.stringify(edit([]))),
    index = 0;
  const add = () => {
    const key = prefix + index++;
    if (Object.hasOwn(publication.refs, key)) throw Error("WWKE delivery resource collision.");
    resources[key] = edit(chunk);
    chunk = [];
    bytes = Buffer.byteLength(JSON.stringify(edit([])));
  };
  for (const issue of impact.issues) {
    const size = Buffer.byteLength(JSON.stringify(issue));
    if (Buffer.byteLength(JSON.stringify(edit([issue]))) > maxChunkBytes)
      throw Error("WWKE issue assessment exceeds the delivery chunk limit.");
    if (bytes + size + (chunk.length ? 1 : 0) > maxChunkBytes) add();
    bytes += size + (chunk.length ? 1 : 0);
    chunk.push(issue);
  }
  if (chunk.length) add();

  const projected = { ...impact, issues: [] };
  const restored = structuredClone(projected);
  for (const edits of Object.values(resources)) applyCatalogueEdits(restored, edits);
  if (JSON.stringify(restored) !== JSON.stringify(impact))
    throw Error("WWKE delivery projection changed the reviewed data or field order.");

  // All shape, size, collision and round-trip checks precede database writes.
  const refs = prepareWebResources(repository, publication.release, resources);
  return {
    ...publication,
    modules: { ...publication.modules, [impactId]: projected },
    refs: { ...publication.refs, ...refs },
    registrations: { ...publication.registrations, [impactId]: Object.keys(refs) },
  };
}

// Keep lookup keys in place so reports loaded in a different order still restore
// the exact original map order. Only the goal text waits for its owning report.
export function prepareDeferredReportGoals(repository, publication) {
  const ids = ["app/organizational-goals.json", "app/report-objectives.json"];
  const modules = { ...publication.modules },
    registrations = { ...publication.registrations };
  const resources = {};
  const existingKeys = Object.values(publication.registrations)
    .flat()
    .filter((key) => Object.hasOwn(publication.refs, key));
  for (const id of ids) {
    const original = publication.modules[id];
    if (
      !original ||
      typeof original !== "object" ||
      Array.isArray(original) ||
      publication.registrations[id]?.length
    )
      throw Error("Report goals require an unprojected reviewed lookup: " + id);
    const projected = {},
      groups = new Map();
    for (const [lineId, value] of Object.entries(original)) {
      const reportId = publication.routing.reports?.[lineId];
      if (
        !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(reportId ?? "") ||
        !existingKeys.some((key) => key.startsWith("report:" + reportId + ":")) ||
        ["__proto__", "constructor", "prototype"].includes(lineId) ||
        !value ||
        typeof value !== "object" ||
        Array.isArray(value)
      )
        throw Error("Report goal has no unambiguous existing report boundary: " + lineId);
      projected[lineId] = null;
      if (!groups.has(reportId)) groups.set(reportId, []);
      groups.get(reportId).push({ path: [lineId], value });
    }
    const keys = [];
    for (const [reportId, edits] of groups) {
      let chunk = [],
        bytes = 2,
        index = 0;
      const add = () => {
        const key = `report:${reportId}:${id}:goals:${index++}`;
        if (Object.hasOwn(publication.refs, key))
          throw Error("Report goal delivery resource collision.");
        resources[key] = chunk;
        keys.push(key);
        chunk = [];
        bytes = 2;
      };
      for (const edit of edits) {
        const size = Buffer.byteLength(JSON.stringify(edit));
        if (size + 2 > maxChunkBytes) throw Error("Report goal exceeds the delivery chunk limit.");
        if (bytes + size + (chunk.length ? 1 : 0) > maxChunkBytes) add();
        bytes += size + (chunk.length ? 1 : 0);
        chunk.push(edit);
      }
      if (chunk.length) add();
    }
    const restored = structuredClone(projected);
    // Deliberately restore backwards: request order must not reorder lookup keys.
    for (const key of [...keys].reverse()) applyCatalogueEdits(restored, resources[key]);
    if (JSON.stringify(restored) !== JSON.stringify(original))
      throw Error("Report goal delivery changed the reviewed data or field order.");
    modules[id] = projected;
    registrations[id] = keys;
  }
  if (!Object.keys(resources).length) return publication;
  const refs = prepareWebResources(repository, publication.release, resources);
  return { ...publication, modules, registrations, refs: { ...publication.refs, ...refs } };
}
