# Roadmap de livraison — CFAO SAV

Refonte d'une application SAV mono-site (SQLite, HTML statique) en système
professionnel multi-site (PostgreSQL, React). Livraison par phases.

| Phase | Contenu | Statut |
|---|---|---|
| **0 — Socle** | Nettoyage repo, Prisma, config Zod, logger, structure | ✅ Fait |
| **1 — Migration DB** | Schéma PostgreSQL complet + migration `0_init` + seed (6 sites, taxonomie, comptes) | ✅ Fait |
| **2 — RBAC + Auth** | Sessions PostgreSQL, suppression de la faille `x-user-id`, RBAC par rôle + site, validation Zod, couche services/repositories Prisma, rôle ADMIN | ✅ Fait |
| **3 — Workflow + Escalade** | Moteur d'escalade SLA/priorité/hiérarchie (node-cron) + transitions enrichies | ✅ Fait |
| **4 — NotificationService** | Service email centralisé, templates, `email_logs` | ✅ Fait |
| **5 — Frontend React** | SPA React (auth, console réclamations, admin), navigation par rôle | ✅ Fait |
| **6 — KPI Dashboard** | Volume, délai moyen, taux escalade, NPS, top causes, perf/site | ✅ Fait |
| **7 — IA (optionnel)** | Suggestion catégorie/causes/priorité + résumé client | ✅ Fait |
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
- Déploiement (Render + Supabase) + CI → Phase 8.

## État Phases 6 & 7 (KPI + IA)

**Phase 6 — KPI Dashboard :**
- `kpiService` (agrégations Prisma + SQL) : volume, **délai moyen de résolution**,
  **taux d'escalade**, **NPS** (promoteurs/passifs/détracteurs), **top causes
  racines**, **performance par site**, distribution des statuts, volume mensuel.
- Endpoint `GET /api/kpi/overview?days=&siteId=` (réservé ADMIN/DIRECTION/RESPONSABLE_SAV).
- Page **Pilotage** (React + Recharts) : cartes + graphiques, filtre de période.
  Chargée en lazy (code-splitting) pour alléger le bundle initial.

**Phase 7 — IA (optionnel) :**
- `aiService` (Gemini, derrière `AI_ENABLED` + `GEMINI_API_KEY`) : classification
  d'une réclamation → **catégorie + causes racines + priorité + résumé**, contrainte
  à la **taxonomie normalisée** (codes en base), mappée sur les IDs.
- Endpoint `POST /api/complaints/:id/ai-suggest` (réservé qualification).
- Flag exposé via `GET /api/reference/config` ; bouton **« ✨ Suggérer (IA) »**
  dans le panneau de qualification (pré-remplit catégorie/priorité/causes + résumé).

## État Phase 5 (frontend React)

- SPA **React + Vite + TypeScript + Tailwind + React Query** sous `src/web/`.
- **Auth** : contexte d'authentification, page de connexion, routes protégées,
  navigation filtrée par rôle (sidebar).
- **Console réclamations** : liste filtrable (statut/priorité), création
  (téléconseillère), détail avec actions selon le rôle (qualification +
  catégorie/priorité/causes racines, affectation d'un conseiller, transitions de
  statut via la machine à états), historique et escalades.
- **Tableau de bord** : synthèse rapide (KPI complets en Phase 6).
- **Administration** (ADMIN) : liste/création/activation des utilisateurs.
- Dev : `npm run dev:all` (Express + Vite proxy). Prod : Express sert le build
  React (`dist/`) avec fallback SPA.
- Vérifié : `npm run lint` ✅, `vite build` ✅, bundle serveur ✅, SPA + API servis ✅.

## État Phases 3 & 4 (escalade + notifications)

**Phase 3 — Escalade automatique :**
- `escalationService` : escalade unitaire (incrémente le niveau, repousse le SLA,
  crée une ligne `escalations`, notifie, audite).
- Résolution du destinataire par remontée de la chaîne `manager_id`, repli
  responsable SAV → direction. Niveau plafonné à 3.
- Trois déclencheurs : **SLA** (balayage `node-cron` toutes les `ESCALATION_CRON_MINUTES`),
  **priorité** (alerte immédiate HIGH/CRITICAL à la qualification), **hiérarchique**
  (mécanisme de remontée).
- Endpoint de supervision : `POST /api/complaints/ops/escalation-sweep`.

**Phase 4 — NotificationService centralisé :**
- Service **unique** (`notificationService`) : aucun controller n'envoie d'email.
- Emails sur : **création**, **affectation**, **changement de statut**, **escalade**,
  **clôture**, **déclenchement NPS**.
- Transport Nodemailer/Brevo (`src/lib/mailer.ts`) ; **mode simulation** si SMTP absent.
- **Chaque envoi journalisé** dans `email_logs` (SENT/FAILED + erreur).
- Templates HTML factorisés (`src/notifications/templates.ts`).
- NPS : `NpsSurvey` créée à la clôture + email d'enquête envoyé.

## Ce qu'il reste à fournir (côté client)

1. `DATABASE_URL` Supabase → pour lancer `npm run db:migrate` réellement.
2. Identifiants SMTP Brevo (`EMAIL_USER`, `EMAIL_PASS`) + email expéditeur validé.
3. Emails réels des responsables par site (escalade).
4. Validation/ajustement des délais SLA par priorité.
