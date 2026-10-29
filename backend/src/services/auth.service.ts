import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db, UserEntity } from './store.service.js';
import { config } from '../config/env.js';
import { SecurityUtil } from '../utils/security.util.js';
import { letsbitClient } from '../integrations/letsbit.client.js';

export interface AuthTokens {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: string;
}

export interface AuthResult {
  user: Omit<UserEntity, 'passwordHash' | 'pinHash'>;
  tokens: AuthTokens;
}

export class AuthService {
  /**
   * Genera el token JWT de acceso para un usuario
   */
  private generateTokens(user: UserEntity): AuthTokens {
    const payload = {
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    };

    const accessToken = jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.auth.jwtExpiresIn as any,
    });

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: config.auth.jwtExpiresIn,
    };
  }

  /**
   * Sanitiza el objeto de usuario omitiendo hashes sensibles
   */
  public sanitizeUser(user: UserEntity): Omit<UserEntity, 'passwordHash' | 'pinHash'> {
    const { passwordHash, pinHash, ...safeUser } = user;
    return safeUser;
  }

  /**
   * Registro con correo tradicional y contraseña
   */
  public async register(params: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    cuitDni: string;
    pin?: string;
  }): Promise<AuthResult> {
    const { email, password, firstName, lastName, cuitDni, pin } = params;

    if (!email || !password || !firstName || !lastName || !cuitDni) {
      throw new Error('Todos los campos son obligatorios para el registro');
    }

    if (password.length < 6) {
      throw new Error('La contraseña debe tener al menos 6 caracteres');
    }

    const existing = db.findUserByEmail(email);
    if (existing) {
      throw new Error('Ya existe una cuenta registrada con este correo electrónico');
    }

    const userId = `usr_${crypto.randomUUID()}`;
    const passwordHash = SecurityUtil.hashSecret(password);
    const pinHash = SecurityUtil.hashSecret(pin || '123456');

    const newUser: UserEntity = {
      id: userId,
      email: email.trim().toLowerCase(),
      passwordHash,
      pinHash,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      cuitDni: cuitDni.trim(),
      kycStatus: 'VERIFIED',
      authProvider: 'LOCAL',
      createdAt: new Date(),
    };

    // Crear usuario e inicializar cuentas con saldo de bienvenida
    db.createUser(newUser);
    db.initUserAccounts(userId, { ARS: 100000, USDT: 50 });

    // Generar CVU y Alias en COELSA / Let'sBit
    const virtualAccount = await letsbitClient.createVirtualAccount({
      userId,
      taxId: cuitDni,
      firstName,
      lastName,
    });
    db.virtualBankAccounts.set(virtualAccount.cvu, {
      id: crypto.randomUUID(),
      userId,
      cvu: virtualAccount.cvu,
      alias: virtualAccount.alias,
      provider: virtualAccount.provider,
    });

    // Generar cuenta en EE.UU.
    const usAccNumber = Math.floor(100000000000 + Math.random() * 900000000000).toString();
    db.usBankAccounts.set(usAccNumber, {
      id: crypto.randomUUID(),
      userId,
      accountNumber: usAccNumber,
      routingNumber: '021000021',
      bankName: 'Lead Bank (Bridge / Stripe Network)',
      accountType: 'Checking',
      beneficiary: `${firstName} ${lastName}`,
      provider: 'BRIDGE_STRIPE_US',
    });

    const tokens = this.generateTokens(newUser);
    return {
      user: this.sanitizeUser(newUser),
      tokens,
    };
  }

  /**
   * Inicio de sesión tradicional con correo y contraseña
   */
  public async login(email: string, password: string): Promise<AuthResult> {
    const user = db.findUserByEmail(email);
    if (!user || !user.passwordHash) {
      throw new Error('Credenciales inválidas. Verifica tu correo y contraseña.');
    }

    const isValid = SecurityUtil.verifySecret(password, user.passwordHash);
    if (!isValid) {
      throw new Error('Credenciales inválidas. Verifica tu correo y contraseña.');
    }

    const tokens = this.generateTokens(user);
    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  /**
   * Autenticación con Google Sign-In (OpenID Connect / Google Identity Services)
   */
  public async loginWithGoogle(params: {
    idToken: string;
    email?: string;
    name?: string;
    picture?: string;
  }): Promise<AuthResult> {
    const { idToken, email, name, picture } = params;

    let verifiedEmail = email;
    let verifiedName = name || 'Usuario Google';
    let verifiedPicture = picture;

    // Si es un token real y no estamos en mock, podemos verificarlo con Google TokenInfo API
    if (idToken && !idToken.startsWith('mock-') && idToken.includes('.')) {
      try {
        const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
        if (response.ok) {
          const googlePayload = (await response.json()) as any;
          verifiedEmail = googlePayload.email || verifiedEmail;
          verifiedName = googlePayload.name || verifiedName;
          verifiedPicture = googlePayload.picture || verifiedPicture;
        }
      } catch (err) {
        // En sandbox local se continúa con el payload recibido
      }
    }

    if (!verifiedEmail) {
      throw new Error('No se pudo obtener el correo verificado de Google');
    }

    let user = db.findUserByEmail(verifiedEmail);

    if (!user) {
      // Auto-provisión de usuario registrado por Google
      const userId = `usr_g_${crypto.randomUUID()}`;
      const nameParts = (verifiedName || 'Usuario Google').split(' ');
      const firstName = nameParts[0] || 'Usuario';
      const lastName = nameParts.slice(1).join(' ') || 'Google';

      user = {
        id: userId,
        email: verifiedEmail.toLowerCase(),
        firstName,
        lastName,
        cuitDni: `20-${Math.floor(10000000 + Math.random() * 90000000)}-${Math.floor(Math.random() * 9)}`,
        kycStatus: 'VERIFIED',
        authProvider: 'GOOGLE',
        avatarUrl: verifiedPicture,
        pinHash: SecurityUtil.hashSecret('123456'), // PIN por defecto
        createdAt: new Date(),
      };

      db.createUser(user);
      db.initUserAccounts(userId, { ARS: 350000, USDT: 150 });

      // Generar CVU y Cuenta USA
      const virtualAccount = await letsbitClient.createVirtualAccount({
        userId,
        taxId: user.cuitDni,
        firstName,
        lastName,
      });
      db.virtualBankAccounts.set(virtualAccount.cvu, {
        id: crypto.randomUUID(),
        userId,
        cvu: virtualAccount.cvu,
        alias: virtualAccount.alias,
        provider: virtualAccount.provider,
      });

      const usAccNumber = Math.floor(100000000000 + Math.random() * 900000000000).toString();
      db.usBankAccounts.set(usAccNumber, {
        id: crypto.randomUUID(),
        userId,
        accountNumber: usAccNumber,
        routingNumber: '021000021',
        bankName: 'Lead Bank (Bridge / Stripe Network)',
        accountType: 'Checking',
        beneficiary: `${firstName} ${lastName}`,
        provider: 'BRIDGE_STRIPE_US',
      });
    } else {
      user.avatarUrl = verifiedPicture || user.avatarUrl;
    }

    const tokens = this.generateTokens(user);
    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  /**
   * Autenticación con Apple Sign-In (Apple Identity Token)
   */
  public async loginWithApple(params: {
    identityToken: string;
    email?: string;
    fullName?: { firstName?: string; lastName?: string };
  }): Promise<AuthResult> {
    const { identityToken, email, fullName } = params;

    let verifiedEmail = email;
    let firstName = fullName?.firstName || 'Usuario';
    let lastName = fullName?.lastName || 'Apple';

    // En Apple, el correo suele llegar en el primer login
    if (!verifiedEmail) {
      verifiedEmail = `apple_${identityToken.slice(0, 12)}@privaterelay.appleid.com`;
    }

    let user = db.findUserByEmail(verifiedEmail);

    if (!user) {
      const userId = `usr_a_${crypto.randomUUID()}`;
      user = {
        id: userId,
        email: verifiedEmail.toLowerCase(),
        firstName,
        lastName,
        cuitDni: `27-${Math.floor(10000000 + Math.random() * 90000000)}-${Math.floor(Math.random() * 9)}`,
        kycStatus: 'VERIFIED',
        authProvider: 'APPLE',
        pinHash: SecurityUtil.hashSecret('123456'),
        createdAt: new Date(),
      };

      db.createUser(user);
      db.initUserAccounts(userId, { ARS: 400000, USDT: 200 });

      const virtualAccount = await letsbitClient.createVirtualAccount({
        userId,
        taxId: user.cuitDni,
        firstName,
        lastName,
      });
      db.virtualBankAccounts.set(virtualAccount.cvu, {
        id: crypto.randomUUID(),
        userId,
        cvu: virtualAccount.cvu,
        alias: virtualAccount.alias,
        provider: virtualAccount.provider,
      });

      const usAccNumber = Math.floor(100000000000 + Math.random() * 900000000000).toString();
      db.usBankAccounts.set(usAccNumber, {
        id: crypto.randomUUID(),
        userId,
        accountNumber: usAccNumber,
        routingNumber: '021000021',
        bankName: 'Lead Bank (Bridge / Stripe Network)',
        accountType: 'Checking',
        beneficiary: `${firstName} ${lastName}`,
        provider: 'BRIDGE_STRIPE_US',
      });
    }

    const tokens = this.generateTokens(user);
    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  /**
   * Verificación de PIN de seguridad de 6 dígitos para autorización de transferencias (Step-Up Auth)
   */
  public verifyPin(userId: string, pin: string): boolean {
    const user = db.users.get(userId);
    if (!user || !user.pinHash) {
      // Si el usuario no tiene PIN configurado, usamos por defecto 123456 para no bloquear
      return pin === '123456';
    }

    return SecurityUtil.verifySecret(pin, user.pinHash);
  }

  /**
   * Obtiene el perfil público del usuario
   */
  public getProfile(userId: string): Omit<UserEntity, 'passwordHash' | 'pinHash'> {
    const user = db.users.get(userId);
    if (!user) {
      throw new Error('Usuario no encontrado');
    }
    return this.sanitizeUser(user);
  }
}

export const authService = new AuthService();
