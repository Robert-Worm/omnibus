export const rubricVersion = "audit-fit-1";
export const defaultProfile = {
  perspective: "all",
  kind: "all",
  level: "all",
  strongOnly: false,
  sort: "relevance",
};
export const perspectives = [
  ["all", "Alle perspectieven"],
  ["adr", "ADR"],
  ["ar", "Algemene Rekenkamer"],
];
export const auditKinds = [
  ["all", "Alle onderzoekssoorten"],
  ["finance", "Financieel beheer"],
  ["it", "IT & privacy"],
  ["policy", "Beleid & uitvoering"],
];
export const auditLevels = [
  ["all", "Alle organisatieniveaus"],
  ["ministry", "Kerndepartement"],
  ["executor", "Uitvoeringsorganisatie"],
  ["oversight", "Toezicht op ontvangers"],
];
export const fitLabels = {
  strong: "Sterk passend",
  conditional: "Afhankelijk van opdracht",
  limited: "Beperkt passend",
  unknown: "Nog niet beoordeeld",
};
const fieldKeys = [
  "objective",
  "risk",
  "control",
  "criterion",
  "finding",
  "auditQuestion",
  "procedure",
  "owner",
];
export function reviewedSnapshot(line) {
  return JSON.stringify([line.title, line.entity, ...fieldKeys.map((k) => line[k])]);
}
export function normalizeProfile(raw = {}) {
  const pick = (key, options) => (options.some(([id]) => id === raw[key]) ? raw[key] : "all");
  return {
    perspective: pick("perspective", perspectives),
    kind: pick("kind", auditKinds),
    level: pick("level", auditLevels),
    strongOnly: raw.strongOnly === true,
    sort: raw.sort === "original" ? "original" : "relevance",
  };
}
export function profileActive(raw) {
  const p = normalizeProfile(raw);
  return p.perspective !== "all" || p.kind !== "all" || p.level !== "all";
}
// The only previous profile assessments belonged to the removed pilots.
// Current sources must not inherit their ratings based on a recycled line ID.
export function relevance(_line, _profile) {
  return {status:'unknown',label:fitLabels.unknown,
    reason:'Deze bronversie heeft nog geen relevante AI-beoordeling voor dit profiel. Niet beoordeeld betekent niet ongeschikt.',
    fields:[],rubricVersion};
}
export function rankForProfile(lines, raw) {
  const p = normalizeProfile(raw),
    active = profileActive(p),
    rank = { strong: 0, conditional: 1, limited: 2, unknown: 3 };
  if (!active) return { lines, hidden: 0, unknown: 0 };
  const entries = lines.map((line, index) => ({ line, index, assessment: relevance(line, p) }));
  const kept = entries.filter((e) => !p.strongOnly || e.assessment.status === "strong");
  if (p.sort === "relevance")
    kept.sort((a, b) => rank[a.assessment.status] - rank[b.assessment.status] || a.index - b.index);
  return {
    lines: kept.map((e) => e.line),
    hidden: entries.length - kept.length,
    unknown: entries.filter((e) => e.assessment.status === "unknown").length,
  };
}
