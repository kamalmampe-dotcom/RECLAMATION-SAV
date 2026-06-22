# Déploiement — CFAO SAV

Architecture cible : **Supabase** (PostgreSQL + Storage) + **Render** (application
Node persistante : API + SPA + escalade cron) + **Brevo** (emails).

---

## 1. Préparer la base Supabase (depuis ta machine)

> À faire une seule fois. Le sandbox de développement ne peut pas joindre Supabase,
> ces commandes se lancent **sur ton poste**.

```bash
git clone <repo> && cd RECLAMATION-SAV
git checkout claude/stoic-clarke-jccgb2
npm install

cp .env.example .env
```

Dans `.env`, renseigne (⚠️ **retire les crochets `[ ]`** autour du mot de passe Supabase) :

```env
DATABASE_URL="postgresql://postgres.<REF>:<MDP>@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.<REF>:<MDP>@aws-0-eu-west-1.pooler.supabase.com:5432/postgres"
SESSION_SECRET="<chaîne aléatoire longue, ex: openssl rand -base64 48>"
```

Applique le schéma puis le jeu de données initial :

```bash
npm run db:deploy     # applique la migration 0_init (via DIRECT_URL)
npm run db:seed       # 6 sites + taxonomie + comptes (mdp: Cfao@Sav2026)
```

Vérifie (optionnel) :

```bash
npm run db:studio     # explore la base
# ou lance l'app en local :
SESSION_STORE=pg ENABLE_JOBS=true npm run dev:all   # UI: http://localhost:5173
```

Connexion : `admin@cfao-sav.cm` / `Cfao@Sav2026` (à changer ensuite).

> 💡 `db:deploy` applique les migrations existantes (production). Utilise
> `npm run db:migrate` seulement si tu modifies le schéma (création de nouvelles
> migrations en développement).

---

## 2. Configurer Brevo (emails)

1. Crée un compte sur https://www.brevo.com.
2. **Vérifie un expéditeur** : *Settings → Senders, Domains & Dedicated IPs → Senders →
   Add a sender*. Pour démarrer **sans domaine**, mets ton **email perso** : Brevo
   envoie un lien de confirmation, clique-le. Cet email devient `EMAIL_FROM`.
3. Récupère les identifiants SMTP : *SMTP & API → SMTP*. Tu obtiens :
   - `EMAIL_HOST=smtp-relay.brevo.com`
   - `EMAIL_PORT=587`
   - `EMAIL_USER=` (le « login » affiché)
   - `EMAIL_PASS=` (la **clé SMTP** à générer)
   - `EMAIL_FROM=` (l'expéditeur vérifié à l'étape 2)
4. **Pour les tests** : mets aussi `TEST_NOTIFICATION_EMAIL=ton@email.com` →
   **tous** les emails (création, statut, escalade, NPS…) arrivent dans ta boîte,
   peu importe les adresses fictives des comptes seedés.

> Alternative test ultra-rapide : SMTP **Gmail** (`smtp.gmail.com:587`) avec un
> **mot de passe d'application** Google. Voir `.env.example`.
>
> Plus tard, pour la production : fais vérifier le **domaine** `sav.cfao.com`
> (SPF/DKIM) par l'IT CFAO pour une délivrabilité optimale.

---

## 3. Déployer sur Render

### Option A — Blueprint (recommandé, via `render.yaml`)

1. Pousse la branche sur GitHub (déjà fait) ; idéalement fusionne dans `main`
   (le blueprint déploie la branche `main`).
2. Sur https://dashboard.render.com → **New → Blueprint** → connecte le dépôt
   GitHub. Render détecte `render.yaml`.
3. Render crée le service `cfao-sav`. Renseigne les variables marquées « secret »
   (`sync: false`) :
   - `DATABASE_URL`, `DIRECT_URL` (Supabase)
   - `APP_URL` → laisse vide pour l'instant (voir étape 5)
   - `EMAIL_HOST`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM`, `TEST_NOTIFICATION_EMAIL`
   - (optionnel IA) `AI_ENABLED=true` + `GEMINI_API_KEY`
4. **Create / Apply** → Render lance le build puis le déploiement.

### Option B — Service Web manuel

1. **New → Web Service** → connecte le dépôt.
2. Runtime **Node**. Build : `npm ci --include=dev && npm run build`.
   Start : `npx prisma migrate deploy && npm start`.
3. Health Check Path : `/api/health`.
4. Ajoute les variables d'environnement (cf. `.env.example`), avec
   `NODE_ENV=production`, `SESSION_STORE=pg`, `ENABLE_JOBS=true`.

### Détails techniques importants

- **`--include=dev`** est requis : les outils de build (vite, esbuild, tsc, prisma
  CLI) sont en `devDependencies`, et Render omet les devDeps par défaut en prod.
- Les **migrations** s'appliquent au démarrage (`prisma migrate deploy`, via
  `DIRECT_URL`).
- Le serveur sert **l'API et le SPA React** (build `dist/`) sur le même domaine.
- **Plan free** : le service s'endort après inactivité → l'escalade `node-cron`
  ne tourne pas en continu. Pour une escalade fiable 24/7, prends un plan payant
  (ou déclenche `POST /api/complaints/ops/escalation-sweep` via un cron externe /
  Supabase `pg_cron`).

---

## 4. CI (GitHub Actions)

`.github/workflows/ci.yml` exécute à chaque push/PR : install, **lint** (TypeScript)
et **build** (front + serveur). Aucune base de données requise.

---

## 5. Après le premier déploiement

1. Récupère l'URL publique Render (ex. `https://cfao-sav.onrender.com`).
2. Mets cette URL dans la variable **`APP_URL`** (liens des emails + cookies) →
   Render redéploie.
3. Teste : ouvre l'URL, connecte-toi en `admin@cfao-sav.cm`, **change les mots de
   passe** des comptes seedés.
4. Crée une réclamation de test → tu dois recevoir les emails sur
   `TEST_NOTIFICATION_EMAIL`.

---

## Récapitulatif des variables d'environnement

| Variable | Où | Obligatoire |
|---|---|---|
| `DATABASE_URL` / `DIRECT_URL` | Supabase | ✅ |
| `SESSION_SECRET` | généré par Render | ✅ |
| `APP_URL` | URL Render | ✅ (après 1er déploiement) |
| `SESSION_STORE=pg`, `ENABLE_JOBS=true`, `NODE_ENV=production` | fixes | ✅ |
| `EMAIL_HOST/USER/PASS/FROM` | Brevo | ⬜ (sinon simulation) |
| `TEST_NOTIFICATION_EMAIL` | ton email | ⬜ (tests) |
| `AI_ENABLED`, `GEMINI_API_KEY` | Google AI | ⬜ (IA) |
