import test from 'node:test';
import assert from 'node:assert/strict';
import {topicalRecordSources} from './topical-source-reader.mjs';

const packet={
 documents:[
  {id:'original',packageDocumentId:'original',pages:[{page:1,text:'Original clause.'}]},
  {id:'correction',packageDocumentId:'correction',pages:[{page:1,text:'Corrected clause.'}]},
 ],
 manifest:{documents:[
  {id:'original',first_package_page:1,last_package_page:1},
  {id:'correction',first_package_page:2,last_package_page:2},
 ]},
};
const original={page:1,start:0,end:8,quote:'Original'};
const correction={page:2,start:0,end:9,quote:'Corrected'};

test('preferred correction opens first without changing package identity or passages',()=>{
 const before=structuredClone(packet);
 const record={locator:'Example',source_spans:[correction,original]};
 const sources=topicalRecordSources(packet,record);
 assert.deepEqual(sources.map(s=>s.document.id),['correction','original']);
 assert.deepEqual(sources.map(s=>s.passages.length),[1,1]);
 assert.equal(sources[0].spans[0].page,1);
 assert.deepEqual(packet,before);
 assert.deepEqual(record.source_spans,[correction,original]);
});

test('ordinary source and multiple passages retain their reviewed order',()=>{
 const second={page:1,start:9,end:15,quote:'clause'};
 const sources=topicalRecordSources(packet,{locator:'Example',source_spans:[original,second,correction]});
 assert.deepEqual(sources.map(s=>s.document.id),['original','correction']);
 assert.deepEqual(sources[0].spans,[original,second]);
 assert.equal(sources[0].passages.length,2);
 assert.deepEqual(topicalRecordSources(packet,{locator:'Empty',source_spans:[]}),[]);
});
