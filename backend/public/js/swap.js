/**
 * VeloxPay - Swap Desk & RFQ Quoting Engine
 */

function onCurrencyChanged() {
  clearActiveQuote();
  updateSwapAvailable();
  updateRatePreview();
}

function onAmountChanged() {
  clearActiveQuote();
  updateRatePreview();
}

function updateSwapAvailable() {
  const fromCurrency = document.getElementById('swapFromCurrency')?.value || 'ARS';
  const asset = window.state.balances.find((b) => b.currency === fromCurrency);
  const el = document.getElementById('swapAvailableBalance');
  if (el) {
    el.innerText = asset ? Number(asset.balance).toLocaleString('es-AR', { maximumFractionDigits: 6 }) + ' ' + fromCurrency : '0.00 ' + fromCurrency;
  }
}

function invertPair() {
  const fromSelect = document.getElementById('swapFromCurrency');
  const toSelect = document.getElementById('swapToCurrency');
  if (!fromSelect || !toSelect) return;

  const temp = fromSelect.value;
  fromSelect.value = toSelect.value;
  toSelect.value = temp;
  onCurrencyChanged();
}

function updateRatePreview() {
  const fromCurrency = document.getElementById('swapFromCurrency')?.value || 'ARS';
  const toCurrency = document.getElementById('swapToCurrency')?.value || 'USDT';
  const fromAmount = parseFloat(document.getElementById('swapFromAmount')?.value) || 0;
  const previewEl = document.getElementById('ratePreview');
  const toAmountInput = document.getElementById('swapToAmount');

  if (!previewEl || !toAmountInput || !window.state.rates[fromCurrency] || !window.state.rates[toCurrency]) return;

  const fromPriceUsd = window.state.rates[fromCurrency];
  const toPriceUsd = window.state.rates[toCurrency];
  const midMarketRate = fromPriceUsd / toPriceUsd;

  previewEl.innerText = `1 ${fromCurrency} ≈ ${midMarketRate.toFixed(6)} ${toCurrency} (Tasa Mayorista)`;

  if (fromAmount > 0) {
    const estimated = fromAmount * midMarketRate * 0.99; // Estimación con spread
    toAmountInput.value = estimated.toFixed(toCurrency === 'BTC' || toCurrency === 'ETH' ? 6 : 2);
  } else {
    toAmountInput.value = '';
  }
}

async function requestQuote() {
  const fromCurrency = document.getElementById('swapFromCurrency').value;
  const toCurrency = document.getElementById('swapToCurrency').value;
  const fromAmount = parseFloat(document.getElementById('swapFromAmount').value);

  if (!fromAmount || fromAmount <= 0) {
    showToast('Atención', 'Ingresa un monto válido para cotizar', 'warning');
    return;
  }

  try {
    const res = await apiFetch('/quotes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fromCurrency, toCurrency, fromAmount }),
    });

    const quote = await res.json();
    if (!res.ok) throw new Error(quote.error);

    window.state.activeQuote = quote;

    document.getElementById('swapToAmount').value = quote.toAmount;
    document.getElementById('quoteRateDisplay').innerText = `1 ${fromCurrency} = ${quote.rate} ${toCurrency}`;
    document.getElementById('quoteFeeDisplay').innerText = `${quote.feeAmount} ${fromCurrency}`;
    document.getElementById('quoteBox').classList.remove('hidden');

    document.getElementById('btnGetQuote').classList.add('hidden');
    document.getElementById('btnExecuteSwap').classList.remove('hidden');

    startQuoteTimer(quote.expiresInSeconds);
  } catch (err) {
    showToast('Error', err.message, 'error');
  }
}

function startQuoteTimer(seconds) {
  if (window.state.quoteTimerInterval) clearInterval(window.state.quoteTimerInterval);
  let remaining = seconds;
  const timerEl = document.getElementById('quoteTimerText');
  const barEl = document.getElementById('quoteProgressBar');

  if (timerEl) timerEl.innerText = `${remaining}s`;
  if (barEl) barEl.style.width = '100%';

  window.state.quoteTimerInterval = setInterval(() => {
    remaining--;
    if (timerEl) timerEl.innerText = `${remaining}s`;
    const percentage = (remaining / seconds) * 100;
    if (barEl) barEl.style.width = `${percentage}%`;

    if (remaining <= 0) {
      clearInterval(window.state.quoteTimerInterval);
      clearActiveQuote();
      showToast('Cotización Expirada', 'La tasa se actualizó. Solicita una nueva.', 'warning');
    }
  }, 1000);
}

function clearActiveQuote() {
  window.state.activeQuote = null;
  if (window.state.quoteTimerInterval) clearInterval(window.state.quoteTimerInterval);
  const quoteBox = document.getElementById('quoteBox');
  const btnGet = document.getElementById('btnGetQuote');
  const btnExec = document.getElementById('btnExecuteSwap');

  if (quoteBox) quoteBox.classList.add('hidden');
  if (btnGet) btnGet.classList.remove('hidden');
  if (btnExec) btnExec.classList.add('hidden');
}

async function executeSwap() {
  if (!window.state.activeQuote) return;

  try {
    const res = await apiFetch('/swaps/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quoteId: window.state.activeQuote.quoteId }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    showToast('Operación Exitosa', `Recibiste ${data.swapped.to}`, 'success');
    clearActiveQuote();
    document.getElementById('swapFromAmount').value = '';
    document.getElementById('swapToAmount').value = '';

    if (typeof fetchBalances === 'function') await fetchBalances();
    if (typeof fetchActivity === 'function') await fetchActivity();
  } catch (err) {
    showToast('Error en Swap', err.message, 'error');
  }
}

window.onCurrencyChanged = onCurrencyChanged;
window.onAmountChanged = onAmountChanged;
window.updateSwapAvailable = updateSwapAvailable;
window.invertPair = invertPair;
window.updateRatePreview = updateRatePreview;
window.requestQuote = requestQuote;
window.startQuoteTimer = startQuoteTimer;
window.clearActiveQuote = clearActiveQuote;
window.executeSwap = executeSwap;
