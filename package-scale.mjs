import fs from 'node:fs';
const js=fs.readFileSync('scale-build/browser.js','utf8').replace(/<\/script/gi,'<\\/script');
const css=fs.readFileSync('scale-build/browser.css','utf8');
fs.writeFileSync('../ui-scale-navigation/TEST-scale.html',`<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>TEST — Rijksmap schaalnavigatie</title><style>${css}</style></head><body><div id="root"></div><script>${js}</script></body></html>`);
