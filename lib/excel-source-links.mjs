const unique=xs=>[...new Set(xs.filter(Boolean))];
// Verified against the publication's article headings on 2026-10-11.
// These are the operative articles, not the similarly named explanatory headings.
const cioArticleAnchors=['70','236','255','292','370','395','410','483','508','570','658','683','767','792','890','915','954','976','1044','1064','1121','1161','1191','1220','1226','1232','1238'];
export function sourcePassageUrl(source){
 const raw=source?.url||'';if(!/^https?:\/\//i.test(raw))return '';
 const url=new URL(raw);if(url.hash)return raw;
 if(url.hostname==='zoek.officielebekendmakingen.nl'&&url.pathname==='/stcrt-2025-40208.html'){
  const article=source.location?.match(/\b(?:Artikel|Art\.?)\s*(\d+)\b/i)?.[1];
  if(article&&cioArticleAnchors[Number(article)-1])url.hash='d17e'+cioArticleAnchors[Number(article)-1];
 }else if(url.hostname==='wetten.overheid.nl'&&source.xmlAnchor){
  // Use the actual source hierarchy, not a guessed article number or new edition.
  const article=source.xmlAnchor.match(/^\/(.*?\/Artikel\d+[a-z]?)(?:\/|$)/i)?.[1];
  if(article)url.hash=article.replaceAll('/','_');
  else if(source.xmlAnchor==='/Bijlage'||source.xmlAnchor.startsWith('/Bijlage/'))url.hash='Bijlage';
 }else if(source.format==='pdf'||/\.pdf$/i.test(url.pathname)){
  const page=source.location?.match(/\b(?:p\.|pagina)\s*(\d+)/i)?.[1];if(page)url.hash='page='+page;
 }
 return url.href;
}
export function compactSourceText(record,key){
 if(key==='location'&&record.sources.length&&record.sources.every(x=>x.overviewArticle)){
  const articles=new Map();for(const x of record.sources)articles.set(x.overviewArticle,unique([...(articles.get(x.overviewArticle)||[]),...(x.overviewPages||[])]));
  return [...articles].map(([article,pages])=>article+(pages.length?' · p. '+pages.sort((a,b)=>Number(a)-Number(b)).join(', '):'')).join('\n');
 }
 return unique(record.sources.map(x=>key==='title'?[x.overviewTitle||x.title,x.versionLabel].filter(Boolean).join('\n'):x[key])).join('\n');
}

// Excel permits one destination per cell. Share a cell for references on the
// same source page; use separate cells for different pages/documents.
export function sourcePageGroups(record){
 const groups=new Map();
 for(const source of record.sources){
  const url=source.url||'',pdf=source.format==='pdf'||/\.pdf(?:[?#]|$)/i.test(url);
  // A web publication is one scrollable page, even if its source locators
  // mention several printed pages. Only PDF pages need separate destinations.
  const pages=pdf?unique(source.overviewPages?.length?source.overviewPages:[...String(source.location||'').matchAll(/\bp\.\s*(\d+)/gi)].map(m=>Number(m[1]))):[];
  for(const page of pages.length?pages:[null]){
   const key=(url.split('#')[0]||source.title||'unknown')+'\u0000'+(page??'web');
   if(!groups.has(key))groups.set(key,{sources:[],page,target:sourcePassageUrl(page&&pdf?{...source,url:url.split('#')[0],location:'p. '+page}:source)});
   const group=groups.get(key);group.sources.push(page&&source.overviewArticle?{...source,overviewPages:[page]}:page&&pages.length>1?{...source,location:String(source.location||'').replace(/(?:\s*·\s*)?\bp\.\s*\d+/gi,'').trim()+' · p. '+page}:source);
  }
 }
 return [...groups.values()].map(g=>({...g,label:compactSourceText(g,'location')||compactSourceText(g,'title')}));
}
