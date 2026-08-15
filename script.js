const WHATSAPP = '5553984415919'; // Brasil (55) + DDD 53 + número da loja.
const sizes = [{name:'Pequeno',detail:'300 ml',price:12},{name:'Médio',detail:'500 ml',price:16},{name:'Grande',detail:'700 ml',price:20}];
const included = ['Granola','Leite em pó','Paçoca','Amendoim','Confete','Coco ralado','Farinha láctea','Calda de morango'];
const extras = [{name:'Morango',price:3},{name:'Banana',price:2},{name:'Nutella',price:4},{name:'Leite Ninho',price:3},{name:'Ovomaltine',price:3},{name:'Whey protein',price:5}];
const CART_STORAGE_KEY = 'acai-urbano-sacola';
let selectedSize=null, selectedIncluded=[], selectedExtras=[], cart=[];
try { cart = JSON.parse(localStorage.getItem(CART_STORAGE_KEY)) || []; } catch { cart = []; }
const money=value=>value.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const sizeRoot=document.querySelector('#sizes'),includedRoot=document.querySelector('#included'),extrasRoot=document.querySelector('#extras');
const pickupStoreInput=document.querySelector('#pickupStore');
function syncIncludedOptions(){
  [...includedRoot.children].forEach(button=>{
    const name=button.querySelector('span').textContent;
    button.classList.toggle('active',selectedIncluded.includes(name));
  });
}
function getIncludedLimit(){
  if(selectedSize===null) return 3;
  return sizes[selectedSize].name === 'Pequeno' ? 2 : 3;
}

sizes.forEach((size,i)=>{const button=document.createElement('button');button.type='button';button.className='size-card';button.innerHTML=`<strong>${size.name}</strong><span>${size.detail}</span><b>${money(size.price)}</b>`;button.onclick=()=>{selectedSize=i;const limit=getIncludedLimit();if(selectedIncluded.length>limit){selectedIncluded=selectedIncluded.slice(0,limit);syncIncludedOptions()};[...sizeRoot.children].forEach(x=>x.classList.remove('active'));button.classList.add('active');updateSelectionInfo()};sizeRoot.append(button)});
function calculateCurrentTotal(){
  if(selectedSize===null) return 0;
  const size=sizes[selectedSize];
  const selectedExtraData=extras.filter(item=>selectedExtras.includes(item.name));
  return size.price + selectedExtraData.reduce((sum,item)=>sum+item.price,0);
}
function updateSelectionInfo(){
  const includedLimit=getIncludedLimit();
  document.querySelector('#includedCount').textContent=`${selectedIncluded.length}/${includedLimit}`;
  document.querySelector('#extrasCount').textContent=`${selectedExtras.length}`;
}
function addOption(root,item,type){
  const name=typeof item==='string'?item:item.name,
        price=typeof item==='string'?null:item.price;
  const button=document.createElement('button');
  button.type='button';
  button.className='option';
  button.innerHTML=`<span>${name}</span>${price?`<small>+ ${money(price)}</small>`:''}<i class="check">✓</i>`;

  button.onclick=()=>{
    const array=type==='included'?selectedIncluded:selectedExtras;
    const pos=array.indexOf(name);

    if(type==='included'){
      if(pos>=0){
        array.splice(pos,1);
        button.classList.remove('active');
      }else{
        const limit=getIncludedLimit();
        if(array.length>=limit){
          showToast(limit===2?'Açaí pequeno aceita até 2 complementos grátis.':'Você pode escolher até 3 complementos grátis.');
          return;
        }
        array.push(name);
        button.classList.add('active');
      }
    }else{
      if(pos>=0){
        array.splice(pos,1);
        button.classList.remove('active');
      }else{
        array.push(name);
        button.classList.add('active');
      }
    }

    updateSelectionInfo();
  };

  root.append(button);
}

included.forEach(item=>addOption(includedRoot,item,'included'));
extras.forEach(item=>addOption(extrasRoot,item,'extra'));
function currentOrder(){
  if(selectedSize===null) return null;
  const size=sizes[selectedSize],selectedExtraData=extras.filter(item=>selectedExtras.includes(item.name));
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
    name: `Açaí ${size.name}`,
    detail: size.detail,
    included: [...selectedIncluded],
    extras: selectedExtraData,
    note: document.querySelector('#notes').value.trim(),
    pickup: pickupStoreInput.checked,
    qty: 1,
    price: size.price + selectedExtraData.reduce((sum,item)=>sum+item.price,0)
  };
}
function persistCart(){try{localStorage.setItem(CART_STORAGE_KEY,JSON.stringify(cart))}catch{}}
function renderCart(){persistCart();const root=document.querySelector('#cartItems'),count=cart.reduce((sum,item)=>sum+item.qty,0),total=cart.reduce((sum,item)=>sum+item.price*item.qty,0);document.querySelector('#cartCount').textContent=count;document.querySelector('#total').textContent=money(total);document.querySelector('#sendOrder').disabled=!cart.length;if(!cart.length){root.innerHTML='<p class="empty">Sua sacola está vazia.<br>Monte um açaí e adicione aqui.</p>';return}root.innerHTML=cart.map(item=>`<article class="cart-item"><div class="cart-item-head"><div><strong>${item.name}</strong><small>${item.detail}</small></div><button class="remove" data-id="${item.id}" aria-label="Remover">×</button></div><p>${item.included.length?item.included.join(', '):'Sem complementos'}${item.extras.length?`<br><b>Extras:</b> ${item.extras.map(extra=>extra.name).join(', ')}`:''}${item.note?`<br><b>Obs.:</b> ${item.note}`:''}${item.pickup?`<br><b>Retirada:</b> loja`:'<br><b>Retirada:</b> em breve'}</p><div class="cart-bottom"><div class="quantity"><button data-action="minus" data-id="${item.id}" aria-label="Diminuir">−</button><span>${item.qty}</span><button data-action="plus" data-id="${item.id}" aria-label="Aumentar">+</button></div><strong>${money(item.price*item.qty)}</strong></div></article>`).join('')}
function resetBuilder(){
  selectedSize=null;
  selectedIncluded=[];
  selectedExtras=[];
  [...sizeRoot.children,...includedRoot.children,...extrasRoot.children].forEach(button=>button.classList.remove('active'));
  document.querySelector('#notes').value='';
  pickupStoreInput.checked=false;
  updateSelectionInfo();
}
document.querySelector('#addToCart').onclick=()=>{const order=currentOrder();if(!order){showToast('Escolha o tamanho do seu açaí primeiro.');return}if(!pickupStoreInput.checked){showToast('Selecione como deseja receber o seu pedido.');return}cart.push(order);renderCart();resetBuilder();toggleCart(false);showToast('Açaí adicionado à sua sacola!')};
document.querySelector('#cartItems').onclick=event=>{const button=event.target.closest('button[data-id]');if(!button)return;event.stopPropagation();const item=cart.find(x=>x.id===button.dataset.id);if(!item)return;if(button.classList.contains('remove'))cart=cart.filter(x=>x.id!==item.id);else if(button.dataset.action==='plus')item.qty++;else if(button.dataset.action==='minus')item.qty>1?item.qty--:cart=cart.filter(x=>x.id!==item.id);renderCart()};
function showToast(message){const toast=document.querySelector('#toast');toast.textContent=message;toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),3000)}
function toggleCart(force){const summary=document.querySelector('.summary'),open=typeof force==='boolean'?force:!summary.classList.contains('expanded');summary.classList.toggle('expanded',open);document.querySelector('#cartToggle').setAttribute('aria-expanded',open)}
document.querySelector('#cartToggle').onclick=()=>toggleCart();document.querySelector('#closeCart').onclick=()=>toggleCart(false);
document.addEventListener('click',event=>{const summary=document.querySelector('.summary');if(summary.classList.contains('expanded')&&!summary.contains(event.target))toggleCart(false)});
document.querySelector('#sendOrder').onclick=()=>{
  if(!cart.length){showToast('Sua sacola está vazia.');return}

  const now=new Date();
  const total=cart.reduce((sum,item)=>sum+item.price*item.qty,0);
  const quantity=cart.reduce((sum,item)=>sum+item.qty,0);
  const orderCode=`${String(now.getDate()).padStart(2,'0')}${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getTime()).slice(-4)}`;
  const date=now.toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'});
  const divider='────────────────────────';
  const lines=cart.map((item,index)=>{
    const details=[
      `${index+1}. ${item.qty}x ${item.name.toUpperCase()} — ${money(item.price*item.qty)}`,
      `   ${item.detail}`,
      item.included.length?`   GRÁTIS: ${item.included.join(', ')}`:'',
      item.extras.length?`   EXTRAS: ${item.extras.map(x=>x.name).join(', ')}`:'',
      item.note?`   OBS: ${item.note}`:'',
      `   RETIRADA: ${item.pickup ? 'na loja' : 'em breve'}`
    ].filter(Boolean);
    return details.join('\n');
  }).join(`\n${divider}\n`);
  const message=`*AÇAÍ URBANO — NOVO PEDIDO*\n\n\`\`\`\nPEDIDO #${orderCode}\n${date}\n${divider}\nTIPO: ${cart.some(item=>item.pickup) ? 'RETIRADA NO LOCAL' : 'ENTREGA'}\nENDEREÇO: Clóvis Beviláqua, 451\n${divider}\n${lines}\n${divider}\nITENS: ${quantity}\nTOTAL: ${money(total)}\n${divider}\n\`\`\`\n*Pagamento na retirada.*`;

  cart=[];
  localStorage.removeItem(CART_STORAGE_KEY);
  renderCart();
  toggleCart(false);
  window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(message)}`,'_blank');
};
updateSelectionInfo();renderCart();
