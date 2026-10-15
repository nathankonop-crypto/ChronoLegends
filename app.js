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

// Préférences du joueur : époque affichée + réglages (vibrations, animations, ouverture rapide).
function sauvegarderPrefs() {
  try { localStorage.setItem(CLE_PREFS, JSON.stringify({ ...prefs, extension: etat.extension })); } catch (e) {}
}

// ---------- Données du jeu ----------

let CARTES = [];
const etatJeu = { pret: false, erreur: false };
const prefs = chargerPrefs();
const etat = {
  collection: {},          // { id_carte: nombre d'exemplaires, toutes finitions } — copie de ce que dit le serveur
  finitions: {},           // { id_carte: { normale: 2, animee: 1, diamant: 0 } }
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
const champ = (ligne, nom) => (langueCartes() === "en" && ligne[`${nom}_en`]) || ligne[nom] || "";

async function chargerCartes() {
  const [{ data, error }, familles] = await Promise.all([
    sb.from("cartes").select("*").order("epoque").order("ordre").order("nom"),
    sb.from("familles").select("*").order("ordre"),
  ]);
  if (error) throw error;
  // Familles (Conquérants, Sages…) : sans elles, le jeu marche quand même.
  FAMILLES = Object.fromEntries((familles.data || []).map(f => [f.id, f]));
  // On garde les noms de champs utilisés partout dans le jeu.
  CARTES = data.map(l => ({
    // Contenu en anglais si le joueur joue en anglais (le français sert de secours).
    id: l.id, gamme: l.gamme, region: l.region, extension: l.epoque, rarete: l.rarete, famille: l.famille || null,
    nom: champ(l, "nom"), dates: champ(l, "dates"), lieu: champ(l, "lieu"), texte: champ(l, "description"),
    image: l.image, ordre: l.ordre,
    // « En savoir plus » existe aussi en hébreu (le reste de la carte reste en anglais).
    enSavoirPlus: l.gamme !== "personnage" ? ""
      : (LANGUE === "he" && l.en_savoir_plus_he) || champ(l, "en_savoir_plus"),
  }));
  cartesExtension = cartesDe(extensionActive);
}

async function chargerCollection() {
  const { data, error } = await sb.from("collection").select("carte_id, finition, exemplaires");
  if (error) throw error;
  etat.collection = {};
  etat.finitions = {};
  for (const l of data) ajouterExemplaires(l.carte_id, l.finition, l.exemplaires);
}

// Finitions, de la plus courante à la plus rare (le Diamant est la plus rare).
const FINITIONS_ORDRE = ["normale", "animee", "diamant"];

function ajouterExemplaires(id, finition = "normale", nb = 1) {
  etat.collection[id] = (etat.collection[id] || 0) + nb;
  etat.finitions[id] ??= {};
  etat.finitions[id][finition] = (etat.finitions[id][finition] || 0) + nb;
}

// Versions possédées d'une carte, de la plus rare à la plus courante.
const versionsPossedees = id => FINITIONS_ORDRE.filter(f => etat.finitions[id]?.[f]).reverse();

// La « plus belle » carte d'un booster, pour le partage : rareté, puis finition.
const RANG_RARETE = ["ordinaire", "notable", "rare", "epique", "legendaire", "mythique"];
const beaute = c => RANG_RARETE.indexOf(c.rarete) + { normale: 0, animee: 2, diamant: 4 }[c.finition || "normale"];
const plusBelle = cartes => cartes.reduce((a, b) => (beaute(b) >= beaute(a) ? b : a));

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
  const n = liste.findIndex(c => c.id === carte.id) + 1;   // par identifiant : les versions (finitions) sont des copies
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
  else if (b > 0) texte = t(prefs.ouvertureRapide ? "boostersDispoAppui" : "boostersDispo", { n: b });
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
    const quand = new Date(v.changement_le).toLocaleString({ fr: "fr-FR", en: "en-GB", he: "he-IL" }[LANGUE],
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
  nav.hidden = !!familleActive;
  nav.innerHTML = "";
  for (const [cle, ext] of Object.entries(EXTENSIONS)) {
    const possedees = cartesDe(cle).filter(c => etat.collection[c.id]).length;
    const b = document.createElement("button");
    b.className = "epoque" + (cle === extensionActive && !familleActive ? " actif" : "");
    b.innerHTML = `${nomEpoque(cle)} <span>${possedees}/${cartesDe(cle).length}</span>`;
    b.addEventListener("click", () => choisirExtension(cle));
    nav.appendChild(b);
  }
  afficherFamilles();
  // Interrupteur Époques | Familles (seulement s'il existe des familles avec des cartes).
  $("#bascule-collection").hidden = !familleParDefaut();
  $("#bascule-collection").querySelectorAll("button").forEach(b =>
    b.classList.toggle("actif", (b.dataset.mode === "familles") === !!familleActive));
  centrerPuceActive(familleActive ? $("#familles") : nav);
}

// Fait défiler la ligne de pastilles pour amener la pastille choisie au centre.
function centrerPuceActive(rangee) {
  const puce = rangee.querySelector(".actif");
  if (!puce || rangee.scrollWidth <= rangee.clientWidth) return;
  rangee.scrollLeft += puce.getBoundingClientRect().left - rangee.getBoundingClientRect().left
    - (rangee.clientWidth - puce.offsetWidth) / 2;
}

// ---------- Familles : une collection dans la collection, à travers toutes les époques ----------

let familleActive = null;   // id de la famille affichée, ou null (on affiche une époque)
let derniereFamille = null; // pour retrouver la même famille en revenant sur « Familles »

// Cartes d'une famille, dans l'ordre des époques puis de la collection.
function cartesFamille(id) {
  const epoques = Object.keys(EXTENSIONS);
  return CARTES.filter(c => c.famille === id)
    .sort((a, b) => epoques.indexOf(a.extension) - epoques.indexOf(b.extension) || (a.ordre ?? 0) - (b.ordre ?? 0));
}

const famillesAvecCartes = () => Object.values(FAMILLES).filter(f => cartesFamille(f.id).length);
const familleParDefaut = () => {
  const familles = famillesAvecCartes();
  return familles.find(f => f.id === derniereFamille) || familles[0] || null;
};

function afficherFamilles() {
  const nav = $("#familles");
  const familles = famillesAvecCartes();
  nav.hidden = !familleActive || !familles.length;
  nav.innerHTML = "";
  for (const f of familles) {
    const cartes = cartesFamille(f.id);
    const possedees = cartes.filter(c => etat.collection[c.id]).length;
    const b = document.createElement("button");
    b.className = "famille" + (f.id === familleActive ? " actif" : "") + (possedees === cartes.length ? " complete" : "");
    b.innerHTML = `${dessinEmbleme(f.embleme)}${echapper(nomFamille(f))} <span>${possedees}/${cartes.length}</span>`;
    b.addEventListener("click", () => choisirFamille(f.id));
    nav.appendChild(b);
  }
}

function choisirFamille(id) {
  familleActive = derniereFamille = id;
  afficherCollection();
}

$("#bascule-collection").querySelectorAll("button").forEach(b => b.addEventListener("click", () => {
  if (b.dataset.mode === "familles") {
    const f = familleParDefaut();
    if (f && !familleActive) choisirFamille(f.id);
  } else if (familleActive) {
    familleActive = null;
    afficherCollection();
  }
}));

function choisirExtension(cle) {
  if (cle === extensionActive && !familleActive) return;
  familleActive = null;
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

// dechire : le joueur vient de déchirer le paquet (les deux moitiés s'envolent déjà).
async function ouvrirBooster(dechire = false) {
  if (enCours || etat.boosters <= 0 || !etatJeu.pret || !etat.region || cartesRegion().length === 0) {
    reinitialiserBooster();
    return;
  }
  enCours = true;

  const booster = $("#booster");
  if (!dechire) booster.classList.add("ouverture");
  const animation = new Promise(r => setTimeout(r, dechire ? 700 : 900));

  // C'est le SERVEUR qui vérifie le stock, tire les cartes et les ajoute à la collection.
  // Aucune région envoyée : le serveur la déduit lui-même de l'adresse IP.
  const { data, error } = await sb.rpc("ouvrir_booster");
  if (error) {
    booster.classList.remove("ouverture");
    reinitialiserBooster();
    enCours = false;
    const code = Object.keys(MESSAGES_SERVEUR).find(c => error.message.includes(c));
    if (code === "plus_de_booster") etat.boosters = 0;
    notifier(t(MESSAGES_SERVEUR[code] || "serveurErreurOuverture"));
    majConsigne();
    return;
  }

  // Une carte ajoutée depuis l'administration après le chargement de la page ?
  if (data.cartes.some(c => !CARTES.find(x => x.id === c.id))) await chargerCartes();
  // Chaque exemplaire tiré porte sa finition (normale, animée ou diamant), décidée par le serveur.
  const tirage = data.cartes.map(c => ({ ...CARTES.find(x => x.id === c.id), finition: c.finition || "normale" }));   // trié : la plus rare en dernier
  etat.boosters = data.boosters;
  appliquerRegion(data);
  tirage.forEach(c => ajouterExemplaires(c.id, c.finition));
  majCompteur();

  await animation;
  $("#zone-booster").hidden = true;
  booster.classList.remove("ouverture");
  reinitialiserBooster();
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
    emplacement.dataset.finition = carte.finition || "normale";   // éclat spécial à la révélation
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
  if (carte.finition === "diamant") notifier(t("notifDiamant", { nom: carte.nom }));
  else if (carte.finition === "animee") notifier(t("notifAnimee", { nom: carte.nom }));
  else if (carte.rarete === "mythique") notifier(t("notifMythique", { nom: carte.nom }));
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
  // La plus belle (rareté, puis finition) : son image de partage se prépare tout de suite.
  $("#partager-tirage").hidden = false;
  preparerPartage(plusBelle(pileTirage));
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
  majConsigne();   // le joueur déchire lui-même le paquet suivant
}

// --- Collection ---

function afficherCollection() {
  afficherEpoques();
  const famille = familleActive && FAMILLES[familleActive];
  if (!famille) familleActive = null;
  const liste = famille ? cartesFamille(famille.id) : cartesExtension;
  $("#titre-extension").textContent = famille ? nomFamille(famille) : nomEpoque(extensionActive);
  $("#sous-titre-extension").textContent = famille ? t("familleToutesEpoques") : sousTitreEpoque(extensionActive);

  const possedees = liste.filter(c => etat.collection[c.id]).length;
  const total = liste.length;
  $("#barre-progression").style.width = total ? `${(possedees / total) * 100}%` : "0%";
  $("#texte-progression").textContent = total
    ? t("progression", { n: possedees, total })
    : t("epoqueVide");

  const grille = $("#grille-collection");
  grille.innerHTML = "";
  for (const carte of liste) {
    const nb = etat.collection[carte.id] || 0;
    const el = document.createElement(nb ? "button" : "div");
    el.className = "case-collection";
    if (nb) {
      // On montre la plus belle version possédée.
      const versionCarte = { ...carte, finition: versionsPossedees(carte.id)[0] || "normale" };
      el.innerHTML = htmlCarte(versionCarte) + (nb > 1 ? `<span class="exemplaires">×${nb}</span>` : "");
      el.setAttribute("aria-label", `${carte.nom}, ${t("agrandir")}`);
      el.addEventListener("click", () => ouvrirModale(versionCarte));
    } else {
      el.innerHTML = `<div class="manquante"><span>${t("numero")} ${numero(carte)}</span><span class="manquante-rarete">${nomRarete(carte.rarete)}</span></div>`;
    }
    grille.appendChild(el);
  }
}

// --- Agrandissement ---

let carteModale = null;

function afficherVersion(carte) {
  $("#modale-contenu").innerHTML = htmlCarte(carte);
  carteModale = carte;
  setTimeout(() => preparerPartage(carte), 400);   // après l'animation d'ouverture
}

function ouvrirModale(carte) {
  afficherVersion(carte);
  // Plusieurs versions possédées (normale, animée, diamant) : boutons pour passer de l'une à l'autre.
  const versions = versionsPossedees(carte.id);
  const choix = $("#modale-versions");
  choix.hidden = versions.length < 2;
  choix.innerHTML = versions.length < 2 ? "" : versions.slice().reverse().map(f =>
    `<button class="version${f === carteModale.finition ? " actif" : ""}" data-finition="${f}">${nomFinition(f)} ×${etat.finitions[carte.id][f]}</button>`).join("");
  choix.querySelectorAll("button").forEach(b => b.addEventListener("click", () => {
    choix.querySelectorAll("button").forEach(x => x.classList.toggle("actif", x === b));
    afficherVersion({ ...carte, finition: b.dataset.finition });
  }));
  // « En savoir plus » : seulement pour les personnages historiques qui ont ce texte.
  $("#bouton-savoir-plus").hidden = !carte.enSavoirPlus;
  $("#savoir-plus").hidden = true;
  $("#savoir-plus-nom").textContent = carte.nom;
  $("#savoir-plus-texte").textContent = carte.enSavoirPlus || "";
  $("#modale-contenu").style.transform = "";
  positionDeDepart = null; // le gyroscope repart de la façon dont on tient le téléphone
  $("#activer-gyroscope").hidden = !gyroscopeAActiver();
  $("#modale").hidden = false;
  requestAnimationFrame(() => $("#modale").classList.add("ouverte"));
}

function fermerModale() {
  const m = $("#modale");
  m.classList.remove("ouverte");
  setTimeout(() => { m.hidden = true; }, 200);
}

// Légère inclinaison 3D de la carte agrandie.
// x et y vont de -0,5 à 0,5 (0 = carte bien de face) : la carte penche
// au maximum de la moitié de l'amplitude (14 → 7°, 36 → 18°).
const INCLINAISON_SOURIS = 14;
const INCLINAISON_DOIGT = 36;      // plus marquée au toucher
const INCLINAISON_GYROSCOPE = 14;

function incliner(x, y, amplitude) {
  const borne = v => Math.max(-0.5, Math.min(0.5, v));
  $("#modale-contenu").style.transform = `rotateY(${borne(x) * amplitude}deg) rotateX(${-borne(y) * amplitude}deg)`;
}

// 1. En suivant la souris, ou le doigt posé sur la carte
//    (touch-action: none dans style.css empêche la page de défiler à la place).
//    Tant que le doigt est posé, c'est lui qui commande, pas le gyroscope.
let doigtPose = false;
function suivrePointeur(e) {
  const zone = e.currentTarget.getBoundingClientRect();
  const tactile = e.pointerType !== "mouse";
  if (tactile) doigtPose = true;
  incliner((e.clientX - zone.left) / zone.width - 0.5, (e.clientY - zone.top) / zone.height - 0.5,
    tactile ? INCLINAISON_DOIGT : INCLINAISON_SOURIS);
}
$("#modale-contenu").addEventListener("pointerdown", suivrePointeur);
$("#modale-contenu").addEventListener("pointermove", suivrePointeur);
for (const fin of ["pointerup", "pointerleave", "pointercancel"]) {
  $("#modale-contenu").addEventListener(fin, e => {
    doigtPose = false;
    positionDeDepart = null;   // le gyroscope repart de la position actuelle du téléphone
    e.currentTarget.style.transform = "";
  });
}

// 2. Sur téléphone : en penchant le téléphone (gyroscope).
//    Android : automatique. iPhone : Apple impose une autorisation, et
//    l'oublie à chaque visite ; on ne la demande donc jamais d'office,
//    seulement si le joueur appuie sur « Pencher avec le téléphone ».
let positionDeDepart = null;
let gyroscopeActif = false;
// Mouvements réduits : réglage du téléphone, ou « Animations réduites » dans les Paramètres.
const animationsReduites = () => matchMedia("(prefers-reduced-motion: reduce)").matches || !!prefs.animationsReduites;
const autorisationIphone = typeof DeviceOrientationEvent !== "undefined"
  && typeof DeviceOrientationEvent.requestPermission === "function";

function surOrientation(e) {
  if (e.beta === null || e.gamma === null) return;
  gyroscopeActif = true;   // des mesures arrivent : le gyroscope marche (ou l'iPhone l'a déjà autorisé)
  $("#activer-gyroscope").hidden = true;
  if ($("#modale").hidden || doigtPose || animationsReduites()) return;
  if (!positionDeDepart) { positionDeDepart = { beta: e.beta, gamma: e.gamma }; return; }
  // 30° de penchement = inclinaison maximale de la carte.
  incliner((e.gamma - positionDeDepart.gamma) / 30, (e.beta - positionDeDepart.beta) / 30, INCLINAISON_GYROSCOPE);
}

if (typeof DeviceOrientationEvent !== "undefined") {
  addEventListener("deviceorientation", surOrientation);   // sur iPhone, ne reçoit rien tant que ce n'est pas autorisé
}

// Le bouton n'apparaît que sur un téléphone qui exige l'autorisation (iPhone),
// tant que le gyroscope n'envoie rien. Sur Android, les mesures arrivent
// d'elles-mêmes dès le chargement : le bouton reste caché.
function gyroscopeAActiver() {
  return autorisationIphone && ecranTactile.matches && !animationsReduites() && !gyroscopeActif;
}

$("#activer-gyroscope").addEventListener("click", () => {
  DeviceOrientationEvent.requestPermission()
    .then(r => { if (r === "granted") { gyroscopeActif = true; positionDeDepart = null; } })
    .catch(() => { /* refusé : le doigt suffit */ })
    .finally(() => { $("#activer-gyroscope").hidden = true; });
});

// ---------- Démarrage ----------

// ---------- Paramètres (engrenage) : langue, confort, chances de tirage ----------

const vibrer = ms => { if (prefs.vibrations !== false) navigator.vibrate?.(ms); };

// Interrupteurs : { id de la case : [nom de la préférence, valeur par défaut] }
const INTERRUPTEURS = {
  "reglage-vibrations": ["vibrations", true],
  "reglage-animations": ["animationsReduites", false],
  "reglage-ouverture": ["ouvertureRapide", false],
};

function appliquerReglages() {
  document.documentElement.classList.toggle("animations-reduites", !!prefs.animationsReduites);
  boosterEl.classList.toggle("ouverture-rapide", !!prefs.ouvertureRapide);
  if (etatJeu.pret) majConsigne();
}

for (const [id, [cle, defaut]] of Object.entries(INTERRUPTEURS)) {
  const caseACocher = $(`#${id}`);
  caseACocher.checked = prefs[cle] ?? defaut;
  caseACocher.addEventListener("change", () => {
    prefs[cle] = caseACocher.checked;
    sauvegarderPrefs();
    appliquerReglages();
    if (cle === "vibrations" && caseACocher.checked) vibrer(20);   // petit essai
  });
}

// Chances de tirage : les mêmes chiffres que le serveur (supabase/5_verrou_region.sql, 10_finitions.sql).
const CHANCES_SPECIALE = [["rare", 65], ["epique", 26], ["legendaire", 8], ["mythique", 1]];
const CHANCES_FINITIONS = [["animee", 25], ["diamant", 150]];
const pourcent = x => new Intl.NumberFormat(LANGUE, { maximumFractionDigits: 2 }).format(x) + " %";

function afficherChances() {
  $("#contenu-chances").innerHTML = `
    <p>${t("chancesIntro")}</p>
    <p class="chances-ligne">${t("chancesCartes", { ordinaire: nomRarete("ordinaire"), notable: nomRarete("notable"), rare: nomRarete("rare") })}</p>
    <p>${t("chancesSpeciale")}</p>
    <ul class="chances-liste">${CHANCES_SPECIALE.map(([r, p]) =>
      `<li><span class="pastille-rarete rarete-${r}"></span>${nomRarete(r)}<b>${pourcent(p)}</b></li>`).join("")}</ul>
    <p>${t("chancesFinitions")}</p>
    <ul class="chances-liste">${CHANCES_FINITIONS.map(([f, n]) =>
      `<li>${f === "diamant" ? "💎" : "✨"} ${nomFinition(f)}<b>${pourcent(100 / n)} <small>(${t("surX", { n })})</small></b></li>`).join("")}</ul>
    <p class="chances-note">${t("chancesNote")}</p>`;
  basculerReglages(false);
  $("#dialogue-chances").hidden = false;
  $("#fermer-chances").focus();
}
const fermerChances = () => { $("#dialogue-chances").hidden = true; };

// Règles du jeu : raretés, types de cartes, familles, finitions.
function afficherRegles() {
  const R = REGLES[LANGUE] || REGLES.en;
  const types = TYPES_LONGS[LANGUE] || TYPES_LONGS.en;
  const familles = Object.values(FAMILLES).filter(f => cartesFamille(f.id).length);
  const section = (titre, corps) => `<h3>${titre}</h3>${corps}`;
  $("#contenu-regles").innerHTML = [
    section(R.principeTitre, `<p>${R.principe}</p>`),
    section(R.boostersTitre, `<p>${R.boosters}</p>`),
    section(R.regionTitre, `<p>${R.region}</p>`),
    section(R.raretesTitre, `<ul class="regles-liste">${Object.entries(R.raretes).map(([r, texte]) =>
      `<li><span class="pastille-rarete rarete-${r}"></span><span><b>${nomRarete(r)}</b> — ${texte}</span></li>`).join("")}</ul>
      <p class="chances-note">${R.raretesNote}</p>`),
    section(R.typesTitre, `<p>${R.typesIntro}</p><ul class="regles-liste">${Object.entries(R.types).map(([g, texte]) =>
      `<li><span class="regles-lettre">${nomGamme(g).charAt(0)}</span><span><b>${types[g]}</b> — ${texte}</span></li>`).join("")}</ul>`),
    section(R.famillesTitre, `<p>${R.familles}</p>${familles.length ? `<ul class="regles-familles">${familles.map(f =>
      `<li><span class="embleme-mini">${dessinEmbleme(f.embleme)}</span>${echapper(nomFamille(f))}</li>`).join("")}</ul>` : ""}`),
    section(R.finitionsTitre, `<ul class="regles-liste">${Object.entries(R.finitions).map(([f, texte]) =>
      `<li><span class="regles-icone">${{ normale: "◆", animee: "✨", diamant: "💎" }[f]}</span><span><b>${nomFinition(f)}</b> — ${texte}</span></li>`).join("")}</ul>
      <p class="chances-note">${R.finitionsNote}</p>
      <button class="lien-reglages" id="regles-vers-chances">${R.voirChances}</button>`),
  ].join("");
  $("#regles-vers-chances").addEventListener("click", () => { fermerRegles(); afficherChances(); });
  basculerReglages(false);
  $("#dialogue-regles").hidden = false;
  $("#dialogue-regles .dialogue-regles").scrollTop = 0;
  $("#fermer-regles").focus();
}
const fermerRegles = () => { $("#dialogue-regles").hidden = true; };
$("#bouton-regles").addEventListener("click", afficherRegles);
$("#fermer-regles").addEventListener("click", fermerRegles);
$("#dialogue-regles").addEventListener("click", e => { if (e.target.id === "dialogue-regles") fermerRegles(); });
document.addEventListener("keydown", e => { if (e.key === "Escape") fermerRegles(); });
$("#bouton-chances").addEventListener("click", afficherChances);
$("#fermer-chances").addEventListener("click", fermerChances);
$("#dialogue-chances").addEventListener("click", e => { if (e.target.id === "dialogue-chances") fermerChances(); });
document.addEventListener("keydown", e => { if (e.key === "Escape") fermerChances(); });

function basculerReglages(ouvrir) {
  const panneau = $("#panneau-reglages");
  ouvrir ??= panneau.hidden;
  panneau.hidden = !ouvrir;
  $("#bouton-reglages").setAttribute("aria-expanded", String(ouvrir));
  if (ouvrir) panneau.querySelector(".actif, button")?.focus();
}
$("#bouton-reglages").addEventListener("click", () => basculerReglages());
// Un appui ailleurs ou la touche Échap referment le panneau.
document.addEventListener("click", e => {
  if (!$("#panneau-reglages").hidden && !e.target.closest(".reglages")) basculerReglages(false);
});
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && !$("#panneau-reglages").hidden) { basculerReglages(false); $("#bouton-reglages").focus(); }
});

// ---------- Déchirer le booster : glisser le doigt de haut en bas ----------

const boosterEl = $("#booster");
queueMicrotask(appliquerReglages);   // réglages enregistrés : animations, ouverture rapide
let dechirure = null;      // geste en cours : { y0, h, p, bouge }

// Ligne de déchirure en zigzag, du haut (y = 0) au bas (y = 100) du paquet.
const ZIGZAG = Array.from({ length: 17 }, (_, i) => [50 + (i % 2 ? 3.5 : -3.5) * (i && i < 16 ? 1 : 0), i * 6.25]);
boosterEl.querySelector(".ligne-dechirure polyline").setAttribute("points", ZIGZAG.map(([x, y]) => `${x},${y}`).join(" "));

function majDechirure(p) {
  const palier = Math.floor(p * 8);
  if (dechirure && palier > Math.floor(dechirure.p * 8)) vibrer(6);   // petit « crac » sous le doigt
  if (dechirure) dechirure.p = p;
  boosterEl.style.setProperty("--dechirure", p.toFixed(3));
}

function reinitialiserBooster() {
  boosterEl.classList.remove("dechire", "en-dechirure", "indice");
  boosterEl.querySelectorAll(".moitie").forEach(m => m.remove());
  boosterEl.style.setProperty("--dechirure", 0);
}

// Le paquet se sépare en deux moitiés qui s'envolent, puis les cartes arrivent.
function dechirerBooster() {
  dechirure = null;
  vibrer(35);
  const contenu = [...boosterEl.querySelectorAll(".booster-bord, .booster-titre, .booster-sceau, .booster-info")];
  const bord = ZIGZAG.map(([x, y]) => `${x}% ${y}%`).join(", ");
  for (const [cote, forme] of [["gauche", `0% 0%, ${bord}, 0% 100%`], ["droite", `${bord}, 100% 100%, 100% 0%`]]) {
    const moitie = document.createElement("span");
    moitie.className = `moitie ${cote}`;
    moitie.style.clipPath = `polygon(${forme})`;
    contenu.forEach(el => moitie.appendChild(el.cloneNode(true)));
    boosterEl.appendChild(moitie);
  }
  boosterEl.classList.remove("en-dechirure");
  boosterEl.classList.add("dechire");
  ouvrirBooster(true);
}

boosterEl.addEventListener("pointerdown", e => {
  if (boosterEl.disabled || enCours || boosterEl.classList.contains("dechire") || prefs.ouvertureRapide) return;
  dechirure = { y0: e.clientY, h: boosterEl.offsetHeight, p: 0, bouge: false };
  try { boosterEl.setPointerCapture(e.pointerId); } catch { /* pointeur déjà relâché */ }
});
boosterEl.addEventListener("pointermove", e => {
  if (!dechirure) return;
  const dy = e.clientY - dechirure.y0;
  if (Math.abs(dy) > 8 && !dechirure.bouge) { dechirure.bouge = true; boosterEl.classList.add("en-dechirure"); }
  if (!dechirure.bouge) return;
  const p = Math.max(0, Math.min(1, dy / (dechirure.h * 0.7)));   // ~70 % de la hauteur suffit
  majDechirure(p);
  if (p >= 1) dechirerBooster();
});
const relacher = () => {
  if (!dechirure) return;
  boosterEl.dataset.glisse = dechirure.bouge ? "1" : "";
  dechirure = null;
  boosterEl.classList.remove("en-dechirure");
  majDechirure(0);   // lâché trop tôt : la déchirure se referme
};
boosterEl.addEventListener("pointerup", relacher);
boosterEl.addEventListener("pointercancel", relacher);

boosterEl.addEventListener("click", e => {
  if (boosterEl.dataset.glisse) { boosterEl.dataset.glisse = ""; return; }
  // Clavier (Entrée / Espace) ou « Ouverture rapide » : ouverture directe.
  if (e.detail === 0 || prefs.ouvertureRapide) return ouvrirBooster();
  // Simple appui : on montre le geste à faire.
  boosterEl.classList.remove("indice");
  void boosterEl.offsetWidth;
  boosterEl.classList.add("indice");
  notifier(t("glisserPourOuvrir"));
});
$("#tout-reveler").addEventListener("click", toutReveler);
$("#nouveau-booster").addEventListener("click", revenirAuBooster);
$("#partager-tirage").addEventListener("click", () => partagerCarte(plusBelle(pileTirage)));
$("#modale-partager").addEventListener("click", () => { if (carteModale) partagerCarte(carteModale); });
$("#bouton-savoir-plus").addEventListener("click", () => {
  $("#savoir-plus").hidden = false;
  $("#savoir-plus").scrollTop = 0;
  $("#savoir-plus-fermer").focus();
});
$("#savoir-plus-fermer").addEventListener("click", () => { $("#savoir-plus").hidden = true; });
document.querySelectorAll(".onglet").forEach(o => o.addEventListener("click", () => afficherVue(o.dataset.vue)));
$("#modale").addEventListener("click", e => { if (e.target.id === "modale" || e.target.id === "modale-fermer") fermerModale(); });
document.addEventListener("keydown", e => {
  if (e.key !== "Escape" || $("#modale").hidden) return;
  if (!$("#savoir-plus").hidden) $("#savoir-plus").hidden = true;   // d'abord le texte, puis la carte
  else fermerModale();
});
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
