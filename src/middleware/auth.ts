import { Request, Response, NextFunction } from 'express';

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const userId = req.headers['x-user-id'];
  if (userId) {
    if (!req.session) {
      req.session = {} as any;
    }
    req.session.userId = parseInt(userId as string, 10);
    req.session.role = req.headers['x-user-role'] as string;
    next();
  } else if (req.session && req.session.userId) {
    next();
  } else {
    res.status(401).json({ error: 'Non autorisé' });
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const role = (req.headers['x-user-role'] as string) || (req.session && req.session.role);
    if (!role) {
      res.status(401).json({ error: 'Non autorisé' });
      return;
    }
    
    if (roles.includes(role)) {
      next();
    } else {
      res.status(403).json({ error: 'Accès interdit' });
    }
  };
}
