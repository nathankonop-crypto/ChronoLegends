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
    <text x="150" y="212" text-anchor="middle" font-family="Cinzel, serif" font-size="9" letter-spacing="3" fill="hsl(42 40% 75% / .55)">${echapper(t("illustrationAVenir", {}, langueCartes()))}</text>
  </svg>`;
}

// ---------- Le texte doit toujours tenir dans la carte ----------
// Sur certains téléphones (taille de police du système agrandie…), le
// navigateur grossit le texte et la description déborde. On réduit alors
// le texte de la carte, petit à petit, jusqu'à ce qu'il tienne.
// Sur l'image partagée, le texte est redessiné et prend parfois un peu plus
// de place qu'à l'écran (police, coupure des mots) : on garde une marge.
function ajusterTexte(corps) {
  if (!corps.isConnected || corps.clientHeight === 0) return; // carte cachée : on attendra
  const marge = corps.closest(".affiche-partage") ? corps.clientHeight * 0.06 : 0;
  // Avec une marge, on regarde où s'arrête vraiment le texte (scrollHeight
  // ne descend jamais sous la hauteur de la zone, même avec un texte court).
  const deborde = () => marge
    ? corps.lastElementChild.getBoundingClientRect().bottom > corps.getBoundingClientRect().bottom - marge
    : corps.scrollHeight > corps.clientHeight + 1;
  let reduction = 1;
  corps.style.setProperty("--reduction", reduction);
  while (deborde() && reduction > 0.55) {
    reduction -= 0.04;
    corps.style.setProperty("--reduction", reduction.toFixed(2));
  }
}

// Réajuste quand une carte change de taille (apparition, rotation de l'écran…).
const observateurTaille = new ResizeObserver(entrees => {
  for (const e of entrees) ajusterTexte(e.target);
});

// Surveille toute la page : chaque carte affichée, dans le jeu comme dans l'admin, est prise en charge.
new MutationObserver(mutations => {
  for (const m of mutations) {
    for (const n of m.addedNodes) {
      if (n.nodeType !== 1) continue;
      const corps = n.matches(".carte-corps") ? [n] : n.querySelectorAll(".carte-corps");
      for (const c of corps) { observateurTaille.observe(c); ajusterTexte(c); }
    }
  }
}).observe(document.documentElement, { childList: true, subtree: true });

// Les polices arrivent parfois après la carte : on revérifie toutes les cartes.
document.fonts?.ready.then(() => document.querySelectorAll(".carte-corps").forEach(ajusterTexte));

// ---------- Finitions (par-dessus la rareté) ----------
// Diamant : la carte de rareté reste intacte ; on y sertit un anneau de diamant taillé,
// avec reflet holographique, paillettes, étincelles, halo glacé et sceau diamant.
// Animée : l'illustration prend vie (lent mouvement de caméra, poussière de lumière).
const SCEAU_FINITION = {
  diamant: `<svg viewBox="0 0 24 24" aria-hidden="true"><path class="sceau-fond" d="M6.5 3.5h11l4.5 6L12 21.5 2 9.5z"/><path class="sceau-trait" d="M2 9.5h20M9 3.5l3 6 3-6M6.5 3.5 9 9.5l3 12 3-12 2.5-6"/></svg>`,
  animee: `<svg viewBox="0 0 24 24" aria-hidden="true"><path class="sceau-fond" d="M12 2c.8 5.2 4.8 9.2 10 10-5.2.8-9.2 4.8-10 10-.8-5.2-4.8-9.2-10-10 5.2-.8 9.2-4.8 10-10z"/></svg>`,
};

function decorFinition(finition) {
  if (finition === "diamant") {
    return {
      halo: `<span class="diamant-halo"></span>`,
      cadre: `<span class="diamant-anneau"><span class="diamant-feu"></span></span>${'<span class="eclat"></span>'.repeat(10)}`,
      illus: `<span class="diamant-paillettes"></span>`,
      sceau: `<span class="finition-sceau">${SCEAU_FINITION.diamant}</span>`,
    };
  }
  if (finition === "animee") {
    return {
      halo: "",
      cadre: "",
      illus: `<span class="poussiere">${"<span></span>".repeat(12)}</span>`,
      sceau: `<span class="finition-sceau">${SCEAU_FINITION.animee}</span>`,
    };
  }
  return { halo: "", cadre: "", illus: "", sceau: "" };
}

// carte : objet carte du jeu ; numeroTexte : ex. "08/41"
// Tout ce qui est écrit sur la carte suit la langue des cartes (anglais quand le site est en hébreu).
function rendreCarte(carte, numeroTexte) {
  const L = langueCartes();
  const nom = echapper(carte.nom);
  const illus = carte.image
    ? `<img src="${echapper(carte.image)}" alt="${echapper(t("portraitDe", { nom: carte.nom }, L))}" loading="lazy">`
    : illustrationProvisoire(carte);
  // Taille du nom adaptée à sa longueur pour tenir sur une ligne.
  const tailleNom = Math.min(6.6, 84 / (Math.max(carte.nom.length, 1) * 0.78));
  const finition = carte.finition && carte.finition !== "normale" ? carte.finition : "";
  const decor = decorFinition(finition);
  return `
  <article class="carte rarete-${carte.rarete}${finition ? ` finition-${finition}` : ""}" lang="${L}" dir="ltr">
    ${decor.halo}
    <div class="carte-cadre">
      <div class="carte-interieur">
        <header class="carte-tete"><h2 class="carte-nom" style="font-size:${tailleNom.toFixed(2)}cqw">${nom}</h2></header>
        <div class="carte-illus">${illus}${decor.illus}</div>
        <div class="carte-bandeau"><span class="gemme"></span>${nomRarete(carte.rarete, L)}<span class="gemme"></span></div>
        <div class="carte-corps">
          <p class="carte-dates">${echapper(carte.dates)}</p>
          <p class="carte-lieu">${echapper(carte.lieu)} · ${nomRegion(carte.region, L)}</p>
          <p class="carte-texte">${echapper(carte.texte)}</p>
        </div>
        <footer class="carte-pied"><span>${nomEpoque(carte.extension, L)}</span><span class="carte-gamme" title="${nomGamme(carte.gamme)}">${nomGamme(carte.gamme).charAt(0)}</span><span>${t("numero", {}, L)} ${numeroTexte}</span></footer>
      </div>
      ${decor.cadre}
    </div>
    ${decor.sceau}
  </article>`;
}
