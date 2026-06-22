# Roadmap de livraison — CFAO SAV

Refonte d'une application SAV mono-site (SQLite, HTML statique) en système
professionnel multi-site (PostgreSQL, React). Livraison par phases.

| Phase | Contenu | Statut |
|---|---|---|
| **0 — Socle** | Nettoyage repo, Prisma, config Zod, logger, structure | ✅ Fait |
| **1 — Migration DB** | Schéma PostgreSQL complet + migration `0_init` + seed (6 sites, taxonomie, comptes) | ✅ Fait |
| **2 — RBAC + Auth** | Sessions PostgreSQL, suppression de la faille `x-user-id`, RBAC par rôle + site, validation Zod, couche services/repositories Prisma, rôle ADMIN | ✅ Fait |
| **3 — Workflow + Escalade** | Moteur d'escalade SLA/priorité/hiérarchie (node-cron) + transitions enrichies | ⏳ À venir |
| **4 — NotificationService** | Service email centralisé, templates, `email_logs` | ⏳ À venir |
| **5 — Frontend React** | 6 dashboards par rôle + saisie téléconseillère | ⏳ À venir |
| **6 — KPI Dashboard** | Volume, délai moyen, taux escalade, NPS, top causes, perf/site | ⏳ À venir |
| **7 — IA (optionnel)** | Suggestion catégorie/causes, résumé client | ⏳ À venir |
| **8 — Doc + déploiement** | Doc finale, CI, déploiement Render + Supabase | ⏳ À venir |

## État actuel (fin Phase 2)

**Fait :**
- Stack PostgreSQL/Prisma en place, **SQLite entièrement retiré** (code + dépendances).
- Schéma complet validé, client généré, migration `0_init` versionnée. Rôle **ADMIN** ajouté.
- Seed idempotent : 6 sites, 10 catégories, 9 causes racines, comptes par rôle/site + admin.
- **Architecture en couches** : routes → controllers → services → repositories.
- **Auth sécurisée** par session serveur (store PostgreSQL `connect-pg-simple`), faille
  `x-user-id` supprimée, mots de passe bcrypt.
- **RBAC** par rôle + site (matrice de permissions, portée de visibilité).
- **Validation Zod** stricte sur toutes les entrées + gestion d'erreurs centralisée.
- **Audit log** immuable câblé sur les mutations (login, création/qualif/affectation/statut, users).
- Gestion des **utilisateurs** (admin) et **réclamations** (création, liste filtrée par site,
  détail, qualification, affectation, transitions de statut avec machine à états + SLA).
- Documentation technique (architecture, modèle de données).

**Vérifié :** `prisma validate` ✅, `npm run lint` (TypeScript) ✅, démarrage serveur +
`/api/health` + garde RBAC (401) ✅.

**Reporté aux phases suivantes :**
- Moteur d'escalade automatique (node-cron) → Phase 3.
- `NotificationService` centralisé (emails) → Phase 4. *(Les points d'accroche `TODO`
  sont déjà posés dans `complaintService`.)*
- Frontend React → Phase 5.

## Ce qu'il reste à fournir (côté client)

1. `DATABASE_URL` Supabase → pour lancer `npm run db:migrate` réellement.
2. Identifiants SMTP Brevo (`EMAIL_USER`, `EMAIL_PASS`) + email expéditeur validé.
3. Emails réels des responsables par site (escalade).
4. Validation/ajustement des délais SLA par priorité.
