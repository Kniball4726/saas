import { SupportedCurrency } from '../types/index.js';
import { config } from '../config/env.js';

export class PricingEngineService {
  // Precios base de referencia (ejemplo de mercado)
  // En producción se conectaría a APIs como Binance, Bitso o CoinGecko
  private baseRatesInUSD: Record<SupportedCurrency, number> = {
    USDT: 1.0,
    USDC: 1.0,
    BTC: 68500.0,
    ETH: 3500.0,
    ARS: 1 / 1250.0, // 1 USDT = 1250 ARS aprox
  };

  /**
   * Obtiene la tasa de cambio cruzada entre dos monedas aplicando el spread de comisión
   */
  public getExchangeRate(
    from: SupportedCurrency,
    to: SupportedCurrency,
    spreadPercentage: number = config.defaultSpreadPercentage
  ): {
    midRate: number;
    effectiveRate: number;
    feePercentage: number;
  } {
    if (from === to) {
      return { midRate: 1, effectiveRate: 1, feePercentage: 0 };
    }

    const fromInUsd = this.baseRatesInUSD[from];
    const toInUsd = this.baseRatesInUSD[to];

    // Tasa pura de mercado (mid-market rate)
    const midRate = fromInUsd / toInUsd;

    // Se descuenta el spread de la tasa efectiva recibida por el usuario
    const feeFactor = 1 - spreadPercentage / 100;
    const effectiveRate = midRate * feeFactor;

    return {
      midRate,
      effectiveRate,
      feePercentage: spreadPercentage,
    };
  }

  /**
   * Actualiza las tasas de mercado en tiempo real (por ejemplo desde WebSocket o API externa)
   */
  public updateMarketRate(currency: SupportedCurrency, priceInUSD: number): void {
    this.baseRatesInUSD[currency] = priceInUSD;
  }

  public getMarketSnapshot(): Record<SupportedCurrency, number> {
    return { ...this.baseRatesInUSD };
  }
}

export const pricingService = new PricingEngineService();
