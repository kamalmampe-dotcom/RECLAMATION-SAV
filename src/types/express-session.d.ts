import 'express-session';
import type { Role } from '@prisma/client';

declare module 'express-session' {
  interface SessionData {
    userId: string;
    email: string;
    role: Role;
    fullName: string;
    siteId: string | null;
  }
}
