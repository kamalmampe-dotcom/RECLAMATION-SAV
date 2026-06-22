# CFAO Automotive — SAV / Gestion des Réclamations

Système professionnel de gestion des réclamations clients pour le réseau de
concessions automobiles CFAO au Cameroun (Douala, Yaoundé, Bafoussam, Bertoua,
Garoua, Ngaoundéré). Volume cible : ~1000 réclamations / mois.

> ⚙️ Refonte en cours. Stack cible : **PostgreSQL (Supabase) + Express/TypeScript
> + Prisma + React/Vite**. Voir [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) et
> [`docs/ROADMAP.md`](docs/ROADMAP.md) pour l'avancement par phases.

## Stack technique

| Couche | Technologie |
|---|---|
| Base de données | PostgreSQL (Supabase) |
| ORM / migrations | Prisma |
| Backend | Node.js, Express, TypeScript |
| Validation | Zod |
| Auth | express-session (store PostgreSQL) + bcrypt — *RBAC en Phase 2* |
| Emails | Nodemailer via Brevo (SMTP) — `NotificationService` centralisé |
| Pièces jointes | Supabase Storage |
| Frontend | React + Vite + TypeScript + Tailwind (+ Recharts pour les KPI) |
| Escalade SLA | node-cron |
| Logs | pino + table `email_logs` + `audit_logs` |
| IA (option) | Gemini (classification / suggestions) |

## Prérequis

- Node.js **20+** (testé sous Node 22)
- Un projet **Supabase** (PostgreSQL) — ou un PostgreSQL local
- Un compte **Brevo** pour l'envoi d'emails (optionnel en dev : mode simulation)

## Démarrage

```bash
# 1. Dépendances
npm install

# 2. Configuration
cp .env.example .env
#   -> renseigner DATABASE_URL (Supabase), SESSION_SECRET, EMAIL_* (Brevo)

# 3. Base de données : appliquer le schéma + jeu de données initial
npm run db:migrate      # crée les tables (migrations Prisma)
npm run db:seed         # 6 sites + taxonomie + comptes par défaut

# 4. Lancer
npm run dev             # http://localhost:3000
```

### Scripts utiles

| Script | Rôle |
|---|---|
| `npm run dev` | Serveur de développement (hot-reload) |
| `npm run db:migrate` | Crée/applique les migrations Prisma (dev) |
| `npm run db:deploy` | Applique les migrations (production) |
| `npm run db:seed` | Sites + catégories + causes racines + comptes |
| `npm run db:studio` | Explorateur de base de données Prisma |
| `npm run lint` | Vérification TypeScript |
| `npm run build` | Build de production |

## Comptes par défaut (après `db:seed`)

Mot de passe par défaut : `Cfao@Sav2026` (à changer en production via `SEED_DEFAULT_PASSWORD`).

| Rôle | Email |
|---|---|
| **Admin (système)** | `admin@cfao-sav.cm` |
| Direction | `direction@cfao-sav.cm` |
| Responsable SAV | `responsable.sav@cfao-sav.cm` |
| CRM Manager | `crm.manager@cfao-sav.cm` |
| Téléconseillère (par site) | `tc.dla@cfao-sav.cm`, `tc.yde@cfao-sav.cm`, … |
| Chef d'atelier (par site) | `chef.dla@cfao-sav.cm`, `chef.yde@cfao-sav.cm`, … |
| Conseiller SAV (par site) | `conseiller.dla@cfao-sav.cm`, … |

Codes sites : `dla` (Douala), `yde` (Yaoundé), `baf` (Bafoussam), `bta` (Bertoua),
`gra` (Garoua), `nga` (Ngaoundéré).

## API (état actuel)

Auth par session (cookie). Toutes les routes `/api/*` (hors `auth/login` et `health`)
exigent une session ; les actions sont filtrées par RBAC (rôle + site).

| Méthode | Endpoint | Permission |
|---|---|---|
| `GET` | `/api/health` | public |
| `POST` | `/api/auth/login` | public |
| `POST` | `/api/auth/logout` | authentifié |
| `GET` | `/api/auth/me` | authentifié |
| `GET` | `/api/reference/{sites,categories,root-causes}` | authentifié |
| `GET/POST` | `/api/users` · `PATCH /api/users/:id` | ADMIN |
| `GET/POST` | `/api/complaints` | view / create |
| `GET` | `/api/complaints/:id` | view (scopé site) |
| `PATCH` | `/api/complaints/:id/qualify` | CRM_MANAGER |
| `PATCH` | `/api/complaints/:id/assign` | CHEF_ATELIER / RESPONSABLE_SAV |
| `PATCH` | `/api/complaints/:id/status` | CONSEILLER_SAV / … |
| `POST` | `/api/complaints/ops/escalation-sweep` | ADMIN / DIRECTION / RESPONSABLE_SAV |

Notifications email automatiques (via `NotificationService`, journalisées dans
`email_logs`) sur : création, affectation, changement de statut, escalade, clôture, NPS.
Escalade automatique par `node-cron` (`ENABLE_JOBS=true`).

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — architecture applicative
- [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md) — modèle de données détaillé
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — plan de livraison par phases
