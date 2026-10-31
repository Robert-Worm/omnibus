import test from "node:test";
import assert from "node:assert/strict";
import { controleer, controleerEenKeer, issueTekst } from "./gezondheid.mjs";

const antwoord = (status, body = {}) => ({ status, text: async () => "", json: async () => body });
const versie = { data: { release: "a".repeat(64), publication: "b".repeat(64) } };

test("gezond: health 200 en een versie met release en publicatie", async () => {
  const haal = async (url) => (url.endsWith("/health") ? antwoord(200) : antwoord(200, versie));
  const uit = await controleerEenKeer("https://voorbeeld.invalid", haal);
  assert.equal(uit.ok, true);
});

test("niet gezond: foutstatus, ontbrekende versie of geen verbinding", async () => {
  assert.match((await controleerEenKeer("https://x.invalid", async () => antwoord(503))).reden, /health gaf HTTP 503/);
  const zonderVersie = async (url) => (url.endsWith("/health") ? antwoord(200) : antwoord(200, {}));
  assert.match((await controleerEenKeer("https://x.invalid", zonderVersie)).reden, /mist release/);
  assert.equal((await controleerEenKeer("https://x.invalid", async () => { throw new TypeError("fetch failed"); })).reden, "niet bereikbaar");
});

test("een enkele hapering geeft geen melding; drie mislukte pogingen wel", async () => {
  let n = 0;
  const herstelt = async (url) => (++n <= 2 ? antwoord(502) : url.endsWith("/health") ? antwoord(200) : antwoord(200, versie));
  assert.equal((await controleer("https://x.invalid", { haal: herstelt, wacht: async () => {} })).ok, true);
  let pogingen = 0;
  const kapot = async () => { pogingen++; return antwoord(500); };
  const uit = await controleer("https://x.invalid", { haal: kapot, wacht: async () => {} });
  assert.equal(uit.ok, false);
  assert.equal(pogingen, 3);
});

test("de issuetekst noemt adres, reden en herstel, maar geen verzoekgegevens", () => {
  const tekst = issueTekst("https://omnibus.rijksmap.nl", "health gaf HTTP 503", "2026-10-31 12:00");
  assert.match(tekst, /omnibus\.rijksmap\.nl/);
  assert.match(tekst, /HTTP 503/);
  assert.match(tekst, /sluit vanzelf/);
});
