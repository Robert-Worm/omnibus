import {dirname, resolve, isAbsolute, relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {CatalogueRepository} from '../local-data/repository.mjs';
import {readRuntimePublication,validateRuntimeModules} from '../local-data/runtime-publication.mjs';
import {runtimeContract} from '../lib/runtime-contract.mjs';
import {runtimeContractHash} from '../lib/runtime-contract-identity.mjs';
import {buildReportOverviews} from './build-report-overviews.mjs';
export {runtimeContractHash} from '../lib/runtime-contract-identity.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const dataPrefix = 'omnibus-data:';
const virtualPrefix = '\0omnibus-published:';
const quote = JSON.stringify;
// Safe JS string/object literal for generated module code: escape characters that could
// end a surrounding context (<, >, /) and line separators. JSON.parse/JS decode them identically.
const code = (value) => JSON.stringify(value).replace(/[<>/\u2028\u2029]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));

/** Build code against an already published database. Never imports author files.
 * @param {{release?:string, publication?:string, databasePath?:string,
 * transportModule?:string, reportOverviews?:boolean, emitManifest?:boolean, runtimeTarget?:'local-preview'|'portable-local'}} options
 */
export function publishedCataloguePlugin({release, publication, databasePath, transportModule, reportOverviews=false, emitManifest=true, runtimeTarget='local-preview'} = {}) {
  let content, overviews;
  const moduleId = source => relative(root, source).replaceAll('\\','/');
  return {
    name:'omnibus-published-catalogue', enforce:'pre',
    async buildStart() {
      if (!databasePath) throw Error('An explicit private database path is required.');
      const repository = new CatalogueRepository(resolve(databasePath), {readOnly:true});
      try {
        content = readRuntimePublication(repository, {release,publication,contract:runtimeContractHash});
      } finally { repository.close(); }
      validateRuntimeModules(content, runtimeContract);
      if(reportOverviews)overviews=await buildReportOverviews({release,publication,databasePath},content,publishedCataloguePlugin);
    },
    resolveId(source, importer) {
      if(source.startsWith('omnibus-report-overview:'))return virtualPrefix+source;
      if (source.startsWith(dataPrefix)) {
        const id = source.slice(dataPrefix.length);
        if (!Object.hasOwn(runtimeContract,id)) throw Error('Unknown runtime data module: '+id);
        return virtualPrefix+'data:'+id+'.mjs';
      }
      if (!importer || !(source.startsWith('.') || source.startsWith('@/') || isAbsolute(source))) return null;
      const absolute = source.startsWith('@/') ? resolve(root,source.slice(2)) : resolve(dirname(importer),source);
      const id = moduleId(absolute);
      if(id==='lib/report-overview-resources.mjs'&&reportOverviews)return virtualPrefix+'overview-resources';
      if (id === 'lib/database-source-client.mjs' && transportModule) return resolve(transportModule).replaceAll('\\','/');
      if (id === 'lib/application-mode.mjs') return virtualPrefix+'mode';
      const entry = runtimeContract[id];
      if (!entry) return null;
      return entry.kind === 'adapter' ? resolve(root,entry.file) : virtualPrefix+'exports:'+id+'.mjs';
    },
    load(id) {
      if (!id.startsWith(virtualPrefix)) return null;
      if (!content) throw Error('Publication must be verified before loading modules.');
      if(id===virtualPrefix+'overview-resources')return 'export default {'+Object.keys(overviews).map(key=>
        `${code(key)}:()=>import(${code('omnibus-report-overview:'+key)}).then(m=>m.default)`).join(',')+'};';
      if(id.startsWith(virtualPrefix+'omnibus-report-overview:')){
        const key=id.slice((virtualPrefix+'omnibus-report-overview:').length);
        if(!Object.hasOwn(overviews??{},key))throw Error('Unknown report overview');
        return `export default JSON.parse(${code(quote(overviews[key]))});`;
      }
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
          return `export const ${name}=/*#__PURE__*/JSON.parse(${code(quote(content.modules[original][name]))});`;
        }).join('\n');
      }
      const original = key.slice('data:'.length);
      // JSON.parse preserves literal __proto__ keys as data, unlike a JS object literal.
      const lines = [`const data=/*#__PURE__*/JSON.parse(${code(quote(content.modules[original]))});`];
      const keys = content.registrations[original] || [];
      if (keys.length) {
        lines.push(`import {registerCatalogueResource,applyCatalogueEdits} from ${quote(resolve(root,'lib/catalogue-runtime.mjs'))};`);
        lines.push(`import {databaseSourceClient} from ${quote(resolve(root,'lib/database-source-client.mjs'))};`);
        for (const key of keys) lines.push(`registerCatalogueResource(${code(key)},()=>databaseSourceClient.content(${code(content.refs[key])}),value=>applyCatalogueEdits(data,value));`);
      }
      lines.push('export default data;');
      return lines.join('\n');
    },
    generateBundle() {
      if(!emitManifest)return;
      this.emitFile({type:'asset',fileName:'omnibus-release.json',source:quote({
        schema:1,release,publication,contract:runtimeContractHash,runtimeTarget,
        scope:'catalogue-norms-sources-and-models-on-demand',...content.summary,
        resources:Object.keys(content.refs).length,
        contentBytes:Object.values(content.refs).reduce((n,r)=>n+r.bytes,0),refs:content.refs,
      })});
    },
  };
}
