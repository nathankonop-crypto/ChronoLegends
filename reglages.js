// =============================================================
//  CHRONOLEGENDS — Réglages du jeu
//  Les cartes ne sont plus ici : elles vivent dans la base de
//  données Supabase et se gèrent depuis la page d'administration.
//  Règle éditoriale : personnages décédés uniquement, ton neutre
//  et factuel. La rareté reflète l'importance historique, jamais
//  un jugement moral.
// =============================================================

// Adresse de la base et clé PUBLIQUE (lecture seule pour les visiteurs :
// les règles de sécurité de la base refusent toute écriture sans connexion admin).
const SUPABASE_URL = "https://qhyvdodkzdhmobkvahwa.supabase.co";
// Clé PUBLIQUE des notifications (la clé privée est un secret Supabase, jamais ici).
const VAPID_PUBLIQUE = "BHTDzyCq5dnrBukJRNUrXa-yaZKtLblMc74y3RcZfKTwla6smb6rTgMlqFyCdKgw1ACtzZu1NyLMiZAg1zT9C3s";
const SUPABASE_CLE_PUBLIQUE = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoeXZkb2RremRobW9ia3ZhaHdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5ODU3OTAsImV4cCI6MjEwNzU2MTc5MH0.Hhq92tBVTB2tiIn24_QfD8mNaMnjQU3tsz_DKjng2EI";

// Anti-robot Cloudflare Turnstile : clé de SITE (publique). La clé SECRÈTE
// n'est jamais ici : elle est rangée dans Supabase (Attack Protection).
// Vide = pas de vérification (Supabase ne doit alors pas l'exiger).
const TURNSTILE_CLE_SITE = "0x4AAAAAAFW1Hh6Pqu1owEGT";

const RARETES = {
  ordinaire:  { nom: "Ordinaire",  ordre: 1 },
  notable:    { nom: "Notable",    ordre: 2 },
  rare:       { nom: "Rare",       ordre: 3 },
  epique:     { nom: "Épique",     ordre: 4 },
  legendaire: { nom: "Légendaire", ordre: 5 },
  mythique:   { nom: "Mythique",   ordre: 6 },
};

const GAMMES = {
  personnage: "Personnage historique",
  archetype:  "Archétype",
  evenement:  "Événement",
  lieu:       "Lieu et monument",
  mythologie: "Mythologie",
  objet:      "Objet",
};


const REGIONS = {
  "europe":       "Europe",
  "afrique":      "Afrique",
  "moyen-orient": "Moyen-Orient",
  "asie":         "Asie",
  "ameriques":    "Amériques",
  "oceanie":      "Océanie",
};

// Chaque époque est une extension. Les boosters mélangent toutes les époques ;
// la collection a un onglet par époque pour s'y retrouver.
const EXTENSIONS = {
  antiquite:              { nom: "Antiquité",              sousTitre: "Des premiers empires au Ve siècle" },
  "moyen-age":            { nom: "Moyen Âge",              sousTitre: "Du Ve au XVe siècle" },
  "temps-modernes":       { nom: "Les Temps modernes",     sousTitre: "De la fin du XVe siècle à 1789" },
  "epoque-contemporaine": { nom: "L'Époque contemporaine", sousTitre: "De 1789 à nos jours" },
};
