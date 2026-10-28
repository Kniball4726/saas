import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { fiatService } from '../services/fiat.service.js';
import crypto from 'crypto';

export class FiatController {
  /**
   * Devuelve los datos de la cuenta bancaria en EE.UU. (USD ACH/Wire) asignada al usuario
   */
  public static getUsAccount(req: AuthenticatedRequest, res: Response) {
    const userId = req.user!.userId;
    const account = fiatService.getUserUsAccount(userId);
    return res.json({
      currency: 'USD',
      routingNumber: account.routingNumber,
      accountNumber: account.accountNumber,
      bankName: account.bankName,
      accountType: account.accountType,
      beneficiaryName: account.beneficiary,
      supportedRails: ['ACH (Automated Clearing House)', 'Fedwire / Domestic Wire'],
      provider: account.provider,
      instructions: 'Utiliza estos datos para recibir transferencias en USD desde cualquier banco de EE.UU., plataformas de trabajo (Upwork, Deel, Fiverr) o procesadores (Stripe, PayPal).',
    });
  }

  /**
   * Webhook para recibir transferencias ACH / Wire desde Estados Unidos
   */
  public static handleUsAchWebhook(req: Request, res: Response) {
    try {
      const { accountNumber, amountUsd, originSender, originBank, transferType, eventId } = req.body;

      if (!accountNumber || !amountUsd) {
        return res.status(400).json({ error: 'Faltan campos requeridos: accountNumber, amountUsd' });
      }

      const generatedEventId = eventId || `us_ach_evt_${crypto.randomUUID()}`;

      const result = fiatService.processUsAchDeposit({
        eventId: generatedEventId,
        accountNumber,
        amountUsd: Number(amountUsd),
        originSender: originSender || 'Upwork Escrow Inc / US Employer',
        originBank: originBank || 'JPMorgan Chase / Silicon Valley Bank',
        transferType: transferType || 'ACH',
        timestamp: new Date().toISOString(),
      });

      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  /**
   * Devuelve los datos bancarios locales (CVU y Alias) del usuario para recibir transferencias
   */
  public static getVirtualAccount(req: AuthenticatedRequest, res: Response) {
    const userId = req.user!.userId;
    const account = fiatService.getUserVirtualAccount(userId);
    return res.json({
      currency: 'ARS',
      cvu: account.cvu,
      alias: account.alias,
      bank: 'Proveedor Interoperable (COELSA)',
      instructions: 'Transfiere desde cualquier banco o billetera argentina (Mercado Pago, Brubank, Galicia, etc.) usando este CVU o Alias.',
    });
  }

  /**
   * Endpoint de Webhook que recibiría tu backend desde el BaaS (Let'sBit, Bitso, BIND)
   * También sirve para simular una transferencia entrante durante pruebas y desarrollo.
   */
  public static handleDepositWebhook(req: Request, res: Response) {
    try {
      const { cvu, amount, originBank, originOwner, originCuit, eventId } = req.body;

      if (!cvu || !amount) {
        return res.status(400).json({ error: 'Faltan campos requeridos: cvu, amount' });
      }

      const generatedEventId = eventId || `evt_${crypto.randomUUID()}`;

      const result = fiatService.processDepositWebhook({
        eventId: generatedEventId,
        cvu,
        amount: Number(amount),
        originBank: originBank || 'Mercado Pago / Banco Santander',
        originOwner: originOwner || 'Usuario Remitente',
        originCuit: originCuit || '20-12345678-9',
        timestamp: new Date().toISOString(),
      });

      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  /**
   * Retiro de pesos argentinos hacia una cuenta bancaria externa
   */
  public static async withdraw(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const { amount, targetCbuCvu, targetAlias, ownerName, ownerCuit } = req.body;

      if (!amount || (!targetCbuCvu && !targetAlias)) {
        return res.status(400).json({ error: 'Debes especificar amount y un targetCbuCvu o targetAlias' });
      }

      const result = await fiatService.requestWithdrawal(userId, {
        amount: Number(amount),
        targetCbuCvu: targetCbuCvu || '0000003100099999999999',
        targetAlias,
        ownerName: ownerName || 'Titular de Cuenta Destino',
        ownerCuit: ownerCuit || '20-00000000-0',
      });

      return res.json(result);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }
}
