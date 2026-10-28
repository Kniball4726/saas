import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { swapService } from '../services/swap.service.js';

export class SwapController {
  public static async execute(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const { quoteId } = req.body;

      if (!quoteId) {
        return res.status(400).json({ error: 'El campo quoteId es obligatorio' });
      }

      const result = await swapService.executeSwap(userId, quoteId);
      return res.json(result);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }
}
