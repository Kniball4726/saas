import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
  };
}

export const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  // Si no se envía token, usamos el usuario demo por defecto para facilitar pruebas directas
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = {
      userId: 'demo-user-123',
      email: 'demo@wallet.ar',
    };
    return next();
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as { userId: string; email: string };
    req.user = decoded;
    next();
  } catch (error) {
    // Si el token es inválido o expiró
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
};
