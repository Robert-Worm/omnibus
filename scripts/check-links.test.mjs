import test from "node:test";
import assert from "node:assert/strict";
import { controleerLink, isKapot, issueTekst, verzamelLinks } from "./check-links.mjs";

test("haalt alleen echte externe links uit markdown", () => {
  const tekst = [
    "Zie [wetten](https://wetten.overheid.nl/BWBR0001854/) en <https://www.rijksmap.nl/>.",
    "`https://code.example.org/niet` en [lokaal](http://127.0.0.1:4319/) en [plaatshouder](https://<jouw-adres>)",
    "```text\nhttps://in-codeblok.nl/\n```",
    '<img src="https://img.shields.io/badge/x">  [dubbel](https://www.rijksmap.nl/)',
    "[test](https://omnibus.example.invalid/) [relatief](../README.md).",
    "[Claim](https://github.com/o/r/issues/new?template=x.yml&title=A) [Claim](https://github.com/o/r/issues/new?template=x.yml&title=B)",
  ].join("\n");
  assert.deepEqual(verzamelLinks(tekst).sort(), [
    "https://github.com/o/r/issues/new",
    "https://img.shields.io/badge/x",
    "https://wetten.overheid.nl/BWBR0001854/",
    "https://www.rijksmap.nl/",
  ]);
});

test("alleen echte fouten tellen als kapot; robotweren niet", () => {
  for (const s of [404, 410, 500, 503, "ENOTFOUND", "ECONNREFUSED", "CERT_HAS_EXPIRED"]) assert.equal(isKapot(s), true, String(s));
  for (const s of [200, 301, 401, 403, 429, "TIMEOUT", "ETIMEDOUT", "ECONNRESET", "EAI_AGAIN", "UND_ERR_CONNECT_TIMEOUT"]) assert.equal(isKapot(s), false, String(s));
});

test("probeert GET als HEAD niet mag, en een kapotte link twee keer", async () => {
  const log = [];
  const haal = async (url, methode) => { log.push(methode); return methode === "HEAD" ? 405 : 200; };
  assert.equal(await controleerLink("https://a.nl/", haal), 200);
  assert.deepEqual(log, ["HEAD", "GET"]);
  let n = 0;
  assert.equal(await controleerLink("https://b.nl/", async () => { n++; return 404; }), 404);
  assert.equal(n, 4, "twee pogingen, elk HEAD en GET");
  const fout = Object.assign(new Error("x"), { cause: { code: "ENOTFOUND" } });
  assert.equal(await controleerLink("https://c.nl/", async () => { throw fout; }), "ENOTFOUND");
});

test("issuetekst noemt elke link met uitkomst en vindplaats, gesorteerd", () => {
  const tekst = issueTekst([
    { url: "https://z.nl/", status: 404, bestanden: ["docs/a.md"] },
    { url: "https://a.nl/", status: "ENOTFOUND", bestanden: ["README.md", "docs/b.md"] },
  ], "2026-10-26");
  assert.match(tekst, /2026-10-26 vond 2 links/);
  assert.ok(tekst.indexOf("https://a.nl/") < tekst.indexOf("https://z.nl/"));
  assert.match(tekst, /\| https:\/\/a\.nl\/ \| ENOTFOUND \| `README\.md`, `docs\/b\.md` \|/);
});
