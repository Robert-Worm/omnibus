import {zlibSync,unzlibSync,strToU8,strFromU8} from 'fflate';
import {MAX_SOURCE_TRACE_CHARACTERS, MAX_PROJECT_MATERIALS} from './project-limits.mjs';

// Rich source snapshots repeat context intentionally. Lossless compression is
// transport-only: the in-memory project and its source snapshots are unchanged.
const FORMAT='rijksmap-project-compressed';
export const MAX_EXPANDED_PROJECT_BYTES=64000000;
// Na het samenvoegen van gedeelde bronherleidingen mag een project groter zijn dan wat er opgeslagen wordt: dezelfde
// bronrecords staan dan bij elk toetspunt. Ruim genoeg voor het maximale aantal bouwstenen uit grote DORA-bronnen.
export const MAX_RESTORED_PROJECT_BYTES=128000000;
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
// Browseropslag telt tekens, niet bytes. Base64 bergt 6 bits per teken, deze codering 15 (tekens U+4000–U+BFFF, geen
// surrogaten of stuurtekens), zodat een kader tot de limiet van 1.000 toetspunten in de opslag past (testronde 19-11, B1).
// Alleen voor de browseropslag; een bewaard projectbestand blijft base64 (gewone ASCII-tekst).
const DENSE_BASE=0x4000;
function dense(bytes){
 const out=[];let acc=0,bits=0,s='';
 for(let i=0;i<bytes.length;i++){
  acc=(acc<<8)|bytes[i];bits+=8;
  if(bits>=15){bits-=15;out.push(DENSE_BASE+((acc>>bits)&0x7fff));acc&=(1<<bits)-1;}
  if(out.length>=8192){s+=String.fromCharCode(...out);out.length=0;}
 }
 if(bits>0)out.push(DENSE_BASE+((acc<<(15-bits))&0x7fff));
 return s+String.fromCharCode(...out);
}
function undense(text,length){
 const out=new Uint8Array(length);let acc=0,bits=0,n=0;
 if(Math.ceil(length*8/15)!==text.length)throw Error('Onvolledig project');
 for(let i=0;i<text.length;i++){
  const v=text.charCodeAt(i)-DENSE_BASE;if(v<0||v>0x7fff)throw Error('Onvolledig project');
  acc=(acc<<15)|v;bits+=15;
  while(bits>=8&&n<length){bits-=8;out[n++]=(acc>>bits)&0xff;}
  acc&=(1<<bits)-1;
 }
 return out;
}
function base64(bytes){let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(s);}
// Topical-bronherleidingen herhalen grote, gedeelde delen (bronbinding, normtekst, records) bij elk toetspunt.
// Ze worden als boom opgeslagen: een deel boven deze grens wordt verder opgesplitst, een kleiner deel staat één keer in
// de pool. Zo past een kader met honderden toetspunten in de browseropslag. Het herstel is exact (zelfde tekst).
const TREE_SPLIT=4096,TREE_DEPTH=32;
function poolSnapshots(project){
 const pool=[],indices=new Map();
 const intern=v=>{const text=JSON.stringify(v);if(!indices.has(text)){indices.set(text,pool.length);pool.push(text);}return indices.get(text);};
 const tree=(v,depth=0)=>{
  if(depth<TREE_DEPTH&&v&&typeof v==='object'&&JSON.stringify(v).length>TREE_SPLIT)
   return Array.isArray(v)?{a:v.map(x=>tree(x,depth+1))}:{o:Object.entries(v).map(([k,x])=>[k,tree(x,depth+1)])};
  return intern(v);
 };
 const materials=project.draft.investigation.materials.map(m=>{
  let next=m;
  if(m.topicalTrace&&typeof m.topicalTrace==='string'){
   let trace=null;try{trace=JSON.parse(m.topicalTrace);}catch{/* Leave unreadable text as it is. */}
   if(trace&&typeof trace==='object'&&JSON.stringify(trace)===m.topicalTrace)next={...next,topicalTrace:{snapshotTree:tree(trace)}};
  }
  if(!m.lawTrace)return next;const trace=JSON.parse(m.lawTrace);
  if(JSON.stringify(trace)!==m.lawTrace)return next;
  return {...next,lawTrace:{snapshotParts:Object.entries(trace).map(([key,v])=>[key,Array.isArray(v)?v.map(intern):intern(v)])}};
 });
 return {...project,snapshotPool:pool,draft:{...project.draft,investigation:{...project.draft.investigation,materials}}};
}
function unpoolSnapshots(project){
 if(!Object.hasOwn(project,'snapshotPool'))return project;
 const pool=project.snapshotPool;if(!Array.isArray(pool)||pool.some(v=>typeof v!=='string'))throw Error('Ongeldige bronopslag');
 const materials=project.draft?.investigation?.materials;
 if(!Array.isArray(materials)||materials.length>MAX_PROJECT_MATERIALS)throw Error('Ongeldige bronopslag');
 const pooled=m=>typeof m.lawTrace==='object'&&m.lawTrace!==null;
 const pooledTopical=m=>typeof m.topicalTrace==='object'&&m.topicalTrace!==null;
 const {snapshotPool:_snapshotPool,...plain}=project;
 const baseline={...plain,draft:{...plain.draft,investigation:{...plain.draft.investigation,materials:materials.map(m=>{
  if(!m||typeof m!=='object'||Array.isArray(m))throw Error('Ongeldige bronopslag');
  return pooled(m)||pooledTopical(m)?{...m,...(pooled(m)?{lawTrace:''}:{}),...(pooledTopical(m)?{topicalTrace:''}:{})}:m;
 })}}};
 // Account for the rest of the project, including untouched traces and the
 // enclosing quotes of each placeholder. Check ALL materials before any join.
 let bytes=textBytes(JSON.stringify(baseline));
 if(bytes>MAX_RESTORED_PROJECT_BYTES)throw Error('Bronopslag te groot');
 const partSizes=new Map();
 const partSize=i=>{
  if(!Number.isSafeInteger(i)||i<0||i>=pool.length)throw Error('Ontbrekende broncontext');
  if(pool[i].length>MAX_SOURCE_TRACE_CHARACTERS)throw Error('Bronopslag te groot');
  if(!partSizes.has(i))partSizes.set(i,textBytes(pool[i],true));
  return partSizes.get(i);
 };
 // Boom van een Topical-bronherleiding: eerst alles tellen, pas daarna samenvoegen.
 const checkTree=(node,add,depth)=>{
  if(depth>TREE_DEPTH)throw Error('Ongeldige bronopslag');
  if(typeof node==='number'){add(pool[node]?.length??0,partSize(node));return;}
  if(!node||typeof node!=='object'||Array.isArray(node))throw Error('Ongeldige bronopslag');
  const keys=Object.keys(node);if(keys.length!==1||!['o','a'].includes(keys[0])||!Array.isArray(node[keys[0]]))throw Error('Ongeldige bronopslag');
  const items=node[keys[0]];add(2,2);
  for(let i=0;i<items.length;i++){
   if(i)add(1,1);
   if(keys[0]==='a'){checkTree(items[i],add,depth+1);continue;}
   const entry=items[i];
   if(!Array.isArray(entry)||entry.length!==2||typeof entry[0]!=='string'||entry[0].length>MAX_SOURCE_TRACE_CHARACTERS)throw Error('Ongeldig bronveld');
   const key=JSON.stringify(entry[0]);add(key.length+1,textBytes(key,true)+1);checkTree(entry[1],add,depth+1);
  }
 };
 const buildTree=node=>typeof node==='number'?pool[node]:node.a?'['+node.a.map(buildTree).join(',')+']':'{'+node.o.map(([k,v])=>JSON.stringify(k)+':'+buildTree(v)).join(',')+'}';
 for(const m of materials){
  if(pooledTopical(m)){
   const keys=Object.keys(m.topicalTrace);if(keys.length!==1||keys[0]!=='snapshotTree')throw Error('Ongeldige bronopslag');
   let characters=0;
   checkTree(m.topicalTrace.snapshotTree,(length,size)=>{
    characters+=length;bytes+=size;
    if(characters>MAX_SOURCE_TRACE_CHARACTERS||bytes>MAX_RESTORED_PROJECT_BYTES)throw Error('Bronopslag te groot');
   },0);
  }
  if(!pooled(m))continue;
  const fields=m.lawTrace.snapshotParts;
  if(!Array.isArray(fields))throw Error('Ongeldige bronopslag');
  let characters=0;
  const add=(length,size)=>{
   characters+=length;bytes+=size;
   if(characters>MAX_SOURCE_TRACE_CHARACTERS||bytes>MAX_RESTORED_PROJECT_BYTES)throw Error('Bronopslag te groot');
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
  if(pooledTopical(m))m={...m,topicalTrace:buildTree(m.topicalTrace.snapshotTree)};
  if(!pooled(m))return m;
  const lawTrace='{'+m.lawTrace.snapshotParts.map(([k,v])=>JSON.stringify(k)+':'+(Array.isArray(v)?'['+v.map(i=>pool[i]).join(',')+']':pool[v])).join(',')+'}';
  return {...m,lawTrace};
 });
 return {...plain,draft:{...plain.draft,investigation:{...plain.draft.investigation,materials:restored}}};
}
/** Voor de browseropslag: dezelfde inhoud als serializeProject, compacter in tekens. */
export const serializeStoredProject=project=>serializeProject(project,false,'zlib-utf16');
export function serializeProject(project,_pretty=false,encoding='zlib-base64'){
 const text=JSON.stringify(project);
 if(text.length>MAX_RESTORED_PROJECT_BYTES||textBytes(text)>MAX_RESTORED_PROJECT_BYTES)throw Error('Project is te groot om veilig te bewaren.');
 const pooled=project.draft?.investigation?.materials?.some(m=>m.lawTrace||m.topicalTrace)?poolSnapshots(project):project;
 const bytes=strToU8(JSON.stringify(pooled));if(bytes.length>MAX_EXPANDED_PROJECT_BYTES)throw Error('Project is te groot om veilig te bewaren.');
 const packed=zlibSync(bytes,{level:6});
 if(encoding==='zlib-utf16')return JSON.stringify({format:FORMAT,version:1,encoding,expandedBytes:bytes.length,packedBytes:packed.length,data:dense(packed)});
 return JSON.stringify({format:FORMAT,version:1,encoding:'zlib-base64',expandedBytes:bytes.length,data:base64(packed)});
}
export function expandProject(value){
 if(value?.format!==FORMAT)return value;
 const utf16=value?.encoding==='zlib-utf16'&&Number.isSafeInteger(value.packedBytes)&&value.packedBytes>=6&&value.packedBytes<=MAX_EXPANDED_PROJECT_BYTES;
 if(value.version!==1||(value.encoding!=='zlib-base64'&&!utf16)||!Number.isSafeInteger(value.expandedBytes)||value.expandedBytes<1||value.expandedBytes>MAX_EXPANDED_PROJECT_BYTES||typeof value.data!=='string'||value.data.length>24000000)throw Error('Onbekend of te groot gecomprimeerd project. Het huidige project blijft behouden.');
 try{
  // Copy directly into the final byte buffer; Uint8Array.from(string, fn)
  // otherwise allocates an intermediate iterable array for a large project.
  let encoded;
  if(utf16)encoded=undense(value.data,value.packedBytes);
  else{const binary=atob(value.data);encoded=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)encoded[i]=binary.charCodeAt(i);}
  const decoded=unzlibSync(encoded,new Uint8Array(value.expandedBytes));
  if(decoded.length!==value.expandedBytes)throw Error('Onvolledig project');
  // Adler-32 remains mandatory. Reducing modulo once per bounded block is
  // equivalent to per-byte reduction. 5552 keeps both sums within uint32.
  let a=1,b=0;
  for(let start=0;start<decoded.length;start+=5552){
   const end=Math.min(start+5552,decoded.length);
   for(let i=start;i<end;i++){a+=decoded[i];b+=a;}
   a%=65521;b%=65521;
  }
  if(encoded.length<6||new DataView(encoded.buffer,encoded.byteOffset,encoded.byteLength).getUint32(encoded.length-4)!==((b*65536+a)>>>0))throw Error('Checksum wijkt af');
  const project=JSON.parse(strFromU8(decoded));
  if(project?.format!=='rijksmap-project'||!Number.isSafeInteger(project.version)||project.version<1)throw Error('Ongeldig project');
  return unpoolSnapshots(project);
 }catch{throw Error('Het gecomprimeerde project is beschadigd of onvolledig. Het huidige project blijft behouden.');}
}
export const parseProjectText=text=>expandProject(JSON.parse(text));
