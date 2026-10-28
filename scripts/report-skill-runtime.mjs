// Copy reviewed public implementation files when preparing a standalone skill.
// No generated runtime is tracked; the application keeps its existing modules.
export const reportSkillRuntimeFiles = [
  ...["identity", "intake", "local-source-review", "local-source-passages", "local-source-structure",
    "local-source-method", "source-evidence-reader", "local-report-method", "standalone-report-method",
    "local-framework-method", "local-report-viewer", "local-framework-viewer", "baseline-registry-counts", "question-review-validation"]
    .map(name => `content-tools/${name}.mjs`),
  ...["law-source-reader", "source-text-blocks", "admitted-foundation", "question-quality-review", "question-quality", "source-question-plan"]
    .map(name => `lib/${name}.mjs`),
  ...["report-stages", "baseline-registry-counts", "taxonomy-snapshot"].map(name => `skills/omnibus-add-report/scripts/${name}.mjs`),
  "scripts/prepare-content-intake.mjs", "scripts/check-content-intake.mjs",
];
