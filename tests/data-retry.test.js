import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadTrack } from '../js/data.js';

test('failed exam loads can be retried and successful loads are cached',async()=>{
  const original=globalThis.fetch;
  let calls=0;
  globalThis.fetch=async()=>{calls++;if(calls===1)throw new Error('offline');return {ok:true,json:async()=>({code:'retry-fixture'})};};
  try{
    assert.equal(await loadTrack('retry-fixture'),null);
    assert.deepEqual(await loadTrack('retry-fixture'),{code:'retry-fixture'});
    assert.deepEqual(await loadTrack('retry-fixture'),{code:'retry-fixture'});
    assert.equal(calls,2);
  }finally{globalThis.fetch=original;}
});
