const CATALOG_KEY = 'acai-urbano-catalogo';
const defaultCatalog = {
  sizes: [
  { name: 'Pequeno', detail: '300 ml', price: 12 },
  { name: 'Médio', detail: '500 ml', price: 16 },
  { name: 'Grande', detail: '700 ml', price: 20 }
  ],
  included: ['Granola', 'Leite em pó', 'Paçoca', 'Amendoim', 'Confete', 'Coco ralado', 'Farinha láctea', 'Calda de morango'],
  extras: [
  { name: 'Morango', price: 3 }, { name: 'Banana', price: 2 }, { name: 'Nutella', price: 4 },
  { name: 'Leite Ninho', price: 3 }, { name: 'Ovomaltine', price: 3 }, { name: 'Whey protein', price: 5 }
  ]
};
let catalog = defaultCatalog;
try { catalog = { ...defaultCatalog, ...JSON.parse(localStorage.getItem(CATALOG_KEY)) }; } catch {}
const sizes = catalog.sizes;
const included = catalog.included;
const extras = catalog.extras;
const QUEUE_KEY = 'acai-urbano-fila-cozinha';
const money = value => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const createId = () => window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
let selectedSize = null;
let selectedIncluded = [];
let selectedExtras = [];
let draftItems = [];
let kitchenQueue = [];
try { kitchenQueue = JSON.parse(localStorage.getItem(QUEUE_KEY)) || []; } catch { kitchenQueue = []; }

const $ = selector => document.querySelector(selector);
const sizesRoot = $('#sizes');
const includedRoot = $('#included');
const extrasRoot = $('#extras');

function getIncludedLimit() { return selectedSize === null || sizes[selectedSize].name !== 'Pequeno' ? 3 : 2; }
function currentItemTotal() {
  if (selectedSize === null) return 0;
  return sizes[selectedSize].price + extras.filter(item => selectedExtras.includes(item.name)).reduce((sum, item) => sum + item.price, 0);
}
function updateBuilder() {
  $('#includedLimit').textContent = getIncludedLimit();
  $('#itemTotal').textContent = money(currentItemTotal());
  $('#addItem').disabled = selectedSize === null;
  sizesRoot.querySelectorAll('.size-card').forEach((button, index) => button.classList.toggle('active', index === selectedSize));
  includedRoot.querySelectorAll('.option-card').forEach(button => button.classList.toggle('active', selectedIncluded.includes(button.dataset.name)));
  extrasRoot.querySelectorAll('.option-card').forEach(button => button.classList.toggle('active', selectedExtras.includes(button.dataset.name)));
}
function optionButton(item, type) {
  const name = typeof item === 'string' ? item : item.name;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'option-card';
  button.dataset.name = name;
  button.innerHTML = `<span>${name}</span>${typeof item === 'string' ? '' : `<small>+ ${money(item.price)}</small>`}<i>✓</i>`;
  button.onclick = () => {
    const selected = type === 'included' ? selectedIncluded : selectedExtras;
    const position = selected.indexOf(name);
    if (position >= 0) selected.splice(position, 1);
    else if (type === 'included' && selected.length >= getIncludedLimit()) {
      showToast(`Este tamanho aceita até ${getIncludedLimit()} complementos grátis.`);
      return;
    } else selected.push(name);
    updateBuilder();
  };
  return button;
}
function renderOptions() {
  sizes.forEach((size, index) => {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'size-card';
    button.innerHTML = `<strong>${size.name}</strong><span>${size.detail}</span><b>${money(size.price)}</b>`;
    button.onclick = () => { selectedSize = index; if (selectedIncluded.length > getIncludedLimit()) selectedIncluded = selectedIncluded.slice(0, getIncludedLimit()); updateBuilder(); };
    sizesRoot.append(button);
  });
  included.forEach(item => includedRoot.append(optionButton(item, 'included')));
  extras.forEach(item => extrasRoot.append(optionButton(item, 'extras')));
}
function draftTotal() { return draftItems.reduce((sum, item) => sum + item.price, 0); }
function renderDraft() {
  const total = draftTotal();
  const count = draftItems.length;
  $('#draftTotal').textContent = money(total);
  $('#orderTotal').textContent = money(total);
  $('#itemCount').textContent = `${count} ${count === 1 ? 'item' : 'itens'}`;
  $('#paidAndSend').disabled = !count;
  $('#clearDraft').disabled = !count;
  $('#draftItems').innerHTML = count ? draftItems.map(item => `<article class="draft-item"><div class="draft-item-head"><strong>${item.name} · ${item.detail}</strong><button class="remove-item" data-id="${item.id}" type="button" aria-label="Remover item">×</button><span class="price">${money(item.price)}</span></div><p>${item.included.length ? item.included.join(', ') : 'Sem complementos'}${item.extras.length ? `<br><strong>Extras:</strong> ${item.extras.join(', ')}` : ''}</p></article>`).join('') : '<div class="empty-state"><span>＋</span><p>Adicione os açaís<br>montados ao pedido.</p></div>';
}
function resetItem() {
  selectedSize = null; selectedIncluded = []; selectedExtras = []; updateBuilder();
}
function addCurrentItem() {
  if (selectedSize === null) return;
  const size = sizes[selectedSize];
  draftItems.push({ id: createId(), name: `Açaí ${size.name}`, detail: size.detail, included: [...selectedIncluded], extras: extras.filter(item => selectedExtras.includes(item.name)).map(item => item.name), price: currentItemTotal() });
  resetItem(); renderDraft(); showToast('Açaí adicionado ao pedido.');
}
function printKitchenOrder(order) {
  const printWindow = window.open('', '_blank', 'width=420,height=700');
  if (!printWindow) {
    showToast('Permita pop-ups para imprimir a comanda.');
    return;
  }
  const safe = value => String(value).replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
  const itemLines = order.items.map(item => `<section><strong>${safe(item.name)} · ${safe(item.detail)}</strong><p>${safe(item.included.length ? item.included.join(', ') : 'Sem complementos')}</p>${item.extras.length ? `<p><b>Extras:</b> ${safe(item.extras.join(', '))}</p>` : ''}</section>`).join('');
  printWindow.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Comanda ${safe(order.code)}</title><style>@page{size:80mm auto;margin:0}*{box-sizing:border-box}body{width:72mm;margin:0 auto;padding:5mm 0;color:#000;background:#fff;font:12px Arial,sans-serif}header{text-align:center;border-bottom:1px dashed #000;padding-bottom:10px;margin-bottom:10px}h1{margin:0 0 4px;font-size:18px}h2{margin:0;font-size:14px}p{margin:4px 0;line-height:1.35}section{padding:8px 0;border-bottom:1px dashed #999}section strong{font-size:13px}section p{font-size:11px}.meta{display:flex;justify-content:space-between;font-weight:bold}.note{margin-top:10px;padding-top:8px;border-top:1px solid #000}.total{display:flex;justify-content:space-between;margin-top:10px;font-size:14px;font-weight:bold}.footer{text-align:center;margin-top:14px;font-size:10px}@media print{body{padding-top:3mm}}</style></head><body><header><h1>AÇAÍ URBANO</h1><h2>COMANDA DA COZINHA</h2></header><div class="meta"><span>${safe(order.code)}</span><span>${new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span></div><p><b>Cliente:</b> ${safe(order.customer || 'Balcão')}</p>${itemLines}${order.note ? `<p class="note"><b>OBSERVAÇÃO:</b><br>${safe(order.note)}</p>` : ''}<p class="total"><span>TOTAL PAGO</span><span>${money(order.total)}</span></p><p class="footer">Pedido liberado após pagamento</p></body></html>`);
  printWindow.document.close();
  printWindow.focus();
  printWindow.addEventListener('afterprint', () => printWindow.close(), { once: true });
  setTimeout(() => printWindow.print(), 150);
}
function renderQueue() {
  const waiting = kitchenQueue.filter(item => !item.done);
  $('#queueCount').textContent = `${waiting.length} aguardando`;
  $('#kitchenQueue').innerHTML = kitchenQueue.length ? kitchenQueue.map(order => `<article class="kitchen-card ${order.done ? 'done' : ''}"><div class="kitchen-card-top"><h3>${order.customer || 'Cliente balcão'}</h3><time>${order.code}</time></div><div class="kitchen-lines">${order.items.map(item => `<div><strong>${item.name}</strong> · ${item.included.length ? item.included.join(', ') : 'sem complementos'}${item.extras.length ? `<br>Extras: ${item.extras.join(', ')}` : ''}</div>`).join('<hr>')}${order.note ? `<p><strong>Obs.:</strong> ${order.note}</p>` : ''}</div><div class="kitchen-actions"><button class="print-button" data-print="${order.id}" type="button">Imprimir</button>${order.done ? '<button class="finish-button" disabled>Concluído</button>' : `<button class="finish-button" data-finish="${order.id}" type="button">Marcar como pronto</button>`}</div></article>`).join('') : '<div class="empty-queue">Nenhum pedido pago aguardando preparo.</div>';
  localStorage.setItem(QUEUE_KEY, JSON.stringify(kitchenQueue));
}
function payAndSend() {
  if (!draftItems.length) return;
  const now = new Date();
  const order = { id: createId(), code: `#${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`, customer: $('#customerName').value.trim(), note: $('#orderNote').value.trim(), items: draftItems, total: draftTotal(), createdAt: now.toISOString(), done: false };
  kitchenQueue.unshift(order); draftItems = []; $('#customerName').value = ''; $('#orderNote').value = '';
  renderDraft(); renderQueue(); printKitchenOrder(order); showToast(`${order.code} pago, enviado e pronto para impressão.`);
}
function showToast(message) { const toast = $('#toast'); toast.textContent = message; toast.classList.add('show'); clearTimeout(toast.timer); toast.timer = setTimeout(() => toast.classList.remove('show'), 3200); }

$('#addItem').onclick = addCurrentItem;
$('#paidAndSend').onclick = payAndSend;
$('#clearDraft').onclick = () => { draftItems = []; renderDraft(); };
$('#draftItems').onclick = event => { const button = event.target.closest('[data-id]'); if (button) { draftItems = draftItems.filter(item => item.id !== button.dataset.id); renderDraft(); } };
$('#kitchenQueue').onclick = event => {
  const printButton = event.target.closest('[data-print]');
  if (printButton) {
    const order = kitchenQueue.find(item => item.id === printButton.dataset.print);
    if (order) printKitchenOrder(order);
    return;
  }
  const button = event.target.closest('[data-finish]');
  if (!button) return;
  const order = kitchenQueue.find(item => item.id === button.dataset.finish);
  if (order) { order.done = true; renderQueue(); }
};
renderOptions(); updateBuilder(); renderDraft(); renderQueue();