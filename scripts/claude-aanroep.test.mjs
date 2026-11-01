import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { BudgetOp, Verbruik, argumenten, vastModel } from "./claude-aanroep.mjs";

test("een alias wordt een vaste modelversie; onbekend wordt geweigerd", () => {
  assert.equal(vastModel("sonnet"), "claude-sonnet-5-5");
  assert.equal(vastModel("claude-haiku-5-5"), "claude-haiku-5-5");
  assert.throws(() => vastModel("beste"), /Onbekend model/);
});

test("elke aanroep krijgt geen gereedschap, geen sessie, een vaste versie en een plafond", () => {
  const a = argumenten({ model: "haiku", systeem: "S" });
  assert.deepEqual(a.slice(0, 3), ["-p", "--tools", ""]);
  assert.equal(a[a.indexOf("--model") + 1], "claude-haiku-5-5");
  assert.equal(a[a.indexOf("--max-budget-usd") + 1], "2");
  assert.ok(a.includes("--no-session-persistence"));
});

test("het logboek krijgt per aanroep tokens en kosten, nooit de prompt; het runbudget stopt netjes", () => {
  const logboek = path.join(mkdtempSync(path.join(tmpdir(), "omnibus-log-")), "aanroepen.jsonl");
  const v = new Verbruik({ budgetUsd: 1, logboek, doel: "proef" });
  v.boek({ result: "geheim antwoord", total_cost_usd: 0.6, modelUsage: { "claude-sonnet-5-5": { inputTokens: 10, cacheReadInputTokens: 90, outputTokens: 5 } } },
    { model: "claude-sonnet-5-5", duurMs: 12, gelukt: true, onderdeel: "groep 1" });
  v.controleer();
  v.boek({ total_cost_usd: 0.5, modelUsage: {} }, { model: "claude-sonnet-5-5", duurMs: 3, gelukt: false });
  assert.throws(() => v.controleer(), BudgetOp);
  const regels = readFileSync(logboek, "utf8").trim().split("\n").map(JSON.parse);
  assert.equal(regels.length, 2);
  assert.deepEqual(regels[0].gebruik, [{ model: "claude-sonnet-5-5", invoer: 100, uitvoer: 5 }]);
  assert.equal(regels[0].doel, "proef");
  assert.doesNotMatch(readFileSync(logboek, "utf8"), /geheim antwoord/);
  assert.match(v.samenvatting(), /2 aanroepen, 100 tokens in, 5 tokens uit, \$1\.10/);
});
