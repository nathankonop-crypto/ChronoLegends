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

// Emblèmes au choix (24 × 24). Le nom sert dans l'admin.
// d : dessin au trait ; svg : silhouette pleine, plus lisible en petit
// (classes p = plein, t = trait épais, fin = trait fin, c / c-trait = découpe couleur du fond, voir style.css).
const EMBLEMES = {
  epees:     { nom: "Épées croisées",  svg: `<g transform="rotate(40 12 12)"><path class="p" d="M12 .4l1.15 2.3V15.4h-2.3V2.7z"/><rect class="p" x="8.3" y="15.4" width="7.4" height="1.7" rx=".85"/><rect class="p" x="11.2" y="17.1" width="1.6" height="3.4"/><circle class="p" cx="12" cy="21.5" r="1.25"/></g><g transform="rotate(-40 12 12)"><path class="p" d="M12 .4l1.15 2.3V15.4h-2.3V2.7z"/><rect class="p" x="8.3" y="15.4" width="7.4" height="1.7" rx=".85"/><rect class="p" x="11.2" y="17.1" width="1.6" height="3.4"/><circle class="p" cx="12" cy="21.5" r="1.25"/></g>` },
  couronne:  { nom: "Couronne",        svg: `<path class="p" fill-rule="evenodd" d="M2.6 8.2l5 4L12 5.2l4.4 7 5-4-1.9 9.6H4.5zM12 11.3a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z"/><rect class="p" x="4.5" y="18.6" width="15" height="2.4" rx=".6"/><circle class="p" cx="2.6" cy="7.4" r="1.6"/><circle class="p" cx="12" cy="3.9" r="1.6"/><circle class="p" cx="21.4" cy="7.4" r="1.6"/>` },
  parchemin: { nom: "Parchemin",       svg: `<path class="p" d="M7 3.5h11.5a2.5 2.5 0 0 1 0 5H17v10a2.5 2.5 0 0 1-2.5 2.5H5a2.5 2.5 0 0 1 0-5h1.5V6A2.5 2.5 0 0 1 7 3.5z"/><path class="c-trait" d="M9.5 8.5h4.5M9.5 11.5h4.5M9.5 14.5h3M5 18.5h7.5"/>` },
  lunette:   { nom: "Lunette",         d: "M3.5 14.5 15 8.5l2 4-11.5 6zM15 8.5l3.5-1.8 2 4L17 12.5M9.5 16.5 7.5 21M11.5 15.5l2.5 5.5" },
  colonne:   { nom: "Colonne",         svg: `<rect class="p" x="3.5" y="2.5" width="17" height="2.6" rx=".5"/><path class="p" d="M5.5 5.1h13l-2 2.4h-9z"/><rect class="p" x="7" y="8.2" width="10" height="9.6"/><path class="c-trait" d="M9.6 9v8M12 9v8M14.4 9v8"/><rect class="p" x="5.5" y="18.4" width="13" height="1.6"/><rect class="p" x="3.5" y="20.4" width="17" height="1.9" rx=".5"/>` },
  flamme:    { nom: "Flamme",          svg: `<path class="p" fill-rule="evenodd" d="M12 1.8c.8 3.7 6.6 6.3 6.6 12.3a6.6 6.6 0 0 1-13.2 0c0-3.1 1.7-4.9 3-6.4.2 2 1 3.1 2.2 3.5C10.2 8.2 10.6 5 12 1.8zM12 20.4a2.7 2.7 0 0 0 2.7-2.7c0-1.9-2.7-4.3-2.7-4.3s-2.7 2.4-2.7 4.3a2.7 2.7 0 0 0 2.7 2.7z"/>` },
  chaine:    { nom: "Chaîne brisée",   svg: `<rect class="t" x="2.2" y="12.2" width="10" height="5.6" rx="2.8" transform="rotate(-45 7.2 15)"/><rect class="t" x="11.8" y="6.2" width="10" height="5.6" rx="2.8" transform="rotate(-45 16.8 9)"/><path class="t fin" d="M10.6 6.2 9.6 3.6M7.4 8.6 4.8 7.6M13.4 17.8l1 2.6M16.6 15.4l2.6 1"/>` },
  boussole:  { nom: "Boussole",        svg: `<circle class="t fin" cx="12" cy="12" r="8.6"/><path class="p" d="M12 1.3l2.2 8.5 8.5 2.2-8.5 2.2-2.2 8.5-2.2-8.5L1.3 12l8.5-2.2z"/><circle class="c" cx="12" cy="12" r="1.3"/>` },
  plume:     { nom: "Plume",           svg: `<path class="p" d="M21 2.5c-6.8.4-12.3 5-13.8 12.1l-.4 1.8c3.2-.6 6.1-2.2 8.2-4.6l-3.1.1 3.9-2.1c2.7-2.2 4.4-4.6 5.2-7.3z"/><path class="t" d="M12.5 10.5 3.5 21.5"/>` },
  balance:   { nom: "Balance",         d: "M12 3.5v17M7.5 20.5h9M4 7h16M7 7l-3 7h6zM17 7l-3 7h6z" },
  bouclier:  { nom: "Bouclier",        svg: `<path class="p" fill-rule="evenodd" d="M12 2l8.5 3.2v6.1c0 5.1-3.6 9-8.5 10.7-4.9-1.7-8.5-5.6-8.5-10.7V5.2zM12 6.5l-3.6 4.6 3.6 4.6 3.6-4.6z"/>` },
  lyre:      { nom: "Lyre",            svg: `<path class="t" d="M7 3.2C4 6.5 4.3 12.6 8.4 15.6h7.2c4.1-3 4.4-9.1 1.4-12.4M6.6 7.6h10.8M10.2 7.6v8M13.8 7.6v8"/><path class="p" d="M8.5 15.2h7l.8 2.6H7.7zM9 19.2h6v2.3H9z"/><circle class="p" cx="7" cy="3.2" r="1.5"/><circle class="p" cx="17" cy="3.2" r="1.5"/>` },
  navire:    { nom: "Navire",          d: "M3 16.5h18l-2.5 4h-13zM12 3v13.5M12 4.5l6 9h-6M11 6.5 6 13.5h5" },
  oeil:      { nom: "Œil",             d: "M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" },
  livre:     { nom: "Livre",           d: "M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5m0-13c2-1.5 5-2 8.5-1.5v13c-3.5-.5-6.5 0-8.5 1.5m0-13v13" },
  etoile:    { nom: "Étoile",          d: "M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.6l-5.3 2.8 1.2-6-4.5-4.1 6-.7z" },
};

const nomFamille = (f, langue = LANGUE) => (langue === "en" && f.nom_en) || (langue === "he" && f.nom_he) || f.nom;
const dessinEmbleme = cle => {
  const e = EMBLEMES[cle] || EMBLEMES.etoile;
  return `<svg class="embleme" viewBox="0 0 24 24" aria-hidden="true">${e.svg ?? `<path d="${e.d}"/>`}</svg>`;
};

// Symbole de religion, en bas de la carte à côté du rond de la gamme (personnages seulement).
const SYMBOLES_RELIGION = {
  christianisme: `<path d="M10.6 2h2.8v5.6h5.2v2.8h-5.2V22h-2.8V10.4H5.4V7.6h5.2z"/>`,
  judaisme: `<path class="trait" d="M12 2.5 20.7 17.5H3.3zM12 21.5 3.3 6.5h17.4z"/>`,
  islam: `<path d="M15.04 4.52A8.5 8.5 0 1 0 15.04 19.48 7.5 7.5 0 1 1 15.04 4.52z"/>` +
    `<path d="M18.3 7.1L19.1 9.4L21.5 9.4L19.6 10.9L20.3 13.3L18.3 11.9L16.3 13.3L17.0 10.9L15.1 9.4L17.5 9.4z"/>`,
};
function symboleReligion(carte, langue) {
  const dessin = SYMBOLES_RELIGION[carte.religion];
  return dessin ? `<span class="carte-religion" title="${nomReligion(carte.religion, langue)}"><svg viewBox="0 0 24 24" aria-hidden="true">${dessin}</svg></span>` : "";
}

// Médaillon de la famille, en bas de la carte avec la gamme et la religion.
function medaillonFamille(carte, langue) {
  const f = carte.famille && FAMILLES[carte.famille];
  return f ? `<span class="carte-famille" title="${echapper(nomFamille(f, langue))}">${dessinEmbleme(f.embleme)}</span>` : "";
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
        <div class="carte-illus">${illus}${decor.illus}</div>
        <div class="carte-bandeau"><span class="gemme"></span>${nomRarete(carte.rarete, L)}<span class="gemme"></span></div>
        <div class="carte-corps">
          <p class="carte-dates">${echapper(carte.dates)}</p>
          <p class="carte-lieu">${echapper(carte.lieu)} · ${nomRegion(carte.region, L)}</p>
          <p class="carte-texte">${echapper(carte.texte)}</p>
        </div>
        <footer class="carte-pied"><span>${nomEpoque(carte.extension, L)}</span><span class="carte-signes"><span class="carte-gamme" title="${nomGamme(carte.gamme)}">${nomGamme(carte.gamme).charAt(0)}</span>${medaillonFamille(carte, L)}${symboleReligion(carte, L)}</span><span>${t("numero", {}, L)} ${numeroTexte}</span></footer>
      </div>
      ${decor.cadre}
    </div>
    ${decor.sceau}
  </article>`;
}
