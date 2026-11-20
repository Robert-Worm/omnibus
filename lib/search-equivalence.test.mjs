import test from 'node:test';
import assert from 'node:assert/strict';
import {criterionIndex,searchCriteria,hasCriteriaMatch,searchText} from './criterion-search.mjs';
import {matchesTerm} from './search-synonyms.mjs';
import {createCatalogueSearch} from './catalogue-search.mjs';

const sources=[{id:'A',title:'Bron A',usage:'beveiliging'},{id:'B',title:'Bron B',usage:'continuïteit'}];
const items=[
  {id:'A-1',sourceId:'A',title:'Sterke authenticatie',auditNorm:'De entiteit gebruikt meerfactor voor toegang.',body:'',topic:'Toegang'},
  {id:'A-2',sourceId:'A',title:'Versleuteling',auditNorm:'Gegevens worden met encryptie beschermd.',body:'',topic:'Gegevens'},
  {id:'B-1',sourceId:'B',title:'Reservekopie',auditNorm:'Er is een back-up van kritieke systemen.',body:'',topic:'Herstel',sourceContext:'wachtwoord'},
  {id:'B-2',sourceId:'B',title:'Incidenten melden',auditNorm:'Ernstige incidenten worden gemeld.',body:'',topic:'Incidenten'},
];
// De oorspronkelijke regel, letterlijk: per rij en per term matchesTerm.
function reference(index,query,sourceIds){
  const terms=searchText(query).split(' ').filter(Boolean);if(!terms.length)return [];
  const allowed=new Set(sourceIds);
  return index.filter(row=>allowed.has(row.source.id)&&terms.every(term=>matchesTerm(row.text,term)))
    .map(row=>({...row,matchInCriterion:terms.every(term=>matchesTerm(row.direct,term)),
      score:terms.filter(term=>row.direct.includes(term)).length*2+terms.filter(term=>matchesTerm(row.direct,term)).length}))
    .sort((a,b)=>b.score-a.score);
}

test('zoeken geeft precies dezelfde treffers, volgorde en scores als de oorspronkelijke regel',()=>{
  const index=criterionIndex(items,sources);
  for(const query of ['mfa','MFA toegang','versleuteling','backup','back-up kritieke','incident','wachtwoord','password','a-1','bron b','x','','  ','encryptie gegevens','tlpt','meld'])
    for(const ids of [['A','B'],['A'],['B'],[]]){
      const got=searchCriteria(index,query,ids),want=reference(index,query,ids);
      assert.deepEqual(got.map(r=>[r.item.id,r.score,r.matchInCriterion]),want.map(r=>[r.item.id,r.score,r.matchInCriterion]),`"${query}" op ${ids}`);
      assert.equal(hasCriteriaMatch(index,query,ids),want.length>0,`bestaat "${query}" op ${ids}`);
    }
});

test('dezelfde zoekvraag op dezelfde bronnen wordt niet opnieuw berekend; een andere vraag of bronkeuze wel',()=>{
  const search=createCatalogueSearch(items,sources);
  const first=search('mfa',['A','B']);
  assert.equal(search('mfa',['A','B']),first,'hetzelfde antwoord, niet opnieuw gezocht');
  assert.deepEqual(first.criteria.map(r=>r.item.id),['A-1']);
  assert.notEqual(search('mfa',['B']),first);assert.deepEqual(search('mfa',['B']).criteria,[]);
  assert.deepEqual(search('incident').criteria.map(r=>r.item.id),['B-2']);
  assert.deepEqual(search('mfa',['A','B']).criteria.map(r=>r.item.id),['A-1'],'na een andere vraag klopt de eerste nog');
  assert.equal(search('',['A']).sources.length,1);
});
