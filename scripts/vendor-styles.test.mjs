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
