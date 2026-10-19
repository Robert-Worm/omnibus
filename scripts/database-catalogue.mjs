import {readFileSync} from 'node:fs';
import {dirname, resolve, isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {CatalogueRepository, digest} from '../local-data/repository.mjs';
import {prepareWebResources} from '../local-data/web-resources.mjs';
import {databaseReportSource} from './database-report-sources.mjs';
import {prepareFoundationSources} from './database-foundation-sources.mjs';
import {prepareModels} from './database-models.mjs';
import {verifyThemeCuration} from './verify-theme-curation.mjs';
import {flatLawSummary} from '../lib/admitted-foundation.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const quote = JSON.stringify;
const MAX_CHUNK = 900_000;

// Build-time transport projection, not an alternative extraction or viewer.
// Original files and the pinned content release are never rewritten.
export function databaseCataloguePlugin({release, databasePath, transportModule} = {}) {
  if (!/^[a-f0-9]{64}$/.test(release || '')) throw Error('An explicit database release is required.');
  const files = new Map(), projections = {}, registrations = new Map(), special = new Map();
  const arrayDefaults=new Set();
  const prefix = '\0omnibus-database-catalogue:';
  let repository, refs, routing, navigation, archive, models, reportCount = 0, pageCount = 0;
  function read(path) {
    const raw = readFileSync(resolve(root, path), 'utf8');
    const entry = repository.db.prepare(`SELECT a.payload FROM artifacts a JOIN release_artifacts r ON r.sha256=a.sha256
      WHERE r.release_id=? AND r.name='baseline-file-inventory'`).get(release);
    const recorded = JSON.parse(entry.payload).find(file => file.path === path);
    if (!recorded || recorded.sha256 !== digest(raw)) throw Error('Content differs from the pinned release: ' + path);
    const data = JSON.parse(raw); files.set(resolve(root, path), data); return data;
  }
  function add(path, key, edit) {
    const names = registrations.get(path) ?? [];
    const last = names.at(-1);
    const name = last?.startsWith(key + ':') && Buffer.byteLength(quote([...projections[last], edit])) < MAX_CHUNK
      ? last : key + ':' + names.length;
    if (!projections[name]) { projections[name] = []; names.push(name); registrations.set(path, names); }
    projections[name].push(edit);
  }
  function move(path, data, propertyPath, key) {
    let parent = data;
    for (const part of propertyPath.slice(0, -1)) parent = parent[part];
    const property = propertyPath.at(-1), value = parent[property];
    if (Array.isArray(value)) {
      parent[property] = [];
      let chunk = [], size = 0;
      for (const item of value) {
        const bytes = Buffer.byteLength(quote(item));
        if (size + bytes > MAX_CHUNK && chunk.length) { add(path, key, {path: propertyPath, value: chunk}); chunk = []; size = 0; }
        chunk.push(item); size += bytes;
      }
      if (chunk.length) add(path, key, {path: propertyPath, value: chunk});
    } else {
      parent[property] = {};
      for(const [entry, item] of Object.entries(value)) add(path,key,{path:propertyPath,value:{[entry]:item}});
    }
  }
  function moduleFor(path, data) {
    const lines = [`import {registerCatalogueResource,applyCatalogueEdits} from ${quote(resolve(root,'lib/catalogue-runtime.mjs'))};`,
      `import {databaseSourceClient} from ${quote(transportModule || resolve(root,'lib/database-source-client.mjs'))};`, `const data=${quote(data)};`];
    for (const key of registrations.get(path) ?? []) lines.push(`registerCatalogueResource(${quote(key)},()=>databaseSourceClient.content(${quote(refs[key])}),value=>applyCatalogueEdits(data,value));`);
    return lines.join('\n') + '\nexport default data;';
  }
  return {
    name: 'omnibus-database-catalogue', enforce: 'pre',
    api:{snapshot:()=>structuredClone({files:[...files],special:[...special],refs,registrations:[...registrations],arrayDefaults:[...arrayDefaults],navigation,routing,archive,models})},
    async buildStart() {
      await verifyThemeCuration();
      repository = new CatalogueRepository(databasePath || resolve(root,'local-data/runtime/catalogue.sqlite'));
      if (!repository.hasRelease(release)) throw Error('Pinned database release not available.');
      const app = await import('../lib/application-catalogue.mjs');
      routing = app.catalogueRouting;
      navigation = Object.fromEntries(['legacyThemes','discoveryViews','themes','reportViews','workspaces'].map(key => [key, app[key]]));
      const cio=await import('../lib/cio-content.mjs'), law=await import('../lib/cio-law-data.mjs');
      const wwke=await import('../lib/wwke-law-data.mjs');
      const {cioFunctionRows}=await import('../lib/cio-function-view.mjs');
      const {lawCatalogueCounts}=await import('../lib/law-catalogue-counts.mjs');
      navigation.foundationSummaries=Object.fromEntries([[law.cioSourceId,law.cioPoints],[wwke.wwkeSourceId,wwke.wwkePoints]].map(([id,points])=>[id,{...lawCatalogueCounts(id),pointIds:points.filter(p=>p.selection_status==='SELECTABLE').map(p=>p.id)}]));
      const topicalPath='lib/topical-reviewed.json',topical=read(topicalPath);
      for(const [index,p] of topical.packages.entries()){
        navigation.foundationSummaries[p.id]={groups:new Set(p.catalogue.points.map(x=>x.chapter)).size,norms:p.catalogue.criteria.length,pointIds:p.catalogue.points.filter(x=>x.selection_status==='SELECTABLE').map(x=>x.id)};
        for(const field of ['criteria','points','objectives','goals','source_dispositions','issues'])move(topicalPath,topical,['packages',index,'catalogue',field],'foundation:'+p.id+':topical');
        move(topicalPath,topical,['packages',index,'bank','records'],'foundation:'+p.id+':topical');
        move(topicalPath,topical,['packages',index,'questionPlan','subquestions'],'foundation:'+p.id+':topical');
        move(topicalPath,topical,['packages',index,'legacyRelations'],'foundation:'+p.id+':topical');
        for(const [d] of p.documents.entries())move(topicalPath,topical,['packages',index,'documents',d,'pages'],'source:'+p.id+':topical-pages');
      }
      const {admittedLines}=await import('../lib/product-scope.mjs');
      const admitted=new Set(admittedLines(app.baseFramework).map(line=>line.id));
      navigation.reportSummaries=Object.fromEntries(app.corpus.map(c=>[c.framework.report.id,{
        normIds:c.framework.lines.map(l=>l.id),admittedIds:c.framework.lines.filter(l=>admitted.has(l.id)).map(l=>l.id)}]));
      projections.catalogue = navigation;
      const cioPath='lib/cio-content.mjs', cioKey='foundation:'+law.cioSourceId+':cio';
      const cioData=JSON.parse(quote({catalogue:cio.catalogue,bank:cio.bank,pages:cio.pages,issues:cio.issues,status:cio.status,
        original:cio.cioOriginalCatalogue,version:cio.cioEditorialVersion,
        editorial:Object.fromEntries(law.cioPoints.map(p=>[p.id,cio.cioEditorialFor(p.id)])),
        pointControls:Object.fromEntries(law.cioPoints.map(p=>[p.id,cio.cioControlForPoint(p.id)])),
        rowControls:Object.fromEntries(cioFunctionRows.map(r=>[r.criterionId+'|'+r.groupId,cio.cioControlMeasureFor(r.criterionId,r.groupId)]))}));
      for(const property of ['catalogue','original']) for(const field of ['criteria','points','objectives']) move(cioPath,cioData,[property,field],cioKey);
      move(cioPath,cioData,['bank','records'],cioKey);
      for(const field of ['editorial','pointControls','rowControls']) move(cioPath,cioData,[field],cioKey);
      move(cioPath,cioData,['pages'],'source:'+law.cioSourceId+':pages');
      files.set(resolve(root,cioPath),cioData);
      special.set(resolve(root,cioPath), `
import {validateEditorialTrace} from ${quote(resolve(root,'lib/cio-trace-validation.mjs'))};
export const {catalogue,bank,pages,issues,status}=data;
export const cioOriginalCatalogue=data.original,cioEditorialVersion=data.version;
const required=(table,id)=>{const value=table[id];if(!value)throw Error('CIO-inhoud is nog niet geladen: '+id);return value;};
export const cioEditorialFor=id=>required(data.editorial,id);
export const cioControlForPoint=id=>required(data.pointControls,id);
export const cioControlMeasureFor=(id,group)=>required(data.rowControls,id+'|'+group);
export const validateCioEditorialTrace=trace=>validateEditorialTrace(trace,cioEditorialFor,catalogue);
`);
      const wwkePath='lib/wwke-content.mjs',wwkeData=JSON.parse(quote(wwke.wwkeCatalogue));
      for(const field of ['criteria','points','objectives','goals','issues'])move(wwkePath,wwkeData,[field],'foundation:'+wwke.wwkeSourceId+':lib/wwke-reviewed/catalogue.json');
      files.set(resolve(root,wwkePath),wwkeData);
      for(const [name,fields] of [['source-bank',['records']],['filters',['point_mappings']]]) {
        const path='lib/wwke-reviewed/'+name+'.json', data=read(path);
        for(const field of fields) if(data[field])move(path,data,[field],'foundation:'+wwke.wwkeSourceId+':'+path);
      }
      const wwkePagesPath='lib/wwke-reviewed/pages.json',wwkePages=read(wwkePagesPath);
      const wwkeSource={pages:wwkePages};
      move(wwkePagesPath,wwkeSource,['pages'],'source:'+wwke.wwkeSourceId+':pages');
      files.set(resolve(root,wwkePagesPath),wwkeSource);
      special.set(resolve(root,wwkePagesPath),'export const pages=data.pages;');
      const registry=await import('../lib/foundations/registry.mjs');
      const registryPath='lib/foundations/registry.mjs', registryData={importedFoundationItems:[],importedFoundationMetadata:registry.importedFoundationMetadata,foundationQuestionPlans:{}};
      files.set(resolve(root,registryPath),registryData);
      special.set(resolve(root,registryPath),'export const {importedFoundationItems,importedFoundationMetadata,foundationQuestionPlans}=data;');
      for(const id of new Set(registry.importedFoundationItems.map(p=>p.sourceId))){
        const data={importedFoundationItems:registry.importedFoundationItems.filter(p=>p.sourceId===id)};
        const summary=flatLawSummary({id,...registry.importedFoundationMetadata[id]},data.importedFoundationItems);
        if(summary)navigation.foundationSummaries[id]=summary;
        move(registryPath,data,['importedFoundationItems'],'foundation:'+id+':registry');
        if(registry.foundationQuestionPlans[id])add(registryPath,'foundation:'+id+':registry',{path:['foundationQuestionPlans'],value:{[id]:registry.foundationQuestionPlans[id]}});
      }
      for (const path of ['app/trial-corpus.json','app/reviewed-reports.json','app/report-additions.json']) {
        const data = read(path);
        for (const [index, c] of data.corpus.entries()) {
          const id = c.framework.report.id, key = 'report:' + id + ':' + path;
          reportCount++; pageCount += c.source.pages.length;
          c.source = databaseReportSource(c.source, id, repository, release);
          move(path, data, ['corpus', index, 'framework', 'lines'], key);
          move(path, data, ['corpus', index, 'framework', 'evidence'], key);
          if (data.scopeSnapshots) {
            const snapshots = Object.fromEntries(Object.entries(data.scopeSnapshots).filter(([line]) => routing.reports[line] === id));
            for (const line of Object.keys(snapshots)) delete data.scopeSnapshots[line];
            // Individual entries keep responses bounded for a large report.
            for (const [line, value] of Object.entries(snapshots)) add(path, key, {path:['scopeSnapshots'], value:{[line]:value}});
          }
        }
        if (path.endsWith('report-additions.json')) {
          const key = 'report:' + data.corpus[0].framework.report.id + ':' + path;
          for (const property of ['organizational_goals','control_objectives','interview_questions','visual_sources','locators']) move(path,data,[property],key);
          for (const property of ['blocks','points','sources']) move(path,data,['catalogue',property],key);
        }
      }
      const pointsPath = 'app/report-point-catalogue.json', points = read(pointsPath);
      const revisionPath='app/report-quality-revisions.json', revisions=read(revisionPath);
      const correctionEntries=revisions.entries; revisions.entries=[];
      for(const reportId of new Set(correctionEntries.map(e=>e.reportId))) {
        const subset={entries:correctionEntries.filter(e=>e.reportId===reportId)};
        move(revisionPath,subset,['entries'],'report:'+reportId+':quality');
      }
      for (const property of ['blocks','points','sources']) {
        const all = points[property]; points[property] = [];
        for (const id of new Set(all.map(item => item.report_id))) {
          const subset = {[property]: all.filter(item => item.report_id === id)};
          move(pointsPath, subset, [property], 'report:' + id + ':' + pointsPath);
        }
      }
      const scopePath = 'lib/product-scope-snapshots.json', snapshots = read(scopePath);
      for (const [line, value] of Object.entries(snapshots)) {
        add(scopePath,'report:' + routing.reports[line] + ':' + scopePath,{path:[line],value}); delete snapshots[line];
      }
      archive=await prepareFoundationSources({repository,release,files,special,move,read});
      models=await prepareModels({repository,release,files,special,move,read,arrayDefaults});
      refs = prepareWebResources(repository, release, projections);
      for(const [key,ref] of Object.entries(refs))if(ref.bytes>2*1024*1024)throw Error('Content resource exceeds the client response limit: '+key);
    },
    resolveId(source, importer) {
      if (!importer || (!source.startsWith('.') && !isAbsolute(source))) return null;
      const path = resolve(dirname(importer), source);
      if (files.has(path) || ['lib/application-mode.mjs','lib/application-catalogue.mjs'].some(p => path === resolve(root,p))) return prefix + path + '.mjs';
    },
    load(id) {
      if (!id.startsWith(prefix)) return null;
      const path = id.slice(prefix.length,-4);
      if (path === resolve(root,'lib/application-mode.mjs')) return 'export const databaseSourcesEnabled=true;';
      if (path === resolve(root,'lib/application-catalogue.mjs')) {
        let source = readFileSync(path,'utf8');
        const start = source.indexOf('export const legacyThemes'), end = source.indexOf('\nexport function projectCatalogueKeys');
        source = source.slice(0,start) + `\nimport {registerCatalogueResource,applyCatalogueEdits} from './catalogue-runtime.mjs';
import {databaseSourceClient} from ${quote(transportModule || resolve(root,'lib/database-source-client.mjs'))};
import {foundationSummaries,reportSummaries} from './catalogue-summary.mjs';
${Object.keys(navigation).filter(key=>!key.endsWith('Summaries')).map(key => `export const ${key}=[];`).join('\n')}
export const catalogueRouting=${quote(routing)};
registerCatalogueResource('catalogue',()=>databaseSourceClient.content(${quote(refs.catalogue)}),value=>applyCatalogueEdits(
{${Object.keys(navigation).join(',')}},Object.entries(value).map(([key,value])=>({path:[key],value}))));\n` + source.slice(end);
        // Virtual module import paths must resolve against the original directory.
        return source.replaceAll(/from '(\.[^']+)'/g, (_, relative) => 'from ' + quote(resolve(dirname(path),relative)));
      }
      const generated=moduleFor(path.slice(root.length).replaceAll('\\','/'), files.get(path))+(special.get(path)||'');
      if(path===resolve(root,'lib/wwke-reviewed/pages.json'))return generated.replace('export default data;','export default data.pages;');
      return arrayDefaults.has(path)?generated.replace('export default data;','export default data.values;'):generated;
    },
    generateBundle() {
      this.emitFile({type:'asset',fileName:'omnibus-release.json',source:quote({schema:1,release,
        scope:'catalogue-norms-sources-and-models-on-demand',reports:reportCount,pages:pageCount,archive,models,
        resources:Object.keys(refs).length,contentBytes:Object.values(refs).reduce((n,r)=>n+r.bytes,0),refs})});
    },
    buildEnd(error) { if(error) console.error(error); },
    closeBundle() { const open=repository; repository=null; open?.close(); },
  };
}
