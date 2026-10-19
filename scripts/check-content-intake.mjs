import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { checkIntake, intakeFailure } from "../content-tools/intake.mjs";

/** @param {string[]} args */
export async function runIntakeCommand(args) {
  const historicalReport = args.length === 4 && args[3] === "--historical-report";
  if ((args.length !== 1 && !((args.length === 3 || historicalReport) && args[1] === "--expect-sha256")) || args[0]?.startsWith("--")) {
    throw new Error("Usage: node scripts/check-content-intake.mjs <manifest.json> [--expect-sha256 <trusted-hash> [--historical-report]]");
  }
  return checkIntake(args[0], { expectedSha256: args[2], historicalReport });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    console.log(JSON.stringify(await runIntakeCommand(process.argv.slice(2)), null, 2));
  } catch (error) {
    console.error(JSON.stringify(intakeFailure(error, "check", process.argv.at(-1) === "--historical-report"), null, 2));
    process.exitCode = 1;
  }
}
