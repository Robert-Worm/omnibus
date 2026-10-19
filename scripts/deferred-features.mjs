import { resolve, dirname, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const features = [
  {
    boundary: "app/export-loader.mjs",
    entry: "app/export-entry-content.tsx",
    name: "export-entry-content",
    exportName: "loadExport",
  },
  {
    boundary: "app/foundation-reader-loader.mjs",
    entry: "app/foundation-source-reader.tsx",
    name: "foundation-source-reader",
    exportName: "loadFoundationReader",
  },
];
const virtual = "\0omnibus-deferred-feature:";

// Native module loaders can retain a failed import. Retry only this build's
// emitted same-origin asset under a fresh query; never reload the user's page.
export function deferredFeaturesPlugin() {
  const chunks = new Map();
  return {
    name: "omnibus-deferred-features",
    enforce: "pre",
    buildStart() {
      chunks.clear();
      for (const feature of features)
        chunks.set(
          feature.name,
          this.emitFile({
            type: "chunk",
            id: resolve(root, feature.entry),
            name: feature.name,
            preserveSignature: "strict",
          }),
        );
    },
    resolveId(source, importer) {
      if (!importer || !(source.startsWith(".") || isAbsolute(source))) return;
      const target = resolve(dirname(importer), source);
      const feature = features.find((item) => target === resolve(root, item.boundary));
      if (feature) return virtual + feature.name;
    },
    load(id) {
      const feature = features.find((item) => id === virtual + item.name);
      if (!feature) return;
      const chunk = chunks.get(feature.name);
      if (!chunk) throw Error("Deferred feature must be emitted before loading.");
      return `import {featureLoader} from ${JSON.stringify(resolve(root, "lib/feature-loader.mjs"))};
const url=import.meta.ROLLUP_FILE_URL_${chunk};
export const ${feature.exportName}=featureLoader(attempt=>import(/* @vite-ignore */ attempt?url+'?retry='+attempt:url));`;
    },
  };
}
