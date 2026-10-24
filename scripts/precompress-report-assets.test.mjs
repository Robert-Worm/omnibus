import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {brotliDecompressSync} from 'node:zlib';
import {precompressReportAssets} from './precompress-report-assets.mjs';

const asset = source => ({type: 'asset', source,
  fileName: 'assets/report-content-' + createHash('sha256').update(source).digest('hex') + '.js'});
const run = bundle => {
  const emitted = [];
  precompressReportAssets().generateBundle.call({emitFile: file=>emitted.push(file)}, {}, bundle);
  return emitted;
};

test('future 200-norm assets get a lossless standard Brotli representation without changing the original', () => {
  const source = 'export default ' + JSON.stringify(Array.from({length:200},(_,i)=>({id:'synthetic-'+i, text:'Exact source 🧭 \\" < >', status:i%2?'HOLD':'retain'})));
  const original=asset(source), bundle={[original.fileName]:original, 'assets/app.js':{type:'chunk',fileName:'assets/app.js',code:'unchanged'}};
  const before=structuredClone(bundle), emitted=run(bundle);
  assert.deepEqual(bundle,before);assert.equal(emitted.length,1);
  assert.equal(emitted[0].fileName,original.fileName+'.br');assert.equal(emitted[0].type,'asset');
  assert(emitted[0].source.length<Buffer.byteLength(source));
  assert.equal(brotliDecompressSync(emitted[0].source).toString(),source);
  assert.deepEqual(run(bundle),emitted,'Same verified build yields the same representation');
  assert.deepEqual(run({a:asset(new Uint8Array(Buffer.from(source)))}),emitted);
});

test('compression is restricted to verified report assets and never overwrites a representation', () => {
  assert.deepEqual(run({small:asset('export default {};')}),[]);
  assert.deepEqual(run({other:{type:'asset',fileName:'assets/arbitrary.js',source:'untouched'}}),[]);
  const original=asset('x'.repeat(2000));
  assert.throws(()=>run({a:{...original,source:'changed'}}),/compression input/);
  assert.throws(()=>run({a:{...original,type:'chunk'}}),/compression input/);
  assert.throws(()=>run({a:original,[original.fileName+'.br']:{source:'existing'}}),/already exists/);
  assert.throws(()=>run({a:asset('x'.repeat(4*1024*1024+1))}),/compression input/);
});
