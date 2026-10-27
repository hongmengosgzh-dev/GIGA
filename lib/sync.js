import {readGiga,markets} from './giga.js';
import {retailPrice} from './catalog.js';
import {currencyByMarket} from './order-state.js';
const vendorDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(s)?Date.parse(s.replace(' ','T')+'-08:00'):NaN;
export function supplierProduct(market,sku,detail,price,inventory,multiplier,now=Date.now()) {
 const currency=currencyByMarket[market];
 if(!detail||!price||!inventory||price.currency!==currency||price.skuAvailable!==true||detail.skuAvailable===false) throw Error('商品数据不完整或不可售');
 const number=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
 let cost=price.price,stock=inventory.sellerInventoryInfo?.sellerAvailableInventory,validUntil=now+3600000;
 if(!number(cost)||!number(price.shippingFee)||!Number.isSafeInteger(stock)||stock<0) throw Error('采购价、运费或库存缺失');
 const from=vendorDate(price.promotionFrom),to=vendorDate(price.promotionTo);
 if(number(price.discountedPrice)&&price.discountedPrice<cost&&now>=from&&now<to){
  const discount=inventory.sellerInventoryInfo?.discountAvailableInventory;
  if(!Number.isSafeInteger(discount)||discount<0||!Number.isSafeInteger(price.purchaseLimit)||price.purchaseLimit<0)throw Error('优惠库存或限购数量缺失');
  cost=price.discountedPrice;stock=Math.min(stock,discount,price.purchaseLimit);validUntil=Math.min(validUntil,to);
 }
 if(typeof detail.productName!=='string'||!detail.productName.trim())throw Error('商品标题缺失');
 const image=new URL(detail.mainImageUrl);if(image.protocol!=='https:')throw Error('商品图片缺失');
 return {sku,title:detail.productName.slice(0,200),description:'',features:(detail.characteristics||[]).filter(x=>typeof x==='string').slice(0,20).map(x=>x.slice(0,500)),images:(detail.imageUrls||[]).filter(x=>typeof x==='string'&&x.startsWith('https://')).slice(0,10),image:image.href,currency,market,origin:market,carrier:'',cost,freight:price.shippingFee,price:retailPrice(cost,price.shippingFee,multiplier,currency),stock,validUntil,error:null};
}
export async function syncMarket(env,market,reader=readGiga,now=Date.now()){
 const settings=await env.DB.prepare('SELECT multiplier,pilot_skus FROM market_settings WHERE market=?').bind(market).first();
 const skus=JSON.parse(settings?.pilot_skus||'[]');
 if(!skus.length)return {message:'请先保存该市场的 SKU。',products:[]};
 if(skus.length>10)throw Error('最多导入 10 件商品');
 const lock=await env.DB.prepare('INSERT INTO sync_locks(market,until_at) VALUES(?,?) ON CONFLICT(market) DO UPDATE SET until_at=excluded.until_at WHERE sync_locks.until_at<=?').bind(market,now+120000,now).run();
 if(!lock.meta?.changes)throw Error('同步正在执行或刚刚完成，请两分钟后重试');
 let details,prices,inventories;
 try{[details,prices,inventories]=await Promise.all(['detail','price','inventory'].map(op=>reader(env,market,op,{skus})));if(![details,prices,inventories].every(Array.isArray))throw Error();}
 catch {throw Error('供应商读取失败；保留上次数据，超过一小时会自动停止展示。');}
 const products=skus.map(sku=>{try{return supplierProduct(market,sku,details.find(p=>p.sku===sku),prices.find(p=>p.sku===sku),inventories.find(p=>p.sku===sku),settings.multiplier,now);}catch(e){return {sku,market,stock:0,validUntil:now,error:e.message};}});
 await env.DB.batch(products.map(p=>env.DB.prepare('INSERT INTO giga_products(market,sku,payload,updated_at) VALUES(?,?,?,?) ON CONFLICT(market,sku) DO UPDATE SET payload=excluded.payload,updated_at=excluded.updated_at').bind(market,p.sku,JSON.stringify(p),now)));
 return {message:'同步完成。首次导入为草稿，请检查后上架。',products};
}
export async function scheduledSync(env){
 if(!env.DB)return;
 for(const market of markets){if(!env[`GIGA_${market}_CLIENT_ID`]||!env[`GIGA_${market}_CLIENT_SECRET`])continue;try{await syncMarket(env,market);}catch{console.error('Catalog sync failed',market);}}
}
