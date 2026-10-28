import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { verifyWebhookSignature } from '../middlewares/webhook-signature.middleware.js';
import { WalletController } from '../controllers/wallet.controller.js';
import { QuoteController } from '../controllers/quote.controller.js';
import { SwapController } from '../controllers/swap.controller.js';
import { FiatController } from '../controllers/fiat.controller.js';
import { reconciliationService } from '../services/reconciliation.service.js';

const router = Router();

// 1. Wallets y Balances
router.get('/wallet/balances', authMiddleware, WalletController.getBalances);
router.get('/wallet/transactions', authMiddleware, WalletController.getTransactions);

// 2. Cotizaciones y Tasas en tiempo real
router.get('/quotes/rates', QuoteController.getMarketRates);
router.post('/quotes', authMiddleware, QuoteController.createQuote);

// 3. Motor de Swapping
router.post('/swaps/execute', authMiddleware, SwapController.execute);

// 4. Rampa Fiat Argentina (CBU / CVU)
router.get('/fiat/bank-account', authMiddleware, FiatController.getVirtualAccount);
router.post('/fiat/webhook/deposit', verifyWebhookSignature, FiatController.handleDepositWebhook);
router.post('/fiat/withdraw', authMiddleware, FiatController.withdraw);

// 5. Rampa Fiat Estados Unidos (USD ACH / Wire)
router.get('/fiat/us-account', authMiddleware, FiatController.getUsAccount);
router.post('/fiat/webhook/us-ach', verifyWebhookSignature, FiatController.handleUsAchWebhook);

// 6. Auditoría y Reconciliación Contable (Solo administradores / Cron jobs)
router.get('/admin/reconcile', (req, res) => {
  const auditReport = reconciliationService.runAudit();
  res.json(auditReport);
});

export default router;
