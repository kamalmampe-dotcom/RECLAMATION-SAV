import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import { env } from './src/lib/env.js';
import { logger } from './src/lib/logger.js';
import { buildSessionMiddleware } from './src/lib/session.js';
import { errorHandler, notFoundHandler } from './src/middleware/errorHandler.js';
import { startEscalationJob } from './src/jobs/escalationJob.js';

import authRoutes from './src/routes/auth.js';
import userRoutes from './src/routes/users.js';
import complaintRoutes from './src/routes/complaints.js';
import referenceRoutes from './src/routes/reference.js';

const currentDir =
  typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

function startServer() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(cors({ origin: env.APP_URL, credentials: true }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(buildSessionMiddleware());

  // --- API ---
  app.get('/api/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/complaints', complaintRoutes);
  app.use('/api/reference', referenceRoutes);

  // 404 JSON pour les routes /api inconnues
  app.use('/api', notFoundHandler);

  // --- Front statique hérité (remplacé par le SPA React en Phase 5) ---
  const publicPath = path.join(currentDir, 'src/public');
  app.use(express.static(publicPath));
  app.get('/', (_req, res) => res.sendFile(path.join(publicPath, 'views/login.html')));

  // --- Gestion centralisée des erreurs (toujours en dernier) ---
  app.use(errorHandler);

  app.listen(env.PORT, () => {
    logger.info(`Serveur démarré sur http://localhost:${env.PORT} (${env.NODE_ENV})`);
    startEscalationJob();
  });
}

startServer();
