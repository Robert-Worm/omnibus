import {createHash} from 'node:crypto';
import {readFile, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const normalize = value => String(value ?? '').normalize('NFC').trim().replace(/\s+/gu, ' ').toLocaleLowerCase('nl');
const textOf = value => typeof value === 'string' ? value : value?.text ?? '';

function indexById(items, label) {
  const index = new Map();
  for (const item of items) {
    if (typeof item.id !== 'string' || !item.id || index.has(item.id))
      throw Error(`Missing or duplicate ${label} ID: ${item.id}`);
    index.set(item.id, item);
  }
  return index;
}

// Deliberately no semantic verdict, ranking, visibility change or write to the app.
export function inventory({views, lines, points, target = 100}) {
  if (!Number.isSafeInteger(target) || target < 1) throw Error('Target must be a positive integer.');
  const lineIndex = indexById(lines, 'building-block');
  indexById(points, 'testing-point');
  indexById(views, 'workspace');
  const scopedViews = views.filter(view => ['themes', 'processes'].includes(view.axis));
  const pointsByLine = new Map();
  for (const point of points) {
    const group = pointsByLine.get(point.legacy_line_id) ?? [];
    group.push(point);
    pointsByLine.set(point.legacy_line_id, group);
  }
  const memberships = new Map();
  const workspaces = scopedViews.map(view => {
    if (!Array.isArray(view.lineIds)) throw Error(`Missing membership list: ${view.id}`);
    const ids = [...new Set(view.lineIds)].sort();
    for (const id of ids) {
      if (!lineIndex.has(id)) throw Error(`Unknown building-block ${id} in ${view.id}`);
      const group = memberships.get(id) ?? [];
      group.push(view.id);
      memberships.set(id, group);
    }
    const missingPointIds = ids.filter(id => !pointsByLine.has(id));
    return {
      id: view.id, title: view.title, axis: view.axis, buildingBlockCount: ids.length,
      testingPointCount: missingPointIds.length ? null : ids.reduce((sum, id) => sum + pointsByLine.get(id).length, 0),
      missingPointCatalogueFor: missingPointIds,
      reportCount: new Set(ids.map(id => lineIndex.get(id).report_id).filter(Boolean)).size,
      sizeReviewSuggested: ids.length > target, lineIds: ids,
    };
  });
  const exactGroups = new Map();
  const items = [...memberships].sort(([a], [b]) => a.localeCompare(b)).map(([id, workspaceIds]) => {
    const line = lineIndex.get(id), children = pointsByLine.get(id) ?? [];
    const risk = normalize(textOf(line.risk));
    const testingTexts = children.map(point => normalize(point.text));
    // Matching texts remain only candidates: actor, phases, exceptions, evidence
    // and source limitations can differ despite this exact-text signature.
    if (risk && testingTexts.length && testingTexts.every(Boolean)) {
      const key = hash([risk, [...testingTexts].sort()]);
      const group = exactGroups.get(key) ?? [];
      group.push(id);
      exactGroups.set(key, group);
    }
    return {
      id, title: line.title, reportId: line.report_id,
      workspaceIds: workspaceIds.sort(), pointIds: children.map(point => point.id).sort(),
      fingerprint: hash({line, points: children}),
    };
  });
  return {
    schema: 'omnibus-curation-inventory-1', status: 'INVENTORY_ONLY', target,
    basisFingerprint: hash({views: scopedViews, lines, points}),
    uniqueBuildingBlocks: items.length, workspaces, items,
    exactTextCandidates: [...exactGroups.values()].filter(ids => ids.length > 1).map(lineIds => ({
      status: 'NEEDS_SEMANTIC_REVIEW', lineIds,
    })),
    limitations: [
      'Checkout projection, not verification of the running database release.',
      'No similarity score or exact-text match proves equivalent scope or point coverage.',
      'Missing point catalogues are unknown, not zero testing points.',
      'Absence of exact-text candidates does not mean absence of semantic overlap.',
      'Fingerprints bind these records only; inspect and pin the referenced source evidence separately.',
    ],
  };
}

export async function inspectCheckout(root, target = 100) {
  const fromRoot = path => pathToFileURL(resolve(root, path)).href;
  // Trusted Omnibus checkout modules only. Do not import executable files from
  // supplied report packages. This tool does not start/import/rebuild a database.
  const app = await import(fromRoot('lib/application-catalogue.mjs'));
  const {default: catalogue} = await import(fromRoot('lib/report-point-catalogue.mjs'));
  const result = inventory({views: app.discoveryViews, lines: app.baseFramework.lines, points: catalogue.points, target});
  result.checkout = resolve(root);
  try {
    result.buildManifest = JSON.parse(await readFile(resolve(root, 'database-build/omnibus-release.json'), 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    result.buildManifest = null;
  }
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const args = process.argv.slice(2), options = {};
    for (let i = 0; i < args.length; i += 2) {
      if (!['--root', '--out', '--target'].includes(args[i]) || !args[i + 1] ||
          args[i + 1].startsWith('--') || Object.hasOwn(options, args[i]))
        throw Error('Usage: node inventory.mjs --root <trusted-checkout> [--target 100] [--out <new.json>]');
      options[args[i]] = args[i + 1];
    }
    if (!options['--root']) throw Error('--root is required.');
    const result = await inspectCheckout(options['--root'], options['--target'] === undefined ? 100 : Number(options['--target']));
    const output = JSON.stringify(result, null, 2) + '\n';
    if (options['--out']) {
      await writeFile(resolve(options['--out']), output, {encoding: 'utf8', flag: 'wx'});
      console.log(JSON.stringify({status: result.status, file: resolve(options['--out']),
        sizeReview: result.workspaces.filter(view => view.sizeReviewSuggested).map(({id, title, buildingBlockCount}) => ({id, title, buildingBlockCount})),
        exactTextCandidateGroups: result.exactTextCandidates.length}, null, 2));
    } else process.stdout.write(output);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
