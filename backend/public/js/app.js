/**
 * VeloxPay - Main Application Bootstrap & Dashboard Controller
 */

async function init() {
  initTheme();

  // Si hay sesión guardada en localStorage, recuperamos el perfil del usuario autenticado
  if (window.state.token) {
    try {
      const res = await apiFetch('/auth/me');
      if (res.ok) {
        const user = await res.json();
        window.state.user = user;
        const initials = (user.firstName.charAt(0) + (user.lastName ? user.lastName.charAt(0) : '')).toUpperCase();
        
        const avatarEl = document.getElementById('userAvatar');
        const nameEl = document.getElementById('userName');
        const cuitEl = document.getElementById('userCuit');
        const menuNameEl = document.getElementById('menuFullName');
        const menuEmailEl = document.getElementById('menuEmail');
        const providerBadge = document.getElementById('menuProviderBadge');

        if (avatarEl) avatarEl.innerText = initials;
        if (nameEl) nameEl.innerText = `${user.firstName} ${user.lastName}`;
        if (cuitEl) cuitEl.innerText = `CUIT: ${user.cuitDni}`;
        if (menuNameEl) menuNameEl.innerText = `${user.firstName} ${user.lastName}`;
        if (menuEmailEl) menuEmailEl.innerText = user.email;

        if (providerBadge) {
          if (user.authProvider === 'GOOGLE') {
            providerBadge.innerHTML = '<i class="fa-brands fa-google text-[9px] text-blue-400 mr-1"></i> Google ID';
          } else if (user.authProvider === 'APPLE') {
            providerBadge.innerHTML = '<i class="fa-brands fa-apple text-[9px] text-slate-300 mr-1"></i> Apple ID';
          } else {
            providerBadge.innerHTML = '<i class="fa-solid fa-shield-halved text-[9px] text-emerald-400 mr-1"></i> Velox ID';
          }
        }

        const withdrawOwner = document.getElementById('withdrawOwner');
        const withdrawCuit = document.getElementById('withdrawCuit');
        if (withdrawOwner) withdrawOwner.value = `${user.firstName} ${user.lastName}`;
        if (withdrawCuit) withdrawCuit.value = user.cuitDni;
      } else {
        localStorage.removeItem('veloxpay_token');
        window.state.token = '';
      }
    } catch (e) {
      console.warn('Error al verificar sesión:', e);
    }
  }

  await Promise.all([
    fetchBalances(),
    fetchVirtualAccount(),
    fetchUsAccount(),
    fetchRates(),
    fetchActivity(),
  ]);
}

async function fetchBalances() {
  try {
    const res = await apiFetch('/wallet/balances');
    const data = await res.json();
    window.state.balances = data.balances;
    window.state.summary = data.summary;
    renderBalances();
    if (typeof updateSwapAvailable === 'function') updateSwapAvailable();
  } catch (err) {
    console.error('Error al cargar balances:', err);
  }
}

function renderBalances() {
  if (!window.state.summary) return;

  const mask = '••••••••';
  const arsTotal = window.state.isBalanceHidden ? mask : '$' + Number(window.state.summary.totalEstimatedArs).toLocaleString('es-AR', { minimumFractionDigits: 2 });
  const usdTotal = window.state.isBalanceHidden ? mask : '$' + Number(window.state.summary.totalEstimatedUsd).toLocaleString('en-US', { minimumFractionDigits: 2 });

  const arsTotalEl = document.getElementById('overviewArsTotal');
  const usdTotalEl = document.getElementById('overviewUsdTotal');
  if (arsTotalEl) arsTotalEl.innerText = arsTotal;
  if (usdTotalEl) usdTotalEl.innerText = usdTotal;

  // Tarjetas Principales
  const arsAsset = window.state.balances.find((b) => b.currency === 'ARS');
  const usdtAsset = window.state.balances.find((b) => b.currency === 'USDT');
  const usdcAsset = window.state.balances.find((b) => b.currency === 'USDC');
  const btcAsset = window.state.balances.find((b) => b.currency === 'BTC');
  const ethAsset = window.state.balances.find((b) => b.currency === 'ETH');

  const usdTotalCrypto = ((usdtAsset ? usdtAsset.balance : 0) + (usdcAsset ? usdcAsset.balance : 0));
  const btcUsd = (btcAsset ? btcAsset.estimatedUsd : 0) + (ethAsset ? ethAsset.estimatedUsd : 0);

  const cardArs = document.getElementById('cardBalanceArs');
  const cardUsd = document.getElementById('cardBalanceUsd');
  const cardCrypto = document.getElementById('cardBalanceCrypto');

  if (cardArs) cardArs.innerText = window.state.isBalanceHidden ? mask : '$' + Number(arsAsset ? arsAsset.balance : 0).toLocaleString('es-AR', { minimumFractionDigits: 2 });
  if (cardUsd) cardUsd.innerText = window.state.isBalanceHidden ? mask : '$' + Number(usdTotalCrypto).toLocaleString('en-US', { minimumFractionDigits: 2 });
  if (cardCrypto) cardCrypto.innerText = window.state.isBalanceHidden ? mask : '$' + Number(btcUsd).toLocaleString('en-US', { minimumFractionDigits: 2 });

  renderAssetsList();
}

function renderAssetsList() {
  const container = document.getElementById('assetsListTable');
  if (!container) return;
  container.innerHTML = '';

  const currencyConfig = {
    ARS: { name: 'Pesos Argentinos', icon: 'fa-solid fa-money-bill-wave', color: 'text-emerald-400 bg-emerald-500/10' },
    USDT: { name: 'Tether USD', icon: 'fa-solid fa-t', color: 'text-teal-400 bg-teal-500/10' },
    USDC: { name: 'USD Coin', icon: 'fa-solid fa-dollar-sign', color: 'text-blue-400 bg-blue-500/10' },
    BTC: { name: 'Bitcoin', icon: 'fa-brands fa-bitcoin', color: 'text-amber-400 bg-amber-500/10' },
    ETH: { name: 'Ethereum', icon: 'fa-brands fa-ethereum', color: 'text-purple-400 bg-purple-500/10' },
  };

  window.state.balances.forEach((asset) => {
    const cfg = currencyConfig[asset.currency] || { name: asset.currency, icon: 'fa-solid fa-coins', color: 'text-slate-400 bg-slate-500/10' };
    const card = document.createElement('div');
    card.className = 'hb-card rounded-xl p-3.5 flex items-center justify-between border hover:border-slate-700 transition';

    const displayBalance = window.state.isBalanceHidden ? '••••••' : Number(asset.balance).toLocaleString('es-AR', { maximumFractionDigits: 6 });
    const displayUsd = window.state.isBalanceHidden ? '••••' : '$' + Number(asset.estimatedUsd).toLocaleString('en-US', { minimumFractionDigits: 2 }) + ' USD';

    card.innerHTML = `
      <div class="flex items-center space-x-3">
        <div class="w-9 h-9 rounded-lg ${cfg.color} flex items-center justify-center text-sm">
          <i class="${cfg.icon}"></i>
        </div>
        <div>
          <div class="font-bold text-white text-xs">${cfg.name}</div>
          <div class="text-[10px] text-slate-400 font-mono">${asset.currency}</div>
        </div>
      </div>
      <div class="text-right">
        <div class="font-bold text-white font-mono text-xs">${displayBalance}</div>
        <div class="text-[10px] text-slate-400 font-mono">≈ ${displayUsd}</div>
      </div>
    `;
    container.appendChild(card);
  });
}

async function fetchVirtualAccount() {
  try {
    const res = await apiFetch('/fiat/bank-account');
    const data = await res.json();
    window.state.cvu = data.cvu;
    window.state.alias = data.alias;

    const elAlias = document.getElementById('overviewAliasSmall');
    const boxCvu = document.getElementById('boxCvu');
    const boxAlias = document.getElementById('boxAlias');
    const accFullCvu = document.getElementById('accFullCvu');
    const accFullAlias = document.getElementById('accFullAlias');
    const modalCvu = document.getElementById('modalCvu');
    const modalAlias = document.getElementById('modalAlias');

    if (elAlias) elAlias.innerText = data.alias;
    if (boxCvu) boxCvu.innerText = data.cvu;
    if (boxAlias) boxAlias.innerText = data.alias;
    if (accFullCvu) accFullCvu.innerText = data.cvu;
    if (accFullAlias) accFullAlias.innerText = data.alias;
    if (modalCvu) modalCvu.innerText = data.cvu;
    if (modalAlias) modalAlias.innerText = data.alias;
  } catch (err) {
    console.error('Error al cargar CVU:', err);
  }
}

async function fetchUsAccount() {
  try {
    const res = await apiFetch('/fiat/us-account');
    const data = await res.json();
    window.state.usAccount = data;

    const boxUsRouting = document.getElementById('boxUsRouting');
    const boxUsAccount = document.getElementById('boxUsAccount');
    const accFullUsRouting = document.getElementById('accFullUsRouting');
    const accFullUsAccount = document.getElementById('accFullUsAccount');
    const modalUsRouting = document.getElementById('modalUsRouting');
    const modalUsAccount = document.getElementById('modalUsAccount');
    const modalUsBeneficiary = document.getElementById('modalUsBeneficiary');

    if (boxUsRouting) boxUsRouting.innerText = data.routingNumber;
    if (boxUsAccount) boxUsAccount.innerText = data.accountNumber;
    if (accFullUsRouting) accFullUsRouting.innerText = data.routingNumber;
    if (accFullUsAccount) accFullUsAccount.innerText = data.accountNumber;
    if (modalUsRouting) modalUsRouting.innerText = data.routingNumber;
    if (modalUsAccount) modalUsAccount.innerText = data.accountNumber;
    if (modalUsBeneficiary) modalUsBeneficiary.innerText = data.beneficiaryName;
  } catch (err) {
    console.error('Error al cargar Cuenta USA:', err);
  }
}

async function fetchActivity() {
  try {
    const res = await apiFetch('/wallet/transactions');
    const data = await res.json();
    window.state.transactions = data.transactions;
    renderTransactionsTable();
  } catch (err) {
    console.error('Error al cargar actividad:', err);
  }
}

function filterTransactions(type) {
  window.state.activeFilter = type;
  ['ALL', 'FIAT_DEPOSIT', 'SWAP', 'FIAT_WITHDRAWAL'].forEach((t) => {
    const btn = document.getElementById(`filter-${t}`);
    if (btn) {
      if (t === type) {
        btn.className = 'px-3 py-1 rounded-lg bg-emerald-600 text-white font-medium transition';
      } else {
        btn.className = 'px-3 py-1 rounded-lg text-slate-400 hover:text-white font-medium transition';
      }
    }
  });
  renderTransactionsTable();
}

function renderTransactionsTable() {
  const tbody = document.getElementById('transactionTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  let list = window.state.transactions;
  if (window.state.activeFilter !== 'ALL') {
    list = list.filter((tx) => tx.type === window.state.activeFilter);
  }

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="py-8 text-center text-slate-500 text-xs">No hay movimientos registrados en este período</td></tr>`;
    return;
  }

  list.forEach((tx) => {
    let title = 'Operación Bancaria';
    let badge = 'bg-slate-800 text-slate-300';
    let icon = 'fa-solid fa-arrow-right-arrow-left';

    if (tx.type === 'FIAT_DEPOSIT') {
      title = 'Depósito Bancario (Inbound)';
      badge = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      icon = 'fa-solid fa-arrow-down text-emerald-400';
    } else if (tx.type === 'FIAT_WITHDRAWAL') {
      title = 'Transferencia Saliente a CBU';
      badge = 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
      icon = 'fa-solid fa-arrow-up text-rose-400';
    } else if (tx.type === 'SWAP') {
      title = 'Operación de Cambio (Swap)';
      badge = 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20';
      icon = 'fa-solid fa-repeat text-indigo-400';
    }

    const dateFormatted = new Date(tx.createdAt).toLocaleString('es-AR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

    const row = document.createElement('tr');
    row.className = 'hover:bg-slate-900/50 transition';
    row.innerHTML = `
      <td class="py-3.5 px-4">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-xs">
            <i class="${icon}"></i>
          </div>
          <div>
            <div class="font-bold text-white text-xs">${title}</div>
            <div class="text-[10px] text-slate-400 font-mono">${tx.id.slice(0, 14)}...</div>
          </div>
        </div>
      </td>
      <td class="py-3.5 px-4 font-mono text-[11px] text-slate-300">
        ${tx.externalReference || 'COELSA_SETTLEMENT'}
      </td>
      <td class="py-3.5 px-4 text-slate-400 text-[11px] font-mono">
        ${dateFormatted}
      </td>
      <td class="py-3.5 px-4 font-mono">
        <span class="px-2 py-0.5 rounded text-[10px] font-bold ${badge}">
          ${tx.status}
        </span>
      </td>
      <td class="py-3.5 px-4 text-right">
        <button onclick="openReceiptModal('${tx.id}')" class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-medium border border-slate-700/60 transition inline-flex items-center gap-1.5">
          <i class="fa-solid fa-receipt text-emerald-400"></i>
          <span>Recibo</span>
        </button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function openReceiptModal(txId) {
  const tx = window.state.transactions.find((t) => t.id === txId);
  const modal = document.getElementById('receiptModal');
  if (!modal) return;

  if (tx) {
    let title = 'Operación Bancaria';
    if (tx.type === 'FIAT_DEPOSIT') title = 'Depósito Bancario (Inbound)';
    if (tx.type === 'FIAT_WITHDRAWAL') title = 'Transferencia Saliente (COELSA)';
    if (tx.type === 'SWAP') title = 'Mesa de Cambio Cripto (Swap)';

    document.getElementById('receiptTitle').innerText = title;
    document.getElementById('receiptTxId').innerText = tx.id;
    document.getElementById('receiptDate').innerText = new Date(tx.createdAt).toLocaleString('es-AR');
    document.getElementById('receiptType').innerText = tx.type;
    document.getElementById('receiptStatus').innerText = tx.status;
  }
  modal.classList.remove('hidden');
}

function closeReceiptModal() {
  const modal = document.getElementById('receiptModal');
  if (modal) modal.classList.add('hidden');
}

window.init = init;
window.fetchBalances = fetchBalances;
window.renderBalances = renderBalances;
window.renderAssetsList = renderAssetsList;
window.fetchVirtualAccount = fetchVirtualAccount;
window.fetchUsAccount = fetchUsAccount;
window.fetchActivity = fetchActivity;
window.filterTransactions = filterTransactions;
window.renderTransactionsTable = renderTransactionsTable;
window.openReceiptModal = openReceiptModal;
window.closeReceiptModal = closeReceiptModal;

window.addEventListener('DOMContentLoaded', init);
