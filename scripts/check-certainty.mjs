#!/usr/bin/env node
// Read-only data scan. Package payloads are JSON, never imported or executed.
import {createHash} from 'node:crypto';
import {mkdirSync, realpathSync, writeFileSync} from 'node:fs';
import {dirname, extname, isAbsolute, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {CHECK_VERSION, REDENEN, voorcontrole} from '../lib/claim-certainty.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const hash = value => createHash('sha256').update(value).digest('hex');
const lijst = value => Array.isArray(value) ? value : [];
const tekst = value => typeof value === 'string' && value.trim();
const idLijst = value => lijst(value).filter(v => typeof v === 'string');

export function leesOpties(args) {
  const opties = {};
  for (let i = 0; i < args.length; i += 2) {
    const naam = args[i];
    if (!['--database','--release','--uit'].includes(naam) || Object.hasOwn(opties, naam.slice(2)) || !args[i+1] || args[i+1].startsWith('--'))
      throw Error('Gebruik --database, --release en --uit, elk eenmaal met een waarde.');
    opties[naam.slice(2)] = args[i+1];
  }
  if (!opties.database || !/^[a-f0-9]{64}$/u.test(opties.release || '') || !opties.uit)
    throw Error('Database, expliciete releasehash en privaat uitvoerbestand zijn verplicht.');
  return opties;
}

function verwijzingen(data) {
  return [...new Set([
    ...idLijst(data.evidence_ids), ...idLijst(data.source_record_ids),
    ...lijst(data.source_clauses).map(l => l?.record_id),
    ...lijst(data.source_links).map(l => l?.material_id || l?.record_id || l?.evidence_id),
  ].filter(v => typeof v === 'string'))];
}

/** Only explicit field/record bindings; no source-wide fallback or fuzzy joins. */
export function claimsUit(records) {
  const bank = new Map();
  for (const record of records.filter(r => ['evidence','source-link'].includes(r.kind))) {
    const d = record.payload?.data || {};
    const passages = typeof d.quote === 'string' ? [{id:record.id, tekst:d.quote}]
      : lijst(d.source_spans).filter(s => typeof s?.quote === 'string').map((s,i) => ({id:record.id + '/span-' + (i+1), tekst:s.quote}));
    // Ambiguous IDs across evidence/source-link records cannot silently select one.
    bank.set(record.id, bank.has(record.id) ? [] : passages.filter(p => p.tekst.trim()));
  }
  const claims = [];
  let ongedekteRecords = 0;
  for (const record of records.filter(r => ['norm','point'].includes(r.kind))) {
    const d = record.payload?.data || {};
    const velden = [];
    if (record.kind === 'norm') {
      if (typeof d.criterion?.text === 'string') velden.push({veld:'criterion.text', waarde:d.criterion, refs:verwijzingen(d.criterion)});
      else if (typeof d.auditNorm === 'string') velden.push({veld:'auditNorm', waarde:{text:d.auditNorm, basis:d.basis}, refs:verwijzingen(d), inline:true});
      else if (typeof d.text === 'string') velden.push({veld:'text', waarde:d, refs:verwijzingen(d)});
    } else {
      if (typeof d.text === 'string') velden.push({veld:'text', waarde:d, refs:verwijzingen(d)});
      if (typeof d.generic_variant?.text === 'string') {
        const eigenRefs = verwijzingen(d.generic_variant);
        velden.push({veld:'generic_variant.text', waarde:{...d.generic_variant, basis:d.generic_variant.basis || d.basis}, refs:eigenRefs.length ? eigenRefs : verwijzingen(d)});
      }
    }
    if (!velden.some(v => tekst(v.waarde.text))) ongedekteRecords++;
    for (const v of velden) {
      const passages = v.refs.flatMap(id => bank.get(id) || []);
      let ontbrekendeBinding = v.refs.some(id => !bank.get(id)?.length);
      if (v.inline && tekst(d.sourceText)) {
        // Existing inline evidence snapshot, not a proof that the original is intact.
        if (tekst(d.sourceHash) && tekst(d.sourceControlId)) passages.push({id:d.sourceControlId, tekst:d.sourceText});
        else ontbrekendeBinding = true;
      }
      claims.push({id:record.id, soort:record.kind, veld:v.veld, tekst:v.waarde.text,
        basis:v.waarde.basis || '', passages, ontbrekendeBinding,
        invoerHash:hash(JSON.stringify([v.waarde.text,v.waarde.basis || '',passages,v.refs])),
      });
    }
  }
  return {claims, ongedekteRecords};
}

export function scan(bronnen) {
  return bronnen.map(bron => {
    const {claims, ongedekteRecords} = claimsUit(bron.records);
    return {bron:bron.bron, versie:bron.versie, ongedekteRecords,
      records:bron.records.filter(r => ['norm','point'].includes(r.kind)).length,
      claims:claims.map(c => ({id:c.id, soort:c.soort, veld:c.veld, invoerHash:c.invoerHash,
        ...voorcontrole(c)})),
    };
  });
}

/** Open only a pinned release in a read-only transaction; never change active pointers. */
export async function scanDatabase(database, release) {
  if (!/^[a-f0-9]{64}$/u.test(release || '')) throw Error('Expliciete releasehash vereist.');
  const {DatabaseSync} = await import('node:sqlite');
  const db = new DatabaseSync(database, {readOnly:true, enableDoubleQuotedStringLiterals:false});
  try {
    db.exec('PRAGMA query_only=ON; BEGIN');
    if (!db.prepare('SELECT id FROM releases WHERE id=?').get(release)) throw Error('Onbekende release.');
    const pakketten = db.prepare(`SELECT p.source_id, p.version FROM packages p
      JOIN release_packages rp ON rp.version=p.version WHERE rp.release_id=?
      AND p.kind IN ('report','law','foundation') ORDER BY p.source_id,p.version`).all(release);
    const records = db.prepare(`SELECT id,kind,payload FROM records WHERE version=?
      AND kind IN ('norm','point','evidence','source-link') ORDER BY position,kind,id`);
    // Complete each package before loading another; source text does not leave this function.
    return pakketten.flatMap(p => scan([{bron:p.source_id, versie:p.version,
      records:records.all(p.version).map(r => ({id:r.id, kind:r.kind, payload:JSON.parse(r.payload)})),
    }]));
  } finally { db.close(); }
}

// IDs are data too. Refuse prose/markup/path-like IDs in a text-free report.
function veiligId(value) {
  return typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_./:-]{0,179}$/u.test(value) &&
    !value.includes('..') && !value.includes('://') && !/^[a-z]:/iu.test(value)
    ? value : 'id-sha256:' + hash(String(value));
}
export function rapport(resultaat, release) {
  const claims = resultaat.flatMap(b => b.claims);
  const tel = uitkomst => claims.filter(c => c.uitkomst === uitkomst).length;
  const r = ['# Zekerheidscontrole: signalen voor review', '',
    `Controleversie: ${CHECK_VERSION}. Release: ${veiligId(release)}.`, '',
    `Bronnen: ${resultaat.length}. Norm-/puntrecords: ${resultaat.reduce((n,b) => n+b.records,0)}. Velden: ${claims.length}.`,
    `HOLD: ${tel('HOLD')}. Geen signaal: ${tel('geen-signaal')}. Niet beoordeeld: ${tel('NIET_BEOORDEELD')}.`,
    `Records zonder ondersteund tekstveld: ${resultaat.reduce((n,b) => n+b.ongedekteRecords,0)}.`, '',
    'HOLD is een reviewaanwijzing, geen bewezen fout. Geen signaal is geen bevestiging van waarheid, actualiteit of bronintegriteit.',
    'Bestaande selecties en HOLD-statussen blijven ongewijzigd. Controleer de exacte passage en omliggende context vóór een inhoudelijk besluit.', '',
    '| Signaal | Aantal velden |', '| --- | ---: |',
    ...Object.keys(REDENEN).map(code => `| ${code} | ${claims.filter(c => c.meldingen.some(m => m.code === code)).length} |`), '',
  ];
  for (const b of resultaat) {
    r.push(`## ${veiligId(b.bron)}`, '', `Pakket: ${veiligId(b.versie)}. Records: ${b.records}. Velden: ${b.claims.length}. Ongedekte records: ${b.ongedekteRecords}.`,
      `HOLD: ${b.claims.filter(c => c.uitkomst === 'HOLD').length}. Geen signaal: ${b.claims.filter(c => c.uitkomst === 'geen-signaal').length}. Niet beoordeeld: ${b.claims.filter(c => c.uitkomst === 'NIET_BEOORDEELD').length}.`, '',
      '| Record | Veld | Uitkomst | Zin | Signaal | Bronbindingen | Invoerhash |', '| --- | --- | --- | ---: | --- | --- | --- |');
    for (const c of b.claims.filter(c => c.uitkomst !== 'geen-signaal')) {
      const meldingen = c.meldingen.length ? c.meldingen : [{zin:0,code:'geen-leesbare-claim-of-bron',bronIds:[]}];
      for (const m of meldingen) r.push(`| ${veiligId(c.id)} | ${veiligId(c.veld)} | ${c.uitkomst} | ${m.zin || '-'} | ${m.code} | ${m.bronIds.map(veiligId).join(', ') || '-'} | ${c.invoerHash} |`);
    }
    r.push('');
  }
  return r.join('\n') + '\n';
}

function privateUitvoer(uit) {
  const work = resolve(root, 'work');
  mkdirSync(work, {recursive:true});
  // Reject symlink/junction escapes, existing files and hardlinks. No overwrite mode.
  if (realpathSync(work) !== work) throw Error('work moet een eigen lokale map zijn.');
  const target = resolve(uit);
  const rel = relative(work, realpathSync(dirname(target)));
  if (isAbsolute(rel) || rel === '..' || rel.startsWith('..\\') || rel.startsWith('../') || extname(target) !== '.md')
    throw Error('Schrijf een nieuw .md-rapport in de eigen work-map.');
  return target;
}

export async function main(args = process.argv.slice(2)) {
  const {database, release, uit} = leesOpties(args);
  const target = privateUitvoer(uit);
  const resultaat = await scanDatabase(database, release);
  writeFileSync(target, rapport(resultaat, release), {encoding:'utf8', flag:'wx'});
  const hold = resultaat.reduce((n,b) => n + b.claims.filter(c => c.uitkomst === 'HOLD').length, 0);
  console.log(`Zekerheidscontrole: ${resultaat.length} bronnen, ${hold} velden met HOLD. Privaat rapport geschreven.`);
  return hold ? 2 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then(code => { process.exitCode = code; }).catch(() => {
    // JSON/SQLite errors may echo private input. Never forward their messages.
    console.error('Zekerheidscontrole mislukt. Controleer database, release en een nieuw .md-pad binnen de eigen work-map; geen rapport vrijgegeven.');
    process.exitCode = 1;
  });
}
