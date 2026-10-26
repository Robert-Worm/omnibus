import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {newPrivacyRun, runPackagePrivacy, runBrowserPrivacy, root, guard} from './local-privacy.mjs';
import {privacyProbe,containsProbe,requestedSourceHashes} from './local-privacy-probe.mjs';
import {prepareGuardedRuntime} from './local-privacy-sources.mjs';

void test('real local package CLI stays offline and ends in HOLD without a runtime publication', async () => {
  const dir=newPrivacyRun(), result = await runPackagePrivacy(dir);
  assert.equal(result.runtime, 'HOLD');
  assert.equal(result.sourceRoundTrip, true);
  assert.deepEqual(result.attempts, []);
  const staged=JSON.parse(readFileSync(join(dir,'synthetic-review-database/local-database-result.json')));
  const settings=join(dir,'held-settings.json');
  writeFileSync(settings,JSON.stringify({database:staged.database,release:staged.release,publication:'f'.repeat(64)}));
  await assert.rejects(()=>runBrowserPrivacy({settings,webRoot:'must-not-open',executablePath:'must-not-start'},dir),
    /prepare this database with the content publisher first/);
  assert(!existsSync(join(dir,'browser-result.json')),'No successful browser receipt for a held database');
});

void test('private source probes are bounded, publication-bound and never become selectors or output text',()=>{
  const dir=newPrivacyRun(),path=join(dir,'probe.json');
  const pins={release:'a'.repeat(64),publication:'b'.repeat(64)};
  const value={schema:1,...pins,criterionId:'FICTIEF-K01',pointId:'FICTIEF-K01/TP02',sourceTextMarker:'Fictieve café bron'};
  writeFileSync(path,JSON.stringify(value));
  const probe=privacyProbe(path,pins);
  assert.equal(probe.pointId,value.pointId);
  assert.match(probe.identity,/^[a-f0-9]{64}$/);
  for(const change of [{release:'c'.repeat(64)},{publication:'d'.repeat(64)},
    {pointId:'ANDER/TP01'},{criterionId:'bad" selector'},{sourceTextMarker:''},
    {sourceTextMarker:'x'.repeat(257)},{extra:'ignored?'},{schema:2}]) {
    writeFileSync(path,JSON.stringify({...value,...change}));
    assert.throws(()=>privacyProbe(path,pins),/Invalid private privacy probe/);
  }
  writeFileSync(path,' '.repeat(16385));
  assert.throws(()=>privacyProbe(path,pins),/Invalid private privacy probe/);
  assert(containsProbe('url/'+encodeURIComponent(value.sourceTextMarker),value.sourceTextMarker));
  assert(containsProbe('body '+value.sourceTextMarker,value.sourceTextMarker));
  assert(!containsProbe('%invalid','not present'));
  assert(!containsProbe('ordinary request',''));
  assert.equal(privacyProbe(undefined,pins).identity,null);
  const framework={...value,schema:2,kind:'framework',sourceId:'FICTIEF',criterionId:'C1',pointId:'K1'};
  writeFileSync(path,JSON.stringify(framework));
  assert.equal(privacyProbe(path,pins).kind,'framework');
  for(const change of [{kind:'model'},{sourceId:'bad" selector'},{publication:'f'.repeat(64)},
    {kind:'report'},{pointId:'bad" selector'}]) {
    writeFileSync(path,JSON.stringify({...framework,...change}));
    assert.throws(()=>privacyProbe(path,pins),/Invalid private privacy probe/);
  }
});

void test('source delivery counts only exact pinned framework resources, including batches',()=>{
  const expected=new Set(['a'.repeat(64),'b'.repeat(64)]), release='c'.repeat(64), other='d'.repeat(64);
  const first=[...expected][0], second=[...expected][1];
  const url=path=>new URL('http://127.0.0.1:12345'+path);
  assert.deepEqual(requestedSourceHashes(url('/api/v1/content/'+first+'?release='+release),release,expected),[first]);
  assert.deepEqual(requestedSourceHashes(url('/api/v1/content-batch?release='+release+'&hash='+other+'&hash='+second),release,expected),[second]);
  for(const path of ['/api/v1/content/'+other+'?release='+release,
    '/api/v1/content/'+first+'?release='+other,'/api/v1/content/'+first,
    '/api/v1/version?release='+release+'&hash='+first])
    assert.deepEqual(requestedSourceHashes(url(path),release,expected),[]);
});

for(const kind of ['report','framework']) void test('new admitted synthetic '+kind+' runtime is constructed without Node networking',()=>{
  const dir=newPrivacyRun(), result=prepareGuardedRuntime(kind,dir);
  assert.equal(result.runtime,'LOCAL_READY'); assert.equal(result.baselineUnchanged,true);
  const pins=JSON.parse(readFileSync(result.settings));
  assert.equal(privacyProbe(join(dir,'probe.json'),pins).kind,kind);
});

void test('outbound probes fail before networking; telemetry also catches swallowed errors', () => {
  const dir = newPrivacyRun(), receipt = join(dir, 'negative-control.json');
  const child = spawnSync(process.execPath, ['--import', guard, '--input-type=module', '-e', `
    import net from 'node:net'; import tls from 'node:tls'; import http from 'node:http';
    import https from 'node:https'; import http2 from 'node:http2'; import dns from 'node:dns'; import dgram from 'node:dgram';
    const probes = [() => fetch('https://privacy.invalid/'), () => http.get('http://privacy.invalid/'),
      () => https.get('https://privacy.invalid/'), () => net.connect(443, 'privacy.invalid'),
      () => tls.connect(443, 'privacy.invalid'), () => http2.connect('https://privacy.invalid'),
      () => dns.promises.lookup('privacy.invalid'), () => new dns.promises.Resolver().resolve4('privacy.invalid'),
      () => { const s = dgram.createSocket('udp4'); try { s.send('synthetic', 443, '192.0.2.1'); } finally { s.close(); } }];
    for (const probe of probes) { try { await probe(); throw Error('Probe escaped'); }
      catch (error) { if (!error.message.startsWith('LOCAL_PRIVACY_BLOCKED:')) throw error; } }
  `], {cwd:root, encoding:'utf8', timeout:15000, windowsHide:true,
    env:{...process.env, OMNIBUS_PRIVACY_GUARD:'1', OMNIBUS_PRIVACY_RECEIPT:receipt}});
  assert.ifError(child.error); assert.equal(child.status, 0, child.stderr);
  assert.deepEqual(JSON.parse(readFileSync(receipt)).attempts, ['fetch','http','https','tcp','tls','http2','dns','dns','udp']);
});
