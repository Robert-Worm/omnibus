import {isDeepStrictEqual} from 'node:util';
import {applyCatalogueEdits} from '../lib/catalogue-runtime.mjs';

// A browser delivery projection, never a new source publication. Unknown fields
// stay at the full report boundary. Only explicit line/point relationships allow
// a field to move into a smaller part; no text matching or inferred evidence.
export function projectReportDelivery(content, readResource, {partBytes = 1024 * 1024} = {}) {
  if (!Number.isSafeInteger(partBytes) || partBytes < 1024) throw Error('Invalid report part size.');
  const reportLines = content.routing?.reports ?? {};
  const records = [], full = {}, counts = new Map(), pointLines = new Map();
  for (const [module, keys] of Object.entries(content.registrations)) {
    const selected = keys.filter(key => key.startsWith('report:'));
    if (!selected.length) continue;
    if (selected.length !== keys.length) throw Error('Unsupported mixed report delivery boundary: ' + module);
    full[module] = structuredClone(content.modules[module]);
    for (const key of selected) {
      const report = key.split(':')[1], edits = readResource(content.refs[key]);
      for (const edit of edits) {
        const before = edit.path.reduce((obj, k) => obj?.[k], full[module]);
        if (Array.isArray(before) && Array.isArray(edit.value)) {
          const label = JSON.stringify([module, edit.path]);
          const start = counts.get(label) ?? before.length;
          edit.value.forEach((value, i) => records.push({module, report, path: edit.path, value: [value], positions: [start + i]}));
          counts.set(label, start + edit.value.length);
        } else if (before && typeof before === 'object' && !Array.isArray(before) && edit.value && typeof edit.value === 'object' && !Array.isArray(edit.value)) {
          for (const [k, value] of Object.entries(edit.value)) records.push({module, report, path: edit.path, value: {[k]: value}, objectKey: k});
        } else records.push({module, report, ...edit});
        if (Array.isArray(edit.value)) for (const item of edit.value) {
          if (item?.id && item.legacy_line_id && reportLines[item.legacy_line_id] === report) pointLines.set(item.id, item.legacy_line_id);
        }
        // Preserve the exact publication application order as the reference.
        applyCatalogueEdits(full[module], [edit]);
      }
    }
  }
  if (!records.length) return null;
  const sourceOwners = new Map();
  for (const record of records) for (const point of record.positions ? record.value : []) {
    const line = pointLines.get(point?.id);
    if (!line) continue;
    for (const link of [...(point.source_links ?? []), ...(point.context_source_links ?? [])]) {
      const key = record.report + ':' + link.material_id;
      if (!sourceOwners.has(key)) sourceOwners.set(key, new Set());
      sourceOwners.get(key).add(line);
    }
  }
  // Group nearby norms rather than create one request per field/norm. Routing
  // below records every dependency, including resources shared by several rows.
  function owners(record) {
    const value = record.positions ? record.value[0] : record.value;
    const candidates = [record.objectKey, ...record.path.filter(k => typeof k === 'string')];
    if (value && typeof value === 'object') {
      candidates.push(value.id, value.legacy_line_id, value.line?.id,
        ...(value.legacy_line_ids ?? []), ...(value.linked_line_ids ?? []), ...(value.context_line_ids ?? []),
        ...(sourceOwners.get(record.report + ':' + value.id) ?? []));
      for (const id of [value.point_id, ...(value.point_ids ?? []), ...(value.supports_point_ids ?? [])]) candidates.push(pointLines.get(id));
    }
    return [...new Set(candidates.filter(id => reportLines[id] === record.report))];
  }
  const groups = new Map();
  for (const record of records) {
    const ids = owners(record), bucket = record.report + (ids.length ? ':items' : ':shared');
    const list = groups.get(bucket) ?? [];
    list.push({...record, ids}); groups.set(bucket, list);
  }
  const parts = [], routing = Object.create(null);
  function finish(report, items, shared) {
    if (!items.length) return;
    const key = 'report:' + report + ':' + (shared ? 'shared' : 'part') + ':' + parts.length;
    const modules = {}, paths = new Map();
    for (const {module, path, value, positions, ids} of items) {
      const label = JSON.stringify([module, path]);
      const previous = paths.get(label);
      if (positions && previous?.positions) { previous.value.push(...value); previous.positions.push(...positions); }
      else if (!positions && previous && !Array.isArray(value) && value && typeof value === 'object' && previous.value && typeof previous.value === 'object' && !Array.isArray(previous.value)) Object.assign(previous.value, value);
      else {
        const edit = {path, value: structuredClone(value), ...(positions ? {positions: [...positions]} : {})};
        (modules[module] ??= []).push(edit); paths.set(label, edit);
      }
      for (const id of ids) { (routing[id] ??= new Set()).add(key); }
    }
    // Grouping by line can change encounter order; positions remain canonical.
    for (const edits of Object.values(modules)) for (const edit of edits) if (edit.positions) {
      const pairs = edit.positions.map((p, i) => [p, edit.value[i]]).sort((a, b) => a[0] - b[0]);
      edit.positions = pairs.map(pair => pair[0]); edit.value = pairs.map(pair => pair[1]);
    }
    parts.push({key, modules});
  }
  // A small report fits in one delivery part: do not charge an extra round trip
  // merely to separate its shared evidence from its norms.
  for (const report of new Set(records.map(record => record.report))) {
    const shared = groups.get(report + ':shared') ?? [], items = groups.get(report + ':items') ?? [];
    if (shared.length && items.length && Buffer.byteLength(JSON.stringify([...shared, ...items])) <= partBytes) {
      groups.set(report + ':shared', [...shared, ...items]); groups.delete(report + ':items');
    }
  }
  for (const [bucket, items] of groups) {
    const [report, kind] = bucket.split(':');
    // Keep all fields of the same norm close, including its admission snapshot.
    items.sort((a, b) => a.ids.join('\0') < b.ids.join('\0') ? -1 : a.ids.join('\0') > b.ids.join('\0') ? 1 : 0);
    let chunk = [], bytes = 0;
    for (const item of items) {
      const size = Buffer.byteLength(JSON.stringify(item));
      if (chunk.length && bytes + size > partBytes) { finish(report, chunk, kind === 'shared'); chunk = []; bytes = 0; }
      chunk.push(item); bytes += size;
    }
    finish(report, chunk, kind === 'shared');
  }
  const registrations = {};
  for (const moduleId of Object.keys(full)) registrations[moduleId] = [];
  for (const part of parts) for (const moduleId of Object.keys(part.modules)) registrations[moduleId].push({key: part.key + ':' + moduleId, bundle: part.modules, module: moduleId});
  // Any unfamiliar layout that cannot be restored exactly stops the build.
  // Reverse order exercises late insertion, not just the happy initial order.
  for (const [module, expected] of Object.entries(full)) {
    const restored = structuredClone(content.modules[module]);
    for (const part of [...parts].reverse()) if (part.modules[module]) applyCatalogueEdits(restored, part.modules[module]);
    if (!isDeepStrictEqual(restored, expected)) throw Error('Report delivery round-trip changed content: ' + module);
  }
  return {registrations, routing: Object.fromEntries(Object.entries(routing).map(([id, keys]) => [id, [...keys]]))};
}
