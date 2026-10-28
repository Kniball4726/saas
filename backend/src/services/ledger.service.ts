import { db, AccountEntity, LedgerEntryEntity, TransactionEntity } from './store.service.js';
import { SupportedCurrency } from '../types/index.js';
import crypto from 'crypto';

export class LedgerService {
  /**
   * Ejecuta un movimiento contable atómico con partida doble y registro en el ledger
   */
  public executeTransfer(params: {
    userId: string;
    fromCurrency: SupportedCurrency;
    fromAmount: number;
    toCurrency: SupportedCurrency;
    toAmount: number;
    transactionType: 'SWAP' | 'FIAT_DEPOSIT' | 'FIAT_WITHDRAWAL';
    quoteId?: string;
    metadata?: Record<string, any>;
  }): { transaction: TransactionEntity; fromAccount: AccountEntity; toAccount: AccountEntity } {
    const { userId, fromCurrency, fromAmount, toCurrency, toAmount, transactionType, quoteId, metadata } = params;

    const fromAccount = db.getAccount(userId, fromCurrency);
    const toAccount = db.getAccount(userId, toCurrency);

    // Validación estricta de saldo disponible (evita saldo negativo)
    if (fromAmount > 0 && fromAccount.balance < fromAmount) {
      throw new Error(`Saldo insuficiente en ${fromCurrency}. Saldo actual: ${fromAccount.balance}, Requerido: ${fromAmount}`);
    }

    // 1. Crear transacción principal
    const transactionId = crypto.randomUUID();
    const transaction: TransactionEntity = {
      id: transactionId,
      userId,
      quoteId,
      type: transactionType,
      status: 'COMPLETED',
      metadata,
      createdAt: new Date(),
    };
    db.transactions.set(transactionId, transaction);

    // 2. Debitar cuenta origen (si aplica)
    if (fromAmount > 0) {
      fromAccount.balance -= fromAmount;
      const debitEntry: LedgerEntryEntity = {
        id: crypto.randomUUID(),
        transactionId,
        accountId: fromAccount.id,
        amount: -fromAmount,
        balanceAfter: fromAccount.balance,
        createdAt: new Date(),
      };
      db.ledgerEntries.push(debitEntry);
    }

    // 3. Acreditar cuenta destino (si aplica)
    if (toAmount > 0) {
      toAccount.balance += toAmount;
      const creditEntry: LedgerEntryEntity = {
        id: crypto.randomUUID(),
        transactionId,
        accountId: toAccount.id,
        amount: toAmount,
        balanceAfter: toAccount.balance,
        createdAt: new Date(),
      };
      db.ledgerEntries.push(creditEntry);
    }

    return { transaction, fromAccount, toAccount };
  }

  /**
   * Obtiene el historial del libro contable de un usuario
   */
  public getUserTransactions(userId: string): TransactionEntity[] {
    const results: TransactionEntity[] = [];
    db.transactions.forEach((tx) => {
      if (tx.userId === userId) {
        results.push(tx);
      }
    });
    return results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}

export const ledgerService = new LedgerService();
