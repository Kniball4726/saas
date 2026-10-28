import { db, QuoteEntity } from './store.service.js';
import { pricingService } from './pricing.service.js';
import { SupportedCurrency, QuoteResponse } from '../types/index.js';
import { config } from '../config/env.js';
import crypto from 'crypto';

export class QuoteService {
  /**
   * Genera una cotización congelada por X segundos
   */
  public createQuote(userId: string, fromCurrency: SupportedCurrency, toCurrency: SupportedCurrency, fromAmount: number): QuoteResponse {
    if (fromAmount <= 0) {
      throw new Error('El monto a cotizar debe ser mayor a 0');
    }

    if (fromCurrency === toCurrency) {
      throw new Error('No puedes cotizar entre la misma moneda');
    }

    const { effectiveRate, midRate, feePercentage } = pricingService.getExchangeRate(fromCurrency, toCurrency);
    const toAmount = fromAmount * effectiveRate;
    const feeAmount = fromAmount * (feePercentage / 100);

    const expiresAt = new Date(Date.now() + config.quoteTtlSeconds * 1000);
    const quoteId = crypto.randomUUID();

    const quoteEntity: QuoteEntity = {
      id: quoteId,
      userId,
      fromCurrency,
      toCurrency,
      fromAmount,
      toAmount,
      exchangeRate: effectiveRate,
      feeAmount,
      status: 'PENDING',
      expiresAt,
      createdAt: new Date(),
    };

    db.quotes.set(quoteId, quoteEntity);

    return {
      quoteId,
      fromCurrency,
      toCurrency,
      fromAmount,
      toAmount: Number(toAmount.toFixed(8)),
      rate: Number(effectiveRate.toFixed(8)),
      feeAmount: Number(feeAmount.toFixed(8)),
      expiresAt: expiresAt.toISOString(),
      expiresInSeconds: config.quoteTtlSeconds,
    };
  }

  /**
   * Obtiene y valida si una cotización sigue activa
   */
  public getAndValidateQuote(quoteId: string, userId: string): QuoteEntity {
    const quote = db.quotes.get(quoteId);

    if (!quote) {
      throw new Error('Cotización no encontrada');
    }

    if (quote.userId !== userId) {
      throw new Error('No autorizado para ejecutar esta cotización');
    }

    if (quote.status !== 'PENDING') {
      throw new Error(`La cotización ya no está disponible (Estado actual: ${quote.status})`);
    }

    if (new Date() > quote.expiresAt) {
      quote.status = 'EXPIRED';
      throw new Error('La cotización ha expirado. Por favor solicita una nueva cotización.');
    }

    return quote;
  }
}

export const quoteService = new QuoteService();
