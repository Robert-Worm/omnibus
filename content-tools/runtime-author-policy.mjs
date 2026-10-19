// Migration boundary for the trusted private authoring checkout, not an extractor
// for uploaded JavaScript. Names only: source text must never be copied here.
export const initializerFields = {
  'cev-content': ['cevMetadata', 'indicatorContent', 'levelWording'],
  'cio-phase-editorial': [],
  'cio-question-detail': ['cioBroadQuestionGroups', 'cioSpecificQuestions'],
  'control-objectives': ['controlObjectives', 'objectiveAssignments'],
  'export-presets': ['kapteinSource', 'softControlExample'],
  'foundation-reference-only': ['referenceOnlySources', 'isoRiskHistoricalReferences', 'ismsHistoricalReferences', 'cobitHistoricalReferences'],
  'foundations/cio-execution-review': ['cioInitialExecutionMerges', 'cioFollowupExecutionMerges'],
  'foundations/cio-source-review': ['cioAdditionalRefs', 'cioCommentaryPassages', 'cioPreferredPassages', 'cioAdditionalPages'],
  'foundations/cio-titles': ['cioGroupTitles', 'cioCriterionTitles'],
  'foundations/digid-reference-data': ['digidSupplementSources', 'historicalDigiDReferences'],
  'foundations/dorafc-context': [],
  'foundations/group-definitions': ['cioGroupDescriptions', 'topicalDescriptions'],
  'foundations/iso27001-reference-data': ['ismsAmendment'],
  'foundations/suwi-reference-data': ['suwiLocations', 'historicalSuwiReferences'],
  'interview-practice-review': ['previousKotterBarrier'],
  'model-choice-guide': ['guides', 'summaries'],
  'process-catalogue': ['processes', 'processResearchTopics', 'sourceDomains'],
  'question-formulations': ['clauses'],
  'report-about-content': ['themes', 'audiences', 'curated'],
  'report-point-adapter': ['generic'],
  // Reviewed report groups are appended by the runtime adapter: keep only the seed.
  'research-flow': ['groups'],
  'theme-workspaces': ['presets'],
  'wwke-readable-criteria': ['wwkeReadableCriteria'],
};

// These maps include role-specific additions made after their initializers.
export const finalFields = {'point-interview': ['cioTopics', 'wwkeTopics']};
