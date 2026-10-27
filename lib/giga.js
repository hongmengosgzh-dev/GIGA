const encoder = new TextEncoder();
export const markets = ['US','JP','UK','DE','CA'];
export const paths = {
  catalog:'/b2b-overseas-api/v1/buyer/product/skus/v1',
  price:'/b2b-overseas-api/v1/buyer/product/price/v1',
  inventory:'/b2b-overseas-api/v1/buyer/inventory/quantity/v2',
  status:'/b2b-overseas-api/v1/buyer/order/status/v1',
  tracking:'/b2b-overseas-api/v1/buyer/order/track-no/v1'
};
export async function signature(clientId, secret, path, timestamp, nonce) {
  if (!/^[a-zA-Z0-9]{10}$/.test(nonce)) throw new Error('Invalid nonce');
  const key = await crypto.subtle.importKey('raw',encoder.encode(`${clientId}&${secret}&${nonce}`),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const bytes = await crypto.subtle.sign('HMAC',key,encoder.encode(`${clientId}&${path}&${timestamp}&${nonce}`));
  const hex = Array.from(new Uint8Array(bytes), b=>b.toString(16).padStart(2,'0')).join('');
  return btoa(hex);
}
export function credentials(env,market) {
  if (!markets.includes(market)) throw new Error('Unsupported market');
  const clientId=env[`GIGA_${market}_CLIENT_ID`],secret=env[`GIGA_${market}_CLIENT_SECRET`];
  if (!clientId || !secret) throw new Error('Market credentials missing');
  if (!['sandbox','production'].includes(env.GIGA_ENV || 'sandbox')) throw new Error('Invalid environment');
  return {clientId,secret,base:env.GIGA_ENV==='production'?'https://openapi.gigab2b.com':'https://openapi-sandbox.gigab2b.com'};
}
export async function readGiga(env,market,operation,body,fetcher=fetch) {
  const path=paths[operation];
  if (!path) throw new Error('Read operation unavailable');
  const {clientId,secret,base}=credentials(env,market);
  const timestamp=String(Date.now());
  const nonce=crypto.randomUUID().replaceAll('-','').slice(0,10);
  const sign=await signature(clientId,secret,path,timestamp,nonce);
  // No automatic retries: vendor limits are shared by all deployments of this account.
  const response=await fetcher(base+path,{method:'POST',headers:{'Content-Type':'application/json','client-id':clientId,timestamp,nonce,sign},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
  if (!response.ok) throw new Error('Supplier HTTP error');
  const result=await response.json();
  if(result.success!==true || String(result.code)!=='200') throw new Error('Supplier rejected request');
  return result.data;
}
