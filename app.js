// =============================================================
//  CHRONOLEGENDS — Logique du prototype
//  Tout est stocké dans le navigateur (localStorage) pour l'instant.
//  Plus tard, la collection et la monnaie vivront sur un serveur.
// =============================================================

const CLE_SAUVEGARDE = "chronica.v1";
const CARTES_PAR_BOOSTER = 5;
const BOOSTERS_BIENVENUE = 3;

// Un booster = 2 Ordinaires + 1 Notable + 1 Rare + 1 « carte spéciale ».
// Rareté de la carte spéciale :
const CHANCES_CARTE_SPECIALE = [
  { rarete: "mythique",   chance: 0.01 },  // palier ultime, extrêmement rare
  { rarete: "legendaire", chance: 0.08 },
  { rarete: "epique",     chance: 0.26 },
  { rarete: "rare",       chance: 0.65 },
];

// ---------- Chargement des cartes depuis la base de données ----------

let CARTES = [];   // rempli au démarrage par chargerCartes()
const etatCartes = { pret: false, erreur: false };

async function chargerCartes() {
  const url = `${SUPABASE_URL}/rest/v1/cartes?select=*&order=epoque.asc,ordre.asc,nom.asc`;
  const rep = await fetch(url, {
    headers: { apikey: SUPABASE_CLE_PUBLIQUE, Authorization: `Bearer ${SUPABASE_CLE_PUBLIQUE}` },
  });
  if (!rep.ok) throw new Error(`Base de données : erreur ${rep.status}`);
  const lignes = await rep.json();
  // On garde les noms de champs utilisés partout dans le jeu.
  CARTES = lignes.map(l => ({
    id: l.id, nom: l.nom, gamme: l.gamme, dates: l.dates, lieu: l.lieu, region: l.region,
    extension: l.epoque, rarete: l.rarete, finition: l.finition, texte: l.description,
    image: l.image, ordre: l.ordre,
  }));
}

// Les boosters mélangent toutes les époques ; les extensions servent
// seulement à ranger la collection (un onglet par époque).
const cartesDe = ext => CARTES.filter(c => c.extension === ext);

// Époque affichée dans la collection. Choisie avec les boutons d'époque.
let extensionActive = "antiquite";
let cartesExtension = cartesDe(extensionActive);

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

// Dernier recours si l'IP et le GPS échouent : le fuseau horaire de l'appareil.
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
if (EXTENSIONS[etat.extension]) extensionActive = etat.extension;
sauvegarder();

// ---------- Géolocalisation ----------
//  Deux axes : 1) l'adresse IP (immédiat, sans autorisation)
//              2) le GPS (plus précis, le navigateur demande l'autorisation).
//  Le service BigDataCloud transforme l'IP ou les coordonnées en pays.
//  Rien n'est conservé : seule la région (ex. « moyen-orient ») est sauvegardée.

const API_GEO = "https://api.bigdatacloud.net/data/reverse-geocode-client?localityLanguage=fr";

// Pays rattachés à la région Moyen-Orient (codes ISO à 2 lettres).
const PAYS_MOYEN_ORIENT = ["IL", "PS", "JO", "LB", "SY", "IQ", "IR", "SA", "AE", "QA", "BH",
  "KW", "OM", "YE", "TR", "CY"];
const REGION_PAR_CONTINENT = { EU: "europe", AF: "afrique", AS: "asie", NA: "ameriques", SA: "ameriques", OC: "oceanie" };

function regionDuPays(pays, continent) {
  if (PAYS_MOYEN_ORIENT.includes(pays)) return "moyen-orient";
  return REGION_PAR_CONTINENT[continent] || null;
}

async function regionDepuisApi(coords) {
  const url = coords ? `${API_GEO}&latitude=${coords.latitude}&longitude=${coords.longitude}` : API_GEO;
  const controle = new AbortController();
  const minuterie = setTimeout(() => controle.abort(), 6000);
  try {
    const rep = await fetch(url, { signal: controle.signal });
    if (!rep.ok) return null;
    const d = await rep.json();
    return regionDuPays(d.countryCode, d.continentCode);
  } catch (e) {
    return null;   // hors ligne, service indisponible…
  } finally {
    clearTimeout(minuterie);
  }
}

function positionGps() {
  return new Promise(resoudre => {
    if (!navigator.geolocation) return resoudre(null);
    navigator.geolocation.getCurrentPosition(
      p => resoudre(p.coords),
      () => resoudre(null),            // refusé ou introuvable
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 10 * 60 * 1000 }
    );
  });
}

let localisationEnCours = true;

function appliquerRegion(region, source) {
  if (!region) return;
  const change = etat.region !== region;
  etat.region = region;
  etat.sourceRegion = source;
  sauvegarder();
  majRegion();
  if (change && source !== "fuseau") notifier(`Vous êtes en ${REGIONS[region]} : vos boosters contiendront ses personnages.`);
}

async function localiser() {
  // Axe 1 : adresse IP. On débloque les boosters dès qu'on a une réponse.
  const parIp = await regionDepuisApi(null);
  if (parIp) appliquerRegion(parIp, "IP");
  else if (!etat.sourceRegion) appliquerRegion(devinerRegion(), "fuseau");
  localisationEnCours = false;
  majConsigne();

  // Axe 2 : GPS, prioritaire s'il est autorisé.
  const coords = await positionGps();
  if (coords) appliquerRegion(await regionDepuisApi(coords), "GPS");
}

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

// Filtre géographique : on ne tire QUE les cartes de la région du joueur.
// Les cartes des autres régions s'obtiendront par échange.
const cartesRegion = () => CARTES.filter(c => c.region === etat.region);

function tirerCarte(rarete, dejaTirees) {
  const cartes = cartesRegion();
  if (cartes.length === 0) return null;

  // Paliers du plus rare au plus courant.
  const paliers = Object.keys(RARETES).sort((a, b) => RARETES[b].ordre - RARETES[a].ordre);
  let depart = paliers.indexOf(rarete);
  if (depart === -1) depart = paliers.length - 1;
  const enDessous = paliers.slice(depart);              // la rareté demandée, puis plus courant
  const auDessus = paliers.slice(0, depart).reverse();  // seulement si la région n'a rien en dessous

  const essais = [
    [enDessous, true],   // 1. rareté demandée ou en dessous, sans doublon dans le booster
    [enDessous, false],  // 2. idem, doublon autorisé
    [auDessus, false],   // 3. dernier recours : région sans aucune carte plus courante
  ];
  for (const [liste, sansDoublon] of essais) {
    for (const r of liste) {
      const pool = cartes.filter(c => c.rarete === r && !(sansDoublon && dejaTirees.includes(c.id)));
      if (pool.length) return tirerAuHasard(pool, pool.map(() => 1));
    }
  }
  return cartes[0];
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
  const raretes = ["ordinaire", "ordinaire", "notable", "rare", tirerRareteSpeciale()];
  const tirage = [];
  for (const rarete of raretes) {
    tirage.push(tirerCarte(rarete, tirage.map(c => c.id)));
  }
  // La meilleure carte est révélée en dernier.
  return tirage.sort((a, b) => RARETES[a.rarete].ordre - RARETES[b.rarete].ordre);
}

// ---------- Rendu des cartes ----------
// Le dessin d'une carte est dans carte.js (partagé avec la page d'administration).

function numero(carte) {
  const liste = cartesDe(carte.extension);
  const n = liste.indexOf(carte) + 1;
  const total = String(liste.length);
  return `${String(n).padStart(total.length, "0")}/${total}`;
}

function htmlCarte(carte) {
  return rendreCarte(carte, numero(carte));
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
  const vide = cartesRegion().length === 0;
  $("#booster").disabled = b === 0 || !etatCartes.pret || localisationEnCours || vide;
  let texte;
  if (etatCartes.erreur) texte = "Impossible de charger les cartes. Vérifiez votre connexion puis rechargez la page.";
  else if (!etatCartes.pret) texte = "Chargement des cartes…";
  else if (localisationEnCours) texte = "Localisation en cours…";
  else if (vide) texte = `Pas encore de cartes pour la région ${REGIONS[etat.region]}. Elles arrivent bientôt !`;
  else if (b > 0) texte = `${b} booster${b > 1 ? "s" : ""} disponible${b > 1 ? "s" : ""} — touchez pour ouvrir`;
  else texte = "Plus de booster pour aujourd'hui. Revenez demain pour votre booster quotidien.";
  $("#consigne").textContent = texte;
}

// Région affichée sous le booster (non modifiable : elle vient de la géolocalisation).
function majRegion() {
  const sources = { GPS: "position GPS", IP: "connexion internet", fuseau: "fuseau horaire" };
  $("#region-joueur").textContent = REGIONS[etat.region]
    ? `Région : ${REGIONS[etat.region]}${etat.sourceRegion ? ` · d'après votre ${sources[etat.sourceRegion]}` : ""}`
    : "";
  majConsigne();
}

// Compteur de l'en-tête : toutes extensions confondues.
function majCompteur() {
  const possedees = CARTES.filter(c => etat.collection[c.id]).length;
  $("#compteur-collection").textContent = `${possedees}/${CARTES.length}`;
}

// --- Onglets d'époque de la collection ---

function afficherEpoques() {
  const nav = $("#epoques");
  nav.innerHTML = "";
  for (const [cle, ext] of Object.entries(EXTENSIONS)) {
    const possedees = cartesDe(cle).filter(c => etat.collection[c.id]).length;
    const b = document.createElement("button");
    b.className = "epoque" + (cle === extensionActive ? " actif" : "");
    b.innerHTML = `${ext.nom} <span>${possedees}/${cartesDe(cle).length}</span>`;
    b.addEventListener("click", () => choisirExtension(cle));
    nav.appendChild(b);
  }
}

function choisirExtension(cle) {
  if (cle === extensionActive) return;
  extensionActive = cle;
  cartesExtension = cartesDe(cle);
  etat.extension = cle;
  sauvegarder();
  afficherCollection();
}

function afficherVue(nom) {
  document.querySelectorAll(".onglet").forEach(o => o.classList.toggle("actif", o.dataset.vue === nom));
  $("#vue-booster").hidden = nom !== "booster";
  $("#vue-collection").hidden = nom !== "collection";
  if (nom === "collection") afficherCollection();
}

// --- Ouverture d'un booster (style Pokémon : une pile de cartes) ---

let enCours = false;
let pileTirage = [];   // les 5 cartes, de la 1re révélée (dessus) à la plus rare (dessous)
let indexPile = 0;     // indice de la carte actuellement sur le dessus

function ouvrirBooster() {
  if (enCours || etat.boosters <= 0 || !etatCartes.pret || localisationEnCours || cartesRegion().length === 0) return;
  enCours = true;

  const tirage = tirerBooster();   // trié : ordinaire → … → la plus rare en dernier
  etat.boosters -= 1;
  tirage.forEach(c => { etat.collection[c.id] = (etat.collection[c.id] || 0) + 1; });
  sauvegarder();
  majCompteur();

  const booster = $("#booster");
  booster.classList.add("ouverture");

  setTimeout(() => {
    $("#zone-booster").hidden = true;
    booster.classList.remove("ouverture");
    afficherPile(tirage);
    enCours = false;
  }, 900);
}

// Empile les cartes : la 1re à révéler sur le dessus, la plus rare tout au fond.
function afficherPile(tirage) {
  pileTirage = tirage;
  indexPile = 0;

  const zone = $("#tirage");
  zone.className = "tirage pile";
  zone.innerHTML = "";
  zone.hidden = false;

  $("#actions-tirage").hidden = false;
  $("#tout-reveler").hidden = false;
  $("#tout-reveler").disabled = false;
  toutReveler.enCours = false;
  $("#nouveau-booster").hidden = true;
  $("#consigne-pile").hidden = false;

  tirage.forEach((carte, i) => {
    const emplacement = document.createElement("button");
    emplacement.className = `emplacement rarete-${carte.rarete}`;
    emplacement.dataset.index = i;
    emplacement.style.zIndex = tirage.length - i;   // la 1re carte est au-dessus
    emplacement.setAttribute("aria-label", "Révéler la carte");
    emplacement.innerHTML = `
      <div class="emplacement-interieur">
        <div class="face face-dos">${HTML_DOS}</div>
        <div class="face face-avant">${htmlCarte(carte)}</div>
      </div>`;
    emplacement.addEventListener("click", () => actionPile(emplacement));
    zone.appendChild(emplacement);
  });

  majPositions();
  majConsignePile();
}

// Décale chaque carte selon sa profondeur dans la pile (0 = dessus) → effet « paquet ».
function majPositions() {
  pileTirage.forEach((carte, i) => {
    const el = $(`.emplacement[data-index="${i}"]`);
    if (el) el.style.setProperty("--profondeur", Math.max(i - indexPile, 0));
  });
}

function majConsignePile() {
  const c = $("#consigne-pile");
  const restantes = pileTirage.length - indexPile;
  const el = $(`.emplacement[data-index="${indexPile}"]`);
  if (el && el.classList.contains("revelee")) {
    c.textContent = indexPile === pileTirage.length - 1
      ? "La plus belle du paquet !"
      : "Touchez à nouveau pour la carte suivante";
  } else {
    c.textContent = `Touchez la carte pour la révéler  ·  ${restantes} restante${restantes > 1 ? "s" : ""}`;
  }
}

// Clic sur la carte du dessus : d'abord on la révèle, puis on l'écarte.
function actionPile(emplacement) {
  const i = Number(emplacement.dataset.index);
  if (i !== indexPile) return;                 // seule la carte du dessus réagit
  const carte = pileTirage[i];

  if (!emplacement.classList.contains("revelee")) {
    reveler(emplacement, carte);
    if (i === pileTirage.length - 1) {
      majConsignePile();
      setTimeout(terminerPile, 1200);          // dernière (la plus rare) : on laisse admirer
    } else {
      majConsignePile();
    }
  } else {
    ecarter(emplacement);
  }
}

function reveler(emplacement, carte) {
  emplacement.classList.add("revelee");
  emplacement.setAttribute("aria-label", `${carte.nom}, ${RARETES[carte.rarete].nom}`);
  if (etat.collection[carte.id] === 1 && !emplacement.querySelector(".nouvelle")) {
    emplacement.insertAdjacentHTML("beforeend", `<span class="nouvelle">Nouvelle</span>`);
  }
  if (carte.rarete === "mythique") notifier(`✦ Carte MYTHIQUE : ${carte.nom} ✦`);
  else if (carte.rarete === "legendaire") notifier(`Carte légendaire : ${carte.nom} !`);
  else if (carte.rarete === "epique") notifier(`Carte épique : ${carte.nom}`);
}

function ecarter(emplacement) {
  emplacement.classList.add("ecartee");
  emplacement.style.pointerEvents = "none";
  indexPile += 1;
  majPositions();
  majConsignePile();
}

// Fin de la pile : on étale les 5 cartes pour les admirer / agrandir.
function terminerPile() {
  const zone = $("#tirage");
  zone.className = "tirage etalement";
  zone.innerHTML = "";
  pileTirage.forEach((carte, i) => {
    const el = document.createElement("button");
    el.className = `carte-etalee rarete-${carte.rarete}`;
    el.style.animationDelay = `${i * 70}ms`;
    el.innerHTML = htmlCarte(carte)
      + (etat.collection[carte.id] === 1 ? `<span class="nouvelle">Nouvelle</span>` : "");
    el.setAttribute("aria-label", `${carte.nom}, ${RARETES[carte.rarete].nom}, agrandir`);
    el.addEventListener("click", () => ouvrirModale(carte));
    zone.appendChild(el);
  });

  $("#tout-reveler").hidden = true;
  $("#consigne-pile").hidden = true;
  $("#nouveau-booster").hidden = false;
  $("#nouveau-booster").textContent = etat.boosters > 0
    ? `Ouvrir un autre booster (${etat.boosters})` : "Retour";
}

// Déroule automatiquement toute la pile (révéler puis écarter, étape par étape).
function toutReveler() {
  if (toutReveler.enCours) return;
  toutReveler.enCours = true;
  $("#tout-reveler").disabled = true;

  const etape = () => {
    const el = $(`.emplacement[data-index="${indexPile}"]`);
    if (!el) { toutReveler.enCours = false; return; }
    if (!el.classList.contains("revelee")) {
      reveler(el, pileTirage[indexPile]);
      if (indexPile === pileTirage.length - 1) {
        setTimeout(terminerPile, 900);
        toutReveler.enCours = false;
        return;
      }
      setTimeout(etape, 600);
    } else {
      ecarter(el);
      setTimeout(etape, 320);
    }
  };
  etape();
}

function revenirAuBooster() {
  $("#tirage").hidden = true;
  $("#actions-tirage").hidden = true;
  $("#zone-booster").hidden = false;
  majConsigne();
  ouvrirBooster();   // ne fait rien s'il n'y a plus de booster
}

// --- Collection ---

function afficherCollection() {
  afficherEpoques();
  const ext = EXTENSIONS[extensionActive];
  $("#titre-extension").textContent = ext.nom;
  $("#sous-titre-extension").textContent = ext.sousTitre;

  const possedees = cartesExtension.filter(c => etat.collection[c.id]).length;
  const total = cartesExtension.length;
  $("#barre-progression").style.width = total ? `${(possedees / total) * 100}%` : "0%";
  $("#texte-progression").textContent = total
    ? `${possedees} carte${possedees > 1 ? "s" : ""} sur ${total}`
    : "Les premières cartes de cette époque arrivent bientôt.";

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

majRegion();
localiser();
if (messagesAccueil.length) setTimeout(() => notifier(messagesAccueil.join(" ")), 400);

chargerCartes()
  .then(() => {
    etatCartes.pret = true;
    cartesExtension = cartesDe(extensionActive);
    majCompteur();
    majConsigne();
    if (!$("#vue-collection").hidden) afficherCollection();
  })
  .catch(err => {
    console.error(err);
    etatCartes.erreur = true;
    majConsigne();
  });
