// This verifies retained observations and custody, not that an AI really read a
// page. The independently pinned coordinator receipts remain the trust boundary.
import { sourceEvidenceReader } from "./source-evidence-reader.mjs";
import { checkReportMethod } from "./local-report-method.mjs";
import { checkFrameworkMethod } from "./local-framework-method.mjs";

export function checkLocalSourceMethod(kind, context, proof) {
  const evidence = sourceEvidenceReader(context, proof);
  const result = kind === "report" ? checkReportMethod(evidence) : checkFrameworkMethod(evidence);
  return { ...result, firstReceiptSha256: proof.firstReceipt.sha256, finalReceiptSha256: proof.finalReceipt.sha256,
    actualReading: "COORDINATOR_ATTESTATION", humanValidation: false, activationPerformed: false };
}
