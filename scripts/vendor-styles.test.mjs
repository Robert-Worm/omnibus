import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {fontLicenseNotices,textLicenseNotice} from './font-license-notices.mjs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const hash=value=>createHash('sha256').update(value).digest('hex');

test('the retained stylesheet is the exact shadcn 4.18.0 asset, without its generator',()=>{
  // Pin the upstream bytes, not a rewritten approximation of component states.
  assert.equal(hash(read('app/vendor/shadcn-tailwind.css')),
    'bc7d83425702955b4cb67cb14ede9d603f9d912376d57a2d81d661094d2a782a');
  assert.match(read('app/globals.css'),/@import "\.\/vendor\/shadcn-tailwind\.css"/);
  const lock=JSON.parse(read('package-lock.json'));
  for(const name of ['shadcn','braces','micromatch','fast-glob'])
    assert(!Object.keys(lock.packages).some(path=>path.endsWith('node_modules/'+name)),name);
  assert(lock.packages['node_modules/@shadcn/react'],'Used React components must remain available');
});

test('redistribution notices retain their text without allowing a comment escape',()=>{
  const license=read('app/vendor/shadcn-LICENSE.txt');
  assert.match(license,/Copyright \(c\) 2023 shadcn/);
  assert.match(license,/Permission is hereby granted/);
  assert.match(license,/THE SOFTWARE IS PROVIDED "AS IS"/);
  assert(textLicenseNotice('Stylesheet license',license).includes(license));
  assert.equal(textLicenseNotice('Test','before --> after'),'<!-- Test\nbefore —> after\n-->');
  assert.equal(fontLicenseNotices('/*! Original font notice */'),'<!-- Font license\n Original font notice \n-->');
});

test('separate font assets preserve the exact original faces, glyphs and licence text',()=>{
  const css=read('app/rijksmap-fonts.css').replaceAll('\r\n','\n');
  const names=[];
  const embedded=css.replace(/url\("\.\/fonts\/([a-z-]+\.woff2)"\)/g,(_match,name)=>{
    names.push(name);
    const bytes=readFileSync(new URL('../app/fonts/'+name,import.meta.url));
    assert.equal(bytes.subarray(0,4).toString(),'wOF2');
    return 'url(data:font/woff2;base64,'+bytes.toString('base64')+')';
  });
  assert.deepEqual(names,['inter-regular.woff2','inter-regular.woff2','inter-regular.woff2',
    'spectral-semibold.woff2','spectral-bold.woff2']);
  // Reconstruct the pre-extraction stylesheet: no font conversion, weight/range
  // changes or lost notices can pass this comparison. Only delivery changed.
  assert.equal(hash(embedded),'a8251b7fb0c619c5258184213928f4c299622fec515ab2c3a204cfc0e6cf951b');
  assert(!css.includes('data:font/'));
  assert(css.length<16000,'font bytes no longer block the stylesheet download');
});
