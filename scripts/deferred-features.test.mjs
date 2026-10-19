import test from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deferredFeaturesPlugin } from "./deferred-features.mjs";
import { featureLoader } from "../lib/feature-loader.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));

test("only explicit feature boundaries use emitted local chunks and retry URLs", () => {
  const plugin = deferredFeaturesPlugin(),
    emitted = [];
  plugin.buildStart.call({
    emitFile: (file) => {
      emitted.push(file);
      return String(emitted.length);
    },
  });
  assert.deepEqual(
    emitted.map((file) => file.name),
    ["export-entry-content", "foundation-source-reader"],
  );
  for (const [file, name, exportName, index] of [
    ["export-loader.mjs", "export-entry-content", "loadExport", 1],
    ["foundation-reader-loader.mjs", "foundation-source-reader", "loadFoundationReader", 2],
  ]) {
    const id = plugin.resolveId("./" + file, resolve(root, "app/client.tsx"));
    assert.equal(id, "\0omnibus-deferred-feature:" + name);
    assert.equal(plugin.resolveId(resolve(root, "app", file), resolve(root, "app/client.tsx")), id);
    const code = plugin.load(id);
    assert(code.includes(`const url=import.meta.ROLLUP_FILE_URL_${index};`));
    assert(code.includes(`export const ${exportName}=featureLoader(`));
    assert(code.includes("attempt?url+'?retry='+attempt:url"));
    assert(!code.includes("location.reload"));
  }
  assert.equal(plugin.resolveId("./unknown.mjs", resolve(root, "app/client.tsx")), undefined);
  assert.equal(plugin.load("\0omnibus-deferred-feature:unknown"), undefined);
  assert.equal(
    plugin.resolveId("https://example.invalid/feature.mjs", resolve(root, "app/client.tsx")),
    undefined,
  );
});

test("feature downloads share one request and retry a failure without losing the successful module", async () => {
  const attempts = [];
  const value = { default: "synthetic viewer" };
  const load = featureLoader(async (attempt) => {
    attempts.push(attempt);
    if (attempt === 0) throw Error("temporary download failure");
    return value;
  });
  const first = load();
  assert.equal(load(), first);
  await assert.rejects(first, /temporary/);
  const retry = load();
  assert.equal(load(), retry);
  assert.equal(await retry, value);
  assert.equal(await load(), value);
  assert.deepEqual(attempts, [0, 1]);
});
