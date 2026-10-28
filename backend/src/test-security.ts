import { generateWebhookSignature, verifyWebhookSignature } from './middlewares/webhook-signature.middleware.js';
import { swapService } from './services/swap.service.js';
import { quoteService } from './services/quote.service.js';
import { reconciliationService } from './services/reconciliation.service.js';
import { db } from './services/store.service.js';

function mockExpressReqRes(headers: Record<string, string>, body: any) {
  let statusCode = 200;
  let jsonResponse: any = null;
  let nextCalled = false;

  const req: any = { headers, body };
  const res: any = {
    status(code: number) {
      statusCode = code;
      return res;
    },
    json(data: any) {
      jsonResponse = data;
      return res;
    },
  };
  const next = () => {
    nextCalled = true;
  };

  return {
    req,
    res,
    next,
    execute: () => {
      verifyWebhookSignature(req, res, next);
      return { statusCode, jsonResponse, nextCalled };
    },
  };
}

async function runSecurityTestSuite() {
  console.log('====================================================');
  console.log('🛡️  INICIANDO SUITE DE PRUEBAS DE SEGURIDAD Y BLINDAJE');
  console.log('====================================================\n');

  // --------------------------------------------------------------------
  // TEST 1: Seguridad de Webhooks con Firma HMAC SHA-256
  // --------------------------------------------------------------------
  console.log('[TEST 1] Verificación de Firmas Criptográficas HMAC en Webhooks:');

  const webhookPayload = {
    cvu: '0000003100012345678901',
    amount: 50000,
    originBank: 'Banco Santander',
    originOwner: 'Carlos Gardel',
    originCuit: '20-11223344-5',
  };

  // 1a. Petición SIN firma (debe fallar 401 MISSING_SIGNATURE)
  const mock1a = mockExpressReqRes({}, webhookPayload);
  const result1a = mock1a.execute();
  console.log(`   1a. Webhook sin cabecera X-Signature -> Código: ${result1a.statusCode} (Esperado: 401)`);
  if (result1a.statusCode !== 401 || result1a.nextCalled) throw new Error('Fallo: Webhook sin firma fue aceptado');

  // 1b. Petición con firma falsa/manipulada (debe fallar 401 SIGNATURE_MISMATCH)
  const fakeSig = `t=${Math.floor(Date.now() / 1000)},v1=0000000000000000000000000000000000000000000000000000000000000000`;
  const mock1b = mockExpressReqRes({ 'x-signature': fakeSig }, webhookPayload);
  const result1b = mock1b.execute();
  console.log(`   1b. Webhook con firma HMAC adulterada -> Código: ${result1b.statusCode} (Esperado: 401)`);
  if (result1b.statusCode !== 401 || result1b.nextCalled) throw new Error('Fallo: Webhook con firma falsa fue aceptado');

  // 1c. Petición con timestamp expirado (Ataque de repetición / Replay Attack)
  const oldTimestamp = Math.floor(Date.now() / 1000) - 600; // 10 minutos atrás
  const expiredSig = generateWebhookSignature(webhookPayload);
  const forgedExpiredHeader = `t=${oldTimestamp},v1=${expiredSig.split('v1=')[1]}`;
  const mock1c = mockExpressReqRes({ 'x-signature': forgedExpiredHeader }, webhookPayload);
  const result1c = mock1c.execute();
  console.log(`   1c. Ataque de repetición (timestamp expirado) -> Código: ${result1c.statusCode} (Esperado: 401)`);
  if (result1c.statusCode !== 401 || result1c.nextCalled) throw new Error('Fallo: Ataque de repetición fue aceptado');

  // 1d. Petición con firma HMAC legítima
  const validSignature = generateWebhookSignature(webhookPayload);
  const mock1d = mockExpressReqRes({ 'x-signature': validSignature }, webhookPayload);
  const result1d = mock1d.execute();
  console.log(`   1d. Webhook con firma HMAC legítima -> Código: ${result1d.statusCode}, Siguiente: ${result1d.nextCalled} (Esperado: 200 / Next)`);
  if (!result1d.nextCalled) throw new Error(`Fallo: Webhook legítimo rechazado: ${JSON.stringify(result1d.jsonResponse)}`);

  console.log('   ✅ Todas las pruebas de firma HMAC superadas con éxito.\n');

  // --------------------------------------------------------------------
  // TEST 2: Prueba de Concurrencia y Doble Gasto (Race Conditions)
  // --------------------------------------------------------------------
  console.log('[TEST 2] Prueba de Concurrencia y Prevención de Doble Gasto (Race Conditions):');

  const testUserId = 'test-concurrent-user-999';
  db.users.set(testUserId, {
    id: testUserId,
    email: 'race@test.com',
    passwordHash: 'hash',
    firstName: 'Test',
    lastName: 'Race',
    cuitDni: '20-99999999-9',
    kycStatus: 'VERIFIED',
    createdAt: new Date(),
  });

  // Saldo exacto: 100 USDT
  const accountKey = `${testUserId}:USDT`;
  db.accounts.set(accountKey, {
    id: `acc-${testUserId}-USDT`,
    userId: testUserId,
    currency: 'USDT',
    balance: 100,
  });
  // Cuenta ARS receptora vacía
  db.accounts.set(`${testUserId}:ARS`, {
    id: `acc-${testUserId}-ARS`,
    userId: testUserId,
    currency: 'ARS',
    balance: 0,
  });

  console.log(`   Saldo inicial del usuario: ${db.getAccount(testUserId, 'USDT').balance} USDT`);
  console.log('   Simulando envío de 5 swaps simultáneos de 100 USDT en el mismo instante...');

  // Generar una cotización por los 100 USDT
  const quote = quoteService.createQuote(testUserId, 'USDT', 'ARS', 100);

  // Disparar 5 peticiones simultáneas de ejecución concurrentes
  const concurrentExecutions = await Promise.allSettled([
    swapService.executeSwap(testUserId, quote.quoteId),
    swapService.executeSwap(testUserId, quote.quoteId),
    swapService.executeSwap(testUserId, quote.quoteId),
    swapService.executeSwap(testUserId, quote.quoteId),
    swapService.executeSwap(testUserId, quote.quoteId),
  ]);

  let successCount = 0;
  let rejectedCount = 0;

  concurrentExecutions.forEach((res, idx) => {
    if (res.status === 'fulfilled') {
      successCount++;
      console.log(`   - Petición ${idx + 1}: ÉXITO (Swap ejecutado)`);
    } else {
      rejectedCount++;
      console.log(`   - Petición ${idx + 1}: RECHAZADA (${res.reason.message})`);
    }
  });

  const finalBalanceUsdt = db.getAccount(testUserId, 'USDT').balance;
  console.log(`   Saldo final resultante en USDT: ${finalBalanceUsdt} (Esperado: 0)`);
  console.log(`   Éxitos: ${successCount} | Rechazados: ${rejectedCount}`);

  if (successCount !== 1 || finalBalanceUsdt < 0) {
    throw new Error(`CRÍTICO: Vulnerabilidad de doble gasto detectada! Éxitos: ${successCount}, Saldo: ${finalBalanceUsdt}`);
  }

  console.log('   ✅ Protección contra doble gasto y colisiones verificada con éxito.\n');

  // --------------------------------------------------------------------
  // TEST 3: Auditoría y Reconciliación Contable (Nightly Reconciliation Job)
  // --------------------------------------------------------------------
  console.log('[TEST 3] Ejecución del Robot de Reconciliación Contable:');
  const audit = reconciliationService.runAudit();
  console.log(`   Estado contable del sistema: ${audit.isHealthy ? 'SANO Y BALANCEADO ✅' : 'DESBALANCE DETECTADO ❌'}`);
  console.log(`   Cuentas auditadas: ${audit.totalAccountsAudited}`);
  console.log(`   Movimientos de libro mayor auditados: ${audit.totalLedgerEntriesAudited}`);
  console.log(`   Transacciones auditadas: ${audit.totalTransactionsAudited}`);
  console.log(`   Discrepancias contables encontradas: ${audit.discrepancies.length}`);
  console.log(`   Violaciones de saldo negativo: ${audit.negativeBalanceViolations.length}`);

  if (!audit.isHealthy) {
    throw new Error(`Fallo en reconciliación contable: ${JSON.stringify(audit.discrepancies)}`);
  }

  console.log('\n====================================================');
  console.log('🎉 TODAS LAS PRUEBAS DE SEGURIDAD PASARON EXITOSAMENTE');
  console.log('====================================================');
}

runSecurityTestSuite().catch((err) => {
  console.error('\n❌ ERROR EN LA SUITE DE SEGURIDAD:', err);
  process.exit(1);
});
