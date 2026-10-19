const MAX_SOURCE_BYTES=64*1024*1024;

async function unpack(source) {
  const pack=source.packedSource;
  if(typeof DecompressionStream!=='function'||!globalThis.crypto?.subtle)
    throw Error('Deze browser kan de lokale brontekst niet uitpakken. Gebruik een recente versie van Edge, Chrome of Firefox.');
  const compressed=Uint8Array.from(atob(pack.data),c=>c.charCodeAt(0));
  const reader=new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip')).getReader();
  const chunks=[];let length=0;
  try {
    while(true){
      const next=await reader.read();if(next.done)break;
      length+=next.value.byteLength;
      if(length>pack.bytes)throw Error('Bronpakket is groter dan de gecontroleerde bronversie.');
      chunks.push(next.value);
    }
  } catch(error) {await reader.cancel().catch(()=>{});throw error;}
  finally {reader.releaseLock();}
  if(length!==pack.bytes)throw Error('Bronpakket is onvolledig.');
  const bytes=new Uint8Array(length);let offset=0;
  for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
  if(hash!==pack.sha256)throw Error('De integriteitscontrole van deze brontekst is mislukt.');
  return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
}

export function createReportSourceLoader({maxEntries=3,maxBytes=8*1024*1024,decode=unpack}={}) {
  if(!Number.isInteger(maxEntries)||maxEntries<0||!Number.isFinite(maxBytes)||maxBytes<0)throw Error('Ongeldige broncachegrens.');
  const cache=new Map(),pending=new Map();let retained=0;
  function identity(source) {
    const p=source.packedSource;
    if(p.encoding!=='gzip-json-v1'||!Number.isSafeInteger(p.bytes)||p.bytes<1||p.bytes>MAX_SOURCE_BYTES||!Number.isSafeInteger(p.pageCount)||p.pageCount<1||!/^[a-f0-9]{64}$/.test(p.sha256)||typeof p.data!=='string'||p.data.length>MAX_SOURCE_BYTES*2)
      throw Error('Dit bronpakket heeft een onbekende of ongeldige indeling.');
    return `${source.id}|${source.source_sha256}|${p.sha256}`;
  }
  return {
    async load(source) {
      if(!source.packedSource)return source; // Existing development and review data.
      const key=identity(source);
      const hit=cache.get(key);
      if(hit){cache.delete(key);cache.set(key,hit);return hit.value;}
      if(pending.has(key))return pending.get(key);
      const task=(async()=>{
        const value=await decode(source),size=source.packedSource.bytes;
        if(value.id!==source.id||value.source_sha256!==source.source_sha256||!Array.isArray(value.pages)||value.pages.length!==source.packedSource.pageCount||value.pages.some(p=>!Number.isInteger(p.page)||typeof p.text!=='string'))
          throw Error('De uitgepakte tekst hoort niet bij deze rapportbron.');
        if(maxEntries>0&&size<=maxBytes){
          while(cache.size>=maxEntries||retained+size>maxBytes){const oldest=cache.keys().next().value;retained-=cache.get(oldest).size;cache.delete(oldest);}
          cache.set(key,{value,size});retained+=size;
        }
        return value;
      })();
      pending.set(key,task);
      try{return await task;}finally{pending.delete(key);}
    },
    stats(){return {entries:cache.size,retainedBytes:retained,pending:pending.size};},
  };
}
export const reportSourceLoader=createReportSourceLoader();
