import { SupportedCurrency } from '../types/index.js';

export interface UserEntity {
  id: string;
  email: string;
  passwordHash?: string;
  firstName: string;
  lastName: string;
  cuitDni: string;
  kycStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  authProvider?: 'LOCAL' | 'GOOGLE' | 'APPLE';
  avatarUrl?: string;
  pinHash?: string;
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
      passwordHash: '8a44221629a76ae3dd5ac949d11e7ade:72b6a9b490f48a9c30e1a14553066fa13213d45b235788f7e6c900e52c4e243e014834cf97127fbafa893135ecdcc11b39ea4c5faf4dd2b7bd3198663e4ac28f', // 'password123'
      pinHash: '1b70643a389dd2d8c31348e81e5576a9:2fce238e0a63bb40cc994e854f58f3a2bf8a990f21d8542d3b170658d32c9302691f3aae79038a2480efe0bb63ba5db7214cc266c9105d8a946590a89adcc730', // '123456'
      firstName: 'Juan',
      lastName: 'Pérez',
      cuitDni: '20-35894123-9',
      kycStatus: 'VERIFIED',
      authProvider: 'LOCAL',
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

  public findUserByEmail(email: string): UserEntity | undefined {
    const target = email.trim().toLowerCase();
    for (const user of this.users.values()) {
      if (user.email.toLowerCase() === target) {
        return user;
      }
    }
    return undefined;
  }

  public createUser(user: UserEntity, initialBalances?: Partial<Record<SupportedCurrency, number>>): UserEntity {
    this.users.set(user.id, user);
    this.initUserAccounts(user.id, initialBalances);
    return user;
  }

  public initUserAccounts(userId: string, initialBalances?: Partial<Record<SupportedCurrency, number>>) {
    const currencies: SupportedCurrency[] = ['ARS', 'USDT', 'USDC', 'BTC', 'ETH'];
    currencies.forEach((curr) => {
      const key = `${userId}:${curr}`;
      const bal = initialBalances?.[curr] ?? 0;
      let account = this.accounts.get(key);
      if (!account) {
        this.accounts.set(key, {
          id: `acc-${userId}-${curr}`,
          userId,
          currency: curr,
          balance: bal,
        });
      } else if (initialBalances?.[curr] !== undefined) {
        account.balance = bal;
      }
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
