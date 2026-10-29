import { Router } from 'express';
import { FiatController } from '../controllers/fiat.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { verifyWebhookSignature } from '../middlewares/webhook-signature.middleware.js';

const router = Router();

// Rampa Fiat ARS (COELSA)
router.get('/bank-account', authMiddleware, FiatController.getVirtualAccount);
router.post('/webhook/deposit', verifyWebhookSignature, FiatController.handleDepositWebhook);
router.post('/withdraw', authMiddleware, FiatController.withdraw);

// Rampa Fiat USA (USD ACH / Wire)
router.get('/us-account', authMiddleware, FiatController.getUsAccount);
router.post('/webhook/us-ach', verifyWebhookSignature, FiatController.handleUsAchWebhook);

export default router;
