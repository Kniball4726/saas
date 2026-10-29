import { Router } from 'express';
import authRoutes from './auth.routes.js';
import walletRoutes from './wallet.routes.js';
import quoteRoutes from './quote.routes.js';
import swapRoutes from './swap.routes.js';
import fiatRoutes from './fiat.routes.js';
import adminRoutes from './admin.routes.js';

const router = Router();

// Módulos de Rutas de la API VeloxPay
router.use('/auth', authRoutes);
router.use('/wallet', walletRoutes);
router.use('/quotes', quoteRoutes);
router.use('/swaps', swapRoutes);
router.use('/fiat', fiatRoutes);
router.use('/admin', adminRoutes);

export default router;
