// Navigation metadata only. These labels do not change evidence or draft identity.
export const taxonomyVersion = "subjects-1";
export const subjects = [
  ["application", "Aanvraag & toegankelijkheid"],
  ["decision", "Dossier & besluitvorming"],
  ["accountability", "Financiële beheersing & verantwoording"],
  ["followup", "Toezicht & opvolging"],
  ["evaluation", "Monitoring & evaluatie"],
  ["applications", "Applicatiebeheer"],
  ["privacy", "Privacy"],
  ["access", "Toegang & logging"],
  ["safe-information", "Veilig omgaan met informatie"],
  ["unclassified", "Nog niet ingedeeld"],
].map(([id, title]) => ({ id, title }));
const assignments = {
  K01: ["followup"],
  K02: ["decision"],
  K03: ["decision", "followup"],
  K04: ["accountability"],
  K05: ["accountability"],
  K06: ["accountability", "decision"],
  K07: ["accountability"],
  K08: ["followup", "evaluation"],
  "D06-K01": ["decision"],
  "D06-K02": ["decision"],
  "D06-K03": ["decision"],
  "D07-K01": ["accountability", "followup"],
  "D07-K02": ["accountability"],
  "D07-K03": ["accountability"],
  "D04-K01": ["application", "evaluation"],
  "D04-K02": ["application", "decision"],
  "D04-K03": ["evaluation"],
  "D08-K01": ["applications"],
  "D08-K02": ["privacy"],
  "D08-K03": ["access"],
};
export function normId(id) {
  return /^K\d+$/.test(id) ? "H01-" + id : id;
}
export function subjectIds(line) {
  return line.navigationSubjects ?? assignments[line.id] ?? ["unclassified"];
}
export function classification(line) {
  return {
    taxonomyVersion,
    status: "AI_NAVIGATION_PROPOSAL",
    subjectIds: subjectIds(line),
    rationale:
      "Ingedeeld op basis van titel en auditvraag: " + line.title + " — " + line.auditQuestion.text,
    evidence_ids: [...new Set(line.auditQuestion.evidence_ids)],
    notAuditValidation: true,
  };
}
export function filterSubjects(lines, ids) {
  return ids.length ? lines.filter((l) => subjectIds(l).some((id) => ids.includes(id))) : lines;
}
export function subjectOptions(lines) {
  return subjects
    .map((s) => ({ ...s, count: lines.filter((l) => subjectIds(l).includes(s.id)).length }))
    .filter((s) => s.count > 0);
}
export function catalogueSlice(items, query, page = 0, text = (x) => x.title) {
  const terms = query.toLocaleLowerCase("nl").trim().split(/\s+/).filter(Boolean);
  const matches = items
    .filter((x) => terms.every((t) => text(x).toLocaleLowerCase("nl").includes(t)))
    .sort((a, b) => a.title.localeCompare(b.title, "nl"));
  const pages = Math.max(1, Math.ceil(matches.length / 25)),
    current = Math.min(Math.max(0, page), pages - 1);
  return { matches, rows: matches.slice(current * 25, (current + 1) * 25), page: current, pages };
}
