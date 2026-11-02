import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanSaved} from './browse-state.ts';

// Opgeslagen weergavekeuzes mogen nooit een filter breken (#292).
const standaard={zoek:'',kolommen:['titel','bron'],compact:false};

test('een opgeslagen waarde van het juiste type blijft',()=>{
 assert.deepEqual(cleanSaved(standaard,{zoek:'ISO',kolommen:['titel'],compact:true}),{zoek:'ISO',kolommen:['titel'],compact:true});
});

test('een waarde van het verkeerde type valt terug op de standaard',()=>{
 assert.deepEqual(cleanSaved(standaard,{zoek:42,kolommen:['titel',7],compact:'ja',vreemd:1}),standaard);
 assert.deepEqual(cleanSaved(standaard,{kolommen:'titel'}),standaard);
});

test('kapotte of lege opslag geeft de standaard',()=>{
 for(const saved of [null,'tekst',42,[]])assert.deepEqual(cleanSaved(standaard,saved),standaard);
});
