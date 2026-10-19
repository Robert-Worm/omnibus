// Optional local browser check. Uses synthetic data, never the live backlog.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { WorkbenchStore } from "./store.mjs";
import { startWorkbench } from "./server.mjs";
import { saveEvidence } from "./evidence-store.mjs";

if (!process.env.PLAYWRIGHT_MODULE || !process.env.BROWSER_EXECUTABLE)
  throw Error(
    "Set PLAYWRIGHT_MODULE and BROWSER_EXECUTABLE to an installed local browser runtime.",
  );
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE);
const dir = mkdtempSync(join(tmpdir(), "omnibus-workbench-browser-"));
const database = join(dir, "test.sqlite");
const store = new WorkbenchStore(database);
const csv = ["titel;url;datum;ministerie;samenvatting"];
for (let i = 0; i < 35; i++)
  csv.push(
    `Rapport ${String(i).padStart(2, "0")};https://example.invalid/${i};2026-01-01;Testministerie;Een synthetische bron.`,
  );
csv.push(
  '"<img src=x onerror=alert(1)>";https://example.invalid/unsafe;2026-01-01;Testministerie;Letterlijke tekst',
);
store.importCsv(Buffer.from(csv.join("\n")), { label: "IIA non-assurance", path: "synthetic.csv" });
const linkedId = store.list({ q: "Rapport 03" }).rows[0].id;
const syntheticEvidence = {
  type: "active",
  status: "verified",
  label: "Synthetic snapshot only",
  package: { id: "TEST", version: "test-1" },
  reason: "Synthetic match",
  publication: "b".repeat(64),
  otherPackages: [
    { id: "M1", kind: "model", title: "Synthetic model", version: "m1" },
    { id: "L1", kind: "law", title: "Synthetic law", version: "l1" },
  ],
};
saveEvidence(store.db, {
  planHash: "a".repeat(64),
  results: [syntheticEvidence],
  links: [{ sourceId: linkedId, kind: "active", facts: syntheticEvidence }],
});
store.close();
let server, browser;
try {
  const started = await startWorkbench({ database, port: 0 });
  server = started.server;
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.BROWSER_EXECUTABLE,
  });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", async (dialog) => {
    errors.push("Unexpected script dialog");
    await dialog.dismiss();
  });
  await page.goto(started.origin);
  await page.locator("#page-label").filter({ hasText: "1–30 van 36" }).waitFor();
  assert.match(await page.locator("#publication-count").textContent(), /1 gekoppelde/);
  await page.getByRole("button", { name: "Modellen in publicatie (1)", exact: true }).click();
  await page.locator("#catalogue-inventory[open]").waitFor();
  assert.match(await page.locator("#inventory-list").textContent(), /Synthetic model/);
  await page.locator("#close-inventory").click();
  await page.locator("#q").fill("not a matching report");
  await page.locator("#publication-count").click();
  await page.locator("#page-label").filter({ hasText: "1–1 van 1" }).waitFor();
  assert.equal(await page.locator("#collection").inputValue(), "");
  assert.equal(await page.locator("#q").inputValue(), "");
  await page.locator("#board-tab").click();
  const activeLane = page
    .locator(".lane")
    .filter({ has: page.getByRole("button", { name: "Rapport 03", exact: true }) });
  await activeLane.locator("h3").filter({ hasText: "Actief in Omnibus" }).waitFor();
  await activeLane.locator(".lane-count").click();
  await page.locator("table").waitFor();
  assert.equal(await page.locator("#results .title-button").count(), 1);
  await page.locator("#source-count").click();
  await page.locator("#page-label").filter({ hasText: "1–30 van 36" }).waitFor();
  await page.locator("#next").click();
  await page.locator("#page-label").filter({ hasText: "31–36 van 36" }).waitFor();
  await page.locator("#q").fill("Rapport 03");
  await page.locator("#page-label").filter({ hasText: "1–1 van 1" }).waitFor();
  await page.getByRole("button", { name: "Rapport 03", exact: true }).click();
  await page.locator("#detail[open]").waitFor();
  assert.match(await page.locator("#source-evidence").textContent(), /In actieve publicatie/);
  await page.locator("#edit-stage").selectOption("queued");
  await page.locator("#edit-priority").selectOption("high");
  await page.locator("#note").fill("Waardevolle aanvullende dekking: handmatig beoordeeld.");
  await page.locator("#save").click();
  await page.locator("#save-message").filter({ hasText: "Voortgang bewaard" }).waitFor();
  assert.equal(await page.locator("#history li").count(), 1);
  await page.locator("#close").click();
  await page.reload();
  await page.getByRole("button", { name: "Rapport 03", exact: true }).click();
  await page.locator("#detail[open]").waitFor();
  assert.equal(await page.locator("#edit-stage").inputValue(), "queued");
  assert.equal(await page.locator("#edit-priority").inputValue(), "high");
  await page.locator("#edit-stage").selectOption("reviewing");
  await page.locator("#note").fill("Review voorbereiden.");
  await page.locator("#save").click();
  await page.locator("#save-message").filter({ hasText: "dossierverwijzing" }).waitFor();
  await page.locator("#reference").fill("synthetic-review-dossier");
  await page.locator("#save").click();
  await page.locator("#save-message").filter({ hasText: "Voortgang bewaard" }).waitFor();
  await page.locator("#close").click();
  await page.locator("#board-tab").click();
  await page.locator(".board").waitFor();
  assert.equal(await page.locator(".lane").count(), 7);
  assert.equal(await page.locator("#pagination").isVisible(), false);
  assert.match(
    await page
      .locator(".lane")
      .filter({ has: page.getByRole("button", { name: "Rapport 03", exact: true }) })
      .locator("h3")
      .textContent(),
    /^In review1$/,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.getByRole("button", { name: "Rapport 03", exact: true }).click();
  await page.locator("#detail[open]").waitFor();
  assert(
    await page.evaluate(() => {
      const r = document.querySelector("dialog").getBoundingClientRect();
      return r.left >= 0 && r.right <= innerWidth && r.height <= innerHeight;
    }),
  );
  await page.keyboard.press("Escape");
  await page.locator("#table-tab").click();
  await page.locator("#q").fill("<img");
  await page.getByRole("button", { name: "<img src=x onerror=alert(1)>", exact: true }).waitFor();
  assert.equal(await page.locator("#results img").count(), 0);
  await page.locator("#q").fill("");
  const extra = new WorkbenchStore(database);
  extra.importCsv(Buffer.from("titel;url\nLater toegevoegd;https://example.invalid/later"), {
    label: "Nieuwe collectie",
    path: "later.csv",
  });
  extra.close();
  await page.locator("#refresh").click();
  await page.locator("#source-count").filter({ hasText: "37" }).waitFor();
  assert.equal(await page.locator("#collection option").count(), 3);
  await page.locator("#collection").selectOption("Nieuwe collectie");
  await page.getByRole("button", { name: "Later toegevoegd", exact: true }).waitFor();
  const failed = new WorkbenchStore(database);
  saveEvidence(failed.db, {
    planHash: "a".repeat(64),
    results: [
      {
        type: "active",
        label: "Synthetic snapshot only",
        status: "failed",
        message: "Test failure",
      },
    ],
    links: [],
  });
  failed.close();
  await page.locator("#refresh").click();
  await page.locator("#publication-count").filter({ hasText: "Niet bevestigd" }).waitFor();
  assert.deepEqual(errors, []);
  console.log(
    "PASS: pagination, search, progress, persistence, review reference, board, narrow layout, literal source text and live import refresh.",
  );
} finally {
  await browser?.close();
  if (server) {
    server.closeAllConnections();
    await new Promise((ok) => server.close(ok));
  }
  rmSync(dir, { recursive: true, force: true });
}
