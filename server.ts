import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
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
import kpiRoutes from './src/routes/kpi.js';

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
  app.use('/api/kpi', kpiRoutes);

  // 404 JSON pour les routes /api inconnues
  app.use('/api', notFoundHandler);

  // --- SPA React (build de production) avec fallback côté client ---
  // En dev, l'UI est servie par Vite (npm run dev:web) qui proxifie /api.
  // En prod, le bundle serveur (server.cjs) vit dans dist/ : le front est à côté
  // (currentDir). En dev (tsx), il est dans ./dist. On détecte le bon dossier via
  // la présence d'index.html ET du dossier assets/ (un build, pas l'index source).
  const candidates = [path.join(currentDir, 'dist'), currentDir];
  const distPath = candidates.find(
    (p) => fs.existsSync(path.join(p, 'index.html')) && fs.existsSync(path.join(p, 'assets')),
  );
  if (distPath) {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  // --- Gestion centralisée des erreurs (toujours en dernier) ---
  app.use(errorHandler);

  app.listen(env.PORT, () => {
    logger.info(`Serveur démarré sur http://localhost:${env.PORT} (${env.NODE_ENV})`);
    startEscalationJob();
  });
}

startServer();
