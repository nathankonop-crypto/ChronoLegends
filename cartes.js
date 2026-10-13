// =============================================================
//  CHRONOLEGENDS — Données des cartes
//  Pour ajouter une carte : copiez un bloc { ... } et modifiez-le.
//  Règle éditoriale : personnages décédés uniquement, ton neutre
//  et factuel. La rareté reflète l'importance historique, jamais
//  un jugement moral.
// =============================================================

const RARETES = {
  ordinaire:  { nom: "Ordinaire",  ordre: 1 },
  rare:       { nom: "Rare",       ordre: 2 },
  epique:     { nom: "Épique",     ordre: 3 },
  legendaire: { nom: "Légendaire", ordre: 4 },
  mythique:   { nom: "Mythique",   ordre: 5 },
};

const REGIONS = {
  "europe":       "Europe",
  "afrique":      "Afrique",
  "moyen-orient": "Moyen-Orient",
  "asie":         "Asie",
  "ameriques":    "Amériques",
  "oceanie":      "Océanie",
};

// Chaque époque est une extension.
const EXTENSIONS = {
  antiquite: { nom: "Antiquité", sousTitre: "Des premiers empires au Ve siècle" },
};

// image : chemin vers l'illustration (ex. "images/cesar.webp").
// Laisser à null tant que l'illustration n'existe pas :
// une illustration provisoire est alors dessinée automatiquement.
const CARTES = [
  // ---------- Mythiques (gamme mythologie, extrêmement rares) ----------
  { id: "zeus", nom: "Zeus", dates: "Mythologie grecque", lieu: "Mont Olympe, Grèce", region: "europe", extension: "antiquite", rarete: "mythique", image: null,
    texte: "Roi des dieux de l'Olympe dans la mythologie grecque, maître du ciel et de la foudre. Père de nombreux dieux et héros." },
  { id: "anubis", nom: "Anubis", dates: "Mythologie égyptienne", lieu: "Égypte ancienne", region: "afrique", extension: "antiquite", rarete: "mythique", image: null,
    texte: "Dieu funéraire de l'Égypte ancienne, figuré avec une tête de chacal. Il préside à l'embaumement et à la pesée du cœur des défunts." },
  { id: "ishtar", nom: "Ishtar", dates: "Mythologie mésopotamienne", lieu: "Mésopotamie", region: "moyen-orient", extension: "antiquite", rarete: "mythique", image: null,
    texte: "Déesse mésopotamienne de l'amour et de la guerre, associée à la planète Vénus. Elle était vénérée à Babylone, notamment à la porte d'Ishtar." },
  { id: "nuwa", nom: "Nüwa", dates: "Mythologie chinoise", lieu: "Chine", region: "asie", extension: "antiquite", rarete: "mythique", image: null,
    texte: "Déesse créatrice de la mythologie chinoise. La tradition lui attribue la création de l'humanité et la réparation du ciel après une catastrophe." },
  { id: "quetzalcoatl", nom: "Quetzalcóatl", dates: "Mythologie mésoaméricaine", lieu: "Mésoamérique", region: "ameriques", extension: "antiquite", rarete: "mythique", image: null,
    texte: "Le « serpent à plumes », divinité majeure de la Mésoamérique. Associé au vent, à la connaissance et à l'étoile du matin, vénéré par les Aztèques." },
  { id: "maui", nom: "Māui", dates: "Mythologie polynésienne", lieu: "Polynésie", region: "oceanie", extension: "antiquite", rarete: "mythique", image: null,
    texte: "Demi-dieu et héros espiègle de la mythologie polynésienne. De nombreux récits lui attribuent la pêche des îles et la capture du soleil." },

  // ---------- Légendaires ----------
  { id: "alexandre", nom: "Alexandre le Grand", dates: "356 – 323 av. J.-C.", lieu: "Macédoine", region: "europe", extension: "antiquite", rarete: "legendaire", image: null,
    texte: "Roi de Macédoine à vingt ans. Ses campagnes renversent l'Empire perse achéménide et étendent son pouvoir de la Grèce à la vallée de l'Indus." },
  { id: "cesar", nom: "Jules César", dates: "100 – 44 av. J.-C.", lieu: "Rome", region: "europe", extension: "antiquite", rarete: "legendaire", image: null,
    texte: "Général et homme politique romain. Il conquiert la Gaule, remporte la guerre civile et devient dictateur. Il est assassiné lors d'une séance du Sénat." },
  { id: "confucius", nom: "Confucius", dates: "551 – 479 av. J.-C.", lieu: "État de Lu, Chine", region: "asie", extension: "antiquite", rarete: "legendaire", image: null,
    texte: "Penseur et enseignant. Ses paroles, rassemblées par ses disciples dans les Entretiens, ont durablement influencé la morale et l'administration en Asie de l'Est." },
  { id: "qin-shi-huang", nom: "Qin Shi Huang", dates: "259 – 210 av. J.-C.", lieu: "Chine", region: "asie", extension: "antiquite", rarete: "legendaire", image: null,
    texte: "Premier empereur de la Chine unifiée en 221 av. J.-C. Il standardise l'écriture, la monnaie et les mesures. Son tombeau est gardé par l'armée de terre cuite." },
  { id: "cleopatre", nom: "Cléopâtre VII", dates: "69 – 30 av. J.-C.", lieu: "Alexandrie, Égypte", region: "afrique", extension: "antiquite", rarete: "legendaire", image: null,
    texte: "Dernière souveraine de la dynastie lagide. Alliée à César puis à Marc Antoine, elle meurt après la défaite face à Octavien ; l'Égypte devient province romaine." },
  { id: "bouddha", nom: "Siddhartha Gautama", dates: "Ve s. av. J.-C. (dates débattues)", lieu: "Plaine du Gange", region: "asie", extension: "antiquite", rarete: "legendaire", image: null,
    texte: "Connu comme le Bouddha. Les enseignements qui lui sont attribués sont à l'origine du bouddhisme, qui s'est diffusé dans une grande partie de l'Asie." },

  // ---------- Épiques ----------
  { id: "ashoka", nom: "Ashoka", dates: "v. 304 – 232 av. J.-C.", lieu: "Empire maurya, Inde", region: "asie", extension: "antiquite", rarete: "epique", image: null,
    texte: "Empereur maurya. Après la sanglante conquête du Kalinga, il soutient le bouddhisme et fait graver ses édits sur des rochers et des piliers de tout l'empire." },
  { id: "hannibal", nom: "Hannibal Barca", dates: "247 – 183 av. J.-C.", lieu: "Carthage", region: "afrique", extension: "antiquite", rarete: "epique", image: null,
    texte: "Général carthaginois de la deuxième guerre punique. Il franchit les Alpes avec son armée en 218 av. J.-C. et écrase les Romains à Cannes en 216." },
  { id: "ramses-ii", nom: "Ramsès II", dates: "v. 1303 – 1213 av. J.-C.", lieu: "Égypte", region: "afrique", extension: "antiquite", rarete: "epique", image: null,
    texte: "Pharaon de la XIXe dynastie, au règne de plus de soixante ans. Il combat les Hittites à Qadesh puis conclut avec eux l'un des plus anciens traités de paix connus." },
  { id: "cyrus-ii", nom: "Cyrus II", dates: "v. 600 – 530 av. J.-C.", lieu: "Perse", region: "moyen-orient", extension: "antiquite", rarete: "epique", image: null,
    texte: "Fondateur de l'Empire perse achéménide. Il soumet la Médie, la Lydie puis Babylone en 539 av. J.-C., formant le plus vaste empire de son temps." },
  { id: "aristote", nom: "Aristote", dates: "384 – 322 av. J.-C.", lieu: "Grèce", region: "europe", extension: "antiquite", rarete: "epique", image: null,
    texte: "Philosophe, élève de Platon et précepteur d'Alexandre. Ses travaux couvrent la logique, la physique, la biologie, l'éthique et la politique." },
  { id: "hammurabi", nom: "Hammurabi", dates: "règne v. 1792 – 1750 av. J.-C.", lieu: "Babylone", region: "moyen-orient", extension: "antiquite", rarete: "epique", image: null,
    texte: "Roi de Babylone, unificateur de la Mésopotamie. Son recueil de près de 300 lois, gravé sur une stèle de basalte, est conservé au musée du Louvre." },
  { id: "archimede", nom: "Archimède", dates: "v. 287 – 212 av. J.-C.", lieu: "Syracuse, Sicile", region: "europe", extension: "antiquite", rarete: "epique", image: null,
    texte: "Mathématicien, physicien et ingénieur, connu pour son principe sur les corps plongés dans un fluide. Il meurt lors de la prise de Syracuse par Rome." },

  // ---------- Rares ----------
  { id: "pericles", nom: "Périclès", dates: "v. 495 – 429 av. J.-C.", lieu: "Athènes", region: "europe", extension: "antiquite", rarete: "rare", image: null,
    texte: "Homme d'État athénien, stratège pendant une trentaine d'années. Il fait bâtir le Parthénon et meurt de l'épidémie qui frappe Athènes en 429 av. J.-C." },
  { id: "sun-tzu", nom: "Sun Tzu", dates: "VIe – Ve s. av. J.-C.", lieu: "Chine", region: "asie", extension: "antiquite", rarete: "rare", image: null,
    texte: "Stratège à qui la tradition attribue L'Art de la guerre, traité militaire encore étudié aujourd'hui. Son existence historique reste discutée." },
  { id: "spartacus", nom: "Spartacus", dates: "v. 103 – 71 av. J.-C.", lieu: "Italie romaine", region: "europe", extension: "antiquite", rarete: "rare", image: null,
    texte: "Gladiateur d'origine thrace. Il mène la plus grande révolte d'esclaves de la République romaine, réprimée par Crassus en 71 av. J.-C." },
  { id: "boudicca", nom: "Boudicca", dates: "morte v. 61 apr. J.-C.", lieu: "Bretagne romaine", region: "europe", extension: "antiquite", rarete: "rare", image: null,
    texte: "Reine des Icènes, peuple de l'est de l'actuelle Angleterre. Elle conduit un soulèvement contre l'occupation romaine, finalement vaincu." },
  { id: "vercingetorix", nom: "Vercingétorix", dates: "v. 82 – 46 av. J.-C.", lieu: "Gaule", region: "europe", extension: "antiquite", rarete: "rare", image: null,
    texte: "Chef arverne qui fédère des peuples gaulois contre César. Assiégé à Alésia en 52 av. J.-C., il se rend ; il est exécuté à Rome six ans plus tard." },
  { id: "hatchepsout", nom: "Hatchepsout", dates: "règne v. 1479 – 1458 av. J.-C.", lieu: "Égypte", region: "afrique", extension: "antiquite", rarete: "rare", image: null,
    texte: "Pharaonne de la XVIIIe dynastie. Son règne est marqué par de grands chantiers, dont le temple de Deir el-Bahari, et une expédition vers le pays de Pount." },
  { id: "piye", nom: "Piye", dates: "règne v. 744 – 714 av. J.-C.", lieu: "Royaume de Koush (Soudan)", region: "afrique", extension: "antiquite", rarete: "rare", image: null,
    texte: "Roi de Koush, État de la vallée du Nil au sud de l'Égypte. Il conquiert l'Égypte et fonde la XXVe dynastie, dite koushite." },
  { id: "chandragupta", nom: "Chandragupta Maurya", dates: "v. 340 – 297 av. J.-C.", lieu: "Inde", region: "asie", extension: "antiquite", rarete: "rare", image: null,
    texte: "Fondateur de l'Empire maurya, premier État à unifier la majeure partie du sous-continent indien. Il est le grand-père d'Ashoka." },
  { id: "nabuchodonosor", nom: "Nabuchodonosor II", dates: "v. 634 – 562 av. J.-C.", lieu: "Babylone", region: "moyen-orient", extension: "antiquite", rarete: "rare", image: null,
    texte: "Roi de Babylone. Il embellit sa capitale, notamment la porte d'Ishtar, et prend Jérusalem en 587 av. J.-C., déportant une partie de sa population." },
  { id: "zenobie", nom: "Zénobie", dates: "v. 240 – après 274", lieu: "Palmyre, Syrie", region: "moyen-orient", extension: "antiquite", rarete: "rare", image: null,
    texte: "Reine de Palmyre. Au nom de son fils, elle étend son autorité sur l'Égypte et une partie de l'Anatolie avant d'être vaincue par l'empereur Aurélien en 272." },

  // ---------- Ordinaires ----------
  { id: "sappho", nom: "Sappho", dates: "v. 630 – 570 av. J.-C.", lieu: "Lesbos, Grèce", region: "europe", extension: "antiquite", rarete: "ordinaire", image: null,
    texte: "Poétesse lyrique. Son œuvre, très admirée dans l'Antiquité, ne nous est parvenue que par fragments." },
  { id: "herodote", nom: "Hérodote", dates: "v. 484 – 425 av. J.-C.", lieu: "Halicarnasse, Anatolie", region: "moyen-orient", extension: "antiquite", rarete: "ordinaire", image: null,
    texte: "Auteur des Histoires, récit des guerres médiques entre Grecs et Perses. Cicéron le surnomme « le père de l'histoire »." },
  { id: "hypatie", nom: "Hypatie", dates: "v. 360 – 415 apr. J.-C.", lieu: "Alexandrie, Égypte", region: "afrique", extension: "antiquite", rarete: "ordinaire", image: null,
    texte: "Mathématicienne, astronome et philosophe néoplatonicienne. Elle enseigne à Alexandrie, où elle est tuée par une foule en 415." },
  { id: "zhang-qian", nom: "Zhang Qian", dates: "mort en 113 av. J.-C.", lieu: "Chine", region: "asie", extension: "antiquite", rarete: "ordinaire", image: null,
    texte: "Diplomate de la dynastie Han. Ses missions vers l'Asie centrale ouvrent des contacts réguliers qui préfigurent les routes de la soie." },
  { id: "ban-zhao", nom: "Ban Zhao", dates: "v. 45 – 117 apr. J.-C.", lieu: "Chine", region: "asie", extension: "antiquite", rarete: "ordinaire", image: null,
    texte: "Historienne et lettrée. Elle achève le Livre des Han, histoire officielle de la dynastie, commencé par son père et son frère." },
  { id: "ezana", nom: "Ézana", dates: "IVe s. apr. J.-C.", lieu: "Aksoum (Éthiopie)", region: "afrique", extension: "antiquite", rarete: "ordinaire", image: null,
    texte: "Roi d'Aksoum, puissance commerciale de la mer Rouge. Il adopte le christianisme vers 330, comme en témoignent ses inscriptions et ses monnaies." },
  { id: "imhotep", nom: "Imhotep", dates: "XXVIIe s. av. J.-C.", lieu: "Égypte", region: "afrique", extension: "antiquite", rarete: "ordinaire", image: null,
    texte: "Haut dignitaire du pharaon Djéser, à qui l'on attribue la conception de la pyramide à degrés de Saqqarah. Il est divinisé bien après sa mort." },
  { id: "siyaj-kak", nom: "Siyaj K'ak'", dates: "actif v. 378 apr. J.-C.", lieu: "Tikal (Guatemala)", region: "ameriques", extension: "antiquite", rarete: "ordinaire", image: null,
    texte: "Personnage lié à Teotihuacan. Selon les inscriptions mayas, son arrivée à Tikal en 378 coïncide avec un changement de dynastie." },
  { id: "yax-kuk-mo", nom: "K'inich Yax K'uk' Mo'", dates: "Ve s. apr. J.-C.", lieu: "Copán (Honduras)", region: "ameriques", extension: "antiquite", rarete: "ordinaire", image: null,
    texte: "Fondateur, en 426, de la dynastie qui règne sur la cité maya de Copán pendant près de quatre siècles." },
  { id: "thales", nom: "Thalès de Milet", dates: "v. 625 – 547 av. J.-C.", lieu: "Milet, Ionie", region: "moyen-orient", extension: "antiquite", rarete: "ordinaire", image: null,
    texte: "Considéré comme l'un des premiers philosophes grecs. La tradition lui attribue des travaux de géométrie et la prédiction d'une éclipse." },
  { id: "kanishka", nom: "Kanishka", dates: "IIe s. apr. J.-C.", lieu: "Empire kouchan", region: "asie", extension: "antiquite", rarete: "ordinaire", image: null,
    texte: "Souverain de l'Empire kouchan, de l'Asie centrale au nord de l'Inde. Il favorise le bouddhisme et l'essor de l'art du Gandhara." },
  { id: "pytheas", nom: "Pythéas", dates: "IVe s. av. J.-C.", lieu: "Massalia (Marseille)", region: "europe", extension: "antiquite", rarete: "ordinaire", image: null,
    texte: "Navigateur et astronome grec. Il explore les côtes de l'Atlantique nord et décrit une terre lointaine qu'il nomme Thulé." },
];
