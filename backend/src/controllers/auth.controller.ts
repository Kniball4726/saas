import { Request, Response } from 'express';
import { authService } from '../services/auth.service.js';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';

export class AuthController {
  /**
   * Registro con correo y contraseña
   */
  public static async register(req: Request, res: Response) {
    try {
      const { email, password, firstName, lastName, cuitDni, pin } = req.body;
      const result = await authService.register({
        email,
        password,
        firstName,
        lastName,
        cuitDni,
        pin,
      });
      return res.status(201).json(result);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  /**
   * Inicio de sesión con correo y contraseña
   */
  public static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Debes ingresar email y contraseña' });
      }
      const result = await authService.login(email, password);
      return res.json(result);
    } catch (error: any) {
      return res.status(401).json({ error: error.message });
    }
  }

  /**
   * Inicio de sesión o registro con Google
   */
  public static async loginWithGoogle(req: Request, res: Response) {
    try {
      const { idToken, email, name, picture } = req.body;
      const result = await authService.loginWithGoogle({
        idToken: idToken || 'mock-google-token',
        email,
        name,
        picture,
      });
      return res.json(result);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  /**
   * Inicio de sesión o registro con Apple
   */
  public static async loginWithApple(req: Request, res: Response) {
    try {
      const { identityToken, email, fullName } = req.body;
      const result = await authService.loginWithApple({
        identityToken: identityToken || 'mock-apple-token',
        email,
        fullName,
      });
      return res.json(result);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  /**
   * Perfil del usuario autenticado
   */
  public static async getProfile(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const profile = authService.getProfile(userId);
      return res.json(profile);
    } catch (error: any) {
      return res.status(404).json({ error: error.message });
    }
  }

  /**
   * Validación de PIN transaccional de 6 dígitos (Step-Up Auth)
   */
  public static async verifyPin(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const { pin } = req.body;
      if (!pin) {
        return res.status(400).json({ error: 'Debes ingresar el PIN de 6 dígitos' });
      }
      const isValid = authService.verifyPin(userId, String(pin));
      if (!isValid) {
        return res.status(403).json({ valid: false, error: 'PIN de seguridad incorrecto' });
      }
      return res.json({ valid: true, message: 'PIN verificado correctamente' });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }
}
