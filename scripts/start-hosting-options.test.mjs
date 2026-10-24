import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parsePreviewArgs, startDatabasePreview, validatePreviewStartOptions } from "./serve-database-web.mjs";
import { parseRuntimePackageArgs, startRuntimePackage } from "./start-runtime-package.mjs";
import { packageRuntime } from "./package-runtime.mjs";
import { runtimeFixture } from "../local-data/test-support/runtime-fixture.mjs";
import { runtimeContractHash } from "../lib/runtime-contract-identity.mjs";
import { startupFailureReason } from "../local-data/startup-diagnostics.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const release = "a".repeat(64), publication = "b".repeat(64);
const publicOrigin = "https://omnibus.example.invalid";
const pinArgs = ["--database", "synthetic.sqlite", "--release", release, "--publication", publication];
const hostArgs = ["--public-origin", publicOrigin, "--listen-host", "127.0.0.1", "--port", "8080"];
const webArgs = ["--web-root", "synthetic-web"];
const publicOptions = { databasePath: resolve("synthetic.sqlite"), release, publication,
  port: 8080, webRoot: resolve("synthetic-web"), publicOrigin, listenHost: "127.0.0.1" };

function replace(args, flag, value) {
  const result = [...args];
  result[result.indexOf(flag) + 1] = value;
  return result;
}

function without(args, flag) {
  const result = [...args];
  result.splice(result.indexOf(flag), 2);
  return result;
}

test("hosting parsers require exact explicit options in any order; no sockets are opened", () => {
  const args = [...pinArgs, ...hostArgs, ...webArgs];
  const pairs = Array.from({ length: args.length / 2 }, (_, i) => args.slice(i * 2, i * 2 + 2));
  for (let i = 0; i < pairs.length; i++) {
    assert.deepEqual(parsePreviewArgs([...pairs.slice(i), ...pairs.slice(0, i)].flat()), publicOptions);
  }
  assert.deepEqual(parsePreviewArgs([...pairs.reverse()].flat()), publicOptions);
  assert.deepEqual(args, [...pinArgs, ...hostArgs, ...webArgs]);
  const { webRoot: _webRoot, ...packaged } = publicOptions;
  assert.deepEqual(parseRuntimePackageArgs([...pinArgs, ...hostArgs]), packaged);
  for (const listenHost of ["127.0.0.1", "0.0.0.0"]) {
    for (const port of ["1", "8080", "65535"]) {
      const chosen = replace(replace(args, "--listen-host", listenHost), "--port", port);
      assert.deepEqual(parsePreviewArgs(chosen), { ...publicOptions, port: Number(port), listenHost });
    }
  }
  assert.equal(parsePreviewArgs(replace(args, "--public-origin", publicOrigin + ":8443")).publicOrigin,
    publicOrigin + ":8443");
});

test("hosting accepts separate pinned settings, but never settings overrides", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "omnibus-start-options-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const settings = join(dir, "settings.json");
  writeFileSync(settings, JSON.stringify({ database: "synthetic.sqlite", release, publication }));
  const args = ["--settings", settings, ...hostArgs, ...webArgs];
  assert.deepEqual(parsePreviewArgs(args), { ...publicOptions, databasePath: join(dir, "synthetic.sqlite") });
  assert.equal(parseRuntimePackageArgs(without(args, "--web-root")).release, release);
  for (const extra of [["--database", "other.sqlite"], ["--release", release], ["--publication", publication]]) {
    assert.throws(() => parsePreviewArgs([...args, ...extra]), /Usage:/);
  }
  writeFileSync(settings, JSON.stringify({ database: "synthetic.sqlite", release, publication, publicOrigin }));
  assert.throws(() => parsePreviewArgs(args), /Invalid database settings/);
});

test("missing, duplicate, unknown, aliased and malformed public CLI options fail closed", () => {
  const args = [...pinArgs, ...hostArgs, ...webArgs];
  for (let i = 0; i < args.length; i += 2) {
    assert.throws(() => parsePreviewArgs(without(args, args[i])), /Usage:/, args[i]);
    assert.throws(() => parsePreviewArgs([...args, args[i], args[i + 1]]), /Usage:/, args[i]);
  }
  for (const bad of [
    [...args, "--host", "0.0.0.0"], [...args, "--origin", publicOrigin],
    [...args, "--trust-proxy", "true"], [...args, "--public", "true"],
    [...args, "--PORT", "8080"], [...args, "--public-origin=" + publicOrigin],
    [...args, "--"], [...args, "--listen-host"],
    replace(args, "--release", "latest"), replace(args, "--publication", "B".repeat(64)),
    replace(args, "--web-root", " "), replace(args, "--database", "bad\0path"),
  ]) assert.throws(() => parsePreviewArgs(bad), /Usage:/);
  for (const port of ["0", "-1", "65536", "08080", "+8080", "8080.0", "8e3", "8080x", " 8080", "8080 "]) {
    assert.throws(() => parsePreviewArgs(replace(args, "--port", port)), /Usage:/, port);
  }
  for (const host of ["localhost", "127.1", "127.0.0.2", "::", "::1", "[::1]", "0", "0.0.0.0 ", "127.0.0.1:8080"]) {
    assert.throws(() => parsePreviewArgs(replace(args, "--listen-host", host)), /Usage:/, host);
  }
  for (const origin of [
    "http://omnibus.example.invalid", "HTTPS://omnibus.example.invalid", "https://Omnibus.example.invalid",
    publicOrigin + "/", publicOrigin + "/path", publicOrigin + ":443", publicOrigin + ":08443",
    publicOrigin + ".", publicOrigin + "?", publicOrigin + "#", publicOrigin + "?token=canary",
    " " + publicOrigin, publicOrigin + "\n", "https:\\omnibus.example.invalid",
    "https://user:" + "password@omnibus.example.invalid", "https://@omnibus.example.invalid",
    "https://*.example.invalid", "https://%6fm omnibus.example.invalid", "null", "*",
    publicOrigin + ":0", "https://bad_label.example.invalid", "https://-bad.example.invalid",
    "https://bad-.example.invalid", "https://" + "a".repeat(64) + ".invalid",
  ]) assert.throws(() => parsePreviewArgs(replace(args, "--public-origin", origin)), /Usage:/, origin);
  // A package always serves the web root covered by its inventory.
  assert.throws(() => parseRuntimePackageArgs(args), /Usage:/);
});

test("local defaults survive ambient hosting variables and a listen host alone is rejected", (t) => {
  for (const [key, value] of Object.entries({ PORT: "8080", HOST: "0.0.0.0",
    PUBLIC_ORIGIN: publicOrigin, LISTEN_HOST: "0.0.0.0" })) {
    const original = process.env[key];
    t.after(() => { if (original === undefined) delete process.env[key]; else process.env[key] = original; });
    process.env[key] = value;
  }
  for (const parse of [parsePreviewArgs, parseRuntimePackageArgs]) {
    assert.deepEqual(parse(["--database", "synthetic.sqlite"]), {
      databasePath: resolve("synthetic.sqlite"), port: 4319,
    });
    for (const host of ["127.0.0.1", "0.0.0.0"]) {
      assert.throws(() => parse(["--database", "synthetic.sqlite", "--listen-host", host]), /Usage:/);
    }
    assert.throws(() => parse(without([...pinArgs, ...hostArgs], "--port")), /Usage:/);
  }
  assert.deepEqual(validatePreviewStartOptions({ databasePath: "synthetic.sqlite", port: 0 }), {
    port: 0, webRoot: resolve(root, "database-build"),
  });
  assert.equal(parsePreviewArgs(["--database", "synthetic.sqlite", "--port", "04319"]).port, 4319);
  assert.throws(() => parsePreviewArgs(["--database", "synthetic.sqlite", "--port", "0"]), /Usage:/);
});

test("programmatic starts reject incomplete hosting configuration before opening files or sockets", async () => {
  for (const key of Object.keys(publicOptions)) {
    const invalid = { ...publicOptions };
    delete invalid[key];
    await assert.rejects(startDatabasePreview(invalid), error => {
      assert.match(error.message, /Invalid start options/);
      assert.equal(startupFailureReason(error), 'start-options');return true;
    }, key);
    if (key !== "webRoot") {
      const { webRoot: _webRoot, ...packaged } = invalid;
      await assert.rejects(startRuntimePackage({ root: "missing-package", ...packaged }), /Invalid start options/, key);
    }
  }
  for (const overrides of [
    { publicOrigin: undefined }, { listenHost: undefined }, { listenHost: "localhost" },
    { port: undefined }, { port: 0 }, { port: "8080" }, { port: 1.1 }, { port: NaN }, { port: 65536 },
    { release: "latest" }, { publication: "" }, { publicOrigin: publicOrigin + "/" },
  ]) {
    await assert.rejects(startDatabasePreview({ ...publicOptions, ...overrides }), /Invalid start options/);
    const { webRoot: _webRoot, ...packaged } = { ...publicOptions, ...overrides };
    await assert.rejects(startRuntimePackage({ root: "missing-package", ...packaged }), /Invalid start options/);
  }
  await assert.rejects(startRuntimePackage({ root: "missing-package", ...publicOptions }), /verified package web root/);
});

test("pinned preview and verified package pass only the agreed server options (server double, no listener)", (t) => {
  const f = runtimeFixture(t), webRoot = join(f.dir, "web"), out = join(f.dir, "package");
  const databaseBefore = readFileSync(f.databasePath);
  mkdirSync(join(webRoot, "assets"), { recursive: true });
  writeFileSync(join(webRoot, "database.html"), "<!doctype html><title>Synthetic start test</title>");
  const manifest = { schema: 1, runtimeTarget: "portable-local", contract: runtimeContractHash,
    release: f.release, publication: f.publication };
  writeFileSync(join(webRoot, "omnibus-release.json"), JSON.stringify(manifest));
  packageRuntime({ databasePath: f.databasePath, webRoot, out });
  const options = { ...publicOptions, databasePath: f.databasePath, webRoot,
    release: f.release, publication: f.publication, trustProxy: true, arbitrary: "never-forward" };
  const child = spawnSync(process.execPath, ["--input-type=module", "-e", `
    import assert from 'node:assert/strict';
    import { registerHooks } from 'node:module';
    import { join } from 'node:path';
    import { pathToFileURL } from 'node:url';
    import { writeFileSync, copyFileSync, unlinkSync } from 'node:fs';
    const { options, root, out, manifest } = JSON.parse(process.argv[1]);
    globalThis.serverCalls = [];
    registerHooks({ load(url, context, nextLoad) {
      if (url.endsWith('/local-data/server.mjs')) return {
        format: 'module', shortCircuit: true,
        source: "export async function serveCatalogue(repository, options) { globalThis.serverCalls.push(options); return { close: async () => {} }; }"
      };
      return nextLoad(url, context);
    }});
    const { startDatabasePreview } = await import(pathToFileURL(join(root, 'scripts/serve-database-web.mjs')));
    const { startRuntimePackage } = await import(pathToFileURL(join(out, 'scripts/start-runtime-package.mjs')));
    const expected = { port: options.port, webRoot: options.webRoot,
      publicOrigin: options.publicOrigin, listenHost: options.listenHost };
    const app = await startDatabasePreview(options);
    assert.deepEqual(globalThis.serverCalls, [expected]);
    await app.close();
    const { webRoot, ...packaged } = options;
    const packagedApp = await startRuntimePackage({ root: out, ...packaged });
    assert.deepEqual(globalThis.serverCalls[1], { ...expected, webRoot: join(out, 'database-build') });
    await packagedApp.close();
    for (const pin of ['release', 'publication']) {
      await assert.rejects(startDatabasePreview({ ...options, [pin]: 'f'.repeat(64) }), /does not match/);
      await assert.rejects(startRuntimePackage({ root: out, ...packaged, [pin]: 'f'.repeat(64) }), /does not match/);
    }
    writeFileSync(join(webRoot, 'omnibus-release.json'), JSON.stringify({ ...manifest, publication: 'f'.repeat(64) }));
    await assert.rejects(startDatabasePreview({ ...options, publication: 'f'.repeat(64) }), /missing or changed publication/);
    copyFileSync(options.databasePath, join(out, 'inside.sqlite'));
    await assert.rejects(startRuntimePackage({ root: out, ...packaged, databasePath: join(out, 'inside.sqlite') }), /outside the runtime package/);
    unlinkSync(join(out, 'inside.sqlite'));
    writeFileSync(join(out, 'database-build/database.html'), 'tampered synthetic build');
    await assert.rejects(startRuntimePackage({ root: out, ...packaged }), /checksum mismatch/);
    assert.equal(globalThis.serverCalls.length, 2);
    console.log('Validated forwarding only; no listener was created.');
  `, JSON.stringify({ options, root, out, manifest })], { encoding: "utf8", timeout: 20000 });
  assert.ifError(child.error);
  assert.equal(child.status, 0, child.stderr);
  assert.match(child.stdout, /no listener was created/);
  assert.deepEqual(readFileSync(f.databasePath), databaseBefore);
});

test("both CLI entry points redact invalid hosting values and filesystem failures", () => {
  const canary = "START-CANARY-private-token";
  for (const script of ["serve-database-web.mjs", "start-runtime-package.mjs"]) {
    const failures = [
      ["--database", canary, ...hostArgs, "--release", release, "--publication", publication,
        ...(script === "serve-database-web.mjs" ? ["--web-root", canary] : [])],
      ["--database", canary, "--public-origin", "https://user:" + canary + "@omnibus.example.invalid"],
      ["--settings", canary],
    ];
    for (const [index,args] of failures.entries()) {
      const child = spawnSync(process.execPath, [join(root, "scripts", script), ...args], {
        encoding: "utf8", timeout: 10000,
      });
      assert.ifError(child.error);
      assert.equal(child.status, 1);
      assert.equal(child.stdout, "");
      assert.match(child.stderr, /start refused/);
      const reason=index===0?(script==='serve-database-web.mjs'?'web-build':'database-open')
        :index===1?'start-options':'settings';
      assert(child.stderr.includes('Failed check: '+reason+'.'));
      assert.doesNotMatch(child.stderr, new RegExp(canary + "|ENOENT|\\n\\s+at "));
    }
  }
});

test("real startup failures distinguish build, database, publication, readiness, package and listener checks",async t=>{
  const f=runtimeFixture(t),webRoot=join(f.dir,'web'),out=join(f.dir,'package');
  const canary='PRIVATE-START-CANARY';
  mkdirSync(join(webRoot,'assets'),{recursive:true});
  const html=join(webRoot,'database.html'),manifestPath=join(webRoot,'omnibus-release.json');
  const manifest={schema:1,runtimeTarget:'portable-local',contract:runtimeContractHash,
    release:f.release,publication:f.publication};
  writeFileSync(html,'<!doctype html><title>Synthetic startup</title>');
  writeFileSync(manifestPath,JSON.stringify(manifest));
  packageRuntime({databasePath:f.databasePath,webRoot,out});
  const original=readFileSync(f.databasePath);
  const verify=(reason,{packaged=false,release=f.release,publication=f.publication,
    database=f.databasePath,web=webRoot,port='8080'}={})=>{
    const script=packaged?join(out,'scripts/start-runtime-package.mjs'):join(root,'scripts/serve-database-web.mjs');
    const args=['--database',database,'--release',release,'--publication',publication,
      '--public-origin',publicOrigin,'--listen-host','127.0.0.1','--port',port,
      ...(packaged?[]:['--web-root',web])];
    const child=spawnSync(process.execPath,[script,...args],{encoding:'utf8',timeout:10000});
    assert.ifError(child.error);assert.equal(child.status,1,child.stderr);assert.equal(child.stdout,'');
    assert(child.stderr.includes('Failed check: '+reason+'.'),child.stderr);
    for(const secret of [canary,f.dir,root,'ENOENT','checksum mismatch','\n    at '])
      assert(!child.stderr.includes(secret));
    assert.deepEqual(readFileSync(f.databasePath),original);
  };
  verify('web-build',{web:join(f.dir,canary)});
  verify('database-open',{database:join(f.dir,canary)});
  verify('web-build',{release:'f'.repeat(64)});
  writeFileSync(manifestPath,JSON.stringify({...manifest,publication:'f'.repeat(64)}));
  verify('publication',{publication:'f'.repeat(64)});
  writeFileSync(manifestPath,JSON.stringify(manifest));
  rmSync(html);
  verify('web-readiness');
  writeFileSync(html,'<!doctype html><title>Synthetic startup</title>');
  writeFileSync(join(out,'database-build/database.html'),canary);
  verify('package-integrity',{packaged:true});
  const app=await startDatabasePreview({databasePath:f.databasePath,webRoot,port:0});
  try{verify('listener',{port:String(app.server.address().port)});}finally{await app.close();}
});
