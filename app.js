// =============================================================
//  CHRONOLEGENDS — Logique du jeu
//  Tout ce qui a de la valeur est décidé par le SERVEUR (Supabase) :
//  le booster quotidien (avec l'heure du serveur), le stock de
//  boosters, le tirage des cartes et la collection. Ce fichier ne
//  fait qu'afficher ; modifier l'heure du téléphone ou la console
//  ne donne rien.
// =============================================================

// Chaque joueur reçoit un compte anonyme automatique (sans e-mail).
// La clé de stockage est distincte de celle de la page d'administration.
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_CLE_PUBLIQUE, {
  auth: { storageKey: "chronolegends-joueur" },
});

// ---------- Préférences d'affichage (sans valeur : restent dans le navigateur) ----------

const CLE_PREFS = "chronolegends.prefs";
try { localStorage.removeItem("chronica.v1"); } catch (e) {}   // ancienne sauvegarde locale : tout le monde repart à zéro

function chargerPrefs() {
  try { return JSON.parse(localStorage.getItem(CLE_PREFS)) || {}; } catch (e) { return {}; }
}

function sauvegarderPrefs() {
  try { localStorage.setItem(CLE_PREFS, JSON.stringify({ extension: etat.extension })); } catch (e) {}
}

// ---------- Données du jeu ----------

let CARTES = [];
const etatJeu = { pret: false, erreur: false };
const prefs = chargerPrefs();
const etat = {
  collection: {},          // { id_carte: nombre d'exemplaires } — copie de ce que dit le serveur
  boosters: 0,             // copie de ce que dit le serveur
  prochainQuotidien: null, // instant (local) où le serveur dira qu'un nouveau cadeau est dû
  region: null,            // décidée par le serveur (adresse IP)
  pays: null,
  extension: prefs.extension,
};

// Les boosters mélangent toutes les époques ; les extensions servent
// seulement à ranger la collection (un onglet par époque).
const cartesDe = ext => CARTES.filter(c => c.extension === ext);

// Époque affichée dans la collection. Choisie avec les boutons d'époque.
let extensionActive = EXTENSIONS[etat.extension] ? etat.extension : "antiquite";
let cartesExtension = [];

// Texte d'un champ dans la langue du joueur : « nom_en » en anglais s'il existe, sinon « nom ».
const champ = (ligne, nom) => (LANGUE === "en" && ligne[`${nom}_en`]) || ligne[nom] || "";

async function chargerCartes() {
  const { data, error } = await sb.from("cartes").select("*")
    .order("epoque").order("ordre").order("nom");
  if (error) throw error;
  // On garde les noms de champs utilisés partout dans le jeu.
  CARTES = data.map(l => ({
    // Contenu en anglais si le joueur joue en anglais (le français sert de secours).
    id: l.id, gamme: l.gamme, region: l.region, extension: l.epoque, rarete: l.rarete, finition: l.finition,
    nom: champ(l, "nom"), dates: champ(l, "dates"), lieu: champ(l, "lieu"), texte: champ(l, "description"),
    image: l.image, ordre: l.ordre,
  }));
  cartesExtension = cartesDe(extensionActive);
}

async function chargerCollection() {
  const { data, error } = await sb.from("collection").select("carte_id, exemplaires");
  if (error) throw error;
  etat.collection = Object.fromEntries(data.map(l => [l.carte_id, l.exemplaires]));
}

async function connecterJoueur() {
  const { data: { session } } = await sb.auth.getSession();
  if (session) {
    // On vérifie auprès du serveur que le compte existe toujours
    // (il a pu être supprimé) ; sinon on en crée un nouveau.
    const { error } = await sb.auth.getUser();
    if (!error) return;
    await sb.auth.signOut({ scope: "local" });
  }
  // Nouveau compte : preuve anti-robot d'abord (vérifiée par Supabase).
  etatJeu.verification = true;
  majConsigne();
  const captchaToken = await jetonAntiRobot($("#anti-robot"));
  etatJeu.verification = false;
  const { error } = await sb.auth.signInAnonymously({ options: { captchaToken } });
  if (error) throw error;
}

// Demande au SERVEUR si le booster quotidien est dû. Il répond avec sa propre
// heure : le stock de boosters et le temps restant avant le prochain cadeau.
async function reclamerQuotidien() {
  const { data, error } = await sb.rpc("reclamer_quotidien");
  if (error) throw error;
  etat.boosters = data.boosters;
  etat.prochainQuotidien = Date.now() + data.attente_secondes * 1000;
  appliquerRegion(data);
  return data;
}

// ---------- Région du joueur ----------
//  Décidée par le SERVEUR à partir de l'adresse IP (pays fourni par Cloudflare,
//  impossible à falsifier depuis le navigateur). Le jeu ne fait que l'afficher.

function appliquerRegion(data) {
  if (!data.region) return;
  const change = etat.region && etat.region !== data.region;
  etat.region = data.region;
  if (data.pays) etat.pays = data.pays;
  // Verrou de région : changement en attente (null s'il n'y en a pas).
  if ("verrou" in data) etat.verrou = data.verrou;
  majRegion();
  if (change) notifier(t("nouvelleRegion", { region: nomRegion(etat.region) }));
}

// Filtre géographique : un booster ne contient QUE des cartes de la région du joueur
// (le serveur applique la même règle lors du tirage).
const cartesRegion = () => CARTES.filter(c => c.region === etat.region);

// « 5 h 12 min », « 12 min »…
function formatAttente(ms) {
  const min = Math.ceil(Math.max(ms, 0) / 60000);
  if (min < 1) return t("moinsDUneMinute");
  const h = Math.floor(min / 60), m = min % 60;
  return h ? `${h} h ${String(m).padStart(2, "0")} min` : `${m} min`;
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
  $("#booster").disabled = b === 0 || !etatJeu.pret || !etat.region || vide;
  let texte;
  if (etatJeu.erreur === "anti_robot") texte = t("erreurAntiRobot");
  else if (etatJeu.erreur) texte = t("erreurServeur");
  else if (etatJeu.verification) texte = t("verification");
  else if (!etatJeu.pret) texte = t("chargement");
  else if (!etat.region) texte = t("paysInconnu");
  else if (vide) texte = t("regionVide", { region: nomRegion(etat.region) });
  else if (b > 0) texte = t("boostersDispo", { n: b });
  else texte = t("plusDeBooster", { attente: formatAttente(etat.prochainQuotidien - Date.now()) });
  $("#consigne").textContent = texte;
}

// Région affichée sous le booster (non modifiable : décidée par le serveur).
function majRegion() {
  $("#region-joueur").textContent = REGIONS[etat.region]
    ? t("ligneRegion", { region: nomRegion(etat.region), pays: etat.pays ? nomPays(etat.pays) : "" })
    : "";

  // Changement de région en attente (verrou anti-VPN décidé par le serveur).
  const v = etat.verrou;
  $("#verrou-region").hidden = !v;
  if (v) {
    const quand = new Date(v.changement_le).toLocaleString(LANGUE === "en" ? "en-GB" : "fr-FR",
      { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
    $("#verrou-region").textContent = t("verrou", { region: nomRegion(v.region_detectee), quand });
  }
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
    b.innerHTML = `${nomEpoque(cle)} <span>${possedees}/${cartesDe(cle).length}</span>`;
    b.addEventListener("click", () => choisirExtension(cle));
    nav.appendChild(b);
  }
}

function choisirExtension(cle) {
  if (cle === extensionActive) return;
  extensionActive = cle;
  cartesExtension = cartesDe(cle);
  etat.extension = cle;
  sauvegarderPrefs();
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
let pileNouvelles = []; // pour chaque carte de la pile : jamais obtenue avant ce booster ?
let indexPile = 0;     // indice de la carte actuellement sur le dessus

const MESSAGES_SERVEUR = {
  plus_de_booster: "serveurPlusDeBooster",
  region_vide: "serveurRegionVide",
  region_inconnue: "serveurRegionInconnue",
};

async function ouvrirBooster() {
  if (enCours || etat.boosters <= 0 || !etatJeu.pret || !etat.region || cartesRegion().length === 0) return;
  enCours = true;

  const booster = $("#booster");
  booster.classList.add("ouverture");
  const animation = new Promise(r => setTimeout(r, 900));

  // C'est le SERVEUR qui vérifie le stock, tire les cartes et les ajoute à la collection.
  // Aucune région envoyée : le serveur la déduit lui-même de l'adresse IP.
  const { data, error } = await sb.rpc("ouvrir_booster");
  if (error) {
    booster.classList.remove("ouverture");
    enCours = false;
    const code = Object.keys(MESSAGES_SERVEUR).find(c => error.message.includes(c));
    if (code === "plus_de_booster") etat.boosters = 0;
    notifier(t(MESSAGES_SERVEUR[code] || "serveurErreurOuverture"));
    majConsigne();
    return;
  }

  // Une carte ajoutée depuis l'administration après le chargement de la page ?
  if (data.cartes.some(c => !CARTES.find(x => x.id === c.id))) await chargerCartes();
  const tirage = data.cartes.map(c => CARTES.find(x => x.id === c.id));   // trié : la plus rare en dernier
  etat.boosters = data.boosters;
  appliquerRegion(data);
  tirage.forEach(c => { etat.collection[c.id] = (etat.collection[c.id] || 0) + 1; });
  majCompteur();

  await animation;
  $("#zone-booster").hidden = true;
  booster.classList.remove("ouverture");
  afficherPile(tirage, data.cartes.map(c => c.nouvelle));
  enCours = false;
}

// Empile les cartes : la 1re à révéler sur le dessus, la plus rare tout au fond.
function afficherPile(tirage, nouvelles) {
  pileTirage = tirage;
  pileNouvelles = nouvelles;
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
  $("#partager-tirage").hidden = true;
  $("#consigne-pile").hidden = false;

  tirage.forEach((carte, i) => {
    const emplacement = document.createElement("button");
    emplacement.className = `emplacement rarete-${carte.rarete}`;
    emplacement.dataset.index = i;
    emplacement.style.zIndex = tirage.length - i;   // la 1re carte est au-dessus
    emplacement.setAttribute("aria-label", t("revelerLaCarte"));
    emplacement.innerHTML = `
      <div class="emplacement-interieur">
        <div class="face face-dos">${HTML_DOS}</div>
        <div class="face face-avant">${htmlCarte(carte)}</div>
      </div>`;
    emplacement.addEventListener("click", () => actionPile(emplacement));
    activerGlissement(emplacement);
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
      ? t("plusBelle")
      : t(ecranTactile.matches ? "glissezSuivante" : "touchezSuivante");
  } else {
    c.textContent = t("touchezReveler", { n: restantes });
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
  } else if (ecranTactile.matches) {
    // Sur smartphone, une carte révélée s'écarte en la faisant glisser :
    // un simple appui la fait juste frémir pour montrer le geste.
    emplacement.classList.remove("fremit");
    void emplacement.offsetWidth;               // relance l'animation
    emplacement.classList.add("fremit");
  } else {
    ecarter(emplacement);
  }
}

// ---------- Glisser la carte sur le côté (smartphone) ----------
const ecranTactile = matchMedia("(pointer: coarse)");

function activerGlissement(emplacement) {
  let depart = null;   // { x, y, temps } au moment où le doigt se pose

  emplacement.addEventListener("pointerdown", e => {
    if (e.pointerType === "mouse" || !emplacement.classList.contains("revelee")
        || Number(emplacement.dataset.index) !== indexPile || toutReveler.enCours) return;
    depart = { x: e.clientX, y: e.clientY, temps: performance.now() };
    try { emplacement.setPointerCapture(e.pointerId); } catch { /* le doigt est déjà levé */ }
    emplacement.classList.add("glisse");
  });

  emplacement.addEventListener("pointermove", e => {
    if (!depart) return;
    const dx = e.clientX - depart.x;
    const dy = (e.clientY - depart.y) * 0.25;   // suit un peu le doigt verticalement
    emplacement.style.transform = `translate(${dx}px, ${dy}px) rotate(${dx * 0.06}deg)`;
  });

  const lacher = e => {
    if (!depart) return;
    const dx = e.clientX - depart.x;
    const vitesse = Math.abs(dx) / (performance.now() - depart.temps);   // px par ms
    depart = null;
    emplacement.classList.remove("glisse");
    emplacement.style.transform = "";
    // Assez loin (un tiers de la carte) ou un geste vif : la carte part de ce côté.
    if (e.type === "pointerup" && (Math.abs(dx) > emplacement.offsetWidth / 3 || (vitesse > 0.5 && Math.abs(dx) > 30))) {
      emplacement.style.setProperty("--sens", dx < 0 ? -1 : 1);
      ecarter(emplacement);
    }
    // Sinon, elle revient doucement sur la pile (transition CSS).
  };
  emplacement.addEventListener("pointerup", lacher);
  emplacement.addEventListener("pointercancel", lacher);
}

function reveler(emplacement, carte) {
  emplacement.classList.add("revelee");
  emplacement.setAttribute("aria-label", `${carte.nom}, ${nomRarete(carte.rarete)}`);
  if (pileNouvelles[Number(emplacement.dataset.index)] && !emplacement.querySelector(".nouvelle")) {
    emplacement.insertAdjacentHTML("beforeend", `<span class="nouvelle">${t("nouvelle")}</span>`);
  }
  if (carte.rarete === "mythique") notifier(t("notifMythique", { nom: carte.nom }));
  else if (carte.rarete === "legendaire") notifier(t("notifLegendaire", { nom: carte.nom }));
  else if (carte.rarete === "epique") notifier(t("notifEpique", { nom: carte.nom }));
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
      + (pileNouvelles[i] ? `<span class="nouvelle">${t("nouvelle")}</span>` : "");
    el.setAttribute("aria-label", `${carte.nom}, ${nomRarete(carte.rarete)}, ${t("agrandir")}`);
    el.addEventListener("click", () => ouvrirModale(carte));
    zone.appendChild(el);
  });

  $("#tout-reveler").hidden = true;
  $("#consigne-pile").hidden = true;
  $("#nouveau-booster").hidden = false;
  // La plus rare (dernière de la pile) : son image de partage se prépare tout de suite.
  $("#partager-tirage").hidden = false;
  preparerPartage(pileTirage[pileTirage.length - 1]);
  $("#nouveau-booster").textContent = etat.boosters > 0
    ? t("ouvrirUnAutreN", { n: etat.boosters }) : t("retour");
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
  $("#titre-extension").textContent = nomEpoque(extensionActive);
  $("#sous-titre-extension").textContent = sousTitreEpoque(extensionActive);

  const possedees = cartesExtension.filter(c => etat.collection[c.id]).length;
  const total = cartesExtension.length;
  $("#barre-progression").style.width = total ? `${(possedees / total) * 100}%` : "0%";
  $("#texte-progression").textContent = total
    ? t("progression", { n: possedees, total })
    : t("epoqueVide");

  const grille = $("#grille-collection");
  grille.innerHTML = "";
  for (const carte of cartesExtension) {
    const nb = etat.collection[carte.id] || 0;
    const el = document.createElement(nb ? "button" : "div");
    el.className = "case-collection";
    if (nb) {
      el.innerHTML = htmlCarte(carte) + (nb > 1 ? `<span class="exemplaires">×${nb}</span>` : "");
      el.setAttribute("aria-label", `${carte.nom}, ${t("agrandir")}`);
      el.addEventListener("click", () => ouvrirModale(carte));
    } else {
      el.innerHTML = `<div class="manquante"><span>${t("numero")} ${numero(carte)}</span><span class="manquante-rarete">${nomRarete(carte.rarete)}</span></div>`;
    }
    grille.appendChild(el);
  }
}

// --- Agrandissement ---

let carteModale = null;

function ouvrirModale(carte) {
  const contenu = $("#modale-contenu");
  contenu.innerHTML = htmlCarte(carte);
  carteModale = carte;
  setTimeout(() => preparerPartage(carte), 400);   // après l'animation d'ouverture
  contenu.style.transform = "";
  positionDeDepart = null; // le gyroscope repart de la façon dont on tient le téléphone
  demanderGyroscope();
  $("#modale").hidden = false;
  requestAnimationFrame(() => $("#modale").classList.add("ouverte"));
}

function fermerModale() {
  const m = $("#modale");
  m.classList.remove("ouverte");
  setTimeout(() => { m.hidden = true; }, 200);
}

// Légère inclinaison 3D de la carte agrandie.
// x et y vont de -0,5 à 0,5 (0 = carte bien de face).
function incliner(x, y) {
  const borne = v => Math.max(-0.5, Math.min(0.5, v));
  $("#modale-contenu").style.transform = `rotateY(${borne(x) * 14}deg) rotateX(${-borne(y) * 14}deg)`;
}

// 1. En suivant la souris, ou le doigt qui glisse sur la carte
//    (touch-action: none dans style.css empêche la page de défiler à la place).
$("#modale-contenu").addEventListener("pointermove", e => {
  const zone = e.currentTarget.getBoundingClientRect();
  incliner((e.clientX - zone.left) / zone.width - 0.5, (e.clientY - zone.top) / zone.height - 0.5);
});
for (const fin of ["pointerleave", "pointercancel"]) {
  $("#modale-contenu").addEventListener(fin, e => { e.currentTarget.style.transform = ""; });
}

// 2. Sur téléphone : en penchant le téléphone (gyroscope).
let positionDeDepart = null;
let gyroscopeDemande = false;
const animationsReduites = matchMedia("(prefers-reduced-motion: reduce)").matches;

function surOrientation(e) {
  if ($("#modale").hidden || e.beta === null || e.gamma === null) return;
  if (!positionDeDepart) { positionDeDepart = { beta: e.beta, gamma: e.gamma }; return; }
  // 30° de penchement = inclinaison maximale de la carte.
  incliner((e.gamma - positionDeDepart.gamma) / 30, (e.beta - positionDeDepart.beta) / 30);
}

// L'iPhone demande l'autorisation (une seule fois) ; Android l'accorde directement.
function demanderGyroscope() {
  if (gyroscopeDemande || animationsReduites || !("DeviceOrientationEvent" in window)) return;
  gyroscopeDemande = true;
  if (typeof DeviceOrientationEvent.requestPermission === "function") {
    DeviceOrientationEvent.requestPermission()
      .then(r => { if (r === "granted") addEventListener("deviceorientation", surOrientation); })
      .catch(() => { /* refusé : le doigt suffit */ });
  } else {
    addEventListener("deviceorientation", surOrientation);
  }
}

// ---------- Démarrage ----------

$("#booster").addEventListener("click", ouvrirBooster);
$("#tout-reveler").addEventListener("click", toutReveler);
$("#nouveau-booster").addEventListener("click", revenirAuBooster);
$("#partager-tirage").addEventListener("click", () => partagerCarte(pileTirage[pileTirage.length - 1]));
$("#modale-partager").addEventListener("click", () => { if (carteModale) partagerCarte(carteModale); });
document.querySelectorAll(".onglet").forEach(o => o.addEventListener("click", () => afficherVue(o.dataset.vue)));
$("#modale").addEventListener("click", e => { if (e.target.id === "modale" || e.target.id === "modale-fermer") fermerModale(); });
document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("#modale").hidden) fermerModale(); });
// Toutes les 30 s : met à jour le compte à rebours, et redemande au serveur
// le cadeau quotidien quand il devrait être dû (c'est lui qui tranche).
setInterval(async () => {
  if (!etatJeu.pret) return;
  if (etat.boosters === 0 && etat.prochainQuotidien && Date.now() >= etat.prochainQuotidien) {
    try {
      const q = await reclamerQuotidien();
      if (q.accorde) notifier(t("quotidien"));
    } catch (e) { /* on réessaiera au prochain passage */ }
  }
  majConsigne();
}, 30000);

async function demarrer() {
  traduirePage();
  document.title = t("titrePage");
  document.querySelector('meta[name="description"]')?.setAttribute("content", t("descriptionPage"));
  majConsigne();
  try {
    await connecterJoueur();
    await Promise.all([chargerCartes(), chargerCollection()]);
    const q = await reclamerQuotidien();
    etatJeu.pret = true;
    majCompteur();
    majConsigne();
    if (!$("#vue-collection").hidden) afficherCollection();
    if (q.nouveau) notifier(t("bienvenue", { n: q.boosters }));
    else if (q.accorde) notifier(t("quotidien"));
  } catch (err) {
    console.error(err);
    etatJeu.verification = false;
    etatJeu.erreur = /anti_robot|captcha/i.test(err?.message || "") ? "anti_robot" : true;
    majConsigne();
  }
}

demarrer();
