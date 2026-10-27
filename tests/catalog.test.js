import {test} from 'node:test';
import assert from 'node:assert/strict';
import {retailPrice,manualProduct} from '../lib/catalog.js';
test('market pricing rounds GBP to pennies and JPY to yen',()=>{
 assert.equal(retailPrice(120,32.56,1.3,'GBP'),198.33);
 assert.equal(retailPrice(100,11,1.3,'JPY'),144);
 assert.throws(()=>retailPrice(120,32,-1,'GBP'));
});
test('China is a shipping origin, not an additional checkout market',()=>{
 const input={market:'UK',multiplier:1.3,product:{sku:'OWN_1',title:'Bed',description:'Wood',origin:'CN',carrier:'DHL',status:'published',stock:3,cost:120,freight:32.56,image:'https://example.com/bed.jpg'}};
 assert.equal(manualProduct(input).price,198.33);
 assert.throws(()=>manualProduct({...input,market:'CN'}));
 assert.throws(()=>manualProduct({...input,product:{...input.product,image:'javascript:alert(1)'}}));
});
