import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { prepareIntake, intakeFailure } from "../content-tools/intake.mjs";

/** @param {string[]} args */
export async function runPrepareIntakeCommand(args) {
  const historicalReport = args.length === 4 && args[3] === "--historical-report";
  if ((!historicalReport && args.length !== 3) || args[1] !== "--output" || args[0].startsWith("--") || args[2].startsWith("--")) {
    throw new Error("Usage: node scripts/prepare-content-intake.mjs <plan.json> --output <new-intake.json> [--historical-report]");
  }
  return prepareIntake(args[0], args[2], { historicalReport });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    console.log(JSON.stringify(await runPrepareIntakeCommand(process.argv.slice(2)), null, 2));
  } catch (error) {
    console.error(JSON.stringify(intakeFailure(error, "prepare", process.argv.at(-1) === "--historical-report"), null, 2));
    process.exitCode = 1;
  }
}
