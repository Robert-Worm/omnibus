import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { publishedCataloguePlugin } from './scripts/published-catalogue.mjs';
import { jsonDataTagPlugin } from './scripts/json-data-tags.mjs';
import { fontLicenseNotices, textLicenseNotice } from './scripts/font-license-notices.mjs';
import {deferredFeaturesPlugin} from './scripts/deferred-features.mjs';

const portable = process.env.OMNIBUS_PORTABLE_RUNTIME === '1';
const candidateOutput = process.env.OMNIBUS_BUILD_OUTPUT;
// Separate build: never replace the distributable offline HTML or its policy.
export default defineConfig({
  define: {__OMNIBUS_LOCAL_AGENT__: portable ? 'undefined' : JSON.stringify({command: process.execPath, server: fileURLToPath(new URL('./agent-tools/server.mjs', import.meta.url))})},
  plugins: [publishedCataloguePlugin({ release: process.env.OMNIBUS_DATABASE_RELEASE, publication: process.env.OMNIBUS_RUNTIME_PUBLICATION, databasePath: process.env.OMNIBUS_DATABASE_PATH, reportOverviews: true, runtimeTarget: portable ? 'portable-local' : 'local-preview' }), deferredFeaturesPlugin(), jsonDataTagPlugin({inlineInHtml:true}), react(), {
    name: 'omnibus-license-notices',
    transformIndexHtml: { order: 'post', handler(html) {
      const notices = fontLicenseNotices(readFileSync(new URL('./app/rijksmap-fonts.css', import.meta.url), 'utf8'));
      const stylesNotice = textLicenseNotice('shadcn 4.18.0 stylesheet license',readFileSync(new URL('./app/vendor/shadcn-LICENSE.txt',import.meta.url),'utf8'));
      return html.replace('</head>', notices + '\n' + stylesNotice + '\n</head>');
    } },
  }],
  resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)) } },
  worker: {format:'es',plugins:()=>[publishedCataloguePlugin({release:process.env.OMNIBUS_DATABASE_RELEASE,
    publication:process.env.OMNIBUS_RUNTIME_PUBLICATION,databasePath:process.env.OMNIBUS_DATABASE_PATH,
    emitManifest:false,runtimeTarget:portable?'portable-local':'local-preview'})]},
  css: { postcss: { plugins: [tailwindcss()] } },
  build: { outDir: candidateOutput || (portable ? 'runtime-build' : 'database-build'), emptyOutDir: !candidateOutput, sourcemap: false,
    rolldownOptions: { input: fileURLToPath(new URL('./database.html', import.meta.url)) } },
});
