// Bouwt de tekst van het issue "Overdracht": wat elke AI-assistent als volgende oppakt en wat
// op de beheerder wacht. Zuivere functies, zodat ze zonder GitHub te testen zijn.
// Werkwijze: docs/beheer/samenwerking-ai.md.

export const MARKERING = "<!-- overdracht -->";
export const ASSISTENTEN = ["Opus 5.5", "ChatGPT Astra"];
export const PRIORITEITEN = ["P1", "P2", "P3"];
export const STATUSSEN = ["klaar", "bezig", "wacht-op-ander", "wacht-op-beheerder"];
export const PER_ASSISTENT = 3;

const namen = (issue) => issue.labels.map((l) => (typeof l === "string" ? l : l.name));
export const prioriteit = (issue) => PRIORITEITEN.find((p) => namen(issue).includes(p)) ?? null;
export const status = (issue) => STATUSSEN.find((s) => namen(issue).includes(s)) ?? null;

/**
 * Welke statuslabels er weg moeten, zodat een issue er precies één houdt.
 * Is er net een status gezet (`nieuw`), dan blijft die. Anders wint de verste stap: bezig of wachten gaat boven klaar.
 */
export function overbodigeStatussen(issue, nieuw = null) {
  const huidig = STATUSSEN.filter((s) => namen(issue).includes(s));
  if (huidig.length < 2) return [];
  const blijft = nieuw && huidig.includes(nieuw) ? nieuw : huidig.find((s) => s !== "klaar");
  return huidig.filter((s) => s !== blijft);
}
// Een issue met het label `rood` (de tests op main falen) gaat altijd voor.
const rang = (issue) => { if (namen(issue).includes("rood")) return -1; const p = prioriteit(issue); return p ? PRIORITEITEN.indexOf(p) : PRIORITEITEN.length; };

/** Rood vóór P1 vóór P2 vóór P3 vóór geen prioriteit; daarbinnen het oudste issue eerst. */
export function sorteer(issues) {
  return [...issues].sort((a, b) => rang(a) - rang(b) || a.number - b.number);
}

// GitHub toont bij een #nummer in een lijst zelf de titel; zet die er niet nog eens achter.
const regel = (i) => `- ${namen(i).includes("rood") ? "❌ " : ""}${prioriteit(i) ? `**${prioriteit(i)}** · ` : ""}#${i.number}`;

/**
 * @param {{number:number,title:string,labels:(string|{name:string})[],pull_request?:object}[]} issues open issues
 * @param {{conclusie:string|null, commit:string|null, url:string|null}} tests de laatste run van "Alle tests" op main
 */
export function overdrachtTekst(issues, tests, { nu = new Date(), repoUrl = "https://github.com/Robert-Worm/omnibus" } = {}) {
  const open = issues.filter((i) => !i.pull_request && !namen(i).includes("epic") && !namen(i).includes("overdracht"));
  const van = (wie) => open.filter((i) => namen(i).includes(wie));
  const r = [MARKERING, ""];
  const groen = tests?.conclusie === "success";
  r.push(tests?.conclusie
    ? `**Tests op main:** ${groen ? "✅ groen" : "❌ rood — eerst herstellen, vóór nieuw werk"} (${tests.commit?.slice(0, 7) ?? "?"}${tests.url ? `, [run](${tests.url})` : ""})`
    : "**Tests op main:** nog geen run bekend", "");
  for (const wie of ASSISTENTEN) {
    const eigen = van(wie);
    // Alle P1-taken en rode tests, en verder aangevuld tot PER_ASSISTENT.
    const alle = sorteer(eigen.filter((i) => status(i) === "klaar"));
    const klaar = alle.filter((i, n) => n < PER_ASSISTENT || rang(i) <= 0);
    const bezig = sorteer(eigen.filter((i) => status(i) === "bezig"));
    r.push(`## ${wie}`, "", "**Pak als volgende op**", "", ...(klaar.length ? klaar.map(regel) : ["- Niets klaar om op te pakken."]), "");
    if (bezig.length) r.push("**Bezig**", "", ...bezig.map(regel), "");
  }
  const beheerder = sorteer(open.filter((i) => status(i) === "wacht-op-beheerder"));
  r.push("## Wacht op de beheerder", "", ...(beheerder.length ? beheerder.map(regel) : ["- Niets."]), "");
  const zonder = open.filter((i) => !prioriteit(i) || !status(i));
  if (zonder.length) r.push("## Nog in te delen", "", "Deze issues missen een prioriteit of een status:", "", ...sorteer(zonder).map((i) => `- #${i.number}`), "");
  r.push("---", `*Automatisch bijgewerkt op ${nu.toISOString().slice(0, 16).replace("T", " ")} UTC. Werkwijze: [samenwerking tussen de AI-assistenten](${repoUrl}/blob/main/docs/beheer/samenwerking-ai.md).*`);
  return r.join("\n");
}
