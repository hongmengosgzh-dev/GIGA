import {publicProducts,quoteProducts} from './lib/storefront.js';
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
      const products=await publicProducts(env,code);
      return Response.json({products,configured:true},{headers:{'Cache-Control':'no-store'}});
    }
    if(path==='/api/quote'&&request.method==='POST'){
      if(request.headers.get('Origin')!==new URL(request.url).origin)return Response.json({error:'Invalid origin'},{status:403});
      try{
        const raw=await request.text();if(raw.length>10000)throw Error('Bag too large');const input=JSON.parse(raw);
        if(!['US','UK','JP','DE','CA'].includes(input.market)||!env.DB)throw Error('Market unavailable');
        const quote=quoteProducts(await publicProducts(env,input.market),input.lines);
        return Response.json(quote,{headers:{'Cache-Control':'no-store'}});
      }catch(e){return Response.json({error:e.message},{status:400,headers:{'Cache-Control':'no-store'}});}
    }
    if(path.startsWith('/api/')) return Response.json({error:'Not found'},{status:404});
    return env.ASSETS.fetch(request);
  }
};
