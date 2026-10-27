import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CatalogueRepository } from "../local-data/repository.mjs";
import { readRuntimePublication } from "../local-data/runtime-publication.mjs";
import { serveCatalogue } from "../local-data/server.mjs";
import { createHostingPolicy } from "../local-data/hosting-policy.mjs";
import { requestVisitorAddress } from "../local-data/request-rate-limit.mjs";
import { runtimeContractHash } from "../lib/runtime-contract-identity.mjs";
import { readDatabaseSettings } from "./database-build-options.mjs";
import { startupCheck, startupFailureReason } from "../local-data/startup-diagnostics.mjs";

const previewUsage =
  "Usage: dev:database -- (--settings <local-build.json> OR --database <private.sqlite> [--release <hash> --publication <hash>]) [--port <port>] [--web-root <candidate-folder>] [--public-origin <canonical-https-origin> --listen-host <127.0.0.1|0.0.0.0>] (hosting requires explicit pins, port 1-65535 and web root; a runtime package supplies its verified web root)";

const validPath = (value) => typeof value === "string" && !!value.trim() && !value.includes("\0");
const validHash = (value) => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const invalidStart = () => {
  throw Error("Invalid start options. Hosting requires an explicit HTTPS origin, listen host, nonzero port, database, release, publication and web root.");
};

function hostingOptions(options) {
  if (!Object.hasOwn(options, "publicOrigin") && !Object.hasOwn(options, "listenHost") && !Object.hasOwn(options, "sliplaneGateway")) return {};
  const { publicOrigin, listenHost, port } = options;
  // Reuse the server's exact origin grammar; never maintain a looser CLI policy.
  try {
    createHostingPolicy({ publicOrigin, listenHost, webRoot: options.webRoot });
    requestVisitorAddress({publicMode:publicOrigin !== undefined, sliplaneGateway:options.sliplaneGateway});
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
  return { publicOrigin, listenHost, ...(options.sliplaneGateway === undefined ? {} : {sliplaneGateway:options.sliplaneGateway}) };
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

export function parsePreviewArgs(args, { packaged = false, env = process.env } = {}) {
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
  const gateway = env.OMNIBUS_SLIPLANE_GATEWAY;
  if (gateway !== undefined && !hosting) throw Error(usage);
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
    const { database, release, publication } = startupCheck('settings', () => readDatabaseSettings(options.settings));
    pins = { databasePath: database, release, publication };
  } else {
    pins = { databasePath: resolve(options.database),
      ...(seen.has("release") ? { release: options.release, publication: options.publication } : {}) };
  }
  const result = { ...pins, port: seen.has("port") ? Number(options.port) : 4319, ...output };
  if (hosting) {
    result.publicOrigin = options["public-origin"];
    result.listenHost = options["listen-host"];
    if (gateway !== undefined) result.sliplaneGateway = gateway;
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
  const serverOptions = startupCheck('start-options', () => validatePreviewStartOptions(options));
  const { webRoot } = serverOptions;
  const manifest = startupCheck('web-build', () => {
    const value = JSON.parse(readFileSync(resolve(webRoot, "omnibus-release.json"), "utf8"));
    if (value.schema !== 1 || value.contract !== runtimeContractHash)
      throw Error("Rebuild this application with its current runtime contract.");
    if (
      (release !== undefined && release !== value.release) ||
      (publication !== undefined && publication !== value.publication)
    )
      throw Error("Build does not match the selected database settings. Rebuild before starting.");
    return value;
  });
  const repository = startupCheck('database-open', () => new CatalogueRepository(databasePath, { readOnly: true }));
  try {
    startupCheck('publication', () => readRuntimePublication(repository, {
      release: manifest.release,
      publication: manifest.publication,
      contract: runtimeContractHash,
    }));
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
    const options = startupCheck('start-options', () => parsePreviewArgs(process.argv.slice(2)));
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
  } catch (error) {
    console.error("Preview start refused. Failed check: " + startupFailureReason(error) + ".");
    console.error(previewUsage);
    process.exitCode = 1;
  }
}
