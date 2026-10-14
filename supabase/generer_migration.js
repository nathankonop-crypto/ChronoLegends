// =============================================================
//  Génère 2_migration_cartes.sql à partir de cartes.js
//  Usage (dans le dossier du projet) : node supabase/generer_migration.js
//  Le SQL produit peut être relancé sans risque : une carte déjà
//  présente est mise à jour, jamais dupliquée.
// =============================================================

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const racine = path.join(__dirname, "..");
const code = fs.readFileSync(path.join(racine, "cartes.js"), "utf8");
const contexte = {};
vm.runInNewContext(code + "\nthis.CARTES = CARTES;", contexte);
const cartes = contexte.CARTES;

const sql = v => (v === null || v === undefined ? "null" : `'${String(v).replace(/'/g, "''")}'`);

// Position de chaque carte dans son époque (sert au numéro « 08/41 »).
const compteurs = {};
const lignes = cartes.map(c => {
  compteurs[c.extension] = (compteurs[c.extension] || 0) + 1;
  const gamme = c.rarete === "mythique" ? "mythologie" : "personnage";
  return `  (${[c.id, c.nom, gamme, c.dates, c.lieu, c.region, c.extension, c.rarete, "normale", c.texte, c.image]
    .map(sql).join(", ")}, ${compteurs[c.extension]})`;
});

const sortie = `-- =============================================================
--  CHRONOLEGENDS — Migration des ${cartes.length} cartes existantes
--  Généré automatiquement par supabase/generer_migration.js
--  À coller dans Supabase : SQL Editor → New query → Run.
-- =============================================================

insert into public.cartes (id, nom, gamme, dates, lieu, region, epoque, rarete, finition, description, image, ordre)
values
${lignes.join(",\n")}
on conflict (id) do update set
  nom = excluded.nom, gamme = excluded.gamme, dates = excluded.dates, lieu = excluded.lieu,
  region = excluded.region, epoque = excluded.epoque, rarete = excluded.rarete,
  finition = excluded.finition, description = excluded.description, image = excluded.image,
  ordre = excluded.ordre;

-- Vérification : doit afficher ${cartes.length}.
select count(*) as nombre_de_cartes from public.cartes;
`;

fs.writeFileSync(path.join(__dirname, "2_migration_cartes.sql"), sortie, "utf8");
console.log(`${cartes.length} cartes -> supabase/2_migration_cartes.sql`);
console.log("Par époque :", compteurs);
