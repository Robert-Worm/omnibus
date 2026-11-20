import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {evidenceMetadataJson,evidencePathAlias,isEvidenceAlias} from './evidence-path.mjs';
import {reportPdfLink} from './report-pdf-link.mjs';

const location=['Z:', 'synthetic-evidence', 'résumé.pdf'].join('\\');
test('portable metadata binds the exact original path, not just the filename',()=>{
 const alias=evidencePathAlias(location);
 assert.equal(alias,`evidence/sha256-${createHash('sha256').update(location).digest('hex')}/résumé.pdf`);
 assert(isEvidenceAlias(alias));
 const source={records:[{id:'r1',original_path:location,quote:'Exact source.',start:0,end:13}],reviewBasis:'sealed'};
 const portable=structuredClone(source);portable.records[0].original_path=alias;
 assert.equal(evidenceMetadataJson(source),evidenceMetadataJson(portable));
 for(const edit of [r=>r.original_path=location.replace('synthetic-evidence','different'),r=>r.quote+='!',r=>r.start=1,r=>r.id='r2']){
  const wrong=structuredClone(source);edit(wrong.records[0]);assert.notEqual(evidenceMetadataJson(wrong),evidenceMetadataJson(portable));
 }
 const changed=structuredClone(portable);changed.records[0].original_path=alias.replace('résumé.pdf','other.pdf');
 assert.notEqual(evidenceMetadataJson(changed),evidenceMetadataJson(source));
 assert.equal(source.records[0].original_path,location,'comparison must not mutate saved projects');
});
test('path projection never normalizes source prose or relative evidence',()=>{
 const alias=evidencePathAlias(location);
 assert.notEqual(evidenceMetadataJson({quote:location}),evidenceMetadataJson({quote:alias}));
 assert.notEqual(evidenceMetadataJson({text:location}),evidenceMetadataJson({text:alias}));
 assert.equal(evidenceMetadataJson({file:'sources/source.pdf'}),JSON.stringify({file:'sources/source.pdf'}));
 assert.throws(()=>evidencePathAlias('sources/source.pdf'));
 assert(!isEvidenceAlias('https://example.invalid/file.pdf'));
});
test('a private evidence identity is not a published PDF download',()=>{
 assert.equal(reportPdfLink({id:'SYNTHETIC',localPdf:evidencePathAlias(location)},3),null);
 assert.equal(reportPdfLink({id:'SYNTHETIC',localPdf:'./bronnen/example.pdf'},3),'./bronnen/example.pdf#page=3');
 assert.equal(reportPdfLink({id:'CIBGBIO24',localPdf:evidencePathAlias(location)},3),'./bronnen/CIBGBIO24.pdf#page=3');
});

test('de snelle serialisatie geeft precies hetzelfde als de vervanger, ook met paden diep in de waarde',async()=>{
 const {evidenceMetadataJson:fast,evidencePathFields,isAbsoluteEvidencePath,evidencePathAlias}=await import('./evidence-path-core.mjs');
 const h=s=>String(s.length).padStart(64,'0');
 const slow=v=>JSON.stringify(v,(k,c)=>evidencePathFields.has(k)&&isAbsoluteEvidencePath(c)?evidencePathAlias(c,h):c);
 const keys=[...evidencePathFields,'quote','text'],vals=['C:\\a\\b.pdf','c:/a/b','\\\\s\\h\\f','rel/a','C:x','"C:\\','é C:\\z',' \\\\x',''];
 let seed=7;const rnd=n=>{seed=(seed*1103515245+12345)%2147483648;return seed%n;};
 for(let i=0;i<3000;i++){
  const o={};for(let j=0;j<3;j++)o[keys[rnd(keys.length)]]=rnd(3)?vals[rnd(vals.length)]:[{[keys[rnd(keys.length)]]:vals[rnd(vals.length)]}];
  let a,b;try{a=slow(o);}catch{a='fout';}try{b=fast(o,h);}catch{b='fout';}
  assert.equal(b,a,JSON.stringify(o));
 }
});
