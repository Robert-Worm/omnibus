import test from "node:test";
import assert from "node:assert/strict";
import { bannerHtml, beeldNaam, KLEUREN, leesOpties, leesStand, ONDERZOEK, rondleidingHtml, schrijfStand, STAPPEN } from "./docs-screenshots.mjs";
import { schermWaarschuwingen } from "./check-docs.mjs";

test("zonder --settings een begrijpelijke fout; --alleen splitst namen", () => {
  assert.throws(() => leesOpties([]), /--settings local-data\/runtime\/local-build\.json/);
  assert.deepEqual(leesOpties(["--settings", "x.json", "--alleen", "a,b"]), { settings: "x.json", port: 4391, alleen: ["a", "b"] });
});

test("het rondleidingsbeeld toont vier stappen, de actieve stap en de voortgang", () => {
  const html = rondleidingHtml({ stap: 2, uitleg: "Uitleg", voortgang: 0.5, beeld: Buffer.from("png") });
  assert.equal(STAPPEN.length, 4);
  for (const s of STAPPEN) assert.ok(html.includes(s), s);
  assert.equal((html.match(/✓/g) || []).length, 2, "stap 1 en 2 zijn klaar");
  assert.match(html, /width:50\.0%/);
  assert.match(html, /data:image\/png;base64,cG5n/);
});

test("het vaste onderzoek is fictief en compleet", () => {
  assert.match(ONDERZOEK.onderwerp, /CIO-functie/);
  assert.ok(ONDERZOEK.centraleVraag.endsWith("?"));
  assert.equal(ONDERZOEK.koppelingen, 6);
});

test("de documentatiecheck waarschuwt als schermafbeeldingen bij een oudere versie horen", () => {
  assert.deepEqual(schermWaarschuwingen(schrijfStand({ "a.png": "0.1.085" }), "0.1.085"), []);
  const [w] = schermWaarschuwingen(schrijfStand({ "b.png": "0.1.085", "a.png": "0.1.084" }), "0.1.085");
  assert.match(w, /1 afbeelding hoort bij een oudere versie dan 0\.1\.085: a\.png \(0\.1\.084\)/);
  assert.match(w, /npm run docs:screenshots/);
  assert.match(schermWaarschuwingen(null, "0.1.085")[0], /nog niet vastgelegd/);
});

test("het standbestand is leesbare tekst die heen en terug hetzelfde blijft", () => {
  const tekst = schrijfStand({ "b.png": "0.1.085", "a.gif": "0.1.084" });
  assert.match(tekst, /^# .*\na\.gif 0\.1\.084\nb\.png 0\.1\.085\n$/);
  assert.deepEqual(leesStand(tekst), { "a.gif": "0.1.084", "b.png": "0.1.085" });
});

test("elke afbeelding krijgt een donkere variant met -donker in de naam", () => {
  assert.equal(beeldNaam("stap-1", "light"), "stap-1");
  assert.equal(beeldNaam("stap-1", "dark"), "stap-1-donker");
});

test("de rondleiding en de banner volgen het kleurschema; het stilstaande beeld toont een afspeelknop", () => {
  const donker = rondleidingHtml({ stap: 0, uitleg: "U", voortgang: 0, beeld: Buffer.from("x"), schema: "dark", speel: true });
  assert.ok(donker.includes(`background:${KLEUREN.dark.achter}`));
  assert.match(donker, /Bekijk de rondleiding/);
  assert.doesNotMatch(rondleidingHtml({ stap: 0, uitleg: "U", voortgang: 0, beeld: Buffer.from("x") }), /Bekijk de rondleiding/);
  const banner = bannerHtml({ schema: "dark", voor: Buffer.from("v"), achter: Buffer.from("a") });
  assert.match(banner, /Omnibus/);
  assert.match(banner, /Van brondocument naar referentiekader/);
  assert.match(banner, /#0f1722/);
  assert.equal((banner.match(/data:image\/png;base64,/g) || []).length, 2);
});
