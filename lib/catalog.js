import {currencyByMarket} from './order-state.js';
import {syncMarket} from './sync.js';
export const origins=['US','JP','UK','DE','CA','CN'];
export function retailPrice(cost,freight,multiplier,currency) {
 if(![cost,freight,multiplier].every(Number.isFinite)||cost<0||freight<0||multiplier<1||multiplier>10) throw Error('Invalid pricing');
 const unit=currency==='JPY'?1:100;
 return Math.round((cost+freight)*multiplier*unit)/unit;
}
export function manualProduct(input) {
 const p=input.product;
 if(!p||!currencyByMarket[input.market]||!origins.includes(p.origin)||!['draft','published'].includes(p.status)) throw Error('Invalid market or origin');
 for(const [key,max] of [['sku',80],['title',200],['description',1500],['carrier',100]]) if(typeof p[key]!=='string'||!p[key].trim()||p[key].length>max) throw Error('Missing product field');
 if(!/^[A-Za-z0-9_-]+$/.test(p.sku)||!Number.isSafeInteger(p.stock)||p.stock<0) throw Error('Invalid SKU or stock');
 const image=new URL(p.image);if(image.protocol!=='https:') throw Error('HTTPS image required');
 const currency=currencyByMarket[input.market];
 return {...p,market:input.market,currency,price:retailPrice(p.cost,p.freight,input.multiplier,currency)};
}
const reply=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function manageCatalog(env,input) {
 if(!env.DB) return reply({error:'请先创建并绑定 D1 数据库，绑定名称为 DB。'},503);
 if(!currencyByMarket[input.market]) return reply({error:'无效销售市场'},400);
 try {
  if(input.operation==='shop.import') return reply(await syncMarket(env,input.market));
  if(input.operation==='shop.gigaList') {
   const rows=await env.DB.prepare('SELECT payload,published FROM giga_products WHERE market=?').bind(input.market).all();
   return reply({products:rows.results.map(r=>({...JSON.parse(r.payload),published:!!r.published}))});
  }
  if(input.operation==='shop.publish') {
   if(typeof input.sku!=='string'||typeof input.published!=='boolean')throw Error();
   const row=await env.DB.prepare('SELECT payload FROM giga_products WHERE market=? AND sku=?').bind(input.market,input.sku).first();
   if(!row)throw Error();const p=JSON.parse(row.payload);
   if(input.published&&(p.error||p.validUntil<=Date.now()||p.stock<=0))return reply({error:'数据无效、过期或缺货，请重新同步后上架。'},400);
   await env.DB.prepare('UPDATE giga_products SET published=? WHERE market=? AND sku=?').bind(input.published?1:0,input.market,input.sku).run();
   return reply({message:input.published?'已上架':'已下架'});
  }
  if(input.operation==='shop.settings') {
   retailPrice(0,0,input.multiplier,currencyByMarket[input.market]);
   const skus=[...new Set(input.skus||[])];
   if(skus.length>10||skus.some(s=>typeof s!=='string'||!/^[A-Za-z0-9_-]{1,100}$/.test(s))) throw Error();
   await env.DB.prepare('INSERT INTO market_settings(market,multiplier,pilot_skus) VALUES(?,?,?) ON CONFLICT(market) DO UPDATE SET multiplier=excluded.multiplier,pilot_skus=excluded.pilot_skus').bind(input.market,input.multiplier,JSON.stringify(skus)).run();
   return reply({message:'已保存，请点击导入／同步大健商品，使新倍率生效。'});
  }
  if(input.operation==='shop.product') {
   const p=manualProduct(input);
   await env.DB.prepare('INSERT INTO manual_products(market,sku,payload,updated_at) VALUES(?,?,?,?) ON CONFLICT(market,sku) DO UPDATE SET payload=excluded.payload,updated_at=excluded.updated_at').bind(p.market,p.sku,JSON.stringify(p),Date.now()).run();
   return reply({message:'自营商品已保存。',product:p});
  }
  if(input.operation==='shop.list') {
   const settings=await env.DB.prepare('SELECT multiplier,pilot_skus FROM market_settings WHERE market=?').bind(input.market).first();
   const rows=await env.DB.prepare('SELECT payload FROM manual_products WHERE market=? ORDER BY updated_at DESC LIMIT 100').bind(input.market).all();
   return reply({settings:settings||{multiplier:1.3,pilot_skus:'[]'},products:rows.results.map(r=>JSON.parse(r.payload))});
  }
  return reply({error:'无效操作'},400);
 } catch(e) {
  const text=String(e?.message||'');
  if(text.includes('no such table'))return reply({error:'数据库缺少数据表。请在当前 Worker 绑定的生产 D1 数据库执行 0001、0002、0003 迁移；已执行的无需重复。',code:'DB_TABLE_MISSING'},503);
  if(text.includes('同步正在执行'))return reply({error:'同步正在执行或刚刚完成，请两分钟后重试。',code:'SYNC_BUSY'},429);
  if(text.startsWith('供应商读取失败'))return reply({error:text,code:'SUPPLIER_READ_FAILED'},502);
  if(text.includes('最多导入'))return reply({error:'每个市场最多导入 10 个 SKU。',code:'SKU_LIMIT'},400);
  return reply({error:'操作未完成。请检查数据库绑定、保存的 SKU 和表单字段。',code:'CATALOG_OPERATION_FAILED'},400);
 }

}
