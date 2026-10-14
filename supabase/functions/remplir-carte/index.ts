// =============================================================
//  CHRONOLEGENDS — Edge Function « remplir-carte »
//  Propose dates, lieu, description, région, époque, version anglaise
//  et texte « En savoir plus » d'une carte à partir de son nom, avec
//  Claude. Réservée à l'administrateur.
//
//  La clé Anthropic est lue dans les secrets Supabase
//  (ANTHROPIC_API_KEY) : elle n'apparaît jamais dans le code ni
//  dans le navigateur. SUPABASE_URL et SUPABASE_ANON_KEY sont
//  fournies automatiquement par Supabase.
// =============================================================

import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const ENTETES_CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const REGIONS = ["europe", "afrique", "moyen-orient", "asie", "ameriques", "oceanie"];
const EPOQUES = ["antiquite", "moyen-age", "temps-modernes", "epoque-contemporaine"];

const CONSIGNES = `Tu rédiges les informations d'une carte du jeu ChronoLegends, un jeu de cartes à collectionner sur l'histoire mondiale. On te donne le nom d'un personnage, d'un lieu, d'un événement, d'un archétype ou d'une figure mythologique. Réponds en français.

Ligne éditoriale du jeu :
- Seuls les personnages décédés entrent dans le jeu. Si la personne est vivante, ou si le nom est inconnu, fictif ou trop ambigu pour l'identifier, explique-le dans « probleme » et laisse les autres champs aussi justes que possible.
- Neutralité absolue : un texte factuel et purement historique, qui ne glorifie ni ne condamne personne, y compris les figures les plus sombres.
- Pour les religions encore pratiquées, reste respectueux et descriptif.

Format des champs (respecte exactement le style des exemples) :
- dates : années de naissance et de mort, avec un tiret demi-cadratin entouré d'espaces. Ajoute « v. » devant une date approximative, « av. J.-C. » ou « apr. J.-C. » si utile, ou une période (« règne v. 1479 – 1458 av. J.-C. », « IVe s. apr. J.-C. »). Pour une figure mythologique : « Mythologie grecque », etc.
- lieu : le lieu principal associé, court (« Alexandrie, Égypte », « Royaume de France »).
- description : 2 ou 3 phrases, 140 à 230 caractères en tout, au présent de narration, sans répéter le nom en premier mot.
- region : la région du jeu d'où vient le personnage. moyen-orient = Proche et Moyen-Orient, Turquie, Chypre, Mésopotamie, Perse, Levant ; l'Égypte est en afrique.
- epoque : antiquite (jusqu'au Ve siècle), moyen-age (Ve – XVe siècle), temps-modernes (fin XVe siècle – 1789), epoque-contemporaine (après 1789).
- probleme : chaîne vide si tout va bien ; sinon une phrase courte (personne vivante, dates très débattues, homonymes possibles…).
- en_savoir_plus : texte du bouton « En savoir plus », pour les personnages historiques réels. Il PROLONGE la description sans la répéter : origines, épisodes marquants, œuvres, fin de vie, héritage, traces aujourd'hui. 4 à 6 phrases, 400 à 600 caractères, au présent de narration, même neutralité. Signale ce qui relève de la tradition ou reste débattu (« selon la tradition », « peut-être »). Pour une figure mythologique ou un archétype : chaîne vide.

Version anglaise (champs *_en), pour les joueurs anglophones :
- nom_en : le nom usuel en anglais (« Joan of Arc », « Julius Caesar », « Ramesses II ») ; identique au français s'il n'y a pas d'usage anglais distinct.
- dates_en : même information, notation anglaise : « BCE » / « CE », « c. » pour vers, « r. » pour règne, « 5th c. BCE » pour un siècle, « died 113 BCE ». Ex. : « c. 1412 – 1431 », « r. c. 1479 – 1458 BCE ».
- lieu_en : le lieu en anglais (« Kingdom of France », « Alexandria, Egypt »).
- description_en : la même description en anglais naturel (pas mot à mot), même ton neutre, 140 à 230 caractères.
- en_savoir_plus_en : le texte « Learn more » en anglais naturel, même contenu que en_savoir_plus (chaîne vide si celui-ci l'est).

Exemples de cartes existantes :
- Jules César | 100 – 44 av. J.-C. | Rome | Général et homme politique romain. Il conquiert la Gaule, remporte la guerre civile et devient dictateur. Il est assassiné lors d'une séance du Sénat.
- Hatchepsout | règne v. 1479 – 1458 av. J.-C. | Égypte | Femme pharaon de la XVIIIe dynastie. Son règne prospère est marqué par de grands chantiers, dont le temple de Deir el-Bahari, et une expédition vers le pays de Pount.
- Jeanne d'Arc | v. 1412 – 1431 | Royaume de France | Pendant la guerre de Cent Ans, cette jeune paysanne contribue à lever le siège d'Orléans en 1429 et fait sacrer Charles VII à Reims. Capturée, elle est brûlée à Rouen en 1431.
  (en anglais : Joan of Arc | c. 1412 – 1431 | Kingdom of France | During the Hundred Years' War, this young peasant helps lift the siege of Orléans in 1429 and has Charles VII crowned at Reims. Captured, she is burned at Rouen in 1431.)`;

const SCHEMA = {
  type: "object",
  properties: {
    dates: { type: "string" },
    lieu: { type: "string" },
    description: { type: "string" },
    region: { type: "string", enum: REGIONS },
    epoque: { type: "string", enum: EPOQUES },
    probleme: { type: "string" },
    nom_en: { type: "string" },
    dates_en: { type: "string" },
    lieu_en: { type: "string" },
    description_en: { type: "string" },
    en_savoir_plus: { type: "string" },
    en_savoir_plus_en: { type: "string" },
  },
  required: ["dates", "lieu", "description", "region", "epoque", "probleme", "nom_en", "dates_en", "lieu_en", "description_en", "en_savoir_plus", "en_savoir_plus_en"],
  additionalProperties: false,
};

function reponse(corps: unknown, statut = 200) {
  return new Response(JSON.stringify(corps), {
    status: statut,
    headers: { ...ENTETES_CORS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: ENTETES_CORS });
  if (req.method !== "POST") return reponse({ erreur: "Méthode non autorisée." }, 405);

  // 1. Seul l'administrateur connecté peut utiliser (et faire payer) l'IA.
  const autorisation = req.headers.get("Authorization") ?? "";
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: autorisation } },
  });
  const { data: estAdmin, error: erreurAdmin } = await sb.rpc("est_admin");
  if (erreurAdmin || estAdmin !== true) {
    return reponse({ erreur: "Réservé à l'administrateur." }, 403);
  }

  // 2. Le nom de la carte.
  let nom = "";
  try {
    nom = String((await req.json()).nom ?? "").trim();
  } catch { /* corps invalide */ }
  if (!nom || nom.length > 80) return reponse({ erreur: "Nom manquant ou trop long." }, 400);

  // 3. Appel à Claude, avec la clé rangée dans les secrets Supabase.
  const cleApi = Deno.env.get("ANTHROPIC_API_KEY");
  if (!cleApi) return reponse({ erreur: "La clé de l'IA n'est pas configurée dans Supabase." }, 500);
  const client = new Anthropic({ apiKey: cleApi });

  try {
    const message = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 8000,
      // Si une protection de sécurité refuse la demande, Anthropic la relance
      // automatiquement sur le modèle de secours recommandé.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: {
        effort: "medium",
        format: { type: "json_schema", schema: SCHEMA },
      },
      system: CONSIGNES,
      messages: [{ role: "user", content: `Carte à remplir : ${nom}` }],
    });

    if (message.stop_reason === "refusal") {
      return reponse({ erreur: "L'IA a refusé cette demande. Remplissez la carte à la main." }, 422);
    }
    const texte = message.content.find((b) => b.type === "text");
    if (!texte || texte.type !== "text") {
      return reponse({ erreur: "Réponse de l'IA incomplète. Réessayez." }, 502);
    }
    return reponse(JSON.parse(texte.text));
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
      return reponse({ erreur: "La clé de l'IA est invalide ou a expiré : créez-en une nouvelle et remplacez-la dans Supabase." }, 502);
    }
    if (err instanceof Anthropic.RateLimitError) {
      return reponse({ erreur: "L'IA est très sollicitée. Réessayez dans une minute." }, 429);
    }
    if (err instanceof Anthropic.BadRequestError) {
      console.error(err.message);
      return reponse({ erreur: "Demande refusée par l'IA. Vérifiez le crédit restant sur console.anthropic.com." }, 502);
    }
    if (err instanceof Anthropic.APIError) {
      return reponse({ erreur: `Erreur de l'IA (${err.status}). Réessayez.` }, 502);
    }
    console.error(err);
    return reponse({ erreur: "Erreur inattendue. Réessayez." }, 500);
  }
});
