// Node-only compatibility proofs. Never import into the application.
// Reconstruct exact reviewed bytes; do not refresh judgments or approve content.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const read = name => readFileSync(new URL(name, import.meta.url));
function inverse({label, bytes, currentHash, closedHash, replacements}) {
  const fail = reason => { throw Error(`${label}: ${reason}`); };
  if (sha(bytes) !== currentHash) fail('unknown current module bytes');
  let previous = bytes.toString('utf8');
  for (const [current, closed] of replacements) {
    if (previous.split(current).length !== 2) fail('non-exact technical transition');
    previous = previous.replace(current, closed);
  }
  if (sha(previous) !== closedHash) fail('inverse differs from reviewed bytes');
  return Buffer.from(previous, 'utf8');
}

const readerBefore = 'ef3c932dc8d887a8c8762f0ef379aedee30fedfc01016c1db829d640fb0ac33f';
const readerAfter = 'efdc96f1c09d0c0abcca9c6cee62c3ee6619f0c3457080852c655dffb2909d43';
const blocksHash = '96097268f35d4c80196de7455f65950bdc3da237af99ac22b5e9c3d73dc73e36';
export function closedReportReaderBytes(readerBytes = read('./report-reader.mjs'), blocksBytes = read('./source-text-blocks.mjs')) {
  if (sha(blocksBytes) !== blocksHash) throw Error('AW exact layout compatibility: unknown extracted module bytes');
  const prefix = '// Pure source layout. No catalogue, UI, database or hosting dependencies.\n';
  const blocks = blocksBytes.toString('utf8');
  if (!blocks.startsWith(prefix)) throw Error('AW exact layout compatibility: unexpected extracted module header');
  return inverse({label: 'AW exact layout compatibility', bytes: readerBytes,
    currentHash: readerAfter, closedHash: readerBefore, replacements: [
      ['export { indexPages, rawUnits, readingBlocks } from "./source-text-blocks.mjs";\n', blocks.slice(prefix.length)],
    ]});
}

export function awLayoutCompatiblePackage(pkg) {
  if (pkg.sourceId !== 'AW') throw Error('AW exact layout compatibility: unsupported source');
  const previous = closedReportReaderBytes();
  const originals = new Map(pkg.records.map(record => [record.id, record]));
  const records = pkg.records.map(record => {
    if (record.shared?.moduleHashes?.['report-reader.mjs'] !== readerAfter)
      throw Error('AW exact layout compatibility: record reader hash differs from current bytes');
    return {...record, shared: {...record.shared, moduleHashes: {
      ...record.shared.moduleHashes, 'report-reader.mjs': readerBefore,
    }}};
  });
  return {...pkg, records, sourceRows: record => pkg.sourceRows(originals.get(record.id)),
    compatibility: {...pkg.compatibility, layoutTransition: {
      type: 'EXACT_SOURCE_LAYOUT_EXTRACTION', beforeHash: readerBefore, afterHash: readerAfter,
      extractedHash: blocksHash, inverseByteHash: sha(previous),
    }},
  };
}

export function closedEEDSourceBytes(sourceBytes = read('./foundations/eed-source.mjs'), guardBytes = read('./foundations/source-verification.mjs')) {
  if (sha(guardBytes) !== '7a913bb46b340831c42d46bb69b9e35d9337cdf7678dd7f2acb76e9fb14aa929')
    throw Error('EED exact coordinate compatibility: unknown verification guard bytes');
  return inverse({label: 'EED exact coordinate compatibility', bytes: sourceBytes,
    currentHash: '0c588f8eba4264da43c07b2180467d2c1af0637a1437cfb670ae13fed06ffeb6',
    closedHash: 'f78b66ca50d461c863416e27adae12d248ebd64e30c9e7f92827a6bd10b89bd1', replacements: [
      ["import {verifySourceCoordinates} from './source-verification.mjs';\n", ''],
      ['if(verifySourceCoordinates)for(const doc of Object.values(eedDocuments)){', 'for(const doc of Object.values(eedDocuments)){'],
    ]});
}

// Exact UI terminology changes only: no quotation, condition or source routing.
const noticeTransitions = new Map([
  ['2.5', ['Bronafwijking: de jaarlijkse review kent een micro-uitzondering. De norm onderscheidt jaarlijks en periodiek.',
    'Bronafwijking: de jaarlijkse review kent een micro-uitzondering. Het criterium onderscheidt jaarlijks en periodiek.']],
  ['4.4', ['Primaire aanvulling: op termijn niet uitsluitend op certificaten en auditrapporten steunen. Zie de norm voor de voorwaarden en eigen auditrechten.',
    'Primaire aanvulling: op termijn niet uitsluitend op certificaten en auditrapporten steunen. Zie het criterium voor de voorwaarden en eigen auditrechten.']],
  ['11.3', ['Bronafwijking: dreigingsmelding is vrijwillig. Klantinformatie en incidentmeldtermijnen hebben voorwaarden en uitzonderingen; die staan bij de norm.',
    'Bronafwijking: dreigingsmelding is vrijwillig. Klantinformatie en incidentmeldtermijnen hebben voorwaarden en uitzonderingen; die staan bij het criterium.']],
]);
export function closedSourceNoticeBytes(bytes = read('./source-cell-notices.mjs')) {
  return inverse({label: 'DORAFC exact label compatibility', bytes,
    currentHash: 'dfd9367d7c3fe965fdf1c420f76367c1482a7f5f8cda11e70802daadfaf498df',
    closedHash: 'bca7992925d6ed12042c5e3e6c5635869a19f8283ba8a839b80493d6e9fdb3fb',
    replacements: [...noticeTransitions.values()],
  });
}
export function dorafcLabelCompatiblePackage(pkg) {
  const fail = reason => { throw Error('DORAFC semantic review: exact label compatibility: ' + reason); };
  if (pkg.sourceId !== 'DORAFC') fail('unsupported source');
  const previous = closedSourceNoticeBytes();
  return {...pkg, sourceRows: record => {
    const rows = pkg.sourceRows(record), transition = noticeTransitions.get(record.id);
    if (!transition) return rows;
    if (rows.sourceNotice !== transition[0]) fail('unexpected source notice ' + record.id);
    return {...rows, sourceNotice: transition[1]};
  }, compatibility: {...pkg.compatibility, labelTransition: {
    type: 'EXACT_THREE_NORM_LABELS', ids: [...noticeTransitions.keys()], inverseByteHash: sha(previous),
  }}};
}
