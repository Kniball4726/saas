import { Router } from 'express';
import { SwapController } from '../controllers/swap.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/execute', authMiddleware, SwapController.execute);

export default router;
