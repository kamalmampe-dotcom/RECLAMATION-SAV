/**
 * Middleware de session Express.
 * - Production : store PostgreSQL (connect-pg-simple), table créée si absente.
 * - Développement : store mémoire par défaut (boot sans base) ; PostgreSQL si
 *   SESSION_STORE=pg.
 */
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { env } from './env.js';
import { logger } from './logger.js';

export function buildSessionMiddleware() {
  const usePg = env.NODE_ENV === 'production' || process.env.SESSION_STORE === 'pg';

  let store: session.Store | undefined;
  if (usePg) {
    const PgStore = connectPgSimple(session);
    store = new PgStore({
      conString: env.DATABASE_URL,
      tableName: 'user_sessions',
      createTableIfMissing: true,
    });
    logger.info('Sessions : store PostgreSQL');
  } else {
    logger.warn('Sessions : store mémoire (développement). Définir SESSION_STORE=pg pour PostgreSQL.');
  }

  return session({
    store,
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 h
    },
  });
}
