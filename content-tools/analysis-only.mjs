// A separate, non-admissible workspace for repeat analyses. No registry input,
// author modules, extraction engine execution or publication state transitions.
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { lstat, mkdir, readdir, realpath, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";
import { intakeContracts, intakeLimits, readVerifiedFile } from "./intake.mjs";
import { canonical } from "./identity.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputParts = ["work", "skill-analysis"];
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const hash = value => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const text = value => typeof value === "string" && value.trim().length > 0 && value.length <= 500 &&
  Array.from(value).every(char => char.codePointAt(0) >= 32 && char.codePointAt(0) !== 127);
const order = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const need = (ok, message) => { if (!ok) throw Error("Analysis-only: " + message); };
const equal = (a, b) => canonical(a) === canonical(b);
const skills = { report: "omnibus-add-report", framework: "omnibus-add-framework" };
const noApproval = Object.freeze({ analysisOnly: true, admitted: false, publishable: false,
  contentValidated: false, reviewValidated: false, publicationStatus: "HOLD" });
const kitRequired = ["tools/gate.py", "tools/workflow.py", "tools/stage_custody.py", "tools/measure_usage.py",
  "tools/snapshot-taxonomy.mjs", "contracts/CONTRACT.md", "contracts/record_contract.py",
  "QUALITY.md", "WORKFLOW.md", "OUTPUT-CONTRACT.md", "REVIEW-CONTRACT.json"];

function exact(value, keys, label) {
  need(value && typeof value === "object" && !Array.isArray(value) &&
    equal(Object.keys(value).sort(order), [...keys].sort(order)), "unexpected fields in " + label);
}
function portable(name) {
  need(typeof name === "string" && name.length <= 240 && name.split("/").every(part =>
    /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(part) && !/[. ]$/.test(part) &&
    !/^(con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(part)), "unsafe relative path");
  return name;
}
function json(bytes) {
  need(bytes.length <= intakeLimits.manifestBytes, "JSON exceeds size limit");
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
}
async function pinned(pin, maximum = intakeLimits.fileBytes) {
  exact(pin, ["path", "sha256"], "file pin");
  need(typeof pin.path === "string" && pin.path.length > 0 && hash(pin.sha256), "invalid file pin");
  const result = await readVerifiedFile(resolve(pin.path), maximum, { collect: true });
  need(result.sha256 === pin.sha256, "pinned file checksum mismatch");
  return result.data;
}
async function tree(folder, prefix = "") {
  const names = [];
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    const name = portable(prefix + entry.name);
    need(!entry.isSymbolicLink(), "linked skill member");
    if (entry.isDirectory()) names.push(...await tree(join(folder, entry.name), name + "/"));
    else { need(entry.isFile(), "non-file skill member"); names.push(name); }
  }
  return names.sort(order);
}

// Inventory only. Retain these observed pins in the plan before starting a run;
// verification never regenerates them to make changed inputs pass.
export async function analysisSkillBasis(skill) {
  need(Object.values(skills).includes(skill), "unsupported skill");
  const names = ["AGENTS.md", "docs/beheer/samenwerking-ai.md"];
  for (const name of [skill, "omnibus-review-audit-quality"]) {
    const folder = "skills/" + name;
    names.push(...(await tree(join(root, folder))).map(file => folder + "/" + file));
  }
  const files = {};
  for (const name of names.sort(order)) files[name] = (await readVerifiedFile(join(root, name), intakeLimits.manifestBytes)).sha256;
  const repositoryRevision = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8", windowsHide: true }).trim();
  need(/^[a-f0-9]{40}$/.test(repositoryRevision), "invalid repository revision");
  return { skill, repositoryRevision, files };
}

async function inputs(plan) {
  exact(plan, ["format", "schemaVersion", "source", "basis", "method"], "plan");
  need(plan.format === "omnibus-analysis-plan" && plan.schemaVersion === 1, "unsupported analysis plan");
  exact(plan.source, ["id", "kind", "edition", "pdf", "text", "pages"], "source");
  const source = plan.source;
  need(Object.hasOwn(skills, source.kind) && text(source.id) && /^[A-Za-z0-9][A-Za-z0-9._-]{0,95}$/.test(source.id) &&
    text(source.edition), "invalid original source identity/edition");
  exact(plan.basis, ["skill", "repositoryRevision", "files", "model"], "basis");
  need(plan.basis.skill === skills[source.kind] && text(plan.basis.model), "source/skill/model mismatch");
  const actual = await analysisSkillBasis(plan.basis.skill);
  need(equal(actual, { skill: plan.basis.skill, repositoryRevision: plan.basis.repositoryRevision, files: plan.basis.files }),
    "repository/skill basis changed or incomplete");
  const files = new Map();
  let bytes = 0;
  const add = (name, data) => {
    portable(name);
    need(![...files.keys()].some(key => key.toLowerCase() === name.toLowerCase()), "duplicate snapshot path");
    bytes += data.length;
    need(files.size < intakeLimits.files && bytes <= intakeLimits.totalBytes, "analysis snapshot exceeds intake limits");
    files.set(name, data);
  };
  add("source/source.pdf", await pinned(source.pdf));
  add("source/source.txt", await pinned(source.text));
  const sourceText = new TextDecoder("utf-8", { fatal: true }).decode(files.get("source/source.txt"));
  need(sourceText.trim().length > 0, "empty source text");
  need(Array.isArray(source.pages) && source.pages.length > 0, "page map required");
  let end = 0;
  for (const [index, page] of source.pages.entries()) {
    exact(page, ["page", "start", "end"], "page map");
    need(page.page === index + 1 && page.start === end && Number.isSafeInteger(page.end) && page.end >= page.start,
      "page map is not contiguous");
    end = page.end;
  }
  need(end === Array.from(sourceText).length, "page map does not cover the exact text in Unicode codepoints");
  add("source/pages.json", Buffer.from(JSON.stringify(source.pages) + "\n"));
  for (const [name, expected] of Object.entries(actual.files)) {
    add("basis/" + name, await pinned({ path: join(root, name), sha256: expected }, intakeLimits.manifestBytes));
  }
  need(plan.method?.contract === intakeContracts[source.kind], "method contract mismatch");
  if (source.kind === "report") {
    exact(plan.method, ["contract", "manifest", "approval"], "report method");
    const manifestBytes = await pinned(plan.method.manifest, intakeLimits.manifestBytes);
    const approvalBytes = await pinned(plan.method.approval, intakeLimits.manifestBytes);
    const release = json(manifestBytes), approval = json(approvalBytes);
    need(text(release.author_agent) && text(approval.reviewer_agent) && release.author_agent !== approval.reviewer_agent &&
      approval.decision === "APPROVE" && approval.target_manifest_sha256 === plan.method.manifest.sha256,
      "independent exact kit approval required");
    need(release.files && typeof release.files === "object" && !Array.isArray(release.files) &&
      kitRequired.every(name => Object.hasOwn(release.files, name)), "kit manifest omits required members");
    add("method/RELEASE-MANIFEST.json", manifestBytes);
    add("method/APPROVAL.json", approvalBytes);
    const kitRoot = await realpath(dirname(resolve(plan.method.manifest.path)));
    for (const [name, expected] of Object.entries(release.files)) {
      portable(name);
      let current = kitRoot;
      for (const part of name.split("/")) {
        current = join(current, part);
        need(!(await lstat(current)).isSymbolicLink(), "linked kit member");
      }
      add("method/" + name, await pinned({ path: current, sha256: expected }));
    }
  } else {
    exact(plan.method, ["contract", "files"], "framework method");
    exact(plan.method.files, ["CONTRACT.txt", "CONTRACT-ADDENDUM-01.txt"], "framework contracts");
    for (const [name, pin] of Object.entries(plan.method.files)) add("method/" + name, await pinned(pin, intakeLimits.manifestBytes));
  }
  return files;
}

async function outputRoot() {
  let folder = await realpath(root);
  for (const part of outputParts) {
    folder = join(folder, part);
    await mkdir(folder).catch(error => { if (error.code !== "EEXIST") throw error; });
    const stat = await lstat(folder);
    need(stat.isDirectory() && !stat.isSymbolicLink() && await realpath(folder) === folder, "output parent must not be a link");
  }
  return folder;
}

export async function prepareAnalysis(planPath, { expectedSha256, runId } = {}) {
  const startedAt = new Date().toISOString(), start = performance.now();
  need(hash(expectedSha256), "independently retained plan SHA256 required");
  need(typeof runId === "string" && /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(runId), "invalid run id");
  portable(runId);
  const planBytes = await pinned({ path: planPath, sha256: expectedSha256 }, intakeLimits.manifestBytes);
  const plan = json(planBytes), files = await inputs(plan);
  const directory = join(await outputRoot(), runId);
  // A new directory, never a reused run or a public output location.
  await mkdir(directory);
  await writeFile(join(directory, "ANALYSIS-ONLY.txt"), "Analysis only. Publication remains HOLD. This is not an intake package or an approval.\n", { flag: "wx", mode: 0o600 });
  const manifestFiles = [];
  for (const [name, bytes] of files) {
    const relative = "inputs/" + name, destination = join(directory, relative);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, bytes, { flag: "wx", mode: 0o600 });
    manifestFiles.push({ path: relative, sha256: sha(bytes), bytes: bytes.length });
  }
  // No historical banks or previous reviews in the reader workspaces. Actual
  // blind context separation and all substantive reviews still need observation.
  for (const role of ["source-a", "source-b", "reconciliation", "authoring", "reviews", "measurement"])
    await mkdir(join(directory, "analysis", role), { recursive: true });
  const endedAt = new Date().toISOString();
  const manifest = { format: "omnibus-analysis-only", schemaVersion: 1, status: "INPUTS_PINNED_NOT_READ",
    ...noApproval, runId, planSha256: expectedSha256,
    source: { id: plan.source.id, kind: plan.source.kind, edition: plan.source.edition,
      pdfSha256: plan.source.pdf.sha256, textSha256: plan.source.text.sha256, pages: plan.source.pages.length },
    basis: plan.basis, contract: plan.method.contract, files: manifestFiles,
    preparation: { startedAt, endedAt, milliseconds: performance.now() - start, scope: "technical-input-preparation-only",
      tokens: null, cost: null, unknownReason: "No request telemetry or billed cost was supplied; text size is not usage." },
    analysis: { status: "NOT_STARTED", milliseconds: null, tokens: null, cost: null, qualityScore: null,
      unknownReason: "No substantive readings, reviews or full OAK assessment have been performed by this command." } };
  const bytes = Buffer.from(JSON.stringify(manifest, null, 2) + "\n");
  need(bytes.length <= intakeLimits.manifestBytes, "analysis manifest exceeds limit");
  const manifestPath = join(directory, "analysis.json");
  // Written last: a failed copy leaves no valid completion manifest.
  await writeFile(manifestPath, bytes, { flag: "wx", mode: 0o600 });
  return { status: manifest.status, ...noApproval, manifestPath, manifestSha256: sha(bytes), preparation: manifest.preparation };
}

export async function checkAnalysis(manifestPath, { expectedSha256 } = {}) {
  need(hash(expectedSha256), "independently retained analysis SHA256 required");
  const bytes = await pinned({ path: manifestPath, sha256: expectedSha256 }, intakeLimits.manifestBytes);
  const manifest = json(bytes);
  exact(manifest, ["format", "schemaVersion", "status", ...Object.keys(noApproval), "runId", "planSha256",
    "source", "basis", "contract", "files", "preparation", "analysis"], "analysis manifest");
  need(manifest.format === "omnibus-analysis-only" && manifest.schemaVersion === 1 && manifest.status === "INPUTS_PINNED_NOT_READ" &&
    Object.entries(noApproval).every(([key, value]) => manifest[key] === value), "analysis cannot grant approval");
  need(Array.isArray(manifest.files) && manifest.files.length > 0 && manifest.files.length <= intakeLimits.files, "invalid snapshot file list");
  const folder = dirname(resolve(manifestPath));
  need(!(await lstat(folder)).isSymbolicLink(), "linked analysis directory");
  let total = 0;
  const seen = new Set();
  for (const file of manifest.files) {
    exact(file, ["path", "sha256", "bytes"], "snapshot file");
    portable(file.path);
    need(file.path.startsWith("inputs/") && !seen.has(file.path.toLowerCase()) &&
      Number.isSafeInteger(file.bytes) && file.bytes > 0 && file.bytes <= intakeLimits.fileBytes, "invalid snapshot file");
    seen.add(file.path.toLowerCase());
    total += file.bytes;
    need(total <= intakeLimits.totalBytes, "snapshot exceeds byte limit");
    let current = folder;
    for (const part of file.path.split("/")) {
      current = join(current, part);
      need(!(await lstat(current)).isSymbolicLink(), "linked analysis input");
    }
    need((await pinned({ path: current, sha256: file.sha256 }, file.bytes)).length === file.bytes, "snapshot size mismatch");
  }
  return { status: "ANALYSIS_INPUTS_VERIFIED_NOT_APPROVED", ...noApproval,
    source: manifest.source, manifestSha256: expectedSha256, files: manifest.files.length };
}
