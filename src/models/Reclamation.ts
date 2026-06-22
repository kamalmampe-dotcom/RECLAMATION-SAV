import { getDb } from './database.js';
import { generateNumeroReclamation } from '../utils/helpers.js';
import { Historique } from './Historique.js';
import { 
  sendNewReclamationNotification, 
  sendAssignmentNotification, 
  sendStatusChangeNotification 
} from '../utils/emailService.js';

export class Reclamation {
  static async create(data: any, userId: number) {
    const db = await getDb();
    
    const countRow = await db.get(`SELECT COUNT(*) as count FROM reclamations WHERE date_creation >= date('now')`);
    const numero = generateNumeroReclamation(countRow ? countRow.count : 0);

    const result = await db.run(
      `INSERT INTO reclamations (
        numero, client_nom, client_telephone, client_email, 
        plaque_immatriculation, vin, modele_vehicule, annee_vehicule, 
        kilometrage, type_probleme, motif, description, urgence, type_garantie, date_circulation
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        numero, data.client_nom, data.client_telephone, data.client_email,
        data.plaque_immatriculation, data.vin, data.modele_vehicule, data.annee_vehicule,
        data.kilometrage, data.type_probleme, data.motif, data.description, data.urgence || 'moyen',
        data.type_garantie || null, data.date_circulation || null
      ]
    );

    const id = result.lastID;
    if (id) {
       await Historique.log('creation', id, userId, `Création de la réclamation ${numero}`);
       // Trigger email notification
       sendNewReclamationNotification(numero, data).catch(console.error);
    }
    return { id, numero };
  }

  static async findById(id: number) {
    const db = await getDb();
    const rec = await db.get(`
      SELECT r.*, u.nom as conseiller_nom 
      FROM reclamations r
      LEFT JOIN utilisateurs u ON r.utilisateur_id = u.id
      WHERE r.id = ?`, [id]);
    return rec;
  }

  static async getAll(filterStats?: any) {
    const db = await getDb();
    return db.all(`
      SELECT r.*, u.nom as conseiller_nom 
      FROM reclamations r
      LEFT JOIN utilisateurs u ON r.utilisateur_id = u.id
      ORDER BY r.date_creation DESC
    `);
  }

  static async getByUser(userId: number) {
    const db = await getDb();
    return db.all(`
      SELECT * FROM reclamations 
      WHERE utilisateur_id = ? 
      ORDER BY date_creation DESC`, [userId]);
  }

  static async updateStatut(id: number, statut: string, userId: number) {
    const db = await getDb();
    
    let query = `UPDATE reclamations SET statut = ?`;
    const params: any[] = [statut];

    if (statut === 'resolu' || statut === 'cloture_technique') {
      query += `, date_resolution = CURRENT_TIMESTAMP`;
    } else if (statut === 'cloture') {
      query += `, date_cloture = CURRENT_TIMESTAMP`;
    }

    query += ` WHERE id = ?`;
    params.push(id);

    await db.run(query, params);
    await Historique.log('changement_statut', id, userId, `Nouveau statut: ${statut}`);

    // Trigger status change alert (e.g. Technical Closure triggers CSI team alert)
    try {
      const rec = await db.get(`SELECT * FROM reclamations WHERE id = ?`, [id]);
      if (rec && rec.numero) {
        sendStatusChangeNotification(rec.numero, statut, rec).catch(console.error);
      }
    } catch (err) {
      console.error('Error fetching reclamation for status change email:', err);
    }
  }

  static async affecter(id: number, conseillerId: number, userId: number) {
    const db = await getDb();
    
    try {
      const userRow = await db.get(`SELECT email, nom FROM utilisateurs WHERE id = ?`, [conseillerId]);
      const recRow = await db.get(`SELECT * FROM reclamations WHERE id = ?`, [id]);

      await db.run(
        `UPDATE reclamations SET utilisateur_id = ?, statut = 'en_cours', date_affectation = CURRENT_TIMESTAMP WHERE id = ?`,
        [conseillerId, id]
      );
      await Historique.log('affectation', id, userId, `Affectée au conseiller ID: ${conseillerId}`);

      if (userRow && recRow) {
        sendAssignmentNotification(recRow.numero, userRow.email, userRow.nom, recRow).catch(console.error);
      }
    } catch (err) {
      console.error('Error in affecter email notification:', err);
    }
  }

  static async ajouterNote(id: number, userId: number, note: string, visible_pour: string = 'tous') {
    const db = await getDb();
    await db.run(
      `INSERT INTO notes_internes (reclamation_id, utilisateur_id, note, visible_pour) VALUES (?, ?, ?, ?)`,
      [id, userId, note, visible_pour]
    );
    await Historique.log('note', id, userId, `Ajout d'une note interne`);
  }

  static async ajouterFichier(id: number, userId: number, f: any) {
    const db = await getDb();
    await db.run(
      `INSERT INTO fichiers (reclamation_id, nom_fichier, chemin_fichier, type_fichier, taille, uploaded_by) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, f.nom, f.chemin, f.type, f.taille, userId]
    );
    await Historique.log('upload_fichier', id, userId, `Fichier uploadé: ${f.nom}`);
  }

  static async updateFields(id: number, fields: any, userId: number) {
    const db = await getDb();
    const keys = Object.keys(fields).filter(k => k !== 'id');
    if (keys.length === 0) return;

    const setClause = keys.map(k => `${k} = ?`).join(', ');
    const values = keys.map(k => fields[k]);
    values.push(id);

    await db.run(`UPDATE reclamations SET ${setClause} WHERE id = ?`, values);
    for (const key of keys) {
      await Historique.log('modification', id, userId, `Modification du champ ${key} : ${fields[key]}`);
    }

    // Capture warranty transfers
    if (fields.transfert_garantie == 1 || fields.transfert_garantie === true) {
      try {
        const rec = await db.get(`SELECT * FROM reclamations WHERE id = ?`, [id]);
        if (rec) {
          sendStatusChangeNotification(rec.numero, rec.statut, rec, true).catch(console.error);
        }
      } catch (err) {
        console.error('Error sending warranty notification:', err);
      }
    }
  }

  static async ajouterActionCorrective(id: number, desc: string, resp: string, dateEcheance: string, userId: number) {
    const db = await getDb();
    await db.run(
      `INSERT INTO actions_correctives (reclamation_id, description, responsable, date_echeance) VALUES (?, ?, ?, ?)`,
      [id, desc, resp, dateEcheance]
    );
    await Historique.log('action_corrective_creation', id, userId, `Plan d'action créé : ${desc} (Responsable: ${resp})`);
  }

  static async getActionsCorrectives(id: number) {
    const db = await getDb();
    return await db.all(`SELECT * FROM actions_correctives WHERE reclamation_id = ? ORDER BY created_at DESC`, [id]);
  }

  static async updateActionCorrectiveStatut(actionId: number, statut: string, id: number, userId: number) {
    const db = await getDb();
    await db.run(`UPDATE actions_correctives SET statut = ? WHERE id = ?`, [statut, actionId]);
    await Historique.log('action_corrective_status', id, userId, `Statut action corrective #${actionId} mis à jour : ${statut}`);
  }
}

