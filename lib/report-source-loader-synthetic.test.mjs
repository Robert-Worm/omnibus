import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { createReportSourceLoader } from "./report-source-loader.mjs";

// Een verzonnen bron, verpakt zoals de database dat doet (#292).
function bron(id, { pages = [{ page: 1, text: "Fictieve tekst." }], hash, bytes } = {}) {
  const ruw = Buffer.from(JSON.stringify({ id, source_sha256: "b".repeat(64), pages }));
  return { id, source_sha256: "b".repeat(64), packedSource: { encoding: "gzip-json-v1", bytes: bytes ?? ruw.length, pageCount: pages.length,
    sha256: hash ?? createHash("sha256").update(ruw).digest("hex"), data: gzipSync(ruw).toString("base64") } };
}

test("een goede bron wordt uitgepakt en gecontroleerd", async () => {
  const uit = await createReportSourceLoader().load(bron("R1"));
  assert.equal(uit.id, "R1");
  assert.equal(uit.pages[0].text, "Fictieve tekst.");
});

test("een verkeerde hash of een verkeerd aantal bytes wordt geweigerd", async () => {
  const laden = createReportSourceLoader();
  await assert.rejects(laden.load(bron("R1", { hash: "0".repeat(64) })), /integriteitscontrole/);
  const goed = bron("R2");
  await assert.rejects(laden.load(bron("R2", { bytes: goed.packedSource.bytes - 1 })), /groter dan de gecontroleerde/);
  await assert.rejects(laden.load(bron("R3", { bytes: goed.packedSource.bytes + 50 })), /onvolledig/);
  await assert.rejects(laden.load({ ...goed, packedSource: { ...goed.packedSource, encoding: "zip" } }), /ongeldige indeling/);
});

test("tekst van een andere bron wordt geweigerd", async () => {
  const laden = createReportSourceLoader({ decode: async () => ({ id: "ANDER", source_sha256: "b".repeat(64), pages: [{ page: 1, text: "x" }] }) });
  await assert.rejects(laden.load(bron("R1")), /hoort niet bij deze rapportbron/);
});

test("de cache houdt hooguit drie bronnen; de oudste gaat eruit", async () => {
  let gelezen = 0;
  const laden = createReportSourceLoader({ decode: async (s) => { gelezen++; return { id: s.id, source_sha256: s.source_sha256, pages: [{ page: 1, text: "x" }] }; } });
  for (const id of ["A", "B", "C", "D"]) await laden.load(bron(id));
  assert.equal(laden.stats().entries, 3);
  await laden.load(bron("D"));
  assert.equal(gelezen, 4, "D komt uit de cache");
  await laden.load(bron("A"));
  assert.equal(gelezen, 5, "A was eruit en wordt opnieuw gelezen");
});

test("twee gelijktijdige aanvragen lezen de bron één keer", async () => {
  let gelezen = 0;
  const laden = createReportSourceLoader({ decode: async (s) => { gelezen++; await new Promise((r) => setTimeout(r, 10)); return { id: s.id, source_sha256: s.source_sha256, pages: [{ page: 1, text: "x" }] }; } });
  await Promise.all([laden.load(bron("A")), laden.load(bron("A"))]);
  assert.equal(gelezen, 1);
});
