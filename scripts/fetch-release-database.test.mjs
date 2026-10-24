import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { haalDatabase, pakUit, controleerSums, leesDownload } from "./fetch-release-database.mjs";
import { maakZip } from "./prepare-release.mjs";

const sha = (b) => createHash("sha256").update(b).digest("hex");
const URL_OK = "https://github.com/x/y/releases/download/database-1/db.zip";
function zipMet(bestanden, sumsAanpassen = (s) => s) {
  const lijst = Object.entries(bestanden).map(([naam, t]) => ({ naam, inhoud: Buffer.from(t) }));
  const sums = lijst.map((b) => `${sha(b.inhoud)}  ${b.naam}`).join("\n") + "\n";
  return maakZip([...lijst, { naam: "SHA256SUMS.txt", inhoud: Buffer.from(sumsAanpassen(sums)) }]);
}
const haalMet = (buf) => async () => new Response(buf);

await test("een goede zip wordt gecontroleerd en uitgepakt", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "fetch-"));
  try {
    const zip = zipMet({ "catalogue.sqlite": "db", "local-build.json": "{}" });
    const out = path.join(dir, "uit");
    const namen = await haalDatabase({ url: URL_OK, verwacht: sha(zip), out, haal: haalMet(zip) });
    assert.deepEqual(namen.sort((a, b) => a < b ? -1 : a > b ? 1 : 0), ["SHA256SUMS.txt", "catalogue.sqlite", "local-build.json"]);
    assert.equal(readFileSync(path.join(out, "catalogue.sqlite"), "utf8"), "db");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

await test("afwijkende controlegetallen, vreemde bronnen en paden worden geweigerd", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "fetch-"));
  try {
    const zip = zipMet({ "catalogue.sqlite": "db", "local-build.json": "{}" });
    const out = path.join(dir, "uit");
    await assert.rejects(haalDatabase({ url: URL_OK, verwacht: "a".repeat(64), out, haal: haalMet(zip) }), /controlegetal van de zip/);
    await assert.rejects(haalDatabase({ url: "https://example.org/db.zip", verwacht: sha(zip), out, haal: haalMet(zip) }), /alleen GitHub/);
    const fout = zipMet({ "catalogue.sqlite": "db", "local-build.json": "{}" }, (s) => s.replace(/^[0-9a-f]{64}/, "0".repeat(64)));
    await assert.rejects(haalDatabase({ url: URL_OK, verwacht: sha(fout), out, haal: haalMet(fout) }), /controlegetal klopt niet/);
    assert.equal(existsSync(out), false);
    assert.throws(() => pakUit(maakZip([{ naam: "../buiten.txt", inhoud: Buffer.from("x") }])), /onverwacht bestand/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

await test('every extracted file needs exactly one checksum before output is created', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'fetch-manifest-'));
  try {
    for (const change of [
      s => s.split('\n').filter(l => !l.endsWith('catalogue.sqlite')).join('\n'),
      s => s + s.split('\n')[0] + '\n',
      s => s + `${sha(Buffer.from('x'))}  unknown.txt\n`,
      s => s.replace('catalogue.sqlite', 'catalogue.sqlite extra'),
      s => s + `${'a'.repeat(64)}  SHA256SUMS.txt\n`,
    ]) {
      const zip = zipMet({'catalogue.sqlite':'db', 'local-build.json':'{}'}, change);
      const out = path.join(dir, 'uit');
      await assert.rejects(haalDatabase({url:URL_OK, verwacht:sha(zip), out, haal:haalMet(zip)}));
      assert.equal(existsSync(out), false);
    }
    const valid = pakUit(zipMet({'catalogue.sqlite':'db', 'local-build.json':'{}', 'LEESMIJ.txt':'read me'}));
    controleerSums(valid);
    valid.find(b => b.naam === 'SHA256SUMS.txt').inhoud = Buffer.from(valid.find(b => b.naam === 'SHA256SUMS.txt').inhoud.toString().replaceAll('\n', '\r\n'));
    controleerSums(valid);
  } finally { rmSync(dir, {recursive:true, force:true}); }
});

await test('duplicate, case-colliding and nonportable filenames are refused', () => {
  for (const name of ['catalogue.sqlite', 'Catalogue.sqlite']) {
    const files = [{naam:'catalogue.sqlite', inhoud:Buffer.from('first')}, {naam:name, inhoud:Buffer.from('second')}];
    assert.throws(() => pakUit(maakZip(files)), /dubbele bestandsnaam/);
    assert.throws(() => controleerSums(files), /dubbele bestandsnaam/);
  }
  for (const naam of ['.', '..', 'file.', 'CON', 'nul.txt', 'LPT1.json', 'directory/', 'a/b', 'a\\b'])
    assert.throws(() => pakUit(maakZip([{naam, inhoud:Buffer.from('x')}])), /onverwacht bestand/);
});

await test('download counts chunks even with missing or misleading length headers', async () => {
  for (const contentLength of [undefined, '1', 'not-a-size']) {
    let cancelled = 0, reads = 0;
    const body = new ReadableStream({pull(c) { reads++; c.enqueue(new Uint8Array(4)); }, cancel() { cancelled++; }});
    const headers = contentLength === undefined ? {} : {'content-length':contentLength};
    await assert.rejects(leesDownload(new Response(body, {headers}), new AbortController().signal, 6), /zip te groot/);
    assert.equal(cancelled, 1); assert.ok(reads <= 3);
  }
  const bytes = await leesDownload(new Response(Buffer.from('exact')), new AbortController().signal, 5);
  assert.equal(bytes.toString(), 'exact');
});

await test('oversized advertised content is refused without reading its body', async () => {
  let read = false;
  const response = {headers:new Headers({'content-length':'7'}), get body() { read = true; throw Error('must not buffer'); }};
  await assert.rejects(leesDownload(response, new AbortController().signal, 6), /zip te groot/);
  assert.equal(read, false);
});

await test('abort interrupts a stalled body and releases the reader', async () => {
  let cancelled = 0;
  const body = new ReadableStream({cancel() { cancelled++; }}), controller = new AbortController();
  const reading = leesDownload(new Response(body), controller.signal, 6);
  controller.abort(new Error('synthetic deadline'));
  await assert.rejects(reading, /synthetic deadline/);
  assert.equal(cancelled, 1); assert.equal(body.locked, false);
});

await test('one total deadline covers fetch and body, without creating output', async t => {
  t.mock.timers.enable({apis:['setTimeout']});
  const dir = mkdtempSync(path.join(tmpdir(), 'fetch-deadline-'));
  try {
    let signal;
    const haal = (_url, options) => {
      signal = options.signal;
      return new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(signal.reason), {once:true}));
    };
    const out = path.join(dir, 'uit');
    const pending = haalDatabase({url:URL_OK, verwacht:'a'.repeat(64), out, haal});
    const rejected = assert.rejects(pending, /download duurt te lang/);
    t.mock.timers.tick(5 * 60 * 1000);
    await rejected;
    assert.equal(signal.aborted, true); assert.equal(existsSync(out), false);
  } finally { rmSync(dir, {recursive:true, force:true}); }
});
