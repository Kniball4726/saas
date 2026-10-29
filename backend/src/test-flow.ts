import { pricingService } from './services/pricing.service.js';
import { quoteService } from './services/quote.service.js';
import { swapService } from './services/swap.service.js';
import { fiatService } from './services/fiat.service.js';
import { ledgerService } from './services/ledger.service.js';
import { db } from './services/store.service.js';

async function runVerification() {
  console.log('--- INICIANDO VERIFICACIÓN DE MOTOR DE SWAPPING Y FIAT ---');

  const userId = 'demo-user-123';

  // 1. Verificar saldos iniciales del usuario demo
  console.log('\n[1] Consultando saldos iniciales:');
  const initialAccounts = db.getAccountsByUser(userId);
  initialAccounts.forEach((acc) => console.log(`   - ${acc.currency}: ${acc.balance}`));

  // 2. Simular depósito bancario vía transferencia CBU/CVU (Webhook)
  console.log('\n[2] Simulando transferencia bancaria entrante de $100.000 ARS:');
  const userVirtualAccount = await fiatService.getUserVirtualAccount(userId);
  console.log(`   CVU de destino: ${userVirtualAccount.cvu} (Alias: ${userVirtualAccount.alias})`);

  const depositResult = fiatService.processDepositWebhook({
    eventId: 'coelsa_transfer_evt_998811',
    cvu: userVirtualAccount.cvu,
    amount: 100000,
    originBank: 'Banco Galicia',
    originOwner: 'Carlos Gardel',
    originCuit: '20-11223344-5',
    timestamp: new Date().toISOString(),
  });
  console.log('   Resultado del depósito:', depositResult);

  // 2b. Probar idempotencia (reintento del mismo webhook con el mismo eventId)
  console.log('\n[2b] Probando idempotencia con webhook duplicado:');
  const duplicateResult = fiatService.processDepositWebhook({
    eventId: 'coelsa_transfer_evt_998811',
    cvu: userVirtualAccount.cvu,
    amount: 100000,
    originBank: 'Banco Galicia',
    originOwner: 'Carlos Gardel',
    originCuit: '20-11223344-5',
    timestamp: new Date().toISOString(),
  });
  console.log('   Resultado duplicado (debe ser ignorado):', duplicateResult);

  // 3. Solicitar cotización de Swap (ARS -> USDT)
  console.log('\n[3] Solicitando cotización para swapear 50.000 ARS a USDT:');
  const quote = quoteService.createQuote(userId, 'ARS', 'USDT', 50000);
  console.log(`   Cotización ID: ${quote.quoteId}`);
  console.log(`   Entrada: ${quote.fromAmount} ${quote.fromCurrency}`);
  console.log(`   Salida esperada: ${quote.toAmount} ${quote.toCurrency}`);
  console.log(`   Tasa efectiva: ${quote.rate} (Válida por ${quote.expiresInSeconds}s)`);

  // 4. Ejecutar el Swap
  console.log('\n[4] Ejecutando Swap atómico:');
  const swapResult = await swapService.executeSwap(userId, quote.quoteId);
  console.log('   Swap completado con éxito!');
  console.log('   Transacción ID:', swapResult.transactionId);
  console.log('   Nuevos saldos:', swapResult.updatedBalances);

  // 5. Intentar ejecutar el mismo quote de nuevo (debe fallar)
  console.log('\n[5] Intentando re-ejecutar la misma cotización (debe ser rechazada):');
  try {
    await swapService.executeSwap(userId, quote.quoteId);
    console.error('   ERROR: Debería haber fallado');
  } catch (err: any) {
    console.log('   Correctamente rechazado:', err.message);
  }

  // 6. Probar retiro bancario (Off-ramp) a CBU argentino
  console.log('\n[6] Solicitando retiro de $20.000 ARS a cuenta bancaria:');
  const withdrawResult = await fiatService.requestWithdrawal(userId, {
    amount: 20000,
    targetCbuCvu: '0720000188000000123456',
    targetAlias: 'MI.CUENTA.BANCO',
    ownerName: 'Juan Pérez',
    ownerCuit: '20-35894123-9',
  });
  console.log('   Retiro enviado al circuito COELSA:', withdrawResult);

  // 7. Simular depósito internacional desde EE.UU. (ACH)
  console.log('\n[7] Probando Rampa Bancaria de EE.UU. (Transferencia ACH en USD):');
  const usAccount = fiatService.getUserUsAccount(userId);
  console.log(`   Cuenta USA asignada: Routing ${usAccount.routingNumber} | Account ${usAccount.accountNumber}`);
  console.log(`   Banco emisor en USA: ${usAccount.bankName}`);

  const usAchResult = fiatService.processUsAchDeposit({
    eventId: 'ach_us_transfer_evt_112233',
    accountNumber: usAccount.accountNumber,
    amountUsd: 1500,
    originSender: 'Upwork Global Inc (Client Payment)',
    originBank: 'Silicon Valley Bank',
    transferType: 'ACH',
  });
  console.log('   Resultado del depósito ACH en USD:', usAchResult);

  // 8. Inspeccionar libro contable (Ledger)
  console.log('\n[8] Historial de transacciones contables del usuario:');
  const history = ledgerService.getUserTransactions(userId);
  history.forEach((tx, i) => {
    console.log(`   ${i + 1}. Tipo: ${tx.type} | Estado: ${tx.status} | Fecha: ${tx.createdAt.toISOString()}`);
  });

  console.log('\n--- VERIFICACIÓN COMPLETADA CON ÉXITO ---');
}

runVerification().catch(console.error);
