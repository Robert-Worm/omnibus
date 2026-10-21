import test from 'node:test';
import assert from 'node:assert/strict';
import {collectionStart,collectionDestination,rememberCollectionPage} from './collection-start.mjs';

test('first visit retains the five editorial starting points',()=>{
 for(const [direction,page] of Object.entries({signaling:'catalogue',diagnostic:'models',design:'foundations',change:'models',evaluative:'catalogue'}))
  assert.equal(collectionDestination('',direction).page,page);
 assert.deepEqual(collectionDestination('','design'),collectionStart('design'));
});
test('an explicit collection visit survives steps 1, 3 and 4 and route changes',()=>{
 for(const chosen of ['catalogue','processes','topics','models','model-workspace','foundations','foundation-workspace','reports','report-themes']){
  let remembered=rememberCollectionPage(chosen);
  for(const other of ['start','risk-start','framework','export','entry','reader'])remembered=rememberCollectionPage(other,remembered);
  assert.equal(collectionDestination(remembered,'diagnostic','question').page,chosen);
  assert.equal(collectionDestination(remembered,'design','risk').page,chosen);
  assert(collectionDestination(remembered).hash.startsWith('#'));
  assert.equal(collectionDestination(remembered).foundationScope,undefined,'returning must not reset laws/frameworks filter');
 }
});
test('invalid persisted destinations cannot become routes and a fresh project has no preference',()=>{
 for(const value of ['__proto__','https://example.invalid',null,undefined,'framework']){
  assert.equal(rememberCollectionPage(value),'');
  assert.equal(collectionDestination(value).page,'foundations');
 }
});
