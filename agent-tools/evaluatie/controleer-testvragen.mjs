#!/usr/bin/env node
// Controleert of de verwachte antwoorden van de testvragen nog kloppen met de huidige
// agent-build, zonder AI (#186). Een vraag die niet meer klopt, wordt gemeld; pas hem bewust aan.
//
//   npm run build:agent -- --settings local-data/runtime/local-build.json
//   npm run agent:testvragen
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { AgentIndex } from "../index-store.mjs";
import { workflowGuide } from "../guidance.mjs";
import { RELEASE, TESTVRAGEN } from "./testvragen.mjs";

/** Een kleine leeslaag over de agent-index, voor de controles. */
export function leesIndex(index) {
  const bronnen = index.sources();
  return {
    bronnen: (soort) => bronnen.filter((b) => !soort || b.kind === soort),
    aantal: (id) => bronnen.find((b) => b.id === id)?.selectableItems ?? 0,
    bronTitel: (id) => bronnen.find((b) => b.id === id)?.title ?? "",
    bouwsteen: (key) => index.get(key),
    bestaat: (key) => { try { index.get(key); return true; } catch { return false; } },
    gids: () => JSON.stringify(workflowGuide),
  };
}

export function controleer(lezer, vragen = TESTVRAGEN) {
  return vragen.map((v) => { let ok = false; try { ok = v.controle(lezer) === true; } catch { ok = false; } return { id: v.id, ok }; });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL("../../", import.meta.url));
  const pointer = JSON.parse(readFileSync(resolve(root, "agent-build/current.json"), "utf8"));
  const index = new AgentIndex(resolve(pointer.directory, "catalogue.sqlite"), pointer.release);
  try {
    if (pointer.release !== RELEASE) console.log(`Let op: de testvragen zijn opgesteld voor release ${RELEASE.slice(0, 8)}…; deze build is ${pointer.release.slice(0, 8)}….`);
    const uit = controleer(leesIndex(index));
    for (const r of uit) console.log(`${r.ok ? "✓" : "✗"} ${r.id}`);
    const fout = uit.filter((r) => !r.ok);
    console.log(fout.length ? `\n${fout.length} testvragen kloppen niet meer met deze database. Pas ze bewust aan.` : "\nAlle testvragen kloppen met deze database.");
    if (fout.length) process.exitCode = 1;
  } finally { index.close(); }
}
