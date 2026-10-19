import { digest } from "./identity.mjs";

export const MODEL_REVIEW_VERSION = 1;
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
  if (!model || !identifier(model.id) || !nonempty(model.title) || !Array.isArray(model.items))
    return {
      schemaVersion: MODEL_REVIEW_VERSION,
      status: "HOLD",
      errors: [{ code: "MODEL_SHAPE", message: "Model id, title and items are required." }],
      warnings,
      targets,
    };

  addTarget({ id: model.id, kind: "model", title: model.title, text: model.question ?? "" });
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
      const variants = question.variants ?? {};
      if (typeof variants !== "object" || Array.isArray(variants)) {
        issue(errors, "VARIANTS_SHAPE", question.id, "Variants must be keyed by level.");
        continue;
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
