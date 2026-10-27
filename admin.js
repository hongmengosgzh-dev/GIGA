let accessToken='';
const $=id=>document.getElementById(id);
async function api(body){
 if(location.protocol==='file:')throw new Error('请先部署网站；本地预览不能连接大健。');
 const r=await fetch('/api/admin',{method:body?'POST':'GET',headers:{Authorization:`Bearer ${accessToken}`,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
 const data=await r.json();if(!r.ok)throw new Error(data.error || '连接失败');return data;
}
$('loginForm').addEventListener('submit',async e=>{e.preventDefault();accessToken=$('token').value;$('message').textContent='正在验证…';try{const data=await api();$('login').hidden=true;$('dashboard').hidden=false;$('token').value='';$('state').textContent=`当前环境：${data.environment==='sandbox'?'沙盒测试':'正式只读连接'}`;$('markets').replaceChildren(...data.markets.map(m=>{const s=document.createElement('span');s.textContent=`${m.market} · ${m.configured?'已配置，待读取验证':'未配置'}`;return s;}));$('message').textContent='已登录。访问码仅在当前页面内存保留。';}catch(error){accessToken='';$('message').textContent=error.message;}});
$('logout').onclick=()=>{accessToken='';$('dashboard').hidden=true;$('login').hidden=false;$('result').textContent='';$('message').textContent='已退出';};
$('query').addEventListener('submit',async e=>{e.preventDefault();$('read').disabled=true;$('message').textContent='正在读取…';$('result').textContent='';try{const result=await api({market:$('market').value,operation:$('operation').value,page:Number($('page').value),orderNo:$('orderNo').value.split(/[,，\n]/).map(s=>s.trim()).filter(Boolean),skus:$('skus').value.split(/[,，\n]/).map(s=>s.trim()).filter(Boolean)});$('result').textContent=JSON.stringify(result,null,2);$('message').textContent='读取完成。';}catch(error){$('message').textContent=error.message;}finally{$('read').disabled=false;}});

async function shopSave(input){try{const result=await api({...input,market:$('market').value});$('result').textContent=JSON.stringify(result,null,2);$('message').textContent=result.message||'读取完成';return result;}catch(e){$('message').textContent=e.message;}}
$('pricingForm').onsubmit=async e=>{e.preventDefault();await shopSave({operation:'shop.settings',multiplier:Number($('multiplier').value),skus:$('pilotSkus').value.split(/[,，\n]/).map(s=>s.trim()).filter(Boolean)});};
$('manualForm').onsubmit=async e=>{e.preventDefault();const product=Object.fromEntries(new FormData(e.target));for(const key of ['cost','freight','stock'])product[key]=Number(product[key]);await shopSave({operation:'shop.product',multiplier:Number($('multiplier').value),product});};
$('loadProducts').onclick=async()=>{const r=await shopSave({operation:'shop.list'});if(r){$('multiplier').value=r.settings.multiplier;$('pilotSkus').value=JSON.parse(r.settings.pilot_skus).join(', ');}};

async function showGiga(){
 const market=$('market').value,r=await shopSave({operation:'shop.gigaList'});if(!r||market!==$('market').value)return;
 $('gigaProducts').replaceChildren(...r.products.map(p=>{
  const row=document.createElement('p'),text=document.createElement('span');
  text.textContent=`${p.sku} · ${p.title||''} · ${p.currency||''} ${p.price??'—'} · 库存 ${p.stock} · ${p.error||(p.validUntil<=Date.now()?'已过期':p.published?'已上架':'草稿')} `;
  const button=document.createElement('button');button.type='button';button.textContent=p.published?'下架':'上架';button.onclick=async()=>{if(market!==$('market').value)return;button.disabled=true;await shopSave({operation:'shop.publish',sku:p.sku,published:!p.published});await showGiga();};row.append(text,button);return row;
 }));
}
$('listGiga').onclick=showGiga;
$('importGiga').onclick=async()=>{$('importGiga').disabled=true;$('message').textContent='正在读取商品详情、价格和库存…';try{await shopSave({operation:'shop.import'});await showGiga();}finally{$('importGiga').disabled=false;}};
$('market').addEventListener('change',()=>{$('gigaProducts').replaceChildren();});
