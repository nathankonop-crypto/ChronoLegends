// =============================================================
//  CHRONOLEGENDS — Langues (français / anglais / hébreu)
//  Langue choisie : celle mémorisée par le joueur (bouton FR / EN / עב),
//  sinon celle du navigateur (français ou hébreu si le navigateur
//  l'est, anglais pour tous les autres).
//  En hébreu, seule l'interface est traduite (avec « En savoir plus ») :
//  les cartes elles-mêmes restent en anglais (voir langueCartes).
//  Pour ajouter un texte : une clé dans TEXTES.fr, TEXTES.en ET TEXTES.he.
// =============================================================

const CLE_LANGUE = "chronolegends.langue";

let LANGUE = (() => {
  try {
    const memo = localStorage.getItem(CLE_LANGUE);
    if (memo === "fr" || memo === "en" || memo === "he") return memo;
  } catch (e) {}
  const nav = ((navigator.languages && navigator.languages[0]) || navigator.language || "en").toLowerCase();
  if (nav.startsWith("fr")) return "fr";
  if (nav.startsWith("he") || nav.startsWith("iw")) return "he";
  return "en";
})();

// Langue du contenu des cartes : le français, sinon l'anglais (aussi pour l'hébreu).
const langueCartes = () => (LANGUE === "fr" ? "fr" : "en");

function changerLangue(langue) {
  try { localStorage.setItem(CLE_LANGUE, langue); } catch (e) {}
  location.reload();
}

// ---------- Noms anglais et hébreux des listes du jeu (le français est dans reglages.js) ----------

const NOMS = {
  en: {
    raretes: { ordinaire: "Common", notable: "Notable", rare: "Rare", epique: "Epic", legendaire: "Legendary", mythique: "Mythic" },
    regions: { "europe": "Europe", "afrique": "Africa", "moyen-orient": "Middle East", "asie": "Asia", "ameriques": "Americas", "oceanie": "Oceania" },
    epoques: {
      antiquite:              { nom: "Antiquity",           sousTitre: "From the first empires to the 5th century" },
      "moyen-age":            { nom: "Middle Ages",         sousTitre: "From the 5th to the 15th century" },
      "temps-modernes":       { nom: "Early Modern Period", sousTitre: "From the late 15th century to 1789" },
      "epoque-contemporaine": { nom: "Modern Era",          sousTitre: "From 1789 to the present day" },
    },
  },
  he: {
    raretes: { ordinaire: "רגיל", notable: "בולט", rare: "נדיר", epique: "אפי", legendaire: "אגדי", mythique: "מיתי" },
    regions: { "europe": "אירופה", "afrique": "אפריקה", "moyen-orient": "המזרח התיכון", "asie": "אסיה", "ameriques": "אמריקה", "oceanie": "אוקיאניה" },
    epoques: {
      antiquite:              { nom: "העת העתיקה",          sousTitre: "מהאימפריות הראשונות ועד המאה ה־5" },
      "moyen-age":            { nom: "ימי הביניים",          sousTitre: "מהמאה ה־5 ועד המאה ה־15" },
      "temps-modernes":       { nom: "העת החדשה המוקדמת",   sousTitre: "מסוף המאה ה־15 ועד 1789" },
      "epoque-contemporaine": { nom: "העת החדשה",           sousTitre: "מ־1789 ועד ימינו" },
    },
  },
};

// Le paramètre langue sert au dessin des cartes, qui suit langueCartes().
const nomRarete = (k, langue = LANGUE) => (langue === "fr" ? RARETES[k]?.nom : NOMS[langue].raretes[k]) ?? k;
const nomRegion = (k, langue = LANGUE) => (langue === "fr" ? REGIONS[k] : NOMS[langue].regions[k]) ?? k;
const nomEpoque = (k, langue = LANGUE) => (langue === "fr" ? EXTENSIONS[k]?.nom : NOMS[langue].epoques[k]?.nom) ?? k;
// Gamme de la carte, en version courte : son initiale (P, A, É, L, M, O) s'affiche en bas de la carte
// (le nom entier apparaît au survol).
const GAMMES_CARTE = {
  fr: { personnage: "Personnage", archetype: "Archétype", evenement: "Événement", lieu: "Lieu", mythologie: "Mythologie", objet: "Objet" },
  en: { personnage: "Figure", archetype: "Archetype", evenement: "Event", lieu: "Landmark", mythologie: "Mythology", objet: "Object" },
};
const nomGamme = (k, langue = langueCartes()) => GAMMES_CARTE[langue]?.[k] ?? GAMMES_CARTE.en[k] ?? "";
// Finitions (versions plus rares d'une carte, tirées au sort à l'ouverture).
const NOMS_FINITIONS = {
  fr: { normale: "Normale", animee: "Animée", diamant: "Diamant" },
  en: { normale: "Standard", animee: "Animated", diamant: "Diamond" },
  he: { normale: "רגיל", animee: "מונפש", diamant: "יהלום" },
};
const nomFinition = (k, langue = LANGUE) => NOMS_FINITIONS[langue]?.[k] ?? k;
const sousTitreEpoque = k => (LANGUE === "fr" ? EXTENSIONS[k]?.sousTitre : NOMS[LANGUE].epoques[k]?.sousTitre) ?? "";

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
    glissezSuivante: "Faites glisser la carte sur le côté pour la suivante",
    touchezReveler: p => `Touchez la carte pour la révéler  ·  ${p.n} ${pluriel(p.n, "restante", "restantes")}`,
    nouvelle: "Nouvelle",
    notifMythique: p => `✦ Carte MYTHIQUE : ${p.nom} ✦`,
    notifDiamant: p => `💎 Carte DIAMANT : ${p.nom} ! 💎`,
    notifAnimee: p => `✨ Carte animée : ${p.nom} !`,
    notifLegendaire: p => `Carte légendaire : ${p.nom} !`,
    notifEpique: p => `Carte épique : ${p.nom}`,
    agrandir: "agrandir",
    retour: "Retour",
    ouvrirUnAutreN: p => `Ouvrir un autre booster (${p.n})`,

    partager: "Partager",
    gyroActiver: "Activer le mouvement",
    enSavoirPlus: "En savoir plus",
    partagerMeilleure: "Partager ma plus belle carte",
    partageObtenu: "Je viens d'obtenir",
    partageTexte: p => `J'ai obtenu ${p.nom} (${p.rarete}) dans ChronoLegends ! Viens collectionner l'histoire du monde :`,
    partagePreparation: "Préparation de l'image…",
    partageReessayer: "L'image est prête : appuyez encore sur Partager.",
    partageTelecharge: "Image enregistrée et texte copié : collez-les où vous voulez !",
    partageCopie: "Texte copié : collez-le où vous voulez !",

    progression: p => `${p.n} ${pluriel(p.n, "carte", "cartes")} sur ${p.total}`,
    epoqueVide: "Les premières cartes de cette époque arrivent bientôt.",
    familles: "Familles",
    familleToutesEpoques: "Une famille à travers toutes les époques",
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
    glissezSuivante: "Swipe the card aside for the next one",
    touchezReveler: p => `Tap the card to reveal it  ·  ${p.n} left`,
    nouvelle: "New",
    notifMythique: p => `✦ MYTHIC card: ${p.nom} ✦`,
    notifDiamant: p => `💎 DIAMOND card: ${p.nom}! 💎`,
    notifAnimee: p => `✨ Animated card: ${p.nom}!`,
    notifLegendaire: p => `Legendary card: ${p.nom}!`,
    notifEpique: p => `Epic card: ${p.nom}`,
    agrandir: "enlarge",
    retour: "Back",
    ouvrirUnAutreN: p => `Open another booster (${p.n})`,

    partager: "Share",
    gyroActiver: "Enable motion",
    enSavoirPlus: "Learn more",
    partagerMeilleure: "Share my best card",
    partageObtenu: "I just got",
    partageTexte: p => `I got ${p.nom} (${p.rarete}) in ChronoLegends! Come and collect world history:`,
    partagePreparation: "Preparing the image…",
    partageReessayer: "The image is ready: tap Share again.",
    partageTelecharge: "Image saved and text copied: paste them anywhere!",
    partageCopie: "Text copied: paste it anywhere!",

    progression: p => `${p.n} of ${p.total} ${pluriel(p.total, "card", "cards")}`,
    epoqueVide: "The first cards of this era are coming soon.",
    familles: "Families",
    familleToutesEpoques: "One family across every era",
    quotidien: "Your daily booster has arrived.",
    bienvenue: p => `Welcome! Here are ${p.n} free boosters.`,

    numero: "No.",
    illustrationAVenir: "ILLUSTRATION COMING SOON",
    portraitDe: p => `Portrait of ${p.nom}`,
  },

  he: {
    titrePage: "ChronoLegends — קלפי היסטוריה עולמית",
    descriptionPage: "אספו את הדמויות הגדולות של ההיסטוריה העולמית.",
    sousTitreMarque: "קלפי היסטוריה עולמית",
    ongletBoosters: "חבילות",
    ongletCollection: "אוסף",
    ouvrirLeBooster: "פתיחת החבילה",
    toutesEpoques: "כל התקופות",
    cinqCartes: "5 קלפים",
    slogan: "״הציד אף פעם לא נגמר״",
    toutReveler: "לחשוף הכול",
    ouvrirUnAutre: "לפתוח חבילה נוספת",
    epoque: "תקופה",
    fermer: "סגירה",
    langue: "שפה",
    piedPrototype: "אב־טיפוס — האוסף שלכם נשמר בשרתים שלנו, ומקושר לדפדפן הזה.",
    piedGeo: "חשבון אנונימי (ללא דוא״ל) נוצר אוטומטית כדי לשמור את האוסף שלכם. החבילות שלכם תלויות באזור שלכם, שהשרת שלנו קובע לפי המדינה של כתובת ה־IP. נשמרים רק המדינה והאזור, לעולם לא כתובת ה־IP או המיקום שלכם.",

    erreurAntiRobot: "בדיקת האנטי־רובוט נכשלה. טענו מחדש את הדף כדי לנסות שוב.",
    erreurServeur: "אין חיבור לשרת. בדקו את החיבור לאינטרנט וטענו מחדש את הדף.",
    verification: "בדיקה קטנה לפני החבילה הראשונה שלכם…",
    chargement: "טוען…",
    paysInconnu: "לא ניתן לזהות את המדינה שלכם (VPN או רשת אנונימית?). כבו אותם וטענו מחדש את הדף.",
    regionVide: p => `עדיין אין קלפים לאזור ${p.region}. הם יגיעו בקרוב!`,
    boostersDispo: p => (p.n > 1 ? `${p.n} חבילות זמינות` : "חבילה אחת זמינה") + " — הקישו כדי לפתוח",
    plusDeBooster: p => `אין עוד חבילות כרגע. החבילה היומית הבאה בעוד ${p.attente}.`,
    moinsDUneMinute: "פחות מדקה",

    ligneRegion: p => `אזור: ${p.region}${p.pays ? ` · מתחברים מ: ${p.pays}` : ""}`,
    verrou: p => `נראה שאתם ב${p.region}. אם תהיו שם עדיין החל מ־${p.quand}, החבילות שלכם יעברו לאזור הזה.`,
    nouvelleRegion: p => `אתם ב${p.region}: החבילות שלכם יכילו את הדמויות שלו.`,

    serveurPlusDeBooster: "אין חבילות זמינות.",
    serveurRegionVide: "עדיין אין קלפים לאזור שלכם.",
    serveurRegionInconnue: "לא ניתן לזהות את המדינה שלכם (VPN או רשת אנונימית?).",
    serveurErreurOuverture: "השרת לא הצליח לפתוח את החבילה. נסו שוב.",

    revelerLaCarte: "לחשוף את הקלף",
    plusBelle: "הקלף הטוב ביותר בחבילה!",
    touchezSuivante: "הקישו שוב לקלף הבא",
    glissezSuivante: "החליקו את הקלף הצידה לקלף הבא",
    touchezReveler: p => `הקישו על הקלף כדי לחשוף אותו  ·  ${p.n > 1 ? `נותרו ${p.n}` : "נותר אחד"}`,
    nouvelle: "חדש",
    notifMythique: p => `✦ קלף מיתי: ${p.nom} ✦`,
    notifDiamant: p => `💎 קלף יהלום: ${p.nom}! 💎`,
    notifAnimee: p => `✨ קלף מונפש: ${p.nom}!`,
    notifLegendaire: p => `קלף אגדי: ${p.nom}!`,
    notifEpique: p => `קלף אפי: ${p.nom}`,
    agrandir: "הגדלה",
    retour: "חזרה",
    ouvrirUnAutreN: p => `לפתוח חבילה נוספת (${p.n})`,

    partager: "שיתוף",
    gyroActiver: "הפעלת תנועה",
    enSavoirPlus: "לקריאה נוספת",
    partagerMeilleure: "לשתף את הקלף הכי טוב שלי",
    partageObtenu: "הרגע קיבלתי",
    partageTexte: p => `קיבלתי את ${p.nom} (${p.rarete}) ב־ChronoLegends! בואו לאסוף את ההיסטוריה העולמית:`,
    partagePreparation: "מכין את התמונה…",
    partageReessayer: "התמונה מוכנה: הקישו שוב על שיתוף.",
    partageTelecharge: "התמונה נשמרה והטקסט הועתק: הדביקו אותם איפה שתרצו!",
    partageCopie: "הטקסט הועתק: הדביקו אותו איפה שתרצו!",

    progression: p => `${p.n} מתוך ${p.total} קלפים`,
    epoqueVide: "הקלפים הראשונים של התקופה הזאת יגיעו בקרוב.",
    familles: "משפחות",
    familleToutesEpoques: "משפחה אחת לאורך כל התקופות",
    quotidien: "החבילה היומית שלכם הגיעה.",
    bienvenue: p => `ברוכים הבאים! הנה ${p.n} חבילות במתנה.`,

    numero: "מס׳",
    illustrationAVenir: "איור בקרוב",
    portraitDe: p => `דיוקן של ${p.nom}`,
  },
};

function t(cle, params = {}, langue = LANGUE) {
  const texte = TEXTES[langue][cle] ?? TEXTES.en[cle] ?? TEXTES.fr[cle] ?? cle;
  return typeof texte === "function" ? texte(params) : texte;
}

// Traduit les éléments de la page marqués data-t (texte) et data-t-aria (aria-label).
function traduirePage() {
  document.documentElement.lang = LANGUE;
  document.documentElement.dir = LANGUE === "he" ? "rtl" : "ltr";
  document.querySelectorAll("[data-t]").forEach(el => { el.textContent = t(el.dataset.t); });
  document.querySelectorAll("[data-t-aria]").forEach(el => { el.setAttribute("aria-label", t(el.dataset.tAria)); });
  document.querySelectorAll("[data-langue]").forEach(b => {
    b.classList.toggle("actif", b.dataset.langue === LANGUE);
    b.addEventListener("click", () => { if (b.dataset.langue !== LANGUE) changerLangue(b.dataset.langue); });
  });
}
