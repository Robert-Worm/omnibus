import {dirname, resolve, isAbsolute, relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {CatalogueRepository} from '../local-data/repository.mjs';
import {readRuntimePublication,validateRuntimeModules} from '../local-data/runtime-publication.mjs';
import {runtimeContract} from '../lib/runtime-contract.mjs';
import {runtimeContractHash} from '../lib/runtime-contract-identity.mjs';
export {runtimeContractHash} from '../lib/runtime-contract-identity.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const dataPrefix = 'omnibus-data:';
const virtualPrefix = '\0omnibus-published:';
const quote = JSON.stringify;

/** Build code against an already published database. Never imports author files.
 * @param {{release?:string, publication?:string, databasePath?:string,
 * transportModule?:string, runtimeTarget?:'local-preview'|'portable-local'}} options
 */
export function publishedCataloguePlugin({release, publication, databasePath, transportModule, runtimeTarget='local-preview'} = {}) {
  let content;
  const moduleId = source => relative(root, source).replaceAll('\\','/');
  return {
    name:'omnibus-published-catalogue', enforce:'pre',
    buildStart() {
      if (!databasePath) throw Error('An explicit private database path is required.');
      const repository = new CatalogueRepository(resolve(databasePath), {readOnly:true});
      try {
        content = readRuntimePublication(repository, {release,publication,contract:runtimeContractHash});
      } finally { repository.close(); }
      validateRuntimeModules(content, runtimeContract);
    },
    resolveId(source, importer) {
      if (source.startsWith(dataPrefix)) {
        const id = source.slice(dataPrefix.length);
        if (!Object.hasOwn(runtimeContract,id)) throw Error('Unknown runtime data module: '+id);
        return virtualPrefix+'data:'+id+'.mjs';
      }
      if (!importer || !(source.startsWith('.') || source.startsWith('@/') || isAbsolute(source))) return null;
      const absolute = source.startsWith('@/') ? resolve(root,source.slice(2)) : resolve(dirname(importer),source);
      const id = moduleId(absolute);
      if (id === 'lib/database-source-client.mjs' && transportModule) return resolve(transportModule).replaceAll('\\','/');
      if (id === 'lib/application-mode.mjs') return virtualPrefix+'mode';
      const entry = runtimeContract[id];
      if (!entry) return null;
      return entry.kind === 'adapter' ? resolve(root,entry.file) : virtualPrefix+'exports:'+id+'.mjs';
    },
    load(id) {
      if (!id.startsWith(virtualPrefix)) return null;
      if (!content) throw Error('Publication must be verified before loading modules.');
      if (id === virtualPrefix+'mode') return 'export const databaseSourcesEnabled=true;';
      const key = id.slice(virtualPrefix.length,-4);
      if (key.startsWith('exports:')) {
        const original = key.slice('exports:'.length), entry = runtimeContract[original];
        const first = `import data from ${quote(dataPrefix+original)};\n`;
        if (entry.kind === 'json') return first+`export default data${entry.property?'.'+entry.property:''};`;
        // Keep independent static exports tree-shakeable. Importing one title must
        // not retain every record from the same authoring module in the browser.
        if (content.registrations[original]?.length) throw Error('Mutable export module requires an adapter: '+original);
        return entry.names.map(name=>{
          if (!Object.hasOwn(content.modules[original],name)) throw Error('Missing runtime export: '+name);
          return `export const ${name}=/*#__PURE__*/JSON.parse(${quote(quote(content.modules[original][name]))});`;
        }).join('\n');
      }
      const original = key.slice('data:'.length);
      // JSON.parse preserves literal __proto__ keys as data, unlike a JS object literal.
      const lines = [`const data=/*#__PURE__*/JSON.parse(${quote(quote(content.modules[original]))});`];
      const keys = content.registrations[original] || [];
      if (keys.length) {
        lines.push(`import {registerCatalogueResource,applyCatalogueEdits} from ${quote(resolve(root,'lib/catalogue-runtime.mjs'))};`);
        lines.push(`import {databaseSourceClient} from ${quote(resolve(root,'lib/database-source-client.mjs'))};`);
        for (const key of keys) lines.push(`registerCatalogueResource(${quote(key)},()=>databaseSourceClient.content(${quote(content.refs[key])}),value=>applyCatalogueEdits(data,value));`);
      }
      lines.push('export default data;');
      return lines.join('\n');
    },
    generateBundle() {
      this.emitFile({type:'asset',fileName:'omnibus-release.json',source:quote({
        schema:1,release,publication,contract:runtimeContractHash,runtimeTarget,
        scope:'catalogue-norms-sources-and-models-on-demand',...content.summary,
        resources:Object.keys(content.refs).length,
        contentBytes:Object.values(content.refs).reduce((n,r)=>n+r.bytes,0),refs:content.refs,
      })});
    },
  };
}
