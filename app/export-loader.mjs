import {featureLoader} from '../lib/feature-loader.mjs';
// The offline build folds this into its single file. The web build replaces
// this boundary with the URL of an emitted, immutable code chunk.
export const loadExport=featureLoader(()=>import('./export-entry-content'));
