/**
 * VeloxPay - Real-Time Crypto Markets & Live Rates
 */

async function fetchRates() {
  try {
    const res = await apiFetch('/quotes/rates');
    const data = await res.json();
    window.state.rates = data.usdPrices;
    window.state.marketQuotes = data.marketQuotes || [];
    
    if (typeof updateRatePreview === 'function') updateRatePreview();
    renderTickerTape();
    renderMarketQuotesView();

    const timeStr = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const lastEl = document.getElementById('lastQuotesUpdate');
    if (lastEl) lastEl.innerText = `Actualizado a las ${timeStr}`;
  } catch (err) {
    console.error('Error al cargar tasas:', err);
  }
}

function renderTickerTape() {
  const container = document.getElementById('tickerTape');
  if (!container || !window.state.marketQuotes || window.state.marketQuotes.length === 0) return;
  container.innerHTML = '';

  window.state.marketQuotes.forEach((q) => {
    const isPositive = q.change24h >= 0;
    const changeClass = isPositive ? 'text-emerald-400' : 'text-rose-400';
    const arrow = isPositive ? '▲' : '▼';
    const sign = isPositive ? '+' : '';

    const item = document.createElement('div');
    item.className = 'flex items-center gap-2 shrink-0 cursor-pointer hover:opacity-80 transition';
    item.onclick = () => startSwapWith(q.symbol);

    item.innerHTML = `
      <span class="font-bold text-white">${q.symbol}:</span>
      <span class="text-slate-200">$${Number(q.buyPriceArs).toLocaleString('es-AR')}</span>
      <span class="${changeClass} text-[10px] font-semibold">${sign}${q.change24h}% ${arrow}</span>
      <span class="text-slate-700 mx-1">|</span>
    `;
    container.appendChild(item);
  });
}

function renderMarketQuotesView() {
  const grid = document.getElementById('marketCardsGrid');
  const tableBody = document.getElementById('marketTableBody');
  if (!grid || !tableBody || !window.state.marketQuotes) return;

  grid.innerHTML = '';
  tableBody.innerHTML = '';

  window.state.marketQuotes.forEach((q) => {
    const isPositive = q.change24h >= 0;
    const changeColor = isPositive ? 'text-emerald-400' : 'text-rose-400';
    const changeBadge = isPositive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    const arrow = isPositive ? '▲' : '▼';
    const sign = isPositive ? '+' : '';

    // Tarjeta resumida
    const card = document.createElement('div');
    card.className = 'hb-card rounded-2xl p-4 border flex flex-col justify-between hover:border-emerald-500/30 transition';
    card.innerHTML = `
      <div class="flex justify-between items-start">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-white text-xs">
            ${q.symbol.slice(0, 3)}
          </div>
          <div>
            <div class="font-bold text-white text-xs">${q.name}</div>
            <div class="text-[10px] text-slate-400 font-mono">${q.symbol}</div>
          </div>
        </div>
        <span class="px-2 py-0.5 rounded text-[10px] font-bold border ${changeBadge}">
          ${sign}${q.change24h}%
        </span>
      </div>
      <div class="mt-4 pt-3 border-t border-slate-800/80">
        <div class="flex justify-between items-baseline">
          <span class="text-[11px] text-slate-400 font-sans">Precio USD:</span>
          <span class="font-bold text-white font-mono text-sm">$${Number(q.priceUsd).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        </div>
        <div class="flex justify-between items-baseline mt-1 text-[11px]">
          <span class="text-slate-400 font-sans">Compra ARS:</span>
          <span class="font-bold text-emerald-400 font-mono">$${Number(q.buyPriceArs).toLocaleString('es-AR')}</span>
        </div>
      </div>
    `;
    grid.appendChild(card);

    // Fila en tabla institucional
    const row = document.createElement('tr');
    row.className = 'hover:bg-slate-900/50 transition';
    row.innerHTML = `
      <td class="py-3.5 px-4">
        <div class="flex items-center gap-2.5">
          <div class="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-bold text-white">
            ${q.symbol.slice(0, 3)}
          </div>
          <div>
            <div class="font-bold text-white text-xs">${q.name}</div>
            <div class="text-[10px] text-slate-400">${q.symbol}</div>
          </div>
        </div>
      </td>
      <td class="py-3.5 px-4 font-bold text-white font-mono">
        $${Number(q.priceUsd).toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
      </td>
      <td class="py-3.5 px-4 font-bold text-emerald-400 font-mono">
        $${Number(q.buyPriceArs).toLocaleString('es-AR')} ARS
      </td>
      <td class="py-3.5 px-4 font-bold text-blue-400 font-mono">
        $${Number(q.sellPriceArs).toLocaleString('es-AR')} ARS
      </td>
      <td class="py-3.5 px-4 font-mono">
        <span class="px-2 py-0.5 rounded text-[10px] font-bold border ${changeBadge}">
          ${sign}${q.change24h}% ${arrow}
        </span>
      </td>
      <td class="py-3.5 px-4 text-right font-sans">
        <button onclick="startSwapWith('${q.symbol}')" class="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition shadow-sm">
          Operar
        </button>
      </td>
    `;
    tableBody.appendChild(row);
  });
}

function startSwapWith(currency) {
  switchView('swap');
  
  const toSelect = document.getElementById('swapToCurrency');
  const fromSelect = document.getElementById('swapFromCurrency');

  if (currency === 'ARS') {
    if (fromSelect) fromSelect.value = 'USDT';
    if (toSelect) toSelect.value = 'ARS';
  } else {
    if (fromSelect) fromSelect.value = 'ARS';
    if (toSelect) toSelect.value = currency;
  }

  if (typeof onCurrencyChanged === 'function') onCurrencyChanged();
  const inputEl = document.getElementById('swapFromAmount');
  if (inputEl) inputEl.focus();
}

window.fetchRates = fetchRates;
window.renderTickerTape = renderTickerTape;
window.renderMarketQuotesView = renderMarketQuotesView;
window.startSwapWith = startSwapWith;
