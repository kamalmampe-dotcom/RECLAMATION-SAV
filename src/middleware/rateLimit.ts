/**
 * Limiteurs de débit (anti brute-force) basés sur express-rate-limit.
 */
import rateLimit from 'express-rate-limit';

/** Connexion : limite les tentatives par IP pour freiner le brute-force. */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Trop de tentatives de connexion. Réessayez dans quelques minutes.' },
});
