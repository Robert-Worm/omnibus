import {criterionIndex,searchCriteria,searchText} from './criterion-search.mjs';
import {catalogueRevision} from './catalogue-runtime.mjs';

const ignored=new Set('de het een en van voor met door zijn wordt worden welke hoe bij dat dit die deze over onder naar niet geen alleen moet moeten kunnen eigen als uit tot om aan op in ook of is'.split(' '));
// One missing/extra/wrong letter or adjacent transposition. Never approximate IDs,
// numbers, short abbreviations or negations, and never change the submitted query.
export function nearWord(a,b) {
  if(!/^[a-z]{5,40}$/.test(a)||!/^[a-z]{5,40}$/.test(b)||Math.abs(a.length-b.length)>1||a===b)return false;
  if(a.length===b.length){
    const diff=[...a].flatMap((c,i)=>c===b[i]?[]:[i]);
    return diff.length===1 || (diff.length===2 && diff[1]===diff[0]+1 && a[diff[0]]===b[diff[1]] && a[diff[1]]===b[diff[0]]);
  }
  const [short,long]=a.length<b.length?[a,b]:[b,a];let i=0;
  while(i<short.length&&short[i]===long[i])i++;
  return short.slice(i)===long.slice(i+1);
}

export function createCatalogueSearch(items,sources) {
  let index,words,revision=-1;
  function prepare(){
    if(revision!==catalogueRevision()){index=null;words=null;revision=catalogueRevision();}
    if(index)return;
    index=criterionIndex(items,sources);words=new Map();
    const add=(text,sourceId)=>{
      for(const word of new Set(searchText(text).match(/[a-z]{4,40}/g)||[])){
        if(ignored.has(word))continue;
        if(!words.has(word))words.set(word,new Set());words.get(word).add(sourceId);
      }
    };
    for(const source of sources)add([source.title,source.usage].join(' '),source.id);
    for(const item of items)add([item.title,item.groupTitle,item.topic].join(' '),item.sourceId);
  }
  return (query,sourceIds=sources.map(s=>s.id))=>{
    const allowed=new Set(sourceIds),available=sources.filter(s=>allowed.has(s.id));
    const normalized=searchText(query);
    if(!normalized)return {sources:available,criteria:[],suggestions:[],sourceCorrections:[],criterionCorrections:[],contextSourceIds:[]};
    prepare();
    // Preserve each typed ID as one phrase, as in the source workspace search.
    const tokens=String(query).trim().split(/\s+/).map(searchText);
    const vocabulary=[...words].filter(([,ids])=>[...ids].some(id=>allowed.has(id))).map(([word])=>word);
    const sourceMatches=terms=>available.filter(s=>terms.every(t=>searchText([s.id,s.title,s.usage,s.edition].join(' ')).includes(t)))
      .sort((a,b)=>{
        const rank=s=>searchText(s.id)===terms.join(' ')?0:terms.every(t=>searchText([s.id,s.title].join(' ')).includes(t))?1:2;
        return rank(a)-rank(b)||a.title.localeCompare(b.title,'nl');
      });
    let found=sourceMatches(tokens),criteria=searchCriteria(index,query,sourceIds);
    const replacements=[];
    for(let i=0;i<tokens.length;i++){
      if(ignored.has(tokens[i])||vocabulary.includes(tokens[i]))continue;
      for(const word of vocabulary.filter(w=>nearWord(tokens[i],w)).sort((a,b)=>a.localeCompare(b,'nl')).slice(0,3)){
        const corrected=tokens.map((t,n)=>n===i?word:t).join(' ');
        replacements.push(corrected);
      }
    }
    const sourceCorrections=[],criterionCorrections=[];
    // Exact matches always win. Approximate results are a labelled fallback only.
    if(!found.length){
      const seen=new Set();
      for(const corrected of replacements.slice(0,6)){
        const rows=sourceMatches(corrected.split(' '));if(!rows.length)continue;
        sourceCorrections.push(corrected);
        for(const row of rows)if(!seen.has(row.id)){seen.add(row.id);found.push(row);}
      }
    }
    if(!criteria.length){
      const seen=new Set();
      for(const corrected of replacements.slice(0,6)){
        const rows=searchCriteria(index,corrected,sourceIds);if(!rows.length)continue;
        criterionCorrections.push(corrected);
        for(const row of rows)if(!seen.has(row.item.originKey||row.item.id)){seen.add(row.item.originKey||row.item.id);criteria.push(row);}
      }
    }
    const contextSourceIds=[];
    const sourceHits=new Map();
    for(const row of criteria)sourceHits.set(row.source.id,(sourceHits.get(row.source.id)||0)+1);
    const foundIds=new Set(found.map(s=>s.id));
    for(const source of available.filter(s=>sourceHits.has(s.id)&&!foundIds.has(s.id))
      .sort((a,b)=>sourceHits.get(b.id)-sourceHits.get(a.id)||a.title.localeCompare(b.title,'nl'))){
      found.push(source);contextSourceIds.push(source.id);
    }
    const suggestions=[],seen=new Set([normalized]);
    const suggest=(value)=>{const key=searchText(value);if(!seen.has(key)&&suggestions.length<5){seen.add(key);suggestions.push(value);}};
    const last=tokens.at(-1),prefix=tokens.slice(0,-1);
    if(normalized.length>=2){
      for(const source of found.slice(0,2))if(searchText(source.id).startsWith(normalized)||sourceCorrections.length)suggest(source.id);
      for(const corrected of replacements)if(sourceCorrections.includes(corrected)||criterionCorrections.includes(corrected))suggest(corrected);
      if(last.length>=2)for(const word of vocabulary.filter(w=>w.startsWith(last)&&w!==last).sort((a,b)=>words.get(b).size-words.get(a).size||a.length-b.length||a.localeCompare(b,'nl'))){
        const value=[...prefix,word].join(' ');
        if(searchCriteria(index,value,sourceIds).length||sourceMatches([...prefix,word]).length)suggest(value);
        if(suggestions.length>=5)break;
      }
    }
    return {sources:found,criteria,suggestions,sourceCorrections,criterionCorrections,contextSourceIds};
  };
}
