import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { config } from '../config/env.js';

export interface SignedWebhookRequest extends Request {
  rawBodyPayload?: string;
}

/**
 * Genera una firma HMAC SHA-256 estándar para pruebas o emisión de webhooks
 */
export function generateWebhookSignature(payload: string | object, secret: string = config.webhookSecret): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const rawPayload = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const signaturePayload = `${timestamp}.${rawPayload}`;

  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(signaturePayload);
  const signature = hmac.digest('hex');

  return `t=${timestamp},v1=${signature}`;
}

/**
 * Middleware para validar firmas criptográficas HMAC en Webhooks entrantes
 * Protege contra:
 * 1. Peticiones falsificadas (Spoofing)
 * 2. Manipulación de contenido (Tampering)
 * 3. Ataques de repetición (Replay Attacks) mediante validación de timestamp
 * 4. Ataques de canal lateral de tiempo (Timing Attacks) usando timingSafeEqual
 */
export const verifyWebhookSignature = (req: Request, res: Response, next: NextFunction) => {
  // Permitir simulación interactiva solo en entorno de desarrollo/demo si se especifica la cabecera
  if (process.env.NODE_ENV !== 'production' && req.headers['x-demo-simulation'] === 'true') {
    return next();
  }

  const signatureHeader = req.headers['x-signature'] as string;

  if (!signatureHeader) {
    return res.status(401).json({
      error: 'Acceso no autorizado: Cabecera X-Signature requerida',
      code: 'MISSING_SIGNATURE',
    });
  }

  try {
    // 1. Extraer timestamp y firma (formato: t=12345678,v1=hexsignature)
    const parts = signatureHeader.split(',');
    let timestampStr = '';
    let receivedSignature = '';

    for (const part of parts) {
      const [key, value] = part.trim().split('=');
      if (key === 't') timestampStr = value;
      if (key === 'v1') receivedSignature = value;
    }

    if (!timestampStr || !receivedSignature) {
      return res.status(401).json({
        error: 'Formato de firma inválido. Se espera t=<timestamp>,v1=<signature>',
        code: 'INVALID_SIGNATURE_FORMAT',
      });
    }

    // 2. Prevenir ataques de repetición (tolerancia máxima: 5 minutos / 300 segundos)
    const timestamp = parseInt(timestampStr, 10);
    const now = Math.floor(Date.now() / 1000);
    const timeDelta = Math.abs(now - timestamp);

    if (timeDelta > 300) {
      return res.status(401).json({
        error: 'Firma expirada: Posible ataque de repetición (Replay Attack)',
        code: 'SIGNATURE_EXPIRED',
        driftSeconds: timeDelta,
      });
    }

    // 3. Reconstruir el string de firma: `${timestamp}.${body}`
    const rawPayload = JSON.stringify(req.body);
    const expectedPayload = `${timestamp}.${rawPayload}`;

    const hmac = crypto.createHmac('sha256', config.webhookSecret);
    hmac.update(expectedPayload);
    const calculatedSignature = hmac.digest('hex');

    // 4. Comparación en tiempo constante (previene Timing Attacks)
    const sigBufferA = Buffer.from(receivedSignature, 'hex');
    const sigBufferB = Buffer.from(calculatedSignature, 'hex');

    if (sigBufferA.length !== sigBufferB.length || !crypto.timingSafeEqual(sigBufferA, sigBufferB)) {
      return res.status(401).json({
        error: 'Firma criptográfica inválida',
        code: 'SIGNATURE_MISMATCH',
      });
    }

    // Firma validada correctamente
    next();
  } catch (error: any) {
    return res.status(401).json({
      error: `Error al validar firma: ${error.message}`,
      code: 'VERIFICATION_ERROR',
    });
  }
};
