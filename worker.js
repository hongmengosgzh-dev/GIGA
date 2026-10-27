import {onRequest as admin} from './functions/api/admin.js';
import {onRequestGet as market} from './functions/api/market.js';
import {scheduledSync} from './lib/sync.js';
export default {
  async scheduled(event,env,ctx){ctx.waitUntil(scheduledSync(env));},
  async fetch(request,env,ctx) {
    const path=new URL(request.url).pathname;
    if(path==='/api/admin') return admin({request,env,waitUntil:ctx.waitUntil.bind(ctx)});
    if(path==='/api/market' && request.method==='GET') return market({request,env});
    if(path==='/api/products' && request.method==='GET') {
      const code=new URL(request.url).searchParams.get('market');
      if(!['US','UK','JP','DE','CA'].includes(code)) return Response.json({error:'Invalid market'},{status:400});
      if(!env.DB) return Response.json({products:[],configured:false},{headers:{'Cache-Control':'no-store'}});
      const rows=await env.DB.prepare('SELECT payload FROM manual_products WHERE market=? ORDER BY updated_at DESC LIMIT 100').bind(code).all();
      const products=rows.results.map(r=>JSON.parse(r.payload)).filter(p=>p.status==='published').map(p=>({sku:p.sku,title:p.title,description:p.description,image:p.image,price:p.price,currency:p.currency,stock:p.stock,origin:p.origin,carrier:p.carrier}));
      const supplier=await env.DB.prepare('SELECT payload FROM giga_products WHERE market=? AND published=1').bind(code).all();
      const settings=await env.DB.prepare('SELECT pilot_skus FROM market_settings WHERE market=?').bind(code).first();
      const selected=JSON.parse(settings?.pilot_skus||'[]');
      products.push(...supplier.results.map(r=>JSON.parse(r.payload)).filter(p=>selected.includes(p.sku)&&!p.error&&p.validUntil>Date.now()&&p.stock>0).map(p=>({sku:p.sku,title:p.title,description:p.description,image:p.image,price:p.price,currency:p.currency,stock:p.stock,origin:p.origin,carrier:p.carrier})));
      return Response.json({products,configured:true},{headers:{'Cache-Control':'no-store'}});
    }
    if(path.startsWith('/api/')) return Response.json({error:'Not found'},{status:404});
    return env.ASSETS.fetch(request);
  }
};
