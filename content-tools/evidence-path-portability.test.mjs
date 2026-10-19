import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { captureEvidencePaths, evidencePath } from "./evidence-paths.mjs";

test("portable evidence requires explicit relocation and preserves source bytes", (t) => {
  const root = mkdtempSync(join(tmpdir(), "omnibus-evidence-portable-"));
  const previous = process.env.OMNIBUS_EVIDENCE_MAP;
  t.after(() => {
    if (previous === undefined) delete process.env.OMNIBUS_EVIDENCE_MAP;
    else process.env.OMNIBUS_EVIDENCE_MAP = previous;
    rmSync(root, { recursive: true, force: true });
  });
  delete process.env.OMNIBUS_EVIDENCE_MAP;
  const original = "Z:/synthetic-original/app/trial-corpus.json";
  assert.equal(evidencePath(original), original, "no hidden machine-specific fallback");
  const target = join(root, "sealed.txt");
  const bytes = Buffer.from("Synthetic sealed evidence, not a source document.");
  writeFileSync(target, bytes);
  const digest = createHash("sha256").update(bytes).digest("hex");
  const map = join(root, "paths.json");
  writeFileSync(map, JSON.stringify({
    format: "omnibus-evidence-paths", schemaVersion: 1,
    files: [{ original, path: "sealed.txt" }],
  }));
  process.env.OMNIBUS_EVIDENCE_MAP = map;
  assert.equal(evidencePath(original), target);
  const captured = captureEvidencePaths(() =>
    createHash("sha256").update(readFileSync(evidencePath(original))).digest("hex"));
  assert.equal(captured.result, digest);
  assert.deepEqual(captured.files, [{ original, target }]);
  assert.throws(() => evidencePath("Z:/synthetic-original/unmapped.txt"), /Unmapped/);
  assert.deepEqual(readFileSync(target), bytes);
  process.env.OMNIBUS_EVIDENCE_MAP = " ";
  assert.throws(() => evidencePath(original), /must name a path map/);
});
