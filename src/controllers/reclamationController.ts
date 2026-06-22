import { Request, Response } from 'express';
import { Reclamation } from '../models/Reclamation.js';
import { Historique } from '../models/Historique.js';
import { getDb } from '../models/database.js';

export const create = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await Reclamation.create(req.body, req.session.userId!);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

export const list = async (req: Request, res: Response): Promise<void> => {
  try {
    const role = req.session.role;
    let items: any[] = [];
    
    if (role === 'conseiller_sav') {
      items = await Reclamation.getByUser(req.session.userId!);
    } else {
      items = await Reclamation.getAll();
      if (role === 'garantie') {
        items = items.filter(i => i.transfert_garantie);
      }
      if (role === 'csi') {
        items = items.filter(i => i.statut === 'cloture_technique');
      }
    }
    
    res.json(items);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

export const getById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const rec = await Reclamation.findById(id);
    if (!rec) {
      res.status(404).json({ error: 'Non trouvé' });
      return;
    }
    const historique = await Historique.getByReclamationId(id);
    const db = await getDb();
    const notes = await db.all(`SELECT n.*, u.nom as user_nom FROM notes_internes n JOIN utilisateurs u ON n.utilisateur_id = u.id WHERE n.reclamation_id = ? ORDER BY n.created_at DESC`, [id]);
    const fichiers = await db.all(`SELECT * FROM fichiers WHERE reclamation_id = ?`, [id]);
    const actions = await Reclamation.getActionsCorrectives(id);
    
    res.json({ reclamation: rec, historique, notes, fichiers, actions_correctives: actions });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

export const affecter = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const { conseillerId } = req.body;
    await Reclamation.affecter(id, conseillerId, req.session.userId!);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

export const updateStatut = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const { statut } = req.body;
    await Reclamation.updateStatut(id, statut, req.session.userId!);
    
    // Optional: check for CSI score / comment if given
    if (statut === 'cloture' && req.body.score_csi) {
      const db = await getDb();
      await db.run(`UPDATE reclamations SET score_csi = ?, commentaire_client = ? WHERE id = ?`, [req.body.score_csi, req.body.commentaire_client, id]);
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

export const addNote = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const { note, visible_pour } = req.body;
    await Reclamation.ajouterNote(id, req.session.userId!, note, visible_pour);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

export const uploadFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    if (!req.file) {
      res.status(400).json({ success: false, message: 'Aucun fichier' });
      return;
    }
    const f = {
      nom: req.file.originalname,
      chemin: '/uploads/' + req.file.filename,
      type: req.file.mimetype.startsWith('image/') ? 'image' : 'document',
      taille: req.file.size
    };
    await Reclamation.ajouterFichier(id, req.session.userId!, f);
    res.json({ success: true, fichier: f });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

export const getFiles = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const db = await getDb();
    const fichiers = await db.all(`SELECT * FROM fichiers WHERE reclamation_id = ?`, [id]);
    res.json(fichiers);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

export const getStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb();
    const total = await db.get(`SELECT COUNT(*) as c FROM reclamations`);
    const byStatus = await db.all(`SELECT statut, COUNT(*) as c FROM reclamations GROUP BY statut`);
    const csi = await db.get(`SELECT AVG(score_csi) as avg FROM reclamations WHERE score_csi IS NOT NULL`);
    res.json({ total: total.c, byStatus, avgCSI: csi.avg });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

export const updateDetailed = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    await Reclamation.updateFields(id, req.body, req.session.userId!);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

export const createActionCorrective = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const { description, responsable, date_echeance } = req.body;
    await Reclamation.ajouterActionCorrective(id, description, responsable, date_echeance, req.session.userId!);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

export const updateActionCorrective = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const actionId = parseInt(req.params.actionId);
    const { statut } = req.body;
    await Reclamation.updateActionCorrectiveStatut(actionId, statut, id, req.session.userId!);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};
