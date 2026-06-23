# Architecture — CFAO SAV

## Principe directeur

**Monolithe modulaire** dimensionné pour le volume réel (~1000 réclamations/mois,
soit ~33/jour). Pas de microservices ni de file de messages : à ce volume, ce
serait de la sur-ingénierie. L'accent est mis sur un découpage en couches propre,
testable et évolutif vers le multi-site.

## Couches

```
Requête HTTP
   │
   ▼
[ Routes ]            (src/routes)        définition des endpoints + RBAC
   │
   ▼
[ Controllers ]      (src/controllers)   parse/validate (Zod) → délègue, jamais de logique métier lourde
   │
   ▼
[ Services ]         (src/services)      logique métier : workflow, escalade, NotificationService
   │
   ▼
[ Repositories ]     (src/repositories)  accès données via Prisma (seul endroit qui parle à la DB)
   │
   ▼
[ PostgreSQL ]       (Prisma / Supabase)
```

**Règles d'architecture :**

- Un controller **ne fait jamais** d'envoi d'email directement → il passe par
  `NotificationService` (couche service). *(Exigence du cahier des charges.)*
- Seuls les repositories importent le client Prisma.
- Toute mutation métier écrit dans `audit_logs` (historique immuable).
- La configuration passe exclusivement par `src/lib/env.ts` (validation Zod).

## Modules transverses (`src/lib`)

| Fichier | Rôle |
|---|---|
| `prisma.ts` | Client Prisma singleton |
| `env.ts` | Configuration validée et typée (Zod) + helpers SLA |
| `logger.ts` | Logger structuré (pino) |

## Workflow métier (cible)

```
[NEW] téléconseillère crée le ticket (point d'entrée unique)
   │
   ▼
[QUALIFIED] CRM manager qualifie (catégorie, priorité, causes racines)
   │
   ▼
[ASSIGNED] → [IN_PROGRESS] conseiller SAV / chef d'atelier traitent
   │            │
   │            ├─ [PENDING_PARTS] attente pièces
   │            ▼
   │         [ESCALATED] escalade automatique (voir ci-dessous)
   ▼
[RESOLVED] résolution technique
   │
   ▼
[CLOSED] clôture + déclenchement enquête NPS
```

### Escalade automatique (Phase 3 — fait)

Trois déclencheurs combinés, évalués par un job `node-cron` (intervalle
`ESCALATION_CRON_MINUTES`) :

1. **SLA** — `sla_due_at` dépassé → escalade vers le `manager_id`.
2. **Priorité** — `CRITICAL`/`HIGH` → SLA raccourci, notification immédiate.
3. **Hiérarchique** — remontée niveau N+1 via la chaîne `manager_id`.

Chaque escalade : incrémente `escalation_level`, crée une ligne `escalations`,
notifie par email, journalise dans `audit_logs`.

### SLA par défaut (heures, configurables)

| Priorité | Délai |
|---|---|
| CRITICAL | 4 h |
| HIGH | 24 h |
| MEDIUM | 72 h |
| LOW | 120 h |

## Notifications (NotificationService — Phase 4 — fait)

Service **unique** (`src/services/notificationService.ts`) centralisant tout envoi
d'email (Nodemailer/Brevo). **Aucun controller n'envoie d'email directement.** Émet
sur : création, affectation, changement de statut, escalade, clôture, déclenchement
NPS. Chaque envoi est tracé dans `email_logs` (statut `SENT`/`FAILED` + erreur). Si le
SMTP n'est pas configuré, bascule en **mode simulation** (logs) sans bloquer le workflow.
Templates HTML factorisés dans `src/notifications/templates.ts`.

## Sécurité (Phase 2 — fait)

- **RBAC** par rôle **et** par site (`src/lib/rbac.ts` : matrice de permissions +
  portée de visibilité). Un chef d'atelier / conseiller ne voit que son site.
- Auth par **session serveur** (cookie httpOnly, `sameSite=lax`, `secure` en prod),
  store PostgreSQL (`connect-pg-simple`). Mots de passe **bcrypt**.
  > ✅ L'ancien middleware qui faisait confiance aux en-têtes `x-user-id`
  > (usurpation d'identité) a été **supprimé**.
- Validation backend stricte (**Zod**) sur toutes les entrées + gestion d'erreurs
  centralisée (`src/middleware/errorHandler.ts`).
- `audit_logs` immuable (append-only) alimenté par `auditService` sur chaque mutation.

## Hébergement cible

- **Base / Storage** : Supabase.
- **Application** : Render (ou Railway), déploiement continu depuis GitHub.
- **Emails** : Brevo (SPF/DKIM sur le domaine d'envoi CFAO).
