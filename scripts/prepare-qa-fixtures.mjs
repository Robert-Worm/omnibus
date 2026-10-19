import {mkdirSync, writeFileSync, existsSync} from 'node:fs';
import {resolve, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {historicalFixtures, readHistoricalFixture} from '../lib/test-support/historical-fixtures.mjs';

export function prepareQaFixtures(destination){
  const root=resolve(destination);
  if(existsSync(root))throw Error('QA fixture directory already exists; choose a new directory');
  // Validate every original before creating anything. No scripts are imported
  // from the fixtures and no source, judgment or original identity is rewritten.
  const files=historicalFixtures.map(fixture=>({...fixture,bytes:readHistoricalFixture(fixture.id)}));
  mkdirSync(root,{recursive:true});
  for(const fixture of files)writeFileSync(join(root,fixture.sha256+'.bin'),fixture.bytes,{flag:'wx'});
  const manifest={format:'omnibus-qa-fixtures',schemaVersion:1,newContentApproval:false,
    files:files.map(({bytes,...fixture})=>({...fixture,bytes:bytes.length}))};
  writeFileSync(join(root,'manifest.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
  for(const fixture of files)readHistoricalFixture(fixture.id,{fixtureDirectory:root});
  return {status:'VERIFIED_QA_FIXTURES',directory:root,files:files.length,
    bytes:files.reduce((sum,file)=>sum+file.bytes.length,0),newContentApproval:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  if(process.argv.length!==3)throw Error('Usage: node scripts/prepare-qa-fixtures.mjs <new-directory>');
  console.log(JSON.stringify(prepareQaFixtures(process.argv[2])));
}
