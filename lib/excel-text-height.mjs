// Approximate Arial/Calibri proportional advances, in thousandths of an em.
// Unlike character counts, this respects word wrapping and narrow/wide letters.
const letters='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const advances=[667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500];
const widths=Object.fromEntries([...letters].map((c,i)=>[c,advances[i]]));
const boldAdvances=[722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500];
const boldWidths=Object.fromEntries([...letters].map((c,i)=>[c,boldAdvances[i]]));
const advance=c=>widths[c]??(/\d/.test(c)?556:/\s/.test(c)?278:/[.,:;!|'`]/.test(c)?278:/[-()[\]{}\/]/.test(c)?333:c.charCodeAt(0)>255?1000:556);
export function fittedRowHeight(value,width,{bold=false}={}){
 const glyph=c=>bold?(boldWidths[c]??advance(c)):advance(c);
 const text=String(value?.formula?value.value:value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 const limit=Math.max(4,width-1.5)*556*.97;
 let lines=0;
 for(const paragraph of text.split('\n')){
  let used=0;lines++;
  for(const word of paragraph.match(/\S+|\s+/g)||[]){
   const size=[...word].reduce((sum,c)=>sum+glyph(c),0);
   if(/^\s+$/.test(word)){if(used)used+=size;continue;}
   if(used&&used+size>limit){lines++;used=0;}
   for(const c of word){const size=glyph(c);if(used+size>limit&&used){lines++;used=0;}used+=size;}
  }
 }
 // Small breathing room; no fixed reserve for empty input cells.
 // Excel's bold wrapping can need one extra line at word-boundary rounding.
 return Math.max(24,bold?lines*15+20:lines*14.5+5);
}
