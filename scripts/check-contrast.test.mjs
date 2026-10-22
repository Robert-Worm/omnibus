import test from "node:test";
import assert from "node:assert/strict";
import { contrast, leesOpties, MINIMUM } from "./check-contrast.mjs";

test("contrast volgt WCAG: zwart op wit is 21:1, gelijke kleuren 1:1", () => {
  assert.equal(Math.round(contrast([0, 0, 0], [255, 255, 255])), 21);
  assert.equal(contrast([16, 25, 35], [16, 25, 35]), 1);
  assert.equal(contrast([255, 255, 255], [0, 0, 0]), contrast([0, 0, 0], [255, 255, 255]), "volgorde maakt niet uit");
});

test("de grens is WCAG AA voor gewone tekst; bekende kleuren uit Omnibus vallen goed of fout", () => {
  assert.equal(MINIMUM, 4.5);
  assert.ok(contrast([0x56, 0x6a, 0x7f], [255, 255, 255]) >= MINIMUM, "paginavoet in licht");
  assert.ok(contrast([0x64, 0x78, 0x8d], [0xee, 0xf1, 0xf6]) < MINIMUM, "de oude kleur van de paginavoet");
  assert.ok(contrast([0x38, 0x55, 0x70], [0x17, 0x23, 0x30]) < MINIMUM, "de oude normcode in donker");
  assert.ok(contrast([0xb0, 0xbf, 0xd0], [0x17, 0x23, 0x30]) >= MINIMUM, "de normcode in donker");
});

test("zonder --settings een begrijpelijke fout; --schema kiest één thema", () => {
  assert.throws(() => leesOpties([]), /--settings local-data\/runtime\/local-build\.json/);
  assert.deepEqual(leesOpties(["--settings", "x.json"]), { settings: "x.json", port: 4390, schemas: ["light", "dark"] });
  assert.deepEqual(leesOpties(["--settings", "x.json", "--schema", "dark"]).schemas, ["dark"]);
  assert.throws(() => leesOpties(["--settings", "x.json", "--schema", "blauw"]), /light of dark/);
});
