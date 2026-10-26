// Pure vormcontrole; geen netwerktoegang of bewijs van bereikbaarheid/openbaarheid.
import { createHash } from "node:crypto";
import { isIP } from "node:net";

export const VOORSTEL_LABELS = Object.freeze({
  proposal: "rapportvoorstel", approve: "voorstel-goedgekeurd", reject: "voorstel-afgewezen",
});
export const VOORSTEL_VELDEN = Object.freeze({
  url: "Link naar de openbare publicatie",
  titel: "Titel",
  auteur: "Auteur of organisatie",
  datum: "Publicatiedatum",
  reden: "Waarom past dit rapport bij Omnibus?",
  openbaar: "Openbaarheid",
});
export const OPENBAAR_VERKLARING = "Het rapport is openbaar en zonder account te lezen.";
const MAX = Object.freeze({ titel: 240, auteur: 240, datum: 10, url: 2048, reden: 4000 });
const ONVEILIG = /[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}]/u;
const OPMAAK = /[<>\[\]`\\|*_~]/u;
const mislukt = (...fouten) => ({ ok: false, fouten, voorstel: null });

function kalenderdatum(waarde) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(waarde)) return false;
  const [jaar, maand, dag] = waarde.split("-").map(Number);
  const schrikkel = jaar % 4 === 0 && (jaar % 100 !== 0 || jaar % 400 === 0);
  const dagen = [31, schrikkel ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return jaar > 0 && maand >= 1 && maand <= 12 && dag >= 1 && dag <= dagen[maand - 1];
}

function publiekeHost(hostnaam) {
  const host = hostnaam.replace(/^\[|\]$/g, "").replace(/\.$/, "");
  const ip = isIP(host);
  if (ip === 4) {
    const [a, b, c] = host.split(".").map(Number);
    // Ook niet-publieke speciale reeksen, documentatie en multicast weigeren.
    return !(a === 0 || a === 10 || a === 127 || a >= 224
      || (a === 100 && b >= 64 && b <= 127)
      || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && (b === 168 || b === 0 || (b === 88 && c === 99)))
      || (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100)))
      || (a === 203 && b === 0 && c === 113));
  }
  if (ip === 6) {
    // Alleen globale unicast; geen loopback, ULA, linklocal, mapped IPv4,
    // NAT64, multicast of tunnels die een lokaal IPv4-adres kunnen verbergen.
    const [eerste, tweede = "0"] = host.split(":");
    const a = parseInt(eerste, 16), b = parseInt(tweede || "0", 16);
    return a >= 0x2000 && a <= 0x3fff && a !== 0x2002
      && !(a === 0x2001 && (b <= 0x1ff || b === 0xdb8))
      && !(a === 0x3fff && b <= 0xfff);
  }
  // DNS wordt niet geraadpleegd. Een gewone domeinnaam kan alsnog privé
  // resolven: beheerder controleert de bron; deze module geeft geen fetchrecht.
  return host.length <= 253 && host.includes(".")
    && !/(^|\.)(localhost|local|internal|lan|home|home\.arpa)$/.test(host)
    && host.split(".").every((deel) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(deel));
}

function publicatieUrl(waarde) {
  if (!/^https:\/\//i.test(waarde) || /[\s\\<>`"']/u.test(waarde)) return null;
  let url;
  try {
    // Verborgen besturingstekens ook in gepercentcodeerde invoer weigeren.
    if (ONVEILIG.test(decodeURIComponent(waarde))) return null;
    url = new URL(waarde);
  } catch { return null; }
  // Ook lege credentials (https://@host/) zijn geen publicatieadres.
  const authority = waarde.slice(8).split(/[/?#]/, 1)[0];
  if (!authority || url.protocol !== "https:" || authority.includes("@") || url.username || url.password
    || !publiekeHost(url.hostname)) return null;
  // Voorkom dat een URL een Markdown-link/tabel kan afsluiten. IPv6-haken
  // blijven alleen in de authority staan; pad/query/fragment worden gecodeerd.
  const encode = (tekst) => tekst.replace(/[()\[\]|*~]/g,
    (teken) => `%${teken.charCodeAt(0).toString(16).toUpperCase()}`);
  url.pathname = encode(url.pathname);
  url.search = encode(url.search);
  url.hash = encode(url.hash);
  return url.href.length <= MAX.url ? url.href : null;
}

/** Eén GitHub-issue, zes exacte formuliersecties; labels geven geen toestemming. */
export function parseRapportVoorstel(issue) {
  if (!issue || typeof issue !== "object" || issue.pull_request
    || !Number.isSafeInteger(issue.number) || issue.number <= 0) {
    return mislukt("Gebruik een GitHub-issue met een positief, veilig geheel issuenummer.");
  }
  if (typeof issue.body !== "string" || issue.body.length > 12000) {
    return mislukt("Het voorstel moet tekst bevatten van maximaal 12.000 tekens.");
  }
  const body = issue.body.replace(/\r\n/g, "\n");
  if (ONVEILIG.test(body.replace(/\n/g, ""))) {
    return mislukt("Het voorstel bevat onveilige of verborgen besturingstekens.");
  }
  const sleutels = new Map(Object.entries(VOORSTEL_VELDEN).map(([key, label]) => [label, key]));
  const secties = new Map();
  let huidig;
  for (const regel of body.split("\n")) {
    if (regel.startsWith("### ")) {
      const key = sleutels.get(regel.slice(4));
      if (!key || secties.has(key)) return mislukt("Gebruik elk bekend formulierveld precies eenmaal.");
      secties.set(key, []);
      huidig = key;
    } else {
      if (/^\s*#/.test(regel) || (!huidig && regel.trim())) {
        return mislukt("Gebruik alleen de zes formuliersecties, zonder extra koppen of tekst ervoor.");
      }
      if (huidig) secties.get(huidig).push(regel);
    }
  }
  const fouten = [];
  const waarden = {};
  for (const key of Object.keys(VOORSTEL_VELDEN)) {
    const waarde = (secties.get(key) || []).join("\n").trim().normalize("NFC");
    waarden[key] = waarde;
    if (!waarde || waarde === "_No response_") fouten.push(`Vul het veld ${VOORSTEL_VELDEN[key]} in.`);
    else if (MAX[key] && waarde.length > MAX[key]) fouten.push(`${VOORSTEL_VELDEN[key]} is te lang (maximaal ${MAX[key]} tekens).`);
  }
  if (fouten.length) return mislukt(...fouten);
  for (const key of ["titel", "auteur", "reden"]) {
    const waarde = waarden[key];
    if (OPMAAK.test(waarde) || /^\s*\/\S/m.test(waarde)
      || /(^|\s)@[\w-]/u.test(waarde)
      || (key !== "reden" && waarde.includes("\n"))) {
      fouten.push(`${VOORSTEL_VELDEN[key]} moet gewone tekst zijn, zonder opmaak, vermeldingen of botcommando's.`);
    }
  }
  if (!kalenderdatum(waarden.datum)) fouten.push("Publicatiedatum moet een bestaande kalenderdatum zijn in de vorm YYYY-MM-DD.");
  if (!["- [x] ", "- [X] "].some((prefix) => waarden.openbaar === prefix + OPENBAAR_VERKLARING)) {
    fouten.push("Vink uitsluitend de volledige verklaring over openbaarheid aan.");
  }
  const url = publicatieUrl(waarden.url);
  if (!url) fouten.push("Gebruik één HTTPS-publicatieadres zonder inloggegevens of lokale/private host (alleen vormcontrole).");
  if (fouten.length) return mislukt(...fouten);
  return {
    ok: true, fouten: [], voorstel: {
      id: `voorstel-${issue.number}`,
      titel: waarden.titel, auteur: waarden.auteur, datum: waarden.datum,
      url, reden: waarden.reden.replace(/\s+/gu, " "), openbaar: "ja", issue: issue.number,
    },
  };
}

/** Hash uitsluitend gevalideerde voorstelvelden; vaste volgorde, geen extra metadata. */
export function voorstelFingerprint(voorstel) {
  const velden = ["id", "titel", "auteur", "datum", "url", "reden", "openbaar", "issue"];
  if (!voorstel || velden.some((key) => typeof voorstel[key] !== (key === "issue" ? "number" : "string"))
    || !Number.isSafeInteger(voorstel.issue) || voorstel.issue <= 0
    || voorstel.id !== `voorstel-${voorstel.issue}` || voorstel.openbaar !== "ja") {
    throw new TypeError("Een volledig gevalideerd rapportvoorstel is vereist voor een fingerprint.");
  }
  return createHash("sha256").update(JSON.stringify(velden.map((key) => voorstel[key]))).digest("hex");
}
