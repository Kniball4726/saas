import { Router } from 'express';
import { WalletController } from '../controllers/wallet.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/balances', authMiddleware, WalletController.getBalances);
router.get('/transactions', authMiddleware, WalletController.getTransactions);

export default router;
