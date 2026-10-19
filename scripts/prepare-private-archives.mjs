import {existsSync,lstatSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import manifest from '../content-tools/private-archives.json' with {type:'json'};

const sourceRoot=fileURLToPath(new URL('../../../../',import.meta.url));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function checkedFile(root,entry){
 if(!entry.path.split('/').every(part=>/^[\w.-]+$/.test(part)&&part!=='.'&&part!=='..'))throw Error('Unsafe private archive path');
 let target=resolve(root);
 for(const [index,part] of entry.path.split('/').entries()){
  target=join(target,part);const stat=lstatSync(target);
  if(stat.isSymbolicLink()||(index===entry.path.split('/').length-1?!stat.isFile():!stat.isDirectory()))throw Error('Private archive must be a regular contained file');
 }
 const bytes=readFileSync(target);
 if(bytes.length!==entry.bytes||hash(bytes)!==entry.sha256)throw Error('Private archive integrity mismatch: '+entry.path);
 return bytes;
}
export function verifyPrivateArchives(root){
 for(const entry of manifest.files)checkedFile(root,entry);
 return {status:'VERIFIED_PRIVATE_ARCHIVES',files:manifest.files.length,bytes:manifest.files.reduce((n,f)=>n+f.bytes,0),newContentApproval:false};
}
export function preparePrivateArchives(destination,{from=sourceRoot}={}){
 const root=resolve(destination);
 if(existsSync(root))throw Error('Private archive destination already exists; choose a new directory');
 const files=manifest.files.map(entry=>({entry,bytes:checkedFile(from,entry)}));
 mkdirSync(root,{recursive:true});
 for(const {entry,bytes} of files){const target=join(root,entry.path);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,bytes,{flag:'wx'});}
 writeFileSync(join(root,'private-archive-manifest.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
 return {...verifyPrivateArchives(root),directory:root};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length!==3)throw Error('Usage: node scripts/prepare-private-archives.mjs <new-private-root>');
 console.log(JSON.stringify(preparePrivateArchives(process.argv[2])));
}
