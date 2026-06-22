import { getDb } from './database.js';
import bcrypt from 'bcryptjs';

export class User {
  static async create(user: any) {
    const db = await getDb();
    const hash = await bcrypt.hash(user.mot_de_passe, 10);
    const result = await db.run(
      `INSERT INTO utilisateurs (email, mot_de_passe, nom, role, telephone, service) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [user.email, hash, user.nom, user.role, user.telephone || null, user.service || null]
    );
    return result;
  }

  static async findByEmail(email: string) {
    const db = await getDb();
    return await db.get(`SELECT * FROM utilisateurs WHERE email = ?`, [email]);
  }

  static async findById(id: number) {
    const db = await getDb();
    return await db.get(`SELECT id, email, nom, role, telephone, service, actif FROM utilisateurs WHERE id = ?`, [id]);
  }

  static async getAll() {
    const db = await getDb();
    return await db.all(`SELECT id, email, nom, role, telephone, service, actif, created_at FROM utilisateurs`);
  }

  static async getByRole(role: string) {
    const db = await getDb();
    return await db.all(`SELECT id, email, nom, role, telephone, service, actif FROM utilisateurs WHERE role = ?`, [role]);
  }

  static async comparePassword(password: string, hash: string) {
    return await bcrypt.compare(password, hash);
  }
}
