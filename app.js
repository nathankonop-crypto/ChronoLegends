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

async function chargerCartes() {
  const { data, error } = await sb.from("cartes").select("*")
    .order("epoque").order("ordre").order("nom");
  if (error) throw error;
  // On garde les noms de champs utilisés partout dans le jeu.
  CARTES = data.map(l => ({
    id: l.id, nom: l.nom, gamme: l.gamme, dates: l.dates, lieu: l.lieu, region: l.region,
    extension: l.epoque, rarete: l.rarete, finition: l.finition, texte: l.description,
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
  const { error } = await sb.auth.signInAnonymously();
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

const nomsPays = (() => { try { return new Intl.DisplayNames(["fr"], { type: "region" }); } catch (e) { return null; } })();

function appliquerRegion(data) {
  if (!data.region) return;
  const change = etat.region && etat.region !== data.region;
  etat.region = data.region;
  if (data.pays) etat.pays = data.pays;
  majRegion();
  if (change) notifier(`Vous êtes en ${REGIONS[etat.region]} : vos boosters contiendront ses personnages.`);
}

// Filtre géographique : un booster ne contient QUE des cartes de la région du joueur
// (le serveur applique la même règle lors du tirage).
const cartesRegion = () => CARTES.filter(c => c.region === etat.region);

// « 5 h 12 min », « 12 min »…
function formatAttente(ms) {
  const min = Math.ceil(Math.max(ms, 0) / 60000);
  if (min < 1) return "moins d'une minute";
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
  if (etatJeu.erreur) texte = "Impossible de joindre le serveur. Vérifiez votre connexion puis rechargez la page.";
  else if (!etatJeu.pret) texte = "Chargement…";
  else if (!etat.region) texte = "Impossible de déterminer votre pays (VPN ou réseau anonyme ?). Désactivez-le puis rechargez la page.";
  else if (vide) texte = `Pas encore de cartes pour la région ${REGIONS[etat.region]}. Elles arrivent bientôt !`;
  else if (b > 0) texte = `${b} booster${b > 1 ? "s" : ""} disponible${b > 1 ? "s" : ""} — touchez pour ouvrir`;
  else texte = `Plus de booster pour l'instant. Prochain booster quotidien dans ${formatAttente(etat.prochainQuotidien - Date.now())}.`;
  $("#consigne").textContent = texte;
}

// Région affichée sous le booster (non modifiable : décidée par le serveur).
function majRegion() {
  let pays = etat.pays;
  try { if (pays && nomsPays) pays = nomsPays.of(pays); } catch (e) {}
  $("#region-joueur").textContent = REGIONS[etat.region]
    ? `Région : ${REGIONS[etat.region]}${pays ? ` · connexion depuis : ${pays}` : ""}`
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
  plus_de_booster: "Plus de booster disponible.",
  region_vide: "Pas encore de cartes pour votre région.",
  region_inconnue: "Impossible de déterminer votre pays (VPN ou réseau anonyme ?).",
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
    notifier(MESSAGES_SERVEUR[code] || "Le serveur n'a pas pu ouvrir le booster. Réessayez.");
    majConsigne();
    return;
  }

  // Une carte ajoutée depuis l'administration après le chargement de la page ?
  if (data.cartes.some(c => !CARTES.find(x => x.id === c.id))) await chargerCartes();
  const tirage = data.cartes.map(c => CARTES.find(x => x.id === c.id));   // trié : la plus rare en dernier
  etat.boosters = data.boosters;
  appliquerRegion({ region: data.region });
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
  if (pileNouvelles[Number(emplacement.dataset.index)] && !emplacement.querySelector(".nouvelle")) {
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
      + (pileNouvelles[i] ? `<span class="nouvelle">Nouvelle</span>` : "");
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
// Toutes les 30 s : met à jour le compte à rebours, et redemande au serveur
// le cadeau quotidien quand il devrait être dû (c'est lui qui tranche).
setInterval(async () => {
  if (!etatJeu.pret) return;
  if (etat.boosters === 0 && etat.prochainQuotidien && Date.now() >= etat.prochainQuotidien) {
    try {
      const q = await reclamerQuotidien();
      if (q.accorde) notifier("Votre booster quotidien est arrivé.");
    } catch (e) { /* on réessaiera au prochain passage */ }
  }
  majConsigne();
}, 30000);

async function demarrer() {
  try {
    await connecterJoueur();
    await Promise.all([chargerCartes(), chargerCollection()]);
    const q = await reclamerQuotidien();
    etatJeu.pret = true;
    majCompteur();
    majConsigne();
    if (!$("#vue-collection").hidden) afficherCollection();
    if (q.nouveau) notifier(`Bienvenue ! Voici ${q.boosters} boosters offerts.`);
    else if (q.accorde) notifier("Votre booster quotidien est arrivé.");
  } catch (err) {
    console.error(err);
    etatJeu.erreur = true;
    majConsigne();
  }
}

demarrer();
