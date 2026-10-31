// Gezondheidscontrole van de online versie (#281). Vraagt /api/v1/health en
// /api/v1/version op, met een paar pogingen zodat één hapering geen melding geeft.
// Faalt het, dan houdt het één issue met label 'storing' bij; GitHub mailt de
// beheerder. Werkt alles weer, dan sluit dat issue vanzelf.
//
//   node .github/scripts/gezondheid.mjs [--url https://omnibus.rijksmap.nl] [--issue]

export const LABEL = "storing";
export const STANDAARD_URL = "https://omnibus.rijksmap.nl";

/** Controleert één keer: gezondheid en versie. Geeft { ok, reden, versie }. */
export async function controleerEenKeer(basis, haal = fetch, timeoutMs = 20000) {
  try {
    const health = await haal(`${basis}/api/v1/health`, { signal: AbortSignal.timeout(timeoutMs), redirect: "manual" });
    if (health.status !== 200) return { ok: false, reden: `health gaf HTTP ${health.status}` };
    await health.text();
    const v = await haal(`${basis}/api/v1/version`, { signal: AbortSignal.timeout(timeoutMs), redirect: "manual" });
    if (v.status !== 200) return { ok: false, reden: `version gaf HTTP ${v.status}` };
    const versie = await v.json();
    if (!versie?.data?.release || !versie?.data?.publication) return { ok: false, reden: "version mist release of publicatie" };
    return { ok: true, versie };
  } catch (fout) {
    return { ok: false, reden: fout?.name === "TimeoutError" ? "geen antwoord binnen de tijd" : "niet bereikbaar" };
  }
}

/** Probeert een paar keer met een pauze; pas als alle pogingen falen, is het een storing. */
export async function controleer(basis, { pogingen = 3, pauzeMs = 20000, haal = fetch, wacht = (ms) => new Promise((r) => setTimeout(r, ms)) } = {}) {
  let laatste;
  for (let i = 0; i < pogingen; i++) {
    laatste = await controleerEenKeer(basis, haal);
    if (laatste.ok) return laatste;
    if (i < pogingen - 1) await wacht(pauzeMs);
  }
  return laatste;
}

/** De tekst van het storingsissue. Bevat geen adressen of verzoekinhoud. */
export function issueTekst(basis, reden, tijd) {
  return [
    `De online versie (${basis}) lijkt niet gezond: **${reden}**.`,
    "",
    `Laatst gecontroleerd: ${tijd} (UTC). De controle draait elk kwartier en probeert drie keer voordat hij meldt.`,
    "",
    "Wat je kunt doen: kijk bij Sliplane naar *Events* en *Logs* van de service, en zie [storingen en herstel](https://github.com/Robert-Worm/omnibus/blob/main/docs/beheer/storingen-en-herstel.md).",
    "",
    "Dit issue sluit vanzelf zodra de online versie weer gezond is.",
  ].join("\n");
}

async function werkIssueBij(basis, uitkomst) {
  const repo = process.env.GITHUB_REPOSITORY, token = process.env.GITHUB_TOKEN;
  if (!repo || !token) throw new Error("GITHUB_REPOSITORY en GITHUB_TOKEN zijn nodig voor --issue.");
  const gh = async (pad, opties = {}) => {
    const res = await fetch(`https://api.github.com/repos/${repo}${pad}`, { ...opties,
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" } });
    if (!res.ok) throw new Error(`GitHub ${opties.method || "GET"} ${pad}: ${res.status}`);
    return res.status === 204 ? null : res.json();
  };
  const open = (await gh(`/issues?labels=${LABEL}&state=open&per_page=10`)).filter((i) => !i.pull_request);
  const bestaand = open[0];
  if (uitkomst.ok) {
    if (bestaand) {
      await gh(`/issues/${bestaand.number}/comments`, { method: "POST", body: JSON.stringify({ body: "De online versie is weer gezond. Dit issue sluit vanzelf." }) });
      await gh(`/issues/${bestaand.number}`, { method: "PATCH", body: JSON.stringify({ state: "closed", state_reason: "completed" }) });
    }
    return;
  }
  const tijd = new Date().toISOString().slice(0, 16).replace("T", " ");
  const body = issueTekst(basis, uitkomst.reden, tijd);
  if (bestaand) await gh(`/issues/${bestaand.number}`, { method: "PATCH", body: JSON.stringify({ body }) });
  else {
    try { await gh("/labels", { method: "POST", body: JSON.stringify({ name: LABEL, color: "b60205", description: "De online versie is niet gezond; sluit vanzelf bij herstel" }) }); } catch { /* label bestaat al */ }
    await gh("/issues", { method: "POST", body: JSON.stringify({ title: "Storing: de online versie is niet gezond", body, labels: [LABEL] }) });
  }
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const i = process.argv.indexOf("--url");
  const basis = (i > 0 ? process.argv[i + 1] : STANDAARD_URL).replace(/\/$/, "");
  const uitkomst = await controleer(basis);
  console.log(uitkomst.ok ? `Gezond: release ${uitkomst.versie.data.release.slice(0, 8)}` : `Niet gezond: ${uitkomst.reden}`);
  // Met --issue is het issue het signaal; een mislukte run zou elk kwartier extra mail geven.
  if (process.argv.includes("--issue")) await werkIssueBij(basis, uitkomst);
  else if (!uitkomst.ok) process.exitCode = 1;
}
