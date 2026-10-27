import {manageCatalog} from '../../lib/catalog.js';
import {markets,readGiga} from '../../lib/giga.js';
const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
async function authorized(request,env) {
  if(!env.ADMIN_TOKEN || env.ADMIN_TOKEN.length<32) return false;
  const supplied=request.headers.get('Authorization') || '';
  const hash=async s=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));
  const a=await hash(supplied),b=await hash(`Bearer ${env.ADMIN_TOKEN}`);
  return a.reduce((v,n,i)=>v|(n^b[i]),0)===0;
}
export async function onRequest({request,env}) {
  if(!await authorized(request,env)) return json({error:'请使用管理员访问码登录；未配置后台时无法登录。'},401);
  if(request.method==='GET') return json({environment:env.GIGA_ENV || 'sandbox',markets:markets.map(market=>({market,configured:!!(env[`GIGA_${market}_CLIENT_ID`]&&env[`GIGA_${market}_CLIENT_SECRET`])})),payments:'not_connected',autoOrder:'not_enabled'});
  if(request.method!=='POST') return json({error:'不支持此操作'},405);
  if(request.headers.get('Origin')!==new URL(request.url).origin) return json({error:'来源不匹配'},403);
  if(Number(request.headers.get('Content-Length'))>4096) return json({error:'请求过大'},413);
  try {
    const raw=await request.text(); if(raw.length>4096) return json({error:'请求过大'},413);
    const input=JSON.parse(raw);
    const {market,operation,skus,orderNo,page=1}=input;
    if(operation?.startsWith('shop.')) return await manageCatalog(env,input);
    if(!markets.includes(market)) return json({error:'请选择有效市场'},400);
    let body;
    if(operation==='catalog') {
      if(!Number.isInteger(page)||page<1) return json({error:'页码无效'},400);
      body={page,pageSize:100,sort:2};
    } else if(['price','inventory','detail'].includes(operation)) {
      if(!Array.isArray(skus)||!skus.length||skus.length>200||skus.some(s=>typeof s!=='string'||!s.trim()||s.length>100)) return json({error:'请输入 1–200 个 SKU'},400);
      body={skus};
    } else if(['status','tracking'].includes(operation)) {
      if(!Array.isArray(orderNo)||!orderNo.length||orderNo.length>100||orderNo.some(s=>typeof s!=='string'||!/^[A-Za-z0-9_-]{1,100}$/.test(s))) return json({error:'请输入 1–100 个有效发货订单号'},400);
      body={orderNo};
    } else return json({error:'此后台目前仅允许读取商品、价格、库存和发货信息'},400);
    return json({market,operation,data:await readGiga(env,market,operation,body),at:new Date().toISOString()});
  } catch { return json({error:'读取失败。请检查该市场的凭证、沙盒权限和已收藏商品；稍后重试。'},502); }
}
