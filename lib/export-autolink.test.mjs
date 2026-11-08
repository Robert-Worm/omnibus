import test from 'node:test';
import assert from 'node:assert/strict';
import {linkUnlinkedForExport} from './export-autolink.mjs';

test('niet-gekoppelde bouwstenen gaan in de export mee onder de eerste centrale vraag; het project blijft gelijk', () => {
  const draft = {included: ['a', 'b', 'c'], research: {questions: [{id: 'q1', parent_id: null, text: 'Centraal'}, {id: 'q2', parent_id: 'q1', text: 'Deel'}],
    links: [{question_id: 'q2', line_id: 'a'}, {question_id: 'weg', line_id: 'b'}]}};
  const before = structuredClone(draft);
  const {draft: next, autoLinked, central} = linkUnlinkedForExport(draft);
  assert.deepEqual(autoLinked, ['b', 'c']);
  assert.equal(central.id, 'q1');
  assert.deepEqual(next.research.links.slice(-2), [{question_id: 'q1', line_id: 'b'}, {question_id: 'q1', line_id: 'c'}]);
  assert.deepEqual(draft, before);
});

test('zonder centrale vraag of zonder losse bouwstenen verandert er niets', () => {
  const zonder = {included: ['a'], research: {questions: [], links: []}};
  assert.equal(linkUnlinkedForExport(zonder).draft, zonder);
  const alles = {included: ['a'], research: {questions: [{id: 'q', parent_id: null}], links: [{question_id: 'q', line_id: 'a'}]}};
  assert.equal(linkUnlinkedForExport(alles).draft, alles);
  assert.equal(linkUnlinkedForExport({included: ['a']}).central, null);
});
