import test from 'node:test';
import assert from 'node:assert/strict';
import {register} from 'node:module';
import {parseProjectText, serializeProject} from './project-codec.mjs';

// Only the storage boundary is under test. Its colocated readProject import
// normally loads the private catalogue adapter. Fail explicitly if any test
// enters that unrelated restoration path; do not invent catalogue fixtures.
register('data:text/javascript,' + encodeURIComponent(`
  export async function resolve(specifier, context, nextResolve) {
    if (specifier === './theme-workspaces.mjs' && context.parentURL.endsWith('/lib/project-session.mjs'))
      return {url: 'data:text/javascript,export function restoreWorkspace(){throw Error("Workspace restoration is outside the storage-only test");}', shortCircuit: true};
    return nextResolve(specifier, context);
  }
`), import.meta.url);
const {guardedProjectStore, PROJECT_KEY, projectView} = await import('./project-session.mjs');

test('last collection page survives project serialization and old projects retain sensible defaults',()=>{
 const view=projectView({page:'framework',lastCollectionPage:'model-workspace'});
 const restored=projectView(parseProjectText(serializeProject({...project(),view})).view);
 assert.equal(restored.lastCollectionPage,'model-workspace');
 assert.equal(projectView({page:'topics'}).lastCollectionPage,'topics');
 assert.equal(projectView({page:'framework'}).lastCollectionPage,'');
 assert.equal(projectView({page:'export',lastCollectionPage:'__proto__'}).lastCollectionPage,'');
});

function storage(initial = null) {
  const values = new Map(initial === null ? [] : [[PROJECT_KEY, initial]]);
  const writes = [];
  let failWrites = false;
  return {
    getItem: key => values.get(key) ?? null,
    setItem(key, value) {
      if (failWrites) throw new DOMException('Synthetic full storage', 'QuotaExceededError');
      values.set(key, value); writes.push([key, value]);
    },
    values, writes,
    fail: value => { failWrites = value; },
  };
}
function project(title = 'Synthetic project') {
  return {format: 'rijksmap-project', version: 1,
    draft: {title, included: ['P1'], overrides: {P1: {criterion: 'Own wording'}},
      investigation: {materials: [{id: 'P1', lawTrace: '{ "text": "Synthetic source 🧭" }'}]},
      research: {questions: [{id: 'Q1', text: 'Synthetic question?'}], links: [{question_id: 'Q1', line_id: 'P1'}]}},
    modelLibrary: {models: []}, workspace: {openIds: [], activeId: null}, view: {page: 'framework'}};
}

test('atomic saves retain selections, own text, questions, links and exact source snapshots', () => {
  const input = project(), before = structuredClone(input), backing = storage();
  const store = guardedProjectStore(backing);
  assert.equal(store.raw(), null);
  assert.equal(backing.writes.length, 0);
  store.save(input);
  assert.equal(backing.writes.length, 1);
  assert.equal(backing.writes[0][0], PROJECT_KEY);
  assert.deepEqual(parseProjectText(backing.getItem(PROJECT_KEY)), before);
  assert.deepEqual(input, before);
  store.save(input);
  assert.equal(backing.writes.length, 1, 'Unchanged content must not consume another storage write');
});

test('quota failure preserves stored bytes and expected revision; explicit retry can succeed', () => {
  const original = serializeProject(project()), backing = storage(original);
  const store = guardedProjectStore(backing), edited = project('Unsaved session work');
  backing.fail(true);
  assert.throws(() => store.save(edited), {name: 'QuotaExceededError'});
  assert.equal(backing.getItem(PROJECT_KEY), original);
  assert.equal(store.raw(), original);
  assert.equal(backing.writes.length, 0);
  backing.fail(false);
  store.save(edited);
  assert.deepEqual(parseProjectText(backing.getItem(PROJECT_KEY)), edited);
});

test('background-encoded saves retain atomic storage, quota and cross-tab guards',()=>{
 const original=serializeProject(project()),backing=storage(original),store=guardedProjectStore(backing);
 const next=serializeProject(project('Background snapshot'));
 backing.fail(true);assert.throws(()=>store.saveSerialized(next),{name:'QuotaExceededError'});
 assert.equal(store.raw(),original);assert.equal(backing.getItem(PROJECT_KEY),original);
 backing.fail(false);store.saveSerialized(next);
 assert.deepEqual(parseProjectText(backing.getItem(PROJECT_KEY)),project('Background snapshot'));
 const other=serializeProject(project('External edit'));backing.values.set(PROJECT_KEY,other);
 assert.throws(()=>store.saveSerialized(original),/ander tabblad/);
 assert.equal(backing.getItem(PROJECT_KEY),other);assert.equal(store.raw(),next);
});

test('a stale tab cannot save or checkpoint over a newer project or a cleared store', () => {
  for (const external of [serializeProject(project('Other tab')), null]) {
    const original = serializeProject(project()), backing = storage(original);
    const stale = guardedProjectStore(backing);
    if (external === null) backing.values.delete(PROJECT_KEY);
    else backing.values.set(PROJECT_KEY, external);
    assert.throws(() => stale.save(project('Stale edit')), /ander tabblad/);
    assert.throws(() => stale.checkpoint(), /ander tabblad/);
    assert.equal(stale.raw(), original);
    assert.equal(backing.getItem(PROJECT_KEY), external);
    assert.equal(backing.writes.length, 0);
  }
});

test('checkpoints preserve original raw bytes, including unreadable projects, without replacing active storage', () => {
  const original = '{broken original bytes 🧭', backing = storage(original);
  const store = guardedProjectStore(backing);
  store.checkpoint();
  assert.equal(backing.getItem(PROJECT_KEY + '-before-open'), original);
  assert.equal(backing.getItem(PROJECT_KEY), original);
  assert.equal(store.raw(), original);
  backing.fail(true);
  assert.throws(() => store.checkpoint(true), {name: 'QuotaExceededError'});
  assert.equal(backing.getItem(PROJECT_KEY), original);
  assert.equal(store.raw(), original);
});

test('preserved recovery copies remain distinct even when created in the same millisecond', t => {
  t.mock.method(Date, 'now', () => 12345);
  const backing = storage('first raw project'), store = guardedProjectStore(backing);
  store.checkpoint(true);
  store.save(project('second project'));
  const second = store.raw();
  store.checkpoint(true);
  assert.equal(backing.getItem(PROJECT_KEY + '-recovery-12345'), 'first raw project');
  assert.equal(backing.getItem(PROJECT_KEY + '-recovery-12345-1'), second);
  assert.equal(backing.getItem(PROJECT_KEY), second);
});

test('empty stores need no checkpoint and read failures cannot be mistaken for an empty project', () => {
  const backing = storage(), store = guardedProjectStore(backing);
  store.checkpoint(); store.checkpoint(true);
  assert.deepEqual(backing.writes, []);
  assert.throws(() => guardedProjectStore({getItem() {throw new DOMException('Denied', 'SecurityError');}}), {name: 'SecurityError'});
});
