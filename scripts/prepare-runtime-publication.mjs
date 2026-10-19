// Operator-only bridge from the trusted private authoring checkout. This is not
// an HTTP importer, an upload sandbox, or part of the application build.
import {execFileSync} from 'node:child_process';
import {mkdirSync,mkdtempSync,realpathSync,rmSync,writeFileSync,readFileSync,statSync,lstatSync} from 'node:fs';
import {join,relative,resolve,isAbsolute,sep,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {CatalogueRepository,digest} from '../local-data/repository.mjs';
import {publishRuntime,validateRuntimeModules} from '../local-data/runtime-publication.mjs';
import {runtimeContract} from '../lib/runtime-contract.mjs';
import {extractRuntimeModules,assertJsonData,verifyAuthoringInputs} from '../content-tools/runtime-author-data.mjs';
import {checkRuntimeDatabase} from './check-runtime-database.mjs';
import {verifyReleaseContent} from '../local-data/release-integrity.mjs';
import {prepareDeferredWwkeImpact,prepareDeferredReportGoals} from '../content-tools/runtime-delivery.mjs';

const usage = 'Usage: data:publish-runtime -- --settings <private-publication.json> --out <new-private-folder> [--check] OR --source-root <trusted-authoring-checkout> --source-database <private.sqlite> --source-commit <full-git-hash> --release <hash> --out <new-private-folder> [--check]';
const publicationRetryGuidance = 'After correction, keep the same chosen explicit inputs and new --out: rerun with --check, then only after success rerun without --check. The full run repeats INPUT_CHECK, CONTENT_REVIEW and FINAL_VERIFICATION.';
export const publicationHelp = `${usage}

Preferred workflow:
  npm run data:publish-runtime -- --settings <private-publication.json> --out <new-private-folder> --check
  npm run data:publish-runtime -- --settings <private-publication.json> --out <new-private-folder>

Settings contain sourceRoot, sourceDatabase, sourceCommit and release only.
Relative input paths are resolved beside the settings file; --out is relative to the working directory.
Options may appear in any order. --check is a flag with no value; duplicate or mixed input options are rejected.
The output must be new, outside the authoring checkout, with an existing parent folder.
--check verifies inputs only: no private code execution, content approval or output creation.
Normal publication runs the existing private reviews; there is no skip-review option.
Success creates local-build.json beside the new database. Build with --settings <new-private-folder>/local-build.json.
The active application and database are not switched automatically.
After a failed publication, retain any incomplete output separately and choose a new output folder.
INPUT_CHECK, CONTENT_REVIEW and FINAL_VERIFICATION identify failures at the three acceptance boundaries.
These labels do not allow skipping a step or resuming an incomplete publication.

Recovery by failed stage:
  INPUT_CHECK: correct paths, a mistyped approved pin or the output location; restore the exact approved inputs. Do not choose new hashes just to pass.
  CONTENT_REVIEW: restore missing review prerequisites in the trusted private checkout; changed source or review evidence needs the existing review workflow and explicitly approved matching commit/release.
  FINAL_VERIFICATION: resolve the reported integrity or output-write failure in the inputs or environment. Do not edit the generated database or create/copy handoff files to bypass the failure.
Unlabelled failures follow the same recovery steps; any created output folder must remain separate.
${publicationRetryGuidance}
Repeat both Preferred workflow commands above with the corrected inputs and destination.
--check is not content approval; data:check-runtime alone cannot complete a failed publication.
A publication-receipt.json alone is not success: writing local-build.json may still fail. Wait for the full command to succeed.
Then compare the candidate and complete the separate review build and workflow checks before explicit activation.
Detailed recovery guidance: docs/contributor-publication.md#herstellen-na-een-publicatiefout
`;

/** Add operator context without swallowing errors, retrying or changing review gates. */
export async function runPublicationStage(stage, operation) {
  try { return await operation(); }
  catch (error) {
    throw new Error(`Publication stage ${stage}: ${error instanceof Error ? error.message : 'Unknown error.'}`,{cause:error});
  }
}

/** Local operator settings contain explicit approvals, never executable instructions.
 * The output folder remains a separate argument so a repeat cannot replace a publication. */
export function readPublicationSettings(file) {
  const path = resolve(file), fail = () => {throw Error('Invalid publication settings: expected sourceRoot, sourceDatabase, sourceCommit and release only.');};
  const stat = statSync(path);
  if (!stat.isFile() || stat.size > 16384) fail();
  let value;
  // Match the build settings reader for files saved by Windows editors.
  try { value = JSON.parse(readFileSync(path,'utf8').replace(/^\uFEFF/,'')); } catch { fail(); }
  const keys = ['sourceRoot','sourceDatabase','sourceCommit','release'];
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).length !== keys.length || !Object.keys(value).every(key=>keys.includes(key)) ||
      !keys.every(key=>typeof value[key] === 'string' && value[key].trim() && !value[key].includes('\0')) ||
      !/^[a-f0-9]{40}$/.test(value.sourceCommit) || !/^[a-f0-9]{64}$/.test(value.release)) fail();
  return {'source-root':resolve(dirname(path),value.sourceRoot),
    'source-database':resolve(dirname(path),value.sourceDatabase),
    'source-commit':value.sourceCommit,release:value.release};
}

export function parsePublicationArgs(args) {
  const options = {}, mode = {};
  for (let i = 0; i < args.length;) {
    const flag = args[i++];
    if (flag === '--check') {
      if (mode.checkOnly) throw Error(usage);
      mode.checkOnly = true;
      continue;
    }
    const key = flag.slice(2), value = args[i++];
    if (flag !== '--' + key || !['settings','source-root','source-database','source-commit','release','out'].includes(key) ||
        Object.hasOwn(options,key) || !value || value.startsWith('--') || value.includes('\0')) throw Error(usage);
    options[key] = value;
  }
  if (Object.hasOwn(options,'settings')) {
    if (Object.keys(options).length !== 2 || !Object.hasOwn(options,'out')) throw Error(usage);
    return {...readPublicationSettings(options.settings),out:options.out,...mode};
  }
  if (Object.keys(options).length !== 5) throw Error(usage);
  if (!/^[a-f0-9]{64}$/.test(options.release) || !/^[a-f0-9]{40}$/.test(options['source-commit'])) throw Error(usage);
  return {...options,...mode};
}

/** A settings file is the handoff marker. Write it only after full read-only acceptance.
 * No active build, preview or source database is changed. */
export function completeRuntimePublication({database,release,publication,sourceCommit,summary}) {
  if (!/^[a-f0-9]{40}$/.test(sourceCommit)) throw Error('Explicit source commit required.');
  const checked = checkRuntimeDatabase({database,release,publication});
  const receipt = {schema:1,release,publication,contract:checked.contract,sourceCommit,
    contentGate:'VERIFIED_APPLICATION_RELEASE',modules:checked.modules,resources:checked.resources,summary};
  const out = dirname(database);
  writeFileSync(join(out,'publication-receipt.json'),JSON.stringify(receipt,null,2),{flag:'wx'});
  writeFileSync(join(out,'local-build.json'),JSON.stringify({database:relative(out,database),release,publication},null,2),{flag:'wx'});
  return receipt;
}

export function assertAuthoringCommit(source, commit) {
  const git = args => execFileSync('git',args,{cwd:source,encoding:'utf8',maxBuffer:4*1024*1024}).trim();
  if (realpathSync(git(['rev-parse','--show-toplevel'])) !== realpathSync(source))
    throw Error('Source root must be the authoring repository root.');
  if (git(['rev-parse','HEAD']) !== commit || git(['status','--porcelain','--untracked-files=normal']))
    throw Error('Authoring checkout must be clean at the explicitly approved commit.');
}

function inside(parent, child) {
  const part = relative(parent, child);
  return !part || (part !== '..' && !part.startsWith('..' + sep) && !isAbsolute(part));
}

/** No private code is imported or run; a successful check is not content approval. */
export function inspectPublicationInputs(options) {
  const source = realpathSync(options['source-root']);
  const sourceDatabase = realpathSync(options['source-database']);
  const out = resolve(options.out), release = options.release;
  // Resolve the parent too, so a junction cannot put output in the source tree.
  const physicalOut = join(realpathSync(resolve(out,'..')),out.split(/[\\/]/).at(-1));
  if (inside(source,physicalOut)) throw Error('Output must be outside the original authoring checkout.');
  if (lstatSync(out,{throwIfNoEntry:false})) throw Error('EEXIST: publication output must be a new folder.');
  assertAuthoringCommit(source, options['source-commit']);
  for (const file of ['scripts/verify-application-release.mjs','scripts/database-catalogue.mjs'])
    if (!statSync(join(source,file)).isFile()) throw Error('Missing private publication entrypoint: '+file);
  const repository = new CatalogueRepository(sourceDatabase,{readOnly:true});
  try {
    repository.db.exec('BEGIN');
    verifyReleaseContent(repository,release);
    const row = repository.db.prepare(`SELECT a.payload FROM artifacts a
      JOIN release_artifacts r ON r.sha256=a.sha256 WHERE r.release_id=? AND r.name=?`)
      .get(release,'baseline-file-inventory');
    verifyAuthoringInputs(source,row ? JSON.parse(row.payload) : undefined);
  } finally { repository.close(); }
  return {source,sourceDatabase,out,release};
}

// Run as a fresh CLI process: module initialization must not be reused across
// content releases. The source checkout is executable trusted operator input.
async function prepare(options) {
  const {source,sourceDatabase,out,release} = await runPublicationStage('INPUT_CHECK',()=>inspectPublicationInputs(options));
  if (options.checkOnly) {
    console.log(JSON.stringify({status:'VERIFIED_PUBLICATION_INPUTS',release,
      sourceCommit:options['source-commit'],modules:Object.keys(runtimeContract).length,
      privateReviewsExecuted:false,contentApproved:false,publicationCreated:false},null,2));
    return;
  }
  // Reserve a fresh folder. A failed run has no local-build.json readiness file;
  // existing databases or folders are never replaced and the live app is untouched.
  mkdirSync(out);
  const temporary = mkdtempSync(join(out,'.author-evaluation-'));
  const database = join(out,'catalogue.sqlite');
  const load = name => import(pathToFileURL(join(source,name)).href);
  let plugin;
  try {
    console.log('Checking the existing private content approvals…');
    await runPublicationStage('CONTENT_REVIEW',()=>execFileSync(process.execPath,['--input-type=module','-e',
      `const {verifyApplicationRelease}=await import(${JSON.stringify(pathToFileURL(join(source,'scripts/verify-application-release.mjs')).href)});verifyApplicationRelease();`],
      {cwd:source,stdio:'inherit'}));
    const reader = new CatalogueRepository(sourceDatabase,{readOnly:true});
    let bundle;
    try { bundle = reader.exportRelease(release); } finally { reader.close(); }
    if (!bundle) throw Error('Pinned source release is missing.');
    const inventory = bundle.artifacts.find(entry=>entry.name==='baseline-file-inventory')?.data;
    verifyAuthoringInputs(source,inventory);
    const writer = new CatalogueRepository(database);
    try {
      if (writer.importRelease(bundle) !== release) throw Error('Source release identity changed.');
    } finally { writer.close(); }
    bundle = null;
    console.log('Preparing separate delivery resources and JSON data…');
    const {databaseCataloguePlugin} = await load('scripts/database-catalogue.mjs');
    plugin = databaseCataloguePlugin({release,databasePath:database});
    await plugin.buildStart();
    const snapshot = plugin.api.snapshot();
    let summary;
    plugin.generateBundle.call({emitFile(asset) {
      const manifest = JSON.parse(asset.source);
      summary = {archive:manifest.archive,models:manifest.models,reports:manifest.reports,pages:manifest.pages};
    }});
    plugin.closeBundle(); plugin = null;
    const value = {
      format:'omnibus-runtime-publication',schemaVersion:1,contentGate:'VERIFIED_APPLICATION_RELEASE',
      release,contract:digest(runtimeContract),
      modules:await extractRuntimeModules({sourceRoot:source,snapshot,temporary}),undefinedPaths:[],
      refs:snapshot.refs,registrations:Object.fromEntries(snapshot.registrations.map(([id,keys])=>[id.replaceAll('\\','/'),keys])),
      routing:snapshot.routing,summary,
    };
    assertJsonData(value);
    validateRuntimeModules(value,runtimeContract);
    verifyAuthoringInputs(source,inventory);
    assertAuthoringCommit(source,options['source-commit']);
    const repository = new CatalogueRepository(database);
    let publication;
    try {
      const delivery = prepareDeferredReportGoals(repository,prepareDeferredWwkeImpact(repository,value));
      validateRuntimeModules(delivery,runtimeContract);
      publication = publishRuntime(repository,delivery,{release,contract:value.contract});
    } finally { repository.close(); }
    console.log('Verifying the finished database before making build settings available…');
    const receipt = await runPublicationStage('FINAL_VERIFICATION',()=>completeRuntimePublication({database,release,publication,sourceCommit:options['source-commit'],summary}));
    console.log(JSON.stringify({...receipt,database},null,2));
  } finally {
    plugin?.closeBundle();
    // Only the unique folder allocated above contains generated executable code.
    rmSync(temporary,{recursive:true,force:true});
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === '--help') console.log(publicationHelp);
  else try { await prepare(parsePublicationArgs(args)); }
  catch (error) {
    console.error('Publication failed: ' + (error instanceof Error ? error.message : 'Unknown error.'));
    console.error('For setup guidance: npm run data:publish-runtime -- --help');
    console.error('Do not use incomplete output as a publication. If an output folder was created, keep it separate and retry with a new folder.');
    console.error(publicationRetryGuidance);
    process.exitCode = 1;
  }
}
