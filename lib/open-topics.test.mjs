import test from 'node:test';
import assert from 'node:assert/strict';
import {openTopics, openTopic, closeTopic, closeAllTopics, subscribeOpenTopics, takeWantedTopic, openTopicId, openTopicValue} from './open-topics.mjs';

test('onderwerpen openen, sluiten en als eerste tonen', () => {
  let changes = 0;
  const stop = subscribeOpenTopics(() => { changes++; });
  assert.deepEqual(openTopics(), []);
  openTopic('T5');
  openTopic('T5');
  openTopic('T8|||r', true);
  assert.deepEqual(openTopics(), ['T5', 'T8|||r']);
  assert.equal(changes, 2);
  assert.equal(openTopics(), openTopics());
  assert.equal(takeWantedTopic(), 'T8|||r');
  assert.equal(takeWantedTopic(), '');
  closeTopic('T5');
  assert.deepEqual(openTopics(), ['T8|||r']);
  closeAllTopics();
  assert.deepEqual(openTopics(), []);
  stop();
});

test('een onderwerp heeft een eigen soort id naast de bronnen', () => {
  assert.equal(openTopicValue(openTopicId('T5|5c')), 'T5|5c');
  assert.equal(openTopicValue('DORA-2022-2554'), '');
});
