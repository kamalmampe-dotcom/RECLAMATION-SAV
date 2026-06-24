-- Pièces jointes : stockage en base (repli) + chemin de stockage rendu optionnel
ALTER TABLE "attachments" ALTER COLUMN "storage_path" DROP NOT NULL;
ALTER TABLE "attachments" ADD COLUMN "data" BYTEA;

-- Présence : dernière activité de l'utilisateur
ALTER TABLE "users" ADD COLUMN "last_seen_at" TIMESTAMP(3);
