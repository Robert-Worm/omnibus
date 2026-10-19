import { featureLoader } from "../lib/feature-loader.mjs";

// The web build supplies a same-origin, retryable chunk URL at this boundary.
export const loadFoundationReader = featureLoader(() => import("./foundation-source-reader"));
