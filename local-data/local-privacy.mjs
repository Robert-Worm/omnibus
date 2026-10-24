// Optional controlled privacy rehearsal. Outputs stay in this checkout's work/.
import assert from 'node:assert/strict';
import {spawn, spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import http from 'node:http';
import {CatalogueRepository} from './repository.mjs';
import {checkRuntimeDatabase} from '../scripts/check-runtime-database.mjs';
import {readDatabaseSettings} from '../scripts/database-build-options.mjs';
import {createPrivacyPackage, syntheticMarker, syntheticSource, bytesHash, saveJson} from './local-privacy-fixture.mjs';

export const root = fileURLToPath(new URL('../', import.meta.url));
export const guard = new URL('./local-privacy-guard.mjs', import.meta.url).href;
const self = fileURLToPath(import.meta.url);
const readJson = path => JSON.parse(readFileSync(path, 'utf8'));

export function newPrivacyRun() {
  const work = join(root, 'work');
  mkdirSync(work, {recursive:true});
  assert.equal(realpathSync(work), join(realpathSync(root), 'work'), 'work/ must not redirect elsewhere');
  return mkdtempSync(join(work, 'local-privacy-'));
}

const cleanEnvironment = () => Object.fromEntries(['PATH','SystemRoot','WINDIR','TEMP','TMP']
  .filter(k => process.env[k]).map(k => [k, process.env[k]]));
const isolatedEnvironment = receipt => ({...cleanEnvironment(), OMNIBUS_PRIVACY_GUARD:'1', OMNIBUS_PRIVACY_RECEIPT:receipt});

export async function runPackagePrivacy(dir) {
  const f = await createPrivacyPackage(dir), receipt = join(dir, 'package-network.json');
  const child = spawnSync(process.execPath, ['--import', guard, join(root, 'scripts/build-local-database.mjs'),
    '--plan', f.plan, '--out', f.out], {cwd:root, windowsHide:true, encoding:'utf8', timeout:30000,
    env:isolatedEnvironment(receipt)});
  assert.ifError(child.error); assert.equal(child.status, 0, child.stderr);
  const result = JSON.parse(child.stdout), network = readJson(receipt);
  assert.deepEqual(network.attempts, [], 'Even caught/failed network attempts fail the rehearsal');
  assert.equal(result.runtime.status, 'HOLD');
  for (const key of ['publishable','contentValidated','reviewValidated','newContentApproval']) assert.equal(result[key], false);
  assert.equal(result.runtime.publication, null);
  assert.equal(existsSync(join(f.out, 'local-build.json')), false);
  assert.equal(existsSync(join(dir, 'package-code-executed.txt')), false);
  const before = bytesHash(readFileSync(result.database));
  const repository = new CatalogueRepository(result.database, {readOnly:true});
  try {
    const doc = repository.documents(result.release)[0];
    assert.equal(repository.page(doc.version, 1).page.text, syntheticSource);
    assert.equal(repository.db.prepare("SELECT name FROM sqlite_master WHERE name='runtime_publications'").get(), undefined);
    assert.equal(repository.exportRelease(result.release).packages[0].records[0].status, 'HOLD');
  } finally {repository.close();}
  assert.throws(() => checkRuntimeDatabase({database:result.database, release:result.release, publication:result.runtime.publication}),
    /publication|runtime/i, 'A staged package must not be presented as a working runtime');
  assert.equal(bytesHash(readFileSync(result.database)), before);
  const summary = {status:'passed', node:process.version, sourceRoundTrip:true, packageCodeExecuted:false,
    runtime:'HOLD', browserImportSupported:false, attempts:network.attempts};
  saveJson(join(dir, 'package-result.json'), summary);
  return summary;
}

async function startGuardedServer(spec, dir) {
  const config = join(dir, 'server-input.json'), receipt = join(dir, 'server-network.json');
  saveJson(config, spec);
  const child = spawn(process.execPath, ['--import', guard, self, '--serve', config], {
    cwd:root, windowsHide:true, env:isolatedEnvironment(receipt), stdio:['ignore','ignore','pipe','ipc']});
  let stderr = '';
  child.stderr.on('data', bytes => {stderr += bytes;});
  const exited = new Promise(resolve => child.once('exit', (code, signal) => resolve({code, signal})));
  const close = async () => {
    if (child.exitCode === null && child.signalCode === null) {
      const timer = setTimeout(() => child.kill(), 6000);
      try {if (child.connected) child.send('close'); else child.kill(); await exited;} finally {clearTimeout(timer);}
    }
    assert.deepEqual(await exited, {code:0, signal:null}, 'Server must stop cleanly');
    return readJson(receipt);
  };
  try {
    const url = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {child.kill(); reject(Error('Server startup timed out'));}, 30000);
      child.once('message', message => {clearTimeout(timer); resolve(message.url);});
      child.once('error', error => {clearTimeout(timer); reject(error);});
      child.once('exit', () => {clearTimeout(timer); reject(Error('Server startup failed: ' + stderr));});
    });
    assert.match(url, /^http:\/\/127\.0\.0\.1:\d+$/);
    return {url, close};
  } catch (error) {child.kill(); await exited; throw error;}
}

// A fail-closed local proxy is a second layer for browser traffic outside routing
// (including browser background requests). It never resolves or forwards a host.
async function denyProxy() {
  let denied = 0;
  const server = http.createServer((_req, res) => {denied++; res.writeHead(502); res.end();});
  server.on('connect', (_req, socket) => {denied++; socket.end('HTTP/1.1 502 Blocked\r\n\r\n');});
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return {url:'http://127.0.0.1:' + server.address().port, count:() => denied,
    close:() => new Promise(resolve => {server.close(resolve); server.closeAllConnections();})};
}

export async function runBrowserPrivacy({settings, webRoot, executablePath, playwrightModule}, dir) {
  const pins = readDatabaseSettings(settings);
  const before = bytesHash(readFileSync(pins.database));
  const manifest = readJson(join(webRoot, 'omnibus-release.json'));
  const result = {status:'running', node:process.version, code:manifest.codeRevision ?? null,
    release:pins.release, publication:pins.publication, steps:[], requests:[], errors:[],
    scope:'Local supported web build with public reference data and only synthetic user input; not own-package runtime import'};
  let server, proxy, browser;
  let phase = 'application';
  try {
    const {chromium} = createRequire(import.meta.url)(playwrightModule || 'playwright');
    const {expandProject} = await import('../lib/project-codec.mjs');
    server = await startGuardedServer({databasePath:pins.database, release:pins.release,
      publication:pins.publication, webRoot:resolve(webRoot), port:0}, dir);
    proxy = await denyProxy();
    browser = await chromium.launch({headless:true, executablePath, downloadsPath:dir, env:cleanEnvironment(),
      args:['--disable-background-networking','--disable-quic',
        '--proxy-server=' + proxy.url, '--proxy-bypass-list=127.0.0.1',
        '--force-webrtc-ip-handling-policy=disable_non_proxied_udp',
        '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1']});
    result.browser = browser.version();
    const context = await browser.newContext({serviceWorkers:'block', acceptDownloads:true});
    const record = (request, channel = request.resourceType()) => {
      const url = new URL(request.url());
      const local = url.origin === server.url;
      const text = request.url() + JSON.stringify(request.headers()) + (request.postData() || '');
      // Evidence contains classifications, never raw headers, text, queries or source URLs.
      const entry = {phase, channel, local, method:request.method(), hasBody:request.postData() !== null,
        containsSyntheticInput:text.includes(syntheticMarker),
        kind:url.pathname.startsWith('/api/v1/documents/') ? 'source' : url.pathname.startsWith('/api/') ? 'api' : 'asset'};
      result.requests.push(entry);
      return entry;
    };
    await context.route('**/*', async route => {
      const request = route.request(), entry = record(request);
      if (phase === 'control' && request.url() === 'http://privacy-control.invalid/') {
        await route.fulfill({contentType:'text/html', body:'<!doctype html><title>Synthetic network control</title>'});
      } else if (entry.local && entry.method === 'GET' && !entry.hasBody && !entry.containsSyntheticInput) await route.continue();
      else await route.abort('blockedbyclient');
    });
    await context.routeWebSocket('**/*', socket => {
      result.requests.push({phase, channel:'websocket', local:false, method:'CONNECT', hasBody:false,
        containsSyntheticInput:socket.url().includes(syntheticMarker), kind:'socket'});
      socket.close();
    });
    context.on('page', page => {
      page.on('pageerror', () => {if (phase === 'application') result.errors.push('pageerror');});
      page.on('response', response => {if (phase === 'application' && response.status() >= 400) result.errors.push('http-' + response.status());});
    });
    const page = await context.newPage();
    page.setDefaultTimeout(20000);
    await page.goto(server.url + '/#begin');
    await page.locator('.project-save-indicator[data-state="saved"]').waitFor();
    const version = await page.evaluate(async () => {
      const response = await fetch('/api/v1/version');
      if (!response.ok) throw Error('Build identity unavailable');
      return response.json();
    });
    assert.deepEqual(version.data, {release:pins.release, publication:pins.publication});
    result.webBuildSha256 = version.code.webSha256;
    result.steps.push('empty start');
    await page.getByRole('button', {name:/Start vanuit deze behoefte/}).click();
    await page.getByText('Diagnostisch', {exact:true}).first().click();
    await page.locator('#goal-subject').fill(syntheticMarker);
    await page.locator('#goal-subject').blur();
    await page.locator('.project-save-indicator[data-state="saved"]').waitFor();
    await page.reload();
    assert.equal(await page.locator('#goal-subject').inputValue(), syntheticMarker);
    result.steps.push('synthetic input, automatic save and reload');
    // Read a real public source through the unchanged supported catalogue/viewer.
    await page.evaluate(() => {location.hash = '#rapporten';});
    await page.getByRole('textbox', {name:'Zoek rapport', exact:true}).fill('CIBGBIO24-K01');
    await page.getByRole('button', {name:'Bekijk normen en toetspunten →', exact:true}).click();
    await page.getByRole('button', {name:'Kies toetspunten voor CIBGBIO24-K01', exact:true}).first().click();
    const detail = page.locator('.bd-pilot-detail'), point = detail.locator('.bd-point').first();
    await point.getByRole('checkbox').click();
    await point.getByRole('button', {name:'Bronpassage', exact:true}).click();
    await detail.locator('.report-library mark').first().waitFor();
    result.steps.push('public source read and selection');
    await page.keyboard.press('Escape');
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', {name:'Bewaar project', exact:true}).click();
    const download = await downloadPromise, project = join(dir, 'synthetic-project.json');
    await download.saveAs(project);
    assert(JSON.stringify(expandProject(readJson(project))).includes(syntheticMarker), 'Downloaded project must contain the synthetic input');
    await page.getByRole('button', {name:'Nieuw project', exact:true}).click();
    await page.getByRole('button', {name:'Wis project en begin opnieuw', exact:true}).click();
    await page.locator('.entry-options').waitFor();
    const empty = await page.evaluate(() => localStorage.getItem('rijksmap-project-v1'));
    assert(!JSON.stringify(expandProject(JSON.parse(empty))).includes(syntheticMarker));
    await page.getByLabel('Open lokaal project of oud concept', {exact:true}).setInputFiles(project);
    await page.waitForFunction(previous => localStorage.getItem('rijksmap-project-v1') !== previous, empty);
    await page.locator('.project-save-indicator[data-state="saved"]').waitFor();
    await page.reload();
    await page.locator('.project-save-indicator[data-state="saved"]').waitFor();
    const restored = await page.evaluate(() => localStorage.getItem('rijksmap-project-v1'));
    assert(JSON.stringify(expandProject(JSON.parse(restored))).includes(syntheticMarker));
    result.steps.push('local project download, reopen and reload');
    await page.evaluate(() => {location.hash = '#kaderexport';});
    await page.getByRole('group', {name:'Werkvorm', exact:true}).waitFor();
    result.steps.push('export preview');
    await page.waitForTimeout(1000); // Bounded settling window for delayed work.
    // Include closing the app in its own measurement. Its workers must be gone
    // before injected controls begin, so a late app request cannot be excused as
    // one of our deliberate external probes.
    for (const open of context.pages()) await open.close();
    const application = result.requests.filter(r => r.phase === 'application');
    assert(application.some(r => r.kind === 'source'), 'Exercise actual source delivery');
    assert(application.every(r => r.local && r.method === 'GET' && !r.hasBody && !r.containsSyntheticInput),
      'Unexpected application request: inspect the local evidence before making any privacy claim');
    assert.deepEqual(result.errors, []);
    // Separate negative controls. These are deliberately injected requests, never
    // represented as application leaks or as a real cloud service invocation.
    phase = 'control';
    const control = await context.newPage();
    await control.goto('http://privacy-control.invalid/');
    await control.evaluate(async marker => {
      const done = [];
      done.push(fetch('https://chosen-ai.invalid/', {method:'POST', body:marker}).catch(() => {}));
      done.push(new Promise(resolve => {const x = new XMLHttpRequest(); x.open('POST','https://xhr.invalid/'); x.onloadend = resolve; x.send(marker);}));
      navigator.sendBeacon('https://beacon.invalid/', marker);
      const image = new Image(); image.src = 'https://image.invalid/' + marker; document.body.append(image);
      new WebSocket('wss://socket.invalid/' + marker);
      await Promise.all(done);
    }, syntheticMarker);
    await control.waitForTimeout(500);
    await control.evaluate(() => {const a = document.createElement('a'); a.href = 'https://source.invalid/publication';
      a.textContent = 'Fictieve externe bron'; a.target = '_blank'; a.rel = 'noopener noreferrer'; document.body.append(a);});
    await control.getByRole('link', {name:'Fictieve externe bron'}).click();
    await control.waitForTimeout(500);
    const controls = result.requests.filter(r => r.phase === 'control');
    for (const channel of ['fetch','xhr','ping','image','websocket','document'])
      assert(controls.some(r => r.channel === channel && !r.local), 'Missing negative control: ' + channel);
    assert(controls.some(r => r.channel === 'fetch' && r.method === 'POST' && r.containsSyntheticInput));
    assert(controls.filter(r => r.channel === 'document').length >= 2, 'New-tab source navigation must be intercepted');
    result.steps.push('blocked fetch, XHR, beacon, image, WebSocket and explicit external source controls');
    await context.close();
    result.status = 'passed';
  } finally {
    await browser?.close();
    result.proxyDenied = proxy?.count() ?? 0;
    await proxy?.close();
    if (server) {
      result.serverNetwork = await server.close();
      if (result.serverNetwork.attempts.length) result.status = 'failed';
    }
    result.databaseUnchanged = bytesHash(readFileSync(pins.database)) === before;
    if (!result.databaseUnchanged || result.status === 'running') result.status = 'failed';
    saveJson(join(dir, 'browser-result.json'), result);
  }
  assert.equal(result.status, 'passed');
  return result;
}

if (process.argv[1] && resolve(process.argv[1]) === self) {
  if (process.argv[2] === '--serve') {
    assert.equal(process.env.OMNIBUS_PRIVACY_GUARD, '1');
    const {startDatabasePreview} = await import('../scripts/serve-database-web.mjs');
    const app = await startDatabasePreview(readJson(process.argv[3]));
    process.send({url:app.url});
    process.once('message', async message => {
      assert.equal(message, 'close'); await app.close(); process.disconnect();
    });
  } else {
    const args = process.argv.slice(2), options = {};
    assert(args.length % 2 === 0, 'Use --settings <public settings> --web-root <own build> --browser <executable> --playwright <module>');
    for (let i = 0; i < args.length; i += 2) {
      assert(['--settings','--web-root','--browser','--playwright'].includes(args[i]) && !Object.hasOwn(options,args[i]));
      options[args[i]] = args[i + 1];
    }
    if (args.length) assert(options['--settings'] && options['--web-root'] && options['--browser']);
    const dir = newPrivacyRun();
    console.log('Local evidence: ' + dir);
    await runPackagePrivacy(dir);
    if (args.length) await runBrowserPrivacy({settings:options['--settings'], webRoot:options['--web-root'],
      executablePath:options['--browser'], playwrightModule:options['--playwright']}, dir);
    console.log(args.length ? 'Package and browser rehearsal passed; scope and limits are in the receipts.' :
      'Package rehearsal passed; browser route NOT tested by this command.');
  }
}
