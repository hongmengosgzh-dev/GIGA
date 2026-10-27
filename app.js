const markets={US:{symbol:'$',locale:'en-US',products:[['Arc Lounge Chair','furniture',489,'#c58a62','#a9b8a4'],['Forma Side Table','furniture',179,'#d1b28c','#b8c9b1'],['Halo Pendant','lighting',129,'#e1c584','#a9b8a4'],['Still Life Vase','decor',48,'#d3a28b','#b8b9a4']]},JP:{symbol:'¥',locale:'ja-JP',products:[['Arc Lounge Chair','furniture',72800,'#c58a62','#a9b8a4'],['Forma Side Table','furniture',26800,'#d1b28c','#b8c9b1'],['Halo Pendant','lighting',19800,'#e1c584','#a9b8a4'],['Still Life Vase','decor',7200,'#d3a28b','#b8b9a4']]},UK:{symbol:'£',locale:'en-GB',products:[['Arc Lounge Chair','furniture',389,'#c58a62','#a9b8a4'],['Forma Side Table','furniture',139,'#d1b28c','#b8c9b1'],['Halo Pendant','lighting',99,'#e1c584','#a9b8a4'],['Still Life Vase','decor',39,'#d3a28b','#b8b9a4']]},DE:{symbol:'€',locale:'de-DE',products:[['Arc Lounge Chair','furniture',459,'#c58a62','#a9b8a4'],['Forma Side Table','furniture',159,'#d1b28c','#b8c9b1'],['Halo Pendant','lighting',119,'#e1c584','#a9b8a4'],['Still Life Vase','decor',45,'#d3a28b','#b8b9a4']]},CA:{symbol:'CA$',locale:'en-CA',products:[['Arc Lounge Chair','furniture',659,'#c58a62','#a9b8a4'],['Forma Side Table','furniture',239,'#d1b28c','#b8c9b1'],['Halo Pendant','lighting',169,'#e1c584','#a9b8a4'],['Still Life Vase','decor',65,'#d3a28b','#b8b9a4']]}};let market='US',cart=[];const $=s=>document.querySelector(s);function money(n){return new Intl.NumberFormat(markets[market].locale,{style:'currency',currency:{US:'USD',JP:'JPY',UK:'GBP',DE:'EUR',CA:'CAD'}[market],maximumFractionDigits:market==='JP'?0:2}).format(n)}function render(cat='all'){const ps=markets[market].products.filter(p=>cat==='all'||p[1]===cat);$('#products').innerHTML=ps.map((p,i)=>`<article class="product"><div class="product-image" style="--tone:${p[3]};--tone2:${p[4]}"></div><div class="product-info"><div class="product-name">${p[0]}</div><div class="product-meta"><span>${money(p[2])}</span><button class="add" onclick="add(${i},'${p[0]}',${p[2]})">Add to bag +</button></div></div></article>`).join('')}function add(i,n,p){cart.push({n,p});updateCart();openCart()}function updateCart(){$('#cartCount').textContent=cart.length;$('#cartItems').innerHTML=cart.length?cart.map((x,i)=>`<div class="cart-row"><span>${x.n}</span><span>${money(x.p)} <button onclick="removeItem(${i})">Remove</button></span></div>`).join(''):'<p class="small">Your bag is waiting for something beautiful.</p>';$('#cartTotal').textContent=money(cart.reduce((a,x)=>a+x.p,0))}function removeItem(i){cart.splice(i,1);updateCart()}
const marketInfo={US:['United States','USD'],JP:['Japan','JPY'],UK:['United Kingdom','GBP'],DE:['Germany','EUR'],CA:['Canada','CAD']};
const photos=['photo-1567538096630-e0c55bd6374c','photo-1499933374294-4584851497cc','photo-1507473885765-e6ed057f782c','photo-1578500494198-246f612d3b3d'];
const originalRender=render;render=function(cat='all'){originalRender(cat);document.querySelectorAll('.product').forEach(card=>{const idx=markets[market].products.findIndex(p=>p[0]===card.querySelector('.product-name').textContent);card.querySelector('.product-image').innerHTML=`<img loading="lazy" src="https://images.unsplash.com/${photos[idx]}?auto=format&fit=crop&w=700&q=85" alt="${markets[market].products[idx][0]} — illustrative photograph"><span class="product-tag">THE EVERYDAY EDIT</span>`})};
let activeCategory='all',returnFocus;
function openCart(){returnFocus=document.activeElement;$('#cart').inert=false;$('#cart').classList.add('open');$('#overlay').classList.add('open');$('#closeCart').focus()}
function closeCart(){$('#cart').classList.remove('open');$('#overlay').classList.remove('open');$('#cart').inert=true;returnFocus?.focus()}
function applyMarket(code){market=code;$('#marketLabel').textContent=marketInfo[code][0];$('#currencyLabel').textContent=' / '+marketInfo[code][1];$('#addressCountry').value=code==='UK'?'GB':code;render(activeCategory);updateCart()}
async function locateMarket(){
  try {const response=await fetch('/api/market',{signal:AbortSignal.timeout(5000),cache:'no-store'});if(!response.ok)throw Error();const result=await response.json();if(!marketInfo[result.market])throw Error();applyMarket(result.market);$('#marketLabel').title=result.supported?'Based on your approximate IP location':'Your location is outside our delivery markets; showing the US collection';}
  catch {applyMarket('US');$('#marketLabel').title='Location unavailable. Showing the US collection; delivery country is confirmed with your address.';}
}
document.querySelectorAll('.filter').forEach(b=>b.onclick=()=>{activeCategory=b.dataset.cat;document.querySelectorAll('.filter').forEach(x=>x.classList.toggle('active',x===b));render(activeCategory)});
$('#cartBtn').onclick=openCart;$('#closeCart').onclick=closeCart;$('#overlay').onclick=closeCart;
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeCart();if(e.key==='Tab'&&$('#cart').classList.contains('open')){const nodes=[...$('#cart').querySelectorAll('button:not(:disabled)')];const first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}});
$('#checkout').onclick=()=>{if(!cart.length)return;closeCart();$('#addressStatus').textContent='';$('#addressDialog').showModal()};
$('#closeAddress').onclick=()=>$('#addressDialog').close();
const postalRules={US:[/^\d{5}(-\d{4})?$/,'10001'],JP:[/^\d{3}-?\d{4}$/,'100-0001'],GB:[/^([A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}|GIR ?0AA)$/i,'SW1A 1AA'],DE:[/^\d{5}$/,'10115'],CA:[/^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z] ?\d[ABCEGHJ-NPRSTV-Z]\d$/i,'M5V 3A8']};
function setPostalHint(){const field=$('[name="postal"]');field.setCustomValidity('');field.placeholder=postalRules[$('#addressCountry').value]?.[1]||''}
$('#addressCountry').onchange=()=>{setPostalHint();$('#addressStatus').textContent=''};$('[name="postal"]').oninput=e=>e.target.setCustomValidity('');
$('#addressForm').onsubmit=e=>{e.preventDefault();const data=new FormData(e.target),country=data.get('country'),rule=postalRules[country];if(!rule){$('#addressStatus').textContent='Please choose a supported delivery country.';return}if(!rule[0].test(data.get('postal').trim())){const field=$('[name="postal"]');field.setCustomValidity('Enter a valid postal code, for example '+rule[1]);field.reportValidity();return}const destination=country==='GB'?'UK':country;if(destination!==market){applyMarket(destination);cart=[];updateCart();$('#addressStatus').textContent='Your delivery country has changed. The local collection and currency have been updated. Please add items from this collection before continuing.';return}$('#addressStatus').textContent='Address format checked. This is a preview; payment and order placement are not enabled.'};
const originalUpdateCart=updateCart;updateCart=function(){originalUpdateCart();$('#checkout').disabled=cart.length===0};
render();updateCart();setPostalHint();locateMarket();

// Published custom products use DOM text nodes, never supplier HTML.
let publishedProducts=[],productRequest=0,liveCatalog=false;
const demoRender=render;
render=function(cat='all'){
 if(!liveCatalog)demoRender(cat);else $('#products').replaceChildren();
 for(const p of publishedProducts){
  if(cat!=='all')continue;
  const card=document.createElement('article');card.className='product';
  const picture=document.createElement('div');picture.className='product-image';const img=document.createElement('img');img.src=p.image;img.alt=p.title;img.loading='lazy';picture.append(img);picture.tabIndex=0;picture.setAttribute('role','button');picture.setAttribute('aria-label','View '+p.title);picture.onclick=()=>showProduct(p);picture.onkeydown=e=>{if(e.key==='Enter')showProduct(p);};
  const info=document.createElement('div');info.className='product-info';const title=document.createElement('div');title.className='product-name';title.textContent=p.title;
  const meta=document.createElement('div');meta.className='product-meta';const price=document.createElement('span');price.textContent=new Intl.NumberFormat(markets[market].locale,{style:'currency',currency:p.currency}).format(p.price);
  const button=document.createElement('button');button.className='add';button.textContent=p.stock>0?'Add to bag +':'Sold out';button.disabled=p.stock<=0;button.onclick=()=>addProduct(p);meta.append(price,button);info.append(title,meta);card.append(picture,info);$('#products').append(card);
 }
};
const setMarket=applyMarket;
applyMarket=function(code){if(code!==market){cart=[];updateCart();}publishedProducts=[];liveCatalog=location.protocol!=='file:';setMarket(code);const request=++productRequest;fetch('/api/products?market='+encodeURIComponent(code),{cache:'no-store'}).then(r=>r.ok?r.json():null).then(r=>{if(request!==productRequest||!r)return;liveCatalog=r.configured;publishedProducts=r.products||[];render(activeCategory);}).catch(()=>{});};
applyMarket(market);

function addProduct(p){
 const existing=cart.find(x=>x.id===p.id);if((existing?.quantity||0)>=Math.min(p.stock,99))return;
 if(existing)existing.quantity++;else cart.push({id:p.id,n:p.title,p:p.price,quantity:1,stock:p.stock});
 updateCart();openCart();
}
updateCart=function(){
 $('#cartCount').textContent=cart.reduce((n,p)=>n+(p.quantity||1),0);
 $('#cartItems').replaceChildren(...cart.map((p,i)=>{
  const row=document.createElement('div');row.className='cart-row';
  const name=document.createElement('span');name.textContent=p.n;
  const controls=document.createElement('span');
  const quantity=document.createElement('input');quantity.type='number';quantity.min='1';quantity.max=String(Math.min(p.stock||1,99));quantity.value=p.quantity||1;quantity.setAttribute('aria-label','Quantity for '+p.n);quantity.style.width='64px';
  quantity.onchange=()=>{const n=Number(quantity.value);if(Number.isSafeInteger(n)&&n>=1&&n<=Math.min(p.stock||1,99))p.quantity=n;updateCart();};
  const price=document.createElement('span');price.textContent=money(p.p*(p.quantity||1));
  const remove=document.createElement('button');remove.textContent='Remove';remove.onclick=()=>removeItem(i);controls.append(quantity,price,remove);row.append(name,controls);return row;
 }));
 $('#cartTotal').textContent=money(cart.reduce((n,p)=>n+p.p*(p.quantity||1),0));$('#checkout').disabled=!cart.length;
};
function showProduct(p){
 $('#detailTitle').textContent=p.title;$('#detailPrice').textContent=money(p.price);$('#detailDescription').textContent=p.description||'';
 $('#detailImages').replaceChildren(...[...new Set([p.image,...(p.images||[])])].map(url=>{const img=document.createElement('img');img.src=url;img.alt=p.title;img.loading='lazy';return img;}));
 $('#detailFeatures').replaceChildren(...(p.features||[]).map(text=>{const li=document.createElement('li');li.textContent=text;return li;}));
 $('#detailAdd').disabled=p.stock<=0;$('#detailAdd').onclick=()=>{$('#productDialog').close();addProduct(p);};$('#productDialog').showModal();
}
$('#detailClose').onclick=()=>$('#productDialog').close();
const addressCheck=$('#addressForm').onsubmit;
$('#addressForm').onsubmit=async e=>{
 addressCheck(e);if(!$('#addressStatus').textContent.startsWith('Address format checked'))return;
 const submit=$('#addressForm button[type="submit"]');submit.disabled=true;$('#addressStatus').textContent='Checking current prices and availability…';
 try{
  if(cart.some(p=>!p.id))throw Error('Sample items cannot be checked out.');
  const response=await fetch('/api/quote',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({market,lines:cart.map(p=>({id:p.id,quantity:p.quantity}))}),signal:AbortSignal.timeout(15000)});
  const result=await response.json();if(!response.ok)throw Error(result.error||'Unable to check your bag.');
  const changed=result.items.some(item=>cart.find(p=>p.id===item.id)?.p!==item.price);
  for(const item of result.items){const p=cart.find(p=>p.id===item.id);p.p=item.price;}updateCart();
  $('#addressStatus').textContent=(changed?'Prices have changed. Your bag has been updated. ':'')+'Current subtotal: '+money(result.total)+'. Availability checked; items are not reserved. Payments are not available yet.';
 }catch(error){$('#addressStatus').textContent=error.message;}finally{submit.disabled=false;}
};
updateCart();
