import test from 'node:test';
import assert from 'node:assert/strict';
import {PUBLIC_ADDRESS,pointLink,pointLinkBase,pointLinkHash,parsePointLink,isPointLink,passageFingerprint,pointPassages,
  requestPointLink,peekPointLink,clearPointLink,materialPointLink} from './point-link.mjs';

const point={id:'P-1',source_links:[{record_id:'r1',contribution:'PRIMARY'},{record_id:'r2',contribution:'CONTEXT'}]};
const records=[{id:'r1',source_spans:[{page:2,quote:'De entiteit  stelt\neen beleid vast.'}]},{id:'r2',source_spans:[{page:3,quote:'Tweede passage.'}]}];

test('een link bestaat uit de vaste ID van bron en toetspunt en leest ongewijzigd terug',()=>{
  const link=pointLink('DORA-2022-2554','DORA-PILOT13-N02-P02','abc123');
  assert.equal(link,PUBLIC_ADDRESS+'#toetspunt/DORA-2022-2554/DORA-PILOT13-N02-P02/abc123');
  assert.deepEqual(parsePointLink(new URL(link).hash),{sourceId:'DORA-2022-2554',pointId:'DORA-PILOT13-N02-P02',fingerprint:'abc123'});
  // Een ID met een schuine streep of spatie blijft één deel van het adres.
  const odd=pointLinkHash('BRON 1','IHH26-K03/TP01');
  assert.equal(odd,'#toetspunt/BRON%201/IHH26-K03%2FTP01');
  assert.deepEqual(parsePointLink(odd),{sourceId:'BRON 1',pointId:'IHH26-K03/TP01',fingerprint:''});
  assert.equal(pointLink('', 'x'),'');assert.equal(pointLink('x',''),'');
});

test('alles wat geen toetspuntlink is, wordt geweigerd',()=>{
  for(const hash of ['','#begin','#toetspunt','#toetspunt/','#toetspunt/a','#toetspunt/a/b/c/d','#toetspunt//b','#toetspunt/a/b/NIET-GELDIG!','#toetspunt/%E0%A4%A/b',null,undefined,42])
    assert.equal(parsePointLink(hash),null,String(hash));
  assert.equal(isPointLink('#toetspunt/a/b'),true);
  assert.equal(parsePointLink('#toetspunt/'+'a'.repeat(121)+'/b'),null);
});

test('een lokale of offline versie verwijst naar het openbare adres',()=>{
  assert.equal(pointLinkBase(undefined),PUBLIC_ADDRESS);
  assert.equal(pointLinkBase({protocol:'http:',hostname:'localhost',origin:'http://localhost:4321',pathname:'/'}),PUBLIC_ADDRESS);
  assert.equal(pointLinkBase({protocol:'http:',hostname:'127.0.0.1',origin:'http://127.0.0.1:4319',pathname:'/'}),PUBLIC_ADDRESS);
  assert.equal(pointLinkBase({protocol:'file:',hostname:'',origin:'null',pathname:'/x.html'}),PUBLIC_ADDRESS);
  assert.equal(pointLinkBase({protocol:'https:',hostname:'voorbeeld.test',origin:'https://voorbeeld.test',pathname:'/assets/worker.js'}),'https://voorbeeld.test/');
});

test('het kenmerk volgt de letterlijke passages, niet de opmaak of de volgorde',()=>{
  const mark=passageFingerprint(point,records);
  assert.match(mark,/^[a-z0-9]{6,16}$/);
  assert.equal(passageFingerprint(point,new Map(records.map(r=>[r.id,r]))),mark);
  assert.equal(passageFingerprint({...point,source_links:[...point.source_links].reverse()},records),mark);
  assert.equal(passageFingerprint(point,[{...records[0],source_spans:[{quote:'De entiteit stelt een beleid vast.'}]},records[1]]),mark);
  assert.notEqual(passageFingerprint(point,[{...records[0],source_spans:[{quote:'De entiteit stelt een plan vast.'}]},records[1]]),mark);
  // Zichtbare passages bij de koppeling gaan voor; een XML-passage telt mee.
  assert.deepEqual(pointPassages({source_links:[{record_id:'r1',visible_spans:[{quote:'Alleen dit'}]}]},[{...records[0],xml_evidence:{quote:'XML'}}]),['Alleen dit','XML']);
  assert.equal(passageFingerprint({source_links:[]},records),'');assert.equal(passageFingerprint(undefined,undefined),'');
});

test('de viewer leest het verzoek zonder het te verbruiken en meldt het daarna af',()=>{
  const link={sourceId:'S',pointId:'P',fingerprint:''};
  requestPointLink(link);
  assert.equal(peekPointLink('ANDERS'),null);
  const first=peekPointLink('S'),second=peekPointLink('S');
  assert.equal(first.pointId,'P');assert.equal(second,first);
  clearPointLink({...first});assert.equal(peekPointLink('S'),first,'alleen het eigen verzoek wordt afgemeld');
  clearPointLink(first);assert.equal(peekPointLink('S'),null);
});

test('een bouwsteen krijgt alleen een link als hij een toetspunt met herleiding uit een wet of kader is',()=>{
  const trace=JSON.stringify({point,records});
  const material={foundationId:'BRON',sourcePointId:'P-1',topicalTrace:trace};
  assert.equal(materialPointLink(material),PUBLIC_ADDRESS+'#toetspunt/BRON/P-1/'+passageFingerprint(point,records));
  assert.equal(materialPointLink({...material,topicalTrace:undefined,lawTrace:trace}),materialPointLink(material));
  assert.equal(materialPointLink({...material,topicalTrace:undefined,cioTrace:trace}),materialPointLink(material));
  // Een norm uit een kader zonder aparte bronrecords: de vaste ID van de norm, zonder passagekenmerk.
  assert.equal(materialPointLink({foundationId:'BVA2021',sourceControlId:'BVA2021-002',originKey:'BVA2021:2021-01-01:002'}),PUBLIC_ADDRESS+'#toetspunt/BVA2021/BVA2021-002');
  assert.equal(materialPointLink({foundationId:'BVA2021',sourceControlId:'BVA2021-002',originKey:'ANDERS:1'}),'');
  for(const none of [undefined,{},{foundationId:'BRON'},{foundationId:'BRON',sourcePointId:'P-1'},{...material,sourcePointId:'P-2'},{...material,topicalTrace:'{kapot'},{...material,foundationId:''},{sourcePointId:'P-1',reportTrace:trace}])
    assert.equal(materialPointLink(none),'');
});
