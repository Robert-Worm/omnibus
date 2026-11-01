// Eén plek voor de beheerscripts die Claude Code aanroepen (OWASP LLM03, LLM06 en LLM10, #277):
// - een vaste modelversie in plaats van een alias, zodat een uitkomst herhaalbaar is;
// - een logboek per aanroep (tijd, doel, model, tokens, kosten, duur), zonder prompt of antwoord;
// - een plafond per aanroep (--max-budget-usd) en een plafond per run, dat netjes stopt.
// Gebruikt door scripts/auditor/agent-auditor.mjs, .github/scripts/geschiktheid.mjs en scripts/injectieproef/proef.mjs.
import { spawn, spawnSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { tmpdir } from "node:os";

/** Vaste modelversies. Een volledige naam mag ook; een onbekende alias wordt geweigerd. */
export const MODELLEN = Object.freeze({ sonnet: "claude-sonnet-5-5", haiku: "claude-haiku-5-5", opus: "claude-opus-5-5" });
export function vastModel(naam = "sonnet") {
  if (MODELLEN[naam]) return MODELLEN[naam];
  if (/^claude-[a-z]+-\d+(-\d+)*$/.test(naam)) return naam;
  throw new Error(`Onbekend model: ${naam}. Kies ${Object.keys(MODELLEN).join(", ")} of een volledige modelnaam.`);
}

/** Bewaakt het verbruik van één run. Bij overschrijding stopt de volgende aanroep met een duidelijke melding. */
export class Verbruik {
  constructor({ budgetUsd = Infinity, logboek = null, doel = "" } = {}) {
    Object.assign(this, { budgetUsd, logboek, doel, kostenUsd: 0, aanroepen: 0, tokens: { invoer: 0, uitvoer: 0 } });
  }
  controleer() {
    if (this.kostenUsd >= this.budgetUsd) throw new BudgetOp(`Budget van $${this.budgetUsd} voor deze run is op ($${this.kostenUsd.toFixed(2)} na ${this.aanroepen} aanroepen).`);
  }
  /** Verwerkt de JSON-uitvoer van één aanroep en schrijft één regel in het logboek. */
  boek(uit, { model, duurMs, gelukt, onderdeel = "" }) {
    const gebruik = Object.entries(uit?.modelUsage ?? {}).map(([m, u]) => ({ model: m, invoer: (u.inputTokens ?? 0) + (u.cacheReadInputTokens ?? 0) + (u.cacheCreationInputTokens ?? 0), uitvoer: u.outputTokens ?? 0 }));
    const kosten = Number(uit?.total_cost_usd ?? 0);
    this.aanroepen++; this.kostenUsd += kosten;
    for (const g of gebruik) { this.tokens.invoer += g.invoer; this.tokens.uitvoer += g.uitvoer; }
    const regel = { tijd: new Date().toISOString(), doel: this.doel, onderdeel, model, gebruik, kostenUsd: Number(kosten.toFixed(4)), duurMs, gelukt };
    if (this.logboek) appendFileSync(this.logboek, JSON.stringify(regel) + "\n");
    return regel;
  }
  samenvatting() {
    return `${this.aanroepen} aanroepen, ${this.tokens.invoer.toLocaleString("nl-NL")} tokens in, ${this.tokens.uitvoer.toLocaleString("nl-NL")} tokens uit, $${this.kostenUsd.toFixed(2)}.`;
  }
}
export class BudgetOp extends Error {}

/** De argumenten voor `claude -p`: geen gereedschap, geen sessie, vaste versie, plafond per aanroep. */
export function argumenten({ model, systeem, maxPerAanroepUsd = 2, tools = "" }) {
  return ["-p", "--tools", tools, "--no-session-persistence", "--output-format", "json", "--model", vastModel(model),
    "--max-budget-usd", String(maxPerAanroepUsd), ...(systeem ? ["--system-prompt", systeem] : [])];
}

function lees(stdout, stderr) {
  const uit = JSON.parse(stdout || "{}");
  if (uit.is_error || !uit.result) throw Object.assign(new Error(`Claude Code gaf geen antwoord: ${String(uit.result ?? stderr).slice(0, 200)}`), { uit });
  return uit;
}

/** Synchroon: geeft de tekst van het antwoord. */
export function vraagClaudeSync({ invoer, verbruik = new Verbruik(), onderdeel = "", timeoutMs = 15 * 60 * 1000, ...opties }) {
  verbruik.controleer();
  const start = Date.now(), model = vastModel(opties.model);
  const r = spawnSync("claude", argumenten(opties), { input: invoer, cwd: tmpdir(), encoding: "utf8", maxBuffer: 64 * 1024 * 1024, timeout: timeoutMs });
  if (r.error) throw new Error(`Claude Code niet gevonden of mislukt: ${r.error.message}`);
  try {
    const uit = lees(r.stdout, r.stderr);
    verbruik.boek(uit, { model, duurMs: Date.now() - start, gelukt: true, onderdeel });
    return uit.result;
  } catch (e) { verbruik.boek(e.uit, { model, duurMs: Date.now() - start, gelukt: false, onderdeel }); throw e; }
}

/** Asynchroon, voor scripts die groepen tegelijk laten beoordelen. */
export function vraagClaude({ invoer, verbruik = new Verbruik(), onderdeel = "", timeoutMs = 10 * 60 * 1000, ...opties }) {
  return new Promise((klaar, fout) => {
    try { verbruik.controleer(); } catch (e) { return fout(e); }
    const start = Date.now(), model = vastModel(opties.model);
    const p = spawn("claude", argumenten(opties), { cwd: tmpdir() });
    const klok = setTimeout(() => p.kill(), timeoutMs);
    let stdout = "", stderr = "";
    p.stdout.on("data", (d) => (stdout += d)); p.stderr.on("data", (d) => (stderr += d));
    p.on("error", (e) => { clearTimeout(klok); fout(e); });
    p.on("close", () => {
      clearTimeout(klok);
      try {
        const uit = lees(stdout, stderr);
        verbruik.boek(uit, { model, duurMs: Date.now() - start, gelukt: true, onderdeel });
        klaar(uit.result);
      } catch (e) { verbruik.boek(e.uit, { model, duurMs: Date.now() - start, gelukt: false, onderdeel }); fout(e); }
    });
    p.stdin.end(invoer);
  });
}
