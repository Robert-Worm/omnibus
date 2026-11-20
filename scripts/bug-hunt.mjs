#!/usr/bin/env node
// Bugjacht op een lokaal draaiende Omnibus (npm run serve:database of serve-database-web.mjs):
//   node scripts/bug-hunt.mjs --url http://127.0.0.1:4319/ [--seeds 1,2,3] [--steps 200] [--deep] [--memory]
// - Willekeurige klik- en typronde (vaste seed, dus herhaalbaar) die paginafouten, consolefouten, mislukte verzoeken,
//   HTTP-fouten en crashes verzamelt, met de laatste handelingen ervoor.
// - --deep begint elke ronde vanuit een gekozen onderwerp, Kies alle, stap 3 en een vraagopzet.
// - --memory herhaalt onderwerp kiezen en stap 3/4 wisselen en meldt groei van geheugen of pagina-elementen.
// Vereist Playwright met Chromium op deze machine (geen dependency van het project). Exit 1 bij bevindingen.
import {argv, exit} from 'node:process';

const arg = (name, fallback) => { const i = argv.indexOf('--' + name); return i < 0 ? fallback : argv[i + 1]; };
const has = name => argv.includes('--' + name);
const base = arg('url', 'http://127.0.0.1:4319/');
const seeds = String(arg('seeds', '1')).split(',').map(Number);
const steps = Number(arg('steps', 200));
let chromium;
try { ({chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')); }
catch { console.error('Playwright is niet beschikbaar. Zet PLAYWRIGHT_MODULE naar een geïnstalleerde playwright/index.mjs.'); exit(2); }

const WORDS = ['DORA', 'incident', 'ÿ ö é 🙂', '<script>x</script>', '"\'\\', 'a'.repeat(300), '  ', '0', '-1', 'ICT'];
const SKIP = /Naar hoofdinhoud|Download|Broncode|Lokale opslag wissen|Verwijder alles/i;

async function deepStart(page, rnd) {
  await page.getByRole('button', {name: 'Start vanuit signalen'}).click(); await page.waitForTimeout(1500);
  await page.getByText('Financiële sector & DORA', {exact: true}).click(); await page.waitForTimeout(3000);
  await page.locator('.topic-filter-tool').first().click(); await page.waitForTimeout(800);
  const options = page.locator('.topic-filter-option:not([data-sub])');
  await options.nth(rnd(await options.count())).click(); await page.waitForTimeout(3500); await page.keyboard.press('Escape');
  await page.locator('.catalogue-topic-bar button', {hasText: /Kies alle/}).click().catch(() => {}); await page.waitForTimeout(2500);
  await page.getByText('Bouw je kader', {exact: true}).first().click(); await page.waitForTimeout(3000);
  await page.getByRole('button', {name: /Bekijk mijn vraagopzet/}).click().catch(() => {}); await page.waitForTimeout(3000);
  await page.getByRole('button', {name: /Gebruik deze opzet/}).click().catch(() => {}); await page.waitForTimeout(3000);
}

async function walk(browser, seed0) {
  let seed = seed0; const rnd = n => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
  const context = await browser.newContext({viewport: {width: 1440, height: 900}, acceptDownloads: true});
  await context.route('**/*', route => { const u = route.request().url(); return u.startsWith(base) || u.startsWith('data:') || u.startsWith('blob:') ? route.continue() : route.abort(); });
  const page = await context.newPage(), log = [], issues = [];
  const note = (kind, msg) => issues.push({kind, msg: String(msg).slice(0, 300), after: log.slice(-4)});
  page.on('pageerror', e => note('pageerror', e.message));
  page.on('console', m => { if (m.type() === 'error') note('console', m.text()); });
  page.on('requestfailed', r => { if (r.url().startsWith(base)) note('verzoek mislukt', r.url().replace(base, '') + ' ' + r.failure()?.errorText); });
  page.on('response', r => { if (r.status() >= 400 && r.url().startsWith(base)) note('http' + r.status(), r.url().replace(base, '')); });
  page.on('dialog', d => d.dismiss().catch(() => {}));
  page.on('crash', () => note('crash', 'pagina gecrasht'));
  await page.goto(base, {waitUntil: 'networkidle'});
  if (has('deep')) await deepStart(page, rnd);
  for (let i = 0; i < steps; i++) {
    try {
      const candidates = await page.evaluate(skip => {
        const dialog = [...document.querySelectorAll('[role=dialog],[role=alertdialog]')].filter(d => d.getBoundingClientRect().width > 0).pop();
        const out = [];
        (dialog || document).querySelectorAll('button,a[href],[role=tab],[role=checkbox],[role=radio],label,summary,input,textarea,select,[role=combobox],[role=option]').forEach((e, i) => {
          const r = e.getBoundingClientRect(), st = getComputedStyle(e);
          if (r.width < 2 || r.height < 2 || e.disabled || e.getAttribute('aria-disabled') === 'true' || st.visibility === 'hidden') return;
          const t = (e.innerText || e.getAttribute('aria-label') || e.tagName).trim().replace(/\s+/g, ' ').slice(0, 50);
          if (new RegExp(skip, 'i').test(t) || (e.tagName === 'A' && e.target === '_blank')) return;
          e.setAttribute('data-jacht', String(i)); out.push({i, t, tag: e.tagName, type: e.type || ''});
        });
        return out;
      }, SKIP.source);
      if (!candidates.length) { await page.goto(base); continue; }
      const c = candidates[rnd(candidates.length)], target = page.locator(`[data-jacht="${c.i}"]`);
      if ((c.tag === 'INPUT' && !['checkbox', 'radio', 'button', 'submit', 'file'].includes(c.type)) || c.tag === 'TEXTAREA') {
        const w = WORDS[rnd(WORDS.length)]; log.push(`typ ${c.t} <- ${w.slice(0, 20)}`); await target.fill(w, {timeout: 2000});
      } else if (c.type !== 'file') { log.push(`klik ${c.t}`); await target.click({timeout: 2000}); }
      if (rnd(25) === 0) { log.push('terug'); await page.goBack({timeout: 5000}).catch(() => {}); }
      if (rnd(40) === 0) { log.push('herlaad'); await page.reload({timeout: 30000}); }
      if (rnd(12) === 0) await page.keyboard.press('Escape');
      await page.waitForTimeout(150 + rnd(400));
      if (!page.url().startsWith(base)) await page.goto(base);
    } catch { /* een element dat net verdween: volgende handeling */ }
  }
  const seen = new Set(), unique = issues.filter(x => { const k = x.kind + x.msg.slice(0, 120); if (seen.has(k)) return false; seen.add(k); return true; });
  await context.close();
  return {seed: seed0, issues: unique};
}

async function memory(browser) {
  const context = await browser.newContext({viewport: {width: 1440, height: 900}}), page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  const measure = async () => { await cdp.send('HeapProfiler.collectGarbage'); await cdp.send('HeapProfiler.collectGarbage');
    const heap = (await cdp.send('Runtime.getHeapUsage')).usedSize, dom = await cdp.send('Memory.getDOMCounters');
    return {heapMB: +(heap / 1e6).toFixed(1), nodes: dom.nodes, listeners: dom.jsEventListeners}; };
  await page.goto(base); await page.getByRole('button', {name: 'Start vanuit signalen'}).click(); await page.waitForTimeout(1200);
  await page.getByText('Financiële sector & DORA', {exact: true}).click(); await page.waitForTimeout(3000);
  const rounds = [];
  // Drie onderwerpen, drie keer rond: na de eerste ronde is alles geladen en hoort het geheugen vlak te blijven.
  for (let i = 0; i < 9; i++) {
    await page.locator('.topic-filter-tool').first().click(); await page.waitForTimeout(600);
    const options = page.locator('.topic-filter-option:not([data-sub])');
    await options.nth(i % Math.min(3, Math.max(1, await options.count()))).click(); await page.waitForTimeout(3500); await page.keyboard.press('Escape');
    await page.locator('.catalogue-topic-bar button', {hasText: /Kies alle/}).click().catch(() => {}); await page.waitForTimeout(1500);
    await page.getByText('Bouw je kader', {exact: true}).first().click(); await page.waitForTimeout(1500);
    await page.getByText('Exporteer', {exact: true}).first().click(); await page.waitForTimeout(1500);
    await page.goBack(); await page.goBack(); await page.waitForTimeout(1000);
    rounds.push(await measure());
  }
  await context.close();
  const warm = rounds[5], last = rounds.at(-1);
  const grows = last.heapMB > warm.heapMB * 1.15 + 5 || last.nodes > warm.nodes * 1.5 + 500 || last.listeners > warm.listeners * 1.5 + 50;
  return {rounds, grows};
}

const browser = await chromium.launch();
let findings = 0;
for (const seed of seeds) {
  const result = await walk(browser, seed);
  console.log(JSON.stringify({ronde: seed, bevindingen: result.issues.length}));
  for (const x of result.issues.slice(0, 12)) console.log(' -', x.kind, x.msg, '| na:', x.after.join(' / '));
  findings += result.issues.length;
}
if (has('memory')) {
  const result = await memory(browser);
  console.log(JSON.stringify({geheugen: result.rounds, groeit: result.grows}));
  if (result.grows) findings++;
}
await browser.close();
exit(findings ? 1 : 0);
