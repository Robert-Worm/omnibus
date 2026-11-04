import test from 'node:test';
import assert from 'node:assert/strict';
import {frameworkTitle} from './framework-title.mjs';
import {frameworkBackgrounds} from './framework-backgrounds.mjs';
import {sourceSnapshotStatus} from './audit-reading.mjs';

test('display titles replace separated long dashes, preserving identifiers and ranges',()=>{
 const source=Object.freeze({title:'DORA — artikelen 31–44 (2024/1502)'});
 assert.equal(frameworkTitle(source.title),'DORA: artikelen 31–44 (2024/1502)');
 assert.equal(source.title,'DORA — artikelen 31–44 (2024/1502)');
 assert.equal(frameworkTitle('BVA-stelsel 2021'),'BVA-stelsel 2021');
 assert.equal(frameworkTitle('Cybersecurity – IIA Topical Requirement'),'Cybersecurity: IIA Topical Requirement');
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
 assert.match(sourceSnapshotStatus(context).qualification,/niet bevestigd/);
 assert.equal(context.status,'UNKNOWN');
});
