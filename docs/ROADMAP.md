# Roadmap de livraison — CFAO SAV

Refonte d'une application SAV mono-site (SQLite, HTML statique) en système
professionnel multi-site (PostgreSQL, React). Livraison par phases.

| Phase | Contenu | Statut |
|---|---|---|
| **0 — Socle** | Nettoyage repo, Prisma, config Zod, logger, structure | ✅ Fait |
| **1 — Migration DB** | Schéma PostgreSQL complet + migration `0_init` + seed (6 sites, taxonomie, comptes) | ✅ Fait |
| **2 — RBAC + Auth** | Sessions PostgreSQL, suppression de la faille `x-user-id`, RBAC par rôle + site, validation Zod | ⏳ À venir |
| **3 — Workflow + Escalade** | Machine à états, moteur d'escalade SLA/priorité/hiérarchie (node-cron) | ⏳ À venir |
| **4 — NotificationService** | Service email centralisé, templates, `email_logs` | ⏳ À venir |
| **5 — Frontend React** | 6 dashboards par rôle + saisie téléconseillère | ⏳ À venir |
| **6 — KPI Dashboard** | Volume, délai moyen, taux escalade, NPS, top causes, perf/site | ⏳ À venir |
| **7 — IA (optionnel)** | Suggestion catégorie/causes, résumé client | ⏳ À venir |
| **8 — Doc + déploiement** | Doc finale, CI, déploiement Render + Supabase | ⏳ À venir |

## État actuel (fin Phase 1)

**Fait :**
- Stack PostgreSQL/Prisma en place, SQLite retiré du suivi git.
- Schéma complet validé (`prisma validate` ✅), client généré, migration `0_init` versionnée.
- Seed idempotent : 6 sites, 10 catégories, 9 causes racines, comptes par rôle/site avec hiérarchie.
- Documentation technique initiale (architecture, modèle de données).

**Dette technique connue (à traiter en Phase 2) :**
- Le code hérité (`src/models/*`, `src/controllers/*`, `src/routes/*`) utilise encore
  la couche SQLite et le middleware d'auth non sécurisé. Il sera remplacé par la
  couche services/repositories Prisma. Les dépendances `sqlite`/`sqlite3` seront
  retirées à ce moment-là.

## Ce qu'il reste à fournir (côté client)

1. `DATABASE_URL` Supabase → pour lancer `npm run db:migrate` réellement.
2. Identifiants SMTP Brevo (`EMAIL_USER`, `EMAIL_PASS`) + email expéditeur validé.
3. Emails réels des responsables par site (escalade).
4. Validation/ajustement des délais SLA par priorité.
