import test from 'node:test';
import assert from 'node:assert/strict';
import {frameworkTitle} from './framework-title.mjs';
import {frameworkBackgrounds} from './framework-backgrounds.mjs';
import {sourceSnapshotStatus} from './audit-reading.mjs';
import {frameworkPublication} from './framework-publication-facts.mjs';

test('display titles replace separated long dashes, preserving identifiers and ranges',()=>{
 const source=Object.freeze({title:'DORA — artikelen 31–44 (2024/1502)'});
 assert.equal(frameworkTitle(source.title),'DORA: artikelen 31–44 (2024/1502)');
 assert.equal(source.title,'DORA — artikelen 31–44 (2024/1502)');
 assert.equal(frameworkTitle('BVA-stelsel 2021'),'BVA-stelsel 2021');
 assert.equal(frameworkTitle('Cybersecurity – IIA Topical Requirement'),'Cybersecurity: IIA Topical Requirement');
});

test('publication facts keep legal entry, application and non-legislative editions distinct',()=>{
 const dora=frameworkPublication('DORA-2022-2554');
 assert.equal(dora.published,'27 december 2022');
 assert.equal(dora.effective,'16 januari 2023');
 assert.match(dora.application,/17 januari 2025/);
 assert.match(frameworkPublication('DORA-2024-1502').application,/Subcriterium 1.4/);
 const norea=frameworkPublication('NOREA-DORA-3-2');
 assert.equal(norea.effective,undefined);
 assert.equal(norea.published,'2025');
 assert.match(norea.dateLabel,/Uitgavejaar/);
 assert.match(frameworkPublication('DORA-INCIDENT-COSTS-GL34').application,/voorwaardelijke/);
 assert.equal(frameworkPublication('new-unreviewed-source'),undefined);
 assert.equal(frameworkPublication('toString'),undefined);
});
test('orientation has source links and no write authority or fallbacks for unknown frameworks',()=>{
 assert.equal(frameworkBackgrounds['unreviewed-new-framework'],undefined);
 for(const background of Object.values(frameworkBackgrounds)){
  assert.ok(background.intro&&background.meaning&&background.related);
  assert.ok(background.history.length>=2&&background.practice.length>=2);
  for(const ref of background.references)assert.equal(new URL(ref.url).protocol,'https:');
  assert.equal(background.catalogue,undefined);assert.equal(background.selection_status,undefined);
 }
 const context=Object.freeze({status:'UNKNOWN',effective_from:'2025-01-17',as_of:'2026-11-01'});
 assert.match(sourceSnapshotStatus(context).qualification,/afzonderlijk/);
 assert.equal(context.status,'UNKNOWN');
});
