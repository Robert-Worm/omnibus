import {mkdirSync, readFileSync, readdirSync, writeFileSync, realpathSync} from 'node:fs';
import {join, resolve, relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {build} from 'vite';

const root = fileURLToPath(new URL('../', import.meta.url));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

export function parseMcpPackageArgs(args) {
  if (args.length !== 2 || args[0] !== '--out' || !args[1]?.trim() || args[1].startsWith('--'))
    throw Error('Usage: node scripts/package-mcp.mjs --out <new-folder>');
  return resolve(args[1]);
}

// Only code: no catalogue, agent-build, local configuration or output projects.
// Bundle the installed, locked dependencies so the isolated runtime needs Node
// only. Keep both process entry points beside shared chunks: the reader resolves
// its child relative to import.meta.url and that child starts its own worker.
export async function packageMcp(out) {
  out = resolve(out);
  const lockBytes = readFileSync(join(root, 'package-lock.json'));
  const locked = JSON.parse(lockBytes).packages;
  const dependenciesRoot = realpathSync(join(root, 'node_modules'));
  mkdirSync(out); // Exclusive; never clean or overwrite an existing destination.
  const packages = new Map();
  await build({root, configFile: false, envDir: false, logLevel: 'warn', ssr: {noExternal: true},
    plugins: [{name: 'mcp-runtime-boundary', generateBundle(_options, bundle) {
      for (const entry of Object.values(bundle)) {
        if (entry.type !== 'chunk') throw Error('Unexpected MCP runtime asset');
        for (const dependency of [...entry.imports, ...entry.dynamicImports])
          if (!dependency.startsWith('node:') && !Object.hasOwn(bundle, dependency))
            throw Error('Unbundled MCP runtime dependency: ' + dependency);
        for (const id of Object.keys(entry.modules)) {
          const normalized = id.replaceAll('\\', '/'), marker = '/node_modules/';
          const at = normalized.lastIndexOf(marker);
          if (at < 0) continue;
          const tail = normalized.slice(at + marker.length).split('/');
          const name = tail.slice(0, tail[0].startsWith('@') ? 2 : 1).join('/');
          const directory = normalized.slice(0, at + marker.length) + name;
          const metadata = JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8'));
          if (locked['node_modules/' + relative(dependenciesRoot, directory).replaceAll('\\', '/')]?.version !== metadata.version)
            throw Error('Installed dependency differs from lockfile: ' + name);
          const key = name + '@' + metadata.version;
          if (packages.has(key)) continue;
          const notices = readdirSync(directory).filter(file => /^(licen[cs]e|copying|notice)(\.|$)/i.test(file));
          if (!notices.length) throw Error('Missing dependency licence: ' + name);
          packages.set(key, {name, version: metadata.version, license: metadata.license,
            notices: notices.map(file => ({file, text: readFileSync(join(directory, file), 'utf8')}))});
        }
      }
    }}],
    build: {ssr: true, outDir: out, emptyOutDir: false, minify: false, sourcemap: false,
      rolldownOptions: {input: {
        'start-read-only-http': join(root, 'agent-tools/start-read-only-http.mjs'),
        'read-only-http-child': join(root, 'agent-tools/read-only-http-child.mjs'),
      }, output: {entryFileNames: '[name].mjs', chunkFileNames: '[name]-[hash].mjs'}}},
  });
  for (const name of ['LICENSE', 'NOTICE']) writeFileSync(join(out, name), readFileSync(join(root, name)), {flag: 'wx'});
  writeFileSync(join(out, 'package.json'), JSON.stringify({name: 'omnibus-mcp-read-only', private: true,
    type: 'module', engines: {node: '>=24.21.0 <25'}, license: 'PolyForm-Noncommercial-1.0.0',
    scripts: {start: 'node start-read-only-http.mjs'}}, null, 2) + '\n', {flag: 'wx'});
  writeFileSync(join(out, 'THIRD-PARTY-NOTICES.txt'), [...packages].sort(([a], [b]) => a.localeCompare(b))
    .map(([key, p]) => `${key} (${p.license})\n${p.notices.map(n => n.file + '\n' + n.text).join('\n')}\n`).join('\n'), {flag: 'wx'});
  const files = Object.fromEntries(readdirSync(out).sort().map(file => {
    const bytes = readFileSync(join(out, file)); return [file, {bytes: bytes.length, sha256: hash(bytes)}];
  }));
  const receipt = {schema: 1, kind: 'omnibus-mcp-code-only', node: '24.21+',
    lockSha256: hash(lockBytes),
    dependencies: [...packages.values()].map(({notices: _notices, ...p}) => p), files};
  writeFileSync(join(out, 'mcp-package.json'), JSON.stringify(receipt, null, 2) + '\n', {flag: 'wx'});
  return {files: Object.keys(files).length + 1, bytes: Object.values(files).reduce((n, f) => n + f.bytes, 0)};
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(JSON.stringify(await packageMcp(parseMcpPackageArgs(process.argv.slice(2))))); }
  catch { console.error('MCP-pakket niet gemaakt. Gebruik --out met een nieuwe map en geïnstalleerde dependencies.'); process.exitCode = 1; }
}
