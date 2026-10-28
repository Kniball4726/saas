import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import routes from './routes/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const createApp = () => {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Servir frontend webapp interactivo
  app.use(express.static(path.join(__dirname, '../public')));

  // Healthcheck
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'crypto-fiat-swap-api', timestamp: new Date().toISOString() });
  });

  // Rutas principales de la API
  app.use('/api', routes);

  return app;
};
