import test from 'node:test';
import assert from 'node:assert/strict';
import {reportCorpusHistory,uniqueReportCorpus} from './report-corpus-history.mjs';
const report = id => ({framework:{report:{id},lines:[{id:id+'-K01'}]}});
const theme = (...ids) => ({id:'shared',lineIds:ids.map(id=>id+'-K01'),reportIds:ids});
const base = {content_hash:'base',corpus:[],themes:[]};
const reviewed = {content_hash:'reviewed',corpus:[report('A')],themes:[theme('A')],history:[]};
const additions = {content_hash:'current',corpus:[report('B'),report('C')],themes:[theme('B','C')],
  history:[{content_hash:'prior-addition',reportIds:['A','B']}]};
test('earlier additive releases reuse current records without admitting later reports',()=>{
  const before=JSON.stringify({base,reviewed,additions});
  const history=reportCorpusHistory(base,reviewed,additions);
  assert.deepEqual(history.map(v=>v.content_hash),['prior-addition','reviewed','base']);
  assert.deepEqual(history[0].corpus.map(c=>c.framework.report.id),['A','B']);
  assert.equal(history[0].corpus[1],additions.corpus[0]);
  assert.deepEqual(history[0].themes[1],theme('B'));
  assert.equal(JSON.stringify({base,reviewed,additions}),before);
});
test('existing catalogue without addition history keeps its previous release list',()=>{
  assert.deepEqual(reportCorpusHistory(base,reviewed,{...additions,history:undefined})
    .map(v=>v.content_hash),['reviewed','base']);
});
test('missing and duplicate historical report identities fail closed',()=>{
  for(const reportIds of [['missing'],['A','A']])assert.throws(()=>reportCorpusHistory(base,reviewed,
    {...additions,history:[{content_hash:'prior',reportIds}]}),/bronrapport/i);
});
test('duplicates across any corpus, including additions, are rejected',()=>{
  assert.throws(()=>uniqueReportCorpus([report('A')],[report('B'),report('A')]),/Dubbel bronrapport/);
  assert.throws(()=>reportCorpusHistory({...base,corpus:[report('B')]},reviewed,additions),/Dubbel bronrapport/);
  assert.deepEqual(uniqueReportCorpus([], [report('A')], []),[report('A')]);
});
