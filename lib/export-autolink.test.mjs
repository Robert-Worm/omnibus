import test from 'node:test';
import assert from 'node:assert/strict';
import {linkUnlinkedForExport} from './export-autolink.mjs';

const vragen = [{id: 'q1', parent_id: null, text: 'Centraal'}, {id: 'q2', parent_id: 'q1', text: 'Deel A'}, {id: 'q3', parent_id: 'q1', text: 'Deel B'}];

test('niet-gekoppelde bouwstenen gaan mee onder de centrale vraag; het project blijft gelijk', () => {
  const draft = {included: ['a', 'b', 'c'], research: {questions: vragen.slice(0, 2), links: [{question_id: 'q2', line_id: 'a'}, {question_id: 'weg', line_id: 'b'}]}};
  const before = structuredClone(draft);
  const {draft: next, autoLinked, central} = linkUnlinkedForExport(draft, {lines: []});
  assert.deepEqual(autoLinked, ['b', 'c']);
  assert.equal(central.id, 'q1');
  assert.deepEqual(next.research.links.slice(-2), [{question_id: 'q1', line_id: 'b'}, {question_id: 'q1', line_id: 'c'}]);
  assert.deepEqual(draft, before);
});

test('een bouwsteen over dezelfde norm komt bij de deelvraag waar die norm al hangt', () => {
  const lines = [{id: 'a', sourcePointId: 'RTS1774-N20-P01'}, {id: 'b', sourcePointId: 'RTS1774-N20-P02'}, {id: 'c', sourcePointId: 'RTS1774-N99-P01'}, {id: 'd', sourcePointId: 'RTS1774-N50-P01'}];
  const materials = ['a', 'b', 'c', 'd'].map(id => ({id, foundationId: 'DORA-2024-1774'}));
  const draft = {included: ['a', 'b', 'c', 'd'], investigation: {materials},
    research: {questions: vragen, links: [{question_id: 'q2', line_id: 'a'}, {question_id: 'q3', line_id: 'd'}]}};
  const {placed} = linkUnlinkedForExport(draft, {lines});
  assert.equal(placed.b, 'q2');
  assert.equal(placed.c, 'q1');
});

test('zonder centrale vraag of zonder losse bouwstenen verandert er niets', () => {
  const zonder = {included: ['a'], research: {questions: [], links: []}};
  assert.equal(linkUnlinkedForExport(zonder).draft, zonder);
  const alles = {included: ['a'], research: {questions: [{id: 'q', parent_id: null}], links: [{question_id: 'q', line_id: 'a'}]}};
  assert.equal(linkUnlinkedForExport(alles).draft, alles);
});
