import { auditWorkbookModel, textChunks, exportFields } from "./excel-model.mjs";
import { presetOptions, kapteinSource } from "./export-presets.mjs";
import { refineModelInterview, includeResearchGoal } from "./excel-workbook-design.mjs";
import { profileTemplateWorkbook } from './excel-profile-template.mjs';
import { templateWorkbook } from './excel-template-design.mjs';
import { validateApplicability } from './applicability.mjs';

/** Export-only model input remains separate from historical evidence and the saved audit draft. */
export function creatorWorkbookModel(framework, draft, options = {}) {
  const profile=options.profile || 'testing';
  const prepared={colorMode:'sections',...options,questions:true};
  if(!options.basis || options.basis==='norms') {
    const fields=options.fields || presetOptions(profile).fields;
    prepared.fields=[...new Set([...fields,'source','location',...(profile==='testing'?['category','controlObjective','control','criterion']:[])])];
  }
  if(!options.basis || options.basis==='norms') {
    prepared.fields=exportFields.map(f=>f.id);
    prepared.notes=true;
  }
  const content=creatorWorkbookContent(framework,draft,prepared);
  if(!options.basis || options.basis==='norms') {
    const applicability=validateApplicability(draft.investigation?.applicability);
    if(applicability.length)content.applicability=applicability;
  }
  if(profile==='testing' && (!options.basis || options.basis==='norms'))
    return templateWorkbook(content,draft,prepared,framework);
  return profileTemplateWorkbook(content,draft,prepared,framework);
}
function creatorWorkbookContent(framework, draft, options = {}) {
  if (!options.basis || options.basis === "norms")
    return auditWorkbookModel(
      framework,
      draft,
      options.profile ? presetOptions(options.profile, options) : options,
    );
  if (options.profile !== "interview" || !["kaptein", "own"].includes(options.basis))
    throw new Error("Een modelbasis is beschikbaar voor de interviewleidraad.");
  const items = (options.modelItems ?? []).filter((v) => v.included);
  if (items.some((v) => !v.id || !v.title.trim() || !v.question.trim()))
    throw new Error("Vul voor elk gekozen onderwerp een titel en interviewvraag in.");
  if (new Set(items.map((v) => v.id)).size !== items.length)
    throw new Error("Onderwerp-ID’s moeten uniek zijn.");
  const model = auditWorkbookModel(framework, draft, {
    ...options,
    questions: false,
    themeIds: [],
    fields: ["criterion"],
  });
  const title = options.modelTitle?.trim() || "Interviewonderzoek";
  model.definedNames = model.definedNames.filter(n => n.name !== 'ToetspuntIDs');
  const source =
    options.modelSource?.trim() || (options.basis === "kaptein"
      ? kapteinSource
      : "Eigen model; bron nog vast te leggen");
  const context =
    "Onderwerp: " + title + (options.focus ? " · Onderzoeksobject: " + options.focus : "");
  model.title = title;
  model.sheets[0].rows[2][0] = context;
  model.sheets[0].rows[3][0] = title;
  if (options.interviewStructured) {
    model.sheets = [model.sheets[0], structuredInterviewSheet(items, title, source, options)];
    model.selection = { norms: items.length, links: 0, themeIds: [] };
    return includeResearchGoal(refineModelInterview(model,model.sheets[1],items,options),draft);
  }
  const widths = [11, 28, 52, 52, 36];
  const sheet = {
    name: "02 Interviewleidraad",
    widths,
    rows: [],
    merges: [],
    rowStyles: {},
    heights: {},
    rowKinds: {},
    cellStyles: {},
    validations: [],
    freeze: 5,
    freezeColumns: 2,
    entries: [],
    columnIds: ["pointId", "title", "question", "probes", "notes"],
  };
  function row(values, style = 0, merge = false) {
    const chunks = values.map((v, i) => textChunks(v, merge && i === 0 ? 179 : widths[i]));
    for (let part = 0; part < Math.max(1, ...chunks.map((v) => v.length)); part++) {
      const cells = widths.map((_, i) => chunks[i]?.[part] ?? "");
      const r = sheet.rows.push(cells);
      sheet.rowStyles[r] = style;
      const lines = Math.max(
        1,
        ...cells.map((v, i) =>
          String(v)
            .split("\n")
            .reduce(
              (n, t) =>
                n + Math.max(1, Math.ceil(t.length / (merge && i === 0 ? 170 : widths[i] - 4))),
              0,
            ),
        ),
      );
      sheet.heights[r] = Math.min(409, Math.max(style === 2 ? 32 : 28, 15 * lines + 12));
      if (merge) sheet.merges.push("A" + r + ":E" + r);
    }
  }
  row([]);
  sheet.heights[1] = 12;
  row([title], 2, true);
  row(["Centrale vraag: " + (options.modelQuestion?.trim() || "Nog te formuleren")], 4, true);
  row(
    [
      options.basis === "kaptein"
        ? "Eigen kwalitatieve voorbeeldvragen bij Kaptein. Geen gevalideerde vragenlijst of scoremodel."
        : "Eigen interviewvragen. Pas deze aan de gesprekspartner en onderzoeksvraag aan.",
    ],
    3,
    true,
  );
  row(["ID", "Onderwerp", "Interviewvraag", "Doorvragen / voorbeelden", "Gespreksnotities"], 1);
  for (const item of items) {
    const first = sheet.rows.length + 1;
    row([item.id, item.title, item.question, item.probes, ""]);
    for (let r = first; r <= sheet.rows.length; r++) {
      sheet.rows[r - 1][0] = item.id;
      if (r > first) sheet.rows[r - 1][1] = item.title + " (vervolg)";
    }
    sheet.entries.push({ row: first, endRow: sheet.rows.length, pointId: item.id });
  }
  for (let i = 0; i < 3; i++) row([]);
  sheet.filter = "A5:E" + sheet.rows.length;
  row(["Modelbron: " + source], 3, true);
  model.sheets = [model.sheets[0], sheet];
  model.selection = { norms: items.length, links: 0, themeIds: [] };
  return includeResearchGoal(refineModelInterview(model,sheet,items,options),draft);
}

function structuredInterviewSheet(items, title, source, options) {
  const withStarr = items.some((i) => i.starr?.length),
    withEvidence = items.some((i) => i.triangulation);
  const columns = [
    ["pointId", "Vraag-ID", 18],
    ["variable", "Variabele", 26],
    ["indicator", "Indicator", 35],
    ["level", "Interviewniveau", 23],
    ["question", "Hoofdvraag", 54],
    ["probes", "Aanvullende doorvraag", 40],
    ...(withStarr ? [["starr", "STARR · concrete ervaring", 62]] : []),
    ...(withEvidence
      ? [
          ["documents", "Documenten / cijfers", 42],
          ["observation", "Observatie / verificatie", 48],
        ]
      : []),
    ["notes", "Gespreksnotities", 40],
  ];
  const widths = columns.map((c) => c[2]),
    last = String.fromCharCode(64 + columns.length),
    total = widths.reduce((a, b) => a + b, 0);
  const sheet = {
    name: "02 Interviewleidraad",
    widths,
    rows: [],
    merges: [],
    rowStyles: {},
    heights: {},
    rowKinds: {},
    cellStyles: {},
    validations: [],
    freeze: 5,
    freezeColumns: 3,
    entries: [],
    columnIds: columns.map((c) => c[0]),
  };
  function row(values, style = 0, merge = false) {
    const chunks = values.map((v, i) => textChunks(v ?? "", merge && i === 0 ? total : widths[i]));
    for (let part = 0; part < Math.max(1, ...chunks.map((c) => c.length)); part++) {
      const cells = widths.map((_, i) => chunks[i]?.[part] ?? ""),
        r = sheet.rows.push(cells);
      sheet.rowStyles[r] = style;
      const lines = Math.max(
        1,
        ...cells.map((v, i) =>
          String(v)
            .split("\n")
            .reduce(
              (n, t) =>
                n + Math.max(1, Math.ceil(t.length / ((merge && i === 0 ? total : widths[i]) - 4))),
              0,
            ),
        ),
      );
      sheet.heights[r] = Math.min(409, Math.max(style === 2 ? 32 : 28, lines * 15 + 12));
      if (merge) sheet.merges.push("A" + r + ":" + last + r);
    }
  }
  row([]);
  sheet.heights[1] = 12;
  row([title], 2, true);
  row(
    [
      "Centrale vraag: " +
        (options.modelQuestion?.trim() || "Nog te formuleren") +
        (options.focus ? " · " + options.focus : ""),
    ],
    4,
    true,
  );
  row(
    [
      (options.modelId === "CEV-AI" ? "Gespreksintro: we bespreken hoe het werk in de praktijk verloopt. Vertel over een recente situatie; geen ervaring is ook een geldig antwoord. " : "") + "Eigen kwalitatieve interviewuitwerking · model v" +
        (options.modelVersion || "0.1") +
        " · één rij per gekozen vraag en niveau. Geen gevalideerde meting of automatische score.",
    ],
    3,
    true,
  );
  row(
    columns.map((c) => c[1]),
    1,
  );
  for (const item of items) {
    const values = {
      pointId: item.templateId,
      variable: item.variable + "\n" + item.variableId,
      indicator: item.indicator + "\n" + item.indicatorDefinition + "\n" + item.indicatorId,
      level: item.level,
      question: item.question,
      probes: item.probes,
      starr: (item.starr ?? []).map((p) => p.phase + ": " + p.prompt).join("\n\n"),
      documents: item.triangulation?.documents ?? "",
      observation: item.triangulation
        ? [item.triangulation.observation, item.triangulation.verification].join("\n\n")
        : "",
      notes: "",
    };
    const first = sheet.rows.length + 1;
    row(columns.map((c) => values[c[0]]));
    for (let r = first; r <= sheet.rows.length; r++) {
      sheet.rows[r - 1][0] = item.templateId;
      if (r > first) sheet.rows[r - 1][1] = item.variable + " (vervolg)";
    }
    sheet.entries.push({
      row: first,
      endRow: sheet.rows.length,
      pointId: item.id,
      templateId: item.templateId,
      revision: item.revision,
    });
  }
  for (let i = 0; i < 3; i++) row([]);
  sheet.filter = "A5:" + last + sheet.rows.length;
  row(["Modelbron: " + source], 3, true);
  if (withEvidence)
    row(
      [
        "Bewijssuggesties zijn opties, geen bewijs dat documenten bestaan of verplichte eisen uit de publicatie. Verifieer context, onafhankelijkheid en eventuele tegenstrijdigheden.",
      ],
      3,
      true,
    );
  return sheet;
}
