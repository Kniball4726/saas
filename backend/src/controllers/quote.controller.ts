import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { quoteService } from '../services/quote.service.js';
import { pricingService } from '../services/pricing.service.js';
import { SupportedCurrency } from '../types/index.js';

export class QuoteController {
  public static getMarketRates(req: Request, res: Response) {
    const rates = pricingService.getMarketSnapshot();
    const arsToUsdt = pricingService.getExchangeRate('ARS', 'USDT');
    const usdtToArs = pricingService.getExchangeRate('USDT', 'ARS');

    return res.json({
      usdPrices: rates,
      localPairs: {
        'ARS_TO_USDT': {
          buyRate: arsToUsdt.effectiveRate,
          fee: arsToUsdt.feePercentage,
        },
        'USDT_TO_ARS': {
          sellRate: usdtToArs.effectiveRate,
          fee: usdtToArs.feePercentage,
        },
      },
    });
  }

  public static createQuote(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const { fromCurrency, toCurrency, fromAmount } = req.body;

      if (!fromCurrency || !toCurrency || !fromAmount) {
        return res.status(400).json({ error: 'Faltan campos obligatorios: fromCurrency, toCurrency, fromAmount' });
      }

      const quote = quoteService.createQuote(
        userId,
        fromCurrency as SupportedCurrency,
        toCurrency as SupportedCurrency,
        Number(fromAmount)
      );

      return res.status(201).json(quote);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }
}
