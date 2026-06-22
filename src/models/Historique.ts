import { getDb } from './database.js';

export class Historique {
  static async log(action: string, reclamation_id: number, utilisateur_id: number, details: string = '') {
    const db = await getDb();
    await db.run(
      `INSERT INTO historique (reclamation_id, utilisateur_id, action, details) VALUES (?, ?, ?, ?)`,
      [reclamation_id, utilisateur_id, action, details]
    );
  }

  static async getByReclamationId(reclamation_id: number) {
    const db = await getDb();
    return db.all(
      `SELECT h.*, u.nom as utilisateur_nom, u.role as utilisateur_role 
       FROM historique h
       JOIN utilisateurs u ON h.utilisateur_id = u.id
       WHERE h.reclamation_id = ? ORDER BY h.created_at DESC`,
      [reclamation_id]
    );
  }
}
