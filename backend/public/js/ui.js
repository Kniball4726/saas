/**
 * VeloxPay - UI Notifications & Navigation Tools
 */

function showToast(title, msg, type = 'success') {
  const toast = document.getElementById('toast');
  const icon = document.getElementById('toastIcon');
  if (!toast || !icon) return;

  document.getElementById('toastTitle').innerText = title;
  document.getElementById('toastMessage').innerText = msg;

  if (type === 'success') {
    icon.className = 'text-emerald-400';
    icon.innerHTML = '<i class="fa-solid fa-circle-check text-xl"></i>';
  } else if (type === 'warning') {
    icon.className = 'text-amber-400';
    icon.innerHTML = '<i class="fa-solid fa-triangle-exclamation text-xl"></i>';
  } else if (type === 'info') {
    icon.className = 'text-blue-400';
    icon.innerHTML = '<i class="fa-solid fa-circle-info text-xl"></i>';
  } else {
    icon.className = 'text-rose-400';
    icon.innerHTML = '<i class="fa-solid fa-circle-xmark text-xl"></i>';
  }

  toast.classList.remove('translate-y-32');
  setTimeout(() => toast.classList.add('translate-y-32'), 3500);
}

function switchView(viewName) {
  const views = ['overview', 'markets', 'swap', 'accounts', 'transactions'];
  views.forEach((v) => {
    const el = document.getElementById(`view-${v}`);
    if (el) el.classList.add('hidden');

    const nav = document.getElementById(`nav-${v}`);
    if (nav) {
      nav.classList.remove('text-emerald-400', 'bg-emerald-500/10');
      nav.classList.add('text-slate-400');
    }
  });

  const activeView = document.getElementById(`view-${viewName}`);
  if (activeView) activeView.classList.remove('hidden');

  const activeNav = document.getElementById(`nav-${viewName}`);
  if (activeNav) {
    activeNav.classList.add('text-emerald-400', 'bg-emerald-500/10');
    activeNav.classList.remove('text-slate-400');
  }
}

function copyCvu() {
  navigator.clipboard.writeText(`CVU: ${window.state.cvu} | Alias: ${window.state.alias}`);
  showToast('Copiado', 'Datos bancarios ARS copiados al portapapeles', 'success');
}

function copyUsAccount() {
  if (!window.state.usAccount) return;
  const text = `Routing Number: ${window.state.usAccount.routingNumber}\nAccount Number: ${window.state.usAccount.accountNumber}\nBank: ${window.state.usAccount.bankName}\nBeneficiary: ${window.state.usAccount.beneficiaryName}`;
  navigator.clipboard.writeText(text);
  showToast('Copiado', 'Datos bancarios de EE.UU. copiados', 'success');
}

window.showToast = showToast;
window.switchView = switchView;
window.copyCvu = copyCvu;
window.copyUsAccount = copyUsAccount;
