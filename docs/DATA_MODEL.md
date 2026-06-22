# Modèle de données — CFAO SAV (PostgreSQL / Prisma)

Source de vérité : [`prisma/schema.prisma`](../prisma/schema.prisma).
Entité centrale : **Complaint** (Réclamation).

## Vue d'ensemble des relations

```
Site 1──* User                 (rattachement multi-site)
User *──1 User                 (manager_id : hiérarchie d'escalade)
Site 1──* Complaint
User 1──* Complaint            (created_by : toujours une téléconseillère)
User 1──* Complaint            (assigned_to)
Category 1──* Complaint
RepairOrder 1──* Complaint     (OR optionnel)
Complaint *──* RootCause       (via complaint_root_causes : multi-select)
Complaint 1──* StatusHistory
Complaint 1──* Escalation
Complaint 1──1 NpsSurvey
Complaint 1──* InternalNote / Attachment / CorrectiveAction / EmailLog / AuditLog
Complaint *──1 Complaint        (merged_into : fusion de doublons)
```

## Tables principales

### `sites`
Réseau des 6 concessions. `code` unique (DLA, YDE, BAF, BTA, GRA, NGA).

### `users`
`role` (enum), `site_id`, `manager_id` (auto-relation pour l'escalade), `password_hash`.
Rôles : `TELECONSEILLERE`, `CRM_MANAGER`, `CONSEILLER_SAV`, `CHEF_ATELIER`,
`RESPONSABLE_SAV`, `DIRECTION`.

### `complaints` — entité centrale
| Champ | Description |
|---|---|
| `reference` | identifiant lisible unique (ex. `CFAO-SAV-DLA-20260622-001`) |
| `client_name` / `client_phone` / `client_email` | client |
| `vehicle_vin` / `vehicle_plate` / `vehicle_model` / `vehicle_year` / `mileage` | véhicule |
| `category_id` | catégorie normalisée (FK) |
| `priority` | `LOW`/`MEDIUM`/`HIGH`/`CRITICAL` |
| `status` | machine à états (voir ARCHITECTURE.md) |
| `site_id` | site de rattachement (obligatoire) |
| `or_id` | Ordre de Réparation (optionnel) |
| `created_by` | téléconseillère créatrice |
| `assigned_to` | acteur en charge |
| `sla_due_at` / `escalation_level` / `escalated_at` | escalade |
| `merged_into_id` | fusion automatique de doublons |
| `qualified_at` / `resolved_at` / `closed_at` | jalons du cycle de vie |

### Taxonomie normalisée
- `categories` (10) : Delay, Communication, Quality Repair, Parts Availability,
  Billing / Pricing, Customer Service, Infrastructure, Damage / Incident,
  Cleaning, Documentation.
- `root_causes` (9) : délai non respecté, mauvaise réparation, pièce indisponible,
  mauvais diagnostic, mauvais accueil, devis lent, manque de communication,
  véhicule endommagé, nettoyage insuffisant.
- `complaint_root_causes` : liaison N-N (causes racines multiples par réclamation).

### `repair_orders` (OR)
`or_number` unique, `workshop`, `status` (`OPEN`/`IN_PROGRESS`/`CLOSED`), dates,
rattachement `site_id`. Optionnel mais structurant.

### Workflow & traçabilité
- `status_history` : chaque transition (from/to, auteur, commentaire, date).
- `escalations` : motif (`SLA_BREACH`/`PRIORITY`/`HIERARCHICAL`), niveau, destinataire.
- `nps_surveys` : score 0-10, catégorie (`DETRACTOR`/`PASSIVE`/`PROMOTER`), commentaire.

### Notifications & sécurité
- `email_logs` : template, destinataire, sujet, statut (`SENT`/`FAILED`), erreur.
- `audit_logs` : append-only (action, entité, détails JSON, utilisateur, IP).

### Annexes
- `internal_notes` : notes internes avec visibilité (`ALL`/`INTERNAL`/`MANAGEMENT`).
- `attachments` : pièces jointes (chemin Supabase Storage).
- `corrective_actions` : plans d'action (description, responsable, échéance, statut).

## Indexation

Index sur les colonnes de filtrage fréquentes des KPI : `complaints(site_id, status,
priority, assigned_to, category_id, created_at)`, et sur les FK des tables liées.

## KPI dérivés (Phase 6)

| KPI | Calcul |
|---|---|
| Volume réclamations | `count(complaints)` par période / site |
| Délai moyen de résolution | `avg(resolved_at - created_at)` |
| Taux d'escalade | `count(escalation_level > 0) / count(*)` |
| NPS | `%promoters - %detractors` sur `nps_surveys` |
| Top causes racines | `count` via `complaint_root_causes` |
| Performance par site | agrégations groupées par `site_id` |
