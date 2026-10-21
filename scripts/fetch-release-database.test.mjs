import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { haalDatabase, pakUit } from "./fetch-release-database.mjs";
import { maakZip } from "./prepare-release.mjs";

const sha = (b) => createHash("sha256").update(b).digest("hex");
const URL_OK = "https://github.com/x/y/releases/download/database-1/db.zip";
function zipMet(bestanden, sumsAanpassen = (s) => s) {
  const lijst = Object.entries(bestanden).map(([naam, t]) => ({ naam, inhoud: Buffer.from(t) }));
  const sums = lijst.map((b) => `${sha(b.inhoud)}  ${b.naam}`).join("\n") + "\n";
  return maakZip([...lijst, { naam: "SHA256SUMS.txt", inhoud: Buffer.from(sumsAanpassen(sums)) }]);
}
const haalMet = (buf) => async () => ({ ok: true, arrayBuffer: async () => buf });

test("een goede zip wordt gecontroleerd en uitgepakt", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "fetch-"));
  try {
    const zip = zipMet({ "catalogue.sqlite": "db", "local-build.json": "{}" });
    const out = path.join(dir, "uit");
    const namen = await haalDatabase({ url: URL_OK, verwacht: sha(zip), out, haal: haalMet(zip) });
    assert.deepEqual(namen.sort(), ["SHA256SUMS.txt", "catalogue.sqlite", "local-build.json"]);
    assert.equal(readFileSync(path.join(out, "catalogue.sqlite"), "utf8"), "db");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("afwijkende controlegetallen, vreemde bronnen en paden worden geweigerd", async () => {
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
