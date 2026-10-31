// Narrow publication guard, not a comprehensive secrets or licence scanner.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {scanGitBlobs} from './git-blob-batches.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const manifest=JSON.parse(fs.readFileSync(path.join(root,'code-snapshot.json'),'utf8'));
const git=(args,options={})=>execFileSync('git',args,{cwd:root,maxBuffer:64*1024*1024,...options});
const withheld=new Set(manifest.withheld.map(entry=>entry.path));
const jsonConfigs=new Set(['package.json','package-lock.json','components.json','tsconfig.json','.oxlintrc.json','code-snapshot.json','.github/voortgang/verwerkt.json','.github/voortgang/wetten-en-kaders.json','.github/voortgang/modellen.json','.github/voortgang/dubbelingen.json','.github/voortgang/voorgestelde-rapporten.json','.github/overdracht/volgorde.json']);
const blocked=/^(?:node_modules|work|private|projects|exports|intakes|database-build|runtime-build|offline-build|\.openai|\.aws|\.ssh|local-data\/runtime)\/|(?:^|\/)\.env(?:\.|$)|\.(?:pdf|sqlite3?|db|xlsx?|docx|pem|key|pfx|zip|bin)$/i;
const rules=[
  ['private-key', /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/],
  ['provider-token', /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|sk-(?:proj-)?[A-Za-z0-9_-]{24,}|sk_live_[A-Za-z0-9]{16,}|xox[baprs]-[A-Za-z0-9-]{20,})\b/],
  ['aws-key', /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
  ['credential-url', /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis|https?):\/\/[^\s/:"'<>]+:[^\s/@"'<>]+@/i],
];
const checkPath=file=>{if(withheld.has(file)||blocked.test(file)||(file.endsWith('.json')&&!jsonConfigs.has(file)))throw Error('Excluded path in Git: '+file);};
// Reviewed literals: three negative-test URLs from the wave-5 handovers and one documented header.
// Match the exact immutable Git blob AND path, mask only that literal, and scan
// everything else. No test-directory, domain or whole-file secret exemption.
// Current fixtures construct these synthetic URLs; history is not rewritten.
const reviewedFixtures=new Map([
  ['947df70b01dc2d5384c43e6ee21291e5c1b6eb82', ['local-data/server-hosting.test.mjs','https://user:'+'secret@omnibus.example.invalid']],
  ['47c7a17a9c2a0bf39777f94cccfd0e605fa5ab81', ['scripts/start-hosting-options.test.mjs','https://user:'+'password@omnibus.example.invalid']],
  ['118105eac02a192d730ec8090eac7e34f659723b', ['local-data/hosting-release-contract.test.mjs','https://user:'+'secret@${publicHost}']],
  // Documentation, not a key: the first version of the harden-agent-repo skill named the
  // header line it tells reviewers to search for (#276). Later versions avoid the literal.
  ['27c8b48a1b9461ae7b35d9474c2874a3a87532e4', ['.claude/skills/harden-agent-repo/SKILL.md','-----BEGIN '+'PRIVATE KEY-----','private-key']],
]);
const checkText=(bytes,label,id)=>{
  let text=bytes.toString('utf8');
  const fixture=reviewedFixtures.get(id);
  if(fixture?.[0]===label)text=text.replace(fixture[1],'reviewed-synthetic-credential-fixture');
  for(const[name,pattern]of rules)if(pattern.test(text))throw Error('Possible '+name+' in '+label+' (value redacted)');
};
if(process.argv.includes('--test')){
  for(const[id,[label,literal,rule='credential-url']]of reviewedFixtures){
    const expected=new RegExp(rule);
    assert.doesNotThrow(()=>checkText(literal,label,id));
    assert.throws(()=>checkText(literal,label,'unreviewed-blob'),expected);
    assert.throws(()=>checkText(literal,'other.test.mjs',id),expected);
    assert.throws(()=>checkText(literal+' '+literal,label,id),expected);
    assert.throws(()=>checkText(literal+' https://different:'+ 'synthetic@other.invalid',label,id),/credential-url/);
  }
  console.log('Reviewed synthetic credential fixtures: exact blob/path/literal checks passed.');
}
const index=git(['-c','core.quotepath=false','ls-files','--stage','-z']).toString().split('\0').filter(Boolean);
const ids=new Map();
for(const entry of index){const match=entry.match(/^(\d+) ([a-f0-9]+) \d\t(.+)$/s);if(!match||!['100644','100755'].includes(match[1]))throw Error('Unsupported staged file mode');checkPath(match[3]);ids.set(match[2],match[3]);}
if(!index.length)throw Error('Stage the intended files before checking.');
const commits=git(['rev-list','--all']).toString().trim().split('\n').filter(Boolean);
// Read each historical tree, not only HEAD: renamed or deleted data must not hide.
for(const commit of commits){for(const entry of git(['ls-tree','-r','-z',commit]).toString().split('\0').filter(Boolean)){const match=entry.match(/^(100644|100755) blob ([a-f0-9]+)\t(.+)$/s);if(!match)throw Error('Unsupported historical entry');checkPath(match[3]);ids.set(match[2],match[3]);}}
scanGitBlobs(ids,git,checkText);
console.log(`Code boundary passed: ${index.length} staged/tracked files; ${commits.length} historical commits; ${ids.size} unique file versions.`);
if(process.argv.includes('--test'))execFileSync(process.execPath,['--test','scripts/git-blob-batches.test.mjs',...manifest.codeTests],{cwd:root,stdio:'inherit'});
