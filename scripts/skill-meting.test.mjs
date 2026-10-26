import assert from "node:assert/strict";
import test from "node:test";
import { leesMetingen, leesplan, skillKosten, tokens, vergelijk, TESTSET } from "./skill-meting.mjs";
import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, existsSync, readdirSync, rmSync, symlinkSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { analysisSkillBasis, prepareAnalysis, checkAnalysis } from "../content-tools/analysis-only.mjs";
import { checkIntake, prepareIntake } from "../content-tools/intake.mjs";
import { runAnalysisCommand } from "./prepare-skill-analysis.mjs";

test("leesplan: 'volledig' en AGENTS.md zijn altijd, de rest alleen als het nodig is", () => {
  const md = "Lees `AGENTS.md`. Lees [methode](references/methode.md) volledig. Lees [gevallen](references/gevallen.md) bij twijfel.";
  assert.deepEqual(leesplan(md), { altijd: ["AGENTS.md", "references/methode.md"], soms: ["references/gevallen.md"] });
});

test("skillKosten telt SKILL.md plus de verplichte naslag", () => {
  const bestanden = { "s/SKILL.md": "Lees [a](references/a.md) volledig. Zie [b](references/b.md).", "s/references/a.md": "x".repeat(350), "s/references/b.md": "y".repeat(700) };
  // The in-memory fixture uses portable names; production uses native paths.
  const k = skillKosten("s", (p) => bestanden[p.replaceAll("\\", "/")]);
  assert.equal(k.altijd, tokens(bestanden["s/SKILL.md"]) + 100);
  assert.equal(k.soms, 200);
});

test("metingen: alleen echte regels onder ## Metingen, niet het voorbeeld in een codeblok", () => {
  const md = "## Metingen\n\n```text\n| 2026-01-01 | x | y | v | m | 1 | 2 | 3 |\n```\n\n| Datum | Skill |\n| --- | --- |\n| 2026-11-02 | omnibus-add-report | LVVN26 | abc | m | 6 | 95 | 1.240.000 | 7,8 |\n\n## Verder\n| 2026-12-01 | niet | dit |";
  assert.deepEqual(leesMetingen(md), [{ datum: "2026-11-02", skill: "omnibus-add-report", bron: "LVVN26", versie: "abc", model: "m", agents: 6, minuten: 95, tokens: 1240000, score: 7.8 }]);
});

test("metingen: onbekend is null, ook bij onvolledige regels, en nooit nul verbruik", () => {
  const metingen = leesMetingen("## Metingen\n| 2026-10-25 | omnibus-add-report | LVVN26 | abc | m | 0 | 2 | null | null |\n| 2026-10-25 | omnibus-add-report | LVVN26 | abc | m | – |\n");
  assert.equal(metingen[0].tokens, null);
  assert.equal(metingen[0].score, null);
  assert.equal(metingen[1].agents, null);
  assert.equal(metingen[1].minuten, null);
  assert.equal(metingen[1].score, null);
});

// Synthetische scores; alleen de vaste bron/skill-identiteiten komen uit het protocol.
const reeks = (versie = "oud") => TESTSET.map(({ skill, bron }) => ({ skill, bron, versie, model: "testmodel", score: 8, tokens: 100 }));

test("B-018: iedere vaste bron moet gelijk blijven of stijgen, onafhankelijk van de volgorde", () => {
  const oud = reeks(), nieuw = reeks("nieuw").reverse();
  nieuw[0].score = 8.2;
  nieuw[0].tokens = 50;
  assert.equal(vergelijk(oud, nieuw).toegestaan, true);
  nieuw.find((r) => r.bron === "LVVN26").score = 7.9;
  assert.match(vergelijk(oud, nieuw).reden, /daalt bij LVVN26/);
});

test("B-018: lege en ontbrekende testsets, subset, extra en dubbele bronnen worden geweigerd", () => {
  for (const ongeldig of [[], undefined, null, {}, reeks().slice(0, 1), reeks().slice(1),
    [...reeks(), reeks()[0]], [reeks()[0], reeks()[0], ...reeks().slice(2)],
    [...reeks(), { ...reeks()[0], bron: "ONBEKEND" }],
    reeks().map((r, i) => i === 3 ? { ...r, skill: "omnibus-add-report" } : r)]) {
    assert.equal(vergelijk(ongeldig, reeks("nieuw")).toegestaan, false);
    assert.equal(vergelijk(reeks(), ongeldig).toegestaan, false);
  }
  assert.equal(vergelijk([], []).toegestaan, false);
  assert.equal(vergelijk(reeks().slice(0, 1), reeks("nieuw").slice(0, 1)).toegestaan, false);
});

test("B-018: ontbrekende, niet-numerieke en ongeldige scores worden aan beide kanten geweigerd", () => {
  for (const score of [null, undefined, NaN, Infinity, -Infinity, "8", "NaN", 0, 10.1]) {
    const ongeldig = reeks();
    ongeldig[0].score = score;
    assert.equal(vergelijk(ongeldig, reeks("nieuw")).toegestaan, false, String(score));
    assert.equal(vergelijk(reeks(), ongeldig).toegestaan, false, String(score));
  }
});

test("B-018: versies en modelbasis mogen niet ontbreken of binnen een reeks wisselen", () => {
  for (const veld of ["versie", "model"]) {
    for (const waarde of [undefined, "", " ", 123, "andere-basis"]) {
      const ongeldig = reeks();
      ongeldig[0][veld] = waarde;
      assert.equal(vergelijk(ongeldig, reeks("nieuw")).toegestaan, false);
      assert.equal(vergelijk(reeks(), ongeldig).toegestaan, false);
    }
  }
  assert.equal(vergelijk(reeks(), reeks("nieuw").map((r) => ({ ...r, model: "ander-model" }))).toegestaan, false);
});

test("B-018: onbekend tokenverbruik is toegestaan bij complete scores; ongeldige tellers niet", () => {
  const nieuw = reeks("nieuw");
  nieuw[0].tokens = null;
  assert.equal(vergelijk(reeks(), nieuw).toegestaan, true);
  for (const tokens of [NaN, Infinity, -1, "100"]) {
    nieuw[0].tokens = tokens;
    assert.equal(vergelijk(reeks(), nieuw).toegestaan, false);
    assert.equal(vergelijk(nieuw, reeks()).toegestaan, false);
  }
});

test("de testset bestaat uit openbare bronnen met een reden", () => {
  assert.deepEqual(TESTSET.map(({ skill, bron }) => [skill, bron]), [
    ["omnibus-add-report", "LVVN26"], ["omnibus-add-report", "PROO26"],
    ["omnibus-add-report", "IVHO25"], ["omnibus-add-framework", "TR-CYBER-20261016-cybersecurity-doc1"],
  ]);
  assert.ok(TESTSET.every((t) => t.waarom));
});

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const digest = bytes => createHash("sha256").update(bytes).digest("hex");
const saveJson = (path, value) => writeFileSync(path, JSON.stringify(value));

async function analysisFixture(t, kind = "report") {
  const parent = join(root, "work", "analysis-only-tests");
  mkdirSync(parent, { recursive: true });
  const dir = mkdtempSync(join(parent, "synthetic-"));
  const runId = "synthetic-" + randomUUID(), output = join(root, "work", "skill-analysis", runId);
  t.after(() => {
    for (const path of [dir, output]) {
      assert.ok(resolve(path).startsWith(join(root, "work") + sep));
      rmSync(path, { recursive: true, force: true });
    }
  });
  const put = (name, value) => {
    const path = join(dir, name);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, typeof value === "string" ? value : JSON.stringify(value));
    return { path, sha256: digest(readFileSync(path)) };
  };
  const sourceText = "Fictieve bron voor een technische proef 🧪.\n";
  // Both an active identity and HOLD survive unchanged; neither is filtered or
  // supplied to an authoring module to fool the ordinary new-source intake.
  const registry = put("active-registry.json", { active: ["SYNTHETIC-ACTIVE"], status: "HOLD" });
  const database = join(dir, "catalogue.sqlite");
  const db = new DatabaseSync(database);
  db.exec("CREATE TABLE active_sources (id TEXT, status TEXT); INSERT INTO active_sources VALUES ('SYNTHETIC-ACTIVE', 'HOLD')");
  db.close();
  let method;
  if (kind === "report") {
    const names = ["tools/gate.py", "tools/workflow.py", "tools/stage_custody.py", "tools/measure_usage.py",
      "tools/snapshot-taxonomy.mjs", "contracts/CONTRACT.md", "contracts/record_contract.py", "QUALITY.md",
      "WORKFLOW.md", "OUTPUT-CONTRACT.md", "REVIEW-CONTRACT.json", "roles/source-reader.md"];
    const files = Object.fromEntries(names.map(name => [name, put("kit/" + name, "Synthetic inert kit member; never execute. " + name).sha256]));
    const manifest = put("kit/RELEASE-MANIFEST.json", { author_agent: "synthetic-kit-author", files });
    const approval = put("kit/APPROVAL.json", { decision: "APPROVE", reviewer_agent: "synthetic-reviewer", target_manifest_sha256: manifest.sha256 });
    method = { contract: "report-kit-1.1", manifest, approval };
  } else {
    method = { contract: "framework-cio-0.1+addendum-01", files: {
      "CONTRACT.txt": put("CONTRACT.txt", "Synthetic contract"),
      "CONTRACT-ADDENDUM-01.txt": put("CONTRACT-ADDENDUM-01.txt", "Synthetic addendum"),
    } };
  }
  const basis = await analysisSkillBasis("omnibus-add-" + kind);
  const plan = { format: "omnibus-analysis-plan", schemaVersion: 1,
    source: { id: "SYNTHETIC-ACTIVE", kind, edition: "Synthetic test edition; no real source",
      pdf: put("source.pdf", "%PDF-1.7\nSynthetic placeholder, no substantive content."),
      text: put("source.txt", sourceText), pages: [{ page: 1, start: 0, end: Array.from(sourceText).length }] },
    basis: { ...basis, model: "synthetic-model" }, method };
  const planPath = join(dir, "plan.json");
  const save = () => { saveJson(planPath, plan); return digest(readFileSync(planPath)); };
  const expectedSha256 = save();
  const snapshot = () => {
    const walk = directory => readdirSync(directory, { withFileTypes: true }).flatMap(entry =>
      entry.isDirectory() ? walk(join(directory, entry.name)) : [[join(directory, entry.name), digest(readFileSync(join(directory, entry.name)))]]);
    return walk(dir);
  };
  return { dir, output, plan, planPath, expectedSha256, runId, save, put, snapshot, registry, database };
}

for (const kind of ["report", "framework"]) {
  test(`analysis-only: ${kind} repeats an existing identity outside the catalogue, without authors or approval`, async t => {
    const f = await analysisFixture(t, kind), before = f.snapshot();
    const prepared = await runAnalysisCommand(["prepare", f.planPath, "--expect-sha256", f.expectedSha256, "--run", f.runId]);
    const manifest = JSON.parse(readFileSync(prepared.manifestPath, "utf8"));
    assert.equal(manifest.source.id, f.plan.source.id);
    assert.equal(manifest.source.edition, f.plan.source.edition);
    assert.equal(manifest.source.pdfSha256, f.plan.source.pdf.sha256);
    assert.equal(manifest.status, "INPUTS_PINNED_NOT_READ");
    assert.equal(manifest.publicationStatus, "HOLD");
    assert.equal(manifest.admitted, false);
    assert.equal(manifest.publishable, false);
    assert.equal(manifest.reviewValidated, false);
    assert.equal(manifest.analysis.status, "NOT_STARTED");
    for (const key of ["milliseconds", "tokens", "cost", "qualityScore"]) assert.equal(manifest.analysis[key], null);
    assert.equal(manifest.preparation.tokens, null);
    assert.equal(manifest.preparation.cost, null);
    assert.ok(manifest.preparation.milliseconds >= 0);
    assert.ok(Date.parse(manifest.preparation.endedAt) >= Date.parse(manifest.preparation.startedAt));
    assert.deepEqual(readdirSync(join(f.output, "analysis", "source-a")), []);
    assert.deepEqual(readdirSync(join(f.output, "analysis", "source-b")), []);
    assert.deepEqual(readFileSync(join(f.output, "inputs", "source", "source.pdf")), readFileSync(f.plan.source.pdf.path));
    assert.deepEqual(f.snapshot(), before);
    assert.equal(existsSync(join(f.output, "intake.json")), false);
    const checked = await runAnalysisCommand(["check", prepared.manifestPath, "--expect-sha256", prepared.manifestSha256]);
    assert.equal(checked.status, "ANALYSIS_INPUTS_VERIFIED_NOT_APPROVED");
    assert.equal(checked.publishable, false);
    // Actual ordinary entry points reject the new format, including when renamed.
    const renamed = join(f.output, "intake.json");
    writeFileSync(renamed, readFileSync(prepared.manifestPath));
    await assert.rejects(checkIntake(renamed, { expectedSha256: prepared.manifestSha256 }), /expected fields/);
    await assert.rejects(prepareIntake(prepared.manifestPath, renamed), /expected fields/);
    assert.deepEqual(f.snapshot(), before);
  });
}

test("analysis-only: source, edition plan and complete skill pins cannot drift or be omitted", async t => {
  const f = await analysisFixture(t);
  await assert.rejects(prepareAnalysis(f.planPath, { runId: f.runId }), /retained plan SHA256/);
  f.plan.source.edition = "Changed after pinning";
  f.save();
  await assert.rejects(prepareAnalysis(f.planPath, f), /checksum mismatch/);
  for (const edit of [
    plan => { plan.source.pdf.sha256 = "0".repeat(64); },
    plan => { plan.source.text.sha256 = "0".repeat(64); },
    plan => { plan.basis.repositoryRevision = "0".repeat(40); },
    plan => { plan.basis.files["AGENTS.md"] = "0".repeat(64); },
    plan => { delete plan.basis.files["skills/omnibus-add-report/references/report-method.md"]; },
    plan => { plan.basis.skill = "omnibus-add-framework"; },
    plan => { plan.source.pages[0].end--; },
    plan => { plan.source.id = "../../active"; },
    plan => { plan.publishable = true; },
  ]) {
    const changed = structuredClone(f.plan);
    edit(changed);
    saveJson(f.planPath, changed);
    await assert.rejects(prepareAnalysis(f.planPath, { runId: f.runId, expectedSha256: digest(readFileSync(f.planPath)) }),
      /checksum mismatch|basis changed|mismatch|page map|identity|unexpected fields/);
    assert.equal(existsSync(f.output), false);
  }
});

test("analysis-only: kit approval, all released members and framework contracts remain required", async t => {
  const f = await analysisFixture(t);
  const approval = JSON.parse(readFileSync(f.plan.method.approval.path));
  for (const changed of [{ ...approval, decision: "HOLD" }, { ...approval, reviewer_agent: "synthetic-kit-author" },
    { ...approval, target_manifest_sha256: "0".repeat(64) }]) {
    f.plan.method.approval = f.put("kit/APPROVAL.json", changed);
    await assert.rejects(prepareAnalysis(f.planPath, { runId: f.runId, expectedSha256: f.save() }), /independent exact kit approval/);
  }
  f.plan.method.approval = f.put("kit/APPROVAL.json", approval);
  writeFileSync(join(f.dir, "kit", "tools", "workflow.py"), "Changed synthetic member");
  await assert.rejects(prepareAnalysis(f.planPath, { runId: f.runId, expectedSha256: f.save() }), /checksum mismatch/);
  const release = JSON.parse(readFileSync(f.plan.method.manifest.path));
  delete release.files["tools/gate.py"];
  f.plan.method.manifest = f.put("kit/RELEASE-MANIFEST.json", release);
  f.plan.method.approval = f.put("kit/APPROVAL.json", { ...approval, target_manifest_sha256: f.plan.method.manifest.sha256 });
  await assert.rejects(prepareAnalysis(f.planPath, { runId: f.runId, expectedSha256: f.save() }), /omits required members/);
  assert.equal(existsSync(f.output), false);
  const framework = await analysisFixture(t, "framework");
  delete framework.plan.method.files["CONTRACT-ADDENDUM-01.txt"];
  await assert.rejects(prepareAnalysis(framework.planPath, { runId: framework.runId, expectedSha256: framework.save() }), /framework contracts/);
});

test("analysis-only: run directories cannot be reused or escape work, changed snapshots cannot pass", async t => {
  const f = await analysisFixture(t);
  for (const runId of ["../app", "C:/active", "CON", "x/y", "NUL.txt"])
    await assert.rejects(prepareAnalysis(f.planPath, { expectedSha256: f.expectedSha256, runId }), /run id|relative path/);
  const prepared = await prepareAnalysis(f.planPath, f);
  const before = readFileSync(prepared.manifestPath);
  await assert.rejects(prepareAnalysis(f.planPath, f), /EEXIST/);
  assert.deepEqual(readFileSync(prepared.manifestPath), before);
  const source = join(f.output, "inputs", "source", "source.txt");
  writeFileSync(source, "Changed synthetic input");
  await assert.rejects(checkAnalysis(prepared.manifestPath, { expectedSha256: prepared.manifestSha256 }), /checksum mismatch|bounds/);
  const manifest = JSON.parse(before);
  manifest.publishable = true;
  saveJson(prepared.manifestPath, manifest);
  await assert.rejects(checkAnalysis(prepared.manifestPath, { expectedSha256: prepared.manifestSha256 }), /checksum mismatch/);
  await assert.rejects(checkAnalysis(prepared.manifestPath, { expectedSha256: digest(readFileSync(prepared.manifestPath)) }), /cannot grant approval/);
});

test("analysis-only: linked kit input and linked output destinations stay HOLD", async t => {
  const f = await analysisFixture(t);
  // Directory junctions do not need Windows symlink privileges.
  const originalKit = join(f.dir, "kit");
  const release = JSON.parse(readFileSync(f.plan.method.manifest.path));
  release.files["linked/QUALITY.md"] = release.files["QUALITY.md"];
  symlinkSync(originalKit, join(originalKit, "linked"), process.platform === "win32" ? "junction" : "dir");
  f.plan.method.manifest = f.put("kit/RELEASE-MANIFEST.json", release);
  f.plan.method.approval = f.put("kit/APPROVAL.json", { decision: "APPROVE", reviewer_agent: "synthetic-reviewer", target_manifest_sha256: f.plan.method.manifest.sha256 });
  await assert.rejects(prepareAnalysis(f.planPath, { runId: f.runId, expectedSha256: f.save() }), /linked kit member/);
  assert.equal(existsSync(f.output), false);
  const clean = await analysisFixture(t, "framework");
  mkdirSync(dirname(clean.output), { recursive: true });
  symlinkSync(clean.dir, clean.output, process.platform === "win32" ? "junction" : "dir");
  const before = clean.snapshot();
  await assert.rejects(prepareAnalysis(clean.planPath, clean), /EEXIST/);
  assert.deepEqual(clean.snapshot(), before);
});

test("analysis-only: CLI failures are HOLD and cannot silently fall back to ordinary intake", async t => {
  const f = await analysisFixture(t);
  const result = spawnSync(process.execPath, [join(root, "scripts", "prepare-skill-analysis.mjs"), "prepare", f.planPath,
    "--expect-sha256", "0".repeat(64), "--run", f.runId], { cwd: root, encoding: "utf8", timeout: 15000 });
  assert.ifError(result.error);
  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.equal(JSON.parse(result.stderr).status, "HOLD");
  assert.equal(JSON.parse(result.stderr).publishable, false);
  assert.equal(existsSync(f.output), false);
  await assert.rejects(runAnalysisCommand(["prepare", f.planPath, "--output", "app"]), /Usage:/);
});
