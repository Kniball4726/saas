import { createApp } from './app.js';
import { config } from './config/env.js';

const app = createApp();

app.listen(config.port, '0.0.0.0', () => {
  console.log(`🚀 Servidor Backend iniciado en puerto ${config.port} (0.0.0.0)`);
  console.log(`🌐 Acceso local: http://localhost:${config.port}`);
  console.log(`📊 Endpoints listos:`);
  console.log(`   - GET  /api/wallet/balances`);
  console.log(`   - GET  /api/quotes/rates`);
  console.log(`   - POST /api/quotes`);
  console.log(`   - POST /api/swaps/execute`);
  console.log(`   - GET  /api/fiat/bank-account`);
  console.log(`   - POST /api/fiat/webhook/deposit`);
  console.log(`   - POST /api/fiat/withdraw`);
});
