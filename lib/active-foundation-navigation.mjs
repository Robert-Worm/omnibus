import {filterSources as historicalFilter,sourceDomains as historicalDomains} from './process-catalogue.mjs';
import {cioSourceId} from './cio-law-data.mjs';
import {wwkeSourceId} from './wwke-law-data.mjs';
import {extendSourceDomains} from './foundation-navigation-domains.mjs';
export const sourceDomains=extendSourceDomains(Object.fromEntries(Object.entries(historicalDomains).map(([key,value])=>[key,{...value,ids:[...value.ids,...(['it','governance'].includes(key)?[cioSourceId]:[]),...(key==='cyber'?[wwkeSourceId]:[])]}])));
export function filterSources(sources,options={}){
 const inDomain=!options.domain||options.domain==='all'?sources:sources.filter(s=>sourceDomains[options.domain]?.ids.includes(s.id));
 const reviewed=[{id:cioSourceId,domains:['it','governance'],process:'PR12'},{id:wwkeSourceId,domains:['cyber'],process:'PR10'}];
 const old=historicalFilter(inDomain.filter(s=>!reviewed.some(r=>r.id===s.id)),{...options,domain:'all'});
 const matched=reviewed.flatMap(r=>{
  const source=inDomain.find(s=>s.id===r.id);
  const allowedDomain=!options.domain||options.domain==='all'||r.domains.includes(options.domain);
  const allowedProcess=!options.processId||options.processId===r.process;
  return source&&allowedDomain&&allowedProcess?historicalFilter([source],{...options,domain:'all',processId:''}):[];
 });
 return [...matched,...old];
}
