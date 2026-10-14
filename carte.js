// =============================================================
//  CHRONOLEGENDS — Dessin d'une carte
//  Partagé par le jeu (app.js) et la page d'administration
//  (admin.js) : l'aperçu de l'admin est donc exactement la carte
//  du site.
// =============================================================

// Protège le texte : un « < » tapé dans un champ reste du texte, jamais du code.
function echapper(texte) {
  return String(texte ?? "").replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

let compteurSvg = 0;

function initiales(nom) {
  return nom.split(/[\s'’-]+/)
    .filter(m => /^[A-ZÀ-Ý]/.test(m) && !/^[IVX]+$/.test(m))
    .slice(0, 2).map(m => m[0]).join("");
}

const TEINTES_REGION = { "europe": 215, "afrique": 22, "moyen-orient": 38, "asie": 355, "ameriques": 150, "oceanie": 190 };

// Illustration provisoire : médaillon gravé avec les initiales.
function illustrationProvisoire(carte) {
  const id = `g${++compteurSvg}`;
  const h = TEINTES_REGION[carte.region] ?? 30;
  let rayons = "";
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    const x1 = 150 + Math.cos(a) * 62, y1 = 112 + Math.sin(a) * 62;
    const x2 = 150 + Math.cos(a) * 190, y2 = 112 + Math.sin(a) * 190;
    rayons += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`;
  }
  return `
  <svg viewBox="0 0 300 225" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
      <radialGradient id="${id}" cx="50%" cy="48%" r="70%">
        <stop offset="0" stop-color="hsl(${h} 30% 34%)"/>
        <stop offset="1" stop-color="hsl(${h} 35% 12%)"/>
      </radialGradient>
    </defs>
    <rect width="300" height="225" fill="url(#${id})"/>
    <g stroke="hsl(42 60% 70% / .16)" stroke-width="0.8">${rayons}</g>
    <circle cx="150" cy="112" r="58" fill="hsl(${h} 30% 16%)" stroke="hsl(42 55% 62%)" stroke-width="1.5"/>
    <circle cx="150" cy="112" r="51" fill="none" stroke="hsl(42 55% 62% / .55)" stroke-width="0.8" stroke-dasharray="2 3"/>
    <text x="150" y="128" text-anchor="middle" font-family="Cinzel, serif" font-size="44" font-weight="600" fill="hsl(42 65% 72%)">${echapper(initiales(carte.nom))}</text>
    <text x="150" y="212" text-anchor="middle" font-family="Cinzel, serif" font-size="9" letter-spacing="3" fill="hsl(42 40% 75% / .55)">ILLUSTRATION À VENIR</text>
  </svg>`;
}

// carte : objet carte du jeu ; numeroTexte : ex. "08/41"
function rendreCarte(carte, numeroTexte) {
  const r = RARETES[carte.rarete];
  const nom = echapper(carte.nom);
  const illus = carte.image
    ? `<img src="${echapper(carte.image)}" alt="Portrait de ${nom}" loading="lazy">`
    : illustrationProvisoire(carte);
  // Taille du nom adaptée à sa longueur pour tenir sur une ligne.
  const tailleNom = Math.min(6.6, 84 / (Math.max(carte.nom.length, 1) * 0.78));
  return `
  <article class="carte rarete-${carte.rarete}">
    <div class="carte-cadre">
      <div class="carte-interieur">
        <header class="carte-tete"><h2 class="carte-nom" style="font-size:${tailleNom.toFixed(2)}cqw">${nom}</h2></header>
        <div class="carte-illus">${illus}</div>
        <div class="carte-bandeau"><span class="gemme"></span>${r.nom}<span class="gemme"></span></div>
        <div class="carte-corps">
          <p class="carte-dates">${echapper(carte.dates)}</p>
          <p class="carte-lieu">${echapper(carte.lieu)} · ${REGIONS[carte.region]}</p>
          <p class="carte-texte">${echapper(carte.texte)}</p>
        </div>
        <footer class="carte-pied"><span>${EXTENSIONS[carte.extension].nom}</span><span>N° ${numeroTexte}</span></footer>
      </div>
    </div>
  </article>`;
}
