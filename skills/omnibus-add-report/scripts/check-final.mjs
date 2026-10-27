// Read-only end check. An installed skill needs only Node, not Omnibus or a DB.
import { parseArgs } from "node:util";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const need = (ok, message) => { if (!ok) throw Error(message); };
const isHash = value => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);

export async function checkReportFinal(options) {
  need(typeof options.intake === "string" && typeof options.evidence === "string" &&
    isHash(options.intakeSha256) && isHash(options.evidenceSha256), "Intake, evidence plan and independently retained SHA256 hashes required");
  let intake, review, evidence, members;
  try {
    [intake, review, evidence, members] = await Promise.all([
      import("./runtime/content-tools/intake.mjs"), import("./runtime/content-tools/local-source-review.mjs"),
      import("./runtime/content-tools/source-evidence-reader.mjs"), import("./runtime-members.mjs"),
    ]);
  } catch { throw Error("Complete prepared skill required; scripts/runtime is missing or invalid. Request an installed skill bundle."); }
  const planFile = await intake.readVerifiedFile(resolve(options.evidence), intake.intakeLimits.manifestBytes, { collect: true });
  need(planFile.sha256 === options.evidenceSha256, "Evidence plan differs from externally retained hash");
  const plan = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(planFile.data));
  evidence.exactKeys(plan, ["authorIds", "sourceEvidence"], "final check plan");
  const { manifest, files, check } = await intake.readIntakeSnapshot(options.intake, { expectedSha256: options.intakeSha256 });
  need(manifest.package.kind === "report", "Standalone end check supports report packages only");
  const context = { ...review.localSourceSnapshot(manifest, files), manifest, files };
  const retained = evidence.sourceEvidenceReader(context, plan.sourceEvidence);
  need(retained.final.receipt_kind === "standalone-stage-custody-v1", "Standalone final custody required");
  const release = retained.pinned(plan.sourceEvidence.release.manifest);
  // Verify executing code against the independent release. Never run packet code.
  for (const name of ["scripts/check-final.mjs", "scripts/runtime-members.mjs", ...members.reportSkillRuntimeFiles.map(file => "scripts/runtime/" + file)]) {
    const actual = await intake.readVerifiedFile(fileURLToPath(new URL("../" + name, import.meta.url)), intake.intakeLimits.fileBytes);
    need(release.files?.[name] === actual.sha256, "Executing end checker is not in the approved release: " + name);
  }
  const result = review.checkLocalSourceReview(manifest, files, plan.authorIds, plan.sourceEvidence);
  need(result.sourceMethodValidated === true, "Complete source-method evidence required");
  return { ...result, status: "REPORT_FINAL_CHECKED_REVIEW_REQUIRED", intakeSha256: check.manifestSha256,
    evidenceSha256: planFile.sha256, contentValidated: false, humanValidation: false, activationPerformed: false };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const { values } = parseArgs({ options: Object.fromEntries(["intake", "expect-sha256", "evidence", "evidence-sha256"].map(name => [name, { type: "string" }])) });
    console.log(JSON.stringify(await checkReportFinal({ intake: values.intake, intakeSha256: values["expect-sha256"],
      evidence: values.evidence, evidenceSha256: values["evidence-sha256"] }), null, 2));
  } catch (error) {
    console.error(JSON.stringify({ status: "HOLD", publishable: false, contentValidated: false, reviewValidated: false,
      error: error instanceof Error ? error.message : "End check failed" }, null, 2));
    process.exitCode = 1;
  }
}
