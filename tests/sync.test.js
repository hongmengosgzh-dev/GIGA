import {test} from 'node:test';
import assert from 'node:assert/strict';
import {supplierProduct,syncMarket} from '../lib/sync.js';
const detail={productName:'Chair',mainImageUrl:'https://example.com/chair.jpg'};
const price={currency:'GBP',price:150,shippingFee:32.56,skuAvailable:true,discountedPrice:120,promotionFrom:'2026-07-21 01:00:00',promotionTo:'2026-11-01 21:59:59',purchaseLimit:29};
const inventory={sellerInventoryInfo:{sellerAvailableInventory:110,discountAvailableInventory:29}};
test('UK promotion includes freight and caps promotional stock',()=>{
 const p=supplierProduct('UK','SKU',detail,price,inventory,1.3,Date.parse('2026-10-27T00:00:00Z'));
 assert.equal(p.price,198.33);assert.equal(p.stock,29);
 assert.equal(p.validUntil,Date.parse('2026-10-27T01:00:00Z'));
});
test('promotion expires at fixed UTC minus eight boundary',()=>{
 const p=supplierProduct('UK','SKU',detail,price,inventory,1.3,Date.parse('2026-11-02T05:59:59Z'));
 assert.equal(p.price,237.33);assert.equal(p.stock,110);
});
test('missing inventory and cross-market currency cannot be published',()=>{
 assert.throws(()=>supplierProduct('UK','SKU',detail,price,{},1.3));
 assert.throws(()=>supplierProduct('US','SKU',detail,price,inventory,1.3));
});
test('concurrent sync denied before calling supplier',async()=>{
 let calls=0;const env={DB:{prepare(){return {bind(){return this;},first:async()=>({multiplier:1.3,pilot_skus:'["SKU"]'}),run:async()=>({meta:{changes:0}})};}}};
 await assert.rejects(syncMarket(env,'UK',async()=>{calls++;}));assert.equal(calls,0);
});
