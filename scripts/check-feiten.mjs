#!/usr/bin/env node
// Herschrijven zonder feiten te veranderen (#204). Vergelijkt de feiten in een pagina vóór en
// na een wijziging: getallen en datums, links, code, issuenummers, besluit-ID's en bron-ID's.
// Een verschil is een melding, geen fout: bij een inhoudelijke wijziging hoort een verschil.
// Idee uit forjd/better-writing (MIT): beter schrijven zonder feiten toe te voegen.
//
//   npm run check:feiten                         gewijzigde .md-bestanden t.o.v. HEAD
//   npm run check:feiten -- --vanaf main~1        t.o.v. een andere commit
//   npm run check:feiten -- docs/x.md             alleen deze bestanden
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Volgorde telt: eerst de grote stukken (links, code), dan de kleine (getallen).
const SOORTEN = [
  ["link", /\]\(([^)\s]+)\)|https?:\/\/[^\s)>\]]+/g],
  ["code", /`([^`\n]+)`/g],
  ["issue", /(?<![\w/])#\d+\b/g],
  ["besluit", /\bB-\d{3}\b/g],
  ["id", /\b[A-Z][A-Z0-9]{2,}(?:-[A-Z0-9]+)*\d[A-Z0-9-]*\b/g],
  ["getal", /(?<![\w.,-])\d(?:[\d.,]*\d)?(?:\s?%)?(?![\w])/g],
];

/** Alle feiten in een tekst, als multiset `soort:waarde` → aantal. */
export function feiten(tekst) {
  let rest = tekst.replace(/<!--[\s\S]*?-->/g, " ");
  const uit = new Map();
  for (const [soort, re] of SOORTEN) {
    rest = rest.replace(re, (m, groep) => {
      const sleutel = `${soort}:${(typeof groep === "string" ? groep : m).trim()}`;
      uit.set(sleutel, (uit.get(sleutel) ?? 0) + 1);
      return " ".repeat(m.length);
    });
  }
  return uit;
}

/** Welke feiten verdwenen en welke erbij kwamen. */
export function vergelijkFeiten(voor, na) {
  const a = feiten(voor), b = feiten(na), weg = [], nieuw = [];
  for (const [k, n] of a) for (let i = (b.get(k) ?? 0); i < n; i++) weg.push(k);
  for (const [k, n] of b) for (let i = (a.get(k) ?? 0); i < n; i++) nieuw.push(k);
  return { weg, nieuw };
}

function git(args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
}

function main() {
  const args = process.argv.slice(2);
  const i = args.indexOf("--vanaf");
  const vanaf = i >= 0 ? args.splice(i, 2)[1] : "HEAD";
  const bestanden = args.length ? args : git(["diff", "--name-only", vanaf, "--", "*.md"]).split("\n").filter(Boolean);
  let meldingen = 0;
  for (const f of bestanden) {
    let voor = "";
    try { voor = git(["show", `${vanaf}:${f}`]); } catch { continue; } // nieuw bestand: niets te vergelijken
    const na = existsSync(path.join(root, f)) ? readFileSync(path.join(root, f), "utf8") : "";
    const { weg, nieuw } = vergelijkFeiten(voor, na);
    if (!weg.length && !nieuw.length) continue;
    meldingen += weg.length + nieuw.length;
    console.log(`${f}:`);
    for (const k of weg) console.log(`  − verdwenen ${k}`);
    for (const k of nieuw) console.log(`  + nieuw ${k}`);
  }
  console.log(meldingen ? `\n${meldingen} feiten veranderd. Klopt dat met de bedoeling van de wijziging?` : "Feiten: niets veranderd.");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
