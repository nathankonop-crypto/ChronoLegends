// =============================================================
//  CHRONOLEGENDS — Langues (français / anglais)
//  Langue choisie : celle mémorisée par le joueur (bouton FR / EN),
//  sinon celle du navigateur (français si le navigateur est en
//  français, anglais pour tous les autres).
//  Pour ajouter un texte : une clé dans TEXTES.fr ET TEXTES.en.
// =============================================================

const CLE_LANGUE = "chronolegends.langue";

let LANGUE = (() => {
  try {
    const memo = localStorage.getItem(CLE_LANGUE);
    if (memo === "fr" || memo === "en") return memo;
  } catch (e) {}
  const nav = (navigator.languages && navigator.languages[0]) || navigator.language || "en";
  return nav.toLowerCase().startsWith("fr") ? "fr" : "en";
})();

function changerLangue(langue) {
  try { localStorage.setItem(CLE_LANGUE, langue); } catch (e) {}
  location.reload();
}

// ---------- Noms anglais des listes du jeu (le français est dans reglages.js) ----------

const NOMS_EN = {
  raretes: { ordinaire: "Common", notable: "Notable", rare: "Rare", epique: "Epic", legendaire: "Legendary", mythique: "Mythic" },
  regions: { "europe": "Europe", "afrique": "Africa", "moyen-orient": "Middle East", "asie": "Asia", "ameriques": "Americas", "oceanie": "Oceania" },
  epoques: {
    antiquite:              { nom: "Antiquity",           sousTitre: "From the first empires to the 5th century" },
    "moyen-age":            { nom: "Middle Ages",         sousTitre: "From the 5th to the 15th century" },
    "temps-modernes":       { nom: "Early Modern Period", sousTitre: "From the late 15th century to 1789" },
    "epoque-contemporaine": { nom: "Modern Era",          sousTitre: "From 1789 to the present day" },
  },
};

const nomRarete = k => (LANGUE === "en" ? NOMS_EN.raretes[k] : RARETES[k]?.nom) ?? k;
const nomRegion = k => (LANGUE === "en" ? NOMS_EN.regions[k] : REGIONS[k]) ?? k;
const nomEpoque = k => (LANGUE === "en" ? NOMS_EN.epoques[k]?.nom : EXTENSIONS[k]?.nom) ?? k;
const sousTitreEpoque = k => (LANGUE === "en" ? NOMS_EN.epoques[k]?.sousTitre : EXTENSIONS[k]?.sousTitre) ?? "";

// Nom d'un pays (code « IL ») dans la langue du jeu.
function nomPays(code) {
  try { return new Intl.DisplayNames([LANGUE], { type: "region" }).of(code); } catch (e) { return code; }
}

// ---------- Textes de l'interface ----------

const pluriel = (n, un, plusieurs) => (n > 1 ? plusieurs : un);

const TEXTES = {
  fr: {
    titrePage: "ChronoLegends — Cartes d'histoire du monde",
    descriptionPage: "Collectionnez les grandes figures de l'histoire mondiale.",
    sousTitreMarque: "Cartes d'histoire du monde",
    ongletBoosters: "Boosters",
    ongletCollection: "Collection",
    ouvrirLeBooster: "Ouvrir le booster",
    toutesEpoques: "Toutes époques",
    cinqCartes: "5 cartes",
    slogan: "« La chasse ne s'arrête jamais »",
    toutReveler: "Tout révéler",
    ouvrirUnAutre: "Ouvrir un autre booster",
    epoque: "Époque",
    fermer: "Fermer",
    langue: "Langue",
    piedPrototype: "Prototype — votre collection est enregistrée sur nos serveurs, liée à ce navigateur.",
    piedGeo: "Un compte anonyme (sans e-mail) est créé automatiquement pour garder votre collection. Vos boosters dépendent de votre région, déterminée par notre serveur à partir du pays de votre adresse IP. Seuls le pays et la région sont enregistrés, jamais votre adresse IP ni votre position.",

    erreurAntiRobot: "La vérification anti-robot a échoué. Rechargez la page pour réessayer.",
    erreurServeur: "Impossible de joindre le serveur. Vérifiez votre connexion puis rechargez la page.",
    verification: "Petite vérification avant votre premier booster…",
    chargement: "Chargement…",
    paysInconnu: "Impossible de déterminer votre pays (VPN ou réseau anonyme ?). Désactivez-le puis rechargez la page.",
    regionVide: p => `Pas encore de cartes pour la région ${p.region}. Elles arrivent bientôt !`,
    boostersDispo: p => `${p.n} ${pluriel(p.n, "booster disponible", "boosters disponibles")} — touchez pour ouvrir`,
    plusDeBooster: p => `Plus de booster pour l'instant. Prochain booster quotidien dans ${p.attente}.`,
    moinsDUneMinute: "moins d'une minute",

    ligneRegion: p => `Région : ${p.region}${p.pays ? ` · connexion depuis : ${p.pays}` : ""}`,
    verrou: p => `Vous semblez être en ${p.region}. Si vous y êtes toujours à partir du ${p.quand}, vos boosters passeront à cette région.`,
    nouvelleRegion: p => `Vous êtes en ${p.region} : vos boosters contiendront ses personnages.`,

    serveurPlusDeBooster: "Plus de booster disponible.",
    serveurRegionVide: "Pas encore de cartes pour votre région.",
    serveurRegionInconnue: "Impossible de déterminer votre pays (VPN ou réseau anonyme ?).",
    serveurErreurOuverture: "Le serveur n'a pas pu ouvrir le booster. Réessayez.",

    revelerLaCarte: "Révéler la carte",
    plusBelle: "La plus belle du paquet !",
    touchezSuivante: "Touchez à nouveau pour la carte suivante",
    touchezReveler: p => `Touchez la carte pour la révéler  ·  ${p.n} ${pluriel(p.n, "restante", "restantes")}`,
    nouvelle: "Nouvelle",
    notifMythique: p => `✦ Carte MYTHIQUE : ${p.nom} ✦`,
    notifLegendaire: p => `Carte légendaire : ${p.nom} !`,
    notifEpique: p => `Carte épique : ${p.nom}`,
    agrandir: "agrandir",
    retour: "Retour",
    ouvrirUnAutreN: p => `Ouvrir un autre booster (${p.n})`,

    progression: p => `${p.n} ${pluriel(p.n, "carte", "cartes")} sur ${p.total}`,
    epoqueVide: "Les premières cartes de cette époque arrivent bientôt.",
    quotidien: "Votre booster quotidien est arrivé.",
    bienvenue: p => `Bienvenue ! Voici ${p.n} boosters offerts.`,

    numero: "N°",
    illustrationAVenir: "ILLUSTRATION À VENIR",
    portraitDe: p => `Portrait de ${p.nom}`,
  },

  en: {
    titrePage: "ChronoLegends — World History Cards",
    descriptionPage: "Collect the great figures of world history.",
    sousTitreMarque: "World history cards",
    ongletBoosters: "Boosters",
    ongletCollection: "Collection",
    ouvrirLeBooster: "Open the booster",
    toutesEpoques: "All eras",
    cinqCartes: "5 cards",
    slogan: "“The hunt never ends”",
    toutReveler: "Reveal all",
    ouvrirUnAutre: "Open another booster",
    epoque: "Era",
    fermer: "Close",
    langue: "Language",
    piedPrototype: "Prototype — your collection is saved on our servers, linked to this browser.",
    piedGeo: "An anonymous account (no email) is created automatically to keep your collection. Your boosters depend on your region, determined by our server from the country of your IP address. Only the country and region are saved, never your IP address or your location.",

    erreurAntiRobot: "The anti-robot check failed. Reload the page to try again.",
    erreurServeur: "Unable to reach the server. Check your connection, then reload the page.",
    verification: "Quick check before your first booster…",
    chargement: "Loading…",
    paysInconnu: "Unable to determine your country (VPN or anonymous network?). Turn it off, then reload the page.",
    regionVide: p => `No cards yet for the ${p.region} region. They're coming soon!`,
    boostersDispo: p => `${p.n} ${pluriel(p.n, "booster", "boosters")} available — tap to open`,
    plusDeBooster: p => `No boosters left for now. Next daily booster in ${p.attente}.`,
    moinsDUneMinute: "less than a minute",

    ligneRegion: p => `Region: ${p.region}${p.pays ? ` · connecting from: ${p.pays}` : ""}`,
    verrou: p => `You seem to be in ${p.region}. If you are still there from ${p.quand}, your boosters will switch to this region.`,
    nouvelleRegion: p => `You are in ${p.region}: your boosters will contain its characters.`,

    serveurPlusDeBooster: "No boosters available.",
    serveurRegionVide: "No cards yet for your region.",
    serveurRegionInconnue: "Unable to determine your country (VPN or anonymous network?).",
    serveurErreurOuverture: "The server couldn't open the booster. Please try again.",

    revelerLaCarte: "Reveal the card",
    plusBelle: "The best of the pack!",
    touchezSuivante: "Tap again for the next card",
    touchezReveler: p => `Tap the card to reveal it  ·  ${p.n} left`,
    nouvelle: "New",
    notifMythique: p => `✦ MYTHIC card: ${p.nom} ✦`,
    notifLegendaire: p => `Legendary card: ${p.nom}!`,
    notifEpique: p => `Epic card: ${p.nom}`,
    agrandir: "enlarge",
    retour: "Back",
    ouvrirUnAutreN: p => `Open another booster (${p.n})`,

    progression: p => `${p.n} of ${p.total} ${pluriel(p.total, "card", "cards")}`,
    epoqueVide: "The first cards of this era are coming soon.",
    quotidien: "Your daily booster has arrived.",
    bienvenue: p => `Welcome! Here are ${p.n} free boosters.`,

    numero: "No.",
    illustrationAVenir: "ILLUSTRATION COMING SOON",
    portraitDe: p => `Portrait of ${p.nom}`,
  },
};

function t(cle, params = {}) {
  const texte = TEXTES[LANGUE][cle] ?? TEXTES.fr[cle] ?? cle;
  return typeof texte === "function" ? texte(params) : texte;
}

// Traduit les éléments de la page marqués data-t (texte) et data-t-aria (aria-label).
function traduirePage() {
  document.documentElement.lang = LANGUE;
  document.querySelectorAll("[data-t]").forEach(el => { el.textContent = t(el.dataset.t); });
  document.querySelectorAll("[data-t-aria]").forEach(el => { el.setAttribute("aria-label", t(el.dataset.tAria)); });
  document.querySelectorAll("[data-langue]").forEach(b => {
    b.classList.toggle("actif", b.dataset.langue === LANGUE);
    b.addEventListener("click", () => { if (b.dataset.langue !== LANGUE) changerLangue(b.dataset.langue); });
  });
}
