import { resolve, dirname } from "node:path";
import { readFileSync, statSync } from "node:fs";

const validHash = (value) => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);

/** Explicit configuration only; paths travel with the publication, not the shell cwd. */
export function readDatabaseSettings(file) {
  const path = resolve(file);
  const fail = () => {
    throw Error("Invalid database settings: expected database, release and publication only.");
  };
  const stat = statSync(path);
  if (!stat.isFile() || stat.size > 16384) fail();
  let settings;
  try {
    // Windows editors may prefix UTF-8 JSON with a single byte-order marker.
    settings = JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/, ""));
  } catch {
    fail();
  }
  if (
    !settings ||
    Array.isArray(settings) ||
    typeof settings !== "object" ||
    Object.keys(settings).length !== 3 ||
    !Object.keys(settings).every((key) => ["database", "release", "publication"].includes(key)) ||
    typeof settings.database !== "string" ||
    !settings.database.trim() ||
    settings.database.includes("\0") ||
    !validHash(settings.release) ||
    !validHash(settings.publication)
  )
    fail();
  return { ...settings, database: resolve(dirname(path), settings.database) };
}

export function parseDatabaseBuildArgs(args) {
  const options = {};
  const usage =
    "Usage: build:database -- --settings <local-build.json> OR --database <private.sqlite> --release <hash> --publication <hash>";
  if (args.length === 2 && args[0] === "--settings" && args[1] && !args[1].startsWith("--"))
    return readDatabaseSettings(args[1]);
  if (args.length !== 6) throw Error(usage);
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].slice(2),
      value = args[i + 1];
    if (
      args[i] !== "--" + key ||
      !["database", "release", "publication"].includes(key) ||
      Object.hasOwn(options, key) ||
      !value ||
      value.startsWith("--")
    )
      throw Error(usage);
    options[key] = value;
  }
  if (![options.release, options.publication].every(validHash)) throw Error(usage);
  return { ...options, database: resolve(options.database) };
}
