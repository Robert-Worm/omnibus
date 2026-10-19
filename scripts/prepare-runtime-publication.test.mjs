import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync,spawnSync} from 'node:child_process';
import {existsSync,mkdtempSync,rmSync,rmdirSync,writeFileSync,mkdirSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parsePublicationArgs,assertAuthoringCommit,readPublicationSettings,completeRuntimePublication,inspectPublicationInputs,publicationHelp,runPublicationStage} from './prepare-runtime-publication.mjs';
import {readDatabaseSettings} from './database-build-options.mjs';
import {runtimeFixture} from '../local-data/test-support/runtime-fixture.mjs';
import {CatalogueRepository,digest} from '../local-data/repository.mjs';
import {runtimeContract} from '../lib/runtime-contract.mjs';

function fixture(t) {
  const dir=mkdtempSync(join(tmpdir(),'omnibus-publisher-test-')),source=join(dir,'author');
  mkdirSync(source);
  t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const git=args=>execFileSync('git',args,{cwd:source,encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
  git(['init','--quiet']);
  mkdirSync(join(source,'scripts'));
  writeFileSync(join(source,'scripts/verify-application-release.mjs'),
    'export function verifyApplicationRelease(){throw Error("Synthetic review gate rejected");}');
  writeFileSync(join(source,'scripts/database-catalogue.mjs'),
    'throw Error("Synthetic author module must not run in setup checks");');
  const inventory = Object.keys(runtimeContract).map(path=>{
    const bytes = path.endsWith('.json') ? '{}' : '// Synthetic input only; not approved content.\n';
    mkdirSync(dirname(join(source,path)),{recursive:true});
    writeFileSync(join(source,path),bytes);
    return {path,bytes:Buffer.byteLength(bytes),sha256:digest(bytes)};
  });
  git(['add','.']);
  git(['-c','user.name=Synthetic test','-c','user.email=test@example.invalid','-c','commit.gpgsign=false','commit','-qm','Synthetic gate']);
  const database=join(dir,'input.sqlite'),repository=new CatalogueRepository(database);
  let release;
  try { release=repository.importRelease({manifest:{baselineVersion:'synthetic'},packages:[],documents:[],
    artifacts:[{name:'baseline-file-inventory',data:inventory}]}); } finally {repository.close();}
  return {dir,source,database,release,git,commit:git(['rev-parse','HEAD'])};
}

await test('publisher requires explicit trusted source, commit, database, release and a new destination',()=>{
  const args=['--source-root','author','--source-database','private.sqlite','--source-commit','a'.repeat(40),'--release','b'.repeat(64),'--out','private-output'];
  assert.equal(parsePublicationArgs(args).out,'private-output');
  for (const bad of [[],args.slice(0,-2),[...args,'--skip-reviews','yes'],args.map(v=>v==='--out'?'--release':v),args.map(v=>v==='a'.repeat(40)?'HEAD':v)])
    assert.throws(()=>parsePublicationArgs(bad),/Usage/);
});

await test('publication help needs no private settings or source checkout',t=>{
  const dir=mkdtempSync(join(tmpdir(),'omnibus-publication-help-'));
  t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const cli=fileURLToPath(new URL('./prepare-runtime-publication.mjs',import.meta.url));
  const result=spawnSync(process.execPath,[cli,'--help'],{cwd:dir,encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  assert.equal(result.stdout.trim(),publicationHelp.trim());
  assert.equal(result.stderr,'');
  assert.match(result.stdout,/no private code execution, content approval or output creation/);
  assert.match(result.stdout,/local-build.json/);
  for (const stage of ['INPUT_CHECK','CONTENT_REVIEW','FINAL_VERIFICATION'])
    assert.match(result.stdout,new RegExp(`${stage}: .+`));
  assert.match(result.stdout,/changed source or review evidence needs the existing review workflow and explicitly approved matching commit\/release/);
  assert.match(result.stdout,/data:check-runtime alone cannot complete a failed publication/);
});

await test('publication stages preserve successful results without repeating the operation',async()=>{
  const value={status:'synthetic'};
  let calls=0;
  assert.equal(await runPublicationStage('INPUT_CHECK',()=>{calls++;return value;}),value);
  assert.equal(await runPublicationStage('FINAL_VERIFICATION',async()=>{calls++;return value;}),value);
  assert.equal(calls,2);
});

await test('publication stage failures keep their cause and reject without retry or fallback',async()=>{
  for(const stage of ['INPUT_CHECK','CONTENT_REVIEW','FINAL_VERIFICATION'])for(const asynchronous of [false,true]){
    const cause=new Error('Synthetic failure');let calls=0;
    await assert.rejects(runPublicationStage(stage,()=>{
      calls++;
      if(asynchronous)return Promise.reject(cause);
      throw cause;
    }),error=>error.cause===cause&&error.message===`Publication stage ${stage}: Synthetic failure`);
    assert.equal(calls,1);
  }
  await assert.rejects(runPublicationStage('CONTENT_REVIEW',()=>{throw 'synthetic';}),/Unknown error/);
});

await test('publication options and check flag are order independent without changing their meaning',t=>{
  const dir=mkdtempSync(join(tmpdir(),'omnibus-publication-order-'));
  t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const file=join(dir,'settings.json');
  writeFileSync(file,JSON.stringify({sourceRoot:'author',sourceDatabase:'input.sqlite',sourceCommit:'a'.repeat(40),release:'b'.repeat(64)}));
  function permutations(blocks){
    return blocks.length ? blocks.flatMap((block,i)=>permutations(blocks.filter((_,j)=>i!==j)).map(rest=>[block,...rest])) : [[]];
  }
  for(const blocks of [
    [['--settings',file],['--out','new output']],
    [['--source-root','author'],['--source-database','input.sqlite'],['--source-commit','a'.repeat(40)],['--release','b'.repeat(64)],['--out','new output']],
  ]){
    const expected=parsePublicationArgs(blocks.flat());
    for(const check of [false,true])for(const order of permutations(check?[...blocks,['--check']]:blocks)){
      const args=order.flat(),before=[...args];
      assert.deepEqual(parsePublicationArgs(args),{...expected,...(check?{checkOnly:true}:{})});
      assert.deepEqual(args,before);
    }
  }
  assert(!existsSync(join(dir,'new output')));
});

await test('flexible ordering still rejects duplicates, missing values, mixed settings and unknown flags',()=>{
  const valid=['--source-root','author','--source-database','input.sqlite','--source-commit','a'.repeat(40),'--release','b'.repeat(64),'--out','new output'];
  for(const args of [
    ['--check',...valid,'--check'],[...valid,'--out','other'],[...valid,'--settings','absent.json'],
    ['--check','true',...valid],[...valid,'--unknown','yes'],['--settings','--check','--out','out'],
    ['--settings','absent.json','--out','out','--settings','absent.json'],
    ['--check','--out','out'],['--check',...valid.slice(0,-1)],
    ['--check',...valid.slice(0,-2),'--out','bad\0path'],
  ])assert.throws(()=>parsePublicationArgs(args),/Usage:/);
});

await test('invalid CLI usage fails with guidance rather than an unhandled stack',()=>{
  const cli=fileURLToPath(new URL('./prepare-runtime-publication.mjs',import.meta.url));
  for(const args of [[],['--help','--skip-reviews'],['--check']]){
    const result=spawnSync(process.execPath,[cli,...args],{encoding:'utf8'});
    assert.equal(result.status,1);
    assert.equal(result.stdout,'');
    assert.match(result.stderr,/Publication failed: Usage:/);
    assert.match(result.stderr,/npm run data:publish-runtime -- --help/);
    assert.doesNotMatch(result.stderr,/\n\s+at /);
  }
});

await test('uncommitted or differently pinned authoring inputs are rejected',t=>{
  const f=fixture(t);
  assertAuthoringCommit(f.source,f.commit);
  assert.throws(()=>assertAuthoringCommit(f.source,'f'.repeat(40)),/explicitly approved commit/);
  writeFileSync(join(f.source,'unreviewed.mjs'),'export const text="Not reviewed";');
  assert.throws(()=>assertAuthoringCommit(f.source,f.commit),/explicitly approved commit/);
});

await test('review failure cannot create a ready publication or replace an existing folder',t=>{
  const f=fixture(t),out=join(f.dir,'publication');
  const run=()=>spawnSync(process.execPath,[fileURLToPath(new URL('./prepare-runtime-publication.mjs',import.meta.url)),
    '--source-root',f.source,'--source-database',f.database,'--source-commit',f.commit,'--release',f.release,'--out',out],{encoding:'utf8'});
  const result=run();
  assert.notEqual(result.status,0);
  assert.match(result.stderr,/Synthetic review gate rejected/);
  assert.match(result.stderr,/Publication stage CONTENT_REVIEW:/);
  assert.match(result.stderr,/rerun with --check, then only after success rerun without --check/);
  assert(!existsSync(join(out,'local-build.json')));
  assert(!existsSync(join(out,'catalogue.sqlite')));
  writeFileSync(join(out,'keep.txt'),'Existing output');
  const retry=run();
  assert.notEqual(retry.status,0);
  assert.match(retry.stderr,/EEXIST/);
  assert.match(retry.stderr,/Publication stage INPUT_CHECK:/);
  assert(existsSync(join(out,'keep.txt')));
});

await test('corrected input checks cannot bypass content review on a fresh publication attempt',t=>{
  const f=fixture(t),out=join(f.dir,'fresh-output'),before=readFileSync(f.database);
  const cli=fileURLToPath(new URL('./prepare-runtime-publication.mjs',import.meta.url));
  const args=['--source-root',f.source,'--source-database',f.database,'--source-commit',f.commit,'--release',f.release,'--out',out];
  const wrongPin=[...args];wrongPin[7]='f'.repeat(64);
  const rejected=spawnSync(process.execPath,[cli,...wrongPin],{encoding:'utf8'});
  assert.equal(rejected.status,1);
  assert.match(rejected.stderr,/Publication stage INPUT_CHECK:/);
  assert.match(rejected.stderr,/rerun with --check, then only after success rerun without --check/);
  assert(!existsSync(out));
  const checked=spawnSync(process.execPath,[cli,...args,'--check'],{encoding:'utf8'});
  assert.equal(checked.status,0,checked.stderr);
  assert.equal(JSON.parse(checked.stdout).contentApproved,false);
  assert(!existsSync(out));
  const published=spawnSync(process.execPath,[cli,...args],{encoding:'utf8'});
  assert.equal(published.status,1);
  assert.match(published.stderr,/Publication stage CONTENT_REVIEW:/);
  assert(!existsSync(join(out,'publication-receipt.json')));
  assert(!existsSync(join(out,'local-build.json')));
  assert.deepEqual(readFileSync(f.database),before);
  assert.equal(f.git(['status','--porcelain']),'');
});

await test('output inside the original authoring checkout is refused, including dot-prefixed names',t=>{
  const f=fixture(t),out=join(f.source,'..still-inside');
  const result=spawnSync(process.execPath,[fileURLToPath(new URL('./prepare-runtime-publication.mjs',import.meta.url)),
    '--source-root',f.source,'--source-database',f.database,'--source-commit',f.commit,'--release','b'.repeat(64),'--out',out],{encoding:'utf8'});
  assert.notEqual(result.status,0);
  assert.match(result.stderr,/outside the original authoring checkout/);
  assert(!existsSync(out));
});

await test('publication settings resolve private inputs beside the file, with output still explicit',t=>{
  const f=fixture(t),path=join(f.dir,'publication-settings.json');
  const settings={sourceRoot:'author',sourceDatabase:'input.sqlite',sourceCommit:f.commit,release:'b'.repeat(64)};
  writeFileSync(path,JSON.stringify(settings));
  const expected={'source-root':f.source,'source-database':f.database,'source-commit':f.commit,release:settings.release};
  assert.deepEqual(readPublicationSettings(path),expected);
  assert.deepEqual(parsePublicationArgs(['--settings',path,'--out','new-output']),{...expected,out:'new-output'});
  for(const args of [['--settings',path],['--settings',path,'--out',''],
    ['--settings',path,'--out','out','--release','c'.repeat(64)],['--out','out','--settings',path,'--skip-reviews','yes']])
    assert.throws(()=>parsePublicationArgs(args),/Usage/);
  assert.deepEqual(JSON.parse(readFileSync(path)),settings);
});

await test('publication settings refuse missing pins, unknown options and malformed input',t=>{
  const f=fixture(t),path=join(f.dir,'publication-settings.json');
  const valid={sourceRoot:'author',sourceDatabase:'input.sqlite',sourceCommit:f.commit,release:'b'.repeat(64)};
  for(const value of [null,[],{}, {...valid,release:'latest'}, {...valid,sourceCommit:'HEAD'},
    {...valid,sourceRoot:' '},{...valid,sourceDatabase:'a\0b'}, {...valid,out:'existing'},
    {...valid,skipReviews:true},{...valid,sourceRoot:[]}, {...valid,sourceRoot:'x'.repeat(16384)}]) {
    writeFileSync(path,JSON.stringify(value));
    assert.throws(()=>readPublicationSettings(path),/Invalid publication settings/);
  }
  writeFileSync(path,'not JSON');
  assert.throws(()=>readPublicationSettings(path),/Invalid publication settings/);
  assert.throws(()=>readPublicationSettings(f.dir),/Invalid publication settings/);
});

await test('settings route cannot bypass the private review gate or produce readiness files',t=>{
  const f=fixture(t),path=join(f.dir,'publication-settings.json'),out=join(f.dir,'publication');
  writeFileSync(path,JSON.stringify({sourceRoot:'author',sourceDatabase:'input.sqlite',sourceCommit:f.commit,release:f.release}));
  const result=spawnSync(process.execPath,[fileURLToPath(new URL('./prepare-runtime-publication.mjs',import.meta.url)),
    '--settings',path,'--out',out],{encoding:'utf8'});
  assert.notEqual(result.status,0);
  assert.match(result.stderr,/Synthetic review gate rejected/);
  assert(!existsSync(join(out,'local-build.json')));
  assert(!existsSync(join(out,'publication-receipt.json')));
});

await test('completed publication supplies portable build settings only after read-only acceptance',t=>{
  const f=runtimeFixture(t),before=readFileSync(f.databasePath);
  const options={database:f.databasePath,release:f.release,publication:f.publication,sourceCommit:'a'.repeat(40),summary:{synthetic:true}};
  const receipt=completeRuntimePublication(options),settingsPath=join(f.dir,'local-build.json');
  assert.equal(receipt.sourceCommit,options.sourceCommit);
  assert.equal(receipt.release,f.release);
  assert.deepEqual(readDatabaseSettings(settingsPath),{database:resolve(f.databasePath),release:f.release,publication:f.publication});
  assert.equal(JSON.parse(readFileSync(settingsPath)).database,'synthetic.sqlite');
  assert.deepEqual(JSON.parse(readFileSync(join(f.dir,'publication-receipt.json'))),receipt);
  assert.deepEqual(readFileSync(f.databasePath),before);
  const saved=readFileSync(settingsPath);
  assert.throws(()=>completeRuntimePublication(options),/EEXIST/);
  assert.deepEqual(readFileSync(settingsPath),saved);
});

await test('changed source release cannot receive a publication receipt or build settings',t=>{
  const f=runtimeFixture(t),repository=new CatalogueRepository(f.databasePath);
  try { repository.db.prepare('UPDATE releases SET manifest=? WHERE id=?').run('{}',f.release); }
  finally { repository.close(); }
  const before=readFileSync(f.databasePath);
  assert.throws(()=>completeRuntimePublication({database:f.databasePath,release:f.release,publication:f.publication,sourceCommit:'a'.repeat(40),summary:{}}));
  assert(!existsSync(join(f.dir,'publication-receipt.json')));
  assert(!existsSync(join(f.dir,'local-build.json')));
  assert.deepEqual(readFileSync(f.databasePath),before);
});

await test('final handoff write failure preserves its cause and cannot resume from a receipt',async t=>{
  const f=runtimeFixture(t),before=readFileSync(f.databasePath);
  const options={database:f.databasePath,release:f.release,publication:f.publication,sourceCommit:'a'.repeat(40),summary:{synthetic:true}};
  // A directory at the settings path deterministically blocks the exclusive write.
  const settingsPath=join(f.dir,'local-build.json');
  mkdirSync(settingsPath);
  let calls=0;
  await assert.rejects(runPublicationStage('FINAL_VERIFICATION',()=>{
    calls++;
    return completeRuntimePublication(options);
  }),error=>error.cause?.code==='EEXIST'&&error.message===`Publication stage FINAL_VERIFICATION: ${error.cause.message}`);
  assert.equal(calls,1);
  const receiptPath=join(f.dir,'publication-receipt.json'),receipt=readFileSync(receiptPath);
  // Even after the settings-path obstruction is removed, this output is not resumable.
  rmdirSync(settingsPath);
  assert.throws(()=>completeRuntimePublication(options),{code:'EEXIST'});
  assert(!existsSync(settingsPath));
  assert.deepEqual(readFileSync(receiptPath),receipt);
  assert.deepEqual(readFileSync(f.databasePath),before);
});

await test('setup check verifies the pinned inputs without executing private code or creating output',t=>{
  const f=fixture(t),out=join(f.dir,'checked-but-not-created'),path=join(f.dir,'settings.json');
  writeFileSync(path,JSON.stringify({sourceRoot:'author',sourceDatabase:'input.sqlite',sourceCommit:f.commit,release:f.release}));
  const before=readFileSync(f.database),args=['--check','--out',out,'--settings',path];
  assert.equal(parsePublicationArgs(args).checkOnly,true);
  const result=spawnSync(process.execPath,[fileURLToPath(new URL('./prepare-runtime-publication.mjs',import.meta.url)),...args],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  assert.deepEqual(JSON.parse(result.stdout),{status:'VERIFIED_PUBLICATION_INPUTS',release:f.release,
    sourceCommit:f.commit,modules:Object.keys(runtimeContract).length,
    privateReviewsExecuted:false,contentApproved:false,publicationCreated:false});
  assert(!existsSync(out));
  assert.deepEqual(readFileSync(f.database),before);
  assert.equal(f.git(['status','--porcelain']),'');
  assert.throws(()=>parsePublicationArgs([...args,'--check']),/Usage/);
});

await test('normal publication rejects a mismatched release before creating its destination',t=>{
  const f=fixture(t),out=join(f.dir,'must-not-exist');
  const result=spawnSync(process.execPath,[fileURLToPath(new URL('./prepare-runtime-publication.mjs',import.meta.url)),
    '--source-root',f.source,'--source-database',f.database,'--source-commit',f.commit,'--release','f'.repeat(64),'--out',out],{encoding:'utf8'});
  assert.notEqual(result.status,0);
  assert(!result.stderr.includes('Synthetic review gate rejected'));
  assert(!existsSync(out));
});

await test('setup rejects changed authoring inputs even with a new clean commit and refuses existing output',t=>{
  const f=fixture(t),out=join(f.dir,'output'),options={'source-root':f.source,'source-database':f.database,'source-commit':f.commit,release:f.release,out};
  mkdirSync(out);
  writeFileSync(join(out,'keep.txt'),'Existing output');
  assert.throws(()=>inspectPublicationInputs(options),/EEXIST/);
  assert.equal(readFileSync(join(out,'keep.txt'),'utf8'),'Existing output');
  options.out=join(f.dir,'new-output');
  const id=Object.keys(runtimeContract)[0];
  writeFileSync(join(f.source,id),'// Different synthetic authoring input');
  f.git(['add',id]);
  f.git(['-c','user.name=Synthetic test','-c','user.email=test@example.invalid','-c','commit.gpgsign=false','commit','-qm','Changed input']);
  options['source-commit']=f.git(['rev-parse','HEAD']);
  assert.throws(()=>inspectPublicationInputs(options),/differs from the pinned release/);
  assert(!existsSync(options.out));
});

await test('Windows UTF-8 publication settings retain explicit pins and do not relax approval fields',t=>{
  const dir=mkdtempSync(join(tmpdir(),'omnibus-publication-encoding-'));
  t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const file=join(dir,'settings.json');
  const settings={sourceRoot:'author folder',sourceDatabase:'source database.sqlite',sourceCommit:'a'.repeat(40),release:'b'.repeat(64)};
  writeFileSync(file,'\uFEFF'+JSON.stringify(settings,null,2)+'\r\n');
  const expected={'source-root':resolve(dir,settings.sourceRoot),'source-database':resolve(dir,settings.sourceDatabase),'source-commit':settings.sourceCommit,release:settings.release};
  assert.deepEqual(readPublicationSettings(file),expected);
  assert.deepEqual(parsePublicationArgs(['--settings',file,'--out','new-output','--check']),{...expected,out:'new-output',checkOnly:true});
  for(const bytes of [
    '\uFEFF'+JSON.stringify({...settings,sourceCommit:'HEAD'}),
    '\uFEFF'+JSON.stringify({...settings,skipReviews:true}),
    '\uFEFF\uFEFF'+JSON.stringify(settings),
    Buffer.from('\uFEFF'+JSON.stringify(settings),'utf16le'),
  ]){
    writeFileSync(file,bytes);
    assert.throws(()=>readPublicationSettings(file),/Invalid publication settings/);
  }
});
