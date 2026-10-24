import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { controleerNode, npmOpdracht, Stop } from "./installeer.mjs";
import { DATABASE_SHA256, DATABASE_URL } from "./database-release.mjs";

test("Node-versie: gelijk of nieuwer is goed, ouder stopt met uitleg", () => {
  for (const v of ["v24.17.0", "v24.18.1", "v25.0.0"]) assert.equal(controleerNode(v, "24.17.0"), true, v);
  for (const v of ["v24.16.9", "v22.22.0", "v20.0.0"]) {
    assert.throws(() => controleerNode(v, "24.17.0"), (fout) => fout instanceof Stop && /nodejs\.org/.test(fout.oplossing) && fout.anker === "#een-verkeerde-versie-van-nodejs", v);
  }
});

test("op Windows heet npm npm.cmd en is een shell nodig", () => {
  assert.deepEqual(npmOpdracht("win32"), { bestand: "npm.cmd", shell: true });
  assert.deepEqual(npmOpdracht("linux"), { bestand: "npm", shell: false });
});

test("de database van het installatiescript is dezelfde als in de Dockerfile", () => {
  const dockerfile = readFileSync(new URL("../hosting/container/Dockerfile", import.meta.url), "utf8");
  assert.ok(dockerfile.includes(`ARG DATABASE_URL=${DATABASE_URL}`));
  assert.ok(dockerfile.includes(`ARG DATABASE_SHA256=${DATABASE_SHA256}`));
});

test("elke verwijzing naar de hulppagina bestaat als kop", () => {
  const pagina = readFileSync(new URL("../docs/gebruiken/problemen-oplossen.md", import.meta.url), "utf8");
  const bron = readFileSync(new URL("./installeer.mjs", import.meta.url), "utf8");
  const verwijzingen = [...bron.matchAll(/"#([a-z][a-z0-9-]+)"/g)];
  assert.ok(verwijzingen.length >= 3);
  for (const [, anker] of verwijzingen) {
    const kop = pagina.split("\n").find((r) => r.startsWith("### ") && r.toLowerCase().replace(/^### /, "").replace(/[^a-z0-9 -]/g, "").replace(/ /g, "-") === anker);
    assert.ok(kop, anker);
  }
});

test("rooktest: opties en herkenning van het startscherm", async () => {
  const { leesOpties, isOmnibus } = await import("./rooktest-start.mjs");
  assert.deepEqual(leesOpties([]), { port: 4319, seconden: 90 });
  assert.deepEqual(leesOpties(["--port", "4400", "--seconden", "30"]), { port: 4400, seconden: 30 });
  assert.equal(isOmnibus(200, "<html><head><title>Omnibus</title>"), true);
  assert.equal(isOmnibus(200, "<title>Iets anders</title>"), false);
  assert.equal(isOmnibus(503, "<title>Omnibus</title>"), false);
});
