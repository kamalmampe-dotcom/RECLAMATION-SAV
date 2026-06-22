/**
 * Upload de fichiers en mémoire (multer) — relayé ensuite vers Supabase Storage.
 */
import multer from 'multer';

export const uploadSingle = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
}).single('file');
