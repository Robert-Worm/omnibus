import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createServer} from 'node:net';
import {once} from 'node:events';
import {randomUUID} from 'node:crypto';
import {mkdirSync, readFileSync, writeFileSync, existsSync, realpathSync} from 'node:fs';
import {join, resolve, dirname, basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';
import {bytesHash} from '../../local-data/runtime-package.mjs';
import {runAcceptance} from '../../scripts/hosting-acceptance.mjs';
import {prepareSyntheticInputs, validImage, origin, canary, dataHashes} from './synthetic-inputs.mjs';

export const help = `Local synthetic image gate. No arguments: help; no install, pull or listener.
Run in an isolated Linux/amd64 environment as UID/GID 1000 with Node 24, Python 3,
and working rootless Podman already installed. No sudo or automatic repairs.
node hosting/image-verification/verify-image.mjs --run
  --node-image node:24.<minor>.<patch>-bookworm-slim@sha256:<verified-digest>
  --out <new-private-Linux-folder>
Explicit run pulls only the named official public base, builds the existing template,
then checks synthetic data over a dynamically assigned 127.0.0.1 port.
No upload, registry creation, real data, provider access or global cleanup.
Keeps named local evidence/image storage; removes only this run's containers.
A failure or incomplete cleanup is never a pass. This is not hosted acceptance.`;

export function parseArgs(args) {
  assert.equal(args.length, 5, 'Use --help');
  assert.equal(args[0], '--run', 'Explicit --run required');
  const result = {};
  for (let i = 1; i < args.length; i += 2) {
    assert(['--node-image', '--out'].includes(args[i]) && !Object.hasOwn(result, args[i]), 'Use --help');
    assert(args[i + 1] && !args[i + 1].startsWith('--'), 'Use --help');
    result[args[i]] = args[i + 1];
  }
  assert(validImage(result['--node-image']), 'Explicit Node 24 patch and digest required');
  return {nodeImage: result['--node-image'], out: resolve(result['--out'])};
}

export async function verifyImage({nodeImage, out}) {
  assert(validImage(nodeImage));
  assert(process.platform === 'linux' && process.arch === 'x64', 'Requires Linux/amd64');
  assert(process.getuid() === 1000 && process.getgid() === 1000, 'Requires UID/GID 1000, never root');
  assert.equal(process.versions.node.split('.')[0], '24');
  out = join(realpathSync(dirname(out)), basename(out));
  assert(!existsSync(out) && !out.includes(':') && !out.includes('\n'), 'Use a new Linux output folder');
  const storage = join(out, 'container-storage'), runroot = join(out, 'container-run');
  assert(Buffer.byteLength(runroot) <= 50, 'Podman runroot exceeds 50 bytes; choose a shorter --out path');
  const raw = (command, args, options = {}) => spawnSync(command, args, {
    encoding: 'utf8', timeout: 120000, maxBuffer: 4 * 1024 * 1024, ...options});
  const version = raw('podman', ['--version']);
  assert.equal(version.status, 0, 'Podman unavailable: stop and resolve setup with environment owner');
  assert.equal(raw('python3', ['--version']).status, 0, 'Python 3 required');
  const f = await prepareSyntheticInputs(out, nodeImage);
  const report = {schema: 1, scope: 'synthetic local image only', passed: false, imageBuilt: false,
    nodeImage, platform: 'linux/amd64', hostNode: process.version, podman: version.stdout.trim(),
    synthetic: {release: f.release, publication: f.publication, databaseHash: f.databaseHash,
      packageManifestHash: bytesHash(readFileSync(join(f.packageRoot, 'runtime-package.json')))},
    checks: [], containersRemoved: false};
  const save = () => writeFileSync(join(out, 'result.json'), JSON.stringify(report, null, 2), {mode: 0o600});
  save();
  const config = join(out, 'tool-config'), auth = join(config, 'auth.json');
  mkdirSync(config, {mode: 0o700});
  writeFileSync(auth, '{"auths":{}}', {mode: 0o600});
  writeFileSync(join(config, 'config.json'), '{"auths":{}}', {mode: 0o600});
  const env = {...process.env, XDG_CONFIG_HOME: config, DOCKER_CONFIG: config, REGISTRY_AUTH_FILE: auth};
  delete env.CONTAINER_HOST; delete env.CONTAINER_CONNECTION;
  const prefix = ['--remote=false', '--root', storage, '--runroot', runroot, '--storage-driver=overlay'];
  let sequence = 0;
  function pod(args, {failure = false, timeout = 120000} = {}) {
    if (!failure) assert(!interrupted, 'Run interrupted');
    const started = performance.now();
    const result = raw('podman', [...prefix, ...args], {env, timeout});
    writeFileSync(join(out, `${String(++sequence).padStart(3, '0')}-${args[0]}.log`),
      JSON.stringify({args, status: result.status, signal: result.signal, error: result.error?.message,
        elapsedMs: Math.round(performance.now() - started)}) +
      '\n' + result.stdout + result.stderr, {mode: 0o600});
    if (!failure) assert.equal(result.status, 0, `Podman ${args[0]} failed; inspect private log ${sequence}`);
    return result;
  }
  const json = args => JSON.parse(pod(args).stdout);
  const containers = new Set();
  const runLabel = 'omnibus.image-verification=' + randomUUID();
  let interrupted = false;
  const interrupt = () => { interrupted = true; };
  process.on('SIGINT', interrupt); process.on('SIGTERM', interrupt);
  const common = ['--label', runLabel, '--pull=never', '--userns=keep-id', '--read-only', '--cap-drop=ALL',
    '--security-opt=no-new-privileges', '--pids-limit=128', '--memory=512m', '--cpus=1'];
  const mount = ['--volume', f.data + ':/var/lib/omnibus:ro'];
  const check = name => { report.checks.push(name); save(); };
  const create = (options, image, args = []) => {
    const name = 'omnibus-wave7-' + randomUUID();
    // The first keep-id container may copy/chown image layers on WSL; this is
    // preparation time, not a relaxation of runtime startup or resource limits.
    const id = pod(['create', '--name', name, ...common, ...options, image, ...args], {timeout: 300000}).stdout.trim();
    assert.match(id, /^[a-f0-9]{64}$/);
    containers.add(id);
    return id;
  };
  const inspectScript = readFileSync(new URL('./inspect-runtime.mjs', import.meta.url), 'utf8');
  let port;
  try {
    const info = json(['info', '--format=json']);
    assert.equal(info.host.security.rootless, true, 'Rootless Podman required');
    assert.equal(info.host.cgroupVersion, 'v2', 'No relaxation of resource limits');
    report.toolInfo = info;
    const baseRef = 'docker.io/library/' + nodeImage;
    pod(['pull', '--platform=linux/amd64', '--authfile', auth, baseRef], {timeout: 300000});
    report.base = json(['image', 'inspect', baseRef])[0];
    assert.equal(report.base.Os, 'linux'); assert.equal(report.base.Architecture, 'amd64');
    check('official-pinned-base-pulled');
    const tag = 'localhost/omnibus-wave7:' + randomUUID();
    pod(['build', '--platform=linux/amd64', '--network=none', '--pull=never', '--no-cache',
      '--force-rm', '--tag', tag, f.context], {timeout: 300000});
    report.imageBuilt = true; save();
    const built = json(['image', 'inspect', tag])[0];
    assert.equal(built.Os, 'linux'); assert.equal(built.Architecture, 'amd64');
    assert.equal(built.Config.User, '1000:1000');
    assert.deepEqual(built.Config.Entrypoint, ['node', 'scripts/start-runtime-package.mjs']);
    report.image = {tag, id: built.Id, digest: built.Digest, repoDigests: built.RepoDigests,
      layers: built.RootFS.Layers, size: built.Size};
    check('image-built-from-existing-template');
    for (const withMount of [false, true]) {
      const id = create(['--network=none', ...(withMount ? mount : []), '--entrypoint=node'], tag,
        ['--input-type=module', '-e', inspectScript, '--', ...(withMount ? ['--check-mount'] : [])]);
      const result = JSON.parse(pod(['start', '--attach', id]).stdout);
      assert.equal(json(['inspect', id])[0].State.ExitCode, 0);
      assert.equal(result.node, 'v' + nodeImage.match(/^node:(24\.\d+\.\d+)-/)[1]);
      assert.equal(result.manifestHash, bytesHash(readFileSync(join(f.packageRoot, 'runtime-package.json'))));
      report[withMount ? 'mountInspection' : 'runtimeInspection'] = result;
      check(withMount ? 'sqlite-readonly-mount-uid1000' : 'inventory-bytes-ownership-uid1000');
    }
    const archive = join(out, 'image.docker.tar');
    pod(['save', '--format=docker-archive', '--output', archive, tag]);
    const layers = raw('python3', [fileURLToPath(new URL('./inspect-layers.py', import.meta.url)),
      archive, f.packageRoot, canary]);
    writeFileSync(join(out, 'layers.log'), layers.stdout + layers.stderr, {mode: 0o600});
    assert.equal(layers.status, 0, 'Layer inspection failed');
    report.layers = JSON.parse(layers.stdout);
    check('every-layer-application-allowlist-and-canary-exclusion');
    const cli = settings => ['--settings', '/var/lib/omnibus/' + settings,
      '--public-origin', origin, '--listen-host', '0.0.0.0', '--port', '8080'];
    for (const settings of [null, 'absent.json', 'missing-database.json', 'wrong-database.json', 'invalid-database.json',
      'wrong-release.json', 'wrong-publication.json']) {
      const id = create(['--network=none', ...mount], tag, settings ? cli(settings) : []);
      const refused = pod(['start', '--attach', id], {failure: true});
      assert.equal(refused.status, 1);
      assert.equal(json(['inspect', id])[0].State.ExitCode, 1);
      assert.match(refused.stderr, /Runtime start refused/);
      assert.doesNotMatch(refused.stdout, /web runtime|preview/);
      check('fail-closed-' + (settings || 'no-settings'));
      assert(!interrupted, 'Run interrupted');
    }
    // Podman selects a free host port; only IPv4 loopback is published.
    const id = create(['--network=slirp4netns:allow_host_loopback=false', '--publish=127.0.0.1::8080', ...mount], tag, cli('local-build.json'));
    pod(['start', id]);
    const bindings = json(['inspect', id])[0].NetworkSettings.Ports['8080/tcp'];
    assert.equal(bindings.length, 1); assert.equal(bindings[0].HostIp, '127.0.0.1');
    port = Number(bindings[0].HostPort); assert(port >= 1024 && port <= 65535);
    report.loopbackPort = port;
    const deadline = performance.now() + 10000;
    while (!pod(['logs', id]).stdout.includes('Omnibus packaged read-only web runtime:')) {
      assert(json(['inspect', id])[0].State.Running, 'Runtime exited before listening');
      assert(performance.now() < deadline, 'Startup deadline');
      await delay(100);
    }
    report.acceptance = await runAcceptance({...f.acceptance, target: `http://127.0.0.1:${port}`});
    assert(!interrupted, 'Run interrupted');
    assert.equal(report.acceptance.passed, true, JSON.stringify(report.acceptance));
    assert.equal(report.acceptance.checks.length, 16);
    check('loopback-package-http-acceptance-16');
    const stoppedAt = performance.now();
    pod(['stop', '--time=10', id]);
    report.shutdownMs = Math.round(performance.now() - stoppedAt);
    const state = json(['inspect', id])[0].State;
    assert.equal(state.Running, false); assert.equal(state.ExitCode, 0); assert.equal(state.OOMKilled, false);
    check('sigterm-shutdown-exit0');
  } finally {
    const failures = [];
    // Recover even a container created just before a timed-out create command.
    const remaining = pod(['ps', '--all', '--quiet', '--no-trunc', '--filter', 'label=' + runLabel], {failure: true});
    if (remaining.status === 0) {
      for (const id of remaining.stdout.trim().split('\n').filter(Boolean)) {
        assert.match(id, /^[a-f0-9]{64}$/); containers.add(id);
      }
    } else failures.push('could-not-inventory-own-labelled-containers');
    for (const id of containers) if (pod(['rm', '--force', id], {failure: true}).status !== 0) failures.push(id);
    report.containersRemoved = failures.length === 0;
    report.cleanupFailures = failures;
    report.databaseUnchanged = bytesHash(readFileSync(f.databasePath)) === f.databaseHash;
    report.allDataAndSettingsUnchanged = JSON.stringify(dataHashes(f.data)) === JSON.stringify(f.dataHashes);
    if (port) {
      const socket = createServer();
      try {
        socket.listen(port, '127.0.0.1'); await once(socket, 'listening');
        report.portReleased = true;
      } catch { report.portReleased = false; }
      finally { if (socket.listening) await new Promise(done => socket.close(done)); }
    }
    save();
    process.removeListener('SIGINT', interrupt); process.removeListener('SIGTERM', interrupt);
    assert(report.containersRemoved, 'Own containers require manual cleanup; see result.json');
    assert(report.databaseUnchanged, 'Synthetic database changed');
    assert(report.allDataAndSettingsUnchanged, 'Synthetic data/settings inventory changed');
    assert(port === undefined || report.portReleased, 'Own loopback port remains occupied');
  }
  assert(!interrupted, 'Run interrupted');
  report.passed = true; save();
  return report;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (!args.length || (args.length === 1 && args[0] === '--help')) console.log(help);
  else try {
    const result = await verifyImage(parseArgs(args));
    console.log(JSON.stringify({passed: result.passed, imageBuilt: result.imageBuilt, checks: result.checks.length}));
  } catch (error) {
    console.error('Local image gate stopped: ' + error.message);
    process.exitCode = 1;
  }
}
