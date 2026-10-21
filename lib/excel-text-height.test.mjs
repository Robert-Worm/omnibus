import test from 'node:test';
import assert from 'node:assert/strict';
import {fittedRowHeight} from './excel-text-height.mjs';

// Independent pre-optimization calculation: row heights are a layout contract,
// including its unusual whitespace and oversized-word boundary behavior.
function referenceHeight(value,width,{bold=false}={}){
 const letters='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
 const regular=[667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500];
 const heavy=[722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500];
 const glyph=c=>(bold?heavy:regular)[letters.indexOf(c)]??(/\d/.test(c)?556:/\s/.test(c)?278:/[.,:;!|'`]/.test(c)?278:/[-()[\]{}\/]/.test(c)?333:c.charCodeAt(0)>255?1000:556);
 const text=String(value?.formula?value.value:value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 const limit=Math.max(4,width-1.5)*556*.97;let lines=0;
 for(const paragraph of text.split('\n')){
  let used=0;lines++;
  for(const word of paragraph.match(/\S+|\s+/g)||[]){
   const size=[...word].reduce((sum,c)=>sum+glyph(c),0);
   if(/^\s+$/.test(word)){if(used)used+=size;continue;}
   if(used&&used+size>limit){lines++;used=0;}
   for(const c of word){const size=glyph(c);if(used+size>limit&&used){lines++;used=0;}used+=size;}
  }
 }
 return Math.max(24,bold?lines*15+20:lines*14.5+5);
}
test('faster text measurement preserves old heights for whitespace, Unicode, formulas and long words',()=>{
 const texts=['',null,42,'one two three',' leading \t spaces   and a trailing space ','\n\r\n\n',
  'é e\u0301 ß ø Æ 🧭 漢字 العربية\u00a0\u2003end','W'.repeat(2048),'[a-b]/c; ! | d. '+'.'.repeat(100),
  'Fictieve bronpassage 🧭.\n\n'.repeat(5000),{formula:'A1',value:'A cached\nformula value'}];
 for(const text of texts)for(const width of [0,4,5.5,11,25,33.125,110,255,Infinity])for(const bold of [false,true])
  assert.equal(fittedRowHeight(text,width,{bold}),referenceHeight(text,width,{bold}));
});
test('deterministic generated text covers exact and near word-wrap boundaries',()=>{
 let seed=2037;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
 const alphabet=['abc','W','i',' ','\t','\n','é','\u2009','🧭','漢','123','/','e\u0301'];
 for(let i=0;i<300;i++){
  const text=Array.from({length:20+Math.floor(random()*150)},()=>alphabet[Math.floor(random()*alphabet.length)]).join('');
  const width=random()*90,bold=random()>.5;
  assert.equal(fittedRowHeight(text,width,{bold}),referenceHeight(text,width,{bold}));
 }
 // Land directly on a glyph boundary and immediately to either side.
 for(const offset of [-Number.EPSILON,0,Number.EPSILON])for(const bold of [false,true]){
  const width=278*8/(556*.97)+1.5+offset;
  assert.equal(fittedRowHeight('iiiiiiii WWWW iiiiiiii',width,{bold}),referenceHeight('iiiiiiii WWWW iiiiiiii',width,{bold}));
 }
});
