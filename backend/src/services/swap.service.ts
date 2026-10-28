import { quoteService } from './quote.service.js';
import { ledgerService } from './ledger.service.js';
import { db } from './store.service.js';
import { lockService } from './lock.service.js';

export class SwapService {
  /**
   * Ejecuta el swap garantizando atomicidad, bloqueo de concurrencia y consistencia de saldos
   */
  public executeSwap(userId: string, quoteId: string) {
    // Bloqueo pesimista concurrente sobre el usuario
    return lockService.withLock(`lock:user:${userId}`, () => {
      // 1. Validar cotización
      const quote = quoteService.getAndValidateQuote(quoteId, userId);

      // 2. Ejecutar movimiento contable en el libro mayor
      const result = ledgerService.executeTransfer({
        userId,
        fromCurrency: quote.fromCurrency,
        fromAmount: quote.fromAmount,
        toCurrency: quote.toCurrency,
        toAmount: quote.toAmount,
        transactionType: 'SWAP',
        quoteId: quote.id,
        metadata: {
          exchangeRate: quote.exchangeRate,
          feeAmount: quote.feeAmount,
        },
      });

      // 3. Marcar cotización como ejecutada
      quote.status = 'EXECUTED';
      db.quotes.set(quote.id, quote);

      return {
        success: true,
        transactionId: result.transaction.id,
        swapped: {
          from: `${quote.fromAmount} ${quote.fromCurrency}`,
          to: `${quote.toAmount} ${quote.toCurrency}`,
          rate: quote.exchangeRate,
        },
        updatedBalances: {
          [quote.fromCurrency]: result.fromAccount.balance,
          [quote.toCurrency]: result.toAccount.balance,
        },
      };
    });
  }
}

export const swapService = new SwapService();
