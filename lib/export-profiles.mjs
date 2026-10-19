/** Interface workforms, not source content or saved research data.
 * @typedef {{id:'testing'|'risk'|'interview',title:string,description:string,sheet:string,required:'criterion'|'risk'|'interview',fields:string[]}} ExportPreset
 */
/** @type {ExportPreset[]} */
export const exportPresets = [
  {
    id: "testing",
    title: "Normtoetsing",
    description: "Normen toetsen, bewijs vastleggen en een oordeel vormen.",
    sheet: "Toetskader",
    required: "criterion",
    fields: [
      "category",
      "controlObjective",
      "control",
      "criterion",
      "source",
      "location",
      "procedure",
      "observation",
      "evidenceLocation",
      "verdict",
      "tester",
      "testedOn",
      "status",
      "comments",
    ],
  },
  {
    id: "risk",
    title: "Risico-controlmatrix",
    description: "Van doel en risico naar beheersing en toetsing.",
    sheet: "Risico-controlmatrix",
    required: "risk",
    // Keep the norm beside the test point before goal, risk and controls.
    fields: [
      "criterion",
      "objective",
      "risk",
      "controlObjective",
      "control",
      "owner",
      "auditQuestion",
      "procedure",
      "documentation",
      "source",
      "location",
    ],
  },
  {
    id: "interview",
    title: "Interviewleidraad",
    description: "Onderwerpen verkennen met vragen, voorbeelden en doorvragen.",
    sheet: "Interviewleidraad",
    required: "interview",
    // The background sheet keeps saved wording; this column follows the register.
    fields: ["criterion", "objective", "interview", "documentation", "source", "location", "comments"],
  },
];

/** @param {string} [profile]
 * @param {Record<string,unknown> & {fields?:string[]|null}} [options] */
export function presetOptions(profile = "testing", options = {}) {
  const preset = exportPresets.find((p) => p.id === profile);
  if (!preset) throw new Error("Kies een ondersteund exporttype.");
  const fields = options.fields ?? preset.fields;
  return {
    ...options,
    profile,
    fields,
    requiredField: preset.required,
    fieldOrder: [...new Set([...preset.fields, ...fields, preset.required])],
    registerTitle: preset.sheet,
  };
}
