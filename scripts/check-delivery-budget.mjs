#!/usr/bin/env node
// Leveringsbudget (B-096): wat de browser bij openen en per bron binnenkrijgt, blijft binnen vaste grenzen, ook als er
// later inhoud bijkomt. Een overschrijding stopt de release met een aanwijzing hoe het op te lossen.
//
//   npm run check:delivery -- --settings <map>/local-build.json
import {DatabaseSync} from 'node:sqlite';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {readSettings} from './topic-package.mjs';

export const DELIVERY_BUDGET = Object.freeze({
  // Alles wat bij het openen van de pagina meekomt (de modules zonder hun uitgestelde delen).
  inlineBytes: 9_000_000,
  // Het begin van de Topical-module: overgangen en correcties horen per bron, niet hier.
  topicalInlineBytes: 1_500_000,
  // Wat de browser van één bron ophaalt als je die opent of een onderwerp kiest (zonder brontekst en archief).
  sourceBytes: 40_000_000,
});

/**
 * @param {{modules:Record<string,any>,refs:Record<string,{bytes:number}>,registrations:Record<string,string[]>}} value runtimepublicatie
 * @returns {{problems:string[],report:{inlineBytes:number,topicalInlineBytes:number,largestSources:[string,number][]}}}
 */
export function checkDeliveryBudget(value, budget = DELIVERY_BUDGET) {
  const problems = [], size = data => Buffer.byteLength(JSON.stringify(data));
  const inlineBytes = Object.values(value.modules).reduce((sum, module) => sum + size(module), 0);
  const topical = value.modules['lib/topical-reviewed.json'], topicalInlineBytes = topical ? size(topical) : 0;
  if (inlineBytes > budget.inlineBytes) problems.push(`Bij openen ${mb(inlineBytes)} (grens ${mb(budget.inlineBytes)}). Zet grote gegevens in een uitgestelde resource in plaats van in de module.`);
  if (topicalInlineBytes > budget.topicalInlineBytes) problems.push(`Topical-module bij openen ${mb(topicalInlineBytes)} (grens ${mb(budget.topicalInlineBytes)}). Verpak opnieuw: npm run content:revise -- --settings … --pack --out ….`);
  const perSource = new Map();
  for (const [key, ref] of Object.entries(value.refs)) {
    if (!key.startsWith('foundation:')) continue;
    const id = key.split(':')[1];
    perSource.set(id, (perSource.get(id) ?? 0) + ref.bytes);
  }
  for (const [id, bytes] of perSource) if (bytes > budget.sourceBytes)
    problems.push(`Bron ${id}: ${mb(bytes)} per keer openen (grens ${mb(budget.sourceBytes)}). Verpak opnieuw (archiefdelen eruit) of splits de bron.`);
  // Elk kader met een redactionele voorgeschiedenis moet verpakt zijn: anders haalt de browser die mee.
  for (const packet of topical?.packages ?? []) {
    const own = (value.registrations['lib/topical-reviewed.json'] ?? []).filter(key => key.startsWith(`foundation:${packet.id}:local:`));
    if (own.length && !packet.pointCounts) problems.push(`Kader ${packet.id} is niet verpakt voor de browser. Draai npm run content:revise -- --settings … --pack --out ….`);
  }
  return {problems, report: {inlineBytes, topicalInlineBytes, largestSources: [...perSource].sort((a, b) => b[1] - a[1]).slice(0, 5)}};
}
const mb = bytes => (bytes / 1e6).toFixed(1) + ' MB';

export function checkDeliveryBudgetDatabase(settings) {
  const db = new DatabaseSync(settings.database, {readOnly: true});
  try {
    const row = db.prepare('select payload from runtime_publications where release_id = ? and hash = ?').get(settings.release, settings.publication);
    if (!row) throw Error('De publicatie uit de instellingen staat niet in deze database.');
    return checkDeliveryBudget(JSON.parse(String(row.payload)));
  } finally { db.close(); }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2), file = args[args.indexOf('--settings') + 1];
  if (!args.includes('--settings') || !file) { console.error('Gebruik: npm run check:delivery -- --settings <local-build.json>'); process.exit(2); }
  const result = checkDeliveryBudgetDatabase(readSettings(file));
  console.log(JSON.stringify({status: result.problems.length ? 'OVER_BUDGET' : 'WITHIN_BUDGET', ...result}, null, 1));
  process.exit(result.problems.length ? 1 : 0);
}
