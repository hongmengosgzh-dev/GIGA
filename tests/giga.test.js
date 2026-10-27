import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {signature,readGiga,credentials} from '../lib/giga.js';
import {onRequest} from '../functions/api/admin.js';
test('signature matches independent Node crypto implementation and hex-before-base64 contract',async()=>{
 const args=['buyer','secret','/example','1793060000000','abc1234567'];
 const expected=Buffer.from(createHmac('sha256','buyer&secret&abc1234567').update('buyer&/example&1793060000000&abc1234567').digest('hex'),'utf8').toString('base64');
 assert.equal(await signature(...args),expected);
});
test('market credentials never fall back to another market',()=>{
 assert.throws(()=>credentials({GIGA_US_CLIENT_ID:'a',GIGA_US_CLIENT_SECRET:'b'},'JP'));
 assert.throws(()=>credentials({},'AU'));
});
test('connector uses sandbox and sends authenticated POST, rejects supplier business failure',async()=>{
 const env={GIGA_US_CLIENT_ID:'buyer',GIGA_US_CLIENT_SECRET:'secret'};
 let calls=0;
 const data=await readGiga(env,'US','catalog',{page:1,pageSize:100},async(url,options)=>{
  calls++; assert.ok(url.startsWith('https://openapi-sandbox.gigab2b.com/'));
  assert.equal(options.method,'POST');assert.equal(options.headers.nonce.length,10);
  assert.equal(options.headers.sign,await signature('buyer','secret',new URL(url).pathname,options.headers.timestamp,options.headers.nonce));
  return Response.json({success:true,code:'200',data:{records:[]}});
 });assert.deepEqual(data,{records:[]});assert.equal(calls,1);
 await assert.rejects(()=>readGiga(env,'US','catalog',{},async()=>Response.json({success:false,code:'403'})));
 await assert.rejects(()=>readGiga(env,'US','order',{}));
});
test('admin denies missing and incorrect token; status never exposes secrets',async()=>{
 const env={ADMIN_TOKEN:'a'.repeat(40),GIGA_US_CLIENT_ID:'sensitive-id',GIGA_US_CLIENT_SECRET:'sensitive-secret'};
 for(const token of ['', 'wrong'])assert.equal((await onRequest({request:new Request('https://shop.test/api/admin',{headers:{Authorization:token}}),env})).status,401);
 const response=await onRequest({request:new Request('https://shop.test/api/admin',{headers:{Authorization:`Bearer ${env.ADMIN_TOKEN}`}}),env});
 const text=await response.text();assert.equal(response.status,200);assert.ok(!text.includes('sensitive'));
});
test('admin blocks cross-origin mutation and unsupported market',async()=>{
 const env={ADMIN_TOKEN:'a'.repeat(40)};
 const make=(origin,body)=>new Request('https://shop.test/api/admin',{method:'POST',headers:{Authorization:`Bearer ${env.ADMIN_TOKEN}`,Origin:origin},body:JSON.stringify(body)});
 assert.equal((await onRequest({request:make('https://evil.test',{}),env})).status,403);
 assert.equal((await onRequest({request:make('https://shop.test',{market:'AU',operation:'catalog'}),env})).status,400);
});
