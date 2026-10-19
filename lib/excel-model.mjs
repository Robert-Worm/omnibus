import { testingSuggestions } from "./excel-testing.mjs";
import {reportQualityPhaseText} from './report-quality-revisions.mjs';
import { validateDraft, draftValue, isEdited } from "./framework-model.mjs";
import { sourceFields } from "./framework-source-items.mjs";
import { fieldIncluded, researchOf, questionNumbers } from "./research-plan.mjs";
import { themeCatalogue } from "./theme-workspaces.mjs";
import { normId, subjectIds, subjects } from "./norm-navigation.mjs";
import { reportForLine, reportForEvidence } from "./corpus-model.mjs";
import {reportExportContext} from './report-export-context.mjs';
import { materialInterview } from "./investigation.mjs";
import { importedFoundationItems, importedFoundationMetadata } from "./foundations/registry.mjs";
import { applicabilityGroups, applicabilityLabels } from "./applicability.mjs";
import { validateTestingAspects, validateTestingTerminology, testingAspectLabel, aspectTestPlan } from "./testing-aspects.mjs";
import { refineWorkbook } from "./excel-workbook-design.mjs";
import { exportPalettes, exportTypography, paletteTextColor, exportPhasePalette } from './export-design.mjs';
import {reviewedReportIds} from './reviewed-reports.mjs';
import {cioPointExportLocation} from './cio-export-location.mjs';
export const excelMime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
export const columnName = (n) => {
  let s = "";
  for (n++; n; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
};
export const exportFields = [
  { id: "criterion", label: "Norm / criterium", width: 48, group: "Normenkader", default: true },
  { id: "source", label: "Bron", width: 30, group: "Normenkader", default: true },
  { id: "location", label: "Artikel / pagina", width: 21, group: "Normenkader", default: true },
  { id: "category", label: "Categorie", width: 26, group: "Normenkader", default: true },
  { id: "objective", label: "Doel", width: 32, group: "Normenkader", default: false },
  { id: "risk", label: "Risico", width: 32, group: "Normenkader", default: false },
  { id: "controlObjective", label: "Beheersdoelstelling", width: 38, group: "Normenkader", default: false },
  {
    id: "inScope",
    label: "Relevant voor dit onderzoek?",
    width: 17,
    group: "Scope",
    default: true,
  },
  { id: "relevance", label: "Toelichting relevantie", width: 38, group: "Scope", default: true },
  { id: "testingAspects", label: "Toetsaspect", width: 25, group: "Scope", default: false },
  { id: "control", label: "Beheersmaatregel(en)", width: 38, group: "Toetsing", default: false },
  { id: "owner", label: "Verantwoordelijkheid", width: 28, group: "Toetsing", default: false },
  { id: "auditQuestion", label: "Toetsvraag", width: 40, group: "Toetsing", default: true },
  { id: "procedure", label: "Toetswijze", width: 40, group: "Toetsing", default: true },
  {
    id: "documentation",
    label: "Verwacht bewijs / documenten",
    width: 38,
    group: "Toetsing",
    default: false,
  },
  { id: "interview", label: "Interviewvragen", width: 38, group: "Toetsing", default: false },
  {
    id: "observation",
    label: "Bevinding / observatie",
    width: 40,
    group: "Bevindingen",
    default: true,
  },
  {
    id: "evidenceLocation",
    label: "Vindplaats auditbewijs",
    width: 28,
    group: "Bevindingen",
    default: true,
  },
  { id: "verdict", label: "Oordeel", width: 20, group: "Bevindingen", default: true },
  { id: "tester", label: "Getoetst door", width: 25, group: "Administratie", default: true },
  { id: "testedOn", label: "Datum", width: 16, group: "Administratie", default: true },
  { id: "status", label: "Status", width: 22, group: "Administratie", default: true },
  { id: "comments", label: "Opmerkingen", width: 34, group: "Administratie", default: true },
];
// Append-only registry: IDs never depend on sort order, the current selection or question links.
const registeredPoints = [
  "K01",
  "K02",
  "K03",
  "K04",
  "K05",
  "K06",
  "K07",
  "K08",
  "D06-K01",
  "D06-K02",
  "D06-K03",
  "D07-K01",
  "D07-K02",
  "D07-K03",
  "D04-K01",
  "D04-K02",
  "D04-K03",
  "D08-K01",
  "D08-K02",
  "D08-K03",
];
export function testPointId(id) {
  const n = registeredPoints.indexOf(id);
  return n < 0 ? "TP-" + normId(id) : "TP" + String(n + 1).padStart(3, "0");
}
export const exportStyles = [
  { fill: "FFFFFF", color: "24364B" },
  { fill: "234F7C", color: "FFFFFF", bold: true },
  { fill: "FFFFFF", color: "193E65", bold: true, size: 16 },
  { fill: "FFFFFF", color: "596E83" },
  { fill: "EEF3F8", color: "24364B" },
  { fill: "FFF8E7", color: "24364B" },
  { fill: "FFFFFF", color: "24364B", date: true },
  ...[
    ["234F7C", "DCE8F2"],
    ["287050", "E2EFE8"],
    ["946700", "F7EAC9"],
    ["586571", "E9EDF0"],
    ["695478", "EDE7F2"],
  ].flatMap(([dark, light]) => [
    { fill: dark, color: "FFFFFF", bold: true },
    { fill: light, color: "24364B", bold: true },
  ]),
  { fill: "EAF0F6", color: "24364B" },
  { fill: "FFFFFF", color: "234F7C", bold: true },
  { fill: "EDF3F9", color: "234F7C" },
  // Explicit body format: Excel treats cellXf 0 as Normal during table refresh.
  { fill: "FFFFFF", color: "24364B" },
  { fill: "FFF8E7", color: "24364B", text: true },
  { fill: "FFFFFF", color: "24364B", bold:true, text: true },
];
export const exportAccents = Object.fromEntries(Object.entries(exportPalettes).map(([id,p])=>[id,p.dark]));
/** @returns {Record<string,string>} */
export function requiredExportFields(lines, options = {}) {
  const required={};
  if(options.requiredField)required[options.requiredField]="Basis van deze werkvorm";
  if(lines.some(l=>l.sourceControlId))required.source="Bronvermelding van gekozen criteria";
  if(lines.some(l=>reviewedReportIds.includes(l.report_id))){
    required.source="Bron en onderzoeksbeperkingen van gekozen praktijksignalen";
    required.location="Paginaverwijzingen bij gekozen praktijksignalen";
  }
  if(options.notes)required.comments="Bestaande auditnotities zijn ingeschakeld";
  if(options.researchInterview?.triangulation && lines.some(l=>l.materialKind==="model-question"))required.documentation="Bewijssuggesties voor triangulatie";
  return required;
}
export function workbookStyles(meta = {}) {
  const palette=Object.hasOwn(exportPalettes,meta.accent) ? exportPalettes[meta.accent] : exportPalettes.blue;
  const {dark,light,stripe,panel}=palette;
  const ink=palette.ink || dark;
  const {fontFamily,fontSize}=exportTypography(meta);
  const phases=exportPhasePalette(meta.accent);
  return exportStyles.map((s, i) => ({
    ...s,
    fontFamily, size:i===2 ? fontSize+5 : fontSize,
    ...(s.fill === "234F7C" ? { fill: dark, color:paletteTextColor(dark) } : {}),
    ...(i === 2 ? { color: ink } : {}),
    ...(i === 4 ? { fill: light } : {}),
    ...(i === 17 ? {fill:stripe} : {}),
    ...(i === 18 ? {color:ink} : {}),
    ...(i === 19 ? {fill:panel,color:ink} : {}),
    ...(meta.colorMode === "uniform" && i >= 7 && i <= 16 ? { fill: i % 2 ? dark : light, color:i%2 ? paletteTextColor(dark) : '24364B' } : {}),
    ...(meta.colorMode === "sections" && i >= 7 && i <= 16 ? (() => {
      const phase = phases[Math.floor((i-7)/2)];
      const fill = i % 2 ? phase.dark : phase.light;
      return {fill, color: paletteTextColor(fill)};
    })() : {}),
  }));
}
// Exact continuation chunks: Excel cannot display more than 409 points in one row.
export function textChunks(value, width) {
  if (typeof value !== "string") return [value];
  const chunks = [];
  let start = 0,
    lines = 1,
    col = 0;
  for (let i = 0; i < value.length; i++) {
    if (value[i] === "\n") {
      lines++;
      col = 0;
    } else if (++col > Math.max(8, Math.floor(width - 4))) {
      lines++;
      col = 1;
    }
    if (lines > 18) {
      let cut = i;
      while (cut > Math.max(start + 1, i - 100) && !/\s/.test(value[cut - 1])) cut--;
      if (cut <= Math.max(start + 1, i - 100)) cut = i;
      chunks.push(value.slice(start, cut));
      start = cut;
      i = cut - 1;
      lines = 1;
      col = 0;
    }
  }
  chunks.push(value.slice(start));
  return chunks;
}
export function exportThemes(framework, draft) {
  return themeCatalogue(framework).filter((t) =>
    t.lineIds.some((id) => draft.included.includes(id)),
  );
}
/** Read-only projection. Export choices never change the saved research framework. */
export function auditWorkbookModel(framework, value, options = {}) {
  if (!["kaptein", "own"].includes(options.basis)) assertScopeExport(framework, value);
  const draft = validateDraft(value, framework),
    research = researchOf(draft),
    numbers = questionNumbers(draft);
  const meta = {
    version: "0.1",
    author: "",
    team: "",
    scope: "",
    change: "Eerste opzet",
    exportedAt: new Date().toISOString(),
    questions: true,
    notes: false,
    accent: "blue",
    ...options,
  };
  const themes = exportThemes(framework, draft);
  const testingTerminology = validateTestingTerminology(options.testingTerminology);
  meta.testingTerminology = testingTerminology;
  const activeThemes =
    options.themeIds === undefined ? themes : themes.filter((t) => options.themeIds.includes(t.id));
  const allowed = new Set(activeThemes.flatMap((t) => t.lineIds));
  const selected = framework.lines.filter(
    (l) =>
      draft.included.includes(l.id) &&
      (l.source_id || allowed.has(l.id)) &&
      !(options.excludedNorms ?? []).includes(l.id),
  );
  const ids = new Set(selected.map((l) => l.id)),
    links = research.links.filter((l) => ids.has(l.line_id));
  const ordered = research.questions
    .filter((q) => q.parent_id === null)
    .flatMap((q) => [q, ...research.questions.filter((s) => s.parent_id === q.id)]);
  const chosen = new Set(options.fields ?? exportFields.filter((f) => f.default).map((f) => f.id));
  if(options.profile==='interview' && selected.length && selected.every(l=>l.materialKind==='model-question')) {
    // The interview cell already contains the exact chosen question and probes.
    chosen.delete('auditQuestion');chosen.delete('procedure');
  }
  for(const id of Object.keys(requiredExportFields(selected,options)))chosen.add(id);
  const aspects =
    options.profile === "testing" && options.testingAspects !== undefined && selected.some(l => l.materialKind !== "model-question")
      ? validateTestingAspects(options.testingAspects, true)
      : [];
  if (aspects.length) {
    // Execution belongs in its own compact register, not repeated criterion rows.
    for (const id of ["testingAspects", "procedure", ...(selected.some(l => l.materialKind === "model-question") ? [] : ["documentation"]), "observation", "evidenceLocation", "verdict", "tester", "testedOn", "status"])
      chosen.delete(id);
  } else chosen.delete("testingAspects");
  chosen.add(options.requiredField ?? "criterion");
  if (meta.notes) chosen.add("comments");
  const orderedFields = [
    ...new Set([...(options.fieldOrder ?? exportFields.map((f) => f.id)), ...chosen]),
  ].filter((id) => id !== "testingAspects");
  const fields = orderedFields
    .map((id) => exportFields.find((f) => f.id === id))
    .filter((f) => f && chosen.has(f.id));
  // Keep a useful writing area even when only the criterion is selected.
  const widths = [11, 30, ...fields.map((f) => f.width)];
  const themeText = (lines) =>
    activeThemes
      .filter((t) => lines.some((l) => t.lineIds.includes(l.id)))
      .map((t) => t.title)
      .join(", ");
  const sheets = [];
  const add = (name, widths) => {
    const s = {
      name,
      widths,
      rows: [],
      merges: [],
      rowStyles: {},
      heights: {},
      rowKinds: {},
      freeze: 0,
      cellStyles: {},
      validations: [],
    };
    sheets.push(s);
    return s;
  };
  const putOne = (s, values, kind = "body", mergeFrom = null) => {
    const r = s.rows.length + 1;
    s.rows.push(Array.from({ length: s.widths.length }, (_, i) => values[i] ?? ""));
    s.rowKinds[r] = kind;
    s.rowStyles[r] =
      {
        title: 2,
        central: 1,
        sub: 4,
        header: 1,
        context: 3,
        input: 5,
        relevance: 5,
        blank: 0,
        body: 0,
        note: 3,
      }[kind] ?? 0;
    if (mergeFrom !== null && mergeFrom < s.widths.length - 1)
      s.merges.push(columnName(mergeFrom) + r + ":" + columnName(s.widths.length - 1) + r);
    const ws =
      mergeFrom === null
        ? s.widths
        : s.widths.map((w, i) =>
            i === mergeFrom ? s.widths.slice(i).reduce((a, b) => a + b, 0) : w,
          );
    const lines = Math.max(
      1,
      ...values.map((v, i) =>
        typeof v === "string"
          ? v
              .split("\n")
              .reduce(
                (sum, t) => sum + Math.max(1, Math.ceil(t.length / Math.max(8, ws[i] - 4))),
                0,
              )
          : 1,
      ),
    );
    s.heights[r] =
      kind === "blank" ? 12 : Math.min(409, Math.max(kind === "title" ? 30 : 28, lines * 15 + 12));
    return r;
  };
  const put = (s, values, kind = "body", mergeFrom = null) => {
    const chunks = values.map((v, i) =>
      textChunks(v, mergeFrom === i ? s.widths.slice(i).reduce((a, b) => a + b, 0) : s.widths[i]),
    );
    const first = s.rows.length + 1;
    for (let i = 0; i < Math.max(1, ...chunks.map((c) => c.length)); i++)
      putOne(
        s,
        chunks.map((c) => c[i] ?? ""),
        kind,
        mergeFrom,
      );
    return first;
  };
  const start = (s) => {
    put(s, [], "blank");
    put(s, [s.name], "title", 0);
    const context =
      meta.scope.trim() ||
      themeText(selected) ||
      [
        ...new Set(
          selected.filter((l) => l.source_id).map((l) => reportForLine(framework, l).title),
        ),
      ].join("; ") ||
      draft.title;
    put(s, ["Onderwerp / proces: " + context], "sub", 0);
    put(s, [draft.title === context ? "" : draft.title], "context", 0);
  };
  const log = add("01 Versiebeheer", [12, 16, 26, 64, 4, 30]);
  start(log);
  put(log, ["Versie", "Datum", "Naam", "Wat en waar gewijzigd", "", "Teamleden"], "header");
  const members = [
    ...new Set(
      [meta.author, ...String(meta.team).split(/\r?\n/)].map((v) => v.trim()).filter(Boolean),
    ),
  ];
  if (members.length > 5) throw new Error("Vul maximaal vijf teamleden in, inclusief de auteur.");
  if (members.some((name) => name.length > 100))
    throw new Error("Een teamnaam mag maximaal 100 tekens bevatten.");
  for (let i = 0; i < 10; i++) {
    const r = put(
      log,
      [
        i === 0 ? meta.version : "",
        i === 0 ? new Date(meta.exportedAt) : "",
        i === 0 ? meta.author : "",
        i === 0 ? meta.change : "",
        "",
        members[i] || "",
      ],
      i % 2 ? "body" : "sub",
    );
    log.cellStyles[r] = { 4: 0, 5: i < 5 ? 5 : 3 };
    log.heights[r] = Math.max(30, log.heights[r]);
  }
  put(
    log,
    ["Registreer gedeelde versies handmatig. Vul rechts de namen voor de keuzelijst in."],
    "context",
    0,
  );
  log.cellStyles[5] = { 4: 3 };
  log.filter = "A5:D15";
  log.freeze = 5;
  log.dates = [1];
  log.validations = [{ range: "C6:C505", formula: "Teamleden" }];
  const questionLabel = (q) => numbers[q.id] + "  " + (q.text || "Vraag nog te formuleren");
  const linkedPoints = (q) =>
    links.filter((l) => l.question_id === q.id).map((l) => testPointId(l.line_id));
  if (meta.questions) {
    const qsheet = add("02 Onderzoeksvragen", [52, 66, 28]);
    start(qsheet);
    put(qsheet, ["Centrale vraag", "Deelvraag", "Toetspunten"], "header");
    qsheet.freeze = 5;
    qsheet.questionEntries = [];
    for (const parent of ordered.filter((q) => !q.parent_id)) {
      const children = ordered.filter((q) => q.parent_id === parent.id);
      const rows = [
        ...(linkedPoints(parent).length || !children.length ? [parent] : []),
        ...children,
      ];
      const first = qsheet.rows.length + 1;
      for (const q of rows) {
        const pointIds = linkedPoints(q);
        const r = put(qsheet, [
          "",
          q.parent_id ? questionLabel(q) : "Rechtstreeks gekoppeld",
          pointIds.join("\n") || "Nog geen toetspunten gekoppeld",
        ]);
        qsheet.questionEntries.push({ row: r, questionId: q.id, pointIds });
      }
      const text = questionLabel(parent);
      const needed = Math.ceil(text.length / 46) * 15 + 18;
      // Merged central questions can span continuation rows, never an invalid >409pt row.
      while ((qsheet.rows.length - first + 1) * 409 < needed) put(qsheet, ["", "", ""]);
      const last = qsheet.rows.length;
      qsheet.rows[first - 1][0] = text;
      if (last > first) qsheet.merges.push("A" + first + ":A" + last);
      const current = Object.entries(qsheet.heights)
          .filter(([r]) => Number(r) >= first && Number(r) <= last)
          .reduce((sum, [, h]) => sum + h, 0);
      if (needed > current) {
        let remaining = needed - current;
        for (let r = first; r <= last; r++) {
          const extra = Math.min(409 - qsheet.heights[r], remaining);
          qsheet.heights[r] += extra;
          remaining -= extra;
        }
      }
      for (let r = first; r <= last; r++) qsheet.cellStyles[r] = { 0: 4 };
    }
    const unassigned = selected.filter((l) => !links.some((k) => k.line_id === l.id));
    if (unassigned.length)
      put(
        qsheet,
        ["Nog te koppelen", "", unassigned.map((l) => testPointId(l.id)).join("\n")],
        "input",
      );
    if (!ordered.length && !unassigned.length)
      put(qsheet, ["Centrale vraag nog te formuleren", "", ""]);
    qsheet.heights[4] = 30;
  }
  const s = add((meta.questions ? "03 " : "02 ") + (options.registerTitle ?? "Toetskader"), widths);
  start(s);
  const headingEnd = columnName(Math.min(7, widths.length - 1));
  s.merges = s.merges.map((m) =>
    m === "A2:" + columnName(widths.length - 1) + "2"
      ? "A2:" + headingEnd + "2"
      : m === "A3:" + columnName(widths.length - 1) + "3"
        ? "A3:" + headingEnd + "3"
        : m,
  );
  if (meta.focus) {
    for (const sheet of sheets) sheet.rows[2][0] += " · Onderzoeksobject: " + meta.focus;
  }
  for (const sheet of sheets) {
    const span = sheet === s ? sheet.widths.slice(0, 8) : sheet.widths;
    const chars = Math.max(8, span.reduce((a, b) => a + b, 0) - 4);
    sheet.heights[3] = Math.min(
      409,
      Math.max(sheet.heights[3], Math.ceil(sheet.rows[2][0].length / chars) * 15 + 12),
    );
  }
  s.columnIds = ["pointId", "title", ...fields.map((f) => f.id)];
  // Header groups are the only horizontal merges in the working register.
  s.merges = s.merges.filter((m) => m !== "A4:" + columnName(widths.length - 1) + "4");
  s.rows[3] = Array(widths.length).fill("");
  const hasModelQuestions = selected.some((l) => l.materialKind === "model-question");
  const hasAuditCoverage = selected.some((l) => l.materialKind === "audit-coverage");
  s.rows[4] = [
    "ID",
    hasModelQuestions ? "Bouwsteen" : "Toetspunt",
    ...fields.map((f) =>
      f.id === "criterion" && hasAuditCoverage ? "Criterium / auditdekkingspunt" :
      hasModelQuestions && f.id === "criterion" ? "Criterium / onderzoeksfocus" : f.label,
    ),
  ];
  s.heights[4] = 26;
  s.heights[5] = 44;
  s.rowStyles[4] = 1;
  s.rowStyles[5] = 4;
  s.freeze = 5;
  s.freezeColumns = 2;
  const groups = ["Normenkader", "Normenkader", ...fields.map((f) => f.group)];
  const groupNames = ["Normenkader", "Scope", "Toetsing", "Bevindingen", "Administratie"];
  s.cellStyles[4] = {};
  s.cellStyles[5] = {};
  for (let i = 0; i < groups.length;) {
    let j = i;
    while (j + 1 < groups.length && groups[j + 1] === groups[i]) j++;
    s.rows[3][i] = groups[i];
    if (j > i) s.merges.push(columnName(i) + "4:" + columnName(j) + "4");
    for (let c = i; c <= j; c++) {
      s.cellStyles[4][c] = 7 + groupNames.indexOf(groups[i]) * 2;
      s.cellStyles[5][c] = 8 + groupNames.indexOf(groups[i]) * 2;
    }
    i = j + 1;
  }
  const branchText = (line, node) => {
    const parent = (draft.branchItems[line.id] ?? []).find(f => f.id === node.parent_id);
    const parentText = parent?.text ?? draftValue(line, node.parent_id, draft);
    return "Eigen aanvulling: " + node.text + "\nBij " + node.parent_id + ": " + (parentText || "Bovenliggend onderdeel nog te formuleren");
  };
  const fieldText = (l, kind) => {
    const items = sourceFields(l, kind)
      .filter((f) => fieldIncluded(draft, l.id, f.id))
      .filter((f) => draftValue(l, f.id, draft).trim())
      .map((f) => {
        const prefix = isEdited(l, f.id, draft)
          ? "Eigen formulering: "
          : ({
              PROPOSED: "Voorstel: ",
              INFERRED: "Afgeleid: ",
              NOT_ESTABLISHED: "Niet vastgesteld: ",
            }[f.basis] ?? "");
        const value = draftValue(l, f.id, draft);
        return prefix && value.trimStart().toLocaleLowerCase("nl").startsWith(prefix.trim().toLocaleLowerCase("nl"))
          ? value : prefix + value;
      });
    items.push(
      ...(draft.branchItems[l.id] ?? [])
        .filter((f) => f.kind === kind)
        .map((f) => branchText(l, f)),
    );
    return items.map((v, i) => (items.length > 1 ? i + 1 + ". " + v : v)).join("\n\n");
  };

  const entries = [];
  const methodNotes = [...new Set((draft.investigation?.materials || [])
    .filter((m) => ids.has(m.id) && m.sourceMethodology).map((m) => m.sourceMethodology))];
  if (methodNotes.length) {
    put(sheets[0], ["Toepassing van de gekozen kaders"], "sub", 0);
    const origins = new Map((draft.investigation?.materials || [])
      .filter((m) => ids.has(m.id) && m.sourceControlId).map((m) => [m.foundationId || m.sourceTitle, m]));
    for (const m of origins.values())
      put(sheets[0], [[m.sourceTitle, m.edition, m.sourceLicense, m.sourceChanges].filter(Boolean).join("\n")], "context", 0);
    for (const note of methodNotes) put(sheets[0], [note], "context", 0);
  }
  // Interview omits the criterion column: every selected saved criterion or
  // audit-coverage subject needs
  // its own background block, even without a library family or optional source
  // metadata. Other profiles retain their existing context-block conditions.
  const hasSavedCriterion = (m) => m.kind === "criterion" || m.kind === "audit-coverage";
  const sourceMaterials = (draft.investigation?.materials || []).filter((m) => ids.has(m.id) &&
    (m.cioTrace || m.lawTrace || m.topicalTrace || (methodNotes.length && m.sourceContext) || (options.profile === "interview" && hasSavedCriterion(m))));
  for (const m of sourceMaterials) {
      put(sheets[0], [(m.sourceControlId || m.id) + " · " + m.title], "sub", 0);
      if (m.sourceContext) put(sheets[0], [m.sourceContext], "context", 0);
      if (m.cioTrace || m.lawTrace || m.topicalTrace) {
        // Keep the complete saved snapshot, not a reconstruction from today's
        // catalogue. Continuation rows preserve exact text without cell clipping.
        if (m.parentCriterion) put(sheets[0], ["Bovenliggend criterium:\n" + m.parentCriterion], "context", 0);
        if (m.sourceText) put(sheets[0], ["Exacte bronpassages:\n" + m.sourceText], "context", 0);
        if (m.testDesign) put(sheets[0], ["Opzet · concreet bewijsvoorstel:\n" + m.testDesign], "context", 0);
        if (m.testExistence) put(sheets[0], ["Bestaan · concreet bewijsvoorstel:\n" + m.testExistence], "context", 0);
        put(sheets[0], ["Werking: niet geselecteerd in dit bronpakket (NOT_SELECTED)."], "context", 0);
        put(sheets[0], ["Volledige gestructureerde herleiding · " + (m.sourcePointId || m.id)], "sub", 0);
        put(sheets[0], ["De onderstaande momentopname bewaart alle bronrelaties, rollen, voorwaarden, beperkingen en reviewgegevens. De leesbare toelichting staat hierboven. AI-review is geen menselijke juridische of auditgoedkeuring."], "context", 0);
        const firstRow = sheets[0].rows.length + 1;
        put(sheets[0], [m.lawTrace || m.cioTrace || m.topicalTrace], "context", 0);
        sheets[0].cioTraceEntries ??= [];
        sheets[0].cioTraceEntries.push({lineId:m.id,pointId:m.sourcePointId,row:firstRow,endRow:sheets[0].rows.length});
      }
      // Use the saved body, never the current catalogue or the editable override.
      // Model questions are not norms. This is not an additional interview question.
      if (options.profile === "interview" && hasSavedCriterion(m)) {
        const savedLabel = m.kind === "audit-coverage" ? "Beoordelingsonderwerp" : "Criterium";
        put(sheets[0], [savedLabel + " uit de opgeslagen bouwsteen (auditbewerking, geen interviewvraag):\n" + m.body], "context", 0);
        const ownCriterion = draft.overrides[m.id]?.criterion;
        if (typeof ownCriterion === "string" && ownCriterion !== m.body) {
          put(sheets[0], ["Eigen criteriumformulering in dit onderzoek:\n" + (ownCriterion || "Leeggelaten.")], "context", 0);
        }
      }
  }
  // A work selection is not an applicability assessment. Keep the full requirement set
  // separately from the active test register, including unanswered and excluded points.
  if (!options.basis || options.basis === "norms") {
    for (const {sourceId,requirements,rows:records} of applicabilityGroups({...draft,included:[...ids]},importedFoundationItems)) {
      put(log, ["Toepasselijkheid · " + sourceId], "sub", 0);
      const metadata=importedFoundationMetadata[sourceId];
      put(log, [[metadata.title,metadata.edition,metadata.url].filter(Boolean).join("\n")],"context",0);
      if (!draft.investigation?.materials.some(m=>ids.has(m.id)&&m.foundationId===sourceId)) {
        put(log, [requirements[0].sourceMethodology],"context",0);
        put(log, [requirements[0].sourceLicense],"context",0);
      }
      put(log, [`${records.filter(r => !r.complete).length} van ${records.length} nog te onderbouwen. Werkselectie is geen conformiteitsverklaring. Bewaar motivering, dossierbewijs en gerealiseerde dekking; vul na uitvoering aan.`], "context", 0);
      const grouped = (values, kind) => {
        const groupWidths = [54,64,34];
        const chunks = values.map((v,i) => textChunks(v,groupWidths[i]));
        for(let part=0;part<Math.max(...chunks.map(c=>c.length));part++) {
          const cells = chunks.map(c=>c[part] || "");
          const r=putOne(log,[cells[0],"","",cells[1],cells[2],""],kind);
          log.merges.push(`A${r}:C${r}`,`E${r}:F${r}`);
          const lines=Math.max(1,...cells.map((v,i)=>v.split("\n").reduce((n,t)=>n+Math.max(1,Math.ceil(t.length/(groupWidths[i]-4))),0)));
          log.heights[r]=Math.min(409,Math.max(28,lines*15+12));
        }
      };
      grouped(["Auditvereiste", "Toepasselijkheid en motivering", "Dossier / werkselectie"],"header");
      log.applicabilityEntries ??= [];
      for(const r of records) {
        const row=log.rows.length+1;
        grouped([r.id+"\n"+r.title,applicabilityLabels[r.status]+"\n"+(r.reason || "Motivering nog vast te leggen"),
          (r.evidence || "Dossierverwijzing nog vast te leggen")+"\n"+(r.linked ? "Gekoppeld in werkselectie" : r.selected ? "Gekozen, niet gekoppeld" : "Niet in werkselectie")],"body");
        log.applicabilityEntries.push({...r,row,endRow:log.rows.length});
      }
    }
  }
  const documentedSources=new Map();
  const sourceDetails = (line) => {
    if (line.source_id) {
      const s = reportForLine(framework, line);
      const material=draft.investigation?.materials.find(m=>m.id===line.id);
      const law=material?.lawTrace?JSON.parse(material.lawTrace):null;
      const lawLocation=law?[...new Set(law.point.source_links.map(l=>[l.xml_anchor||law.records.find(r=>r.id===l.record_id)?.locator,...[...new Set((l.visible_spans||[]).map(s=>s.page))].map(p=>'p. '+p)].filter(Boolean).join(' · ')))].join('; '):'';
      const location=lawLocation||cioPointExportLocation(material?.cioTrace)||s.location||'Verwijzing nog vast te leggen';
      if(!s.controlId && !/^[a-f0-9]{64}$/i.test(s.source_hash||'') && !s.sourceDocumentHashes && !line.provisionStatusDetails)
        return {source:[s.title,s.edition,s.url,line.entity].filter(Boolean).join('\n'),url:s.url,location};
      // Full version details are retained once per snapshot, not repeated in every test row.
      const sourceKey=JSON.stringify([s.title,s.edition,s.url,s.source_hash,s.sourceDocumentHashes,s.license,s.changes]);
      if(!documentedSources.has(sourceKey)) {
        documentedSources.set(sourceKey,'B'+String(documentedSources.size+1).padStart(2,'0'));
        put(sheets[0],[documentedSources.get(sourceKey)+' · '+s.title + ' · bronversie'],'sub',0);
        put(sheets[0],[[s.edition,s.url,s.source_hash && 'Bronhash: '+s.source_hash,
          s.sourceDocumentHashes && 'Lokale bronversies: '+s.sourceDocumentHashes,s.license,s.changes].filter(Boolean).join('\n')],'context',0);
      }
      if(line.provisionStatusDetails) {
        put(sheets[0],[testPointId(line.id)+' · '+line.title],'sub',0);
        put(sheets[0],[line.provisionStatusDetails],'context',0);
      }
      return {
        source: [s.title, s.edition, line.entity, 'Bronversie '+documentedSources.get(sourceKey),
          'Volledige broninformatie: 01 Versiebeheer.'].filter(Boolean).join("\n"),
        url:s.url,
        location,
      };
    }
    const used = new Set(
      [
        "criterion",
        "control",
        "auditQuestion",
        "procedure",
        ...(chosen.has("objective") || chosen.has("relevance") ? ["objective"] : []),
        ...(chosen.has("risk") ? ["risk"] : []),
        ...(chosen.has("controlObjective") ? ["controlObjective"] : []),
      ].flatMap((kind) =>
        sourceFields(line, kind)
          .filter((f) => fieldIncluded(draft, line.id, f.id))
          .flatMap((f) => f.evidence_ids ?? []),
      ),
    );
    if (reportExportContext(reportForLine(framework,line)))
      for (const id of line.finding?.evidence_ids ?? []) used.add(id);
    const evidence = framework.evidence.filter((e) => used.has(e.id));
    const reports = [
      ...new Map(
        [
          reportForLine(framework, line),
          ...evidence.map((e) => reportForEvidence(framework, e)),
        ].map((r) => [r.id, r]),
      ).values(),
    ];
    return {
      source:
        reports.map((r) => r.id + " — " + r.title).join("\n\n") +
        (reports.some(r => reportExportContext(r)) ? "\n\nBouwsteen: " : "\n\nOorspronkelijke norm: ") +
        normId(line.id) + reports.filter(r => reportExportContext(r)).map(r => "\n" + reportExportContext(r)).join("") +
        (reportExportContext(reportForLine(framework,line)) && typeof line.exportContext === 'string' && line.exportContext.trim()
          ? "\n\nBij dit punt: " + line.exportContext.trim() : ""),
      location: reports
        .map((r) => {
          const pages = [
            ...new Set(
              evidence
                .filter(
                  (e) => e.report_id === r.id || (!e.report_id && r.id === framework.report.id),
                )
                .flatMap((e) => Array.from({length:Math.max(1,(e.page_end ?? e.page)-e.page+1)},(_,i)=>e.page+i)),
            ),
          ].sort((a, b) => a - b);
          return r.id + ": " + (pages.length ? "p. " + pages.join(", ") : "Pagina niet vastgelegd");
        })
        .join("\n"),
    };
  };
  const blankFields = new Set([
    "observation",
    "evidenceLocation",
    "verdict",
    "tester",
    "testedOn",
    "status",
  ]);
  const additions = (line, kind) => (draft.branchItems[line.id] ?? [])
    .filter(f => f.kind === kind).map(f => branchText(line, f)).join("\n\n");
  const expectedEvidence = (line, material, methods) => material
    ? [material.documents, material.observation].filter(Boolean).join("\n\n")
    : methods?.documentation || "";
  for (const line of selected) {
    const methods = testingSuggestions(framework, line, draft),
      source = sourceDetails(line);
    const material = draft.investigation?.materials.find((m) => m.id === line.id);
      const values = fields.map((f) => {
        if (aspects.length && line.materialKind !== "model-question" && f.id === "documentation")
          return "Zie Toetsuitvoering · " + testPointId(line.id);
        if (blankFields.has(f.id)) return "";
        if (f.id === "inScope") return "Te beoordelen";
        if (f.id === "comments") return meta.notes ? draft.notes[line.id] || "" : "";
        if (f.id === "source" || f.id === "location") return source[f.id];
        if (f.id === "category") if (line.materialKind) return material?.topic || line.entity;
        if (f.id === "category")
          return subjectIds(line)
            .map((id) => subjects.find((s) => s.id === id)?.title || id)
            .join("; ");
        if (f.id === "relevance")
          return (
            (themeText([line]) ? "Doel binnen " + themeText([line]) + ":\n" : "") +
            (fieldText(line, "objective") || "Zelf toelichten voor dit onderzoek.")
          );
        if (line.source_id && f.id === "interview")
          if (aspects.length && line.materialKind !== "model-question")
            return fieldText(line, "auditQuestion");
        if (line.source_id && f.id === "interview")
          return materialInterview(
            draft.investigation.materials.find((m) => m.id === line.id),
            options.researchInterview,
            draft.overrides[line.id]?.auditQuestion,
            draft.overrides[line.id]?.procedure,
            {questions: additions(line, "auditQuestion"), procedures: additions(line, "procedure"), separateProcedure: true,
              excludeQuestion: !fieldIncluded(draft, line.id, "auditQuestion"),
              excludeProcedure: !fieldIncluded(draft, line.id, "procedure")},
          );
        if (line.source_id && f.id === "documentation") {
          const m = draft.investigation.materials.find((m) => m.id === line.id);
          return line.materialKind !== "model-question" || options.researchInterview?.triangulation
            ? [m.documents, m.observation].filter(Boolean).join("\n\n") ||
                "Bepaal passende documenten of observaties bij deze vraag."
            : "";
        }
        if (f.id === 'interview' && options.profile==='interview')
          return materialInterview({kind:'criterion',title:line.title,question:fieldText(line,'auditQuestion')||methods?.interview||'',procedure:''},options.researchInterview,draft.overrides[line.id]?.auditQuestion,draft.overrides[line.id]?.procedure,{questions:additions(line,'auditQuestion'),procedures:additions(line,'procedure'),excludeQuestion:!fieldIncluded(draft,line.id,'auditQuestion'),excludeProcedure:!fieldIncluded(draft,line.id,'procedure'),separateProcedure:true});
        if (f.id === "interview" && line.report_id && reportExportContext(reportForLine(framework,line)))
          // Current point plans belong in the testing fields, not repeated as
          // an interview question. Repeating all phases can overflow one row.
          return [fieldText(line,"auditQuestion"),!line.practicalRevision&&fieldText(line,"procedure")].filter(Boolean).join("\n\n");
        if (f.id === "documentation" || f.id === "interview")
          return methods ? methods[f.id] : "Zelf uitwerken voor dit kader.";
        // An intentional blank is a saved user decision, not missing content.
        return fieldText(line, f.id) || (f.id === "criterion" && draft.overrides[line.id]?.criterion !== "" ? "Norm nog te formuleren" : "");
      });
      const row = put(s, [testPointId(line.id), line.title, ...values]),
        endRow = s.rows.length;
      for (let r = row; r <= endRow; r++) {
        s.rows[r - 1][0] = testPointId(line.id);
        if (r > row) s.rows[r - 1][1] = line.title + " (vervolg)";
      }
      entries.push({
        row,
        endRow,
        sourceUrl:source.url,
        lineId: line.id,
        pointId: testPointId(line.id),
        aspect: null,
        questionIds: links.filter((k) => k.line_id === line.id).map((k) => k.question_id),
      });
  }
  for (let i = 0; i < 3; i++) put(s, [], "body");
  s.entries = entries;
  s.filter = "A5:" + columnName(widths.length - 1) + s.rows.length;
  s.dates = chosen.has("testedOn") ? [s.columnIds.indexOf("testedOn")] : [];
  for (const col of s.dates)
    for (let r = 6; r <= s.rows.length; r++) s.cellStyles[r] = { ...s.cellStyles[r], [col]: 6 };
  const lists = {
    inScope: ["Te beoordelen", "Ja", "Deels", "Nee"],
    verdict: [
      "Voldoet",
      "Voldoet deels",
      "Voldoet niet",
      "Onvoldoende bewijs",
      "Niet van toepassing",
    ],
    status: ["Niet gestart", "In uitvoering", "Gereed voor review", "Afgerond"],
  };
  for (const [id, values] of Object.entries(lists)) {
    if (chosen.has(id)) {
      const col = columnName(s.columnIds.indexOf(id));
      s.validations.push({
        range: col + "6:" + col + Math.max(505, s.rows.length + 100),
        formula: '"' + values.join(",") + '"',
      });
    }
  }
  if (chosen.has("tester")) {
    const col = columnName(s.columnIds.indexOf("tester"));
    s.validations.push({
      range: col + "6:" + col + Math.max(505, s.rows.length + 100),
      formula: "Teamleden",
    });
  }
  if (aspects.length) {
    const testSheet = add((meta.questions ? "04 " : "03 ") + "Toetsuitvoering",
      [14, 30, 48, ...aspects.flatMap(() => [48, 36, 20])]);
    start(testSheet);
    testSheet.merges = testSheet.merges.map(m => m.startsWith("A2:") ? "A2:D2" : m.startsWith("A3:") ? "A3:D3" : m);
    testSheet.registerKind = "testing";
    testSheet.columnIds = ["pointId", "title", "criterion", ...aspects.flatMap(id =>
      [id + "Approach", id + "Record", id + "Verdict"])];
    testSheet.rows[3] = ["Toetspunt", "", "", ...aspects.flatMap(id =>
      [testingAspectLabel(id, testingTerminology), "", ""])];
    // The norm text travels with the test point: a tester needs the wording of
    // the criterion to judge it, without switching to the register sheet.
    testSheet.rows[4] = ["ID", "Toetspunt", s.rows[4][s.columnIds.indexOf("criterion")] || "Norm / criterium",
      ...aspects.flatMap(() =>
      ["Toetsaanpak / verwacht bewijs", "Bevinding / bewijsreferentie", "Oordeel"])];
    testSheet.merges = testSheet.merges.filter(m => !m.startsWith("A4:"));
    testSheet.merges.push("A4:C4");
    testSheet.rowStyles[4] = 1;
    testSheet.rowStyles[5] = 4;
    testSheet.heights[4] = 26;
    testSheet.heights[5] = 44;
    testSheet.freeze = 5;
    testSheet.freezeColumns = 2;
    testSheet.cellStyles[4] = {0: 7, 1: 7, 2: 7};
    testSheet.cellStyles[5] = {0: 8, 1: 8, 2: 8};
    aspects.forEach((id, i) => {
      const col = 3 + i * 3;
      testSheet.merges.push(`${columnName(col)}4:${columnName(col + 2)}4`);
      for (let c = col; c < col + 3; c++) {
        const phase = {opzet:9,bestaan:11,werking:13}[id];
        testSheet.cellStyles[4][c] = phase;
        testSheet.cellStyles[5][c] = phase + 1;
      }
      const letter = columnName(col + 2);
      testSheet.validations.push({range: `${letter}6:${letter}${Math.max(505, selected.length + 105)}`,
        formula: '"' + lists.verdict.join(',') + '"'});
    });
    const details = [];
    testSheet.entries = [];
    for (const line of selected.filter(l => l.materialKind !== "model-question")) {
      const material = draft.investigation?.materials.find(m => m.id === line.id);
      const methods = testingSuggestions(framework, line, draft);
      const criterionColumn = s.columnIds.indexOf("criterion");
      const criterionText = criterionColumn >= 0 ? s.rows[entries.find(e => e.lineId === line.id).row - 1][criterionColumn] : "";
      const rowValues = [testPointId(line.id), line.title, criterionText];
      const pending = [];
      for (const [index, aspect] of aspects.entries()) {
        const label = testingAspectLabel(aspect, testingTerminology);
        const specific = fieldIncluded(draft, line.id, "procedure")
          ? (reportQualityPhaseText(line,aspect) ?? material?.[{opzet:"testDesign", bestaan:"testExistence", werking:"testOperation"}[aspect]]) : "";
        // A general user edit supplements the distinct aspect plan, never replaces all three.
        const own = draft.overrides[line.id]?.procedure !== undefined
          ? fieldText(line, "procedure") : additions(line, "procedure");
        const procedure = [specific || (fieldIncluded(draft, line.id, "procedure") ? fieldText(line, "procedure") : ""),
          specific ? own : (!fieldIncluded(draft,line.id,"procedure") ? own : "")].filter(Boolean).join("\n\n");
        const plan = aspectTestPlan(aspect, line.title, procedure, expectedEvidence(line, material, methods));
        // CIO's reviewed phase proposals must not gain generic obligations or
        // a period-operation test that the package explicitly did not select.
        const full = line.practicalRevision ? [specific,own].filter(Boolean).join('\n\n') : (material?.cioTrace||material?.lawTrace||material?.topicalTrace)
          ? (aspect === "werking" ? "Niet geselecteerd in dit bronpakket (NOT_SELECTED). Geen toetsvoorstel voor werking." :
            [specific, own, expectedEvidence(line, material, methods) && "Verwacht bewijs (voorstel):\n" + expectedEvidence(line, material, methods)].filter(Boolean).join("\n\n"))
          : plan.procedure + "\n\nVerwacht bewijs (voorstel):\n" + plan.documentation;
        // One physical test row per control. Long instructions stay intact below the table.
        const chunks = textChunks(full, 48);
        rowValues.push(chunks.length === 1 ? full : "", "", "");
        if (chunks.length > 1) pending.push({col: 3 + index * 3, full, label,
          preview: (procedure || plan.procedure).split("\n\n")[0]});
      }
      const row = putOne(testSheet, rowValues);
      testSheet.hyperlinks ??= [];
      const origin = entries.find(e => e.lineId === line.id);
      testSheet.hyperlinks.push({ref:`A${row}`, location:`'${s.name}'!A${origin.row}`, tooltip:"Bron en criterium bekijken"});
      testSheet.entries.push({row, endRow: row, lineId:line.id, pointId:testPointId(line.id), aspects:[...aspects]});
      for (const detail of pending) details.push({...detail, row, line});
    }
    const lastTestRow = testSheet.rows.length;
    testSheet.filter = `A5:${columnName(testSheet.widths.length - 1)}${Math.max(6,lastTestRow)}`;
    testSheet.validations = testSheet.validations.map(v => ({...v,range:v.range.replace(/\d+$/,String(lastTestRow + 3))}));
    // Scope, period and evidence are independently recorded for each aspect; no prefilled verdicts.
    for (let i = 0; i < 3; i++) put(testSheet, [], "body");
    put(testSheet, ["Toetsinstructies"], "sub", 0);
    const instructionsRow = testSheet.rows.length;
    testSheet.rows[2][0] += ` · Eén rij per toetspunt. Instructies vanaf rij ${instructionsRow}. Bron en criterium: ${s.name}, zelfde ID.`;
    testSheet.heights[3] = Math.max(42,Math.ceil(testSheet.rows[2][0].length/118)*15+12);
    put(testSheet, ["Leg bij bestaan de peildatum vast; bij werking de onderzoeksperiode, populatie en selectie. Noteer per aspect de bevinding, bewijsreferentie, uitvoerder en datum. Kies pas daarna een oordeel."], "context", 0);
    const instruction = (text, kind) => {
      const first=testSheet.rows.length + 1;
      for (const part of textChunks(text,128)) {
        const row=putOne(testSheet,[part],kind);
        testSheet.merges.push(`A${row}:D${row}`);
        const lines=part.split("\n").reduce((n,t)=>n+Math.max(1,Math.ceil(t.length/124)),0);
        testSheet.heights[row]=Math.min(409,Math.max(30,lines*15+12));
      }
      return first;
    };
    for (const detail of details) {
      const start = instruction(testPointId(detail.line.id) + " · " + detail.line.title + " · " + detail.label, "sub");
      const preview = detail.preview.length > 450 ? detail.preview.slice(0, 450).replace(/\s+\S*$/, "") + "…" : detail.preview;
      testSheet.rows[detail.row - 1][detail.col] = preview + `\n\nVolledige aanpak + bewijs: klik hier (rij ${start}).`;
      testSheet.heights[detail.row] = Math.max(testSheet.heights[detail.row], Math.ceil((preview.length + 75) / 44) * 15 + 42);
      testSheet.hyperlinks.push({ref:`${columnName(detail.col)}${detail.row}`, location:`'${testSheet.name}'!A${start}`, tooltip:"Volledige toetsinstructie en verwacht bewijs"});
      instruction(detail.full, "body");
      testSheet.hyperlinks.push({ref:`A${start}`, location:`'${testSheet.name}'!A${detail.row}`, tooltip:"Terug naar het toetspunt"});
    }
    testSheet.instructionEntries = details.map(d => ({lineId:d.line.id, aspect:d.label, text:d.full}));
  }
  return refineWorkbook({
    title: draft.title,
    meta,
    sheets,
    definedNames: [{ name: "Teamleden", formula: "'01 Versiebeheer'!$F$6:$F$10" }],
    selection: {
      norms: selected.length,
      links: links.length,
      themeIds: activeThemes.map((t) => t.id),
    },
  }, { framework, draft, selected, links, numbers, options });
}
import { assertScopeExport } from "./product-scope.mjs";
