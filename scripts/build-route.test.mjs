import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const manifest=JSON.parse(read('package.json'));

test('advertised commands name only files available in the code-only checkout',()=>{
  for(const [name,command] of Object.entries(manifest.scripts)) {
    const files=command.match(/[A-Za-z0-9_./*-]+\.(?:mjs|mts|tsx|ts)/g)||[];
    for(const file of files) {
      assert(!file.includes('*'),'Use an explicit test list: '+name);
      assert(existsSync(new URL('../'+file,import.meta.url)),name+' refers to an omitted file: '+file);
    }
  }
  for(const name of ['data:import','data:serve','data:verify','build:offline','test:baseline'])
    assert.equal(manifest.scripts[name],undefined,'Private authoring command is not an application entrypoint: '+name);
});

test('standard commands use the same pinned database build and loopback preview',()=>{
  assert.equal(manifest.scripts.build,manifest.scripts['build:database']);
  assert.equal(manifest.scripts.start,manifest.scripts['dev:database']);
  assert.equal(manifest.scripts.dev,manifest.scripts.start);
  assert.equal(manifest.scripts.test,'npm run check:types && npm run lint && npm run test:docs && npm run test:voortgang && npm run test:frontend && npm run test:code-only && npm run test:runtime && npm run test:publisher && npm run test:content-handoff && npm run test:source && npm run test:models && npm run test:release && npm run test:workbench && npm run test:agent:input && npm run test:hosting-preparation');
  assert.match(read('vite.config.ts'),/export \{ default \} from '\.\/vite\.database\.config'/);
});

test('ordinary build and start fail before work when database settings are absent',()=>{
  for(const name of ['build','start']) {
    const [command,...args]=manifest.scripts[name].split(' ');
    assert.equal(command,'node');
    const result=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8',timeout:15000});
    assert.ifError(result.error);
    assert.notEqual(result.status,0);
    assert.match(result.stderr,/Usage:/);
    assert(!result.stdout.includes('http://'));
  }
});

test('retired hosting templates and identity trials are absent from the lockfile',()=>{
  const lock=JSON.parse(read('package-lock.json'));
  const retired=['vinext','wrangler','@cloudflare/vite-plugin','@cloudflare/workers-types',
    '@openai/sites-vite-plugin','@vitejs/plugin-rsc','react-server-dom-webpack',
    '@workos-inc/node','@workos/emulate'];
  for(const name of retired) {
    assert(!manifest.dependencies?.[name]&&!manifest.devDependencies?.[name],name);
    assert(!Object.keys(lock.packages).some(path=>path.endsWith('node_modules/'+name)),name);
  }
  assert.deepEqual(JSON.parse(read('tsconfig.json')).compilerOptions.types,['node']);
});

test('retired private prototype entrypoints cannot masquerade as supported application builds',()=>{
  for(const path of ['vite.offline.config.ts','vite.integration-review.config.ts',
    'vite.timing.config.ts','vite.scale.config.ts','vite.reuse.config.ts',
    'scale-offline.tsx','reuse-offline.tsx','app/reuse-prototype.tsx'])
    assert(!existsSync(new URL('../'+path,import.meta.url)),path);
  assert(existsSync(new URL('../vite.database.config.ts',import.meta.url)));
  assert(existsSync(new URL('../offline.tsx',import.meta.url)));
});
