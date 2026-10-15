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


// ---------- Fiche « Règles du jeu » (Paramètres) ----------
// Chaque langue : titres et paragraphes ; les noms (raretés, familles…) viennent du jeu.
const REGLES = {
  fr: {
    principeTitre: "Le principe",
    principe: "Collectionnez les grandes figures et les grands moments de l'histoire du monde, de toutes les époques et de tous les continents. Ouvrez des boosters, chassez les cartes rares et complétez votre collection.",
    boostersTitre: "Les boosters",
    boosters: "Vous recevez 3 boosters à votre arrivée, puis un booster gratuit chaque jour (à partir de minuit, heure d'Israël). Pour l'ouvrir, découpez le haut du paquet en faisant glisser le doigt d'un côté à l'autre. Chaque booster contient 5 cartes.",
    regionTitre: "Votre région",
    region: "Vos boosters contiennent les cartes de la région où vous vous trouvez (Europe, Afrique, Moyen-Orient, Asie, Amériques, Océanie), déterminée par votre connexion. Si vous changez de pays, vos boosters changent de région après un court délai.",
    raretesTitre: "Les six niveaux de rareté",
    raretes: {
      ordinaire: "Le socle de la collection, facile à obtenir.",
      notable: "Un cran au-dessus : déjà un petit plaisir.",
      rare: "Des personnages connus : on est content de la tirer.",
      epique: "Les grandes figures et les grands moments.",
      legendaire: "Les figures qui ont façonné le monde.",
      mythique: "Le palier ultime, chassé pendant des mois.",
    },
    raretesNote: "La rareté mesure l'importance historique, jamais un jugement moral.",
    typesTitre: "Les types de cartes",
    typesIntro: "La lettre dans le petit rond, en bas de chaque carte, indique son type.",
    types: {
      personnage: "Des femmes et des hommes réels, cœur de la collection. Bouton « En savoir plus » pour aller plus loin.",
      archetype: "Les figures types d'une époque (légionnaire, moine copiste, samouraï…), et non des individus réels.",
      evenement: "Les grands moments de l'histoire eux-mêmes : batailles, révolutions, découvertes.",
      lieu: "Les grands sites et monuments de l'histoire.",
      objet: "Les objets qui ont marqué l'histoire : inventions, trésors, symboles.",
      mythologie: "Les dieux et héros des mythologies du monde, cachés dans les boosters et extrêmement rares.",
    },
    famillesTitre: "Les familles",
    familles: "Chaque personnage historique appartient à une famille, signalée par l'emblème dans le coin de son illustration. Une collection dans la collection : retrouvez-les dans Collection › Familles.",
    finitionsTitre: "Les finitions",
    finitions: {
      normale: "La version de base de chaque carte.",
      animee: "L'illustration prend vie. Plus rare.",
      diamant: "Sertie de diamants, avec reflets et étincelles. La plus rare de toutes.",
    },
    finitionsNote: "Une même carte peut exister dans plusieurs finitions : on ne chasse plus seulement la carte, on chasse la perfection.",
    voirChances: "Voir les chances de tirage",
  },
  en: {
    principeTitre: "How it works",
    principe: "Collect the great figures and great moments of world history, from every era and every continent. Open boosters, hunt for rare cards and complete your collection.",
    boostersTitre: "Boosters",
    boosters: "You get 3 boosters when you arrive, then one free booster every day (from midnight, Israel time). To open it, cut the top of the pack by sliding your finger across it. Each booster contains 5 cards.",
    regionTitre: "Your region",
    region: "Your boosters contain cards from the region you are in (Europe, Africa, Middle East, Asia, Americas, Oceania), based on your connection. If you change country, your boosters switch region after a short delay.",
    raretesTitre: "The six rarity levels",
    raretes: {
      ordinaire: "The core of the collection, easy to get.",
      notable: "One step up: already a small treat.",
      rare: "Well-known figures: you're happy to pull one.",
      epique: "Great figures and great moments.",
      legendaire: "The figures who shaped the world.",
      mythique: "The ultimate tier, hunted for months.",
    },
    raretesNote: "Rarity measures historical importance, never a moral judgement.",
    typesTitre: "Card types",
    typesIntro: "The letter in the small circle at the bottom of each card shows its type.",
    types: {
      personnage: "Real women and men, the heart of the collection. Tap “Learn more” to go further.",
      archetype: "Typical figures of an era (legionary, monk copyist, samurai…), not real individuals.",
      evenement: "The great moments of history themselves: battles, revolutions, discoveries.",
      lieu: "The great historic sites and monuments.",
      objet: "Objects that made history: inventions, treasures, symbols.",
      mythologie: "Gods and heroes from the world's mythologies, hidden in boosters and extremely rare.",
    },
    famillesTitre: "Families",
    familles: "Every historical figure belongs to a family, shown by the emblem in the corner of its illustration. A collection within the collection: find them in Collection › Families.",
    finitionsTitre: "Finishes",
    finitions: {
      normale: "The base version of each card.",
      animee: "The illustration comes alive. Rarer.",
      diamant: "Set with diamonds, with shimmers and sparkles. The rarest of all.",
    },
    finitionsNote: "The same card can exist in several finishes: you're not just hunting the card, you're hunting perfection.",
    voirChances: "See the drop rates",
  },
  he: {
    principeTitre: "העיקרון",
    principe: "אספו את הדמויות והרגעים הגדולים של ההיסטוריה העולמית, מכל התקופות ומכל היבשות. פתחו חבילות, צודו קלפים נדירים והשלימו את האוסף שלכם.",
    boostersTitre: "החבילות",
    boosters: "עם ההצטרפות תקבלו 3 חבילות, ואחר כך חבילה חינמית בכל יום (החל מחצות, שעון ישראל). כדי לפתוח אותה, חתכו את החלק העליון שלה בהחלקת האצבע לרוחבו. כל חבילה מכילה 5 קלפים.",
    regionTitre: "האזור שלכם",
    region: "החבילות שלכם מכילות קלפים מהאזור שבו אתם נמצאים (אירופה, אפריקה, המזרח התיכון, אסיה, אמריקה, אוקיאניה), לפי החיבור שלכם. אם תעברו למדינה אחרת, החבילות יעברו לאזור החדש לאחר זמן קצר.",
    raretesTitre: "שש דרגות הנדירות",
    raretes: {
      ordinaire: "הבסיס של האוסף, קל להשגה.",
      notable: "דרגה אחת מעל: כבר הנאה קטנה.",
      rare: "דמויות מוכרות: שמחים לקבל אותן.",
      epique: "הדמויות הגדולות והרגעים הגדולים.",
      legendaire: "הדמויות שעיצבו את העולם.",
      mythique: "הדרגה העליונה, שצדים אותה חודשים.",
    },
    raretesNote: "הנדירות משקפת חשיבות היסטורית, לעולם לא שיפוט מוסרי.",
    typesTitre: "סוגי הקלפים",
    typesIntro: "האות שבעיגול הקטן בתחתית כל קלף מציינת את הסוג שלו.",
    types: {
      personnage: "נשים וגברים אמיתיים, לב האוסף. הכפתור „לקריאה נוספת” מרחיב את הסיפור.",
      archetype: "דמויות אופייניות לתקופה (לגיונר, נזיר מעתיק, סמוראי…), ולא אנשים מסוימים.",
      evenement: "הרגעים הגדולים של ההיסטוריה עצמם: קרבות, מהפכות, תגליות.",
      lieu: "האתרים והמונומנטים ההיסטוריים הגדולים.",
      objet: "חפצים שהשאירו חותם בהיסטוריה: המצאות, אוצרות, סמלים.",
      mythologie: "אלים וגיבורים מהמיתולוגיות של העולם, חבויים בחבילות ונדירים במיוחד.",
    },
    famillesTitre: "המשפחות",
    familles: "כל דמות היסטורית שייכת למשפחה, המסומנת בסמל שבפינת האיור. אוסף בתוך האוסף: תמצאו אותן באוסף › משפחות.",
    finitionsTitre: "הגימורים",
    finitions: {
      normale: "הגרסה הבסיסית של כל קלף.",
      animee: "האיור מתעורר לחיים. נדיר יותר.",
      diamant: "משובץ יהלומים, עם ברקים וניצוצות. הנדיר מכולם.",
    },
    finitionsNote: "אותו קלף יכול להופיע בכמה גימורים: לא צדים רק את הקלף, צדים את השלמות.",
    voirChances: "לסיכויי ההגרלה",
  },
};

// Nom complet des types de cartes (en bas de la carte, seule l'initiale apparaît).
const TYPES_LONGS = {
  fr: { personnage: "Personnage historique", archetype: "Archétype", evenement: "Événement", lieu: "Lieu et monument", objet: "Objet", mythologie: "Mythologie" },
  en: { personnage: "Historical figure", archetype: "Archetype", evenement: "Event", lieu: "Place and monument", objet: "Object", mythologie: "Mythology" },
  he: { personnage: "דמות היסטורית", archetype: "ארכיטיפ", evenement: "אירוע", lieu: "אתר ומונומנט", objet: "חפץ", mythologie: "מיתולוגיה" },
};

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
    cinqCartes: "5 cartes",
    boosterDore: "Booster doré · 5 cartes",
    boosterDoreArrive: "Votre prochain booster est doré ! Plus de chances d'avoir une carte rare.",
    chancesDore: p => `Booster doré (environ 1 booster sur ${p.n}, on le voit avant de l'ouvrir) : la carte spéciale a de bien meilleures chances.`,
    chancesDoreFinitions: p => `Dans un booster doré, les finitions sont aussi plus fréquentes : Animée 1 carte sur ${p.animee}, Diamant 1 carte sur ${p.diamant}.`,
    slogan: "« La chasse ne s'arrête jamais »",
    toutReveler: "Tout révéler",
    ouvrirUnAutre: "Ouvrir un autre booster",
    epoque: "Époque",
    fermer: "Fermer",
    langue: "Langue",
    parametres: "Paramètres",
    confort: "Confort",
    reglageVibrations: "Vibrations",
    reglageAnimations: "Animations réduites",
    reglageOuverture: "Ouverture rapide des boosters",
    chancesTirage: "Chances de tirage",
    reglesDuJeu: "Règles du jeu",
    chancesIntro: "Chaque booster contient 5 cartes de votre région :",
    chancesCartes: p => `${p.ordinaire} × 2 · ${p.notable} × 1 · ${p.rare} × 1`,
    chancesSpeciale: "La 5ᵉ carte, la carte spéciale :",
    chancesFinitions: "Pour chaque carte, une finition rare peut apparaître :",
    chancesNote: "Si votre région n'a pas encore de carte d'une rareté, vous recevez une carte de la rareté juste en dessous.",
    surX: p => `1 sur ${p.n}`,
    piedPrototype: "Prototype — votre collection est enregistrée sur nos serveurs, liée à ce navigateur.",
    piedGeo: "Un compte anonyme (sans e-mail) est créé automatiquement pour garder votre collection. Vos boosters dépendent de votre région, déterminée par notre serveur à partir du pays de votre adresse IP. Seuls le pays et la région sont enregistrés, jamais votre adresse IP ni votre position.",

    erreurAntiRobot: "La vérification anti-robot a échoué. Rechargez la page pour réessayer.",
    erreurServeur: "Impossible de joindre le serveur. Vérifiez votre connexion puis rechargez la page.",
    verification: "Petite vérification avant votre premier booster…",
    chargement: "Chargement…",
    paysInconnu: "Impossible de déterminer votre pays (VPN ou réseau anonyme ?). Désactivez-le puis rechargez la page.",
    regionVide: p => `Pas encore de cartes pour la région ${p.region}. Elles arrivent bientôt !`,
    boostersDispo: p => `${p.n} ${pluriel(p.n, "booster disponible", "boosters disponibles")} — glissez le doigt sur le haut pour l'ouvrir`,
    boostersDispoAppui: p => `${p.n} ${pluriel(p.n, "booster disponible", "boosters disponibles")} — touchez pour ouvrir`,
    glisserPourOuvrir: "Faites glisser le doigt d'un côté à l'autre, en haut du paquet, pour le découper",
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
    gyroTitre: "Effets 3D",
    gyroTexte: "Inclinez votre iPhone pour faire bouger les boosters et les cartes, et apercevoir le bord des cartes de la pile. Apple demande votre accord pour utiliser le mouvement du téléphone.",
    gyroAutoriser: "Activer les effets 3D",
    gyroPlusTard: "Plus tard",
    gyroJamais: "Ne plus demander",
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
    epoques: "Époques",
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
    cinqCartes: "5 cards",
    boosterDore: "Golden booster · 5 cards",
    boosterDoreArrive: "Your next booster is golden! Better odds of a rare card.",
    chancesDore: p => `Golden booster (about 1 booster in ${p.n}, you can see it before opening): the special card has much better odds.`,
    chancesDoreFinitions: p => `In a golden booster, finishes are also more frequent: Animated 1 card in ${p.animee}, Diamond 1 card in ${p.diamant}.`,
    slogan: "“The hunt never ends”",
    toutReveler: "Reveal all",
    ouvrirUnAutre: "Open another booster",
    epoque: "Era",
    fermer: "Close",
    langue: "Language",
    parametres: "Settings",
    confort: "Comfort",
    reglageVibrations: "Vibrations",
    reglageAnimations: "Reduced animations",
    reglageOuverture: "Quick booster opening",
    chancesTirage: "Drop rates",
    reglesDuJeu: "Game rules",
    chancesIntro: "Each booster contains 5 cards from your region:",
    chancesCartes: p => `${p.ordinaire} × 2 · ${p.notable} × 1 · ${p.rare} × 1`,
    chancesSpeciale: "The 5th card, the special card:",
    chancesFinitions: "For each card, a rare finish may appear:",
    chancesNote: "If your region has no card of a given rarity yet, you get a card of the rarity just below.",
    surX: p => `1 in ${p.n}`,
    piedPrototype: "Prototype — your collection is saved on our servers, linked to this browser.",
    piedGeo: "An anonymous account (no email) is created automatically to keep your collection. Your boosters depend on your region, determined by our server from the country of your IP address. Only the country and region are saved, never your IP address or your location.",

    erreurAntiRobot: "The anti-robot check failed. Reload the page to try again.",
    erreurServeur: "Unable to reach the server. Check your connection, then reload the page.",
    verification: "Quick check before your first booster…",
    chargement: "Loading…",
    paysInconnu: "Unable to determine your country (VPN or anonymous network?). Turn it off, then reload the page.",
    regionVide: p => `No cards yet for the ${p.region} region. They're coming soon!`,
    boostersDispo: p => `${p.n} ${pluriel(p.n, "booster", "boosters")} available — swipe across the top to open`,
    boostersDispoAppui: p => `${p.n} ${pluriel(p.n, "booster", "boosters")} available — tap to open`,
    glisserPourOuvrir: "Slide your finger across the top of the pack to cut it open",
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
    gyroTitre: "3D effects",
    gyroTexte: "Tilt your iPhone to move the boosters and cards, and peek at the edges of the cards in the pile. Apple asks for your permission to use the phone's motion.",
    gyroAutoriser: "Enable 3D effects",
    gyroPlusTard: "Later",
    gyroJamais: "Don't ask again",
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
    epoques: "Eras",
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
    cinqCartes: "5 קלפים",
    boosterDore: "בוסטר זהב · 5 קלפים",
    boosterDoreArrive: "הבוסטר הבא שלכם זהוב! יותר סיכוי לקלף נדיר.",
    chancesDore: p => `בוסטר זהב (בערך בוסטר 1 מתוך ${p.n}, רואים אותו לפני הפתיחה): לקלף המיוחד יש סיכויים טובים בהרבה.`,
    chancesDoreFinitions: p => `בבוסטר זהב גם הגימורים נפוצים יותר: מונפש קלף 1 מתוך ${p.animee}, יהלום קלף 1 מתוך ${p.diamant}.`,
    slogan: "״הציד אף פעם לא נגמר״",
    toutReveler: "לחשוף הכול",
    ouvrirUnAutre: "לפתוח חבילה נוספת",
    epoque: "תקופה",
    fermer: "סגירה",
    langue: "שפה",
    parametres: "הגדרות",
    confort: "נוחות",
    reglageVibrations: "רטט",
    reglageAnimations: "הפחתת אנימציות",
    reglageOuverture: "פתיחה מהירה של חבילות",
    chancesTirage: "סיכויי הגרלה",
    reglesDuJeu: "חוקי המשחק",
    chancesIntro: "כל חבילה מכילה 5 קלפים מהאזור שלכם:",
    chancesCartes: p => `${p.ordinaire} × 2 · ${p.notable} × 1 · ${p.rare} × 1`,
    chancesSpeciale: "הקלף החמישי, הקלף המיוחד:",
    chancesFinitions: "לכל קלף עשוי להופיע גימור נדיר:",
    chancesNote: "אם באזור שלכם עדיין אין קלף בדרגת נדירות מסוימת, תקבלו קלף בדרגה שמתחתיה.",
    surX: p => `1 מתוך ${p.n}`,
    piedPrototype: "אב־טיפוס — האוסף שלכם נשמר בשרתים שלנו, ומקושר לדפדפן הזה.",
    piedGeo: "חשבון אנונימי (ללא דוא״ל) נוצר אוטומטית כדי לשמור את האוסף שלכם. החבילות שלכם תלויות באזור שלכם, שהשרת שלנו קובע לפי המדינה של כתובת ה־IP. נשמרים רק המדינה והאזור, לעולם לא כתובת ה־IP או המיקום שלכם.",

    erreurAntiRobot: "בדיקת האנטי־רובוט נכשלה. טענו מחדש את הדף כדי לנסות שוב.",
    erreurServeur: "אין חיבור לשרת. בדקו את החיבור לאינטרנט וטענו מחדש את הדף.",
    verification: "בדיקה קטנה לפני החבילה הראשונה שלכם…",
    chargement: "טוען…",
    paysInconnu: "לא ניתן לזהות את המדינה שלכם (VPN או רשת אנונימית?). כבו אותם וטענו מחדש את הדף.",
    regionVide: p => `עדיין אין קלפים לאזור ${p.region}. הם יגיעו בקרוב!`,
    boostersDispo: p => (p.n > 1 ? `${p.n} חבילות זמינות` : "חבילה אחת זמינה") + " — החליקו לרוחב החלק העליון כדי לפתוח",
    boostersDispoAppui: p => (p.n > 1 ? `${p.n} חבילות זמינות` : "חבילה אחת זמינה") + " — הקישו כדי לפתוח",
    glisserPourOuvrir: "החליקו את האצבע לרוחב החלק העליון של החבילה כדי לחתוך אותה",
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
    gyroTitre: "אפקטים בתלת־ממד",
    gyroTexte: "הטו את האייפון כדי להזיז את החבילות והקלפים ולהציץ בקצוות הקלפים שבערימה. אפל מבקשת את אישורכם לשימוש בתנועת הטלפון.",
    gyroAutoriser: "הפעלת אפקטים בתלת־ממד",
    gyroPlusTard: "אחר כך",
    gyroJamais: "אל תשאלו שוב",
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
    epoques: "תקופות",
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
