export async function publicProducts(env,code){
      const rows=await env.DB.prepare('SELECT payload FROM manual_products WHERE market=? ORDER BY updated_at DESC LIMIT 100').bind(code).all();
      const products=rows.results.map(r=>JSON.parse(r.payload)).filter(p=>p.status==='published').map(p=>({id:'manual:'+p.sku,sku:p.sku,title:p.title,description:p.description,features:p.features||[],images:p.images||[],image:p.image,price:p.price,currency:p.currency,stock:p.stock,origin:p.origin,carrier:p.carrier}));
      const supplier=await env.DB.prepare('SELECT payload FROM giga_products WHERE market=? AND published=1').bind(code).all();
      const settings=await env.DB.prepare('SELECT pilot_skus FROM market_settings WHERE market=?').bind(code).first();
      const selected=JSON.parse(settings?.pilot_skus||'[]');
      products.push(...supplier.results.map(r=>JSON.parse(r.payload)).filter(p=>selected.includes(p.sku)&&!p.error&&p.validUntil>Date.now()&&p.stock>0).map(p=>({id:'giga:'+p.sku,sku:p.sku,title:p.title,description:p.description,features:p.features||[],images:p.images||[],image:p.image,price:p.price,currency:p.currency,stock:p.stock,origin:p.origin,carrier:p.carrier})));

return products;
}
export function quoteProducts(products,lines){
 if(!Array.isArray(lines)||!lines.length||lines.length>50)throw Error('Invalid bag');
 const seen=new Set();let total=0;const items=lines.map(line=>{
 if(typeof line.id!=='string'||seen.has(line.id)||!Number.isSafeInteger(line.quantity)||line.quantity<1||line.quantity>99)throw Error('Invalid quantity');seen.add(line.id);
 const p=products.find(p=>p.id===line.id);if(!p||p.stock<line.quantity)throw Error('An item is unavailable or has insufficient stock. Please update your bag.');
 const unit=p.currency==='JPY'?1:100;total+=Math.round(p.price*unit)*line.quantity;
 return {id:p.id,title:p.title,quantity:line.quantity,price:p.price,currency:p.currency};
 });return {items,total:total/(items[0].currency==='JPY'?1:100),currency:items[0].currency,reserved:false,paymentEnabled:false};
}
