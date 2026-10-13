// =============================================================
//  CHRONICA — Logique du prototype
//  Tout est stocké dans le navigateur (localStorage) pour l'instant.
//  Plus tard, la collection et la monnaie vivront sur un serveur.
// =============================================================

const CLE_SAUVEGARDE = "chronica.v1";
const CARTES_PAR_BOOSTER = 5;
const BOOSTERS_BIENVENUE = 3;
const BONUS_REGION = 3; // une carte de votre région a 3× plus de chances de sortir

// Rareté de la 5e carte (la « carte spéciale ») : rare, épique ou légendaire.
const CHANCES_CARTE_SPECIALE = [
  { rarete: "legendaire", chance: 0.08 },
  { rarete: "epique",     chance: 0.27 },
  { rarete: "rare",       chance: 0.65 },
];

const extensionActive = "antiquite";
const cartesExtension = CARTES.filter(c => c.extension === extensionActive);

// ---------- Sauvegarde ----------

function aujourdhui() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function charger() {
  try {
    const brut = localStorage.getItem(CLE_SAUVEGARDE);
    if (brut) return JSON.parse(brut);
  } catch (e) { /* stockage indisponible : on repart de zéro */ }
  return null;
}

function sauvegarder() {
  try { localStorage.setItem(CLE_SAUVEGARDE, JSON.stringify(etat)); } catch (e) {}
}

// Devine la région à partir du fuseau horaire (aucune autorisation demandée).
function devinerRegion() {
  const fuseau = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  const moyenOrient = ["Riyadh", "Tehran", "Baghdad", "Dubai", "Jerusalem", "Beirut", "Damascus",
    "Amman", "Kuwait", "Qatar", "Bahrain", "Muscat", "Aden", "Nicosia", "Gaza", "Hebron"];
  if (fuseau === "Europe/Istanbul" || moyenOrient.some(v => fuseau.endsWith(v))) return "moyen-orient";
  if (fuseau.startsWith("Europe/")) return "europe";
  if (fuseau.startsWith("Africa/")) return "afrique";
  if (fuseau.startsWith("America/")) return "ameriques";
  if (fuseau.startsWith("Asia/")) return "asie";
  if (fuseau.startsWith("Australia/") || fuseau.startsWith("Pacific/")) return "oceanie";
  return "europe";
}

let etat = charger();
const messagesAccueil = [];

if (!etat) {
  etat = { collection: {}, boosters: BOOSTERS_BIENVENUE, dernierQuotidien: aujourdhui(), region: devinerRegion() };
  messagesAccueil.push(`Bienvenue ! Voici ${BOOSTERS_BIENVENUE} boosters offerts.`);
} else if (etat.dernierQuotidien !== aujourdhui()) {
  etat.boosters += 1;
  etat.dernierQuotidien = aujourdhui();
  messagesAccueil.push("Votre booster quotidien est arrivé.");
}
sauvegarder();

// ---------- Tirage ----------

function tirerAuHasard(liste, poids) {
  const total = poids.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < liste.length; i++) {
    r -= poids[i];
    if (r < 0) return liste[i];
  }
  return liste[liste.length - 1];
}

function tirerCarte(rarete, dejaTirees) {
  let pool = cartesExtension.filter(c => c.rarete === rarete && !dejaTirees.includes(c.id));
  if (pool.length === 0) pool = cartesExtension.filter(c => c.rarete === rarete);
  const poids = pool.map(c => (c.region === etat.region ? BONUS_REGION : 1));
  return tirerAuHasard(pool, poids);
}

function tirerRareteSpeciale() {
  let r = Math.random();
  for (const { rarete, chance } of CHANCES_CARTE_SPECIALE) {
    r -= chance;
    if (r < 0) return rarete;
  }
  return "rare";
}

function tirerBooster() {
  const raretes = ["commune", "commune", "commune", "rare", tirerRareteSpeciale()];
  const tirage = [];
  for (const rarete of raretes) {
    tirage.push(tirerCarte(rarete, tirage.map(c => c.id)));
  }
  // La meilleure carte est révélée en dernier.
  return tirage.sort((a, b) => RARETES[a.rarete].ordre - RARETES[b.rarete].ordre);
}

// ---------- Rendu des cartes ----------

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
    <text x="150" y="128" text-anchor="middle" font-family="Cinzel, serif" font-size="44" font-weight="600" fill="hsl(42 65% 72%)">${initiales(carte.nom)}</text>
    <text x="150" y="212" text-anchor="middle" font-family="Cinzel, serif" font-size="9" letter-spacing="3" fill="hsl(42 40% 75% / .55)">ILLUSTRATION À VENIR</text>
  </svg>`;
}

function numero(carte) {
  const n = cartesExtension.indexOf(carte) + 1;
  const total = String(cartesExtension.length);
  return `${String(n).padStart(total.length, "0")}/${total}`;
}

function htmlCarte(carte) {
  const r = RARETES[carte.rarete];
  const illus = carte.image
    ? `<img src="${carte.image}" alt="Portrait de ${carte.nom}" loading="lazy">`
    : illustrationProvisoire(carte);
  // Taille du nom adaptée à sa longueur pour tenir sur une ligne.
  const tailleNom = Math.min(6.6, 84 / (carte.nom.length * 0.78));
  return `
  <article class="carte rarete-${carte.rarete}">
    <div class="carte-cadre">
      <div class="carte-interieur">
        <header class="carte-tete"><h2 class="carte-nom" style="font-size:${tailleNom.toFixed(2)}cqw">${carte.nom}</h2></header>
        <div class="carte-illus">${illus}</div>
        <div class="carte-bandeau"><span class="gemme"></span>${r.nom}<span class="gemme"></span></div>
        <div class="carte-corps">
          <p class="carte-dates">${carte.dates}</p>
          <p class="carte-lieu">${carte.lieu} · ${REGIONS[carte.region]}</p>
          <p class="carte-texte">${carte.texte}</p>
        </div>
        <footer class="carte-pied"><span>${EXTENSIONS[carte.extension].nom}</span><span>N° ${numero(carte)}</span></footer>
      </div>
    </div>
  </article>`;
}

const HTML_DOS = `
  <div class="dos">
    <div class="dos-motif">
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <g fill="none" stroke="currentColor">
          <circle cx="50" cy="50" r="30" stroke-width="1"/>
          <circle cx="50" cy="50" r="26" stroke-width=".5"/>
          <path d="M50 8 L56 44 L92 50 L56 56 L50 92 L44 56 L8 50 L44 44 Z" stroke-width=".7"/>
          <path d="M50 22 L53 47 L78 50 L53 53 L50 78 L47 53 L22 50 L47 47 Z" stroke-width=".5"/>
        </g>
        <text x="50" y="57" text-anchor="middle" font-family="Cinzel, serif" font-size="20" font-weight="700" fill="currentColor">C</text>
      </svg>
    </div>
  </div>`;

// ---------- Interface ----------

const $ = sel => document.querySelector(sel);

function notifier(message) {
  const n = $("#notification");
  n.textContent = message;
  n.classList.add("visible");
  clearTimeout(notifier.t);
  notifier.t = setTimeout(() => n.classList.remove("visible"), 3200);
}

function majConsigne() {
  const b = etat.boosters;
  $("#booster").disabled = b === 0;
  $("#consigne").textContent = b > 0
    ? `${b} booster${b > 1 ? "s" : ""} disponible${b > 1 ? "s" : ""} — touchez pour ouvrir`
    : "Plus de booster pour aujourd'hui. Revenez demain pour votre booster quotidien.";
}

function majCompteur() {
  const possedees = cartesExtension.filter(c => etat.collection[c.id]).length;
  $("#compteur-collection").textContent = `${possedees}/${cartesExtension.length}`;
}

function afficherVue(nom) {
  document.querySelectorAll(".onglet").forEach(o => o.classList.toggle("actif", o.dataset.vue === nom));
  $("#vue-booster").hidden = nom !== "booster";
  $("#vue-collection").hidden = nom !== "collection";
  if (nom === "collection") afficherCollection();
}

// --- Ouverture d'un booster ---

let enCours = false;

function ouvrirBooster() {
  if (enCours || etat.boosters <= 0) return;
  enCours = true;

  const tirage = tirerBooster();
  etat.boosters -= 1;
  tirage.forEach(c => { etat.collection[c.id] = (etat.collection[c.id] || 0) + 1; });
  sauvegarder();
  majCompteur();

  const booster = $("#booster");
  booster.classList.add("ouverture");

  setTimeout(() => {
    $("#zone-booster").hidden = true;
    booster.classList.remove("ouverture");
    afficherTirage(tirage);
    enCours = false;
  }, 900);
}

function afficherTirage(tirage) {
  const zone = $("#tirage");
  zone.innerHTML = "";
  zone.hidden = false;
  $("#actions-tirage").hidden = false;
  $("#tout-reveler").hidden = false;
  $("#nouveau-booster").hidden = true;

  tirage.forEach((carte, i) => {
    const emplacement = document.createElement("button");
    emplacement.className = `emplacement rarete-${carte.rarete}`;
    emplacement.style.animationDelay = `${i * 110}ms`;
    emplacement.setAttribute("aria-label", "Retourner la carte");
    emplacement.innerHTML = `
      <div class="emplacement-interieur">
        <div class="face face-dos">${HTML_DOS}</div>
        <div class="face face-avant">${htmlCarte(carte)}</div>
      </div>`;
    emplacement.addEventListener("click", () => {
      if (!emplacement.classList.contains("revelee")) reveler(emplacement, carte);
      else ouvrirModale(carte);
    });
    zone.appendChild(emplacement);
  });
}

function reveler(emplacement, carte) {
  emplacement.classList.add("revelee");
  emplacement.setAttribute("aria-label", `${carte.nom}, ${RARETES[carte.rarete].nom}. Agrandir`);
  if (etat.collection[carte.id] === 1 && !emplacement.querySelector(".nouvelle")) {
    emplacement.insertAdjacentHTML("beforeend", `<span class="nouvelle">Nouvelle</span>`);
  }
  if (carte.rarete === "legendaire") notifier(`Carte légendaire : ${carte.nom}`);

  if (document.querySelectorAll(".emplacement:not(.revelee)").length === 0) {
    $("#tout-reveler").hidden = true;
    $("#nouveau-booster").hidden = false;
    $("#nouveau-booster").textContent = etat.boosters > 0
      ? `Ouvrir un autre booster (${etat.boosters})` : "Retour";
  }
}

function toutReveler() {
  const restantes = [...document.querySelectorAll(".emplacement:not(.revelee)")];
  restantes.forEach((e, i) => setTimeout(() => e.click(), i * 180));
}

function revenirAuBooster() {
  $("#tirage").hidden = true;
  $("#actions-tirage").hidden = true;
  $("#zone-booster").hidden = false;
  majConsigne();
  if (etat.boosters > 0) ouvrirBooster();
}

// --- Collection ---

function afficherCollection() {
  const ext = EXTENSIONS[extensionActive];
  $("#titre-extension").textContent = ext.nom;
  $("#sous-titre-extension").textContent = ext.sousTitre;

  const possedees = cartesExtension.filter(c => etat.collection[c.id]).length;
  $("#barre-progression").style.width = `${(possedees / cartesExtension.length) * 100}%`;
  $("#texte-progression").textContent = `${possedees} carte${possedees > 1 ? "s" : ""} sur ${cartesExtension.length}`;

  const grille = $("#grille-collection");
  grille.innerHTML = "";
  for (const carte of cartesExtension) {
    const nb = etat.collection[carte.id] || 0;
    const el = document.createElement(nb ? "button" : "div");
    el.className = "case-collection";
    if (nb) {
      el.innerHTML = htmlCarte(carte) + (nb > 1 ? `<span class="exemplaires">×${nb}</span>` : "");
      el.setAttribute("aria-label", `${carte.nom}, agrandir`);
      el.addEventListener("click", () => ouvrirModale(carte));
    } else {
      el.innerHTML = `<div class="manquante"><span>N° ${numero(carte)}</span><span class="manquante-rarete">${RARETES[carte.rarete].nom}</span></div>`;
    }
    grille.appendChild(el);
  }
}

// --- Agrandissement ---

function ouvrirModale(carte) {
  const contenu = $("#modale-contenu");
  contenu.innerHTML = htmlCarte(carte);
  $("#modale").hidden = false;
  requestAnimationFrame(() => $("#modale").classList.add("ouverte"));
}

function fermerModale() {
  const m = $("#modale");
  m.classList.remove("ouverte");
  setTimeout(() => { m.hidden = true; }, 200);
}

// Légère inclinaison 3D de la carte agrandie, en suivant le doigt ou la souris.
$("#modale-contenu").addEventListener("pointermove", e => {
  const zone = e.currentTarget.getBoundingClientRect();
  const x = (e.clientX - zone.left) / zone.width - 0.5;
  const y = (e.clientY - zone.top) / zone.height - 0.5;
  e.currentTarget.style.transform = `rotateY(${x * 14}deg) rotateX(${-y * 14}deg)`;
});
$("#modale-contenu").addEventListener("pointerleave", e => { e.currentTarget.style.transform = ""; });

// ---------- Démarrage ----------

const select = $("#choix-region");
for (const [cle, nom] of Object.entries(REGIONS)) select.add(new Option(nom, cle));
select.value = etat.region;
select.addEventListener("change", () => {
  etat.region = select.value;
  sauvegarder();
  notifier(`Vos boosters favoriseront désormais : ${REGIONS[etat.region]}`);
});

$("#booster-ext").textContent = EXTENSIONS[extensionActive].nom;
$("#booster").addEventListener("click", ouvrirBooster);
$("#tout-reveler").addEventListener("click", toutReveler);
$("#nouveau-booster").addEventListener("click", revenirAuBooster);
document.querySelectorAll(".onglet").forEach(o => o.addEventListener("click", () => afficherVue(o.dataset.vue)));
$("#modale").addEventListener("click", e => { if (e.target.id === "modale" || e.target.id === "modale-fermer") fermerModale(); });
document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("#modale").hidden) fermerModale(); });
$("#reinitialiser").addEventListener("click", () => {
  if (confirm("Effacer votre collection et repartir de zéro ?")) {
    try { localStorage.removeItem(CLE_SAUVEGARDE); } catch (e) {}
    location.reload();
  }
});

majConsigne();
majCompteur();
if (messagesAccueil.length) setTimeout(() => notifier(messagesAccueil.join(" ")), 400);
