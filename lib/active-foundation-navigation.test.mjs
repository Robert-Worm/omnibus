import assert from 'node:assert/strict';
import test from 'node:test';
import {register} from 'node:module';
import {additionalSourceDomains, extendSourceDomains} from './foundation-navigation-domains.mjs';
import {scopeFoundationSources, searchCatalogueGroups} from './catalogue-directory.mjs';

const domains = {
  cyber: {title: 'Cybersecurity & weerbaarheid', ids: ['LEGACY', 'DORA', 'DORAFC']},
  procurement: {title: 'Inkoop & leveranciers', ids: ['LEGACY']},
  governance: {title: 'Governance, risico & gedrag', ids: ['BVA']},
  it: {title: 'IT-beheer & verandering', ids: []},
};
const fixtures = {
  './process-catalogue.mjs': `import {createSourceFilter} from ${JSON.stringify(new URL('./source-catalogue-filter.mjs', import.meta.url).href)};
    export const sourceDomains=${JSON.stringify(domains)};
    export const filterSources=createSourceFilter([{id:'existing-process',sourceIds:['LEGACY']}],sourceDomains);`,
  './cio-law-data.mjs': 'export const cioSourceId="CIO";',
  './wwke-law-data.mjs': 'export const wwkeSourceId="WWKE";',
};
register('data:text/javascript,' + encodeURIComponent(`
  const fixtures=${JSON.stringify(fixtures)};
  export async function resolve(specifier,context,next){
    if(context.parentURL?.endsWith('/active-foundation-navigation.mjs')&&Object.hasOwn(fixtures,specifier))
      return {url:'data:text/javascript,'+encodeURIComponent(fixtures[specifier]),shortCircuit:true};
    return next(specifier,context);
  }
`), import.meta.url);
const {filterSources, sourceDomains} = await import('./active-foundation-navigation.mjs');
const ids = additionalSourceDomains.financial.ids;
const sources = [...ids.map(id => ({id, title:id, kind:id==='DORA-2022-2554'?'law':'framework'})),
  ...['LEGACY','BVA','CIO','WWKE'].map(id => ({id,title:id,kind:'law'}))];

test('all 18 published DORA packages are discoverable without loading norms', () => {
  assert.equal(new Set(ids).size, 18);
  const before = JSON.stringify(sources);
  assert.deepEqual(new Set(filterSources(sources,{domain:'financial'}).map(s=>s.id)), new Set(ids));
  for (const [domain, {ids: expected}] of Object.entries(additionalSourceDomains)) {
    const actual = new Set(filterSources(sources,{domain}).map(s=>s.id));
    for (const id of expected) assert.ok(actual.has(id), `${id} missing from ${domain}`);
  }
  assert.equal(JSON.stringify(sources), before);
  assert.equal(filterSources(sources,{domain:'all'}).length, sources.length);
  assert.deepEqual(filterSources(sources,{domain:'unknown'}), []);
});

test('category filtering preserves kind, query, process and user selection filters', () => {
  assert.deepEqual(filterSources(sources,{domain:'financial',kind:'law'}).map(s=>s.id),['DORA-2022-2554']);
  assert.deepEqual(filterSources(sources,{domain:'financial',query:'2025-1190'}).map(s=>s.id),['DORA-2025-1190']);
  assert.deepEqual(filterSources(sources,{domain:'financial',selectedOnly:true,openIds:['DORA-2025-532']}).map(s=>s.id),['DORA-2025-532']);
  assert.deepEqual(filterSources(sources,{domain:'financial',processId:'existing-process'}),[]);
  assert.deepEqual(filterSources(sources,{domain:'cyber',processId:'existing-process'}).map(s=>s.id),['LEGACY']);
  assert.deepEqual(filterSources(sources,{domain:'it',processId:'PR12'}).filter(s=>s.id==='CIO').map(s=>s.id),['CIO']);
  assert.ok(!filterSources(sources,{domain:'cyber',processId:'PR12'}).some(s=>s.id==='WWKE'));
});

test('existing categories survive and new category works in laws, frameworks and category search', () => {
  const before = JSON.stringify(domains);
  assert.deepEqual(extendSourceDomains(domains), extendSourceDomains(extendSourceDomains(domains)));
  assert.equal(JSON.stringify(domains), before);
  assert.equal(sourceDomains.cyber.title, domains.cyber.title);
  assert.ok(filterSources(sources,{domain:'governance'}).some(s=>s.id==='BVA'));
  assert.equal(filterSources(scopeFoundationSources(sources,'laws'),{domain:'financial'}).length, 1);
  assert.equal(filterSources(scopeFoundationSources(sources,'frameworks'),{domain:'financial'}).length, 17);
  const groups = Object.entries(sourceDomains).map(([id,value])=>({id,title:value.title,count:filterSources(sources,{domain:id}).length}));
  for (const query of ['DORA','RTS','ITS','NOREA']) assert.ok(searchCatalogueGroups(groups,'bronnen',query).some(g=>g.id==='financial'));
  assert.ok(!filterSources(sources,{domain:'privacy'}).some(s=>ids.includes(s.id)));
});
