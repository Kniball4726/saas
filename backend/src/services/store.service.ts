import { SupportedCurrency } from '../types/index.js';

export interface UserEntity {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  cuitDni: string;
  kycStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  createdAt: Date;
}

export interface AccountEntity {
  id: string;
  userId: string;
  currency: SupportedCurrency;
  balance: number;
}

export interface VirtualBankEntity {
  id: string;
  userId: string;
  cvu: string;
  alias: string;
  provider: string;
}

export interface UsBankAccountEntity {
  id: string;
  userId: string;
  accountNumber: string;
  routingNumber: string;
  bankName: string;
  accountType: string;
  beneficiary: string;
  provider: string;
}

export interface QuoteEntity {
  id: string;
  userId: string;
  fromCurrency: SupportedCurrency;
  toCurrency: SupportedCurrency;
  fromAmount: number;
  toAmount: number;
  exchangeRate: number;
  feeAmount: number;
  status: 'PENDING' | 'EXECUTED' | 'EXPIRED';
  expiresAt: Date;
  createdAt: Date;
}

export interface TransactionEntity {
  id: string;
  userId: string;
  quoteId?: string;
  type: 'FIAT_DEPOSIT' | 'FIAT_WITHDRAWAL' | 'SWAP';
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  externalReference?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface LedgerEntryEntity {
  id: string;
  transactionId: string;
  accountId: string;
  amount: number; // Positivo = crédito, negativo = débito
  balanceAfter: number;
  createdAt: Date;
}

/**
 * Almacenamiento en memoria con soporte transaccional y libro contable inmutable.
 * Permite ejecutar la aplicación inmediatamente sin depender de Postgres externo,
 * manteniendo exactamente la misma arquitectura y reglas contables.
 */
class InMemoryDatabase {
  public users: Map<string, UserEntity> = new Map();
  public accounts: Map<string, AccountEntity> = new Map(); // key: `${userId}:${currency}`
  public virtualBankAccounts: Map<string, VirtualBankEntity> = new Map(); // key: cvu
  public usBankAccounts: Map<string, UsBankAccountEntity> = new Map(); // key: accountNumber
  public quotes: Map<string, QuoteEntity> = new Map();
  public transactions: Map<string, TransactionEntity> = new Map();
  public ledgerEntries: LedgerEntryEntity[] = [];

  constructor() {
    this.seedDemoUser();
  }

  private seedDemoUser() {
    // Usuario de prueba para probar la wallet inmediatamente
    const demoUserId = 'demo-user-123';
    this.users.set(demoUserId, {
      id: demoUserId,
      email: 'demo@wallet.ar',
      passwordHash: '$2b$10$demoHashedPasswordExample',
      firstName: 'Juan',
      lastName: 'Pérez',
      cuitDni: '20-35894123-9',
      kycStatus: 'VERIFIED',
      createdAt: new Date(),
    });

    // Cuentas con saldo inicial para probar
    const currencies: SupportedCurrency[] = ['ARS', 'USDT', 'USDC', 'BTC', 'ETH'];
    currencies.forEach((curr) => {
      const initialBalance = curr === 'ARS' ? 500000 : curr === 'USDT' ? 250 : 0;
      this.accounts.set(`${demoUserId}:${curr}`, {
        id: `acc-${demoUserId}-${curr}`,
        userId: demoUserId,
        currency: curr,
        balance: initialBalance,
      });
    });

    // CVU asignado en Argentina
    this.virtualBankAccounts.set('0000003100012345678901', {
      id: 'cvu-demo-1',
      userId: demoUserId,
      cvu: '0000003100012345678901',
      alias: 'JUAN.CRYPTO.WALLET',
      provider: 'LETSBIT_COELSA',
    });

    // Cuenta Virtual en Estados Unidos (USD) asignada vía Bridge / Lead Bank
    this.usBankAccounts.set('987654321012', {
      id: 'us-acc-demo-1',
      userId: demoUserId,
      accountNumber: '987654321012',
      routingNumber: '021000021', // ABA Routing number típico
      bankName: 'Lead Bank (Bridge / Stripe Network)',
      accountType: 'Checking',
      beneficiary: 'Juan Pérez',
      provider: 'BRIDGE_STRIPE_US',
    });
  }

  public getAccount(userId: string, currency: SupportedCurrency): AccountEntity {
    const key = `${userId}:${currency}`;
    let account = this.accounts.get(key);
    if (!account) {
      account = {
        id: `acc-${userId}-${currency}`,
        userId,
        currency,
        balance: 0,
      };
      this.accounts.set(key, account);
    }
    return account;
  }

  public getAccountsByUser(userId: string): AccountEntity[] {
    const list: AccountEntity[] = [];
    this.accounts.forEach((acc) => {
      if (acc.userId === userId) list.push({ ...acc });
    });
    return list;
  }
}

export const db = new InMemoryDatabase();
