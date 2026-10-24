import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {newPrivacyRun, runPackagePrivacy, runBrowserPrivacy, root, guard} from './local-privacy.mjs';
import {privacyProbe,containsProbe} from './local-privacy-probe.mjs';

test('real local package CLI stays offline and ends in HOLD without a runtime publication', async () => {
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

test('private source probes are bounded, publication-bound and never become selectors or output text',()=>{
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
});

test('outbound probes fail before networking; telemetry also catches swallowed errors', () => {
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
