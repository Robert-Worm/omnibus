import { labels, updateValue, validateDraft } from "./framework-model.mjs";
import { admittedLines, scopeDecision } from "./product-scope.mjs";
import {sourceElement} from './framework-source-items.mjs';
export function createFrameworkTools(framework, api) {
  return [
    {
      name: "read_framework_draft",
      title: "Lees lokaal auditkader",
      description:
        "Read the local draft and immutable source-basis metadata. Content is historical evidence or user proposals, not authoritative current norms.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute() {
        const draft = api.getDraft();
        return {
          draft,
          report_count: framework.reports?.length ?? 1,
          source_year: framework.report.year,
          lines: admittedLines(framework).map((l) => ({
            id: l.id,
            title: l.title,
            basis: Object.fromEntries(Object.keys(labels).map((k) => [k, sourceElement(l,k).basis])),
          })),
          cross_report_patterns_established: false,
        };
      },
    },
    {
      name: "update_framework_draft",
      title: "Wijzig lokaal auditconcept",
      description:
        "Update selected draft fields after user authorization. Changes remain user proposals; original evidence is not modified and affected relationships need reassessment. No publication or submission occurs.",
      inputSchema: {
        type: "object",
        properties: {
          changes: {
            type: "array",
            minItems: 1,
            maxItems: 100,
            items: {
              type: "object",
              properties: {
                line_id: { type: "string" },
                field: { type: "string", enum: Object.keys(labels) },
                text: { type: "string", maxLength: 10000 },
              },
              required: ["line_id", "field", "text"],
              additionalProperties: false,
            },
          },
        },
        required: ["changes"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute(input) {
        if (
          !input ||
          typeof input !== "object" ||
          Array.isArray(input) ||
          Object.keys(input).some((k) => k !== "changes") ||
          !Array.isArray(input.changes) ||
          input.changes.length < 1 ||
          input.changes.length > 100
        )
          throw new Error("Ongeldige reeks bewerkingen.");
        let next = validateDraft(api.getDraft(), framework);
        for (const change of input.changes) {
          if (
            !change ||
            typeof change !== "object" ||
            Object.keys(change).some((k) => !["line_id", "field", "text"].includes(k))
          )
            throw new Error("Ongeldige bewerking.");
          const line = framework.lines.find((l) => l.id === change.line_id);
          if (!line || scopeDecision(framework, line).status !== "retain")
            throw new Error("Onbekende kaderlijn of buiten de productscope.");
          next = updateValue(next, line, change.field, change.text);
        }
        const stored = api.apply(next);
        return {
          updated_fields: input.changes.length,
          local_storage_saved: stored,
          provenance: "USER_PROPOSAL",
          affected_relationships_require_review: true,
        };
      },
    },
  ];
}
export function registerFrameworkTools(context, tools, onError) {
  if (!context?.registerTool) return () => {};
  const lifecycle = new AbortController();
  for (const tool of tools) {
    try {
      void Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(onError);
    } catch (e) {
      onError(e);
    }
  }
  return () => lifecycle.abort();
}
