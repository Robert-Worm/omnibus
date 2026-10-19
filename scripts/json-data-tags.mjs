import {readFileSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

// The two source corpora are data, not program text. Carrying them as JavaScript
// string literals makes V8 tokenise and compile ~25 MB of source before anything
// can run. Carried as <script type="application/json"> the HTML parser handles
// them instead and only JSON.parse touches them, which measured ~430 ms faster
// on the packaged build. Content, order and offsets are byte-identical: the same
// bytes are written to the tag and parsed back.
const TARGETS = [
  ['lib/foundations/source-documents.json', 'source-documents'],
  ['lib/foundations/source-passages.json', 'source-passages'],
  ...['catalogue','source-bank','filters','context','status','receipt','impact','pages'].map(name=>[`lib/wwke-reviewed/${name}.json`,`wwke-${name}`]),
];
const PREFIX = '\0omnibus-json-data:';
export const DATA_KEYS = TARGETS.map(([, key]) => key);
export const dataElementId = key => 'omnibus-data-' + key;

export function jsonDataTagPlugin({inlineInHtml=false}={}) {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const byPath = new Map(TARGETS.map(([p, key]) => [resolve(root, p), key]));
  const emitted = new Map();
  // Module loading can finish in a different order on another machine. Keep
  // delivery order tied to the source contract, not asynchronous build timing.
  const orderedEntries = () => DATA_KEYS.filter(key => emitted.has(key)).map(key => [key, emitted.get(key)]);
  return {
    name: 'omnibus-json-data-tags',
    enforce: 'pre',
    // Transitional web build preserves the existing non-executable JSON
    // transport for foundations not migrated yet. Do not turn them back into
    // tens of megabytes of JavaScript for the compiler to tokenize.
    transformIndexHtml: inlineInHtml ? {
      order: 'post',
      handler() {
        return orderedEntries().map(([key, text]) => ({tag:'script',
          attrs:{id:dataElementId(key),type:'application/json'},
          children:text.replaceAll('<','\\u003c'),injectTo:'body-prepend'}));
      },
    } : undefined,
    resolveId(source, importer) {
      if (!importer || (!source.startsWith('.') && !source.startsWith(root))) return null;
      const path = resolve(dirname(importer), source);
      return byPath.has(path) ? PREFIX + path + '.mjs' : null;
    },
    load(id) {
      if (!id.startsWith(PREFIX)) return null;
      const path = id.slice(PREFIX.length, -4);
      const key = byPath.get(path);
      // Minified exactly as the JSON import was inlined before: same parsed
      // structure and same character offsets inside the data, fewer bytes shipped.
      emitted.set(key, JSON.stringify(JSON.parse(readFileSync(path, 'utf8'))));
      // Parsed once at module load, exactly as the JSON import was.
      return `const el=document.getElementById(${JSON.stringify(dataElementId(key))});
if(!el)throw Error('Ontbrekend bronpakket in deze HTML: ${key}');
export default JSON.parse(el.textContent);`;
    },
    // Hand the raw JSON to the packaging step, which writes the tags before the bundle.
    writeBundle() {
      if(inlineInHtml)return;
      for (const [key, text] of orderedEntries()) {
        this.emitFile?.({type: 'asset', fileName: `data/${key}.json`, source: text});
      }
    },
    generateBundle() {
      if(inlineInHtml)return;
      for (const [key, text] of orderedEntries()) {
        this.emitFile({type: 'asset', fileName: `data/${key}.json`, source: text});
      }
    },
  };
}
