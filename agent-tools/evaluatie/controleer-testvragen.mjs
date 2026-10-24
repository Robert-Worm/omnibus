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
import {evaluationIdentity, assertEvaluationIdentity} from './basis.mjs';
import defaultBasis from './testbasis.mjs';

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

/** Separate prompt for an evaluator that has not seen the expected answers. */
export function vraagpakket(vragen = TESTVRAGEN) {
  return vragen.map(({id,vraag,hulpmiddelen})=>({id,vraag,hulpmiddelen:[...hulpmiddelen]}));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
 try {
  const root = fileURLToPath(new URL("../../", import.meta.url));
  const args = process.argv.slice(2), options = {};
  for (let i = 0; i < args.length; i++) {
    if(args[i]==='--vragen' && !options['--vragen']) {options['--vragen']=true;continue;}
    if (!['--pointer','--basis'].includes(args[i]) || !args[i+1] || args[i+1].startsWith('--') || Object.hasOwn(options,args[i]))
      throw Error('Gebruik: agent:testvragen [--pointer <bestaande-build.json>] [--basis <beoordeelde-basis.json>] [--vragen]');
    const flag=args[i];
    options[flag] = args[++i];
  }
  const pointer = JSON.parse(readFileSync(options['--pointer'] || resolve(root, "agent-build/current.json"), "utf8"));
  if (pointer.release !== RELEASE) {
    console.error(`HOLD: de testvragen zijn opgesteld voor release ${RELEASE}; deze build is ${pointer.release}. Beoordeel de bronwijziging voordat je deze vaste testset gebruikt.`);
    process.exitCode = 2;
  } else {
    const index = new AgentIndex(resolve(pointer.directory, "catalogue.sqlite"), pointer.release);
    try {
      index.db.exec('BEGIN');
      const expected = options['--basis'] ? JSON.parse(readFileSync(options['--basis'], 'utf8')) : defaultBasis;
      assertEvaluationIdentity(expected, evaluationIdentity(index, pointer,
        readFileSync(new URL('./testvragen.mjs', import.meta.url)), workflowGuide));
      if(options['--vragen']) console.log(JSON.stringify({release:pointer.release,publication:pointer.publication,
        questionsSha256:expected.questionsSha256,vragen:vraagpakket()},null,2));
      else {
      const uit = controleer(leesIndex(index));
      for (const r of uit) console.log(`${r.ok ? "✓" : "✗"} ${r.id}`);
      const fout = uit.filter((r) => !r.ok);
      console.log(fout.length ? `\n${fout.length} testvragen kloppen niet meer met deze database. Pas ze bewust aan.` : "\nAlle testvragen kloppen met deze database.");
      if (fout.length) process.exitCode = 1;
      }
    } finally { index.close(); }
  }
 } catch (error) {
   // No source bytes, database paths or SQL details in failed evaluation output.
   const held = error.message.startsWith('HOLD:');
   console.error(held ? error.message : 'HOLD: evaluatiebasis ontbreekt, is ongeldig of kon niet worden gecontroleerd.');
   process.exitCode = 2;
 }
}
