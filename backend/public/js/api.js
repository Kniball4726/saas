/**
 * VeloxPay - Centralized API HTTP Client
 */
const API_BASE = '/api';

/**
 * Cliente HTTP universal que inyecta automáticamente el token JWT Bearer si existe sesión activa
 */
function apiFetch(endpoint, options = {}) {
  options.headers = options.headers || {};
  
  if (window.state.token) {
    options.headers['Authorization'] = `Bearer ${window.state.token}`;
  }

  const url = endpoint.startsWith('http') || endpoint.startsWith('/api') 
    ? endpoint 
    : `${API_BASE}${endpoint}`;

  return fetch(url, options);
}

window.API_BASE = API_BASE;
window.apiFetch = apiFetch;
