import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {verifyPayment,claimDispatch,finishDispatch} from '../lib/order-state.js';
test('payment rules reject forgery, wrong totals, currency and cross-market payments',()=>{
 const order={id:'test',market:'JP',currency:'JPY',totalMinor:1000};
 const event={verified:true,status:'succeeded',orderId:'test',amountMinor:1000,currency:'JPY',provider:'test',paymentId:'p1'};
 assert.deepEqual(verifyPayment(order,event),{provider:'test',paymentId:'p1'});
 for(const patch of [{verified:false},{amountMinor:999},{currency:'USD'},{orderId:'other'},{status:'pending'},{paymentId:''}]) assert.throws(()=>verifyPayment(order,{...event,...patch}));
 assert.throws(()=>verifyPayment({...order,market:'US'},event));
});
test('persistent atomic claim prevents duplicate procurement, including after timeout',async()=>{
 const sqlite=new DatabaseSync(':memory:');
 sqlite.exec(readFileSync(new URL('../migrations/0001-orders.sql',import.meta.url),'utf8'));
 sqlite.prepare('INSERT INTO orders VALUES (?,?,?,?,?,?,?,?)').run('o1','US','USD',100,'paid','NS_US_1',1,1);
 const db={prepare(sql){return {bind(...values){return {async run(){const r=sqlite.prepare(sql).run(...values);return {meta:{changes:Number(r.changes)}};}};}};}};
 assert.deepEqual(await Promise.all([claimDispatch(db,'o1'),claimDispatch(db,'o1')]),[true,false]);
 await finishDispatch(db,'o1',false);
 assert.equal(sqlite.prepare('SELECT state FROM orders').get().state,'review');
 assert.equal(await claimDispatch(db,'o1'),false);
 assert.throws(()=>sqlite.prepare('INSERT INTO orders VALUES (?,?,?,?,?,?,?,?)').run('o2','JP','USD',100,'paid','NS_JP_2',1,1));
 sqlite.close();
});

