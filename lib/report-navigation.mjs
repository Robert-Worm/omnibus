import { normId } from "./norm-navigation.mjs";
import {reportSummaries} from './catalogue-summary.mjs';
// Search actual report membership, never infer ownership by splitting a norm ID.
export function reportMatchesQuery(framework, query) {
  const terms = query.trim().toLocaleLowerCase("nl").split(/\s+/).filter(Boolean);
  const text = [
    framework.report.id,
    framework.report.title,
    String(framework.report.year),
    ...(reportSummaries[framework.report.id]?.normIds??framework.lines.map(l=>l.id)).flatMap(id=>[id,normId(id)]),
  ]
    .join(" ")
    .toLocaleLowerCase("nl");
  return terms.every((term) => text.includes(term));
}
