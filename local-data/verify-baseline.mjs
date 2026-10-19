import fs from 'node:fs';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {CatalogueRepository,digest} from './repository.mjs';
import {serveCatalogue} from './server.mjs';
const folder=fileURLToPath(new URL('./runtime/',import.meta.url));
const original=new CatalogueRepository(folder+'catalogue.sqlite',{readOnly:true});
let api;
try{
 const releases=original.releases();
 if(!process.argv[2])assert.equal(releases.length,1,'Choose an explicit release once multiple releases exist');
 const release=process.argv[2]||releases[0].id;
 assert.match(release,/^[a-f0-9]{64}$/,'Invalid release');
 const snapshot=original.exportRelease(release);assert(snapshot,'Unknown release');
 // Provider-neutral backup includes every retained record, page and original index.
 const backup=folder+'catalogue-'+release+'.json';
 const text=JSON.stringify(snapshot);fs.writeFileSync(backup,text,{flag:'w'});
 const restored=new CatalogueRepository(':memory:');
 try{
  assert.equal(restored.importRelease(JSON.parse(fs.readFileSync(backup,'utf8'))),release);
  assert.deepEqual(restored.exportRelease(release),snapshot);
  for(const p of snapshot.packages){const version=digest(p);for(const r of p.records)assert.deepEqual(restored.record(version,r.kind,r.id),r.data);}
  for(const d of snapshot.documents){const version=digest(d);let start=0;for(const p of d.pages){const value=restored.page(version,p.page);assert.deepEqual(value.page,p);assert.equal(value.start,start);start+=Array.from(p.text).length;assert.equal(value.end,start);}}
 }finally{restored.close();}
 api=await serveCatalogue(original);
 const started=performance.now();
 const response=await fetch(api.url+'/api/v1/catalogue?release='+release+'&limit=10');assert.equal(response.status,200);
 const body=await response.text();assert.equal(JSON.parse(body).length,10);assert(Buffer.byteLength(body)<20000);
 assert(!body.includes('source_links')&&!body.includes('pages'),'Catalogue response must not contain the source corpus');
 const documents=await(await fetch(api.url+'/api/v1/documents?release='+release+'&limit=1')).json();
 const page=await(await fetch(api.url+'/api/v1/documents/'+documents[0].version+'/pages/1')).json();assert.equal(typeof page.page.text,'string');
 const result={status:'PASS',scope:'database-roundtrip-and-api',release,counts:snapshot.manifest.counts,portableRestore:true,everyRecordExact:true,everyPageAndCodepointOffsetExact:true,cataloguePageBytes:Buffer.byteLength(body),catalogueLocalMs:Math.round(performance.now()-started),backupBytes:Buffer.byteLength(text),websiteConnectionTested:false};
 fs.writeFileSync(folder+'verification.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{if(api)await api.close();original.close();}
