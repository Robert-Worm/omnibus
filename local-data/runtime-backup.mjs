import {backup} from 'node:sqlite';
import {constants,copyFileSync,existsSync,mkdtempSync,rmSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {CatalogueRepository,digest} from './repository.mjs';
import {readRuntimePublication} from './runtime-publication.mjs';
import {verifyReleaseContent} from './release-integrity.mjs';
import {runtimeContract} from '../lib/runtime-contract.mjs';

/** Consistent private SQLite backup, including delivery data and the publication.
 * Never copies a live SQLite file directly and never replaces an existing target.
 */
export async function backupRuntime({from,to,release,publication}) {
  from=resolve(from);to=resolve(to);
  // A leftover journal/WAL belongs to a different database; never restore over it.
  if([to,to+'-wal',to+'-shm',to+'-journal'].some(existsSync))
    throw Error('Choose a new backup path; existing database or journal files are never replaced.');
  const expected={release,publication,contract:digest(runtimeContract)};
  const reader=new CatalogueRepository(from,{readOnly:true});
  let temporary;
  try {
    readRuntimePublication(reader,expected);
    temporary=mkdtempSync(join(dirname(to),'.omnibus-backup-'));
    const path=join(temporary,'catalogue.sqlite');
    await backup(reader.db,path);
    const check=new CatalogueRepository(path,{readOnly:true});
    try {
      if(!check.integrity().every(row=>row.integrity_check==='ok'))
        throw Error('Backup integrity check failed.');
      if(check.db.prepare('PRAGMA foreign_key_check').get())
        throw Error('Backup contains broken references.');
      readRuntimePublication(check,expected);
      verifyReleaseContent(check,release);
    } finally {check.close();}
    if([to+'-wal',to+'-shm',to+'-journal'].some(existsSync))
      throw Error('Choose a new backup path; existing journal files are never replaced.');
    copyFileSync(path,to,constants.COPYFILE_EXCL);
    return {database:to,release,publication,contract:expected.contract};
  } finally {reader.close();if(temporary)rmSync(temporary,{recursive:true,force:true});}
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const args=process.argv.slice(2),options={};
  const usage='Usage: runtime-backup --from <private.sqlite> --to <new.sqlite> --release <hash> --publication <hash>';
  if(args.length!==8)throw Error(usage);
  for(let i=0;i<args.length;i+=2) {
    const key=args[i].slice(2),value=args[i+1];
    if(args[i]!=='--'+key||!['from','to','release','publication'].includes(key)||
        Object.hasOwn(options,key)||!value||value.startsWith('--'))throw Error(usage);
    options[key]=value;
  }
  console.log(JSON.stringify(await backupRuntime(options),null,2));
}
