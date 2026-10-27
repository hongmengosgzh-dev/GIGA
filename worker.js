import {onRequest as admin} from './functions/api/admin.js';
import {onRequestGet as market} from './functions/api/market.js';
export default {
  async fetch(request,env,ctx) {
    const path=new URL(request.url).pathname;
    if(path==='/api/admin') return admin({request,env,waitUntil:ctx.waitUntil.bind(ctx)});
    if(path==='/api/market' && request.method==='GET') return market({request,env});
    if(path.startsWith('/api/')) return Response.json({error:'Not found'},{status:404});
    return env.ASSETS.fetch(request);
  }
};
