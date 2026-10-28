export type SupportedCurrency = 'ARS' | 'USDT' | 'USDC' | 'BTC' | 'ETH';

export interface UserSession {
  userId: string;
  email: string;
}

export interface QuoteRequest {
  fromCurrency: SupportedCurrency;
  toCurrency: SupportedCurrency;
  fromAmount: number;
}

export interface QuoteResponse {
  quoteId: string;
  fromCurrency: SupportedCurrency;
  toCurrency: SupportedCurrency;
  fromAmount: number;
  toAmount: number;
  rate: number;
  feeAmount: number;
  expiresAt: string;
  expiresInSeconds: number;
}

export interface SwapExecuteRequest {
  quoteId: string;
}

export interface FiatDepositWebhookPayload {
  eventId: string;
  cvu: string;
  amount: number;
  originBank: string;
  originOwner: string;
  originCuit: string;
  timestamp: string;
}

export interface FiatWithdrawalRequest {
  amount: number;
  targetCbuCvu: string;
  targetAlias?: string;
  ownerName: string;
  ownerCuit: string;
}

export interface UsAchDepositWebhookPayload {
  eventId: string;
  accountNumber: string;
  amountUsd: number;
  originSender: string; // Ej: 'Upwork', 'Deel', 'Google Inc', 'Chase Bank'
  originBank?: string;
  transferType?: 'ACH' | 'WIRE';
  timestamp?: string;
}

export interface UsBankAccountResponse {
  routingNumber: string;
  accountNumber: string;
  bankName: string;
  accountType: string;
  beneficiaryName: string;
  supportedRails: string[];
  provider: string;
}
