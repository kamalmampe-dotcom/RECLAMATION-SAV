/**
 * Seed idempotent de la base CFAO SAV.
 *   - 6 sites du réseau
 *   - Taxonomie normalisée : 10 catégories + 9 causes racines
 *   - Comptes par défaut (1 par rôle global + équipe par site) avec hiérarchie
 *
 * Lancer :  npm run db:seed   (après `npm run db:migrate`)
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

// Mot de passe par défaut des comptes seedés (À CHANGER en production).
const DEFAULT_PASSWORD = process.env.SEED_DEFAULT_PASSWORD || 'Cfao@Sav2026';

// --- Référentiel des sites ---------------------------------------------------
const SITES = [
  { code: 'DLA', name: 'CFAO Douala', city: 'Douala' },
  { code: 'YDE', name: 'CFAO Yaoundé', city: 'Yaoundé' },
  { code: 'BAF', name: 'CFAO Bafoussam', city: 'Bafoussam' },
  { code: 'BTA', name: 'CFAO Bertoua', city: 'Bertoua' },
  { code: 'GRA', name: 'CFAO Garoua', city: 'Garoua' },
  { code: 'NGA', name: 'CFAO Ngaoundéré', city: 'Ngaoundéré' },
];

// --- Catégories normalisées --------------------------------------------------
const CATEGORIES = [
  { code: 'DELAY', labelFr: 'Délai', labelEn: 'Delay' },
  { code: 'COMMUNICATION', labelFr: 'Communication', labelEn: 'Communication' },
  { code: 'QUALITY_REPAIR', labelFr: 'Qualité de réparation', labelEn: 'Quality Repair' },
  { code: 'PARTS_AVAILABILITY', labelFr: 'Disponibilité des pièces', labelEn: 'Parts Availability' },
  { code: 'BILLING_PRICING', labelFr: 'Facturation / Tarification', labelEn: 'Billing / Pricing' },
  { code: 'CUSTOMER_SERVICE', labelFr: 'Service client', labelEn: 'Customer Service' },
  { code: 'INFRASTRUCTURE', labelFr: 'Infrastructure', labelEn: 'Infrastructure' },
  { code: 'DAMAGE_INCIDENT', labelFr: 'Dommage / Incident', labelEn: 'Damage / Incident' },
  { code: 'CLEANING', labelFr: 'Nettoyage', labelEn: 'Cleaning' },
  { code: 'DOCUMENTATION', labelFr: 'Documentation', labelEn: 'Documentation' },
];

// --- Causes racines normalisées ----------------------------------------------
const ROOT_CAUSES = [
  { code: 'DELAY_NOT_MET', labelFr: 'Délai non respecté' },
  { code: 'BAD_REPAIR', labelFr: 'Mauvaise réparation' },
  { code: 'PART_UNAVAILABLE', labelFr: 'Pièce indisponible' },
  { code: 'WRONG_DIAGNOSIS', labelFr: 'Mauvais diagnostic' },
  { code: 'POOR_WELCOME', labelFr: 'Mauvais accueil' },
  { code: 'SLOW_QUOTE', labelFr: 'Devis lent' },
  { code: 'LACK_COMMUNICATION', labelFr: 'Manque de communication' },
  { code: 'VEHICLE_DAMAGED', labelFr: 'Véhicule endommagé' },
  { code: 'INSUFFICIENT_CLEANING', labelFr: 'Nettoyage insuffisant' },
];

async function seedSites() {
  for (const s of SITES) {
    await prisma.site.upsert({
      where: { code: s.code },
      update: { name: s.name, city: s.city },
      create: s,
    });
  }
  console.log(`${SITES.length} sites`);
}

async function seedTaxonomy() {
  for (let i = 0; i < CATEGORIES.length; i++) {
    const c = CATEGORIES[i];
    await prisma.category.upsert({
      where: { code: c.code },
      update: { labelFr: c.labelFr, labelEn: c.labelEn, sortOrder: i },
      create: { ...c, sortOrder: i },
    });
  }
  for (let i = 0; i < ROOT_CAUSES.length; i++) {
    const rc = ROOT_CAUSES[i];
    await prisma.rootCause.upsert({
      where: { code: rc.code },
      update: { labelFr: rc.labelFr, sortOrder: i },
      create: { ...rc, sortOrder: i },
    });
  }
  console.log(`${CATEGORIES.length} catégories + ${ROOT_CAUSES.length} causes racines`);
}

async function upsertUser(params: {
  email: string;
  fullName: string;
  role: Role;
  hash: string;
  siteCode?: string;
  managerEmail?: string;
}) {
  const site = params.siteCode
    ? await prisma.site.findUnique({ where: { code: params.siteCode } })
    : null;
  const manager = params.managerEmail
    ? await prisma.user.findUnique({ where: { email: params.managerEmail } })
    : null;

  return prisma.user.upsert({
    where: { email: params.email },
    update: {
      fullName: params.fullName,
      role: params.role,
      siteId: site?.id ?? null,
      managerId: manager?.id ?? null,
    },
    create: {
      email: params.email,
      passwordHash: params.hash,
      fullName: params.fullName,
      role: params.role,
      siteId: site?.id ?? null,
      managerId: manager?.id ?? null,
    },
  });
}

async function seedUsers() {
  const hash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  // --- Administrateur système (accès global) ---
  await upsertUser({ email: 'admin@cfao-sav.cm', fullName: 'Administrateur Système', role: 'ADMIN', hash });

  // --- Comptes globaux (siège), dans l'ordre hiérarchique ---
  await upsertUser({ email: 'direction@cfao-sav.cm', fullName: 'Direction Réseau', role: 'DIRECTION', hash });
  await upsertUser({ email: 'responsable.sav@cfao-sav.cm', fullName: 'Responsable SAV Réseau', role: 'RESPONSABLE_SAV', hash, managerEmail: 'direction@cfao-sav.cm' });
  await upsertUser({ email: 'crm.manager@cfao-sav.cm', fullName: 'CRM Manager', role: 'CRM_MANAGER', hash, managerEmail: 'responsable.sav@cfao-sav.cm' });

  // --- Équipe par site ---
  // Hiérarchie d'escalade : téléconseillère -> CRM manager -> responsable SAV -> direction
  //                         conseiller SAV  -> chef atelier -> responsable SAV
  for (const s of SITES) {
    const code = s.code.toLowerCase();
    await upsertUser({ email: `chef.${code}@cfao-sav.cm`, fullName: `Chef d'atelier ${s.city}`, role: 'CHEF_ATELIER', hash, siteCode: s.code, managerEmail: 'responsable.sav@cfao-sav.cm' });
    await upsertUser({ email: `conseiller.${code}@cfao-sav.cm`, fullName: `Conseiller SAV ${s.city}`, role: 'CONSEILLER_SAV', hash, siteCode: s.code, managerEmail: `chef.${code}@cfao-sav.cm` });
    await upsertUser({ email: `tc.${code}@cfao-sav.cm`, fullName: `Téléconseillère ${s.city}`, role: 'TELECONSEILLERE', hash, siteCode: s.code, managerEmail: 'crm.manager@cfao-sav.cm' });
  }

  const count = await prisma.user.count();
  console.log(`${count} utilisateurs (mot de passe par défaut : "${DEFAULT_PASSWORD}")`);
}

async function main() {
  console.log('Seed CFAO SAV…');
  await seedSites();
  await seedTaxonomy();
  await seedUsers();
  console.log('Seed terminé.');
}

main()
  .catch((e) => {
    console.error('Échec du seed :', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
