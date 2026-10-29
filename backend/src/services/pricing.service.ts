import { SupportedCurrency } from '../types/index.js';
import { config } from '../config/env.js';

export interface CryptoMarketQuote {
  symbol: SupportedCurrency;
  name: string;
  icon: string;
  priceUsd: number;
  buyPriceArs: number;  // Precio de compra en ARS (lo que paga el usuario para comprar)
  sellPriceArs: number; // Precio de venta en ARS (lo que recibe el usuario si vende)
  change24h: number;    // Variación % en las últimas 24hs
  high24hUsd: number;   // Máximo 24h
  low24hUsd: number;    // Mínimo 24h
  volume24hUsd: string; // Volumen de mercado
  updatedAt: string;
}

export class PricingEngineService {
  // Precios base de referencia en USD
  private baseRatesInUSD: Record<SupportedCurrency, number> = {
    USDT: 1.0,
    USDC: 1.0,
    BTC: 68750.0,
    ETH: 3520.0,
    ARS: 1 / 1250.0, // 1 USDT = 1250 ARS base
  };

  private marketMetadata: Record<SupportedCurrency, { name: string; icon: string; change24h: number; high: number; low: number; volume: string }> = {
    USDT: { name: 'Tether USD', icon: 'fa-solid fa-t', change24h: 0.02, high: 1.002, low: 0.998, volume: '$45.2B' },
    USDC: { name: 'USD Coin', icon: 'fa-solid fa-dollar-sign', change24h: -0.01, high: 1.001, low: 0.999, volume: '$6.8B' },
    BTC: { name: 'Bitcoin', icon: 'fa-brands fa-bitcoin', change24h: 3.45, high: 69400.0, low: 67100.0, volume: '$28.4B' },
    ETH: { name: 'Ethereum', icon: 'fa-brands fa-ethereum', change24h: -1.18, high: 3580.0, low: 3460.0, volume: '$14.1B' },
    ARS: { name: 'Peso Argentino', icon: 'fa-solid fa-money-bill-wave', change24h: -0.45, high: 1255.0, low: 1240.0, volume: '$820M' },
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
   * Genera el listado completo de cotizaciones de criptomonedas
   * con precios en USD, precio de Compra/Venta en ARS y variación 24h
   */
  public getMarketQuotes(): CryptoMarketQuote[] {
    const arsUsdRate = this.baseRatesInUSD['ARS']; // ~0.0008 (1 / 1250)
    const arsPerUsd = 1 / arsUsdRate; // 1250 ARS

    const cryptos: SupportedCurrency[] = ['BTC', 'ETH', 'USDT', 'USDC'];

    return cryptos.map((symbol) => {
      const priceUsd = this.baseRatesInUSD[symbol];
      const meta = this.marketMetadata[symbol];

      // Precios en ARS:
      // - Compra: el usuario entrega ARS para comprar cripto (precio mayorista + spread)
      // - Venta: el usuario entrega cripto y recibe ARS (precio mayorista - spread)
      const midPriceArs = priceUsd * arsPerUsd;
      const spreadFactor = config.defaultSpreadPercentage / 100;
      const buyPriceArs = midPriceArs * (1 + spreadFactor);
      const sellPriceArs = midPriceArs * (1 - spreadFactor);

      return {
        symbol,
        name: meta.name,
        icon: meta.icon,
        priceUsd: Number(priceUsd.toFixed(priceUsd >= 10 ? 2 : 4)),
        buyPriceArs: Number(buyPriceArs.toFixed(priceUsd >= 10 ? 0 : 2)),
        sellPriceArs: Number(sellPriceArs.toFixed(priceUsd >= 10 ? 0 : 2)),
        change24h: meta.change24h,
        high24hUsd: meta.high,
        low24hUsd: meta.low,
        volume24hUsd: meta.volume,
        updatedAt: new Date().toISOString(),
      };
    });
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
