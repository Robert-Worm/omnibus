import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { readEvidencePlan, collectEvidence } from "./evidence.mjs";
import { saveEvidence } from "./evidence-store.mjs";
import { WorkbenchStore } from "./store.mjs";

let store;
try {
  const args = process.argv.slice(2);
  if (args.length !== 4 || args[0] !== "--database" || args[2] !== "--plan")
    throw Error(
      "Use: content:link-evidence -- --database <workbench.sqlite> --plan <private-plan.json>",
    );
  if (!existsSync(args[1])) throw Error("Import the backlog first.");
  const input = readEvidencePlan(resolve(args[3]));
  store = new WorkbenchStore(resolve(args[1]));
  const sources = store.db.prepare("SELECT id,title,date,url FROM sources").all();
  const batch = await collectEvidence(input, sources);
  const saved = saveEvidence(store.db, batch);
  console.log(
    JSON.stringify(
      {
        checkedAt: saved.checkedAt,
        counts: saved.counts,
        results: saved.results.map((r) => ({
          label: r.label,
          type: r.type,
          status: r.status,
          matched: r.matched,
          unmatched: r.unmatched?.length,
          message: r.message,
        })),
      },
      null,
      2,
    ),
  );
  if (saved.results.some((r) => r.status === "failed")) process.exitCode = 1;
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  store?.close();
}
