import test from "node:test";
import assert from "node:assert/strict";
import { STATUSLABELS, openPunten, opmerking, vinkAf } from "./issue-gesloten.mjs";

const epic = "## Stories\n- [ ] #12 Eerste\n- [x] #13 Tweede\n- [ ] #120 Derde\n";

test("vinkAf zet alleen het vinkje van precies dit nummer", () => {
  assert.equal(vinkAf(epic, 12), "## Stories\n- [x] #12 Eerste\n- [x] #13 Tweede\n- [ ] #120 Derde\n");
  assert.equal(vinkAf(epic, 13), null);
  assert.equal(vinkAf(epic, 1), null);
});

test("openPunten noemt open criteria, niet de verwijzingen naar andere issues", () => {
  assert.deepEqual(openPunten("- [x] Klaar\n- [ ] Test erbij\n* [ ] Docs bijgewerkt\n- [ ] #44 andere story"), ["Test erbij", "Docs bijgewerkt"]);
  assert.deepEqual(openPunten(""), []);
});

test("de opmerking draagt een markering, zodat hij maar één keer komt", () => {
  assert.match(opmerking(["Test erbij"]), /^<!-- checklist-bij-sluiten -->\n\*\*Checklist bij sluiten\.\*\*[\s\S]*- Test erbij/);
  assert.deepEqual(STATUSLABELS, ["klaar", "bezig", "wacht-op-ander", "wacht-op-beheerder", "gepauzeerd"]);
});
