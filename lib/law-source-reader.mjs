import {indexPages} from './source-text-blocks.mjs';

// Reviewed offsets and reader offsets both count Unicode codepoints, not UTF-16.
export function lawReaderPassages(pages,spans,label=''){
 const indexed=indexPages(pages);
 return spans.flatMap(span=>{
  const page=indexed.find(p=>p.page===span.page),chars=Array.from(page?.text||'');
  if(!page||!Number.isInteger(span.start)||!Number.isInteger(span.end)||span.start<0||span.end<=span.start||span.end>chars.length||chars.slice(span.start,span.end).join('')!==span.quote)return [];
  return [{page:span.page,start:page.start+span.start,end:page.start+span.end,quote:span.quote,label}];
 });
}
