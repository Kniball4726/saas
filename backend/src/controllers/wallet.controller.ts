import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { db } from '../services/store.service.js';
import { ledgerService } from '../services/ledger.service.js';
import { pricingService } from '../services/pricing.service.js';

export class WalletController {
  public static getBalances(req: AuthenticatedRequest, res: Response) {
    const userId = req.user!.userId;
    const accounts = db.getAccountsByUser(userId);
    const marketRates = pricingService.getMarketSnapshot();

    // Calcular el valor total estimado en USD y en ARS
    let totalEstimatedUsd = 0;
    const balancesFormatted = accounts.map((acc) => {
      const rateToUsd = marketRates[acc.currency] || 0;
      const usdValue = acc.balance * rateToUsd;
      totalEstimatedUsd += usdValue;

      return {
        currency: acc.currency,
        balance: acc.balance,
        estimatedUsd: Number(usdValue.toFixed(2)),
      };
    });

    const arsRate = 1 / marketRates['ARS'];
    const totalEstimatedArs = totalEstimatedUsd * arsRate;

    return res.json({
      userId,
      balances: balancesFormatted,
      summary: {
        totalEstimatedUsd: Number(totalEstimatedUsd.toFixed(2)),
        totalEstimatedArs: Number(totalEstimatedArs.toFixed(2)),
      },
    });
  }

  public static getTransactions(req: AuthenticatedRequest, res: Response) {
    const userId = req.user!.userId;
    const transactions = ledgerService.getUserTransactions(userId);
    return res.json({ transactions });
  }
}
