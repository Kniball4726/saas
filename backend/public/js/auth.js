/**
 * VeloxPay - Authentication & Identity Management
 */

function toggleUserDropdown() {
  const dropdown = document.getElementById('userDropdown');
  if (dropdown) dropdown.classList.toggle('hidden');
}

window.addEventListener('click', (e) => {
  const dropdown = document.getElementById('userDropdown');
  const avatarBtn = document.getElementById('userAvatar');
  if (dropdown && !dropdown.contains(e.target) && avatarBtn && !avatarBtn.contains(e.target)) {
    dropdown.classList.add('hidden');
  }
});

function openAuthModal(tab = 'login') {
  const dropdown = document.getElementById('userDropdown');
  if (dropdown) dropdown.classList.add('hidden');
  switchAuthTab(tab);
  const modal = document.getElementById('authModal');
  if (modal) modal.classList.remove('hidden');
}

function closeAuthModal() {
  const modal = document.getElementById('authModal');
  if (modal) modal.classList.add('hidden');
}

function switchAuthTab(tab) {
  const btnLogin = document.getElementById('authTabLogin');
  const btnReg = document.getElementById('authTabRegister');
  const formLogin = document.getElementById('formLogin');
  const formRegister = document.getElementById('formRegister');

  if (tab === 'login') {
    if (btnLogin) btnLogin.className = 'flex-1 py-2 rounded-lg bg-emerald-600 text-white transition';
    if (btnReg) btnReg.className = 'flex-1 py-2 rounded-lg text-slate-400 hover:text-white transition';
    if (formLogin) formLogin.classList.remove('hidden');
    if (formRegister) formRegister.classList.add('hidden');
  } else {
    if (btnReg) btnReg.className = 'flex-1 py-2 rounded-lg bg-emerald-600 text-white transition';
    if (btnLogin) btnLogin.className = 'flex-1 py-2 rounded-lg text-slate-400 hover:text-white transition';
    if (formLogin) formLogin.classList.add('hidden');
    if (formRegister) formRegister.classList.remove('hidden');
  }
}

function applyUserSession(user, token) {
  window.state.user = user;
  window.state.token = token;
  localStorage.setItem('veloxpay_token', token);

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

  closeAuthModal();
  showToast('Bienvenido', `Sesión iniciada como ${user.firstName} ${user.lastName}`, 'success');

  if (typeof init === 'function') {
    init();
  }
}

async function handleLoginSubmit(event) {
  event.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  try {
    const res = await apiFetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    applyUserSession(data.user, data.tokens.accessToken);
  } catch (err) {
    showToast('Error de Ingreso', err.message, 'error');
  }
}

async function handleRegisterSubmit(event) {
  event.preventDefault();
  const firstName = document.getElementById('regFirstName').value.trim();
  const lastName = document.getElementById('regLastName').value.trim();
  const cuitDni = document.getElementById('regCuit').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  const pin = document.getElementById('regPin').value.trim();

  try {
    const res = await apiFetch('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName, lastName, cuitDni, email, password, pin }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    applyUserSession(data.user, data.tokens.accessToken);
    showToast('Cuenta Creada', `Se generó tu CVU y cuenta en EE.UU. con éxito`, 'success');
  } catch (err) {
    showToast('Error de Registro', err.message, 'error');
  }
}

async function loginWithGoogleDemo() {
  try {
    const res = await apiFetch('/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idToken: 'mock-google-id-token',
        email: 'usuario.google@gmail.com',
        name: 'Lucas González (Google)',
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    applyUserSession(data.user, data.tokens.accessToken);
  } catch (err) {
    showToast('Error con Google', err.message, 'error');
  }
}

async function loginWithAppleDemo() {
  try {
    const res = await apiFetch('/auth/apple', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identityToken: 'mock-apple-id-token',
        email: 'mariana.lopez@privaterelay.appleid.com',
        fullName: { firstName: 'Mariana', lastName: 'López (Apple)' },
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    applyUserSession(data.user, data.tokens.accessToken);
  } catch (err) {
    showToast('Error con Apple', err.message, 'error');
  }
}

function logout() {
  localStorage.removeItem('veloxpay_token');
  window.state.token = '';
  window.state.user = null;

  const dropdown = document.getElementById('userDropdown');
  if (dropdown) dropdown.classList.add('hidden');

  document.getElementById('userAvatar').innerText = 'JP';
  document.getElementById('userName').innerText = 'Juan Pérez';
  document.getElementById('userCuit').innerText = 'CUIT: 20-35894123-9';
  document.getElementById('menuFullName').innerText = 'Juan Pérez';
  document.getElementById('menuEmail').innerText = 'demo@wallet.ar';
  document.getElementById('menuProviderBadge').innerHTML = '<i class="fa-solid fa-shield-halved text-[9px] text-emerald-400 mr-1"></i> Velox ID';

  showToast('Sesión Cerrada', 'Has cerrado sesión correctamente', 'info');
  if (typeof init === 'function') {
    init();
  }
}

window.toggleUserDropdown = toggleUserDropdown;
window.openAuthModal = openAuthModal;
window.closeAuthModal = closeAuthModal;
window.switchAuthTab = switchAuthTab;
window.applyUserSession = applyUserSession;
window.handleLoginSubmit = handleLoginSubmit;
window.handleRegisterSubmit = handleRegisterSubmit;
window.loginWithGoogleDemo = loginWithGoogleDemo;
window.loginWithAppleDemo = loginWithAppleDemo;
window.logout = logout;
