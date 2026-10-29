/**
 * VeloxPay - Fiat Rails (ARS CVU & USD ACH) and Step-Up PIN Withdrawals
 */

let pendingWithdrawalData = null;

function openDepositModal() {
  const modal = document.getElementById('depositModal');
  if (modal) modal.classList.remove('hidden');
}

function closeDepositModal() {
  const modal = document.getElementById('depositModal');
  if (modal) modal.classList.add('hidden');
}

function openUsAccountModal() {
  const modal = document.getElementById('usAccountModal');
  if (modal) modal.classList.remove('hidden');
}

function closeUsAccountModal() {
  const modal = document.getElementById('usAccountModal');
  if (modal) modal.classList.add('hidden');
}

function openWithdrawModal() {
  const modal = document.getElementById('withdrawModal');
  if (modal) modal.classList.remove('hidden');
}

function closeWithdrawModal() {
  const modal = document.getElementById('withdrawModal');
  if (modal) modal.classList.add('hidden');
}

function promptWithdrawPin() {
  const amount = parseFloat(document.getElementById('withdrawAmount').value);
  const targetCbuCvu = document.getElementById('withdrawDestination').value;
  const ownerName = document.getElementById('withdrawOwner').value;
  const ownerCuit = document.getElementById('withdrawCuit').value;

  if (!amount || !targetCbuCvu) {
    showToast('Atención', 'Ingresa el monto y CBU/CVU destino', 'warning');
    return;
  }

  pendingWithdrawalData = { amount, targetCbuCvu, ownerName, ownerCuit };
  const pinInput = document.getElementById('stepUpPinInput');
  if (pinInput) pinInput.value = '';
  
  const pinModal = document.getElementById('pinModal');
  if (pinModal) pinModal.classList.remove('hidden');
  setTimeout(() => pinInput && pinInput.focus(), 150);
}

function closePinModal() {
  const pinModal = document.getElementById('pinModal');
  if (pinModal) pinModal.classList.add('hidden');
  pendingWithdrawalData = null;
}

async function confirmWithdrawWithPin() {
  const pin = document.getElementById('stepUpPinInput').value.trim();
  if (!pin || pin.length < 4) {
    showToast('Atención', 'Ingresa tu PIN de 6 dígitos', 'warning');
    return;
  }

  if (!pendingWithdrawalData) return;

  try {
    const res = await apiFetch('/fiat/withdraw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...pendingWithdrawalData,
        pin,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    closePinModal();
    closeWithdrawModal();
    showToast('Transferencia Emitida', `Se transfirieron $${pendingWithdrawalData.amount.toLocaleString('es-AR')} ARS vía COELSA`, 'success');
    
    if (typeof fetchBalances === 'function') await fetchBalances();
    if (typeof fetchActivity === 'function') await fetchActivity();
  } catch (err) {
    showToast('Error de Autorización', err.message, 'error');
  }
}

async function simulateBankTransfer() {
  const amount = parseFloat(document.getElementById('depositSimAmount').value);
  const originBank = document.getElementById('depositSimBank').value;

  try {
    const res = await fetch('/api/fiat/webhook/deposit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-demo-simulation': 'true',
      },
      body: JSON.stringify({
        cvu: window.state.cvu,
        amount,
        originBank,
        originOwner: 'Carlos Gómez',
        originCuit: '20-33445566-7',
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    closeDepositModal();
    showToast('Acreditación Inmediata', `Se acreditaron $${amount.toLocaleString('es-AR')} ARS desde ${originBank}`, 'success');
    
    if (typeof fetchBalances === 'function') await fetchBalances();
    if (typeof fetchActivity === 'function') await fetchActivity();
  } catch (err) {
    showToast('Error', err.message, 'error');
  }
}

async function simulateUsAchTransfer() {
  const amountUsd = parseFloat(document.getElementById('usSimAmount').value);
  const originSender = document.getElementById('usSimSender').value;

  if (!window.state.usAccount) return;

  try {
    const res = await fetch('/api/fiat/webhook/us-ach', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-demo-simulation': 'true',
      },
      body: JSON.stringify({
        accountNumber: window.state.usAccount.accountNumber,
        amountUsd,
        originSender,
        originBank: 'US Federal Reserve ACH Network',
        transferType: 'ACH',
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    closeUsAccountModal();
    showToast('Acreditación ACH Exitosa', `Recibiste $${data.creditedUsdc} USDC desde ${originSender}`, 'success');
    
    if (typeof fetchBalances === 'function') await fetchBalances();
    if (typeof fetchActivity === 'function') await fetchActivity();
  } catch (err) {
    showToast('Error', err.message, 'error');
  }
}

window.openDepositModal = openDepositModal;
window.closeDepositModal = closeDepositModal;
window.openUsAccountModal = openUsAccountModal;
window.closeUsAccountModal = closeUsAccountModal;
window.openWithdrawModal = openWithdrawModal;
window.closeWithdrawModal = closeWithdrawModal;
window.promptWithdrawPin = promptWithdrawPin;
window.closePinModal = closePinModal;
window.confirmWithdrawWithPin = confirmWithdrawWithPin;
window.simulateBankTransfer = simulateBankTransfer;
window.simulateUsAchTransfer = simulateUsAchTransfer;
