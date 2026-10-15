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

// ---------- Familles (Conquérants, Sages…) ----------
// Liste chargée depuis la base par le jeu et l'admin : { id: { nom, nom_en, nom_he, embleme } }.
let FAMILLES = {};

// Emblèmes au choix (dessins au trait, 24 × 24). Le nom sert dans l'admin.
const EMBLEMES = {
  epees:     { nom: "Épées croisées",  d: "M4 4l12 12m-3 3 6-6m-1.5 4.5L21 21M20 4 8 16m3 3-6-6m1.5 4.5L3 21" },
  couronne:  { nom: "Couronne",        d: "M4 18h16M5 18 3.5 7.5l5 3.5L12 5l3.5 6 5-3.5L19 18M5 21h14" },
  parchemin: { nom: "Parchemin",       d: "M8 4h10a2 2 0 0 1 2 2v1.5h-3.5M8 4a2 2 0 0 0-2 2v12a2 2 0 0 1-2 2h11a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2M9 9h5M9 12.5h5M9 16h3" },
  lunette:   { nom: "Lunette",         d: "M3.5 14.5 15 8.5l2 4-11.5 6zM15 8.5l3.5-1.8 2 4L17 12.5M9.5 16.5 7.5 21M11.5 15.5l2.5 5.5" },
  colonne:   { nom: "Colonne",         d: "M4 21h16M5.5 18h13M5.5 6h13M4 3.5h16M8 6v12M11 6v12M13 6v12M16 6v12" },
  flamme:    { nom: "Flamme",          d: "M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-4.3 4.2-6.3 4.2-11 3.4 2 5.7 5.2 5.7 8 .9-.8 1.4-1.9 1.5-3.2 1.7 1.8 2.6 4 2.6 6.2 0 3.6-3 6.2-7.5 6.2zM12 21c-1.7 0-2.8-1.2-2.8-2.8 0-2 2.8-3.7 2.8-3.7s2.8 1.7 2.8 3.7c0 1.6-1.1 2.8-2.8 2.8z" },
  chaine:    { nom: "Chaîne brisée",   d: "M9.5 14.5 7.3 16.7a3 3 0 0 1-4.2-4.2l3-3a3 3 0 0 1 4.2 0M14.5 9.5l2.2-2.2a3 3 0 0 1 4.2 4.2l-3 3a3 3 0 0 1-4.2 0M8 3.5l1 2.5M3.5 8 6 9M16 20.5 15 18M20.5 16 18 15" },
  boussole:  { nom: "Boussole",        d: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM15.8 8.2l-2.2 5.4-5.4 2.2 2.2-5.4z" },
  plume:     { nom: "Plume",           d: "M20 3.5C13.5 4 8.5 8.5 7 15.5L5 20.5M20 3.5c-.5 6.5-5 11.5-12 12.5M10 14l5-5" },
  balance:   { nom: "Balance",         d: "M12 3.5v17M7.5 20.5h9M4 7h16M7 7l-3 7h6zM17 7l-3 7h6z" },
  bouclier:  { nom: "Bouclier",        d: "M12 3l8 3v5.5c0 4.7-3.4 8.3-8 9.5-4.6-1.2-8-4.8-8-9.5V6zM12 3v18M4.5 10.5h15" },
  lyre:      { nom: "Lyre",            d: "M7.5 4C5 7.5 5.5 13 9 16h6c3.5-3 4-8.5 1.5-12M7.5 8h9M10.5 8v8M13.5 8v8M9 20h6M12 16v4" },
  navire:    { nom: "Navire",          d: "M3 16.5h18l-2.5 4h-13zM12 3v13.5M12 4.5l6 9h-6M11 6.5 6 13.5h5" },
  oeil:      { nom: "Œil",             d: "M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" },
  livre:     { nom: "Livre",           d: "M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5m0-13c2-1.5 5-2 8.5-1.5v13c-3.5-.5-6.5 0-8.5 1.5m0-13v13" },
  etoile:    { nom: "Étoile",          d: "M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.6l-5.3 2.8 1.2-6-4.5-4.1 6-.7z" },
};

const nomFamille = (f, langue = LANGUE) => (langue === "en" && f.nom_en) || (langue === "he" && f.nom_he) || f.nom;
const dessinEmbleme = cle =>
  `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${(EMBLEMES[cle] || EMBLEMES.etoile).d}"/></svg>`;

// Médaillon de la famille, dans le coin de l'illustration.
function medaillonFamille(carte, langue) {
  const f = carte.famille && FAMILLES[carte.famille];
  return f ? `<span class="medaillon-famille" title="${echapper(nomFamille(f, langue))}">${dessinEmbleme(f.embleme)}</span>` : "";
}

// ---------- Finitions (par-dessus la rareté) ----------
// Diamant : la carte de rareté reste intacte ; on y sertit un anneau de diamant taillé,
// avec reflet holographique, paillettes, étincelles, halo glacé et sceau diamant.
// Émeraude : sertissage de petites émeraudes sur monture d'or, reflet vert et sceau en émeraude taillée.
const SCEAU_FINITION = {
  diamant: `<svg viewBox="0 0 24 24" aria-hidden="true"><path class="sceau-fond" d="M6.5 3.5h11l4.5 6L12 21.5 2 9.5z"/><path class="sceau-trait" d="M2 9.5h20M9 3.5l3 6 3-6M6.5 3.5 9 9.5l3 12 3-12 2.5-6"/></svg>`,
  // Émeraude taillée « à degrés » : octogone allongé et sa table au centre.
  emeraude: `<svg viewBox="0 0 24 24" aria-hidden="true"><path class="sceau-fond" d="M8 2h8l4 4v12l-4 4H8l-4-4V6z"/><path class="sceau-trait" d="M9.6 5.5h4.8l2.1 2.1v8.8l-2.1 2.1H9.6l-2.1-2.1V7.6zM8 2l1.6 3.5M16 2l-1.6 3.5M20 6l-3.5 1.6M20 18l-3.5-1.6M16 22l-1.6-3.5M8 22l1.6-3.5M4 18l3.5-1.6M4 6l3.5 1.6"/></svg>`,
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
  if (finition === "emeraude") {
    return {
      halo: `<span class="emeraude-halo"></span>`,
      cadre: `<span class="emeraude-anneau"><span class="emeraude-reflet"></span></span>`,
      illus: `<span class="emeraude-lueurs"></span>`,
      sceau: `<span class="finition-sceau">${SCEAU_FINITION.emeraude}</span>`,
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
        <div class="carte-illus">${illus}${decor.illus}${medaillonFamille(carte, L)}</div>
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
