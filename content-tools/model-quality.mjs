import { digest } from "./identity.mjs";
import { questionFormulationEntries } from "../lib/interview-wording.mjs";
import { modelResearchInventory } from "./model-research-inventory.mjs";

export const MODEL_REVIEW_VERSION = 3;
export const REVIEW_ASPECTS = Object.freeze({
  theory: ["construct", "sourceFidelity", "coverage", "interpretationLimits"],
  practical: ["neutrality", "singleFocus", "answerability", "plainLanguage", "levelFit"],
});
const levels = new Set(["operational", "management", "strategic"]);
const nonempty = (value) => typeof value === "string" && value.trim().length > 0;
const identifier = (value) => nonempty(value) && /^[A-Za-z0-9_-]+$/.test(value);

/** Read-only authoring aid. It never edits, selects or approves catalogue data. */
export function prepareModelReview(model, { sourceEvidence = [] } = {}) {
  const errors = [],
    warnings = [],
    targets = [],
    seen = new Set(),
    wording = new Map();
  const issue = (list, code, target, message) => list.push({ code, target, message });
  const addTarget = (target) => {
    if (seen.has(target.id))
      issue(errors, "DUPLICATE_TARGET", target.id, "Review target is not unique.");
    seen.add(target.id);
    targets.push(target);
  };
  // One target per authored line, retaining exact text and its opening/level.
  // Do not split on punctuation: a probe may contain an example or abbreviation.
  const addProbes = (text, parentId, context) => {
    if (text === undefined) return;
    if (typeof text !== "string") {
      issue(errors, "PROBES_SHAPE", parentId, "Probes must be text.");
      return;
    }
    text.split(/\r\n|\n|\r/u).forEach((line, index) => {
      if (line.trim()) addTarget({ id: `${parentId}/probes/${index + 1}`,
        kind: "probe", parentId, ...context, text: line });
    });
  };
  if (!model || !identifier(model.id) || !nonempty(model.title) || !Array.isArray(model.items))
    return {
      schemaVersion: MODEL_REVIEW_VERSION,
      status: "HOLD",
      errors: [{ code: "MODEL_SHAPE", message: "Model id, title and items are required." }],
      warnings,
      targets,
    };

  addTarget({ id: model.id, kind: "model", title: model.title, text: model.question ?? "" });
  if (!nonempty(model.question)) issue(errors, "EMPTY_QUESTION", model.id, "Central research question is empty.");
  // Grouped research questions are authored questions, not mere model metadata.
  // Review their exact coverage as well as their wording; never infer links from
  // titles or from the viewer's placeholder indicators for old saved projects.
  if (model.researchSubquestions !== undefined) {
    const subs = model.researchSubquestions;
    const indicators = new Set(model.items.flatMap(item =>
      Array.isArray(item?.indicators) ? item.indicators.map(i => i?.id) : []).filter(identifier));
    if (!Array.isArray(subs) || !subs.length || subs.length > 50) {
      issue(errors, "RESEARCH_SUBQUESTIONS_SHAPE", model.id, "Research subquestions must be a nonempty list of at most 50 questions.");
    } else for (const sub of subs) {
      if (!sub || !identifier(sub.id) || !nonempty(sub.question) ||
          !Array.isArray(sub.indicatorIds) || !sub.indicatorIds.length ||
          new Set(sub.indicatorIds).size !== sub.indicatorIds.length ||
          sub.indicatorIds.some(id => !indicators.has(id))) {
        issue(errors, "RESEARCH_SUBQUESTION", model.id, "Research subquestions need text, stable identities and explicit known indicator links.");
        continue;
      }
      addTarget({ id: `${model.id}/researchSubquestions/${sub.id}`, kind: "research-question",
        title: sub.title ?? "", text: sub.question, indicatorIds: [...sub.indicatorIds] });
    }
  }
  if (!model.items.length) issue(errors, "NO_DIMENSIONS", model.id, "No dimensions to review.");
  for (const item of model.items) {
    if (!item || !identifier(item.id) || !nonempty(item.title)) {
      issue(errors, "DIMENSION_SHAPE", model.id, "Dimension id and title are required.");
      continue;
    }
    if (item.indicators !== undefined && !Array.isArray(item.indicators)) {
      issue(errors, "INDICATORS_SHAPE", item.id, "Indicators must be an array.");
      continue;
    }
    addTarget({
      id: `${model.id}/${item.id}`,
      kind: "dimension",
      title: item.title,
      text: item.definition ?? item.question ?? "",
      indicatorIds: (item.indicators ?? []).map((i) => i?.id ?? null),
    });
    const openingId = `${model.id}/${item.id}/question`;
    if (nonempty(item.question)) addTarget({ id: openingId, kind: "question",
      dimensionId: item.id, level: "dimension", text: item.question });
    else issue(errors, "EMPTY_QUESTION", openingId, "Dimension question is empty.");
    addProbes(item.probes, openingId, { dimensionId: item.id, level: "dimension" });
    if (item.researchQuestion !== undefined) {
      if (nonempty(item.researchQuestion)) addTarget({ id: `${model.id}/${item.id}/researchQuestion`,
        kind: "research-question", dimensionId: item.id, text: item.researchQuestion });
      else if (typeof item.researchQuestion !== "string")
        issue(errors, "RESEARCH_QUESTION_SHAPE", item.id, "Research question must be text.");
    }
    const indicatorIds = new Set();
    for (const indicator of item.indicators ?? []) {
      if (!indicator || !identifier(indicator.id) || indicatorIds.has(indicator.id))
        issue(errors, "INDICATOR_ID", item.id, "Indicator id is missing or duplicated.");
      else indicatorIds.add(indicator.id);
    }
    if (!Array.isArray(item.questions) || !item.questions.length) {
      issue(errors, "NO_QUESTIONS", item.id, "No questions for this dimension.");
      continue;
    }
    for (const question of item.questions) {
      if (!question || !identifier(question.id) || !question.id.startsWith(item.id + "-")) {
        issue(errors, "QUESTION_ID", item.id, "Question id must belong to its dimension.");
        continue;
      }
      if (question.dimensionId !== undefined && question.dimensionId !== item.id)
        issue(errors, "DIMENSION_LINK", question.id, "Question links to another dimension.");
      if (question.indicatorId && !indicatorIds.has(question.indicatorId))
        issue(errors, "INDICATOR_LINK", question.id, "Question links to an unknown indicator.");
      if (!nonempty(question.title))
        issue(errors, "QUESTION_TITLE", question.id, "Question title is empty.");
      // Match the existing viewer restoration of an omitted variant map. This
      // does not invent a management/strategic variant or approve applicability.
      const variants = question.variants ?? { operational: question.question };
      if (typeof variants !== "object" || Array.isArray(variants)) {
        issue(errors, "VARIANTS_SHAPE", question.id, "Variants must be keyed by level.");
        continue;
      }
      if (Object.hasOwn(question, "formulations")) {
        try {
          for (const [level, rows] of Object.entries(questionFormulationEntries(question.formulations))) {
            if (!nonempty(variants[level]) || !rows.includes(variants[level])) {
              issue(errors, "FORMULATION_BASE", question.id, "Alternatives must include their exact offered level opening.");
              continue;
            }
            rows.forEach((text, index) => {
              if (text === variants[level]) return; // Already a separately reviewed opening.
              const id = `${model.id}/${item.id}/${question.id}/${level}/formulations/${index + 1}`;
              addTarget({id, kind:"formulation", dimensionId:item.id, questionId:question.id,
                indicatorId:question.indicatorId ?? null, level, text, base:variants[level]});
              addProbes(question.probes, id, {dimensionId:item.id, questionId:question.id,
                indicatorId:question.indicatorId ?? null, level});
            });
          }
        } catch { issue(errors, "FORMULATIONS_SHAPE", question.id, "Invalid explicit interview alternatives."); }
      }
      for (const [level, text] of [["default", question.question], ...Object.entries(variants)]) {
        const id = `${model.id}/${item.id}/${question.id}/${level}`;
        if (level !== "default" && !levels.has(level))
          issue(errors, "UNKNOWN_LEVEL", id, "Unsupported interview level.");
        if (!nonempty(text)) {
          issue(errors, "EMPTY_QUESTION", id, "Question text is empty.");
          continue;
        }
        addTarget({
          id,
          kind: "question",
          dimensionId: item.id,
          questionId: question.id,
          indicatorId: question.indicatorId ?? null,
          level,
          text,
          probes: question.probes ?? "",
          purpose: question.purpose ?? "",
          origin: question.origin ?? "UNSPECIFIED",
        });
        addProbes(question.probes, id, { dimensionId: item.id, questionId: question.id,
          indicatorId: question.indicatorId ?? null, level });
        const normalized = text
          .normalize("NFC")
          .toLocaleLowerCase("nl")
          .replace(/\s+/gu, " ")
          .trim();
        const duplicateKey = `${level}:${normalized}`;
        if (wording.has(duplicateKey))
          issue(
            warnings,
            "DUPLICATE_WORDING",
            id,
            `Compare with ${wording.get(duplicateKey)}; duplication is not automatically wrong.`,
          );
        else wording.set(duplicateKey, id);
        if (/^(is|zijn|heeft|hebben|wordt|worden|vindt|bent)\b/iu.test(text.trim()))
          issue(
            warnings,
            "POSSIBLY_CLOSED",
            id,
            "Review whether this invites an account rather than only yes/no.",
          );
        if (text.length > 350)
          issue(warnings, "LONG_QUESTION", id, "Review reading load and separable questions.");
        if (question.origin === undefined)
          issue(
            warnings,
            "ORIGIN_UNSPECIFIED",
            id,
            "Record whether this is an authored prompt, translation or original instrument item.",
          );
      }
    }
  }
  const evidenceIds = new Set();
  if (!Array.isArray(sourceEvidence))
    issue(errors, "SOURCE_EVIDENCE_SHAPE", model.id, "Source evidence must be an array.");
  else
    for (const source of sourceEvidence) {
      if (
        !source ||
        !identifier(source.id) ||
        evidenceIds.has(source.id) ||
        !/^[a-f0-9]{64}$/.test(source.sha256 ?? "")
      )
        issue(
          errors,
          "SOURCE_EVIDENCE",
          model.id,
          "Each frozen source needs a unique id and exact SHA-256.",
        );
      else evidenceIds.add(source.id);
    }
  if (!evidenceIds.size)
    issue(
      warnings,
      "SOURCE_REVIEW_REQUIRED",
      model.id,
      "Freeze and inspect the actual model publications before semantic acceptance.",
    );
  // Review the same derived route the viewer offers, not only stored fields.
  // Versioned identities retain each cycler and its explicit selection coverage.
  if (!errors.length) {
    try {
      const offered = modelResearchInventory(model);
      if (!offered.length) throw Error('Missing research route');
      for (const q of offered) {
        if (!nonempty(q.text)) throw Error('Empty research route question');
        addTarget({id:q.targetId,kind:'research-route',parentId:q.id,index:q.index,text:q.text,
          ...(q.indicatorIds ? {indicatorIds:[...q.indicatorIds]} : {}),
          ...(q.materialIds ? {materialIds:[...q.materialIds]} : {})});
      }
    } catch {
      issue(errors, 'RESEARCH_ROUTE', model.id, 'Offered research questions and coverage could not be inventoried.');
    }
  }
  const basis = {
    schemaVersion: MODEL_REVIEW_VERSION,
    modelHash: digest(model),
    sourceEvidence,
    targets,
  };
  return {
    ...basis,
    basisHash: digest(basis),
    status: errors.length ? "HOLD" : "STRUCTURAL_PASS_REVIEW_REQUIRED",
    errors,
    warnings,
    humanValidation: false,
  };
}

/** Validate review receipts, not their truth. The coordinator must verify actors
 * and actual source reading independently; no UI or publication calls live here. */
export function checkModelReviews(prepared, reviews, { authorIds = [] } = {}) {
  const errors = [];
  if (prepared.schemaVersion !== MODEL_REVIEW_VERSION)
    errors.push("Current model review basis required; review newly covered questions, probes and research routes.");
  if (prepared.status !== "STRUCTURAL_PASS_REVIEW_REQUIRED" || prepared.errors?.length)
    errors.push("Structural checks must pass.");
  const basis = {
    schemaVersion: prepared.schemaVersion,
    modelHash: prepared.modelHash,
    sourceEvidence: prepared.sourceEvidence,
    targets: prepared.targets,
  };
  if (digest(basis) !== prepared.basisHash) errors.push("Review basis was modified.");
  if (!prepared.sourceEvidence?.length) errors.push("Frozen source evidence is required.");
  if (!authorIds.length || authorIds.some((id) => !nonempty(id)))
    errors.push("Actual author identities are required.");
  const actors = new Set(),
    expectedIds = new Set(prepared.targets?.map((t) => t.id));
  if (!Array.isArray(reviews))
    return {
      status: "HOLD",
      errors: [...errors, "Reviews must be an array."],
      humanValidation: false,
    };
  if (reviews.length !== Object.keys(REVIEW_ASPECTS).length)
    errors.push("Exactly one theory and one practical review are required.");
  for (const [role, aspects] of Object.entries(REVIEW_ASPECTS)) {
    const matches = reviews.filter((review) => review?.role === role),
      review = matches[0];
    if (matches.length !== 1) {
      errors.push(`Missing or duplicate ${role} review.`);
      continue;
    }
    if (
      !nonempty(review.actorId) ||
      actors.has(review.actorId) ||
      authorIds.includes(review.actorId)
    )
      errors.push(`${role}: reviewer must be distinct from authors and the other reviewer.`);
    actors.add(review.actorId);
    if (
      review.basisHash !== prepared.basisHash ||
      review.decision !== "APPROVE" ||
      review.humanValidation !== false
    )
      errors.push(`${role}: exact basis and explicit AI review status required.`);
    if (!Array.isArray(review.unresolvedIssues) || review.unresolvedIssues.length)
      errors.push(`${role}: unresolved issues or missing issue list.`);
    const assessments = Array.isArray(review.assessments) ? review.assessments : [];
    const ids = new Set(assessments.map((a) => a?.targetId));
    if (
      ids.size !== assessments.length ||
      ids.size !== expectedIds.size ||
      [...ids].some((id) => !expectedIds.has(id))
    )
      errors.push(`${role}: assess every exact target once.`);
    for (const assessment of assessments) {
      if (assessment?.decision !== "APPROVE" || !nonempty(assessment?.reason))
        errors.push(`${role}: missing substantive decision.`);
      for (const aspect of aspects)
        if (!nonempty(assessment?.aspects?.[aspect]))
          errors.push(`${role}: missing ${aspect} assessment.`);
    }
  }
  return {
    status: errors.length ? "HOLD" : "READY_FOR_INTEGRATION_REVIEW",
    errors,
    humanValidation: false,
  };
}
