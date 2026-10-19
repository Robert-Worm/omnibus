import {zlibSync,unzlibSync,strToU8,strFromU8} from 'fflate';
import {MAX_SOURCE_TRACE_CHARACTERS, MAX_PROJECT_MATERIALS} from './project-limits.mjs';

// Rich source snapshots repeat context intentionally. Lossless compression is
// transport-only: the in-memory project and its source snapshots are unchanged.
const FORMAT='rijksmap-project-compressed';
export const MAX_EXPANDED_PROJECT_BYTES=64000000;
// Count without allocating an encoded buffer or an escaped copy. For a string
// inside JSON, include its escapes but not the two enclosing quote characters.
function textBytes(text, escaped = false) {
 let bytes = 0;
 for (let i = 0; i < text.length; i++) {
  const c = text.charCodeAt(i);
  if (escaped && (c === 34 || c === 92)) bytes += 2;
  else if (escaped && c < 32) bytes += [8,9,10,12,13].includes(c) ? 2 : 6;
  else if (c < 128) bytes++;
  else if (c < 2048) bytes += 2;
  else if (c >= 0xd800 && c <= 0xdbff && text.charCodeAt(i + 1) >= 0xdc00 && text.charCodeAt(i + 1) <= 0xdfff) { bytes += 4; i++; }
  else if (escaped && c >= 0xd800 && c <= 0xdfff) bytes += 6;
  else bytes += 3;
 }
 return bytes;
}
function base64(bytes){let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(s);}
function poolSnapshots(project){
 const pool=[],indices=new Map();
 const intern=v=>{const text=JSON.stringify(v);if(!indices.has(text)){indices.set(text,pool.length);pool.push(text);}return indices.get(text);};
 const materials=project.draft.investigation.materials.map(m=>{
  if(!m.lawTrace)return m;const trace=JSON.parse(m.lawTrace);
  if(JSON.stringify(trace)!==m.lawTrace)return m;
  return {...m,lawTrace:{snapshotParts:Object.entries(trace).map(([key,v])=>[key,Array.isArray(v)?v.map(intern):intern(v)])}};
 });
 return {...project,snapshotPool:pool,draft:{...project.draft,investigation:{...project.draft.investigation,materials}}};
}
function unpoolSnapshots(project){
 if(!Object.hasOwn(project,'snapshotPool'))return project;
 const pool=project.snapshotPool;if(!Array.isArray(pool)||pool.some(v=>typeof v!=='string'))throw Error('Ongeldige bronopslag');
 const materials=project.draft?.investigation?.materials;
 if(!Array.isArray(materials)||materials.length>MAX_PROJECT_MATERIALS)throw Error('Ongeldige bronopslag');
 const pooled=m=>typeof m.lawTrace==='object'&&m.lawTrace!==null;
 const {snapshotPool:_snapshotPool,...plain}=project;
 const baseline={...plain,draft:{...plain.draft,investigation:{...plain.draft.investigation,materials:materials.map(m=>{
  if(!m||typeof m!=='object'||Array.isArray(m))throw Error('Ongeldige bronopslag');
  return pooled(m)?{...m,lawTrace:''}:m;
 })}}};
 // Account for the rest of the project, including untouched traces and the
 // enclosing quotes of each placeholder. Check ALL materials before any join.
 let bytes=textBytes(JSON.stringify(baseline));
 if(bytes>MAX_EXPANDED_PROJECT_BYTES)throw Error('Bronopslag te groot');
 const partSizes=new Map();
 const partSize=i=>{
  if(!Number.isSafeInteger(i)||i<0||i>=pool.length)throw Error('Ontbrekende broncontext');
  if(pool[i].length>MAX_SOURCE_TRACE_CHARACTERS)throw Error('Bronopslag te groot');
  if(!partSizes.has(i))partSizes.set(i,textBytes(pool[i],true));
  return partSizes.get(i);
 };
 for(const m of materials){
  if(!pooled(m))continue;
  const fields=m.lawTrace.snapshotParts;
  if(!Array.isArray(fields))throw Error('Ongeldige bronopslag');
  let characters=0;
  const add=(length,size)=>{
   characters+=length;bytes+=size;
   if(characters>MAX_SOURCE_TRACE_CHARACTERS||bytes>MAX_EXPANDED_PROJECT_BYTES)throw Error('Bronopslag te groot');
  };
  const reference=i=>{const size=partSize(i);add(pool[i].length,size);};
  add(2,2); // braces
  for(let f=0;f<fields.length;f++){
   const field=fields[f];
   if(!Array.isArray(field)||field.length!==2||typeof field[0]!=='string')throw Error('Ongeldig bronveld');
   if(field[0].length>MAX_SOURCE_TRACE_CHARACTERS)throw Error('Bronopslag te groot');
   const key=JSON.stringify(field[0]),value=field[1];
   if(f)add(1,1);
   add(key.length+1,textBytes(key,true)+1); // key and colon
   if(Array.isArray(value)){
    add(2,2);
    for(let r=0;r<value.length;r++){if(r)add(1,1);reference(value[r]);}
   }else reference(value);
  }
 }
 const restored=materials.map(m=>{
  if(!pooled(m))return m;
  const lawTrace='{'+m.lawTrace.snapshotParts.map(([k,v])=>JSON.stringify(k)+':'+(Array.isArray(v)?'['+v.map(i=>pool[i]).join(',')+']':pool[v])).join(',')+'}';
  return {...m,lawTrace};
 });
 return {...plain,draft:{...plain.draft,investigation:{...plain.draft.investigation,materials:restored}}};
}
export function serializeProject(project,_pretty=false){
 const text=JSON.stringify(project);
 if(text.length>MAX_EXPANDED_PROJECT_BYTES||textBytes(text)>MAX_EXPANDED_PROJECT_BYTES)throw Error('Project is te groot om veilig te bewaren.');
 const pooled=project.draft?.investigation?.materials?.some(m=>m.lawTrace)?poolSnapshots(project):project;
 const bytes=strToU8(JSON.stringify(pooled));if(bytes.length>MAX_EXPANDED_PROJECT_BYTES)throw Error('Project is te groot om veilig te bewaren.');
 return JSON.stringify({format:FORMAT,version:1,encoding:'zlib-base64',expandedBytes:bytes.length,data:base64(zlibSync(bytes,{level:6}))});
}
export function expandProject(value){
 if(value?.format!==FORMAT)return value;
 if(value.version!==1||value.encoding!=='zlib-base64'||!Number.isSafeInteger(value.expandedBytes)||value.expandedBytes<1||value.expandedBytes>MAX_EXPANDED_PROJECT_BYTES||typeof value.data!=='string'||value.data.length>24000000)throw Error('Onbekend of te groot gecomprimeerd project. Het huidige project blijft behouden.');
 try{
  const encoded=Uint8Array.from(atob(value.data),c=>c.charCodeAt(0));
  const decoded=unzlibSync(encoded,new Uint8Array(value.expandedBytes));
  if(decoded.length!==value.expandedBytes)throw Error('Onvolledig project');
  let a=1,b=0;for(const byte of decoded){a=(a+byte)%65521;b=(b+a)%65521;}
  if(encoded.length<6||new DataView(encoded.buffer,encoded.byteOffset,encoded.byteLength).getUint32(encoded.length-4)!==((b*65536+a)>>>0))throw Error('Checksum wijkt af');
  const project=JSON.parse(strFromU8(decoded));
  if(project?.format!=='rijksmap-project'||project.version!==1)throw Error('Ongeldig project');
  return unpoolSnapshots(project);
 }catch{throw Error('Het gecomprimeerde project is beschadigd of onvolledig. Het huidige project blijft behouden.');}
}
export const parseProjectText=text=>expandProject(JSON.parse(text));
