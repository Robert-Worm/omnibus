import { readFileSync, writeFileSync } from "node:fs";
import {verifyApplicationRelease} from './scripts/verify-application-release.mjs';
import {fontLicenseNotices,textLicenseNotice} from './scripts/font-license-notices.mjs';
verifyApplicationRelease();
import { composeCorpus } from "./lib/corpus-model.mjs";
import { applyProductScope } from "./lib/product-scope.mjs";
import { initialDraft, exportMarkdown } from "./lib/framework-model.mjs";
import {extendReportCorpus} from './lib/reviewed-reports.mjs';
import {activeReportFrameworks} from './lib/catalogue-retirement.mjs';
import {PRODUCT_TITLE, PRODUCT_FILE_STEM, PRODUCT_HTML_FILENAME} from './lib/product-release.mjs';
import {DATA_KEYS, dataElementId} from './scripts/json-data-tags.mjs';
// A separate input directory keeps candidate builds away from release outputs.
const buildIndex=process.argv.indexOf('--build-dir');
const buildDir=buildIndex>=0?process.argv[buildIndex+1]:'offline-build';
if(!buildDir)throw new Error('Missing build input directory');
const js = readFileSync(`${buildDir}/browser.js`, "utf8").replace(/<\/script/gi, "<\\/script");
const css = readFileSync(`${buildDir}/browser.css`, "utf8");
// CSS minifiers discard comments. Keep the embedded fonts' redistribution notices
// in the downloadable HTML itself, including when it is shared without this checkout.
const fontNotices = fontLicenseNotices(readFileSync('app/rijksmap-fonts.css','utf8')) +
  textLicenseNotice('shadcn 4.18.0 stylesheet license',readFileSync('app/vendor/shadcn-LICENSE.txt','utf8'));
if (/@import\s|url\(["']?https?:/i.test(css)) throw new Error("Externe asset niet toegestaan");
// The application bundle is one large inline script, so the browser cannot show
// anything until it has compiled and evaluated all of it. This static shell is
// plain markup in the document: it is parsed and painted before the script runs,
// and React replaces it when the editor mounts. It contains no project data.
const appearanceScript = `<script>try{var a=localStorage.getItem('omnibus-appearance');document.documentElement.dataset.appearance=a==='dark'||(a!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light'}catch(e){document.documentElement.dataset.appearance='light'}</script>`;
const shellStyle = `<style>#startup-shell{display:flex;min-height:100vh;align-items:center;justify-content:center;padding:1.5rem}#startup-shell>div{max-width:23rem;text-align:center;color:var(--foreground,#20344b);font-family:Inter,system-ui,sans-serif}#startup-shell strong{display:block;font-size:1.35rem;letter-spacing:-.01em;margin-bottom:.35rem}#startup-shell span{display:block;font-size:.875rem;opacity:.72}#startup-shell i{display:block;height:3px;margin:1.25rem auto 0;width:11rem;border-radius:999px;background:var(--border,#ccd8e5);overflow:hidden;position:relative}#startup-shell i::after{content:"";position:absolute;inset:0;width:40%;border-radius:999px;background:var(--foreground,#20344b);opacity:.55;animation:startup-shell-slide 1.15s ease-in-out infinite}@keyframes startup-shell-slide{0%{transform:translateX(-100%)}100%{transform:translateX(250%)}}@media (prefers-reduced-motion:reduce){#startup-shell i::after{animation:none;width:100%;opacity:.3}}</style>`;
const shell = `<div id="startup-shell"><div><strong>Rijksmap · ${PRODUCT_TITLE}</strong><span>De lokale auditwerkplaats wordt geopend. Alles blijft op dit apparaat; er wordt niets verstuurd.</span><i role="presentation"></i></div></div>`;
// The two source corpora travel as data, not as program text: the HTML parser
// reads them and only JSON.parse touches them, instead of V8 tokenising ~25 MB
// of JavaScript before anything can run. The bytes are the build's own JSON
// files, unchanged. They must precede the bundle, which reads them on load.
const dataTags = DATA_KEYS.map(key => {
  const text = readFileSync(`${buildDir}/data/${key}.json`, 'utf8');
  if (/<\/script/i.test(text)) throw new Error(`Bronpakket ${key} bevat een script-einde en kan niet als datablok worden ingesloten.`);
  return `<script type="application/json" id="${dataElementId(key)}">${text}</script>`;
}).join('');
const html = `<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none';script-src 'unsafe-inline';style-src 'unsafe-inline';img-src data:;font-src data:;connect-src 'none';base-uri 'none';form-action 'none'"><title>Rijksmap · ${PRODUCT_TITLE}</title>${appearanceScript}<style>${css}</style>${shellStyle}</head><body><div id="root">${shell}</div><noscript>JavaScript is nodig voor de lokale kadereditor. Geen data wordt verstuurd.</noscript>${dataTags}<script>${js}</script></body></html>`;
// Review builds can be tested before replacing the user's released HTML.
const outputIndex=process.argv.indexOf('--review-output');
const reviewOutput=outputIndex>=0?process.argv[outputIndex+1]:null;
if(outputIndex>=0&&!reviewOutput)throw new Error('Missing review output path');
writeFileSync(reviewOutput||`../${PRODUCT_HTML_FILENAME}`, html.replace('<style>', fontNotices + '<style>'));
console.log("Offline kadereditor opgeslagen: " + Buffer.byteLength(html) + " bytes.");
if(reviewOutput)process.exit(0);
const bundle=extendReportCorpus(JSON.parse(readFileSync("app/trial-corpus.json", "utf8")));
const framework = applyProductScope(composeCorpus(bundle));
const activeIds=new Set(activeReportFrameworks(bundle.corpus.map(c=>c.framework)).map(f=>f.report.id));
const draft=initialDraft(framework);
draft.included=draft.included.filter(id=>activeIds.has(framework.lines.find(l=>l.id===id)?.report_id));
writeFileSync(
  `../${PRODUCT_FILE_STEM}.md`,
  exportMarkdown(framework, draft),
);
console.log("Leesbare kaderexport opgeslagen.");
