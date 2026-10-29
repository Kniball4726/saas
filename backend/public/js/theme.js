/**
 * VeloxPay - Theme (Dark/Light) & Privacy Control
 */

function initTheme() {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'light') {
    setTheme('light');
  } else {
    setTheme('dark');
  }
}

function toggleTheme() {
  const isDark = document.documentElement.classList.contains('dark');
  setTheme(isDark ? 'light' : 'dark');
}

function setTheme(theme) {
  const root = document.documentElement;
  const icon = document.getElementById('themeIcon');
  const btn = document.getElementById('themeToggleBtn');

  if (theme === 'light') {
    root.classList.remove('dark');
    root.classList.add('light');
    if (icon) icon.className = 'fa-solid fa-sun text-amber-500 text-sm';
    if (btn) btn.title = 'Cambiar a modo oscuro';
    localStorage.setItem('theme', 'light');
  } else {
    root.classList.remove('light');
    root.classList.add('dark');
    if (icon) icon.className = 'fa-solid fa-moon text-indigo-400 text-sm';
    if (btn) btn.title = 'Cambiar a modo claro';
    localStorage.setItem('theme', 'dark');
  }
}

function toggleBalancePrivacy() {
  window.state.isBalanceHidden = !window.state.isBalanceHidden;
  const icon = document.getElementById('privacyIcon');
  if (window.state.isBalanceHidden) {
    if (icon) icon.className = 'fa-solid fa-eye-slash text-sm';
  } else {
    if (icon) icon.className = 'fa-solid fa-eye text-sm';
  }
  if (typeof renderBalances === 'function') {
    renderBalances();
  }
}

window.initTheme = initTheme;
window.toggleTheme = toggleTheme;
window.setTheme = setTheme;
window.toggleBalancePrivacy = toggleBalancePrivacy;
