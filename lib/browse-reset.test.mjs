import test from 'node:test';
import assert from 'node:assert/strict';
import {clearProjectBrowsePreferences} from './browse-reset.mjs';

const storage = entries => {
  const map = new Map(Object.entries(entries));
  return {get length() { return map.size; }, key: i => [...map.keys()][i] ?? null, getItem: k => map.get(k) ?? null,
    setItem: (k, v) => map.set(k, String(v)), removeItem: k => map.delete(k), map};
};

test('een nieuw project wist filters, zoekterm en onderwerp, maar houdt de weergavevoorkeuren', () => {
  const s = storage({
    'rijksmap-view-catalogue-table-foundations-v6': JSON.stringify({sort: 'title', dir: 'desc', group: 'category', filters: {family: 'DORA', topic: 'dora:T3'}, closed: ['x']}),
    'rijksmap-view-cio-source-groups-v3': JSON.stringify({query: 'toegang', group: 'g', topic: 'dora:T3', selectedOnly: true, density: 'compact'}),
    'rijksmap-view-catalogue-view': JSON.stringify({mode: 'list'}),
    'rijksmap-view-theme-catalogue': JSON.stringify({x: 1}),
    'rijksmap-view-kapot': '{niet geldig',
    'iets-anders': JSON.stringify({filters: {a: 'b'}}),
  });
  clearProjectBrowsePreferences(s);
  assert.deepEqual(JSON.parse(s.getItem('rijksmap-view-catalogue-table-foundations-v6')), {sort: 'title', dir: 'desc', group: 'category', filters: {}, closed: ['x']});
  assert.deepEqual(JSON.parse(s.getItem('rijksmap-view-cio-source-groups-v3')), {query: '', group: 'g', topic: '', selectedOnly: false, density: 'compact'});
  assert.equal(s.getItem('rijksmap-view-catalogue-view'), JSON.stringify({mode: 'list'}));
  assert.equal(s.getItem('rijksmap-view-theme-catalogue'), null);
  assert.equal(s.getItem('rijksmap-view-kapot'), '{niet geldig');
  assert.equal(s.getItem('iets-anders'), JSON.stringify({filters: {a: 'b'}}));
});
