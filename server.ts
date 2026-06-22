import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Helper to get __dirname
let currentDir: string;
if (typeof __dirname !== 'undefined') {
  currentDir = __dirname;
} else {
  // @ts-ignore
  currentDir = path.dirname(fileURLToPath(import.meta.url));
}

// @ts-ignore

import authRoutes from './src/routes/auth.js';
// @ts-ignore
import reclamationRoutes from './src/routes/reclamations.js';

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  // Make sure upload dir exists
  const uploadDir = path.join(currentDir, 'public/uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  app.set('trust proxy', 1);

  app.use(session({
    secret: process.env.SESSION_SECRET || 'supersecretcobail2024',
    resave: false,
    saveUninitialized: false,
    cookie: { 
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/reclamations', reclamationRoutes);

  // Serve static UI from src/public
  const publicPath = path.join(currentDir, 'src/public');
  app.use(express.static(publicPath));
  
  // Also static for public uploads
  app.use('/public/uploads', express.static(uploadDir));
  app.use('/uploads', express.static(uploadDir));

  app.get('/', (req, res) => {
    res.sendFile(path.join(publicPath, 'views/login.html'));
  });

  app.get('/:page', (req, res, next) => {
    const page = req.params.page;
    if (page.startsWith('dashboard') || page === 'login') {
      res.sendFile(path.join(publicPath, `views/${page}.html`));
    } else {
      next();
    }
  });

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
