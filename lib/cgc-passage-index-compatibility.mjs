// Node-only exact inverse proof, not semantic reapproval of any closed package.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const beforeHash='12d820c48dc2fd45ab9e8249d303a5a7a4debc5018939c27cc5da485fa658aaf';
const afterHash='25bbe8c13f605eabdc6041015df83d19b39d493916d3b4c40e28e592f967f13c';
const sha=b=>createHash('sha256').update(b).digest('hex');
export function closedPassageIndexBytes(bytes=readFileSync(new URL('./foundations/source-passages.json',import.meta.url))){
 assert.equal(sha(bytes),afterHash,'Unknown passage-index transition');
 const index=JSON.parse(bytes),history=JSON.parse(readFileSync(new URL('./foundations/source-passage-history.json',import.meta.url)));
 const old=history.entries.filter(e=>e.id==='CGC2025-AV03'&&e.location==='PDF p. 45 · 4.1.7');assert.equal(old.length,1);
 index['CGC2025-main'].entries['CGC2025-AV03']=old[0].documents['CGC2025-main'].passages;
 const inverse=Buffer.from(JSON.stringify(index,null,2));
 assert.equal(sha(inverse),beforeHash,'Non-CGC or historical passage index changed');
 return inverse;
}
