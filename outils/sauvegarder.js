// =============================================================
//  CHRONOLEGENDS — Sauvegarde de la base de données
//  Usage : double-cliquer sur outils\sauvegarder.bat
//      ou : node outils/sauvegarder.js
//
//  Crée un dossier daté dans C:\Users\<vous>\ChronoLegends-sauvegardes :
//    cartes.json      toutes les cartes (lisible, pour archive)
//    restaurer.sql    à coller dans Supabase (SQL Editor) pour remettre
//                     les cartes telles qu'elles étaient
//    images\          toutes les illustrations
//  Aucun secret nécessaire : on lit avec la clé publique.
// =============================================================

const fs = require("fs");
const path = require("path");
const os = require("os");
const vm = require("vm");

const racine = path.join(__dirname, "..");

// Lit l'adresse de la base et la clé publique dans reglages.js.
const reglages = {};
vm.runInNewContext(fs.readFileSync(path.join(racine, "reglages.js"), "utf8")
  + "\nthis.URL = SUPABASE_URL; this.CLE = SUPABASE_CLE_PUBLIQUE;", reglages);

const COLONNES = ["id", "nom", "gamme", "dates", "lieu", "region", "epoque", "rarete",
  "finition", "description", "image", "ordre"];

const sql = v => (v === null || v === undefined ? "null"
  : typeof v === "number" ? String(v) : `'${String(v).replace(/'/g, "''")}'`);

function horodatage() {
  const d = new Date();
  const p = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}h${p(d.getMinutes())}`;
}

async function main() {
  const dossier = path.join(os.homedir(), "ChronoLegends-sauvegardes", horodatage());
  const dossierImages = path.join(dossier, "images");
  fs.mkdirSync(dossierImages, { recursive: true });

  // 1. Les cartes
  const rep = await fetch(`${reglages.URL}/rest/v1/cartes?select=*&order=epoque.asc,ordre.asc`, {
    headers: { apikey: reglages.CLE, Authorization: `Bearer ${reglages.CLE}` },
  });
  if (!rep.ok) throw new Error(`La base ne répond pas (erreur ${rep.status}).`);
  const cartes = await rep.json();
  if (!Array.isArray(cartes) || cartes.length === 0) throw new Error("Aucune carte reçue : sauvegarde annulée.");

  fs.writeFileSync(path.join(dossier, "cartes.json"), JSON.stringify(cartes, null, 2), "utf8");

  const lignes = cartes.map(c => `  (${COLONNES.map(col => sql(c[col])).join(", ")})`);
  fs.writeFileSync(path.join(dossier, "restaurer.sql"), `-- =============================================================
--  CHRONOLEGENDS — Restauration de la sauvegarde du ${horodatage().replace("_", " à ")}
--  ${cartes.length} cartes. À coller dans Supabase : SQL Editor → New query → Run.
--  Les cartes présentes dans cette sauvegarde sont remises à l'identique.
--  Les cartes créées APRÈS cette sauvegarde ne sont pas touchées.
-- =============================================================

insert into public.cartes (${COLONNES.join(", ")})
values
${lignes.join(",\n")}
on conflict (id) do update set
${COLONNES.filter(c => c !== "id").map(c => `  ${c} = excluded.${c}`).join(",\n")};

select count(*) as nombre_de_cartes from public.cartes;
`, "utf8");

  // 2. Les illustrations (stockage Supabase ou dossier images/ du site)
  let copiees = 0;
  const echecs = [];
  for (const c of cartes.filter(c => c.image)) {
    const nomFichier = path.basename(c.image.split("?")[0]);
    try {
      if (/^https?:\/\//.test(c.image)) {
        const img = await fetch(c.image);
        if (!img.ok) throw new Error(`erreur ${img.status}`);
        fs.writeFileSync(path.join(dossierImages, nomFichier), Buffer.from(await img.arrayBuffer()));
      } else {
        fs.copyFileSync(path.join(racine, c.image), path.join(dossierImages, nomFichier));
      }
      copiees++;
    } catch (e) {
      echecs.push(`${c.nom} (${e.message})`);
    }
  }

  console.log("");
  console.log(`  Sauvegarde terminée : ${cartes.length} cartes, ${copiees} illustrations.`);
  console.log(`  Dossier : ${dossier}`);
  if (echecs.length) console.log(`  ⚠ Illustrations non copiées : ${echecs.join(", ")}`);
  console.log("");
}

main().catch(e => {
  console.error(`\n  ✖ Sauvegarde impossible : ${e.message}\n`);
  process.exitCode = 1;
});
