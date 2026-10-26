// Optional complete synthetic acceptance. Run under the shared heavy-test lock.
// No real sources, existing DBs, user browser storage or content approvals.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { correctionWorkflowFixture } from "./test-support/correction-workflow-fixture.mjs";
import { sourceRuntimeFixture } from "./test-support/local-source-runtime-fixture.mjs";
import { startDatabasePreview } from "../scripts/serve-database-web.mjs";
import { parseProjectText } from "../lib/project-codec.mjs";
const root = fileURLToPath(new URL("../", import.meta.url));
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const save = (file, value) => writeFileSync(file, JSON.stringify(value, null, 2) + "\n", { flag: "wx" });
const args = process.argv.slice(2);
assert(args.length === 4 && args[0] === "--browser" && args[2] === "--playwright",
  "Use --browser <executable> --playwright <existing-module>; no installation needed");
const f = await correctionWorkflowFixture({ after() {} }, { browser: true });
console.log("Synthetic correction browser evidence: " + f.dir);
const steps = [], errors = [], result = { synthetic: true, newContentApproval: false, steps, errors };
function run(label, args, expected = 0) {
  const child = spawnSync(process.execPath, args, { cwd: root, windowsHide: true, encoding: "utf8", timeout: 180000 });
  save(join(f.dir, label + ".json"), { args, status: child.status, stdout: child.stdout, stderr: child.stderr });
  assert.ifError(child.error); assert.equal(child.status, expected, child.stderr); return child.stdout;
}
let browser, server, page;
try {
  // The current app restores a report-reader choice even on the framework page.
  // Supply one unrelated fictitious report through the SAME ordinary source
  // admission command, not by inserting authored content in the empty base.
  const priorTemp = Object.fromEntries(["TMP", "TEMP", "TMPDIR"].map(key => [key, process.env[key]]));
  let support;
  try {
    for (const key of Object.keys(priorTemp)) process.env[key] = f.dir;
    support = await sourceRuntimeFixture({ after() {} }, "report", packet => {
      packet.manifest.package.id = "SUPPORT-REPORT";
      for (const [name, file] of packet.paths) packet.set(name, packet.files.get(file.id).toString("utf8").replaceAll("FICTIEF", "SUPPORT-REPORT"));
    });
  } finally { for (const [key, value] of Object.entries(priorTemp)) if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  run("support-report-build", ["scripts/build-local-database.mjs", "--plan", support.options.plan,
    "--base", f.before.options.base, "--out", support.options.out]);
  const before = JSON.parse(run("before-build", ["scripts/build-local-database.mjs", "--plan", f.before.options.plan,
    "--base", join(support.options.out, "local-build.json"), "--out", f.before.options.out]));
  const original = readFileSync(before.database), initial = readFileSync(f.before.baseline.databasePath);
  const oldSettings = join(f.before.options.out, "local-build.json"), out = join(f.dir, "corrected");
  const plan = JSON.parse(readFileSync(f.after.options.plan));
  plan.correction = { file: f.correctionPath, sha256: sha(readFileSync(f.correctionPath)), beforePlan: f.before.options.plan,
    beforePlanSha256: sha(readFileSync(f.before.options.plan)) };
  const planFile = join(f.after.dir, "correction-plan.json"); save(planFile, plan);
  const built = JSON.parse(run("corrected-build", ["scripts/build-local-database.mjs", "--plan", planFile, "--base", oldSettings, "--out", out]));
  assert.equal(built.runtime.status, "LOCAL_READY"); steps.push("ordinary package checks and correction publication");
  const settings = join(out, "local-build.json"), webRoot = join(f.dir, "web");
  const comparison = JSON.parse(run("comparison", ["scripts/compare-runtime-publications.mjs", "--before", oldSettings, "--after", settings]));
  assert.equal(comparison.changes.packages.changed.length, 1); steps.push("ordinary pinned comparison");
  run("web-build", ["scripts/build-runtime.mjs", "--settings", settings, "--out", webRoot]);
  steps.push("ordinary pinned runtime web build");
  // Dynamic OS-assigned port, with the same browser-compatibility retry boundary
  // as server-publication's browserFixture; never use a shared fixed port.
  const blocked = new Set([6000, 6665, 6666, 6667, 6668, 6669, 6697, 10080]);
  for (let attempt = 0; attempt < 16; attempt++) {
    server = await startDatabasePreview({ databasePath: built.database, release: built.release, publication: built.publication, port: 0, webRoot });
    if (!blocked.has(Number(new URL(server.url).port))) break;
    await server.close(); server = null;
  }
  assert(server, "No browser-compatible free port");
  const { chromium } = createRequire(import.meta.url)(resolve(args[3]));
  browser = await chromium.launch({ headless: true, executablePath: resolve(args[1]), args: ["--disable-background-networking"] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true, serviceWorkers: "block" });
  await context.route("**/*", route => new URL(route.request().url()).origin === server.url ? route.continue() : route.abort());
  page = await context.newPage(); page.setDefaultTimeout(15000);
  page.on("pageerror", error => errors.push(error.stack));
  page.on("response", response => { if (response.status() >= 400) errors.push("HTTP " + response.status() + " " + response.url()); });
  await page.goto(server.url + "/#grondslagen");
  const saved = () => page.locator('.project-save-indicator[data-state="saved"]').waitFor();
  await saved();
  await page.getByRole("group", { name: "Bronnen verkennen", exact: true }).getByRole("button", { name: /^Kaders/ }).click();
  await page.locator("#foundation-search").fill("FICTIEF");
  await page.getByRole("button", { name: /^Open in viewer:/ }).click();
  await page.getByRole("button", { name: "Kies toetspunten voor C1", exact: true }).first().click();
  const detail = page.locator(".bd-pilot-detail"), point = detail.locator('[data-point="K1"]');
  const measure = f.after.read("CATALOGUE.json").objectives[0].control_measure;
  assert((await detail.innerText()).includes(measure));
  await point.getByRole("checkbox").click();
  await point.getByRole("button", { name: /^Bronpassage/ }).click();
  await detail.locator(".report-library mark").first().waitFor();
  const quotes = f.after.read("RECONCILED-SOURCE.json").records[0].source_spans.map(span => span.quote);
  const marks = await detail.locator(".report-library mark").allTextContents();
  assert(marks.some(mark => quotes.some(quote => quote.includes(mark) || mark.includes(quote))));
  await page.screenshot({ path: join(f.dir, "corrected-source.png"), fullPage: true });
  await page.setViewportSize({ width: 820, height: 1000 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
  await page.keyboard.press("Escape"); await saved();
  const readProject = async () => { await saved(); return parseProjectText(await page.evaluate(() => localStorage.getItem("rijksmap-project-v1"))); };
  const selected = await readProject(), material = selected.draft.investigation.materials.find(row => row.sourcePointId === "K1");
  assert.equal(material.control, measure); assert(selected.draft.included.includes(material.id));
  steps.push("shared source viewer, corrected control, exact highlights and narrow screen");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() => { location.hash = "#mijn-kader"; });
  await page.getByRole("button", { name: /^Zelf een vraag maken/ }).click();
  await page.locator("#central-question-input").fill("Hoe wordt de fictieve melding behandeld?");
  await page.getByRole("button", { name: /^Vragen toevoegen/ }).click();
  await page.getByRole("button", { name: "Koppel " + material.id + " aan een vraag", exact: true }).click();
  await page.locator(".norm-link-picker").getByRole("radio").check();
  await page.locator(".norm-link-picker").getByRole("button", { name: "Koppelen", exact: true }).click();
  const linked = await readProject(); assert.equal(linked.draft.research.links.length, 1);
  const check = value => { for (const key of ["included", "investigation", "research", "overrides", "notes"]) assert.deepEqual(value.draft[key], linked.draft[key]); };
  await page.reload(); check(await readProject()); steps.push("selection and linked question survive browser reload");
  const downloading = page.waitForEvent("download"); await page.getByRole("button", { name: "Bewaar project", exact: true }).click();
  const project = join(f.dir, "synthetic-project.json"); await (await downloading).saveAs(project);
  check(parseProjectText(readFileSync(project, "utf8")));
  await page.getByRole("button", { name: "Nieuw project", exact: true }).click();
  await page.getByRole("button", { name: "Wis project en begin opnieuw", exact: true }).click();
  await page.locator(".entry-options").waitFor();
  const emptyProject = await page.evaluate(() => localStorage.getItem("rijksmap-project-v1"));
  await page.getByLabel("Open lokaal project of oud concept", { exact: true }).setInputFiles(project);
  await page.waitForFunction(previous => localStorage.getItem("rijksmap-project-v1") !== previous, emptyProject);
  await saved();
  await page.reload(); check(await readProject()); steps.push("downloaded project reopened through ordinary file input");
  assert.deepEqual(errors, []); assert.deepEqual(readFileSync(before.database), original);
  assert.deepEqual(readFileSync(f.before.baseline.databasePath), initial);
  Object.assign(result, { status: "PASS", before: oldSettings, after: settings, sourceMarks: marks, originalDatabasesUnchanged: true });
} catch (error) {
  Object.assign(result, { status: "FAIL", error: error.stack });
  if (page) { writeFileSync(join(f.dir, "failure-page.txt"), await page.locator("body").innerText()); await page.screenshot({ path: join(f.dir, "failure.png") }); }
  throw error;
} finally {
  if (browser) await browser.close(); if (server) await server.close();
  save(join(f.dir, "browser-result.json"), result);
}
console.log(JSON.stringify(result, null, 2));
