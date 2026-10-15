// =============================================================
//  CHRONOLEGENDS — Numéro de version des fichiers du site
//  Ajoute « ?v=AAAAMMJJ-HHMM » aux fichiers .js et .css chargés par
//  index.html et admin.html. À chaque mise à jour, le numéro change :
//  les navigateurs reprennent alors TOUS les nouveaux fichiers d'un
//  coup, au lieu de mélanger anciens et nouveaux (le site les garde
//  sinon jusqu'à 10 minutes en mémoire).
//
//  Lancé automatiquement avant chaque commit (crochet git
//  .git/hooks/pre-commit) ; à la main : node outils/version.js
// =============================================================

const fs = require("fs");
const path = require("path");

const racine = path.join(__dirname, "..");
const d = new Date();
const p = n => String(n).padStart(2, "0");
const version = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;

for (const page of ["index.html", "admin.html"]) {
  const fichier = path.join(racine, page);
  const avant = fs.readFileSync(fichier, "utf8");
  // Seulement les fichiers du site (pas les adresses https://…).
  const apres = avant.replace(/((?:src|href)=")([\w-]+\.(?:js|css))(?:\?v=[\w-]*)?"/g, `$1$2?v=${version}"`);
  if (apres !== avant) fs.writeFileSync(fichier, apres);
}
console.log(`Version des fichiers : ${version}`);
