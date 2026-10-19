import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { WorkbenchStore } from "./store.mjs";

export function runImport(args) {
  if (args.length !== 6 || args[0] !== "--database" || args[2] !== "--csv" || args[4] !== "--label")
    throw Error(
      "Gebruik: content:backlog-import -- --database <workbench.sqlite> --csv <export.csv> --label <collectie>",
    );
  const path = resolve(args[3]);
  if (!statSync(path).isFile() || statSync(path).size > 32 * 1024 * 1024)
    throw Error("CSV-bestand ontbreekt of is groter dan 32 MB.");
  const bytes = readFileSync(path);
  const store = new WorkbenchStore(resolve(args[1]));
  try {
    return store.importCsv(bytes, { label: args[5], path });
  } finally {
    store.close();
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    console.log(JSON.stringify(runImport(process.argv.slice(2)), null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
