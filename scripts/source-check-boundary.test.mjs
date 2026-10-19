import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {join,relative} from 'node:path';
import {tmpdir} from 'node:os';
import ts from 'typescript';

test('private intake archives are not application type-check roots',t=>{
  const root=mkdtempSync(join(tmpdir(),'omnibus-check-boundary-'));
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  for(const file of ['app/current.tsx','lib/contract.mts','work/inbox/old.tsx','work/candidate/old.ts']){
    mkdirSync(join(root,file,'..'),{recursive:true});
    writeFileSync(join(root,file),'export {};');
  }
  const config=JSON.parse(readFileSync(new URL('../tsconfig.json',import.meta.url),'utf8'));
  const parsed=ts.parseJsonConfigFileContent(config,ts.sys,root);
  assert.deepEqual(parsed.errors,[]);
  assert.deepEqual(parsed.fileNames.map(file=>relative(root,file).replaceAll('\\','/')).sort(),
    ['app/current.tsx','lib/contract.mts']);
  const lint=JSON.parse(readFileSync(new URL('../.oxlintrc.json',import.meta.url),'utf8'));
  assert(lint.ignorePatterns.includes('work/**'));
});
