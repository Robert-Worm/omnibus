import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  VOORSTEL_LABELS, VOORSTEL_VELDEN, OPENBAAR_VERKLARING,
  parseRapportVoorstel, voorstelFingerprint,
} from "./rapportvoorstel-lib.mjs";

const basis = {
  url: "https://publicaties.example.org/rapport.pdf",
  titel: "Fictief jaarverslag 2024 – ICT & beheer (deel 1)",
  auteur: "Fictieve organisatie", datum: "2024-02-29",
  reden: "Dit fictieve rapport gaat over interne beheersing.",
  openbaar: `- [x] ${OPENBAAR_VERKLARING}`,
};
const body = (velden = {}) => Object.entries({ ...basis, ...velden })
  .map(([key, waarde]) => `### ${VOORSTEL_VELDEN[key]}\n\n${waarde}`).join("\n\n");
const parse = (velden = {}, extra = {}) => parseRapportVoorstel({ number: 234, body: body(velden), ...extra });
const weigert = (resultaat, context) => {
  assert.equal(resultaat.ok, false, context);
  assert.equal(resultaat.voorstel, null, context);
  assert.ok(resultaat.fouten.length > 0, context);
};

test("contract, leesbare metadata en geen invoermutatie", () => {
  assert.deepEqual(VOORSTEL_LABELS, {
    proposal: "rapportvoorstel", approve: "voorstel-goedgekeurd", reject: "voorstel-afgewezen",
  });
  assert.equal(Object.isFrozen(VOORSTEL_VELDEN), true);
  const issue = Object.freeze({ number: 234, body: body(), title: "Geen metadata", labels: [] });
  const result = parseRapportVoorstel(issue);
  assert.deepEqual(result, { ok: true, fouten: [], voorstel: {
    id: "voorstel-234", ...basis, openbaar: "ja", issue: 234,
  } });
  assert.equal(issue.body, body());
});

test("nummer is een positief veilig getal en invoer is een issue", () => {
  for (const number of [0, -1, 1.5, "234", NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, null]) {
    weigert(parse({}, { number }), String(number));
  }
  assert.equal(parse({}, { number: Number.MAX_SAFE_INTEGER }).ok, true);
  weigert(parse({}, { pull_request: {} }));
  for (const issue of [null, undefined, "tekst", {}, { number: 1, body: null }]) {
    weigert(parseRapportVoorstel(issue));
  }
});

test("elk veld is vereist, geen GitHub-placeholder of dubbelzinnige sectie", () => {
  for (const key of Object.keys(basis)) {
    weigert(parse({ [key]: "" }), key);
    weigert(parse({ [key]: "_No response_" }), key);
    weigert(parse({}, { body: body() + `\n\n### ${VOORSTEL_VELDEN[key]}\n\nextra` }), key);
    const zonder = body().replace(`### ${VOORSTEL_VELDEN[key]}\n\n${basis[key]}`, "");
    weigert(parse({}, { body: zonder }), key);
  }
  for (const tekst of [
    `Inleiding\n${body()}`, `${body()}\n\n### Onbekend\nextra`,
    `${body()}\n\nTweede verklaring`, body().replace("### Titel", "### Titel "),
    body().replace("### Titel", "## Titel"), body().replace("### Titel", " ### Titel"),
    `${body()}\n\n${body()}`,
  ]) weigert(parse({}, { body: tekst }));
});

test("alle grenzen worden afgedwongen", () => {
  for (const [key, limiet] of [["titel", 240], ["auteur", 240], ["reden", 4000]]) {
    assert.equal(parse({ [key]: "a".repeat(limiet) }).ok, true, key);
    weigert(parse({ [key]: "a".repeat(limiet + 1) }), key);
  }
  weigert(parse({ url: `https://example.org/${"a".repeat(2048)}` }));
  weigert(parse({}, { body: " ".repeat(12001) }));
});

test("datum bestaat in de kalender, inclusief eeuwgrens", () => {
  for (const datum of ["2023-02-29", "1900-02-29", "2024-04-31", "2024-13-01", "2024-00-01", "2024-01-00", "0000-01-01", "24-01-01", "2024-1-01", "2024-01-01T00:00:00Z"]) {
    weigert(parse({ datum }), datum);
  }
  for (const datum of ["2000-02-29", "2024-02-29", "2023-12-31", "0001-01-01"]) {
    assert.equal(parse({ datum }).ok, true, datum);
  }
});

test("alleen het exacte expliciet aangevinkte openbaarvakje", () => {
  for (const openbaar of ["ja", OPENBAAR_VERKLARING, `- [ ] ${OPENBAAR_VERKLARING}`,
    `- [x] ${OPENBAAR_VERKLARING} extra`, `- [x] Niet ${OPENBAAR_VERKLARING}`,
    `${basis.openbaar}\n${basis.openbaar}`, `${basis.openbaar}\n- [ ] Geheim`]) {
    weigert(parse({ openbaar }), openbaar);
  }
  assert.equal(parse({ openbaar: `- [X] ${OPENBAAR_VERKLARING}` }).ok, true);
});

test("URL weigert credentials, andere protocollen, parsertrucs en meer dan één adres", () => {
  for (const url of ["http://example.org/r", "file:///tmp/r", "javascript:alert(1)",
    "https://naam:" + "wachtwoord@example.org/r", "https://@example.org/r", "https://naam@example.org/r",
    "https:example.org", "https:///example.org", "https://example.org\\@localhost/r",
    "https://example.org/r\nhttps://ander.example.org/r", "https://example.org/a b",
    "https://example.org/%0a/inleveren", "https://example.org/%00", "https://example.org/%C2%85",
    "https://example.org/%E2%80%AE", "https://example.org/%ZZ", "https://exa_mple.org/r",
    "https://example.org/<script>", 'https://example.org/"']) {
    weigert(parse({ url }), url);
  }
});

test("URL weigert lokale/private IPv4-hosts, ook alternatieve schrijfwijzen", () => {
  for (const host of ["localhost", "LOCALHOST.", "sub.localhost", "server.local", "server.local.",
    "intranet", "intranet.lan", "server.home.arpa", "server.internal", "127.0.0.1", "127.1",
    "2130706433", "0x7f000001", "0177.0.0.1", "0.0.0.0", "10.2.3.4", "172.16.1.1",
    "172.31.255.255", "192.168.1.1", "169.254.169.254", "100.64.0.1", "100.127.255.255",
    "198.18.0.1", "192.0.2.1", "198.51.100.1", "203.0.113.1", "224.0.0.1", "255.255.255.255"]) {
    weigert(parse({ url: `https://${host}/r` }), host);
  }
});

test("URL weigert lokale/private IPv6 en vermomde IPv4", () => {
  for (const host of ["::", "::1", "fc00::1", "fd12::1", "fe80::1", "ff02::1", "::ffff:127.0.0.1",
    "::ffff:7f00:1", "::127.0.0.1", "64:ff9b::a00:1", "2002:7f00:1::", "2001::1", "2001:db8::1"]) {
    weigert(parse({ url: `https://[${host}]/r` }), host);
  }
  assert.equal(parse({ url: "https://[2606:4700:4700::1111]/r" }).ok, true);
});

test("URL-vormcontrole accepteert publieke vormen zonder netwerkverzoek", () => {
  // .invalid is bewust niet bereikbaar: de validator doet uitsluitend vormcontrole.
  for (const url of ["https://publicatie.example.invalid/r", "https://8.8.8.8/r", "https://example.org:8443/r"]) {
    assert.equal(parse({ url }).ok, true, url);
  }
  const url = parse({ url: "HTTPS://EXAMPLE.ORG:443/a/../rapport(1).pdf?q=[x]|y#deel(2)" }).voorstel.url;
  assert.equal(url, "https://example.org/rapport%281%29.pdf?q=%5Bx%5D%7Cy#deel%282%29");
});

test("verborgen besturing en onveilige Unicode worden niet stil verwijderd", () => {
  for (const teken of ["\0", "\t", "\r", "\u007f", "\u0085", "\u200b", "\u202e", "\u2066", "\ufeff", "\u2028", "\u2029", "\ud800"]) {
    weigert(parse({ titel: `Rapport${teken}titel` }), JSON.stringify(teken));
  }
  assert.equal(parse({}, { body: body().replace(/\n/g, "\r\n") }).ok, true);
});

test("geen HTML, Markdown, botmarkeringen, mentions of losse botcommando's in metadata", () => {
  for (const key of ["titel", "auteur", "reden"]) {
    for (const waarde of ["<!-- omnibus:accept -->", "<script>alert(1)</script>", "[klik](https://example.org)",
      "![plaatje](https://example.org)", "`code`", "a|tabel", "**vet**", "_cursief_", "~~weg~~",
      "\\escape", "/inleveren", "goed\n/vrijgeven", "@iemand rapporteert"]) {
      weigert(parse({ [key]: waarde }), `${key}: ${waarde}`);
    }
  }
  weigert(parse({ titel: "Titel\nTweede titel" }));
  weigert(parse({ auteur: "Auteur\nAndere auteur" }));
  assert.equal(parse({ reden: "Eerste reden.\n\nTweede reden." }).voorstel.reden, "Eerste reden. Tweede reden.");
});

test("fingerprint is canoniek, bindt alle velden en negeert propertyvolgorde/extra metadata", () => {
  const voorstel = parse().voorstel;
  const hash = voorstelFingerprint(voorstel);
  assert.match(hash, /^[0-9a-f]{64}$/);
  assert.equal(hash, createHash("sha256").update(JSON.stringify([
    voorstel.id, voorstel.titel, voorstel.auteur, voorstel.datum,
    voorstel.url, voorstel.reden, voorstel.openbaar, voorstel.issue,
  ])).digest("hex"));
  const omgekeerd = Object.fromEntries(Object.entries(voorstel).reverse());
  assert.equal(voorstelFingerprint({ ...omgekeerd, author_association: "OWNER" }), hash);
  for (const key of ["titel", "auteur", "datum", "url", "reden"]) {
    assert.notEqual(voorstelFingerprint({ ...voorstel, [key]: `${voorstel[key]}x` }), hash, key);
  }
  assert.notEqual(voorstelFingerprint(parse({}, { number: 235 }).voorstel), hash);
  assert.equal(voorstelFingerprint(parse({}, { body: `\n${body().replace(/\n/g, "\r\n")}\n` }).voorstel), hash);
  assert.equal(voorstelFingerprint(parse({ titel: "Café" }).voorstel), voorstelFingerprint(parse({ titel: "Cafe\u0301" }).voorstel));
  for (const fout of [null, {}, { ...voorstel, id: "ander" }, { ...voorstel, openbaar: "nee" }, { ...voorstel, issue: "234" }]) {
    assert.throws(() => voorstelFingerprint(fout), TypeError);
  }
});
