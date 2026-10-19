import { DatabaseSync, backup } from "node:sqlite";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import {
  constants,
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { z } from "zod";

const tables = [
  "workbench_schema",
  "sources",
  "imports",
  "import_rows",
  "progress",
  "events",
  "evidence_runs",
  "evidence_links",
];
const digest = z.string().regex(/^[a-f0-9]{64}$/);
const receiptSchema = z
  .object({
    format: z.literal("omnibus-workbench-backup"),
    version: z.literal(1),
    createdAt: z.string().datetime(),
    database: z.literal("backlog.sqlite"),
    sha256: digest,
    counts: z
      .object(Object.fromEntries(tables.map((name) => [name, z.number().int().nonnegative()])))
      .strict(),
  })
  .strict();
const hashBytes = (bytes) => createHash("sha256").update(bytes).digest("hex");

async function hashFile(path) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}
function regularFile(path) {
  if (!lstatSync(path).isFile())
    throw Error("Gebruik een gewoon bestand, geen map of bestandslink.");
}
function openReadOnly(path) {
  regularFile(path);
  const db = new DatabaseSync(path, { readOnly: true, enableDoubleQuotedStringLiterals: false });
  db.exec("PRAGMA trusted_schema=OFF; PRAGMA busy_timeout=5000;");
  return db;
}
function inspect(db) {
  const actual = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    .all()
    .map((r) => r.name);
  if (JSON.stringify(actual) !== JSON.stringify([...tables].sort()))
    throw Error("Dit is geen ondersteunde Workbench-database; gebruik nooit de broncatalogus.");
  const versions = db.prepare("SELECT version FROM workbench_schema").all();
  if (versions.length !== 1 || versions[0].version !== 1)
    throw Error("Onbekende Workbench-versie.");
  const integrity = db.prepare("PRAGMA integrity_check").all();
  if (
    integrity.length !== 1 ||
    integrity[0].integrity_check !== "ok" ||
    db.prepare("PRAGMA foreign_key_check").all().length
  )
    throw Error("De Workbench-integriteitscontrole is niet geslaagd.");
  return Object.fromEntries(
    tables.map((name) => [name, db.prepare(`SELECT count(*) n FROM ${name}`).get().n]),
  );
}

/** SQLite's backup API includes committed WAL data without stopping the local UI.
 * The receipt is written last: an incomplete directory is never a valid backup.
 * Evidence timestamps stay historical; restoring does not reverify source files.
 */
export async function backupWorkbench({ from, to }) {
  from = resolve(from);
  to = resolve(to);
  const db = openReadOnly(from);
  try {
    inspect(db);
    mkdirSync(to); // Exclusive new directory; never replace another backup.
    const destination = join(to, "backlog.sqlite");
    await backup(db, destination);
    const snapshot = openReadOnly(destination);
    let counts;
    try {
      counts = inspect(snapshot);
    } finally {
      snapshot.close();
    }
    const receipt = {
      format: "omnibus-workbench-backup",
      version: 1,
      createdAt: new Date().toISOString(),
      database: "backlog.sqlite",
      sha256: await hashFile(destination),
      counts,
    };
    const bytes = JSON.stringify(receipt, null, 2) + "\n";
    writeFileSync(join(to, "backup.json"), bytes, { flag: "wx" });
    return { backup: to, receiptSha256: hashBytes(bytes), counts, activated: false };
  } finally {
    db.close();
  }
}

export async function restoreWorkbench({ from, to, expectSha256 }) {
  digest.parse(expectSha256); // The receipt pin must come from the backup operation.
  from = resolve(from);
  to = resolve(to);
  if ([to, to + "-wal", to + "-shm", to + "-journal"].some(existsSync))
    throw Error("Kies een nieuw herstelbestand zonder bestaande database- of journalbestanden.");
  const receiptPath = join(from, "backup.json");
  regularFile(receiptPath);
  if (lstatSync(receiptPath).size > 16384) throw Error("Ongeldig herstelbewijs.");
  const bytes = readFileSync(receiptPath);
  if (hashBytes(bytes) !== expectSha256)
    throw Error("Het herstelbewijs wijkt af van de bewaarde hash.");
  const receipt = receiptSchema.parse(JSON.parse(bytes));
  const source = join(from, receipt.database);
  regularFile(source);
  const temporary = mkdtempSync(join(dirname(to), ".workbench-restore-"));
  try {
    const staged = join(temporary, "backlog.sqlite");
    copyFileSync(source, staged, constants.COPYFILE_EXCL);
    // Validate the exact staged bytes, not a source that can change after checking.
    if ((await hashFile(staged)) !== receipt.sha256)
      throw Error("Het backupbestand is gewijzigd of beschadigd.");
    const db = openReadOnly(staged);
    let counts;
    try {
      counts = inspect(db);
    } finally {
      db.close();
    }
    if (tables.some((name) => counts[name] !== receipt.counts[name]))
      throw Error("Herstelaantallen wijken af.");
    copyFileSync(staged, to, constants.COPYFILE_EXCL);
    return { database: to, counts, evidenceReverified: false, activated: false };
  } finally {
    // Only this function's newly created staging directory is removed.
    rmSync(temporary, { recursive: true, force: true });
  }
}

export async function runBackup(args) {
  const [action, ...flags] = args;
  const allowed =
    action === "backup"
      ? ["from", "to"]
      : action === "restore"
        ? ["from", "to", "expect-sha256"]
        : [];
  const options = {};
  const usage =
    "Gebruik: content:workbench-backup -- backup --from <backlog.sqlite> --to <nieuwe-map> | restore --from <backupmap> --to <nieuw.sqlite> --expect-sha256 <bewaarde-bewijshash>";
  if (!allowed.length || flags.length !== allowed.length * 2) throw Error(usage);
  for (let i = 0; i < flags.length; i += 2) {
    const key = flags[i].slice(2),
      value = flags[i + 1];
    if (
      flags[i] !== "--" + key ||
      !allowed.includes(key) ||
      Object.hasOwn(options, key) ||
      !value ||
      value.startsWith("--")
    )
      throw Error(usage);
    options[key] = value;
  }
  return action === "backup"
    ? backupWorkbench(options)
    : restoreWorkbench({
        from: options.from,
        to: options.to,
        expectSha256: options["expect-sha256"],
      });
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    console.log(JSON.stringify(await runBackup(process.argv.slice(2)), null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
