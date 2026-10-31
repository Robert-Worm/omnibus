import test from "node:test";
import assert from "node:assert/strict";
import { leesCsv, schrijfCsv, verwerk, vraag } from "./geschiktheid.mjs";

const groep = [
  { id: "a", bron: "Auditdienst Rijk", auteur: "Auditdienst Rijk", titel: "Auditrapport; 2025" },
  { id: "b", bron: "Onderzoeken en evaluaties", auteur: "", titel: "Raming\nzorgkosten" },
];

test("de vraag geeft per rapport nummer, bron, auteur en titel, zonder scheidingstekens", () => {
  assert.equal(vraag(groep), "1. [Auditdienst Rijk] Auditdienst Rijk: Auditrapport 2025\n2. [Onderzoeken en evaluaties] onbekende auteur: Raming zorgkosten");
});

test("het antwoord wordt teruggekoppeld; ongeldige oordelen en onbekende nummers vallen weg", () => {
  const uit = verwerk(groep, '```json\n{"oordelen":[{"n":1,"oordeel":"geschikt","reden":"Audit; met bevindingen"},{"n":2,"oordeel":"misschien"},{"n":9,"oordeel":"niet"}]}\n```');
  assert.deepEqual([...uit], [["a", { oordeel: "geschikt", reden: "Audit met bevindingen" }]]);
});

test("het CSV-bestand is gesorteerd en weer in te lezen", () => {
  const tekst = schrijfCsv(new Map([["b", { oordeel: "niet", reden: "Raming" }], ["a", { oordeel: "twijfel", reden: "" }]]));
  assert.equal(tekst, "id;oordeel;reden\na;twijfel;\nb;niet;Raming\n");
  assert.deepEqual(leesCsv(tekst).map((r) => r.id), ["a", "b"]);
});
