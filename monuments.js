/* =============================================================
   CHRONOLEGENDS — Monuments et personnages en filigrane sur les boosters
   Gravures dorées sur fond transparent (images/monuments/*.webp),
   préparées à partir d'images noir sur blanc. Un paquet = un monument,
   tiré au hasard (app.js, choisirMonument).
   Pour en ajouter un : déposer l'image dans images/monuments/ et
   l'ajouter à la liste ci-dessous (la clé = le nom du fichier).
   ============================================================= */

const MONUMENTS = {
  "colisee":         { nom: "Colisée" },
  "parthenon":       { nom: "Parthénon" },
  "gizeh":           { nom: "Pyramides de Gizeh" },
  "pagode":          { nom: "Pagode" },
  "taj-mahal":       { nom: "Taj Mahal" },
  "arc-de-triomphe": { nom: "Arc de triomphe" },
  // Personnages historiques (bustes gravés) : même principe, cadre plus haut et plus étroit.
  "napoleon":        { nom: "Napoléon", personnage: true },
  "cleopatre":       { nom: "Cléopâtre", personnage: true },
  "cesar":           { nom: "Jules César", personnage: true },
  "alexandre":       { nom: "Alexandre le Grand", personnage: true },
};

// Place la gravure dans le filigrane du paquet (viewBox 0 0 63 98) :
// posée en bas du cadre, centrée, sans être déformée. Un monument occupe toute la largeur ;
// un buste, plus haut que large, monte un peu plus haut.
function dessinMonument(cle) {
  if (MONUMENTS[cle]?.personnage) {
    return `<image href="images/monuments/${cle}.webp" x="14" y="62.6" width="35" height="26" preserveAspectRatio="xMidYMax meet"/>`;
  }
  return `<image href="images/monuments/${cle}.webp" x="4.5" y="64.2" width="54" height="24.4" preserveAspectRatio="xMidYMax meet"/>`;
}
