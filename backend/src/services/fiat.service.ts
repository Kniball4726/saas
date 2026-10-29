import { db, VirtualBankEntity, UsBankAccountEntity } from './store.service.js';
import { ledgerService } from './ledger.service.js';
import { lockService } from './lock.service.js';
import { letsbitClient } from '../integrations/letsbit.client.js';
import { FiatDepositWebhookPayload, FiatWithdrawalRequest, UsAchDepositWebhookPayload } from '../types/index.js';
import crypto from 'crypto';

export class FiatRampService {
  /**
   * Obtiene o genera la cuenta bancaria virtual de EE.UU. (Routing y Account Number)
   */
  public getUserUsAccount(userId: string): UsBankAccountEntity {
    let usAccount: UsBankAccountEntity | undefined;
    db.usBankAccounts.forEach((ua) => {
      if (ua.userId === userId) usAccount = ua;
    });

    if (!usAccount) {
      const randomAcc = Math.floor(100000000000 + Math.random() * 900000000000).toString();
      const user = db.users.get(userId);
      const beneficiary = user ? `${user.firstName} ${user.lastName}` : 'Usuario Registrado';

      usAccount = {
        id: crypto.randomUUID(),
        userId,
        accountNumber: randomAcc,
        routingNumber: '021000021', // Lead Bank ABA routing
        bankName: 'Lead Bank (Bridge / Stripe Network)',
        accountType: 'Checking',
        beneficiary,
        provider: 'BRIDGE_STRIPE_US',
      };
      db.usBankAccounts.set(randomAcc, usAccount);
    }

    return usAccount;
  }

  /**
   * Procesa la transferencia entrante en USD desde un banco o plataforma de EE.UU. (ACH / Wire)
   * Acredita automáticamente USDC o USDT en el balance del usuario.
   */
  public processUsAchDeposit(payload: UsAchDepositWebhookPayload) {
    const { eventId, accountNumber, amountUsd, originSender, originBank, transferType } = payload;

    if (amountUsd <= 0) {
      throw new Error('El monto del depósito en USD debe ser mayor a 0');
    }

    // Idempotencia
    let alreadyProcessed = false;
    db.transactions.forEach((tx) => {
      if (tx.externalReference === eventId) alreadyProcessed = true;
    });

    if (alreadyProcessed) {
      return { status: 'IGNORED_DUPLICATE', message: 'El depósito ACH ya fue procesado' };
    }

    // Buscar cuenta de EE.UU.
    const usAccount = db.usBankAccounts.get(accountNumber);
    if (!usAccount) {
      throw new Error(`Cuenta de EE.UU. no encontrada con Account Number: ${accountNumber}`);
    }

    // Comisión ACH (Ej: 1.0% de recepción, con un mínimo de $1 USD)
    const achFeePercentage = 1.0;
    const feeAmount = Math.max(amountUsd * (achFeePercentage / 100), 1.0);
    const netAmountUsdc = amountUsd - feeAmount;

    // Acreditar USDC en el libro mayor del usuario
    const result = ledgerService.executeTransfer({
      userId: usAccount.userId,
      fromCurrency: 'USDC',
      fromAmount: 0,
      toCurrency: 'USDC',
      toAmount: netAmountUsdc,
      transactionType: 'FIAT_DEPOSIT',
      metadata: {
        channel: 'US_ACH_TRANSFER',
        transferType: transferType || 'ACH',
        originSender,
        originBank: originBank || 'US Banking System',
        grossAmountUsd: amountUsd,
        feeChargedUsd: feeAmount,
        providerEventId: eventId,
      },
    });

    result.transaction.externalReference = eventId;

    return {
      status: 'SUCCESS',
      transactionId: result.transaction.id,
      grossAmountUsd: amountUsd,
      feeChargedUsd: feeAmount,
      creditedUsdc: netAmountUsdc,
      currency: 'USDC',
      newUsdcBalance: result.toAccount.balance,
      originSender,
    };
  }

  /**
   * Obtiene o genera los datos bancarios locales (CVU y Alias) del usuario
   * Integrado con la API oficial de Let'sBit B2B (con fallback a simulación si no hay API Key)
   */
  public async getUserVirtualAccount(userId: string): Promise<VirtualBankEntity> {
    let account: VirtualBankEntity | undefined;
    db.virtualBankAccounts.forEach((va) => {
      if (va.userId === userId) account = va;
    });

    if (!account) {
      const user = db.users.get(userId);
      const taxId = user?.cuitDni || '20-35894123-9';
      const firstName = user?.firstName || 'Usuario';
      const lastName = user?.lastName || 'Demo';

      // Llamada al cliente oficial de Let'sBit
      const lbAccount = await letsbitClient.createVirtualAccount({
        userId,
        taxId,
        firstName,
        lastName,
      });

      account = {
        id: crypto.randomUUID(),
        userId,
        cvu: lbAccount.cvu,
        alias: lbAccount.alias,
        provider: lbAccount.provider,
      };
      db.virtualBankAccounts.set(lbAccount.cvu, account);
    }

    return account;
  }

  /**
   * Procesa el Webhook de depósito bancario recibido desde el PSP / BaaS (COELSA)
   * con validación de idempotencia (evita duplicar depósitos por reintentos de red)
   */
  public processDepositWebhook(payload: FiatDepositWebhookPayload) {
    const { eventId, cvu, amount, originBank, originOwner, originCuit } = payload;

    if (amount <= 0) {
      throw new Error('El monto del depósito debe ser mayor a 0');
    }

    // Verificar si el evento ya fue procesado (Idempotencia)
    let alreadyProcessed = false;
    db.transactions.forEach((tx) => {
      if (tx.externalReference === eventId) alreadyProcessed = true;
    });

    if (alreadyProcessed) {
      return { status: 'IGNORED_DUPLICATE', message: 'El evento ya fue procesado anteriormente' };
    }

    // Buscar a qué usuario le pertenece el CVU
    const virtualAccount = db.virtualBankAccounts.get(cvu);
    if (!virtualAccount) {
      throw new Error(`No se encontró cuenta virtual con CVU: ${cvu}`);
    }

    // Acreditar saldo en ARS en el ledger
    const result = ledgerService.executeTransfer({
      userId: virtualAccount.userId,
      fromCurrency: 'ARS',
      fromAmount: 0, // No debita nada del usuario (es entrada externa)
      toCurrency: 'ARS',
      toAmount: amount,
      transactionType: 'FIAT_DEPOSIT',
      metadata: {
        originBank,
        originOwner,
        originCuit,
        providerEventId: eventId,
      },
    });

    // Marcar la referencia externa en la transacción para idempotencia
    result.transaction.externalReference = eventId;

    return {
      status: 'SUCCESS',
      transactionId: result.transaction.id,
      creditedAmount: amount,
      currency: 'ARS',
      newBalance: result.toAccount.balance,
    };
  }

  /**
   * Inicia una transferencia bancaria saliente hacia un CBU, CVU o Alias en Argentina (Off-Ramp)
   * Protegido por bloqueo de concurrencia exclusivo y despachado vía Let'sBit / COELSA
   */
  public async requestWithdrawal(userId: string, req: FiatWithdrawalRequest) {
    return lockService.withLock(`lock:user:${userId}`, async () => {
      const { amount, targetCbuCvu, targetAlias, ownerName, ownerCuit } = req;

      if (amount <= 0) {
        throw new Error('El monto a retirar debe ser mayor a 0');
      }

      // 1. Debitar ARS de la cuenta del usuario en el libro mayor
      const result = ledgerService.executeTransfer({
        userId,
        fromCurrency: 'ARS',
        fromAmount: amount,
        toCurrency: 'ARS',
        toAmount: 0, // Sale fuera del sistema
        transactionType: 'FIAT_WITHDRAWAL',
        metadata: {
          targetCbuCvu,
          targetAlias,
          destinationOwner: ownerName,
          destinationCuit: ownerCuit,
          dispatchStatus: 'DISPATCHING_TO_LETSBIT',
        },
      });

      // 2. Despachar la transferencia mediante el cliente oficial de Let'sBit
      const payoutResult = await letsbitClient.sendBankTransfer({
        targetCbuCvu: targetCbuCvu || '0000003100099999999999',
        amount,
        taxId: ownerCuit,
        ownerName,
      });

      result.transaction.metadata = {
        ...result.transaction.metadata,
        dispatchStatus: payoutResult.status,
        letsbitTransferId: payoutResult.transferId,
        coelsaTrackingId: payoutResult.coelsaTrackingId,
      };

      return {
        status: 'WITHDRAWAL_INITIATED',
        transactionId: result.transaction.id,
        debitedAmount: amount,
        remainingBalance: result.fromAccount.balance,
        coelsaTrackingId: payoutResult.coelsaTrackingId,
        destination: {
          targetCbuCvu,
          targetAlias,
          ownerName,
          ownerCuit,
        },
      };
    });
  }
}

export const fiatService = new FiatRampService();
