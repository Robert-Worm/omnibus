import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {CatalogueRepository,digest} from './repository.mjs';
import {serveCatalogue} from './server.mjs';
const fixture=()=>({manifest:{format:'test',schema:1},packages:[{id:'LAW',kind:'law',title:'Wet voorbeeld',records:[{id:'P1',kind:'point',title:'Norm',status:'HOLD',data:{id:'P1',selection_status:'HOLD',text:'Ongewijzigde norm',source_links:[{start:2,end:3}]}}]}],documents:[{id:'D1',pages:[{page:1,text:'A😀'},{page:2,text:'é B'}]}],artifacts:[{name:'review',data:{human_validation:false}}]});
test('Immutable import, Unicode offsets, HOLD, rollback and portable round trip',()=>{
 const db=new CatalogueRepository(':memory:');
 try{
  const original=fixture(),r=db.importRelease(original);assert.equal(db.importRelease(original),r);assert.equal(db.releases().length,1);
  const item=db.catalogue({release:r})[0];assert.deepEqual(db.record(item.version,'point','P1'),original.packages[0].records[0].data);
  const doc=db.documents(r)[0];assert.equal(db.page(doc.version,2).start,2);assert.equal(db.page(doc.version,2).end,5);assert.deepEqual(db.page(doc.version,1).page,original.documents[0].pages[0]);
  const exported=db.exportRelease(r),copy=new CatalogueRepository(':memory:');try{assert.equal(copy.importRelease(exported),r);assert.deepEqual(copy.exportRelease(r),exported);}finally{copy.close();}
  const changed=fixture();changed.packages[0].records[0].data.text='New version';const next=db.importRelease(changed);assert.notEqual(next,r);assert.equal(db.record(item.version,'point','P1').text,'Ongewijzigde norm');
  const broken=fixture();broken.packages[0].records.push(broken.packages[0].records[0]);assert.throws(()=>db.importRelease(broken));assert.equal(db.releases().length,2);
  assert.throws(()=>db.catalogue({release:r,limit:100000}));assert.equal(db.catalogue({release:r,query:"' OR 1=1 --"}).length,0);
 }finally{db.close();}
});
test('Read-only HTTP boundary rejects writes, hostile origins, rebinding and database paths',async()=>{
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'omnibus-db-test-')),file=path.join(folder,'test.sqlite');
 const write=new CatalogueRepository(file),release=write.importRelease(fixture());write.close();
 const db=new CatalogueRepository(file,{readOnly:true}),app=await serveCatalogue(db);
 const request=(url,headers={},method='GET')=>new Promise((resolve,reject)=>{const req=http.request(url,{headers,method},res=>{let body='';res.on('data',c=>body+=c);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body}));});req.on('error',reject);req.end();});
 try{
  assert.throws(()=>db.importRelease(fixture()));
  const result=await request(app.url+'/api/v1/catalogue?release='+release);assert.equal(result.status,200);assert.equal(JSON.parse(result.body).length,1);
  assert.equal((await request(app.url+'/api/v1/catalogue?release='+release+'&limit=101')).status,400);
  assert.equal((await request(app.url+'/api/v1/catalogue')).status,400);
  for(const headers of [{origin:'https://malicious.example'},{host:'malicious.example'},{'sec-fetch-site':'cross-site'}])assert.equal((await request(app.url+'/api/v1/health',headers)).status,403);
  assert.equal((await request(app.url+'/api/v1/health',{},'POST')).status,405);
  assert.equal((await request(app.url+'/runtime/test.sqlite')).status,404);
  assert.equal((await request(app.url+'/api/v1/packages/'+digest(fixture().packages[0])+'/records/point/P1')).status,200);
  assert.equal(result.headers['access-control-allow-origin'],undefined);
 }finally{await app.close();db.close();fs.unlinkSync(file);fs.rmdirSync(folder);}
});
