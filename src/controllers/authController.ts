import { Request, Response } from 'express';
import { User } from '../models/User.js';

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    const user = await User.findByEmail(email);
    
    if (!user) {
      res.status(401).json({ success: false, message: 'Email ou mot de passe incorrect' });
      return;
    }

    const match = await User.comparePassword(password, user.mot_de_passe);
    if (!match) {
      res.status(401).json({ success: false, message: 'Email ou mot de passe incorrect' });
      return;
    }

    req.session.userId = user.id;
    req.session.email = user.email;
    req.session.role = user.role;
    req.session.nom = user.nom;

    let redirectUrl = '/dashboard-callcenter';
    if (user.role === 'chef_atelier') redirectUrl = '/dashboard-chef';
    if (user.role === 'conseiller_sav') redirectUrl = '/dashboard-conseiller';
    if (user.role === 'garantie') redirectUrl = '/dashboard-garantie';
    if (user.role === 'csi') redirectUrl = '/dashboard-csi';
    if (user.role === 'direction') redirectUrl = '/dashboard-direction';

    res.json({ success: true, redirectUrl, user: { id: user.id, nom: user.nom, role: user.role } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

export const logout = (req: Request, res: Response): void => {
  req.session.destroy(() => {
    res.json({ success: true, redirectUrl: '/login' });
  });
};

export const getMe = async (req: Request, res: Response): Promise<void> => {
  if (req.session.userId) {
    const user = await User.findById(req.session.userId);
    res.json({ success: true, user });
  } else {
    res.status(401).json({ success: false });
  }
};
