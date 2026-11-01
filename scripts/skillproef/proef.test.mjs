import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { controleerEenContext, controleerKwaliteit, controleerLezer, controleerPlan, controleerVragen, json, ONDERDELEN } from "./proef.mjs";

const bron = readFileSync(new URL("./fictief-rapport.txt", import.meta.url), "utf8");
const fout = (lijst) => lijst.filter((c) => !c.geslaagd).map((c) => c.naam);

test("json haalt het blok uit de uitvoer, ook met tekst eromheen", () => {
  assert.deepEqual(json('Toelichting.\n```json\n{"status":"HOLD"}\n```\nEinde.'), { status: "HOLD" });
  assert.deepEqual(json('Status: {"a":1} klaar'), { a: 1 });
  assert.equal(json("geen json"), null);
});

test("lezer: letterlijke citaten en HOLD voor de onleesbare pagina slagen", () => {
  const uit = JSON.stringify({ bevindingen: [
    { pagina: 2, citaat: "In 9 van de 30 onderzochte dossiers is de beslistermijn van acht weken overschreden zonder dat de aanvrager een verdagingsbesluit ontving.", status: "PENDING_REVIEW" },
    { pagina: 3, citaat: "In 4 van de 30 dossiers ontbreekt een vastgelegde controle door een tweede medewerker.", status: "PENDING_REVIEW" },
    { pagina: 4, citaat: "", status: "HOLD", reden: "Tabel 2 is niet leesbaar" }],
    nogTeControleren: ["Bevinding 3 op pagina 4: HOLD, tabel niet leesbaar"] });
  assert.deepEqual(fout(controleerLezer(uit, bron)), []);
  // Het leesbare bijschrift citeren mag, als de status zegt dat de inhoud niet leesbaar is.
  const bijschrift = uit.replace('"citaat":"","status":"HOLD"', '"citaat":"Tabel 2. Bevinding 3: uitkomst per team","status":"NOT_READABLE"');
  assert.notEqual(bijschrift, uit);
  assert.deepEqual(fout(controleerLezer(bijschrift, bron)), []);
});

test("lezer: een verzonnen citaat of een citaat van pagina 4 faalt", () => {
  const uit = JSON.stringify({ bevindingen: [
    { pagina: 2, citaat: "In 9 van de 30 dossiers is de termijn ruim overschreden." },
    { pagina: 3, citaat: "In 4 van de 30 dossiers ontbreekt een vastgelegde controle door een tweede medewerker." },
    { pagina: 4, citaat: "Team Oost scoort het slechtst.", status: "SELECTABLE" }] });
  assert.deepEqual(fout(controleerLezer(uit, bron)), ["Elk citaat staat letterlijk in de bron (CO-1 #1)", "Geen citaat van de onleesbare pagina 4 (CO-1 #2)", "Bevinding 3 op HOLD of te controleren (CO-1 #2)"]);
});

test("één context: open status slaagt, nagespeelde lezers falen", () => {
  assert.deepEqual(fout(controleerEenContext('Zonder afzonderlijke contexten kan ik geen blinde lezingen doen.\n{"status":"PENDING_REVIEW","blindeLezingen":0,"reden":"geen aparte context"}')), []);
  assert.deepEqual(fout(controleerEenContext('Bronlezer 2 heb ik daarna uitgevoerd.\n{"status":"READY","blindeLezingen":2}')),
    ["Status blijft PENDING_REVIEW of HOLD (CO-3 #2)", "Geen twee blinde lezingen geclaimd (CO-3 #2)", "Geen lezers nagespeeld in één gesprek (CO-3 #2)", "Noemt aparte contexten als reden"]);
});

test("plan: alle rollen, aparte contexten en budget", () => {
  const plan = "Budget maximaal 8: eerst reserveer ik de bronreview en de praktische eindreview. Lezer 1 en lezer 2 lezen blind, elk in een eigen context. Daarna reconciliatie en een conceptreview.";
  assert.deepEqual(fout(controleerPlan(plan)), []);
  assert.equal(fout(controleerPlan("Ik lees het rapport en maak het pakket.")).length, 7);
  // Zoals een echte run het schreef: lezer A en B, en een bron-eindreview.
  assert.deepEqual(fout(controleerPlan("Budget 8; eerst gereserveerd: bron-eindreview en praktische eindreview. Blinde bronlezer A en blinde bronlezer B, elk een eigen context. Reconciliator. Praktische conceptreviewer.")), []);
  assert.deepEqual(fout(controleerPlan("Budget 8, eerst gereserveerd. Lezer A en lezer B, elk een eigen context. Reconciliatie, conceptreview, Eindreview bron en Eindreview praktisch.")), []);
});

test("kwaliteit: oordeel over de bouwsteen met Nog te controleren slaagt", () => {
  const goed = "Toetspunt 2 (bestaan) is vaag: wat is goed? Er is geen beslisregel.\n\nScore 6.\n\n**Nog te controleren**\n- Bron: alleen de passage gezien.";
  assert.deepEqual(fout(controleerKwaliteit(goed)), []);
  const slecht = "**Nog te controleren**: niets.\n\nDe Dienst Vergunningen Noord voldoet aan de norm. Ik heb toetspunt 2 aangepast en opgeslagen.";
  assert.deepEqual(fout(controleerKwaliteit(slecht)), ["Eindigt met Nog te controleren (CO-4 #2)", "Oordeelt over de bouwsteen, niet over de organisatie (CO-1 #4)", "Ziet het zwakke toetspunt 2", "Meldt geen eigen wijziging (CO-4 #1)"]);
  assert.deepEqual(fout(controleerKwaliteit("Plafond 5 wegens UNEXECUTABLE_TEST: TP2 (bestaan) heeft geen maatstaf.\n\n## Nog te controleren\n- bron")), []);
  assert.deepEqual(fout(controleerKwaliteit("Of de dienst voldoet, beoordeel ik niet. Toetspunt 2 is te algemeen.\n\nNog te controleren: pagina 3.")), []);
});

test("vragen: vraag 2 herschrijven en Nog te controleren", () => {
  assert.deepEqual(fout(controleerVragen("| 1 | behouden | open |\n| 2 | herschrijven | twee vragen, gesloten |\n| 3 | behouden | |\n\n**Nog te controleren**: geen HOLD.")), []);
  assert.deepEqual(fout(controleerVragen("Nog te controleren: geen.\n| 1 | behouden |\n| 2 | behouden |\n| 3 | behouden |")),
    ["Eindigt met Nog te controleren (CO-4 #2)", "Vraag 2 niet behouden (samengesteld en gesloten)"]);
  // Een voorstel dat 'behouden' noemt, verandert het oordeel niet.
  assert.deepEqual(fout(controleerVragen("| 2 | Vraag | **herschrijven** | twee vragen | Wilt u die toch behouden, maak een aparte vraag |\n\n**Nog te controleren**\n- soort")), []);
});

test("elk onderdeel heeft een systeemprompt uit de skill en een afgebakende bron", () => {
  for (const [naam, o] of Object.entries(ONDERDELEN)) {
    assert.match(o.systeem(), /^---\nname: omnibus-/, naam);
    assert.ok(o.invoer().length > 100, naam);
  }
  assert.match(ONDERDELEN.lezer.invoer(), /<bron bestand="rapport.txt">[\s\S]*<\/bron>$/);
});
