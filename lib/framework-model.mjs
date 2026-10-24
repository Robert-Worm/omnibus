import { reportForEvidence, reportForLine, selectedReportIds } from "./corpus-model.mjs";
import { researchGoalText } from './research-goal.mjs';
import { directionApproach } from './research-directions.mjs';
import { researchApproachText } from './research-approach.mjs';
import {
  validateInvestigation,
  investigationFramework,
  validateExportSettings,
} from "./investigation.mjs";
import {
  validateResearch,
  validateFieldChoices,
  exportResearch,
  fieldIncluded,
} from "./research-plan.mjs";
import { validateBranches, exportBranches } from "./framework-branches.mjs";
import { questionCandidate } from './question-quality.mjs';
import {
  sourceElement,
  sourceFields,
  sourceRelations,
  sourceEvidenceIds,
} from "./framework-source-items.mjs";
export const labels = {
  objective: "Doel",
  risk: "Risico",
  controlObjective: "Beheersdoelstelling",
  control: "Beheersmaatregel",
  criterion: "Toetsingscriterium",
  finding: "Historische bevinding",
  auditQuestion: "Auditvraag",
  procedure: "Voorgestelde toetsing",
  owner: "Verantwoordelijkheid",
};
export const basisLabels = {
  EXPLICIT: "Expliciet in bron",
  INFERRED: "AI-afleiding",
  PROPOSED: "Voorstel nieuwe audit",
  NOT_ESTABLISHED: "Niet vastgesteld",
  USER_PROPOSAL: "Uw aanpassing · te beoordelen",
};
export const statusLabels = {
  SUPPORTED: "Onderbouwd in bron",
  PARTIAL: "Gedeeltelijk onderbouwd",
  NOT_DEMONSTRATED: "Werking niet aangetoond",
  NOT_ESTABLISHED: "Niet vastgesteld",
};
export function baselineId(framework) {
  if (!/^[a-f0-9]{64}$/.test(framework.content_hash ?? ""))
    throw new Error("Bronkader heeft geen geldige versievingerafdruk.");
  return framework.version + ":" + framework.content_hash;
}
/** @param {import('./framework-types.js').Framework} framework @returns {import('./framework-types.js').Draft} */
// An unselected draft supplies original display values only. It grants no
// admission; selecting, restoring and exporting keep their own source checks.
export function emptyDraft(framework) {
  return {
    format: "rijksmap-framework-draft-v2",
    source_hash: framework.report.source_hash,
    baseline_id: baselineId(framework),
    title: framework.title,
    included: [],
    overrides: {},
    notes: {},
    branchItems: {},
  };
}
/** @param {import('./framework-types.js').Framework} framework @returns {import('./framework-types.js').Draft} */
export function initialDraft(framework) {
  return prepareInitialDraft(framework).draft;
}
// The browsing screen needs both admitted rows and an all-source draft. Build
// them in one checked pass, without accepting a caller's unverified row list.
/** @param {import('./framework-types.js').Framework} framework
 * @returns {{draft: import('./framework-types.js').Draft, admitted: import('./framework-types.js').Line[]}} */
export function prepareInitialDraft(framework) {
  const draft = emptyDraft(framework), admitted = admittedLines(framework);
  return {draft: {...draft, included: admitted.map(l => l.id)}, admitted};
}
export function draftValue(line, key, draft) {
  const own = draft.overrides[line.id]?.[key];
  if (own !== undefined) return own;
  const element = sourceElement(line, key);
  // Saved materials can contain in-place user wording without an override.
  // Only catalogue source fields are filtered here; never rewrite snapshots.
  return !line.source_id && (key === 'auditQuestion' || element.kind === 'auditQuestion')
    ? questionCandidate(element.text, 'toetsvraag') : element.text;
}
export function isEdited(line, key, draft) {
  return (
    Object.hasOwn(draft.overrides[line.id] ?? {}, key) &&
    (draft.overrides[line.id][key] !== sourceElement(line, key).text ||
      draft.overrides[line.id][key] !== draftValue(line, key, {overrides:{}}))
  );
}
export function updateValue(draft, line, key, value) {
  const element = sourceElement(line, key);
  if (!element || typeof value !== "string" || value.length > 10000)
    throw new Error("Ongeldige aanpassing");
  const overrides = { ...draft.overrides, [line.id]: { ...draft.overrides[line.id] } };
  // An explicit user choice equal to a hidden source question is still an own
  // question. Dropping that override would make it disappear on the next render.
  if (value === element.text && value === draftValue(line, key, {overrides:{}})) delete overrides[line.id][key];
  else overrides[line.id][key] = value;
  return { ...draft, overrides };
}
export function toggleLine(draft, id) {
  return {
    ...draft,
    included: draft.included.includes(id)
      ? draft.included.filter((x) => x !== id)
      : [...draft.included, id],
  };
}
export function validateDraft(value, framework) {
  if (value?.investigation !== undefined) framework = investigationFramework(framework, value);
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Geen geldig kaderbestand.");
  if (
    !["rijksmap-framework-draft-v1", "rijksmap-framework-draft-v2"].includes(value.format) ||
    value.source_hash !== framework.report.source_hash ||
    value.baseline_id !== baselineId(framework)
  )
    throw new Error("Dit concept hoort bij een andere bron of kaderversie.");
  const ids = new Set(framework.lines.map((l) => l.id));
  if (
    typeof value.title !== "string" ||
    value.title.length > 500 ||
    !Array.isArray(value.included) ||
    value.included.some((id) => !ids.has(id)) ||
    new Set(value.included).size !== value.included.length
  )
    throw new Error("Ongeldige titel of kaderselectie.");
  for (const key of ["overrides", "notes"])
    if (!value[key] || typeof value[key] !== "object" || Array.isArray(value[key]))
      throw new Error("Ongeldige bewerkingen.");
  // A restored draft supplies its own selection. Do not build the complete
  // admitted selection only to discard it; scope cleanup/export still checks
  // every referenced source through the existing admission rules.
  const clean = emptyDraft(framework);
  clean.title = value.title;
  clean.included = [...value.included];
  for (const [id, edits] of Object.entries(value.overrides)) {
    if (!ids.has(id) || !edits || typeof edits !== "object" || Array.isArray(edits))
      throw new Error("Onbekende kaderlijn.");
    clean.overrides[id] = {};
    const line = framework.lines.find((l) => l.id === id);
    for (const [key, text] of Object.entries(edits)) {
      if (!sourceElement(line, key) || typeof text !== "string" || text.length > 10000)
        throw new Error("Ongeldig kaderveld.");
      clean.overrides[id][key] = text;
    }
  }
  for (const [id, note] of Object.entries(value.notes)) {
    if (!ids.has(id) || typeof note !== "string" || note.length > 20000)
      throw new Error("Ongeldige notitie.");
    clean.notes[id] = note;
  }
  clean.branchItems = validateBranches(
    value.format === "rijksmap-framework-draft-v1" ? (value.branchItems ?? {}) : value.branchItems,
    ids,
    framework.lines,
  );
  if (value.research !== undefined) clean.research = validateResearch(value.research, ids);
  if (value.excludedFields !== undefined)
    clean.excludedFields = validateFieldChoices(value.excludedFields, framework);
  if (value.investigation !== undefined)
    clean.investigation = validateInvestigation(value.investigation);
  if (value.exportSettings !== undefined)
    clean.exportSettings = validateExportSettings(value.exportSettings);
  return clean;
}
export function exportMarkdown(framework, draft) {
  assertScopeExport(framework, draft);
  const out = [
    `# ${draft.title.replace(/[\r\n]/g, " ")}`,
    "",
    "Conceptreferentiekader; geen actueel normenkader of verklaring over de effectiviteit van controls.",
    `Historische bron: ${framework.report.title} (${framework.report.year}). Eén rapport; geen bewezen cross-reportpatroon.`,
    `Kaderversie: ${baselineId(framework)}.`,
    `Bronvingerafdruk: ${framework.report.source_hash}.`,
    "",
  ];
  if (framework.reports) {
    const ids = selectedReportIds(framework, draft);
    out[3] =
      "Bronnen van uw selectie: " + ids.length + " rapporten. Geen bewezen cross-reportpatroon.";
    out.push(
      "## Rapporten van uw selectie",
      "",
      ...framework.reports
        .filter((r) => ids.includes(r.id))
        .map((r) => `- ${r.id}: ${r.title}. ${r.scope ?? ""} Bronhash: ${r.source_hash}.`),
      "",
    );
  }
  const goal = researchGoalText(draft.investigation?.goal);
  if (goal) out.push('## Onderzoeksdoelstelling', '', goal, '');
  // Wat de gekozen richting van het bewijs vraagt: in het uitvoerbare document,
  // omdat daar het oordeel wordt opgeschreven.
  const directionNote = goal && directionApproach(draft.investigation?.goal?.direction);
  if (directionNote) out.push(directionNote, '');
  const approach = researchApproachText(draft.investigation?.researchApproach);
  if (approach) out.push('Onderzoeksaanpak: ' + approach, '');
  out.push(...exportResearch(framework, draft));
  for (const {sourceId,requirements,rows} of applicabilityGroups(draft,importedFoundationItems)) {
    const meta=importedFoundationMetadata[sourceId];
    out.push(`## Toepasselijkheid — ${meta.title}`,meta.edition,meta.url,requirements[0].sourceMethodology,requirements[0].sourceLicense,
      `${rows.filter(r=>!r.complete).length} van ${rows.length} nog te onderbouwen. Werkselectie is geen conformiteitsverklaring. Vul de gerealiseerde dekking na uitvoering aan.`,"");
    for(const r of rows) out.push(`### ${r.id} — ${r.title}`,`Status: ${applicabilityLabels[r.status]}`,
      `Motivering: ${r.reason || "Nog vast te leggen"}`,`Dossier: ${r.evidence || "Nog vast te leggen"}`,
      r.linked ? "Gekoppeld in werkselectie" : r.selected ? "Gekozen, niet gekoppeld" : "Niet in werkselectie","");
  }
  for (const line of framework.lines.filter((l) => draft.included.includes(l.id))) {
    if(line.source_id){
      const source=reportForLine(framework,line);
      out.push(`## ${line.id} — ${line.title}`,line.entity,`Grondslag: ${source.title}`,source.edition||'',source.location||'',source.url||'','');
      if(line.provisionStatusDetails)out.push('### Status van de bepaling',line.provisionStatusDetails,'');
      if(source.sourceDocumentHashes)out.push('Lokale bronversies: '+source.sourceDocumentHashes,'');
      const material = draft.investigation?.materials.find((m) => m.id === line.id);
      if(source.controlId) out.push(`Bron-ID: ${source.controlId}`, source.context || '', source.license || '', source.changes || '', '');
      if(material?.sourceMethodology) out.push('### Toepassingsvoorwaarden', material.sourceMethodology, '');
      for(const key of ['objective','risk','controlObjective','control','criterion','auditQuestion','procedure'])if(fieldIncluded(draft,line.id,key) && draftValue(line,key,draft))out.push(`### ${key==='criterion'&&line.materialKind==='audit-coverage'?'Auditdekkingspunt':key==='criterion'&&line.materialKind==='model-question'?'Onderzoeksfocus':labels[key]}`,draftValue(line,key,draft),'');
      if(material?.parentCriterion)out.push('### Bovenliggend toetscriterium',material.parentCriterion,'');
      if(material?.sourcePointId)out.push('Toetspunt-ID: '+material.sourcePointId,...(material.wordingMode?['Gekozen formulering: '+material.wordingMode]:[]),(material.cioTrace||material.lawTrace)?'### Bronbepalingen':'### Historische bronpassages',material.sourceText || '', '### Context en beperkingen',material.sourceContext || '', '');
      if(material?.cioTrace||material?.lawTrace)out.push('### Opgeslagen bronherleiding (gestructureerd)','```json',material.lawTrace||material.cioTrace,'```','');
      if(material?.documents) out.push('### Verwacht bewijs / documenten', material.documents, '');
      if(material?.observation) out.push('### Voorgestelde observatie / verificatie', material.observation, '');
      out.push(...exportBranches(line, draft));
      if (draft.notes[line.id]) out.push('### Uw auditnotities', draft.notes[line.id], '');
      out.push(line.sourceControlId ? 'Nederlandse bronbewerking; auditvragen, risico’s en toetsaanpak zijn eigen voorstellen. Geen huidige werking onderzocht.' : 'Eigen uitwerking; geen letterlijke bronnorm of huidige bevinding.','');
      continue;
    }
    out.push(
      `## ${line.id} — ${line.title}`,
      `Organisatiecontext: ${line.entity}`,
      ...(framework.reports ? [`Bronrapport: ${reportForLine(framework, line).title}`] : []),
      ...(['BEGVOORB25','HVP25','BSA2324','F35V25'].includes(line.report_id) && line.exportContext ? ['Context en beperkingen bij dit punt: '+line.exportContext] : []),
      "",
    );
    for (const key of Object.keys(labels)) {
      // Virtual reuse proposals must not silently change the original source export.
      // Adopted building blocks above already carry their explicit control objective.
      if(key==='controlObjective' && (!draftValue(line,key,draft) || (!line.controlObjective && !Object.hasOwn(draft.overrides?.[line.id] || {},key))))continue;
      out.push(`### ${labels[key]}`);
      for (const field of sourceFields(line, key).filter((f) =>
        fieldIncluded(draft, line.id, f.id),
      )) {
        out.push(
          draftValue(line, field.id, draft),
          "",
          `Status: ${isEdited(line, field.id, draft) ? basisLabels.USER_PROPOSAL : basisLabels[field.basis]}. Historische aanknopingspunten: ${field.evidence_ids.join(", ") || "niet vastgesteld"}.`,
          field.reason,
          "",
        );
        if (isEdited(line, field.id, draft))
          out.push(`Oorspronkelijke formulering: ${field.text}`, "");
      }
    }
    if (draft.excludedFields?.[line.id]?.length)
      out.push(
        "Geselecteerde brononderdelen: eigen afbakening. Niet opgenomen veld-ID’s: " +
          draft.excludedFields[line.id].join(", ") +
          ". Relaties en controlbeoordelingen hieronder blijven de oorspronkelijke bronanalyse; beoordeel de samenhang van uw selectie opnieuw.",
        "",
      );
    out.push("### Relaties", "");
    for (const r of sourceRelations(line)) {
      const stale = isEdited(line, r.from, draft) || isEdited(line, r.to, draft);
      out.push(
        `- ${labels[r.from] ?? r.from} → ${labels[r.to] ?? r.to}: ${r.relation}. ${stale ? "HERBEOORDELEN na uw aanpassing" : basisLabels[r.basis]}. ${r.reason} [${r.evidence_ids.join(", ")}]`,
      );
    }
    out.push("", "### Historische controlbeoordeling (ongewijzigde broncontrol)", "");
    for (const [key, s] of Object.entries(line.controlStatus))
      out.push(
        `- ${{ design: "Opzet", implementation: "Bestaan / invoering", operation: "Werking" }[key]}: ${statusLabels[s.value] ?? s.value}. ${s.explanation} [${s.evidence_ids.join(", ")}]`,
      );
    out.push(...exportBranches(line, draft));
    if (draft.notes[line.id]) out.push("", "### Uw auditnotities", draft.notes[line.id]);
    out.push("");
  }
  const relevantPatterns = framework.patterns.filter((p) =>
    p.line_ids.every((id) => draft.included.includes(id)),
  );
  out.push(
    "## Historische patroonvoorstellen",
    "",
    "Onderstaande analyse betreft het oorspronkelijke historische bronkader, niet uw aanpassingen. Eén bronrapport; geen bewezen cross-reportpatronen.",
    "",
  );
  for (const p of relevantPatterns)
    out.push(
      `### ${p.title}`,
      p.observation,
      `Grens: ${p.boundary}`,
      `Tegenevidence/nuance: ${p.counterevidence}`,
      `Bronrapporten: ${p.report_count}. Kaderlijnen: ${p.line_ids.join(", ")}. Bewijs: ${p.evidence_ids.join(", ")}.`,
      "",
    );
  out.push("## Bronregister", "");
  const used = new Set([
    ...framework.lines.filter((l) => draft.included.includes(l.id)).flatMap(sourceEvidenceIds),
    ...relevantPatterns.flatMap((p) => p.evidence_ids),
  ]);
  for (const e of framework.evidence.filter((e) => used.has(e.id)))
    out.push(
      `### ${e.id} — ${framework.reports ? reportForEvidence(framework, e).title : "H01"} p. ${e.page}, tekens ${e.start}–${e.end} · ${e.role}`,
      e.quote
        .split("\n")
        .map((l) => "> " + l)
        .join("\n"),
      "",
    );
  out.push(
    "## Grenzen en ontbrekende onderbouwing",
    "",
    ...framework.gaps.map((g) => "- " + g),
    ...framework.limitations.map((g) => "- " + g),
  );
  const text = out.join("\n");
  return framework.reports ? text.replace(/^## (K\d+) —/gm, "## H01-$1 —") : text;
}
import { admittedLines, assertScopeExport } from "./product-scope.mjs";
import { applicabilityGroups, applicabilityLabels } from "./applicability.mjs";
import { importedFoundationItems, importedFoundationMetadata } from "./foundations/registry.mjs";
