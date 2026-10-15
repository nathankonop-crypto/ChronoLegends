/* =============================================================
   CHRONOLEGENDS — Monuments en filigrane sur les boosters
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
};

// Place la gravure dans le filigrane du paquet (viewBox 0 0 63 98) :
// posée en bas du cadre, centrée, sans être déformée.
function dessinMonument(cle) {
  return `<image href="images/monuments/${cle}.webp" x="4.5" y="64.2" width="54" height="24.4" preserveAspectRatio="xMidYMax meet"/>`;
}
