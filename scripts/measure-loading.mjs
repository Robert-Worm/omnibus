// Optional, local-only performance sample. No private database access or runtime
// changes; start the existing pinned preview separately. Evidence stays in work/.
import assert from 'node:assert/strict';
import {mkdirSync, writeFileSync, realpathSync} from 'node:fs';
import {resolve, relative, dirname, isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {cpus, totalmem, release} from 'node:os';

export function summarize(values) {
  assert(values.length && values.every(v => Number.isFinite(v) && v >= 0));
  const sorted = [...values].sort((a, b) => a - b), n = sorted.length;
  return {n, median: n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2,
    p95: sorted[Math.ceil(n * 0.95) - 1], min: sorted[0], max: sorted[n - 1]};
}

export function localPreview(value) {
  const url = new URL(value);
  assert(url.protocol === 'http:' && url.hostname === '127.0.0.1' && url.port &&
    url.pathname === '/' && !url.username && !url.password && !url.search && !url.hash,
  'Supply an explicit loopback preview origin');
  return url.href;
}

export function assetTotals(entries) {
  const total = values => Object.fromEntries(['transferSize', 'encodedBodySize', 'decodedBodySize']
    .map(key => [key, values.reduce((n, entry) => n + entry[key], 0)]));
  return {all: total(entries), javascript: total(entries.filter(e => e.path.endsWith('.js'))),
    css: total(entries.filter(e => e.path.endsWith('.css'))),
    fonts: total(entries.filter(e => e.path.endsWith('.woff2')))};
}

async function measureNavigation(page, hash, selector) {
  return page.evaluate(({hash, selector}) => new Promise((resolve, reject) => {
    const started = performance.now();
    const timeout = setTimeout(() => { observer.disconnect(); reject(Error('Route readiness timeout')); }, 15000);
    const check = () => {
      const element = document.querySelector(selector);
      if (location.hash !== hash || !element?.getClientRects().length) return;
      observer.disconnect(); clearTimeout(timeout);
      // Two frames include a paint opportunity after the route DOM is ready.
      requestAnimationFrame(() => requestAnimationFrame(() => resolve(performance.now() - started)));
    };
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, {childList: true, subtree: true, attributes: true});
    location.hash = hash;
    check();
  }), {hash, selector});
}

export async function measureLoading({url, out, samples = 9, playwrightModule, executablePath}) {
  url = localPreview(url);
  assert(Number.isInteger(samples) && samples >= 3 && samples <= 20, 'Use 3–20 samples');
  assert(executablePath, 'Set BROWSER_EXECUTABLE');
  const root = fileURLToPath(new URL('../', import.meta.url));
  const work = realpathSync(resolve(root, 'work'));
  out = resolve(out);
  const inside = relative(work, out);
  assert(inside && !inside.startsWith('..') && !isAbsolute(inside), 'Output belongs under work/');
  const parent = relative(work, realpathSync(dirname(out)));
  assert(!parent.startsWith('..') && !isAbsolute(parent), 'Output parent must remain under work/');
  mkdirSync(out); // Explicit new evidence directory; never overwrite a previous run.
  const {chromium} = createRequire(import.meta.url)(playwrightModule || 'playwright');
  const browser = await chromium.launch({headless: true, executablePath});
  const result = {schema: 1, scope: 'local sample, not an SLA or a cold-server measurement',
    environment: {node: process.version, os: process.platform + ' ' + release(),
      cpu: cpus()[0]?.model, memoryBytes: totalmem(), browser: browser.version(),
      viewport: {width: 1920, height: 1080}, downloadBitsPerSecond: 10000000,
      uploadBitsPerSecond: 10000000, latencyMs: 100, cpuThrottling: false,
      browserCache: 'fresh context for each initial load; real reload with cache enabled',
      serverAndOsCache: 'not cleared', percentile: 'nearest rank; p95 is maximum for n < 20',
      readiness: 'empty start saved indicator and enabled route choice, then two animation frames',
      transferSize: 'ResourceTiming estimate including headers; encodedBodySize is compressed body only'},
    initial: [], reload: [], navigation: [], errors: [], deferred: {}};
  try {
    for (let index = 0; index < samples; index++) {
      const context = await browser.newContext({viewport: result.environment.viewport});
      try {
        const page = await context.newPage();
        page.setDefaultTimeout(15000);
        page.on('pageerror', () => result.errors.push({sample: index + 1, kind: 'pageerror'}));
        page.on('response', r => {if(r.status() >= 400) result.errors.push({sample: index + 1, kind: 'http', status: r.status()});});
        let apiCalls = 0;
        const sourceRequests = [];
        page.on('request', r => {
          const path = new URL(r.url()).pathname;
          if (path.startsWith('/api/')) apiCalls++;
          if (path.startsWith('/api/v1/documents/')) sourceRequests.push({method: r.method(),
            kind: path.endsWith('/index') ? 'index' : 'page', hasBody: r.postData() !== null});
        });
        const cdp = await context.newCDPSession(page);
        await cdp.send('Network.enable');
        await cdp.send('Network.emulateNetworkConditions', {offline: false, latency: 100,
          downloadThroughput: 10000000 / 8, uploadThroughput: 10000000 / 8});
        await page.addInitScript(() => {
          window.__loadingSample = {readyMs: null, longTasks: []};
          new PerformanceObserver(list => window.__loadingSample.longTasks.push(...list.getEntries()
            .map(e => ({start: e.startTime, duration: e.duration})))).observe({type: 'longtask', buffered: true});
          const observer = new MutationObserver(() => {
            if (!document.querySelector('.project-save-indicator[data-state="saved"]') ||
              !document.querySelector('.entry-options button:not(:disabled)')) return;
            observer.disconnect();
            requestAnimationFrame(() => requestAnimationFrame(() => {window.__loadingSample.readyMs = performance.now();}));
          });
          observer.observe(document, {childList: true, subtree: true, attributes: true});
        });
        const snapshot = async () => {
          await page.waitForFunction(() => window.__loadingSample.readyMs !== null);
          // Moving font bytes out of CSS must not make the download total look
          // smaller just because those separate requests have not finished yet.
          const fontsReadyMs = await page.evaluate(async () => {await document.fonts.ready; return performance.now();});
          const snapshot = await page.evaluate(() => {
            const entries = [...performance.getEntriesByType('navigation'), ...performance.getEntriesByType('resource')]
              .filter(e => new URL(e.name).origin === location.origin &&
                (e.entryType === 'navigation' || /\.(js|css|woff2)$/.test(new URL(e.name).pathname)))
              .map(e => ({path: new URL(e.name).pathname, transferSize: e.transferSize,
                encodedBodySize: e.encodedBodySize, decodedBodySize: e.decodedBodySize,
                startTime: e.startTime, responseEnd: e.responseEnd}));
            return {...window.__loadingSample, entries,
              firstContentfulPaintMs: performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? null};
          });
          assert.equal(apiCalls, 0, 'Empty start must not fetch catalogue resources');
          assert(snapshot.entries.every(e => !/foundation-source-reader-|export-entry-content-/.test(e.path)),
            'Source reader and export must remain deferred');
          assert(snapshot.entries.some(e => e.path.endsWith('.js') && e.decodedBodySize > 0));
          return {...snapshot, fontsReadyMs, bytes: assetTotals(snapshot.entries)};
        };
        await page.goto(url + '#begin');
        result.initial.push(await snapshot());
        await page.reload();
        result.reload.push(await snapshot());
        const firstReportCatalogueMs = await measureNavigation(page, '#rapporten', '.report-catalogue .report-list-item button:not(:disabled)');
        const backToStartMs = await measureNavigation(page, '#begin', '.entry-options button:not(:disabled)');
        const repeatReportCatalogueMs = await measureNavigation(page, '#rapporten', '.report-catalogue .report-list-item button:not(:disabled)');
        result.navigation.push({firstReportCatalogueMs, backToStartMs, repeatReportCatalogueMs});
        if (index === samples - 1) {
          const scripts = () => page.evaluate(() => performance.getEntriesByType('resource')
            .filter(e => new URL(e.name).pathname.endsWith('.js')).map(e => new URL(e.name).pathname));
          result.deferred.beforeSource = await scripts();
          await page.evaluate(() => {location.hash = '#grondslagen';});
          await page.getByRole('group', {name: 'Bronnen verkennen', exact: true})
            .getByRole('button', {name: /^Wetten/}).click();
          const all = page.getByRole('button', {name: 'Toon alle bronnen', exact: true});
          const open = page.getByRole('button', {name: 'Open in viewer: Besluit CIO-stelsel Rijksdienst 2026', exact: true}).first();
          await Promise.race([all.waitFor(), open.waitFor()]);
          if (await all.isVisible()) await all.click();
          await open.click();
          await page.locator('.point-choice-button').first().click();
          const detail = page.locator('.law-detail');
          await detail.locator('.law-choice-card').first().getByRole('button', {name: /^Bronpassage/}).click();
          await detail.locator('.report-library mark').first().waitFor();
          // CIO uses the shared report page renderer already in catalogue-content.
          // The generic foundation reader has its own, different deferred entry.
          result.deferred.afterCioSource = await scripts();
          assert(!result.deferred.afterCioSource.some(path => path.includes('foundation-source-reader-')));
          assert(!result.deferred.afterCioSource.some(path => path.includes('export-entry-content-')));
          result.deferred.cioDocumentRequests = sourceRequests.length;
          await page.keyboard.press('Escape');
          await page.evaluate(() => {location.hash = '#rapporten';});
          await page.getByRole('textbox', {name: 'Zoek rapport', exact: true}).fill('CIBGBIO24-K01');
          await page.getByRole('button', {name: 'Bekijk normen en toetspunten →', exact: true}).click();
          await page.getByRole('button', {name: 'Kies toetspunten voor CIBGBIO24-K01', exact: true}).first().click();
          const report = page.locator('.bd-pilot-detail'), point = report.locator('.bd-point').first();
          await point.getByRole('checkbox').click();
          await point.getByRole('button', {name: 'Bronpassage', exact: true}).click();
          await report.locator('.report-library mark').first().waitFor();
          result.deferred.reportSourceRequests = sourceRequests;
          assert(sourceRequests.some(r => r.kind === 'index') && sourceRequests.some(r => r.kind === 'page'),
            'Opening report source passages fetches their document index and page on demand');
          assert(sourceRequests.every(r => r.method === 'GET' && !r.hasBody));
          await page.keyboard.press('Escape');
          await page.evaluate(() => {location.hash = '#kaderexport';});
          await page.getByRole('group', {name: 'Werkvorm', exact: true}).waitFor();
          result.deferred.afterExport = await scripts();
          assert(result.deferred.afterExport.some(path => path.includes('export-entry-content-')));
        }
      } finally {await context.close();}
      console.log(`Local loading sample ${index + 1}/${samples} completed`);
    }
    result.summaryMs = {
      initial: summarize(result.initial.map(v => v.readyMs)), reload: summarize(result.reload.map(v => v.readyMs)),
      initialFontsReady: summarize(result.initial.map(v => v.fontsReadyMs)),
      ...Object.fromEntries(Object.keys(result.navigation[0]).map(key => [key, summarize(result.navigation.map(v => v[key]))])),
    };
    assert.deepEqual(result.errors, []);
    result.status = 'passed';
    return result;
  } finally {
    await browser.close();
    writeFileSync(resolve(out, 'results.json'), JSON.stringify(result, null, 2));
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await measureLoading({url: process.env.REVIEW_URL, out: process.env.REVIEW_OUT,
    samples: Number(process.env.REVIEW_SAMPLES || 9), playwrightModule: process.env.PLAYWRIGHT_MODULE,
    executablePath: process.env.BROWSER_EXECUTABLE});
  console.log(JSON.stringify(result.summaryMs, null, 2));
}
