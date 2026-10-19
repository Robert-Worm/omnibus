import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync,mkdtempSync,readFileSync,writeFileSync,existsSync,readdirSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {CatalogueRepository} from './repository.mjs';
import {backupRuntime} from './runtime-backup.mjs';
import {publishRuntime,readRuntimePublication} from './runtime-publication.mjs';
import {prepareWebResources} from './web-resources.mjs';
import {verifyReleaseContent} from './release-integrity.mjs';
import {runtimeContractHash} from '../lib/runtime-contract-identity.mjs';

const hash=path=>createHash('sha256').update(readFileSync(path)).digest('hex');

function fixture(t){
 const root=fileURLToPath(new URL('../.tmp/',import.meta.url));
 mkdirSync(root,{recursive:true});
 const dir=mkdtempSync(join(root,'hosting-backup-')),from=join(dir,'source.sqlite');
 const writer=new CatalogueRepository(from);
 t.after(()=>{writer.close();rmSync(dir,{recursive:true,force:true});});
 writer.db.exec('PRAGMA journal_mode=WAL; PRAGMA wal_autocheckpoint=0;');
 const release=writer.importRelease({manifest:{baselineVersion:'synthetic-recovery'},
  packages:[{id:'SYNTHETIC',kind:'report',title:'Synthetic recovery fixture',records:[
   {id:'P1',kind:'point',title:'Synthetic point',status:'HOLD',
    data:{text:'Synthetic only',selection_status:'HOLD',source_links:[{start:1,end:2}]}}
  ]}],documents:[{id:'SYNTHETIC-DOC',pages:[{page:1,text:'A😀'},{page:2,text:'é B'}]}],
  artifacts:[{name:'synthetic-review',data:{human_validation:false}}]});
 const refs=prepareWebResources(writer,release,{test:{text:'Synthetic delivery only'}});
 const publication=publishRuntime(writer,{format:'omnibus-runtime-publication',schemaVersion:1,
  contentGate:'VERIFIED_APPLICATION_RELEASE',release,contract:runtimeContractHash,
  modules:{},refs,registrations:{},routing:{},summary:{synthetic:true}},
 {release,contract:runtimeContractHash});
 return {dir,from,writer,release,publication};
}

test('WAL backup and separate restore preserve sources, relationships and publication without source writes',async t=>{
 const f=fixture(t),to=join(f.dir,'backup.sqlite'),restored=join(f.dir,'restored.sqlite');
 assert(existsSync(f.from+'-wal'));
 const before=[hash(f.from),hash(f.from+'-wal')],snapshot=f.writer.exportRelease(f.release);
 const result=await backupRuntime({...f,to});
 assert.equal(result.database,to);
 await backupRuntime({...f,from:to,to:restored});
 for(const path of [to,restored]){
  const reader=new CatalogueRepository(path,{readOnly:true});
  try{
   assert.deepEqual(reader.exportRelease(f.release),snapshot);
   assert.deepEqual(verifyReleaseContent(reader,f.release),
    {packages:1,records:1,documents:1,sourcePages:2,sourceArtifacts:1});
   assert.equal(reader.db.prepare('PRAGMA foreign_key_check').get(),undefined);
   const value=readRuntimePublication(reader,{...f,contract:runtimeContractHash});
   assert.equal(value.summary.synthetic,true);
   const item=reader.catalogue({release:f.release})[0];
   assert.equal(reader.record(item.version,'point','P1').selection_status,'HOLD');
   const document=reader.documents(f.release)[0];
   assert.equal(reader.page(document.version,2).start,2);
   assert.equal(reader.page(document.version,2).end,5);
   assert.throws(()=>reader.db.exec('DELETE FROM releases'),/readonly/);
  }finally{reader.close();}
 }
 assert.deepEqual([hash(f.from),hash(f.from+'-wal')],before);
 assert(!readdirSync(f.dir).some(name=>name.startsWith('.omnibus-backup-')));
});

test('backup refuses existing targets and orphan journals without changing them',async t=>{
 const f=fixture(t);
 for(const [index,suffix] of ['','-wal','-shm','-journal'].entries()){
  const to=join(f.dir,'occupied-'+index+'.sqlite'),occupied=to+suffix;
  writeFileSync(occupied,'CANARY-existing-data');
  await assert.rejects(backupRuntime({...f,to}),/never replaced/);
  assert.equal(readFileSync(occupied,'utf8'),'CANARY-existing-data');
  if(suffix)assert(!existsSync(to));
 }
});

test('broken references and source corruption never become a completed backup',async t=>{
 const f=fixture(t),to=join(f.dir,'invalid.sqlite');
 // SQLite structural integrity alone does not check these source relationships.
 f.writer.db.exec('PRAGMA foreign_keys=OFF');
 f.writer.db.prepare('INSERT INTO release_packages VALUES(?,?)').run(f.release,'missing-package');
 assert.equal(f.writer.integrity()[0].integrity_check,'ok');
 await assert.rejects(backupRuntime({...f,to}),/broken references/);
 assert(!existsSync(to));
 f.writer.db.prepare('DELETE FROM release_packages WHERE version=?').run('missing-package');
 f.writer.db.exec('PRAGMA foreign_keys=ON');
 f.writer.db.prepare('UPDATE pages SET payload=? WHERE number=1').run(JSON.stringify({page:1,text:'Changed'}));
 await assert.rejects(backupRuntime({...f,to}),/Release content verification failed/);
 assert(!existsSync(to));
 assert(!readdirSync(f.dir).some(name=>name.startsWith('.omnibus-backup-')));
});
