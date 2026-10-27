import {test} from 'node:test';
import assert from 'node:assert/strict';
import {quoteProducts} from '../lib/storefront.js';
const products=[{id:'giga:A',title:'Chair',currency:'GBP',price:198.33,stock:2}];
test('quote uses server price and integer money arithmetic',()=>{
 const q=quoteProducts(products,[{id:'giga:A',quantity:2,price:0.01}]);
 assert.equal(q.total,396.66);assert.equal(q.paymentEnabled,false);assert.equal(q.reserved,false);
});
test('quote rejects stock shortage, duplicate lines and foreign catalog IDs',()=>{
 for(const lines of [[{id:'giga:A',quantity:3}],[{id:'giga:A',quantity:1},{id:'giga:A',quantity:1}],[{id:'manual:A',quantity:1}],[{id:'giga:A',quantity:1.5}]])assert.throws(()=>quoteProducts(products,lines));
});
