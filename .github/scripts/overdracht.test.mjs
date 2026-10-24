import assert from "node:assert/strict";
import test from "node:test";
import { overdrachtTekst, sorteer, MARKERING } from "./overdracht-lib.mjs";

const issue = (number, title, ...labels) => ({ number, title, labels: labels.map((name) => ({ name })) });
const issues = [
  issue(10, "Astra later", "ChatGPT Astra", "P3", "klaar"),
  issue(11, "Astra eerst", "ChatGPT Astra", "P1", "klaar"),
  issue(12, "Opus bezig", "Opus 5.5", "P2", "bezig"),
  issue(13, "Opus klaar", "Opus 5.5", "P2", "klaar"),
  issue(14, "Besluit nodig", "Opus 5.5", "P1", "wacht-op-beheerder"),
  issue(15, "Zonder status", "ChatGPT Astra", "P2"),
  issue(16, "Een epic", "epic", "Opus 5.5", "P1", "klaar"),
  { ...issue(17, "Een pull request", "Opus 5.5", "P1", "klaar"), pull_request: {} },
];
const tekst = overdrachtTekst(issues, { conclusie: "success", commit: "879ffa5abcdef", url: "https://x/run" }, { nu: new Date("2026-10-24T15:30:00Z") });

test("per assistent de klare taken, P1 eerst; epics en pull requests tellen niet mee", () => {
  assert.ok(tekst.startsWith(MARKERING));
  const astra = tekst.split("## ChatGPT Astra")[1].split("## Wacht")[0];
  assert.ok(astra.indexOf("#11") < astra.indexOf("#10"), "P1 vóór P3");
  const opus = tekst.split("## Opus 5.5")[1].split("## ChatGPT Astra")[0];
  assert.match(opus, /Pak als volgende op\*\*\n\n- \*\*P2\*\* · #13\n/);
  assert.match(opus, /\*\*Bezig\*\*\n\n- \*\*P2\*\* · #12/);
  assert.doesNotMatch(tekst, /#16|#17/);
});

test("wat op de beheerder wacht en wat nog niet is ingedeeld, staat apart", () => {
  assert.match(tekst.split("## Wacht op de beheerder")[1], /#14\b/);
  assert.match(tekst.split("## Nog in te delen")[1], /#15\b/);
});

test("de testuitslag van main staat bovenaan; rood betekent eerst herstellen", () => {
  assert.match(tekst, /✅ groen \(879ffa5/);
  assert.match(overdrachtTekst([], { conclusie: "failure", commit: "abc1234", url: null }), /❌ rood — eerst herstellen/);
  assert.match(overdrachtTekst([], null), /nog geen run bekend/);
});

test("een rode test gaat voor, en alle P1-taken staan erin", () => {
  const lijst = [issue(1, "a", "Opus 5.5", "P1", "klaar"), issue(2, "b", "Opus 5.5", "P1", "klaar"), issue(3, "c", "Opus 5.5", "P1", "klaar"),
    issue(4, "d", "Opus 5.5", "P1", "klaar"), issue(9, "Main rood", "Opus 5.5", "P1", "klaar", "rood"), issue(5, "e", "Opus 5.5", "P2", "klaar")];
  const opus = overdrachtTekst(lijst, null).split("## Opus 5.5")[1].split("## ChatGPT")[0];
  assert.match(opus, /Pak als volgende op\*\*\n\n- ❌ \*\*P1\*\* · #9\n/);
  for (const n of [1, 2, 3, 4]) assert.match(opus, new RegExp(`#${n}\\b`));
  assert.doesNotMatch(opus, /#5\b/);
});

test("sorteren: prioriteit, dan het oudste issue", () => {
  assert.deepEqual(sorteer([issue(3, "", "P2"), issue(1, ""), issue(2, "", "P2"), issue(4, "", "P1")]).map((i) => i.number), [4, 2, 3, 1]);
});
