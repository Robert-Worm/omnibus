import {readFileSync, writeFileSync} from 'node:fs';
import {dirname, isAbsolute, join, relative, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
import {runtimeContract} from '../lib/runtime-contract.mjs';
import {initializerFields, finalFields} from './runtime-author-policy.mjs';
import {digest} from './identity.mjs';

const parse = (id, code) => ts.createSourceFile(id, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
function nodes(root, predicate) {
  const found = [];
  function visit(node) {
    if (predicate(node)) found.push(node);
    ts.forEachChild(node, visit);
  }
  visit(root);
  return found;
}
function only(values, label) {
  if (values.length !== 1) throw Error('Authoring policy drift: ' + label);
  return values[0];
}
function variable(ast, name) {
  return only(nodes(ast, n => ts.isVariableDeclaration(n) &&
    ts.isIdentifier(n.name) && n.name.text === name && n.initializer), name);
}

/** Match every projected input to the pinned source release, not just HEAD.
 * Other application code may have security fixes without changing the content
 * release. Its provenance is the explicit clean source commit instead.
 */
export function verifyAuthoringInputs(sourceRoot, inventory, ids = Object.keys(runtimeContract)) {
  if (!Array.isArray(inventory)) throw Error('Missing pinned authoring inventory.');
  for (const id of ids) {
    if (!/^(?:app|lib)\/[a-zA-Z0-9_/-]+\.(?:json|mjs)$/.test(id) || id.includes('//'))
      throw Error('Invalid authoring module identity.');
    const entry = only(inventory.filter(entry => entry.path === id), 'inventory: ' + id);
    const text = readFileSync(join(sourceRoot,id),'utf8');
    if (digest(text) !== entry.sha256 || Buffer.byteLength(text) !== entry.bytes)
      throw Error('Authoring input differs from the pinned release: ' + id);
  }
}

/** Reject lossy JSON conversion instead of silently omitting evidence fields. */
export function assertJsonData(value, label = 'modules', ancestors = new Set()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number' && Number.isFinite(value)) return;
  if (typeof value !== 'object' || ancestors.has(value)) throw Error('Non-JSON data: ' + label);
  const prototype = Object.getPrototypeOf(value);
  if (!Array.isArray(value) && prototype !== Object.prototype && prototype !== null)
    throw Error('Non-plain data: ' + label);
  const next = new Set(ancestors).add(value);
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) assertJsonData(value[i], label + '.' + i, next);
  } else {
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== 'string') throw Error('Non-JSON key: ' + label);
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) throw Error('Non-JSON property: ' + label);
      assertJsonData(descriptor.value, label + '.' + key, next);
    }
  }
}

/** Instrument only explicitly named fields in an operator-trusted source module.
 * Executed in a private temporary folder; never loaded from the runtime database.
 */
export function instrumentAuthorModule(id, code, sourcePath, initializers, finals = []) {
  const ast = parse(id, code), fields = [];
  for (const name of initializers) fields.push(`${JSON.stringify(name)}:(${variable(ast, name).initializer.getText(ast)})`);
  for (const name of finals) {
    variable(ast, name);
    fields.push(`${JSON.stringify(name)}:${name}`);
  }
  if (id === 'lib/research-flow.mjs') {
    const fn = only(ast.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === 'centralSuggestion'), 'centralSuggestion');
    const expression = only(fn.body.statements.filter(ts.isReturnStatement), 'centralSuggestion return').expression;
    if (!ts.isStringLiteral(expression)) throw Error('Authoring policy drift: centralSuggestion literal');
    fields.push('centralSuggestion:' + expression.getText(ast));
  }
  if (id === 'lib/question-formulations.mjs') {
    const call = only(nodes(ast, n => ts.isCallExpression(n) &&
      ts.isIdentifier(n.expression) && n.expression.text === 'invitations' &&
      n.arguments.length === 1 && ts.isStringLiteral(n.arguments[0])), 'strategicExperience invitation');
    fields.push('strategicExperience:' + call.arguments[0].getText(ast));
  }
  const edits = [];
  for (const node of nodes(ast, n => ts.isImportDeclaration(n) || ts.isExportDeclaration(n) ||
      (ts.isCallExpression(n) && n.expression.kind === ts.SyntaxKind.ImportKeyword))) {
    const specifier = node.moduleSpecifier ?? node.arguments?.[0];
    if (specifier && ts.isStringLiteral(specifier) && (specifier.text.startsWith('.') || isAbsolute(specifier.text)))
      edits.push([specifier.getStart(ast), specifier.end,
        JSON.stringify(pathToFileURL(resolve(dirname(sourcePath), specifier.text)).href)]);
  }
  for (const [start, end, replacement] of edits.sort((a, b) => b[0] - a[0])) code = code.slice(0, start) + replacement + code.slice(end);
  return code + '\nexport const __omnibusRuntimeFields={' + fields.join(',') + '};\n';
}

export function modelWorkbenchIds(code) {
  const ast = parse('research-models.mjs', code);
  const fn = only(ast.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === 'usesQuestionWorkbench'), 'usesQuestionWorkbench');
  const array = only(nodes(fn, ts.isArrayLiteralExpression), 'workbench model IDs');
  if (!array.elements.every(ts.isStringLiteral)) throw Error('Authoring policy drift: literal model IDs');
  const ids = array.elements.map(n => n.text);
  if (!ids.length || new Set(ids).size !== ids.length) throw Error('Authoring policy drift: duplicate or empty model IDs');
  return ids;
}

/** Fixed contract, independent of which omitted files happen to be on disk. */
export async function extractRuntimeModules({sourceRoot, snapshot, temporary}) {
  const moduleId = file => {
    const id = relative(sourceRoot, file).replaceAll('\\', '/');
    if (!Object.hasOwn(runtimeContract, id)) throw Error('Unknown projected module: ' + id);
    return id;
  };
  const seeds = new Map(snapshot.files.map(([file, value]) => [moduleId(file), value]));
  const special = new Map(snapshot.special.map(([file, code]) => [moduleId(file), code]));
  const modules = {};
  for (const [id, entry] of Object.entries(runtimeContract)) {
    const file = join(sourceRoot, id);
    if (id === 'lib/application-catalogue.mjs') {
      modules[id] = {routing: snapshot.routing, ref: snapshot.refs.catalogue};
    } else if (seeds.has(id)) {
      modules[id] = seeds.get(id);
      if (id === 'lib/cio-source-document.mjs') {
        const ast = parse(id, special.get(id));
        modules[id].pageMetadata = JSON.parse(variable(ast, 'pageMetadata').initializer.getText(ast));
      }
    } else if (entry.kind === 'json') {
      modules[id] = JSON.parse(readFileSync(file, 'utf8'));
    } else if (entry.kind === 'exports') {
      const exported = await import(pathToFileURL(file).href);
      if (JSON.stringify(Object.keys(exported).sort()) !== JSON.stringify([...entry.names].sort((a,b)=>a<b?-1:a>b?1:0)))
        throw Error('Authoring export contract changed: ' + id);
      modules[id] = {...exported};
    } else if (id === 'lib/research-models.mjs') {
      const ids = modelWorkbenchIds(readFileSync(file, 'utf8'));
      const {questionWorkbenchPresentation} = await import(pathToFileURL(file).href);
      modules[id] = {ids, presentations: Object.fromEntries(ids.map(id => {
        const presentation = {...questionWorkbenchPresentation({id, title: 'runtime title', items: []})};
        delete presentation.title;
        return [id, presentation];
      }))};
    } else {
      const name = id.slice(4, -4);
      if (!Object.hasOwn(initializerFields, name) && !Object.hasOwn(finalFields, name))
        throw Error('No reviewed authoring policy: ' + id);
      const code = instrumentAuthorModule(id, readFileSync(file, 'utf8'), file,
        initializerFields[name] ?? [], finalFields[name] ?? []);
      const evaluation = join(temporary, id.replaceAll('/', '-'));
      writeFileSync(evaluation, code, {flag: 'wx'});
      const values = await import(pathToFileURL(evaluation).href);
      modules[id] = values.__omnibusRuntimeFields;
    }
    assertJsonData(modules[id], id);
    // Isolate values from any later author-module initialization side effects.
    modules[id] = JSON.parse(JSON.stringify(modules[id]));
  }
  return modules;
}
