# Cobail Auto - SAV & Réclamations

Application complète de gestion des réclamations clients pour la société Cobail Auto.

## Stack Technique
- Backend: Node.js, Express
- Base de données: SQLite
- Frontend: HTML/CSS/JS (Vanilla)
- Authentification: express-session (Cookies) + bcryptjs
- Notifications: Nodemailer

## Scripts
- \`npm run init\` : Initialise la base de données et crée les 6 comptes par défaut.
- \`npm run dev\` : Démarre le serveur en mode développement (sur le port 3000).
- \`npm run build\` : Compile le serveur pour la production.

## Comptes Pré-définis
- **Call Center**: \`callcenter@cobail-auto.fr\` / \`CallC0b@il2024\`
- **Chef Atelier**: \`chef.atelier@cobail-auto.fr\` / \`ChefAt3lier@2024\`
- **Conseiller SAV**: \`conseiller.sav@cobail-auto.fr\` / \`SAV-C0ns3iller#2024\`
- **Garantie**: \`garantie@cobail-auto.fr\` / \`G@rantieC0b@il2024\`
- **Relation Client (CSI)**: \`csi@cobail-auto.fr\` / \`CS1-C0b@il@2024\`
- **Direction**: \`direction@cobail-auto.fr\` / \`D1rection@C0b@il2024\`

## Démarrage rapide
L'application est lancée et exposera les pages web à la racine (ex: \`/\`) et l'API sous \`/api/\`. Le port de développement par défaut est 3000.
