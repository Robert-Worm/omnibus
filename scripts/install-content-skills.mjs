import { readdir, readFile, lstat, mkdir, copyFile } from "node:fs/promises";
import { constants } from "node:fs";
import { homedir } from "node:os";
import { resolve, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const skillNames = ["omnibus-add-report", "omnibus-add-framework", "omnibus-add-model", "omnibus-build-questions", "omnibus-curate-themes", "omnibus-review-audit-quality"];
const sourceRoot = fileURLToPath(new URL("../skills/", import.meta.url));

async function filesUnder(root, prefix = "") {
  const files = [];
  for (const entry of await readdir(join(root, prefix), { withFileTypes: true })) {
    const name = join(prefix, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Skill contains a symbolic link: ${name}`);
    if (entry.isDirectory()) files.push(...(await filesUnder(root, name)));
    else if (entry.isFile()) files.push(name);
    else throw new Error(`Unsupported skill entry: ${name}`);
  }
  return files.sort((left, right) => left.localeCompare(right));
}

async function exists(path) {
  try {
    return await lstat(path);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

export async function installContentSkills(target, { checkOnly = true, names = skillNames } = {}) {
  if (!Array.isArray(names) || !names.length || new Set(names).size !== names.length ||
    names.some(name => !skillNames.includes(name)))
    throw new Error("Select one or more distinct known content skills.");
  const destination = resolve(target),
    plan = [];
  // Inspect every destination before writing any skill. An existing different
  // skill is never replaced automatically; edited user skills belong to them.
  for (const name of names) {
    const source = join(sourceRoot, name),
      output = join(destination, name);
    const files = await filesUnder(source),
      existing = await exists(output);
    if (existing) {
      if (!existing.isDirectory() || existing.isSymbolicLink())
        throw new Error(`Unsafe skill destination: ${output}`);
      const current = await filesUnder(output);
      if (JSON.stringify(files) !== JSON.stringify(current))
        throw new Error(`Existing skill differs; not overwritten: ${output}`);
      for (const file of files)
        if (!(await readFile(join(source, file))).equals(await readFile(join(output, file))))
          throw new Error(`Existing skill differs; not overwritten: ${join(output, file)}`);
    }
    plan.push({ name, source, output, files, action: existing ? "unchanged" : "install" });
  }
  if (!checkOnly) {
    await mkdir(destination, { recursive: true });
    for (const entry of plan.filter((entry) => entry.action === "install")) {
      // Exclusive root creation protects against a concurrent installer.
      await mkdir(entry.output);
      for (const file of entry.files) {
        const output = join(entry.output, file);
        await mkdir(resolve(output, ".."), { recursive: true });
        await copyFile(join(entry.source, file), output, constants.COPYFILE_EXCL);
      }
    }
  }
  return { checkOnly, destination, skills: plan.map(({ name, action }) => ({ name, action })) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  let target = join(process.env.CODEX_HOME || join(homedir(), ".codex"), "skills"),
    checkOnly = true;
  const names = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--install") checkOnly = false;
    else if (args[i] === "--target" && args[i + 1] && !args[i + 1].startsWith("--"))
      target = args[++i];
    else if (args[i] === "--skill" && args[i + 1] && !args[i + 1].startsWith("--"))
      names.push(args[++i]);
    else
      throw new Error(
        "Usage: node scripts/install-content-skills.mjs [--install] [--target skill-directory] [--skill name]",
      );
  }
  console.log(JSON.stringify(await installContentSkills(target, { checkOnly, ...(names.length ? { names } : {}) }), null, 2));
}
