import crypto from 'crypto';

/**
 * Utilidades criptográficas nativas de Node.js para hashing de contraseñas y PINs.
 * Utiliza scrypt con salts aleatorios y comparación resistente a ataques de temporización (timing attacks).
 */
export class SecurityUtil {
  /**
   * Hashea una contraseña o PIN con scrypt y salt aleatorio de 16 bytes
   */
  public static hashSecret(plainText: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const derivedKey = crypto.scryptSync(plainText, salt, 64).toString('hex');
    return `${salt}:${derivedKey}`;
  }

  /**
   * Compara un secreto en texto plano contra un hash almacenado
   */
  public static verifySecret(plainText: string, storedHash: string): boolean {
    if (!storedHash || !storedHash.includes(':')) {
      return false;
    }
    const [salt, key] = storedHash.split(':');
    const keyBuffer = Buffer.from(key, 'hex');
    const derivedKeyBuffer = crypto.scryptSync(plainText, salt, 64);
    return crypto.timingSafeEqual(keyBuffer, derivedKeyBuffer);
  }
}
