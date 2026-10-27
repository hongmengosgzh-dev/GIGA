import {test} from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker.js';
test('Worker routes APIs separately from public assets',async()=>{
 let assets=0;
 const env={ASSETS:{fetch(){assets++;return new Response('asset');}}};
 const ctx={waitUntil(){}};
 const call=path=>worker.fetch(new Request('https://shop.test'+path),env,ctx);
 assert.equal((await call('/api/admin')).status,401);
 assert.equal((await (await call('/api/market')).json()).market,'US');
 assert.equal((await call('/api/unknown')).status,404);
 assert.equal(assets,0);
 assert.equal(await (await call('/admin.html')).text(),'asset');
 assert.equal(assets,1);
});
