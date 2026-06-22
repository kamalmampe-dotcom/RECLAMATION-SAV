import { User } from '../models/User.js';
import { getDb } from '../models/database.js';

const comptes = [
  { email: 'callcenter@cobail-auto.fr', mot_de_passe: 'CallC0b@il2024', nom: 'Sophie Martin', role: 'call_center', service: 'Call Center' },
  { email: 'chef.atelier@cobail-auto.fr', mot_de_passe: 'ChefAt3lier@2024', nom: 'Pierre Dubois', role: 'chef_atelier', service: 'Atelier' },
  { email: 'conseiller.sav@cobail-auto.fr', mot_de_passe: 'SAV-C0ns3iller#2024', nom: 'Thomas Leroy', role: 'conseiller_sav', service: 'Service SAV' },
  { email: 'garantie@cobail-auto.fr', mot_de_passe: 'G@rantieC0b@il2024', nom: 'Marie Lambert', role: 'garantie', service: 'Garantie' },
  { email: 'csi@cobail-auto.fr', mot_de_passe: 'CS1-C0b@il@2024', nom: 'Julie Petit', role: 'csi', service: 'Relation Client' },
  { email: 'direction@cobail-auto.fr', mot_de_passe: 'D1rection@C0b@il2024', nom: 'Marc Renault', role: 'direction', service: 'Direction' }
];

async function init() {
  console.log('Initialisation des comptes Cobail...');
  const db = await getDb();
  
  for (const compte of comptes) {
    const exists = await User.findByEmail(compte.email);
    if (!exists) {
      await User.create(compte);
      console.log(`✅ Compte créé : ${compte.email}`);
    } else {
      console.log(`⚠️ Compte existant : ${compte.email}`);
    }
  }
  console.log('Terminé.');
  process.exit(0);
}

init().catch(console.error);
