import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';

let db: Database | null = null;

export async function getDb() {
  if (db) return db;
  
  db = await open({
    filename: process.env.DB_PATH || './reclamations.db',
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS utilisateurs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      mot_de_passe TEXT NOT NULL,
      nom TEXT NOT NULL,
      role TEXT NOT NULL,
      telephone TEXT,
      service TEXT,
      actif INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS reclamations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      numero TEXT UNIQUE NOT NULL,
      client_nom TEXT NOT NULL,
      client_telephone TEXT NOT NULL,
      client_email TEXT,
      plaque_immatriculation TEXT NOT NULL,
      vin TEXT NOT NULL,
      modele_vehicule TEXT,
      annee_vehicule INTEGER,
      kilometrage INTEGER,
      type_probleme TEXT,
      motif TEXT NOT NULL,
      description TEXT NOT NULL,
      urgence TEXT DEFAULT 'moyen',
      statut TEXT DEFAULT 'nouveau',
      utilisateur_id INTEGER,
      service_actuel TEXT DEFAULT 'sav',
      transfert_garantie BOOLEAN DEFAULT 0,
      date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,
      date_affectation DATETIME,
      date_resolution DATETIME,
      date_cloture DATETIME,
      score_csi INTEGER CHECK(score_csi BETWEEN 1 AND 5),
      commentaire_client TEXT,
      categorie TEXT,
      garantie_statut TEXT DEFAULT 'en_attente',
      analyse_racine TEXT,
      date_circulation TEXT,
      FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id)
    );

    CREATE TABLE IF NOT EXISTS historique (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reclamation_id INTEGER NOT NULL,
      utilisateur_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (reclamation_id) REFERENCES reclamations(id),
      FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id)
    );

    CREATE TABLE IF NOT EXISTS notes_internes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reclamation_id INTEGER NOT NULL,
      utilisateur_id INTEGER NOT NULL,
      note TEXT NOT NULL,
      visible_pour TEXT DEFAULT 'tous',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (reclamation_id) REFERENCES reclamations(id),
      FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id)
    );

    CREATE TABLE IF NOT EXISTS fichiers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reclamation_id INTEGER NOT NULL,
      nom_fichier TEXT NOT NULL,
      chemin_fichier TEXT NOT NULL,
      type_fichier TEXT,
      taille INTEGER,
      uploaded_by INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (reclamation_id) REFERENCES reclamations(id),
      FOREIGN KEY (uploaded_by) REFERENCES utilisateurs(id)
    );

    CREATE TABLE IF NOT EXISTS actions_correctives (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reclamation_id INTEGER NOT NULL,
      description TEXT NOT NULL,
      responsable TEXT NOT NULL,
      date_echeance TEXT,
      statut TEXT DEFAULT 'en_attente',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (reclamation_id) REFERENCES reclamations(id)
    );
  `);

  // Safe migrations for existing databases
  try { await db.exec(`ALTER TABLE reclamations ADD COLUMN categorie TEXT;`); } catch(e){}
  try { await db.exec(`ALTER TABLE reclamations ADD COLUMN garantie_statut TEXT DEFAULT 'en_attente';`); } catch(e){}
  try { await db.exec(`ALTER TABLE reclamations ADD COLUMN analyse_racine TEXT;`); } catch(e){}
  try { await db.exec(`ALTER TABLE reclamations ADD COLUMN date_circulation TEXT;`); } catch(e){}

  return db;
}
