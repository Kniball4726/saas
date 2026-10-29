import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/google', AuthController.loginWithGoogle);
router.post('/apple', AuthController.loginWithApple);
router.get('/me', authMiddleware, AuthController.getProfile);
router.post('/verify-pin', authMiddleware, AuthController.verifyPin);

export default router;
