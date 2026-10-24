import {dirname, resolve, isAbsolute, relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {CatalogueRepository} from '../local-data/repository.mjs';
import {readRuntimePublication,validateRuntimeModules} from '../local-data/runtime-publication.mjs';
import {runtimeContract} from '../lib/runtime-contract.mjs';
import {runtimeContractHash} from '../lib/runtime-contract-identity.mjs';
import {buildCatalogueOverviews} from './build-catalogue-overviews.mjs';
import {validCodeRevision} from './build-code-revision.mjs';
import {deferredCatalogueMetadata} from './deferred-catalogue-metadata.mjs';
import {projectModelDelivery} from './model-delivery-projection.mjs';
import {projectReportDelivery} from './report-delivery-projection.mjs';
import {webResource} from '../local-data/web-resources.mjs';
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
 * transportModule?:string, reportOverviews?:boolean, deferMetadata?:boolean, emitManifest?:boolean, codeRevision?:string, runtimeTarget?:'local-preview'|'portable-local'}} options
 */
export function publishedCataloguePlugin({release, publication, databasePath, transportModule, reportOverviews=false, deferMetadata=false, emitManifest=true, codeRevision, runtimeTarget='local-preview'} = {}) {
  if(codeRevision && !validCodeRevision(codeRevision))throw Error('Invalid explicit code revision.');
  let content, overviews, foundationSearch, foundationOverviews, modelDirectory, metadata, modelDelivery, reportDelivery;
  const moduleId = source => relative(root, source).replaceAll('\\','/');
  return {
    name:'omnibus-published-catalogue', enforce:'pre',
    async buildStart() {
      if (!databasePath) throw Error('An explicit private database path is required.');
      const repository = new CatalogueRepository(resolve(databasePath), {readOnly:true});
      try {
        content = readRuntimePublication(repository, {release,publication,contract:runtimeContractHash});
        const readResource=ref=>{
          if(!ref||ref.release!==release)throw Error('Invalid delivery resource boundary.');
          const value=webResource(repository,release,ref.hash);
          if(createHash('sha256').update(JSON.stringify(value)).digest('hex')!==ref.hash)throw Error('Delivery resource integrity mismatch.');
          return value;
        };
        if(deferMetadata){
          metadata=deferredCatalogueMetadata(content);
          modelDelivery=projectModelDelivery(content,readResource);
          reportDelivery=projectReportDelivery(content,readResource,{metadata});
        }
      } finally { repository.close(); }
      validateRuntimeModules(content, runtimeContract);
      if(reportOverviews){
        const projections=await buildCatalogueOverviews({release,publication,databasePath},content,publishedCataloguePlugin);
        overviews=projections.reports;foundationSearch=projections.foundationSearch;foundationOverviews=projections.foundationOverviews;
        modelDirectory=projections.modelDirectory;
      }
    },
    resolveId(source, importer) {
      if(source.startsWith('omnibus-report-overview:'))return virtualPrefix+source;
      if(source.startsWith('omnibus-foundation-search:'))return virtualPrefix+source;
      if (source.startsWith(dataPrefix)) {
        const id = source.slice(dataPrefix.length);
        if (!Object.hasOwn(runtimeContract,id)) throw Error('Unknown runtime data module: '+id);
        return virtualPrefix+'data:'+id+'.mjs';
      }
      if (!importer || !(source.startsWith('.') || source.startsWith('@/') || isAbsolute(source))) return null;
      const absolute = source.startsWith('@/') ? resolve(root,source.slice(2)) : resolve(dirname(importer),source);
      const id = moduleId(absolute);
      if(id==='lib/report-overview-resources.mjs'&&reportOverviews)return virtualPrefix+'overview-resources';
      if(id==='lib/foundation-search-resources.mjs'&&reportOverviews)return virtualPrefix+'foundation-search-resources';
      if(id==='lib/foundation-overview-resources.mjs'&&reportOverviews)return virtualPrefix+'foundation-overview-resources';
      if(id==='lib/model-directory-resource.mjs'&&reportOverviews)return virtualPrefix+'model-directory-resource';
      if(id==='lib/model-resource-routing.mjs'&&modelDelivery)return virtualPrefix+'model-resource-routing';
      if(id==='lib/report-resource-routing.mjs'&&reportDelivery)return virtualPrefix+'report-resource-routing';
      if (id === 'lib/database-source-client.mjs' && transportModule) return resolve(transportModule).replaceAll('\\','/');
      if (id === 'lib/application-mode.mjs') return virtualPrefix+'mode';
      const entry = runtimeContract[id];
      if (!entry) return null;
      return entry.kind === 'adapter' ? resolve(root,entry.file) : virtualPrefix+'exports:'+id+'.mjs';
    },
    load(id) {
      if (!id.startsWith(virtualPrefix)) return null;
      if (!content) throw Error('Publication must be verified before loading modules.');
      if(id===virtualPrefix+'model-resource-routing')return `export default ${code(modelDelivery.ids)};`;
      if(id===virtualPrefix+'report-resource-routing')return `export default JSON.parse(${code(quote(reportDelivery.routing))});`;
      if(id===virtualPrefix+'model-directory-resource'){
        const source=`export default JSON.parse(${code(quote(modelDirectory))});`,hash=createHash('sha256').update(source).digest('hex');
        const chunk=this.emitFile({type:'asset',fileName:'assets/model-directory-'+hash+'.js',source});
        return `import {featureLoader} from ${quote(resolve(root,'lib/feature-loader.mjs'))};
          const url=import.meta.ROLLUP_FILE_URL_${chunk};
          const load=featureLoader(attempt=>import(/* @vite-ignore */ attempt?url+'?retry='+attempt:url));
          export default ()=>load().then(m=>m.default);`;
      }
      if(id===virtualPrefix+'foundation-overview-resources'){
        // Retryable, publication-derived assets with no imports: also safe for
        // the worker build, which must retain a single calculator entry point.
        const lines=[`import {featureLoader} from ${quote(resolve(root,'lib/feature-loader.mjs'))};`],entries=[];
        Object.entries(foundationOverviews).forEach(([key,value],index)=>{
          const source=`export default JSON.parse(${code(quote(value))});`,hash=createHash('sha256').update(source).digest('hex');
          const chunk=this.emitFile({type:'asset',fileName:'assets/foundation-overview-'+hash+'.js',source});
          lines.push(`const url${index}=import.meta.ROLLUP_FILE_URL_${chunk};`,
            `const load${index}=featureLoader(attempt=>import(/* @vite-ignore */ attempt?url${index}+'?retry='+attempt:url${index}));`);
          entries.push(`${code(key)}:()=>load${index}().then(m=>m.default)`);
        });
        return lines.join('\n')+'\nexport default {'+entries.join(',')+'};';
      }
      if(id===virtualPrefix+'overview-resources')return 'export default {'+Object.keys(overviews).map(key=>
        `${code(key)}:()=>import(${code('omnibus-report-overview:'+key)}).then(m=>m.default)`).join(',')+'};';
      if(id.startsWith(virtualPrefix+'omnibus-report-overview:')){
        const key=id.slice((virtualPrefix+'omnibus-report-overview:').length);
        if(!Object.hasOwn(overviews??{},key))throw Error('Unknown report overview');
        return `export default JSON.parse(${code(quote(overviews[key]))});`;
      }
      if(id===virtualPrefix+'foundation-search-resources')return 'export default {'+Object.keys(foundationSearch).map(key=>
        `${code(key)}:()=>import(${code('omnibus-foundation-search:'+key)}).then(m=>m.default)`).join(',')+'};';
      if(id.startsWith(virtualPrefix+'omnibus-foundation-search:')){
        const key=id.slice((virtualPrefix+'omnibus-foundation-search:').length);
        if(!Object.hasOwn(foundationSearch??{},key))throw Error('Unknown foundation search index');
        return `export default JSON.parse(${code(quote(foundationSearch[key]))});`;
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
      const lines = [`const data=/*#__PURE__*/JSON.parse(${code(quote(metadata?.modules[original] ?? content.modules[original]))});`];
      const registrations = reportDelivery?.registrations[original] ?? modelDelivery?.registrations[original] ?? (content.registrations[original]||[]).map(key=>({key,ref:content.refs[key]}));
      const network=registrations.filter(entry=>entry.ref),assets=registrations.filter(entry=>entry.edits||entry.bundle);
      const metadataKeys=(metadata?.registrations[original] ?? []).filter(key=>!reportDelivery?.bundledMetadata.has(key));
      if (registrations.length || metadataKeys.length) {
        lines.push(`import {registerCatalogueResource,applyCatalogueEdits} from ${quote(resolve(root,'lib/catalogue-runtime.mjs'))};`);
      }
      if (network.length) {
        lines.push(`import {databaseSourceClient} from ${quote(resolve(root,'lib/database-source-client.mjs'))};`);
        for (const {key,ref} of network) lines.push(`registerCatalogueResource(${code(key)},()=>databaseSourceClient.content(${code(ref)}),value=>applyCatalogueEdits(data,value),${code(ref)});`);
      }
      if(metadataKeys.length||assets.length)lines.push(`import {featureLoader} from ${quote(resolve(root,'lib/feature-loader.mjs'))};`);
      if(assets.some(entry=>entry.bundle))lines.push(`import {reportAssetLoader} from ${quote(resolve(root,'lib/report-asset-loader.mjs'))};`);
      assets.forEach(({key,edits,bundle,module},index)=>{
        const source=`export default JSON.parse(${code(quote(bundle??edits))});`,hash=createHash('sha256').update(source).digest('hex');
        if(bundle&&Buffer.byteLength(source)>4*1024*1024)throw Error('Report delivery asset exceeds its verified read budget.');
        const chunk=this.emitFile({type:'asset',fileName:'assets/'+(bundle?'report':'model')+'-content-'+hash+'.js',source});
        lines.push(`const modelUrl${index}=import.meta.ROLLUP_FILE_URL_${chunk};`,
          bundle?`const modelLoad${index}=reportAssetLoader(modelUrl${index});`:`const modelLoad${index}=featureLoader(attempt=>import(/* @vite-ignore */ attempt?modelUrl${index}+'?retry='+attempt:modelUrl${index}));`,
          `registerCatalogueResource(${code(key)},()=>modelLoad${index}().then(m=>m.default${bundle?'['+code(module)+']':''}),value=>applyCatalogueEdits(data,value));`);
      });
      metadataKeys.forEach((key,index)=>{
        // Reuse the shared retryable loader: browsers cache failed native imports.
        // A retry addresses only this build's hashed asset, never arbitrary code.
        const source=`export default JSON.parse(${code(quote(metadata.resources.get(key)))});`;
        const hash=createHash('sha256').update(source).digest('hex');
        // Data-only ESM assets have no imports. Do not create extra entry chunks:
        // the worker bundler must retain the calculator as its sole entry point.
        const chunk=this.emitFile({type:'asset',fileName:'assets/catalogue-metadata-'+hash+'.js',source});
        lines.push(`const metadataUrl${index}=import.meta.ROLLUP_FILE_URL_${chunk};`,
          `const metadataLoad${index}=featureLoader(attempt=>import(/* @vite-ignore */ attempt?metadataUrl${index}+'?retry='+attempt:metadataUrl${index}));`,
          `registerCatalogueResource(${code(key)},()=>metadataLoad${index}().then(m=>m.default),value=>applyCatalogueEdits(data,value));`);
      });
      lines.push('export default data;');
      return lines.join('\n');
    },
    generateBundle() {
      if(!emitManifest)return;
      this.emitFile({type:'asset',fileName:'omnibus-release.json',source:quote({
        schema:1,release,publication,contract:runtimeContractHash,runtimeTarget,codeRevision:codeRevision||null,
        scope:'catalogue-norms-sources-and-models-on-demand',...content.summary,
        resources:Object.keys(content.refs).length,
        contentBytes:Object.values(content.refs).reduce((n,r)=>n+r.bytes,0),refs:content.refs,
      })});
    },
  };
}
