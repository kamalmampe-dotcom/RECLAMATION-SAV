/**
 * Upload de fichiers en mémoire (multer) — stocké ensuite en base ou Supabase.
 */
import multer from 'multer';

export const uploadSingle = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
}).single('file');
