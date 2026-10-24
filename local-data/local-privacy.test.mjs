import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {newPrivacyRun, runPackagePrivacy, root, guard} from './local-privacy.mjs';

test('real local package CLI stays offline and ends in HOLD without a runtime publication', async () => {
  const result = await runPackagePrivacy(newPrivacyRun());
  assert.equal(result.runtime, 'HOLD');
  assert.equal(result.sourceRoundTrip, true);
  assert.deepEqual(result.attempts, []);
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
