const QUEUE_KEY = 'acai-urbano-fila-cozinha';
const COST_KEY = 'acai-urbano-custos';
const CATALOG_KEY = 'acai-urbano-catalogo';
const ACCESS_PASSWORD = 'emilyealexandre';
const defaultCatalog = { sizes: [{ name: 'Pequeno', detail: '300 ml', price: 12, cost: 5 }, { name: 'Médio', detail: '500 ml', price: 16, cost: 7 }, { name: 'Grande', detail: '700 ml', price: 20, cost: 9 }], included: ['Granola', 'Leite em pó', 'Paçoca', 'Amendoim', 'Confete', 'Coco ralado', 'Farinha láctea', 'Calda de morango'], extras: [{ name: 'Morango', price: 3, cost: 1.2 }, { name: 'Banana', price: 2, cost: .8 }, { name: 'Nutella', price: 4, cost: 1.8 }, { name: 'Leite Ninho', price: 3, cost: 1.1 }, { name: 'Ovomaltine', price: 3, cost: 1.2 }, { name: 'Whey protein', price: 5, cost: 2.5 }] };
let catalog = defaultCatalog;
try { catalog = { ...defaultCatalog, ...JSON.parse(localStorage.getItem(CATALOG_KEY)) }; } catch {}
let sizes = catalog.sizes;
let included = catalog.included;
let extras = catalog.extras;
const money = value => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const $ = selector => document.querySelector(selector);
function unlockManagement() { document.body.classList.remove('locked'); $('#loginScreen').setAttribute('aria-hidden', 'true'); }
if (sessionStorage.getItem('acai-urbano-gestao-auth') === 'true') unlockManagement();
let orders = [];
let costs = { sizes: Object.fromEntries(sizes.map(item => [item.name, item.cost || 0])), extras: Object.fromEntries(extras.map(item => [item.name, item.cost || 0])) };
let activePeriod = 'week';
try { orders = JSON.parse(localStorage.getItem(QUEUE_KEY)) || []; } catch { orders = []; }
try { costs = { ...costs, ...JSON.parse(localStorage.getItem(COST_KEY)) }; } catch {}

function dateKey(date) { return date.toISOString().slice(0, 10); }
function startOfWeek(date) { const result = new Date(date); const day = result.getDay(); result.setDate(result.getDate() - (day === 0 ? 6 : day - 1)); result.setHours(0, 0, 0, 0); return result; }
function getPeriod() {
  if (activePeriod === 'custom') return { start: new Date(`${$('#startDate').value}T00:00:00`), end: new Date(`${$('#endDate').value}T23:59:59`) };
  const today = new Date();
  if (activePeriod === 'all') return { start: new Date(0), end: new Date(8640000000000000) };
  if (activePeriod === 'month') return { start: new Date(today.getFullYear(), today.getMonth(), 1), end: new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59) };
  const start = startOfWeek(today); const end = new Date(start); end.setDate(end.getDate() + 6); end.setHours(23, 59, 59); return { start, end };
}
function itemCost(item) {
  const sizeName = item.name.replace('Açaí ', '');
  return (costs.sizes[sizeName] || 0) + item.extras.reduce((sum, name) => sum + (costs.extras[name] || 0), 0);
}
function orderProfit(order) { return order.items.reduce((sum, item) => sum + item.price - itemCost(item), 0); }
function filteredOrders() { const period = getPeriod(); return orders.filter(order => { const date = new Date(order.createdAt); return date >= period.start && date <= period.end; }); }
function renderMetrics(filtered) {
  const revenue = filtered.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const profit = filtered.reduce((sum, order) => sum + orderProfit(order), 0);
  const count = filtered.reduce((sum, order) => sum + order.items.length, 0);
  $('#revenue').textContent = money(revenue); $('#profit').textContent = money(profit); $('#orders').textContent = filtered.length; $('#acaiCount').textContent = count;
  $('#averageTicket').textContent = `Ticket médio: ${money(filtered.length ? revenue / filtered.length : 0)}`;
  const period = getPeriod(); $('#filterCaption').textContent = `${period.start.toLocaleDateString('pt-BR')} até ${period.end.toLocaleDateString('pt-BR')} · ${filtered.length} pedido(s) pago(s)`;
}
function renderChart(filtered) {
  const days = {}; filtered.forEach(order => { const key = dateKey(new Date(order.createdAt)); if (!days[key]) days[key] = { revenue: 0, count: 0 }; days[key].revenue += Number(order.total || 0); days[key].count += order.items.length; });
  const keys = Object.keys(days).sort(); const values = keys.map(key => days[key].revenue); const max = Math.max(...values, 1);
  $('#salesChart').innerHTML = keys.length ? keys.map(key => `<div class="chart-column"><div class="bar-value">${money(days[key].revenue)}</div><div class="bar" style="height:${Math.max(8, days[key].revenue / max * 150)}px"><span>${days[key].count}</span></div><small>${new Date(`${key}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</small></div>`).join('') : '<div class="empty-chart">Nenhuma venda no período selecionado.</div>';
}
function renderRanking(filtered) {
  const products = {}; filtered.forEach(order => order.items.forEach(item => { const name = item.name.replace('Açaí ', ''); products[name] = (products[name] || 0) + 1; }));
  const ranking = Object.entries(products).sort((a, b) => b[1] - a[1]); const max = ranking[0]?.[1] || 1;
  $('#productRanking').innerHTML = ranking.length ? ranking.map(([name, count], index) => `<div class="ranking-row"><span class="rank">${index + 1}</span><div><strong>Açaí ${name}</strong><div class="progress"><i style="width:${count / max * 100}%"></i></div></div><b>${count}</b></div>`).join('') : '<div class="empty-chart">Sem produtos vendidos no período.</div>';
}
function renderTable(filtered) {
  const days = {}; filtered.forEach(order => { const key = dateKey(new Date(order.createdAt)); if (!days[key]) days[key] = { orders: 0, acai: 0, revenue: 0, profit: 0 }; days[key].orders++; days[key].acai += order.items.length; days[key].revenue += Number(order.total || 0); days[key].profit += orderProfit(order); });
  const rows = Object.entries(days).sort((a, b) => b[0].localeCompare(a[0])); $('#detailCount').textContent = `${rows.length} dia(s) com venda`;
  $('#dailyTable').innerHTML = rows.length ? rows.map(([key, data]) => `<tr><td>${new Date(`${key}T12:00:00`).toLocaleDateString('pt-BR')}</td><td>${data.orders}</td><td>${data.acai}</td><td>${money(data.revenue)}</td><td class="profit-cell">${money(data.profit)}</td></tr>`).join('') : '<tr><td colspan="5" class="empty-table">Nenhuma venda encontrada.</td></tr>';
}
function renderOrderHistory(filtered) {
  const rows = [...filtered].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  $('#orderHistoryCount').textContent = `${rows.length} pedido(s)`;
  $('#orderHistory').innerHTML = rows.length ? rows.map(order => `<tr><td><strong>${order.code}</strong></td><td>${order.customer || 'Balcão'}</td><td>${new Date(order.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</td><td>${order.items.length}</td><td>${money(order.total)}</td><td><button class="delete-order" data-delete-order="${order.id}" type="button">Excluir</button></td></tr>`).join('') : '<tr><td colspan="6" class="empty-table">Nenhum pedido encontrado.</td></tr>';
}
function renderCatalog() {
  $('#sizeCatalog').innerHTML = catalog.sizes.map((item, index) => `<div class="catalog-row"><input data-catalog="size-name" data-index="${index}" value="${item.name}" aria-label="Nome do tamanho"><input data-catalog="size-detail" data-index="${index}" value="${item.detail}" aria-label="Volume"><input data-catalog="size-price" data-index="${index}" type="number" min="0" step="0.01" value="${item.price}" aria-label="Preço"><input data-catalog="size-cost" data-index="${index}" type="number" min="0" step="0.01" value="${item.cost || 0}" aria-label="Custo"><button data-remove="size" data-index="${index}" type="button" aria-label="Apagar tamanho">×</button></div>`).join('');
  $('#includedCatalog').innerHTML = catalog.included.map((item, index) => `<div class="catalog-row simple"><input data-catalog="included-name" data-index="${index}" value="${item}" aria-label="Nome do complemento"><button data-remove="included" data-index="${index}" type="button" aria-label="Apagar complemento">×</button></div>`).join('');
  $('#extraCatalog').innerHTML = catalog.extras.map((item, index) => `<div class="catalog-row"><input data-catalog="extra-name" data-index="${index}" value="${item.name}" aria-label="Nome do extra"><input data-catalog="extra-price" data-index="${index}" type="number" min="0" step="0.01" value="${item.price}" aria-label="Preço"><input data-catalog="extra-cost" data-index="${index}" type="number" min="0" step="0.01" value="${item.cost || 0}" aria-label="Custo"><button data-remove="extra" data-index="${index}" type="button" aria-label="Apagar extra">×</button></div>`).join('');
}
function renderCosts() {
  $('#costFields').innerHTML = `<div><h3>Tamanhos</h3>${sizes.map(item => `<label>${item.name}<span>R$ <input data-cost-size="${item.name}" type="number" min="0" step="0.01" value="${costs.sizes[item.name] ?? 0}"></span></label>`).join('')}</div><div><h3>Extras</h3>${extras.map(item => `<label>${item.name}<span>R$ <input data-cost-extra="${item.name}" type="number" min="0" step="0.01" value="${costs.extras[item.name] ?? 0}"></span></label>`).join('')}</div>`;
}
function render() { const filtered = filteredOrders(); renderMetrics(filtered); renderChart(filtered); renderRanking(filtered); renderTable(filtered); renderOrderHistory(filtered); }
function setPeriod(period) { activePeriod = period; document.querySelectorAll('.period-tab').forEach(button => button.classList.toggle('active', button.dataset.period === period)); $('.date-fields').classList.toggle('visible', period === 'custom'); render(); }
$('#refresh').onclick = () => { try { orders = JSON.parse(localStorage.getItem(QUEUE_KEY)) || []; } catch {} render(); showToast('Dados atualizados.'); };
document.querySelectorAll('.period-tab').forEach(button => button.onclick = () => setPeriod(button.dataset.period));
$('#applyDates').onclick = () => { if (!$('#startDate').value || !$('#endDate').value) return showToast('Escolha as duas datas.'); activePeriod = 'custom'; render(); };
$('#saveCosts').onclick = () => { document.querySelectorAll('[data-cost-size]').forEach(input => costs.sizes[input.dataset.costSize] = Number(input.value) || 0); document.querySelectorAll('[data-cost-extra]').forEach(input => costs.extras[input.dataset.costExtra] = Number(input.value) || 0); localStorage.setItem(COST_KEY, JSON.stringify(costs)); render(); $('#savedMessage').textContent = 'Custos salvos.'; setTimeout(() => $('#savedMessage').textContent = '', 2400); };
document.querySelectorAll('[data-add]').forEach(button => button.onclick = () => { if (button.dataset.add === 'size') catalog.sizes.push({ name: 'Novo tamanho', detail: '300 ml', price: 0, cost: 0 }); if (button.dataset.add === 'included') catalog.included.push('Novo complemento'); if (button.dataset.add === 'extra') catalog.extras.push({ name: 'Novo extra', price: 0, cost: 0 }); renderCatalog(); });
document.querySelector('.catalog-panel').onclick = event => { const remove = event.target.closest('[data-remove]'); if (!remove) return; const type = remove.dataset.remove; const index = Number(remove.dataset.index); if (!window.confirm('Apagar este item do cardápio?')) return; catalog[type === 'size' ? 'sizes' : type === 'extra' ? 'extras' : 'included'].splice(index, 1); renderCatalog(); };
$('#saveCatalog').onclick = () => { document.querySelectorAll('[data-catalog]').forEach(input => { const index = Number(input.dataset.index); const value = input.type === 'number' ? Number(input.value) || 0 : input.value.trim(); if (input.dataset.catalog === 'size-name') catalog.sizes[index].name = value; if (input.dataset.catalog === 'size-detail') catalog.sizes[index].detail = value; if (input.dataset.catalog === 'size-price') catalog.sizes[index].price = value; if (input.dataset.catalog === 'size-cost') catalog.sizes[index].cost = value; if (input.dataset.catalog === 'included-name') catalog.included[index] = value; if (input.dataset.catalog === 'extra-name') catalog.extras[index].name = value; if (input.dataset.catalog === 'extra-price') catalog.extras[index].price = value; if (input.dataset.catalog === 'extra-cost') catalog.extras[index].cost = value; }); sizes = catalog.sizes; included = catalog.included; extras = catalog.extras; costs = { sizes: Object.fromEntries(sizes.map(item => [item.name, item.cost || 0])), extras: Object.fromEntries(extras.map(item => [item.name, item.cost || 0])) }; localStorage.setItem(CATALOG_KEY, JSON.stringify(catalog)); localStorage.setItem(COST_KEY, JSON.stringify(costs)); renderCosts(); render(); $('#catalogMessage').textContent = 'Cardápio salvo. Abra o balcão novamente para carregar as alterações.'; setTimeout(() => $('#catalogMessage').textContent = '', 3500); };
$('#orderHistory').onclick = event => { const button = event.target.closest('[data-delete-order]'); if (!button) return; const order = orders.find(item => item.id === button.dataset.deleteOrder); if (!order) return; if (!window.confirm(`Excluir o pedido ${order.code}? Essa venda será removida dos relatórios.`)) return; orders = orders.filter(item => item.id !== order.id); localStorage.setItem(QUEUE_KEY, JSON.stringify(orders)); render(); showToast(`${order.code} excluído dos relatórios.`); };
function showToast(message) { const toast = $('#toast'); toast.textContent = message; toast.classList.add('show'); clearTimeout(toast.timer); toast.timer = setTimeout(() => toast.classList.remove('show'), 2600); }
$('#loginForm').onsubmit = event => { event.preventDefault(); if ($('#accessPassword').value === ACCESS_PASSWORD) { sessionStorage.setItem('acai-urbano-gestao-auth', 'true'); $('#loginError').textContent = ''; unlockManagement(); } else { $('#loginError').textContent = 'Senha incorreta.'; $('#accessPassword').select(); } };
$('#logout').onclick = () => { sessionStorage.removeItem('acai-urbano-gestao-auth'); document.body.classList.add('locked'); $('#loginScreen').setAttribute('aria-hidden', 'false'); $('#accessPassword').value = ''; $('#accessPassword').focus(); };
const today = new Date(); const week = startOfWeek(today); const monthStart = new Date(today.getFullYear(), today.getMonth(), 1); $('#startDate').value = dateKey(week); $('#endDate').value = dateKey(today); renderCatalog(); renderCosts(); setPeriod('week');