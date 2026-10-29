/**
 * VeloxPay - Centralized Application State Store
 */
window.state = {
  token: localStorage.getItem('veloxpay_token') || '',
  user: null,
  balances: [],
  summary: null,
  cvu: '',
  alias: '',
  usAccount: null,
  rates: {},
  marketQuotes: [],
  transactions: [],
  activeFilter: 'ALL',
  activeQuote: null,
  quoteTimerInterval: null,
  isBalanceHidden: false,
};
