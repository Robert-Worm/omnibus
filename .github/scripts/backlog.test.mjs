import assert from "node:assert/strict";
import test from "node:test";
import { readdirSync } from "node:fs";
import { controleerNieuweStory } from "./backlog-lib.mjs";

test("een nieuwe story zonder werklabel wordt geweigerd (B-019)", () => {
  assert.throws(() => controleerNieuweStory({ id: "X-1" }), /mist een werklabel/);
  assert.throws(() => controleerNieuweStory({ id: "X-2", labels: ["routekaart"] }), /mist een werklabel/);
  assert.throws(() => controleerNieuweStory({ id: "X-3", labels: ["Opus 5.5", "Opus"] }), /onbekend label: Opus/);
  assert.doesNotThrow(() => controleerNieuweStory({ id: "X-4", labels: ["Opus 5.5"] }));
  assert.doesNotThrow(() => controleerNieuweStory({ id: "X-5", labels: ["Opus 5.5", "ChatGPT Astra"] }));
});

test("de stories uit de backlog van 24 oktober hebben allemaal een werklabel", async () => {
  const dir = new URL("../backlog/", import.meta.url);
  const nieuw = ["skills-ideeen-2026-10.mjs"];
  for (const f of readdirSync(dir).filter((f) => nieuw.includes(f))) {
    const b = (await import(new URL(f, dir))).default;
    for (const e of b.epics) for (const s of e.stories) controleerNieuweStory(s);
  }
});
