/**
 * Stockage des pièces jointes via Supabase Storage.
 * Si la configuration est absente, les fonctions lèvent une erreur explicite
 * (la fonctionnalité est désactivée côté UI via le flag storageEnabled).
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env, isStorageConfigured } from './env.js';
import { badRequest } from './errors.js';

let client: SupabaseClient | null | undefined;

function getClient(): SupabaseClient {
  if (client === undefined) {
    client = isStorageConfigured
      ? createClient(env.SUPABASE_URL as string, env.SUPABASE_SERVICE_ROLE_KEY as string, {
          auth: { persistSession: false },
        })
      : null;
  }
  if (!client) throw badRequest('Le stockage des pièces jointes n\'est pas configuré');
  return client;
}

export const storage = {
  async upload(path: string, body: Buffer, contentType?: string): Promise<void> {
    const { error } = await getClient()
      .storage.from(env.SUPABASE_STORAGE_BUCKET)
      .upload(path, body, { contentType, upsert: false });
    if (error) throw badRequest(`Échec de l'envoi du fichier : ${error.message}`);
  },

  /** URL signée temporaire (téléchargement). */
  async signedUrl(path: string, expiresInSeconds = 300): Promise<string> {
    const { data, error } = await getClient()
      .storage.from(env.SUPABASE_STORAGE_BUCKET)
      .createSignedUrl(path, expiresInSeconds);
    if (error || !data) throw badRequest(`Échec de génération du lien : ${error?.message ?? 'inconnu'}`);
    return data.signedUrl;
  },

  async remove(path: string): Promise<void> {
    await getClient().storage.from(env.SUPABASE_STORAGE_BUCKET).remove([path]);
  },
};
