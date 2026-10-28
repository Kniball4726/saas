/**
 * Servicio de Bloqueos Distribuidos y Gestión de Idempotencia.
 * En producción con múltiples instancias se respaldaría con Redis (Redlock).
 * Esta implementación provee bloqueo concurrente a nivel de proceso con TTL automático.
 */
export class DistributedLockService {
  private activeLocks: Map<string, { expiresAt: number }> = new Map();
  private idempotencyStore: Map<string, { result: any; status: 'PENDING' | 'RESOLVED'; expiresAt: number }> = new Map();

  /**
   * Intenta adquirir un bloqueo exclusivo (Mutex) para un recurso.
   * Si el recurso ya está bloqueado, lanza un error de conflicto.
   */
  public acquireLock(resourceKey: string, ttlMs: number = 5000): boolean {
    this.cleanExpiredLocks();

    const now = Date.now();
    const existing = this.activeLocks.get(resourceKey);

    if (existing && existing.expiresAt > now) {
      throw new Error(`Operación concurrente bloqueada para el recurso [${resourceKey}]. Intenta nuevamente.`);
    }

    this.activeLocks.set(resourceKey, { expiresAt: now + ttlMs });
    return true;
  }

  /**
   * Libera el bloqueo del recurso
   */
  public releaseLock(resourceKey: string): void {
    this.activeLocks.delete(resourceKey);
  }

  /**
   * Ejecuta una acción dentro de un bloque protegido por Mutex
   */
  public async withLock<T>(resourceKey: string, action: () => Promise<T> | T, ttlMs: number = 5000): Promise<T> {
    this.acquireLock(resourceKey, ttlMs);
    try {
      return await action();
    } finally {
      this.releaseLock(resourceKey);
    }
  }

  /**
   * Registra o valida una clave de idempotencia de cliente (Idempotency-Key)
   */
  public checkIdempotency(key: string): { isDuplicate: boolean; cachedResult?: any } {
    this.cleanExpiredLocks();

    const record = this.idempotencyStore.get(key);
    if (!record) {
      this.idempotencyStore.set(key, {
        result: null,
        status: 'PENDING',
        expiresAt: Date.now() + 86400 * 1000, // 24 horas
      });
      return { isDuplicate: false };
    }

    if (record.status === 'PENDING') {
      throw new Error('Una petición idéntica se está procesando actualmente. Espera un momento.');
    }

    return { isDuplicate: true, cachedResult: record.result };
  }

  /**
   * Guarda el resultado exitoso asociado a una clave de idempotencia
   */
  public resolveIdempotency(key: string, result: any): void {
    const record = this.idempotencyStore.get(key);
    if (record) {
      record.status = 'RESOLVED';
      record.result = result;
    }
  }

  private cleanExpiredLocks(): void {
    const now = Date.now();
    this.activeLocks.forEach((lock, key) => {
      if (lock.expiresAt <= now) {
        this.activeLocks.delete(key);
      }
    });

    this.idempotencyStore.forEach((record, key) => {
      if (record.expiresAt <= now) {
        this.idempotencyStore.delete(key);
      }
    });
  }
}

export const lockService = new DistributedLockService();
