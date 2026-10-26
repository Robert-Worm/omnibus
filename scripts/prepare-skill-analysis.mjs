import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { analysisSkillBasis, checkAnalysis, prepareAnalysis } from "../content-tools/analysis-only.mjs";

export async function runAnalysisCommand(args) {
  if (args.length === 2 && args[0] === "basis") return analysisSkillBasis(args[1]);
  if (args.length === 6 && args[0] === "prepare" && args[2] === "--expect-sha256" && args[4] === "--run")
    return prepareAnalysis(args[1], { expectedSha256: args[3], runId: args[5] });
  if (args.length === 4 && args[0] === "check" && args[2] === "--expect-sha256")
    return checkAnalysis(args[1], { expectedSha256: args[3] });
  throw Error("Usage: node scripts/prepare-skill-analysis.mjs basis <skill> | prepare <plan.json> --expect-sha256 <retained-plan-hash> --run <new-run-id> | check <analysis.json> --expect-sha256 <retained-analysis-hash>");
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { console.log(JSON.stringify(await runAnalysisCommand(process.argv.slice(2)), null, 2)); }
  catch (error) {
    console.error(JSON.stringify({ status: "HOLD", analysisOnly: true, admitted: false, publishable: false,
      error: error.message }, null, 2));
    process.exitCode = 1;
  }
}
