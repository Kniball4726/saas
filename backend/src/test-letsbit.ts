import { letsbitClient } from './integrations/letsbit.client.js';

async function runLetsBitIntegrationTest() {
  console.log('====================================================');
  console.log('🇦🇷 TEST DE INTEGRACIÓN: CLIENTE OFICIAL LET\'SBIT B2B');
  console.log('====================================================\n');

  console.log(`[1] Estado del Cliente:`);
  console.log(`    - Entorno activo: ${letsbitClient.getEnvironment()}`);
  console.log(`    - ¿Credenciales reales conectadas?: ${letsbitClient.isLiveConfigured ? 'SÍ (Live API) 🚀' : 'NO (Modo Simulación / Sandbox Fallback) 🧪'}`);

  // Test 1: Crear Cuenta Virtual (CVU COELSA)
  console.log('\n[2] Probando creación de CVU y Alias en COELSA:');
  const account = await letsbitClient.createVirtualAccount({
    userId: 'user-demo-letsbit-001',
    taxId: '20-35894123-9',
    firstName: 'Juan',
    lastName: 'Pérez',
    aliasPreference: 'JUAN.CRYPTO.WALLET',
  });
  console.log('    - CVU generado:', account.cvu);
  console.log('    - Alias generado:', account.alias);
  console.log('    - Proveedor:', account.provider);
  console.log('    - Estado en COELSA:', account.status);

  if (account.cvu.length !== 22 || !account.cvu.startsWith('00000031')) {
    throw new Error('Fallo: Formato de CVU no cumple estándar bancario de 22 dígitos');
  }

  // Test 2: Consultar Tasas de Mercado Mayorista
  console.log('\n[3] Consultando cotizaciones mayoristas en tiempo real (Tickers):');
  const rates = await letsbitClient.getMarketRates();
  Object.keys(rates).forEach((pair) => {
    const r = rates[pair];
    console.log(`    - ${r.pair}: Compra: $${r.bidPrice} | Venta: $${r.askPrice}`);
  });

  // Test 3: Solicitar Cotización OTC (RFQ) con tasa congelada
  console.log('\n[4] Solicitando cotización OTC fija (RFQ) por 100.000 ARS a USDT:');
  const quote = await letsbitClient.requestQuote({
    fromCurrency: 'ARS',
    toCurrency: 'USDT',
    fromAmount: 100000,
  });
  console.log('    - Quote ID:', quote.quoteId);
  console.log(`    - Monto entrada: ${quote.fromAmount} ${quote.fromCurrency}`);
  console.log(`    - Monto salida: ${quote.toAmount} ${quote.toCurrency}`);
  console.log(`    - Tasa congelada: ${quote.exchangeRate} (Válida por ${quote.ttlSeconds}s)`);

  // Test 4: Ejecutar la Orden contra la liquidez mayorista de Let'sBit
  console.log('\n[5] Ejecutando orden de intercambio contra Let\'sBit:');
  const order = await letsbitClient.executeOrder(quote.quoteId);
  console.log('    - Order ID:', order.orderId);
  console.log('    - Estado:', order.status);
  console.log('    - Comisión mayorista aplicada:', order.feeAmount);

  // Test 5: Despachar transferencia bancaria saliente hacia un CBU de terceros
  console.log('\n[6] Despachando transferencia bancaria saliente a CBU argentino (Off-Ramp):');
  const payout = await letsbitClient.sendBankTransfer({
    targetCbuCvu: '0720000188000000123456',
    amount: 35000,
    taxId: '20-35894123-9',
    ownerName: 'Juan Pérez',
  });
  console.log('    - Transfer ID:', payout.transferId);
  console.log('    - Tracking COELSA:', payout.coelsaTrackingId);
  console.log('    - Estado del despacho:', payout.status);

  console.log('\n====================================================');
  console.log('🎉 CLIENTE DE LET\'SBIT VALIDADO Y LISTO PARA PRODUCCIÓN');
  console.log('====================================================');
}

runLetsBitIntegrationTest().catch((err) => {
  console.error('\n❌ ERROR EN EL TEST DE LET\'SBIT:', err);
  process.exit(1);
});
