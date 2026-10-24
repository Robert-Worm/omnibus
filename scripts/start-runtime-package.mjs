import { realpathSync } from "node:fs";
import { relative, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { verifyRuntimePackage } from "../local-data/runtime-package.mjs";
import { parsePreviewArgs, validatePreviewStartOptions } from "./serve-database-web.mjs";
import { startupCheck, startupFailureReason } from "../local-data/startup-diagnostics.mjs";

export function parseRuntimePackageArgs(args) {
  return parsePreviewArgs(args, { packaged: true });
}

export async function startRuntimePackage(options) {
  let { root, databasePath } = options;
  const { release, publication } = options;
  const serverOptions = startupCheck('start-options', () => {
    // Public starts cannot override the web root covered by the package inventory.
    if ((Object.hasOwn(options, "publicOrigin") || Object.hasOwn(options, "listenHost")) &&
        Object.hasOwn(options, "webRoot"))
      throw Error("The packaged hosting start requires its verified package web root.");
    return validatePreviewStartOptions({
      ...options, webRoot: resolve(root, "database-build"),
    });
  });
  startupCheck('node-version', () => {
    if (Number(process.versions.node.split(".")[0]) !== 24)
      throw Error("This runtime package requires Node 24");
  });
  root = startupCheck('package-location', () => realpathSync(root));
  databasePath = startupCheck('database-open', () => realpathSync(databasePath));
  startupCheck('package-location', () => {
    const rel = relative(root, databasePath);
    if (rel === "" || (!rel.startsWith("..") && !isAbsolute(rel)))
      throw Error("Keep the private database outside the runtime package");
  });
  startupCheck('package-integrity', () => verifyRuntimePackage(root));
  const { startDatabasePreview } = await import("./serve-database-web.mjs");
  return startDatabasePreview({ databasePath, release, publication, ...serverOptions,
    webRoot: resolve(root, "database-build") });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const options = startupCheck('start-options', () => parseRuntimePackageArgs(process.argv.slice(2)));
    const app = await startRuntimePackage({
      root: fileURLToPath(new URL("../", import.meta.url)),
      ...options,
    });
    console.log((options.publicOrigin ? "Omnibus packaged read-only web runtime: " : "Omnibus packaged local read-only preview: ") + app.url);
    let closing = false;
    const close = async () => {
      if (closing) return;
      closing = true;
      await app.close();
    };
    process.once("SIGINT", close);
    process.once("SIGTERM", close);
  } catch (error) {
    console.error(
      "Runtime start refused. Failed check: " + startupFailureReason(error) + ".",
    );
    process.exitCode = 1;
  }
}
