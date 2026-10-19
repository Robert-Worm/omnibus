import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CatalogueRepository } from "../local-data/repository.mjs";
import { readRuntimePublication } from "../local-data/runtime-publication.mjs";
import { serveCatalogue } from "../local-data/server.mjs";
import { createHostingPolicy } from "../local-data/hosting-policy.mjs";
import { runtimeContractHash } from "../lib/runtime-contract-identity.mjs";
import { readDatabaseSettings } from "./database-build-options.mjs";

const previewUsage =
  "Usage: dev:database -- (--settings <local-build.json> OR --database <private.sqlite> [--release <hash> --publication <hash>]) [--port <port>] [--web-root <candidate-folder>] [--public-origin <canonical-https-origin> --listen-host <127.0.0.1|0.0.0.0>] (hosting requires explicit pins, port 1-65535 and web root; a runtime package supplies its verified web root)";

const validPath = (value) => typeof value === "string" && !!value.trim() && !value.includes("\0");
const validHash = (value) => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const invalidStart = () => {
  throw Error("Invalid start options. Hosting requires an explicit HTTPS origin, listen host, nonzero port, database, release, publication and web root.");
};

function hostingOptions(options) {
  if (!Object.hasOwn(options, "publicOrigin") && !Object.hasOwn(options, "listenHost")) return {};
  const { publicOrigin, listenHost, port } = options;
  // Reuse the server's exact origin grammar; never maintain a looser CLI policy.
  try {
    createHostingPolicy({ publicOrigin, listenHost, webRoot: options.webRoot });
  } catch {
    invalidStart();
  }
  if (
    typeof publicOrigin !== "string" ||
    !["127.0.0.1", "0.0.0.0"].includes(listenHost) ||
    !Number.isInteger(port) || port < 1 || port > 65535 ||
    !validPath(options.databasePath) || !validHash(options.release) ||
    !validHash(options.publication) || !validPath(options.webRoot)
  ) invalidStart();
  return { publicOrigin, listenHost };
}

/** Validate before filesystem/database access; forward only the server contract. */
export function validatePreviewStartOptions(options) {
  const hosting = hostingOptions(options);
  const port = options.port === undefined ? 4319 : options.port;
  const webRoot = options.webRoot === undefined
    ? fileURLToPath(new URL("../database-build", import.meta.url)) : options.webRoot;
  if (!validPath(options.databasePath) || !validPath(webRoot) ||
      !Number.isInteger(port) || port < 0 || port > 65535) invalidStart();
  return { port, webRoot, ...hosting };
}

export function parsePreviewArgs(args, { packaged = false } = {}) {
  const options = {};
  const seen = new Set();
  const usage = previewUsage;
  if (!Array.isArray(args) || !args.length || args.length % 2) throw Error(usage);
  for (let i = 0; i < args.length; i += 2) {
    if (typeof args[i] !== "string" || typeof args[i + 1] !== "string") throw Error(usage);
    const key = args[i].slice(2),
      value = args[i + 1];
    if (
      args[i] !== "--" + key ||
      !["database", "settings", "release", "publication", "port", "web-root", "public-origin", "listen-host"].includes(key) ||
      seen.has(key) ||
      !value ||
      value.startsWith("--") || !value.trim() || value.includes("\0")
    )
      throw Error(usage);
    seen.add(key);
    options[key] = value;
  }
  const hosting = seen.has("public-origin") || seen.has("listen-host");
  if (
    Boolean(options.database) === Boolean(options.settings) ||
    (options.settings && (seen.has("release") || seen.has("publication"))) ||
    ((seen.has("release") || seen.has("publication")) &&
      ![options.release, options.publication].every(validHash)) ||
    (hosting && (!seen.has("port") || !seen.has("public-origin") || !seen.has("listen-host") ||
      (packaged ? seen.has("web-root") : !seen.has("web-root")))) ||
    (seen.has("port") && (!(hosting ? /^[1-9]\d*$/ : /^\d+$/).test(options.port) ||
      Number(options.port) < (hosting ? 1 : 1024) || Number(options.port) > 65535))
  )
    throw Error(usage);
  const output = options["web-root"] ? { webRoot: resolve(options["web-root"]) } : {};
  let pins;
  if (options.settings) {
    const { database, release, publication } = readDatabaseSettings(options.settings);
    pins = { databasePath: database, release, publication };
  } else {
    pins = { databasePath: resolve(options.database),
      ...(seen.has("release") ? { release: options.release, publication: options.publication } : {}) };
  }
  const result = { ...pins, port: seen.has("port") ? Number(options.port) : 4319, ...output };
  if (hosting) {
    result.publicOrigin = options["public-origin"];
    result.listenHost = options["listen-host"];
    try {
      // The packaged entry point subsequently supplies and verifies its own root.
      hostingOptions({ ...result, ...(packaged ? { webRoot: "database-build" } : {}) });
    } catch {
      throw Error(usage);
    }
  }
  return result;
}

/** Explicit preview/start. Refuses a mismatched build before accepting requests. */
export async function startDatabasePreview(options) {
  const { databasePath, release, publication } = options;
  const serverOptions = validatePreviewStartOptions(options);
  const { webRoot } = serverOptions;
  const manifest = JSON.parse(readFileSync(resolve(webRoot, "omnibus-release.json"), "utf8"));
  if (manifest.schema !== 1 || manifest.contract !== runtimeContractHash)
    throw Error("Rebuild this application with its current runtime contract.");
  if (
    (release !== undefined && release !== manifest.release) ||
    (publication !== undefined && publication !== manifest.publication)
  )
    throw Error("Build does not match the selected database settings. Rebuild before starting.");
  const repository = new CatalogueRepository(databasePath, { readOnly: true });
  try {
    readRuntimePublication(repository, {
      release: manifest.release,
      publication: manifest.publication,
      contract: runtimeContractHash,
    });
    const app = await serveCatalogue(repository, serverOptions);
    return {
      ...app,
      close: async () => {
        await app.close();
        repository.close();
      },
    };
  } catch (error) {
    repository.close();
    throw error;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const options = parsePreviewArgs(process.argv.slice(2));
    const app = await startDatabasePreview(options);
    console.log((options.publicOrigin ? "Omnibus read-only web runtime: " : "Omnibus local read-only preview: ") + app.url);
    let closing = false;
    const close = async () => {
      if (closing) return;
      closing = true;
      await app.close();
    };
    process.once("SIGINT", close);
    process.once("SIGTERM", close);
  } catch {
    console.error("Preview start refused. Check explicit start options, the pinned database, web build and port.");
    console.error(previewUsage);
    process.exitCode = 1;
  }
}
