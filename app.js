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
  finitions: {},           // { id_carte: { normale: 2, emeraude: 1, diamant: 0 } }
  boosters: 0,             // copie de ce que dit le serveur
  prochainQuotidien: null, // instant (local) où le serveur dira qu'un nouveau cadeau est dû
  region: null,            // décidée par le serveur (adresse IP)
  pays: null,
  boosterDore: false,      // le PROCHAIN booster est-il doré ? (décidé par le serveur)
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
  // Seules les cartes validées existent pour les joueurs (les brouillons restent dans l'admin).
  // On garde les noms de champs utilisés partout dans le jeu.
  CARTES = data.filter(l => (l.statut ?? "validee") === "validee").map(l => ({
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
  for (const l of data) ajouterExemplaires(l.carte_id, finitionValide(l.finition), l.exemplaires);
}

// Finitions, de la plus courante à la plus rare (le Diamant est la plus rare).
const FINITIONS_ORDRE = ["normale", "emeraude", "diamant"];
// Ancien nom de l'Émeraude (« animee ») : accepté le temps que le serveur soit mis à jour.
const finitionValide = f => (f === "animee" ? "emeraude" : f || "normale");

function ajouterExemplaires(id, finition = "normale", nb = 1) {
  etat.collection[id] = (etat.collection[id] || 0) + nb;
  etat.finitions[id] ??= {};
  etat.finitions[id][finition] = (etat.finitions[id][finition] || 0) + nb;
}

// Versions possédées d'une carte, de la plus rare à la plus courante.
const versionsPossedees = id => FINITIONS_ORDRE.filter(f => etat.finitions[id]?.[f]).reverse();

// La « plus belle » carte d'un booster, pour le partage : rareté, puis finition.
const RANG_RARETE = ["ordinaire", "notable", "rare", "epique", "legendaire", "mythique"];
const beaute = c => RANG_RARETE.indexOf(c.rarete) + { normale: 0, emeraude: 2, diamant: 4 }[finitionValide(c.finition)];
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
  // Booster doré : lu sur la fiche du joueur (si le script 12_booster_dore.sql n'est
  // pas encore installé, la colonne n'existe pas et le booster reste normal).
  const fiche = await sb.from("joueurs").select("booster_dore").maybeSingle();
  etat.boosterDore = !!fiche.data?.booster_dore;
  appliquerBoosterDore();
  return data;
}

// Booster doré : de meilleures chances, visible AVANT l'ouverture.
function appliquerBoosterDore() {
  const b = $("#booster"), info = b.querySelector(".booster-info");
  const avant = b.classList.contains("dore");
  b.classList.toggle("dore", etat.boosterDore);
  info.dataset.t = etat.boosterDore ? "boosterDore" : "cinqCartes";
  info.textContent = t(info.dataset.t);
  if (etat.boosterDore && !avant && etat.boosters > 0) { notifier(t("boosterDoreArrive")); vibrer(40); jouerSon("dore"); }
}

// ---------- Région du joueur ----------
//  Décidée par le SERVEUR à partir de l'adresse IP (pays fourni par Cloudflare,
//  impossible à falsifier depuis le navigateur). Le jeu ne fait que l'afficher.

function appliquerRegion(data) {
  if (!data.region) return;
  const change = etat.region && etat.region !== data.region;
  etat.region = data.region;
  $("#booster").dataset.region = data.region;   // couleur du paquet selon la région
  if (data.pays) etat.pays = data.pays;
  // Verrou de région : changement en attente (null s'il n'y en a pas).
  if ("verrou" in data) etat.verrou = data.verrou;
  majRegion();
  lancerMusique();
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
    <img class="dos-motif" src="images/logo-etoile.webp" alt="" draggable="false">
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
  else texte = t("plusDeBoosterCourt");
  $("#consigne").textContent = texte;
  // Plus de booster : grand compte à rebours (mis à jour chaque seconde, voir plus bas).
  $("#compte-a-rebours").hidden = !(etatJeu.pret && !etatJeu.erreur && etat.region && !vide && b === 0 && etat.prochainQuotidien);
  majCompteARebours();
  // Tant que le joueur n'a jamais découpé de paquet : le doigt montre le geste.
  $("#booster").classList.toggle("tuto", !prefs.tutoDecoupe && !$("#booster").disabled && !prefs.ouvertureRapide);
}

// « 05:12:33 » jusqu'au prochain booster gratuit.
function majCompteARebours() {
  if ($("#compte-a-rebours").hidden) return;
  const s = Math.max(0, Math.ceil((etat.prochainQuotidien - Date.now()) / 1000));
  const deux = n => String(n).padStart(2, "0");
  $("#car-temps").textContent = `${deux(Math.floor(s / 3600))}:${deux(Math.floor(s / 60) % 60)}:${deux(s % 60)}`;
  // Proposer les notifications, si elles ne sont pas déjà activées.
  $("#car-prevenir").hidden = !$("#bloc-notifications") || $("#bloc-notifications").hidden || $("#reglage-notifications").checked;
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
  if (nom === "collection") {
    voirNouvelles();
    afficherCollection();
  }
}

// ---------- Point rouge sur l'onglet Collection : des cartes nouvelles à découvrir ----------
let nouvellesAffichees = new Set();   // cartes marquées « Nouvelle » dans la collection, pendant cette visite

function majPointCollection() {
  $("#point-collection").hidden = !(prefs.cartesAVoir || []).some(id => CARTES.find(c => c.id === id));
}

// Le joueur ouvre la collection : les nouvelles cartes portent l'étiquette « Nouvelle »,
// le point rouge disparaît, et on affiche l'époque qui contient la première nouvelle carte.
function voirNouvelles() {
  const ids = (prefs.cartesAVoir || []).filter(id => CARTES.find(c => c.id === id));
  nouvellesAffichees = new Set(ids);
  if (!ids.length) return;
  const visible = familleActive ? cartesFamille(familleActive) : cartesExtension;
  if (!visible.some(c => nouvellesAffichees.has(c.id))) {
    familleActive = null;
    extensionActive = etat.extension = CARTES.find(c => c.id === ids[0]).extension;
    cartesExtension = cartesDe(extensionActive);
  }
  prefs.cartesAVoir = [];
  sauvegarderPrefs();
  majPointCollection();
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
  const animation = new Promise(r => setTimeout(r, dechire ? 950 : 900));

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
  const tirage = data.cartes.map(c => ({ ...CARTES.find(x => x.id === c.id), finition: finitionValide(c.finition) }));   // trié : la plus rare en dernier
  etat.boosters = data.boosters;
  // Le paquet suivant change d'aspect seulement une fois celui-ci ouvert (reinitialiserBooster).
  if ("booster_dore" in data) etat.boosterDore = data.booster_dore;
  if (data.pitie) notifier(t("notifPitie"));   // la pitié a forcé une Légendaire
  appliquerRegion(data);
  tirage.forEach(c => ajouterExemplaires(c.id, c.finition));
  // Nouvelles cartes : point rouge sur l'onglet Collection jusqu'à ce que le joueur aille les voir.
  const nouvellesIds = tirage.filter((c, i) => data.cartes[i].nouvelle).map(c => c.id);
  if (nouvellesIds.length) {
    prefs.cartesAVoir = [...new Set([...(prefs.cartesAVoir || []), ...nouvellesIds])];
    sauvegarderPrefs();
  }
  majCompteur();
  majPointCollection();

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
    emplacement.style.setProperty("--rang", tirage.length - 1 - i);   // sort du paquet : celle du fond d'abord
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
  // Les cartes sortent du paquet, puis l'animation s'efface (pour ne pas gêner les suivantes).
  zone.classList.add("sortie");
  setTimeout(() => zone.classList.remove("sortie"), 1200);
}

// Décale chaque carte selon sa profondeur dans la pile (0 = dessus) → effet « paquet ».
function majPositions() {
  pileTirage.forEach((carte, i) => {
    const el = $(`.emplacement[data-index="${i}"]`);
    if (!el) return;
    el.style.setProperty("--profondeur", Math.max(i - indexPile, 0));
    el.classList.toggle("dessous", i > indexPile);   // cachée sous la carte du dessus
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
  // Son : la carte se retourne, puis un carillon pour les cartes exceptionnelles.
  jouerSon("retournement");
  const carillon = carte.finition === "diamant" || carte.rarete === "mythique" ? "diamant"
    : carte.finition === "emeraude" || carte.rarete === "legendaire" ? "legendaire"
    : carte.rarete === "epique" ? "epique" : null;
  if (carillon) setTimeout(() => jouerSon(carillon), 180);
  if (carte.finition === "diamant") notifier(t("notifDiamant", { nom: carte.nom }));
  else if (carte.finition === "emeraude") notifier(t("notifEmeraude", { nom: carte.nom }));
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
    el.addEventListener("click", () => ouvrirModale(carte, pileTirage));
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

  // Toutes (les obtenues d'abord) / Obtenues / Manquantes / Doublons (pour les futurs échanges).
  const mode = prefs.possession || "toutes";
  $("#filtre-possession").querySelectorAll("button").forEach(b => b.classList.toggle("actif", b.dataset.possession === mode));
  const obtenues = liste.filter(c => etat.collection[c.id]);
  const manquantes = liste.filter(c => !etat.collection[c.id]);
  const doublons = obtenues.filter(c => etat.collection[c.id] > 1);
  const affichees = { obtenues, manquantes, doublons }[mode] || [...obtenues, ...manquantes];
  $("#collection-vide").hidden = affichees.length > 0 || total === 0;
  $("#collection-vide").textContent = t({ obtenues: "aucuneObtenue", doublons: "aucunDoublon" }[mode] || "toutObtenu");
  // Doublons : combien de cartes en double, et combien d'exemplaires en trop (à échanger plus tard).
  $("#doublons-info").hidden = mode !== "doublons" || !doublons.length;
  $("#doublons-info").textContent = t("doublonsInfo", {
    n: doublons.length, total: doublons.reduce((s, c) => s + etat.collection[c.id] - 1, 0) });

  const grille = $("#grille-collection");
  grille.innerHTML = "";
  // Cartes possédées, dans l'ordre affiché, dans leur plus belle version :
  // dans la carte agrandie, on passe de l'une à l'autre.
  const possedeesAffichees = affichees.filter(c => etat.collection[c.id])
    .map(c => ({ ...c, finition: versionsPossedees(c.id)[0] || "normale" }));
  for (const carte of affichees) {
    const nb = etat.collection[carte.id] || 0;
    const el = document.createElement(nb ? "button" : "div");
    el.className = "case-collection";
    if (nb) {
      const versionCarte = possedeesAffichees.find(c => c.id === carte.id);
      el.innerHTML = htmlCarte(versionCarte)
        + (nb > 1 ? `<span class="exemplaires">×${nb}</span>` : "")
        + (nouvellesAffichees.has(carte.id) ? `<span class="nouvelle">${t("nouvelle")}</span>` : "");
      el.setAttribute("aria-label", `${carte.nom}${nb > 1 ? ` ×${nb}` : ""}, ${t("agrandir")}`);
      el.addEventListener("click", () => ouvrirModale(versionCarte, possedeesAffichees));
    } else {
      el.innerHTML = `<div class="manquante"><span>${t("numero")} ${numero(carte)}</span><span class="manquante-rarete">${nomRarete(carte.rarete)}</span></div>`;
    }
    grille.appendChild(el);
  }
}

$("#filtre-possession").querySelectorAll("button").forEach(b => b.addEventListener("click", () => {
  prefs.possession = b.dataset.possession;
  sauvegarderPrefs();
  afficherCollection();
}));

// --- Agrandissement ---

let carteModale = null;

function afficherVersion(carte) {
  $("#modale-contenu").innerHTML = htmlCarte(carte);
  carteModale = carte;
  setTimeout(() => preparerPartage(carte), 400);   // après l'animation d'ouverture
}

// liste : les cartes voisines (collection affichée, booster ouvert) pour passer de l'une à l'autre.
let listeModale = [];
let indexModale = -1;

function ouvrirModale(carte, liste = []) {
  listeModale = liste;
  indexModale = liste.findIndex(c => c.id === carte.id);
  montrerCarteModale(carte);
  $("#modale-contenu").style.transform = "";
  positionDeDepart = null; // le gyroscope repart de la façon dont on tient le téléphone
  $("#activer-gyroscope").hidden = !gyroscopeAActiver();
  $("#modale").hidden = false;
  requestAnimationFrame(() => $("#modale").classList.add("ouverte"));
}

// Carte précédente (-1) ou suivante (+1), avec un petit glissement.
function changerCarteModale(sens) {
  const i = indexModale + sens;
  if (indexModale < 0 || i < 0 || i >= listeModale.length || !$("#savoir-plus").hidden) return;
  indexModale = i;
  montrerCarteModale(listeModale[i]);
  const contenu = $("#modale-contenu");
  contenu.classList.remove("arrivee-suivante", "arrivee-precedente");
  void contenu.offsetWidth;   // relance l'animation
  contenu.classList.add(sens > 0 ? "arrivee-suivante" : "arrivee-precedente");
  jouerSon("retournement");
}

function montrerCarteModale(carte) {
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
  // Flèches et position « 3 / 12 » (seulement s'il y a des cartes voisines).
  const navigation = indexModale >= 0 && listeModale.length > 1;
  $("#modale-precedente").hidden = !navigation || indexModale === 0;
  $("#modale-suivante").hidden = !navigation || indexModale === listeModale.length - 1;
  $("#modale-position").hidden = !navigation;
  $("#modale-position").textContent = navigation ? `${indexModale + 1} / ${listeModale.length}` : "";
}

$("#modale-precedente").addEventListener("click", () => changerCarteModale(-1));
$("#modale-suivante").addEventListener("click", () => changerCarteModale(1));
// Glisser la carte à gauche ou à droite (en hébreu, le sens de lecture est inversé).
const sensLecture = () => (document.documentElement.dir === "rtl" ? -1 : 1);
let departGlisseModale = null;
$("#modale-contenu").addEventListener("pointerdown", e => { departGlisseModale = { x: e.clientX, y: e.clientY }; });
$("#modale-contenu").addEventListener("pointerup", e => {
  if (!departGlisseModale) return;
  const dx = e.clientX - departGlisseModale.x, dy = e.clientY - departGlisseModale.y;
  departGlisseModale = null;
  if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) changerCarteModale((dx < 0 ? 1 : -1) * sensLecture());
});
$("#modale-contenu").addEventListener("pointercancel", () => { departGlisseModale = null; });
document.addEventListener("keydown", e => {
  if ($("#modale").hidden || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
  changerCarteModale((e.key === "ArrowRight" ? 1 : -1) * sensLecture());
});

function fermerModale() {
  const m = $("#modale");
  m.classList.remove("ouverte");
  setTimeout(() => { m.hidden = true; }, 200);
}

// Légère inclinaison 3D de la carte agrandie.
// x et y vont de -0,5 à 0,5 (0 = carte bien de face) : la carte penche
// au maximum de la moitié de l'amplitude (100 → 50°).
const INCLINAISON_SOURIS = 100;
const INCLINAISON_DOIGT = 100;     // plus marquée au toucher
const INCLINAISON_GYROSCOPE = 100;

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

// iPhone : à l'arrivée sur le site, une fenêtre propose d'autoriser le mouvement
// (Apple n'accepte la demande qu'après un appui du joueur, et l'oublie à chaque visite).
function proposerGyroscope() {
  if (!gyroscopeAActiver() || prefs.gyroJamais) return;
  $("#dialogue-gyro").hidden = false;
  $("#gyro-autoriser").focus();
}
const fermerGyro = () => { $("#dialogue-gyro").hidden = true; };
$("#gyro-autoriser").addEventListener("click", () => {
  DeviceOrientationEvent.requestPermission()
    .then(r => { if (r === "granted") { gyroscopeActif = true; positionDeDepart = null; $("#activer-gyroscope").hidden = true; } })
    .catch(() => { /* refusé : le jeu marche aussi sans */ })
    .finally(fermerGyro);
});
$("#gyro-plus-tard").addEventListener("click", fermerGyro);
$("#gyro-jamais").addEventListener("click", () => { prefs.gyroJamais = true; sauvegarderPrefs(); fermerGyro(); });
$("#dialogue-gyro").addEventListener("click", e => { if (e.target.id === "dialogue-gyro") fermerGyro(); });
document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("#dialogue-gyro").hidden) fermerGyro(); });
// Proposée une fois l'écran d'ouverture effacé (voir plus bas). Le délai laisse arriver les mesures :
// si le mouvement est déjà autorisé, la fenêtre ne s'ouvre pas.

// ---------- Démarrage ----------

// ---------- Paramètres (engrenage) : langue, confort, chances de tirage ----------

const vibrer = ms => { if (prefs.vibrations !== false) navigator.vibrate?.(ms); };

// Interrupteurs : { id de la case : [nom de la préférence, valeur par défaut] }
const INTERRUPTEURS = {
  "reglage-sons": ["sons", true],
  "reglage-musique": ["musique", true],
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
    if (cle === "sons" && caseACocher.checked) jouerSon("legendaire");
    if (cle === "musique") caseACocher.checked ? autoriserMusique() : arreterMusique();
  });
}

// Chances de tirage : lues dans la base (tables taux_tirage et reglages_tirage,
// supabase/13_taux_tirage.sql), les mêmes que celles qu'utilise le serveur.
const pourcent = x => new Intl.NumberFormat(LANGUE, { maximumFractionDigits: 2 }).format(x) + " %";

async function afficherChances() {
  basculerReglages(false);
  $("#contenu-chances").innerHTML = `<p>${t("chargement")}</p>`;
  $("#dialogue-chances").hidden = false;
  $("#fermer-chances").focus();
  const [taux, reglages] = await Promise.all([
    sb.from("taux_tirage").select("*").order("ordre"),
    sb.from("reglages_tirage").select("cle, valeur"),
  ]);
  if (taux.error || reglages.error || !taux.data?.length) {
    $("#contenu-chances").innerHTML = `<p>${t("chancesIndispo")}</p>`;
    return;
  }
  const R = Object.fromEntries(reglages.data.map(r => [r.cle, Number(r.valeur)]));
  // Une colonne de poids → liste des raretés possibles avec leur pourcentage.
  const liste = colonne => {
    const total = taux.data.reduce((s, l) => s + Number(l[colonne]), 0);
    return `<ul class="chances-liste">${taux.data.filter(l => Number(l[colonne]) > 0).map(l =>
      `<li><span class="pastille-rarete rarete-${l.rarete}"></span>${nomRarete(l.rarete)}<b>${pourcent(Number(l[colonne]) / total * 100)}</b></li>`).join("")}</ul>`;
  };
  const finitions = (emeraude, diamant) => `<ul class="chances-liste">${[["emeraude", emeraude], ["diamant", diamant]].map(([f, n]) =>
    `<li>${f === "diamant" ? "💎" : "💚"} ${nomFinition(f)}<b>${pourcent(100 / n)} <small>(${t("surX", { n })})</small></b></li>`).join("")}</ul>`;
  $("#contenu-chances").innerHTML = `
    <p>${t("chancesIntro")}</p>
    <p>${t("chances13")}</p>${liste("cartes_1_a_3")}
    <p>${t("chances4")}</p>${liste("carte_4")}
    <p>${t("chances5")}</p>${liste("carte_5")}
    <p>${t("chancesFinitions")}</p>${finitions(R.emeraude_sur ?? R.animee_sur ?? 25, R.diamant_sur ?? 150)}
    <p class="chances-dore">${t("chancesDore", { n: Math.round(1 / (R.chance_booster_dore ?? .1)) })}</p>${liste("carte_5_dore")}
    <p>${t("chancesDoreFinitions", { emeraude: R.emeraude_sur_dore ?? R.animee_sur_dore ?? 10, diamant: R.diamant_sur_dore ?? 50 })}</p>
    <p class="chances-note">${t("chancesPitie", { n: R.pitie_seuil ?? 50 })}</p>
    <p class="chances-note">${t("chancesNote")}</p>`;
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
      `<li><span class="regles-icone">${{ normale: "◆", emeraude: "💚", diamant: "💎" }[f]}</span><span><b>${nomFinition(f)}</b> — ${texte}</span></li>`).join("")}</ul>
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

// ---------- Application installable : icône sur l'écran d'accueil ----------
// Android / ordinateur : le navigateur propose l'installation, on la garde pour notre bouton.
// iPhone / iPad : Apple ne le permet pas en un clic, on montre comment faire.
let invitationInstallation = null;
const estInstallee = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const estIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const ICONE_PARTAGE = `<svg class="icone-partage-ios" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M8 7l4-4 4 4M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"/></svg>`;
function majBoutonInstaller() {
  $("#bouton-installer").hidden = estInstallee() || !(invitationInstallation || estIOS);
}
addEventListener("beforeinstallprompt", e => { e.preventDefault(); invitationInstallation = e; majBoutonInstaller(); });
addEventListener("appinstalled", () => { invitationInstallation = null; majBoutonInstaller(); notifier(t("appInstallee")); });
$("#bouton-installer").addEventListener("click", async () => {
  basculerReglages(false);
  if (invitationInstallation) {
    invitationInstallation.prompt();
    await invitationInstallation.userChoice;
    invitationInstallation = null;
    majBoutonInstaller();
    return;
  }
  $("#etapes-installer").innerHTML = [t("installerEtape1", { icone: ICONE_PARTAGE }), t("installerEtape2"), t("installerEtape3")]
    .map(e => `<li>${e}</li>`).join("");
  $("#dialogue-installer").hidden = false;
  $("#fermer-installer").focus();
});
const fermerInstaller = () => { $("#dialogue-installer").hidden = true; };
$("#fermer-installer").addEventListener("click", fermerInstaller);
$("#dialogue-installer").addEventListener("click", e => { if (e.target.id === "dialogue-installer") fermerInstaller(); });
document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("#dialogue-installer").hidden) fermerInstaller(); });
majBoutonInstaller();
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => { /* le jeu marche aussi sans */ });

// ---------- Notifications : « Votre booster gratuit est arrivé ! » ----------
// Le navigateur fournit une adresse d'envoi, enregistrée par le serveur (supabase/16_notifications.sql) ;
// l'Edge Function envoyer-notifications écrit à minuit (heure d'Israël) à tous les abonnés.
// iPhone : seulement avec l'application installée sur l'écran d'accueil (règle d'Apple).
const notifsPossibles = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
const caseNotifs = $("#reglage-notifications");
$("#bloc-notifications").hidden = !(notifsPossibles || estIOS);
const base64VersOctets = b => Uint8Array.from(atob((b + "===".slice((b.length + 3) % 4)).replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));

async function abonnementActuel() {
  return (await navigator.serviceWorker.ready).pushManager.getSubscription();
}
async function enregistrerAbonnement(abo) {
  const { endpoint, keys } = abo.toJSON();
  const { error } = await sb.rpc("enregistrer_abonnement", { p_endpoint: endpoint, p_p256dh: keys.p256dh, p_auth: keys.auth, p_langue: LANGUE });
  if (error) throw error;
}
async function activerNotifications() {
  if (!notifsPossibles) {   // iPhone dans Safari : il faut d'abord installer l'application
    notifier(t("notifIphoneInstaller"));
    $("#bouton-installer").click();
    return false;
  }
  if (await Notification.requestPermission() !== "granted") {
    notifier(t("notifRefusees"));
    return false;
  }
  const reg = await navigator.serviceWorker.ready;
  const abo = await reg.pushManager.getSubscription()
    || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64VersOctets(VAPID_PUBLIQUE) });
  await enregistrerAbonnement(abo);
  notifier(t("notifActivees"));
  return true;
}
async function desactiverNotifications() {
  const abo = await abonnementActuel();
  if (!abo) return;
  await sb.rpc("supprimer_abonnement", { p_endpoint: abo.endpoint });
  await abo.unsubscribe();
}
caseNotifs.addEventListener("change", async () => {
  const activer = caseNotifs.checked;
  caseNotifs.disabled = true;
  try {
    caseNotifs.checked = activer ? await activerNotifications() : (await desactiverNotifications(), false);
  } catch (err) {
    console.error(err);
    caseNotifs.checked = !activer;
    notifier(t("notifErreur"));
  } finally {
    caseNotifs.disabled = false;
  }
});
// Au démarrage : position de l'interrupteur, et abonnement rafraîchi (langue, compte du joueur).
async function majNotifications() {
  if (!notifsPossibles || Notification.permission !== "granted") return;
  const abo = await abonnementActuel().catch(() => null);
  caseNotifs.checked = !!abo;
  if (abo) enregistrerAbonnement(abo).catch(() => { /* réessayé au prochain lancement */ });
}

// Historique : les derniers boosters ouverts, lus dans le journal du serveur
// (table ouvertures : le joueur ne peut lire que les siens).
const NB_HISTORIQUE = 30;
async function afficherHistorique() {
  basculerReglages(false);
  const zone = $("#contenu-historique");
  zone.innerHTML = `<p>${t("chargement")}</p>`;
  $("#dialogue-historique").hidden = false;
  $("#fermer-historique").focus();
  const { data, error } = await sb.from("ouvertures").select("id, ouvert_le, region, cartes, finitions")
    .order("ouvert_le", { ascending: false }).limit(NB_HISTORIQUE);
  if (error) { zone.innerHTML = `<p>${t("historiqueIndispo")}</p>`; return; }
  if (!data.length) { zone.innerHTML = `<p>${t("historiqueVide")}</p>`; return; }
  const date = new Intl.DateTimeFormat(LANGUE, { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
  zone.innerHTML = `<p class="chances-note">${t("historiqueIntro", { n: NB_HISTORIQUE })}</p>` + data.map(o => {
    // Les 5 cartes, de la plus courante à la plus rare (comme à l'ouverture).
    const cartes = o.cartes.map((id, i) => ({ id, carte: CARTES.find(x => x.id === id), finition: finitionValide(o.finitions?.[i]) }))
      .sort((a, b) => RANG_RARETE.indexOf(a.carte?.rarete) - RANG_RARETE.indexOf(b.carte?.rarete));
    return `<article class="historique-booster">
      <h3><time datetime="${o.ouvert_le}">${date.format(new Date(o.ouvert_le))}</time><span>${nomRegion(o.region)}</span></h3>
      <ul>${cartes.map(({ id, carte, finition }) => `<li><button class="historique-carte" data-id="${echapper(id)}" data-finition="${finition}"${carte ? "" : " disabled"}>
        <span class="pastille-rarete rarete-${carte?.rarete || "ordinaire"}"></span>${echapper(carte?.nom || id)}${finition === "diamant" ? " 💎" : finition === "emeraude" ? " 💚" : ""}</button></li>`).join("")}</ul>
    </article>`;
  }).join("");
}
const fermerHistorique = () => { $("#dialogue-historique").hidden = true; };
$("#bouton-historique").addEventListener("click", afficherHistorique);
$("#fermer-historique").addEventListener("click", fermerHistorique);
$("#dialogue-historique").addEventListener("click", e => {
  if (e.target.id === "dialogue-historique") return fermerHistorique();
  // Une carte de l'historique : on l'affiche en grand, dans la version obtenue.
  const bouton = e.target.closest(".historique-carte");
  const carte = bouton && CARTES.find(x => x.id === bouton.dataset.id);
  if (!carte) return;
  fermerHistorique();
  ouvrirModale({ ...carte, finition: bouton.dataset.finition });
});
document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("#dialogue-historique").hidden) fermerHistorique(); });
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
queueMicrotask(() => choisirMonument());
let dechirure = null;      // geste en cours : { sens, trace, depart, ... }

// La découpe suit le doigt, comme une lame : on garde le tracé (en % du paquet),
// limité au haut du paquet (entre HAUT_MIN et HAUT_MAX % de la hauteur).
const HAUT_MIN = 3, HAUT_MAX = 30;
const ligneCoupe = boosterEl.querySelector(".ligne-dechirure polyline");

function pointDansPaquet(e) {
  const z = boosterEl.getBoundingClientRect();
  return [
    Math.max(0, Math.min(100, (e.clientX - z.left) / z.width * 100)),
    Math.max(HAUT_MIN, Math.min(HAUT_MAX, (e.clientY - z.top) / z.height * 100)),
  ];
}

// Dessine le tracé et place la petite lumière au bout du doigt.
function dessinerCoupe(trace) {
  ligneCoupe.setAttribute("points", trace.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" "));
  const [x, y] = trace[trace.length - 1] || [0, 0];
  boosterEl.style.setProperty("--px", x + "%");
  boosterEl.style.setProperty("--py", y + "%");
}

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
  boosterEl.dataset.glisse = "";
  ligneCoupe.setAttribute("points", "");
  pencherBooster(0, 0);
  appliquerBoosterDore();
  choisirMonument();
}

// Un monument différent sur chaque paquet (monuments.js), jamais deux fois de suite le même.
let monumentActuel = null;
function choisirMonument() {
  const cles = Object.keys(MONUMENTS).filter(c => c !== monumentActuel);
  monumentActuel = cles[Math.floor(Math.random() * cles.length)];
  boosterEl.querySelector(".booster-filigrane").innerHTML = dessinMonument(monumentActuel);
}

// Le haut du paquet est découpé le long du tracé : la bande s'envole, une lumière
// douce s'échappe de l'ouverture, le paquet descend et les cartes en sortent.
function dechirerBooster(trace) {
  dechirure = null;
  if (!prefs.tutoDecoupe) { prefs.tutoDecoupe = true; sauvegarderPrefs(); boosterEl.classList.remove("tuto"); }
  boosterEl.dataset.glisse = "1";   // le « clic » qui suit le geste ne doit pas afficher l'aide
  vibrer([25, 40, 45]);
  jouerSon("decoupe");
  // Tracé de gauche à droite, prolongé jusqu'aux deux bords du paquet.
  const t = trace[0][0] > trace[trace.length - 1][0] ? [...trace].reverse() : [...trace];
  t.unshift([0, t[0][1]]);
  t.push([100, t[t.length - 1][1]]);
  const points = l => l.map(([x, y]) => `${x.toFixed(1)}% ${y.toFixed(1)}%`).join(", ");
  boosterEl.style.setProperty("--coupe-y", (t.reduce((s, [, y]) => s + y, 0) / t.length).toFixed(1) + "%");
  const contenu = [...boosterEl.querySelectorAll(".booster-sachet, .booster-bord, .booster-titre, .booster-logo, .booster-info")];
  for (const [cote, forme] of [["haut", `0% 0%, 100% 0%, ${points([...t].reverse())}`], ["bas", `${points(t)}, 100% 100%, 0% 100%`]]) {
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

// Clavier ou « Ouverture rapide » : le paquet se découpe tout seul, d'un trait légèrement ondulé.
function decouperAuto() {
  if (boosterEl.disabled || enCours || boosterEl.classList.contains("dechire")) return;
  if (etat.boosters <= 0 || !etatJeu.pret || !etat.region) return ouvrirBooster();   // affiche le bon message
  const y0 = 7 + Math.random() * 3, onde = Math.random() * Math.PI;
  const point = p => [p * 100, y0 + Math.sin(onde + p * 4) * .8 + p * 1.5];
  if (animationsReduites()) return dechirerBooster([point(0), point(1)]);
  const debut = performance.now(), duree = prefs.ouvertureRapide ? 260 : 420;
  boosterEl.classList.add("en-dechirure");
  const trace = [];
  const avancer = maintenant => {
    const p = Math.min(1, (maintenant - debut) / duree);
    trace.push(point(p));
    dessinerCoupe(trace);
    majDechirure(p);
    if (p < 1) requestAnimationFrame(avancer);
    else dechirerBooster(trace);
  };
  requestAnimationFrame(avancer);
}

boosterEl.addEventListener("pointerdown", e => {
  if (boosterEl.disabled || enCours || boosterEl.classList.contains("dechire") || prefs.ouvertureRapide) return;
  pencherBooster(0, 0);
  dechirure = { x0: e.clientX, y0: e.clientY, p: 0, bouge: false, sens: 1, trace: [] };
  try { boosterEl.setPointerCapture(e.pointerId); } catch { /* pointeur déjà relâché */ }
});
boosterEl.addEventListener("pointermove", e => {
  if (!dechirure) return;
  const dx = e.clientX - dechirure.x0, dy = e.clientY - dechirure.y0;
  if (!dechirure.bouge) {
    // Le geste commence quand le doigt part sur le côté (dans un sens ou dans l'autre).
    if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy)) return;
    dechirure.bouge = true;
    dechirure.sens = Math.sign(dx);
    boosterEl.classList.add("en-dechirure");
  }
  const [x, y] = pointDansPaquet(e);
  const trace = dechirure.trace;
  const dernier = trace[trace.length - 1];
  // La lame n'avance que dans un sens : un retour en arrière ne recoupe pas.
  if (!dernier) {
    trace.push([dechirure.sens > 0 ? 0 : 100, y], [x, y]);   // la coupe part du bord
    dechirure.depart = x;
  } else if ((x - dernier[0]) * dechirure.sens > .8) {
    trace.push([x, y]);
  } else {
    return;
  }
  dessinerCoupe(trace);
  const p = dechirure.sens > 0 ? x / 100 : 1 - x / 100;
  majDechirure(p);
  // Coupé jusqu'au bout (et pas seulement un petit geste près du bord) : le paquet s'ouvre.
  if (p >= .97 && Math.abs(x - dechirure.depart) > 35) dechirerBooster(trace);
});
const relacher = () => {
  if (!dechirure) return;
  boosterEl.dataset.glisse = dechirure.bouge ? "1" : "";
  dechirure = null;
  boosterEl.classList.remove("en-dechirure");
  ligneCoupe.setAttribute("points", "");   // lâché trop tôt : la coupe se referme
  majDechirure(0);
};
boosterEl.addEventListener("pointerup", relacher);
boosterEl.addEventListener("pointercancel", relacher);

boosterEl.addEventListener("click", e => {
  if (boosterEl.dataset.glisse) { boosterEl.dataset.glisse = ""; return; }
  if (boosterEl.classList.contains("dechire")) return;
  // Clavier (Entrée / Espace) ou « Ouverture rapide » : ouverture directe.
  if (e.detail === 0 || prefs.ouvertureRapide) return decouperAuto();
  // Simple appui : on montre le geste à faire.
  boosterEl.classList.remove("indice");
  void boosterEl.offsetWidth;
  boosterEl.classList.add("indice");
  notifier(t("glisserPourOuvrir"));
});
// ---------- Le paquet penche : vers la souris, ou quand on incline le téléphone ----------

const INCLINAISON_BOOSTER = 16;   // degrés, au maximum
function pencherBooster(x, y) {   // x, y : de -0,5 à 0,5 (0 = bien de face)
  const borne = v => Math.max(-0.5, Math.min(0.5, v));
  x = borne(x); y = borne(y);
  const s = boosterEl.style;
  s.setProperty("--incl-x", (x * 2 * INCLINAISON_BOOSTER).toFixed(2));
  s.setProperty("--incl-y", (-y * 2 * INCLINAISON_BOOSTER).toFixed(2));
  s.setProperty("--mx", (50 + x * 100).toFixed(1) + "%");   // le reflet suit le mouvement
  s.setProperty("--my", (50 + y * 100).toFixed(1) + "%");
  s.setProperty("--brillance", Math.min(1, Math.hypot(x, y) * 2.5).toFixed(2));
}
boosterEl.addEventListener("pointermove", e => {
  if (e.pointerType !== "mouse" || dechirure || animationsReduites()) return;
  const z = boosterEl.getBoundingClientRect();
  pencherBooster((e.clientX - z.left) / z.width - 0.5, (e.clientY - z.top) / z.height - 0.5);
});
boosterEl.addEventListener("pointerleave", () => pencherBooster(0, 0));

// Téléphone : la position « de repos » suit lentement le téléphone,
// seuls les mouvements récents font pencher le paquet.
let reposBooster = null;
addEventListener("deviceorientation", e => {
  if (e.beta === null || e.gamma === null) return;
  if ($("#vue-booster").hidden || $("#zone-booster").hidden || dechirure || enCours || animationsReduites()) return;
  reposBooster ??= { beta: e.beta, gamma: e.gamma };
  reposBooster.beta += (e.beta - reposBooster.beta) * 0.02;
  reposBooster.gamma += (e.gamma - reposBooster.gamma) * 0.02;
  pencherBooster((e.gamma - reposBooster.gamma) / 30, (e.beta - reposBooster.beta) / 30);
});

// ---------- La pile de cartes se penche, pour apercevoir le bord des suivantes ----------

const INCLINAISON_PILE = 20;   // degrés, au maximum
function pencherPile(x, y) {   // x, y : de -0,5 à 0,5
  const borne = v => Math.max(-0.5, Math.min(0.5, v));
  const s = $("#tirage").style;
  s.setProperty("--pile-x", (borne(x) * 2 * INCLINAISON_PILE).toFixed(2));
  s.setProperty("--pile-y", (-borne(y) * 2 * INCLINAISON_PILE).toFixed(2));
}
const pileVisible = () => !$("#tirage").hidden && $("#tirage").classList.contains("pile") && !$("#vue-booster").hidden;
// Ordinateur : la pile suit la souris.
$("#tirage").addEventListener("pointermove", e => {
  if (e.pointerType !== "mouse" || !pileVisible() || animationsReduites()) return;
  const z = $("#tirage").getBoundingClientRect();
  pencherPile((e.clientX - z.left) / z.width - 0.5, (e.clientY - z.top) / z.height - 0.5);
});
$("#tirage").addEventListener("pointerleave", () => pencherPile(0, 0));
// Téléphone : en inclinant le téléphone (même principe que le paquet).
let reposPile = null;
addEventListener("deviceorientation", e => {
  if (e.beta === null || e.gamma === null || !pileVisible() || animationsReduites()) return;
  reposPile ??= { beta: e.beta, gamma: e.gamma };
  reposPile.beta += (e.beta - reposPile.beta) * 0.02;
  reposPile.gamma += (e.gamma - reposPile.gamma) * 0.02;
  pencherPile((e.gamma - reposPile.gamma) / 30, (e.beta - reposPile.beta) / 30);
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
// Chaque seconde : le compte à rebours. Quand il arrive à zéro, on redemande au serveur
// le cadeau quotidien (c'est lui qui tranche), au plus une fois toutes les 30 s.
let derniereDemande = 0;
setInterval(async () => {
  if (!etatJeu.pret) return;
  majCompteARebours();
  if (etat.boosters === 0 && etat.prochainQuotidien && Date.now() >= etat.prochainQuotidien && Date.now() - derniereDemande > 30000) {
    derniereDemande = Date.now();
    try {
      const q = await reclamerQuotidien();
      if (q.accorde) notifier(q.accordes > 1 ? t("quotidienN", { n: q.accordes }) : t("quotidien"));
    } catch (e) { /* on réessaiera au prochain passage */ }
    majConsigne();
  }
}, 1000);
// « Me prévenir » sous le compte à rebours : active les notifications.
$("#car-prevenir").addEventListener("click", () => {
  const c = $("#reglage-notifications");
  c.checked = true;
  c.dispatchEvent(new Event("change"));
  setTimeout(majCompteARebours, 1500);
});

// ---------- Musique d'ambiance (sons.js) ----------
// Elle ne démarre qu'après un appui du joueur (règle des navigateurs) :
// après le jingle de « Touchez pour jouer », sinon au premier appui sur l'écran.
let musiqueAutorisee = false;
const lancerMusique = () => { if (musiqueAutorisee) demarrerMusique(etat.region); };
function autoriserMusique() {
  musiqueAutorisee = true;
  lancerMusique();
}
let attenteJingle = false;   // « Touchez pour jouer » vient d'être touché : la musique attend la fin du jingle
document.addEventListener("pointerdown", function premierAppui() {
  if (!musiqueAutorisee) {
    if (intro?.isConnected && !racine.classList.contains("intro-lancee")) return;   // l'écran d'ouverture s'en charge
    if (attenteJingle) return;
    autoriserMusique();
  }
  document.removeEventListener("pointerdown", premierAppui);
});

// Écran d'ouverture : « Touchez pour jouer » → fanfare (sons.js) et animation ;
// un 2e appui le passe. Il est retiré une fois effacé.
const intro = getComputedStyle($("#intro")).display === "none" ? null : $("#intro");
const racine = document.documentElement;
// Retire l'écran d'ouverture (une seule fois), puis propose le gyroscope sur iPhone.
function retirerIntro() {
  if (!intro.isConnected) return;
  intro.remove();
  setTimeout(proposerGyroscope, 400);
}
function lancerIntro() {
  if (racine.classList.contains("intro-lancee")) return;
  racine.classList.add("intro-lancee");
  jouerSon("ouverture");
  attenteJingle = true;
  setTimeout(autoriserMusique, 4500);   // l'ambiance de la région prend le relais du jingle
  setTimeout(retirerIntro, 3500);   // sécurité
}
if (intro) {
  intro.addEventListener("click", () => {
    if (racine.classList.contains("intro-lancee")) intro.classList.add("fini");
    else lancerIntro();
  });
  addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") lancerIntro(); });
  intro.addEventListener("animationend", e => {
    if (e.animationName === "intro-sortie" && e.target === intro) retirerIntro();
  });
  if (racine.classList.contains("intro-lancee")) setTimeout(retirerIntro, 3500);   // sons coupés : sécurité
} else {
  setTimeout(proposerGyroscope, 600);
}

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
    majNotifications();
    majCompteur();
    majPointCollection();
    majConsigne();
    if (!$("#vue-collection").hidden) afficherCollection();
    if (q.nouveau) notifier(t("bienvenue", { n: q.boosters }));
    else if (q.accorde) notifier(q.accordes > 1 ? t("quotidienN", { n: q.accordes }) : t("quotidien"));
  } catch (err) {
    console.error(err);
    etatJeu.verification = false;
    etatJeu.erreur = /anti_robot|captcha/i.test(err?.message || "") ? "anti_robot" : true;
    majConsigne();
  }
}

demarrer();
