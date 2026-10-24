import assert from "node:assert/strict";
import test from "node:test";
import { leesOpties, rapport, scan, vragenUit } from "./scan-questions.mjs";

const norm = { data: { auditQuestion: { text: "Beoordeel of de taak is belegd." }, question: "Hoe is de taak belegd?" } };
const dimensie = { data: {
  question: "Hoe wordt {{onderwerp}} bestuurd?",
  questions: [{ id: "X-Q01", question: "Kunt u beschrijven hoe u besloot?", variants: { operational: "Kunt u beschrijven hoe u besloot?", management: "Wordt er gestuurd?" }, probes: "Wat deed u? Wat zag u?" }],
} };
const model = { metadata: { question: "Hoe wordt {{onderwerp}} bestuurd?", researchSubquestions: [{ id: "X-RQ01", question: "Welke rol speelt de leiding?" }] } };

test("vindt de vragen op alle plekken, met de juiste soort", () => {
  const plekken = [...vragenUit("norm", "N1", norm), ...vragenUit("dimension", "D1", dimensie), ...vragenUit("model", "M", model)].map((v) => `${v.id}:${v.plek}:${v.soort}`);
  assert.deepEqual(plekken, [
    "N1:toetsvraag:toetsvraag", "N1:vraag:toetsvraag",
    "D1:onderzoeksvraag:onderzoeksvraag",
    "X-Q01:interviewvraag operational:interview", "X-Q01:interviewvraag management:interview", "X-Q01:doorvragen:doorvraag",
    "M:centrale vraag:onderzoeksvraag", "X-RQ01:deelvraag:onderzoeksvraag",
  ]);
});

test("het rapport telt per bron en bevat zonder --met-tekst geen vraagteksten", () => {
  const resultaat = scan([{ bron: "TEST", titel: "Testbron", vragen: [...vragenUit("norm", "N1", norm), ...vragenUit("dimension", "D1", dimensie)] }]);
  assert.deepEqual(resultaat[0].telling, { schrappen: 0, herschrijven: 2, HOLD: 0, door: 4 });
  const zonder = rapport(resultaat);
  assert.match(zonder, /\| N1 \| toetsvraag \| herschrijven \| dit is een opdracht/);
  assert.doesNotMatch(zonder, /Beoordeel of de taak|Wordt er gestuurd/);
  assert.match(rapport(resultaat, { metTekst: true }), /Wordt er gestuurd\?/);
});

test("de database is verplicht", () => {
  assert.throws(() => leesOpties([]), /--database/);
  assert.deepEqual(leesOpties(["--database", "x.sqlite", "--met-tekst"]), { database: "x.sqlite", uit: undefined, metTekst: true });
});
