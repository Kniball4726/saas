import { Router } from 'express';
import { QuoteController } from '../controllers/quote.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/rates', QuoteController.getMarketRates);
router.post('/', authMiddleware, QuoteController.createQuote);

export default router;
