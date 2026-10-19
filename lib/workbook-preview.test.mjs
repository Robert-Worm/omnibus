import test from 'node:test';
import assert from 'node:assert/strict';
import {workbookPreviewEntries,workbookPreviewValue} from './workbook-preview.mjs';

const sheet=()=>({name:'synthetic',rows:[['ID','Title'],['P1','First'],['','Continuation'],['P2','Second']],widths:[12,40],merges:[],rowStyles:{},cellStyles:{}});
test('preview preserves entry ranges, IDs and ordering without changing cells',()=>{
 const input={...sheet(),entries:[{row:2,endRow:3,pointId:'P1'},{row:4,pointId:'P2'}]};
 const before=structuredClone(input);
 assert.deepEqual(workbookPreviewEntries(input),[
  {key:'P1:2',row:2,label:'P1 · First',rows:[['P1','First'],['','Continuation']]},
  {key:'P2:4',row:4,label:'P2 · Second',rows:[['P2','Second']]},
 ]);
 assert.deepEqual(input,before);
});
test('supporting sheets omit hidden-only, empty and formula-only reserve rows',()=>{
 const input={...sheet(),headerRow:1,hiddenColumns:[0],rows:[['Heading'],['hidden',''],['',{formula:'A1',value:'cached'}],['',0],['','Visible']]};
 assert.deepEqual(workbookPreviewEntries(input).map(e=>e.row),[4,5]);
 assert.deepEqual(workbookPreviewEntries(undefined),[]);
});
test('preview displays formula results and dates without evaluating formulas',()=>{
 assert.equal(workbookPreviewValue({formula:'A1+B1',value:3}),'3');
 assert.equal(workbookPreviewValue(new Date(2026,0,2)),'2-1-2026');
 assert.equal(workbookPreviewValue(''),'—');
 assert.equal(workbookPreviewValue({unexpected:true}),'—');
});
