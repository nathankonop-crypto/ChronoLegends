// =============================================================
//  CHRONOLEGENDS — Edge Function « agent-cartes »
//  L'agent qui crée des cartes tout seul, pour une région :
//    1. « idees »  : Claude propose des archétypes ou des personnages
//                    historiques absents du jeu ;
//    2. « carte »  : Claude rédige la carte complète (français, anglais,
//                    hébreu) et décrit son illustration ;
//    3. « image »  : Nano Banana (Gemini) peint l'illustration, dans le
//                    style des cartes existantes.
//  La page d'administration enchaîne les trois et enregistre la carte
//  en BROUILLON : rien n'arrive dans le jeu avant validation.
//  Réservée à l'administrateur.
//
//  Secrets Supabase (jamais dans le code ni dans le navigateur) :
//  ANTHROPIC_API_KEY (Claude) et GEMINI_API_KEY (Nano Banana).
//  GEMINI_MODELE_IMAGE (facultatif) remplace le modèle d'image.
// =============================================================

import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { encodeBase64 } from "jsr:@std/encoding@1/base64";

const ENTETES_CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const REGIONS: Record<string, string> = {
  "europe": "Europe",
  "afrique": "Afrique (Égypte comprise)",
  "moyen-orient": "Moyen-Orient (Proche et Moyen-Orient, Turquie, Chypre, Mésopotamie, Perse, Levant, péninsule Arabique ; PAS l'Égypte)",
  "asie": "Asie",
  "ameriques": "Amériques",
  "oceanie": "Océanie",
};
const EPOQUES = ["antiquite", "moyen-age", "temps-modernes", "epoque-contemporaine"];
const GAMMES = ["archetype", "personnage"];
const NOMS_EPOQUES: Record<string, string> = {
  "antiquite": "Antiquité (jusqu'au Ve siècle)",
  "moyen-age": "Moyen Âge (Ve – XVe siècle)",
  "temps-modernes": "Temps modernes (fin XVe siècle – 1789)",
  "epoque-contemporaine": "Époque contemporaine (après 1789)",
};

// Style commun à toutes les illustrations (les images de référence montrent ce style).
const STYLE_IMAGE = "Painterly, realistic and cinematic digital painting for a historical trading card, in the exact art style, " +
  "lighting and colour palette of the reference images (use them ONLY for style: do not copy their characters, faces or composition). " +
  "Landscape 4:3 framing, main subject centred with some margin on every side (the edges get cropped), atmospheric background of the place and era. " +
  "Historically accurate clothing, objects and architecture. No text, no letters, no frame, no border, no watermark, no logo.";

// Illustrations de cartes existantes, données à Nano Banana comme modèle de style.
const IMAGES_REFERENCE = [
  "https://chronolegendsgames.com/images/alexandre.webp",
  "https://chronolegendsgames.com/images/cleopatre.webp",
];

const LIGNE_EDITORIALE = `Tu travailles pour ChronoLegends, un jeu de cartes à collectionner sur l'histoire mondiale (six régions, quatre époques). Réponds en français.

Ligne éditoriale du jeu :
- Neutralité absolue : un texte factuel et purement historique, qui ne glorifie ni ne condamne personne, y compris les figures les plus sombres.
- Pour les religions encore pratiquées, reste respectueux et descriptif.
- Seuls les personnages décédés entrent dans le jeu.
- Jamais le prophète Mahomet (ni sa famille proche) : sa représentation en image est interdite pour beaucoup de croyants. Évite de même toute figure dont l'image est religieusement interdite.
- Archétype = une figure type d'une époque (légionnaire, moine copiste, samouraï…), jamais un individu réel.

Époques : antiquite (jusqu'au Ve siècle), moyen-age (Ve – XVe siècle), temps-modernes (fin XVe siècle – 1789), epoque-contemporaine (après 1789).`;

const CONSIGNES_IDEES = `${LIGNE_EDITORIALE}

Ta tâche : proposer de NOUVELLES cartes pour une région, absentes du jeu (la liste des cartes existantes t'est donnée ; pas de doublon, ni de quasi-doublon : pour les archétypes, pas deux fois le même métier à la même époque).
- Varie les époques (les quatre si possible), les métiers ou rôles, les peuples et les lieux de la région, et pense aux femmes.
- Archétypes : des métiers ou rôles typiques, concrets et visuels (« Scribe sumérien », « Marchand caravanier nabatéen », « Janissaire ottoman »), avec le peuple ou l'empire dans le nom pour le situer.
- Personnages historiques : des figures réelles et importantes de la région, dont l'existence est attestée ; mélange les très célèbres et des figures moins connues mais marquantes (souverains, savants, poètes, bâtisseurs, voyageurs, femmes de pouvoir…).
- resume : une phrase qui dit pourquoi cette carte est intéressante.`;

const CONSIGNES_CARTE = `${LIGNE_EDITORIALE}

Ta tâche : rédiger une carte complète, à partir du nom et de l'idée proposés.

Format des champs (respecte exactement le style des exemples) :
- nom : le nom de la carte, court (au plus 40 caractères). Pour un archétype : le rôle et le peuple (« Scribe sumérien »).
- dates : pour un personnage, années de naissance et de mort, avec un tiret demi-cadratin entouré d'espaces ; « v. » devant une date approximative, « av. J.-C. » ou « apr. J.-C. » si utile, ou un règne (« règne v. 1479 – 1458 av. J.-C. »). Pour un archétype : la période où il existe (« v. 3000 – 2000 av. J.-C. », « XIVe – XVIIe s. »).
- lieu : le lieu principal associé, court (« Ur, Mésopotamie », « Empire ottoman »).
- description : 2 ou 3 phrases, 140 à 230 caractères en tout, au présent de narration, sans répéter le nom en premier mot. Pour un archétype : son rôle, son quotidien, ce qui le rend typique de son époque.
- epoque : l'époque du jeu.
- rarete : pour un archétype, ordinaire (figure du quotidien : paysan, artisan…), notable (métier qualifié ou recherché : scribe, marchand, soldat d'élite…) ou rare (figure prestigieuse ou d'élite : Immortel perse, grand vizir…), jamais plus. Pour un personnage : de ordinaire à legendaire selon sa célébrité et son importance historique (legendaire = les plus grandes figures de l'histoire mondiale) ; jamais mythique. L'administrateur choisira au final.
- famille : pour un personnage, l'identifiant de la famille qui lui correspond le mieux dans la liste fournie (chaîne vide si aucune ne convient) ; pour un archétype, chaîne vide.
- probleme : chaîne vide si tout va bien ; sinon une phrase courte (dates très débattues, existence incertaine, sujet sensible…).
- en_savoir_plus : seulement pour un personnage (chaîne vide pour un archétype). Il PROLONGE la description sans la répéter : origines, épisodes marquants, œuvres, fin de vie, héritage, traces aujourd'hui. 4 à 6 phrases, 400 à 600 caractères, au présent de narration, même neutralité. Signale ce qui relève de la tradition ou reste débattu.

Version anglaise (champs *_en), pour les joueurs anglophones :
- nom_en : le nom usuel en anglais (« Sumerian Scribe », « Julius Caesar »).
- dates_en : même information, notation anglaise : « BCE » / « CE », « c. » pour vers, « r. » pour règne, « 5th c. BCE » pour un siècle.
- lieu_en, description_en : en anglais naturel (pas mot à mot), même ton neutre ; description_en de 140 à 230 caractères.
- en_savoir_plus_en : le texte « Learn more » en anglais (chaîne vide si en_savoir_plus l'est).
- en_savoir_plus_he : le même texte en hébreu moderne naturel, au passé, avec les noms propres dans leur forme hébraïque usuelle (chaîne vide si en_savoir_plus l'est).

Illustration :
- prompt_image : en ANGLAIS, 60 à 120 mots, la description de l'image à peindre : le sujet (âge, allure, vêtements, coiffure, objets exacts de l'époque et du lieu), ce qu'il fait, le décor, la lumière et l'ambiance. Un seul sujet principal, en plan américain ou en pied, sans texte dans l'image. Pour un personnage réel, appuie-toi sur ses représentations historiques connues (statues, monnaies, portraits) quand elles existent. Ne décris PAS le style artistique (il est ajouté automatiquement).

Exemples de cartes existantes :
- Jules César | 100 – 44 av. J.-C. | Rome | Général et homme politique romain. Il conquiert la Gaule, remporte la guerre civile et devient dictateur. Il est assassiné lors d'une séance du Sénat.
- Hatchepsout | règne v. 1479 – 1458 av. J.-C. | Égypte | Femme pharaon de la XVIIIe dynastie. Son règne prospère est marqué par de grands chantiers, dont le temple de Deir el-Bahari, et une expédition vers le pays de Pount.
  (en anglais : Julius Caesar | 100 – 44 BCE | Rome | Roman general and statesman. He conquers Gaul, wins the civil war and becomes dictator. He is assassinated during a session of the Senate.)`;

const schemaIdees = (epoques: string[]) => ({
  type: "object",
  properties: {
    idees: {
      type: "array",
      items: {
        type: "object",
        properties: {
          nom: { type: "string" },
          epoque: { type: "string", enum: epoques },
          resume: { type: "string" },
        },
        required: ["nom", "epoque", "resume"],
        additionalProperties: false,
      },
    },
  },
  required: ["idees"],
  additionalProperties: false,
});

const schemaCarte = (familles: string[]) => ({
  type: "object",
  properties: {
    nom: { type: "string" },
    dates: { type: "string" },
    lieu: { type: "string" },
    description: { type: "string" },
    epoque: { type: "string", enum: EPOQUES },
    rarete: { type: "string", enum: ["ordinaire", "notable", "rare", "epique", "legendaire"] },
    famille: { type: "string", enum: ["", ...familles] },
    probleme: { type: "string" },
    nom_en: { type: "string" },
    dates_en: { type: "string" },
    lieu_en: { type: "string" },
    description_en: { type: "string" },
    en_savoir_plus: { type: "string" },
    en_savoir_plus_en: { type: "string" },
    en_savoir_plus_he: { type: "string" },
    prompt_image: { type: "string" },
  },
  required: ["nom", "dates", "lieu", "description", "epoque", "rarete", "famille", "probleme", "nom_en", "dates_en",
    "lieu_en", "description_en", "en_savoir_plus", "en_savoir_plus_en", "en_savoir_plus_he", "prompt_image"],
  additionalProperties: false,
});

function reponse(corps: unknown, statut = 200) {
  return new Response(JSON.stringify(corps), {
    status: statut,
    headers: { ...ENTETES_CORS, "Content-Type": "application/json" },
  });
}

class ErreurAgent extends Error {
  constructor(message: string, public statut = 502) { super(message); }
}

// ---------- Claude : une réponse JSON qui respecte le schéma ----------
async function demanderClaude(consignes: string, demande: string, schema: unknown, maxTokens: number) {
  const cleApi = Deno.env.get("ANTHROPIC_API_KEY");
  if (!cleApi) throw new ErreurAgent("La clé de Claude n'est pas configurée dans Supabase.", 500);
  const client = new Anthropic({ apiKey: cleApi });
  try {
    const message = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: maxTokens,
      // Si une protection de sécurité refuse la demande, Anthropic la relance
      // automatiquement sur le modèle de secours recommandé.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: { type: "json_schema", schema } },
      system: consignes,
      messages: [{ role: "user", content: demande }],
    });
    if (message.stop_reason === "refusal") throw new ErreurAgent("Claude a refusé cette demande.", 422);
    if (message.stop_reason === "max_tokens") throw new ErreurAgent("Réponse de Claude trop longue, coupée. Réessayez.");
    const texte = message.content.find((b) => b.type === "text");
    if (!texte || texte.type !== "text") throw new ErreurAgent("Réponse de Claude incomplète. Réessayez.");
    return JSON.parse(texte.text);
  } catch (err) {
    if (err instanceof ErreurAgent) throw err;
    if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
      throw new ErreurAgent("La clé de Claude est invalide ou a expiré : remplacez-la dans Supabase.");
    }
    if (err instanceof Anthropic.RateLimitError) throw new ErreurAgent("Claude est très sollicité. Réessayez dans une minute.", 429);
    if (err instanceof Anthropic.BadRequestError) {
      console.error(err.message);
      throw new ErreurAgent("Demande refusée par Claude. Vérifiez le crédit restant sur console.anthropic.com.");
    }
    if (err instanceof Anthropic.APIError) throw new ErreurAgent(`Erreur de Claude (${err.status}). Réessayez.`);
    throw err;
  }
}

// ---------- Nano Banana (Gemini) : une illustration ----------

// L'image produite, où qu'elle soit rangée dans la réponse (format « interactions » ou « generateContent »).
function trouverImage(o: unknown): { data: string; mime: string } | null {
  if (!o || typeof o !== "object") return null;
  const r = o as Record<string, unknown>;
  if (typeof r.data === "string" && r.data.length > 1000 && (r.type === "image" || r.mime_type || r.mimeType)) {
    return { data: r.data, mime: String(r.mime_type ?? r.mimeType ?? "image/png") };
  }
  for (const v of Object.values(r)) {
    const trouvee = trouverImage(v);
    if (trouvee) return trouvee;
  }
  return null;
}

async function peindre(promptImage: string) {
  const cle = Deno.env.get("GEMINI_API_KEY");
  if (!cle) throw new ErreurAgent("La clé Gemini (Nano Banana) n'est pas configurée dans Supabase.", 500);
  const modele = Deno.env.get("GEMINI_MODELE_IMAGE") || "gemini-nano-banana-2.1";

  const references = await Promise.all(IMAGES_REFERENCE.map(async (url) => {
    const r = await fetch(url);
    if (!r.ok) return null;
    return { type: "image", mime_type: r.headers.get("content-type") || "image/webp", data: encodeBase64(new Uint8Array(await r.arrayBuffer())) };
  }));

  const appel = (format: string) => fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
    method: "POST",
    headers: { "x-goog-api-key": cle, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: modele,
      input: [{ type: "text", text: `${promptImage}\n\n${STYLE_IMAGE}` }, ...references.filter(Boolean)],
      response_format: { type: "image", aspect_ratio: format, image_size: "1K" },
    }),
  });

  let r = await appel("4:3");
  if (r.status === 400) r = await appel("5:4");   // format 4:3 refusé par ce modèle : 5:4, recadré ensuite en 4:3
  if (!r.ok) {
    const detail = await r.text();
    console.error(r.status, detail.slice(0, 800));
    if (r.status === 400 && /api key/i.test(detail)) throw new ErreurAgent("La clé Gemini est invalide : remplacez-la dans Supabase.");
    if (r.status === 401 || r.status === 403) throw new ErreurAgent("La clé Gemini est refusée (invalide, ou facturation non activée sur Google AI Studio).");
    if (r.status === 429) throw new ErreurAgent("Nano Banana est très sollicité, ou le quota est atteint. Réessayez plus tard.", 429);
    throw new ErreurAgent(`Nano Banana n'a pas pu peindre l'image (erreur ${r.status}).`);
  }
  const image = trouverImage(await r.json());
  if (!image) throw new ErreurAgent("Nano Banana n'a pas renvoyé d'image (sujet refusé ?).");
  return image;
}

// ---------- Point d'entrée ----------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: ENTETES_CORS });
  if (req.method !== "POST") return reponse({ erreur: "Méthode non autorisée." }, 405);

  // 1. Seul l'administrateur connecté peut utiliser (et faire payer) l'agent.
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: estAdmin, error: erreurAdmin } = await sb.rpc("est_admin");
  if (erreurAdmin || estAdmin !== true) return reponse({ erreur: "Réservé à l'administrateur." }, 403);

  let corps: Record<string, unknown> = {};
  try { corps = await req.json(); } catch { /* corps invalide */ }
  const region = String(corps.region ?? "");
  const gamme = String(corps.gamme ?? "");
  // Époque choisie dans l'admin ; vide = toutes les époques.
  const epoque = NOMS_EPOQUES[String(corps.epoque ?? "")] ? String(corps.epoque) : "";

  try {
    if (corps.action === "image") {
      const prompt = String(corps.prompt ?? "").trim();
      if (!prompt || prompt.length > 3000) return reponse({ erreur: "Description d'image manquante ou trop longue." }, 400);
      return reponse(await peindre(prompt));
    }

    if (!REGIONS[region] || !GAMMES.includes(gamme)) return reponse({ erreur: "Région ou type de carte inconnu." }, 400);
    const typeTexte = gamme === "archetype" ? "des archétypes" : "des personnages historiques";

    if (corps.action === "idees") {
      const nombre = Math.max(1, Math.min(10, Number(corps.nombre) || 5));
      const { data: existantes, error } = await sb.from("cartes").select("nom, gamme, region, epoque");
      if (error) throw new ErreurAgent(`Lecture des cartes impossible : ${error.message}`, 500);
      const liste = (existantes ?? []).map((c) => `- ${c.nom} (${c.gamme}, ${c.region}, ${c.epoque})`).join("\n");
      const exclues = (Array.isArray(corps.exclure) ? corps.exclure : []).map(String).slice(0, 100);
      const consigneEpoque = epoque
        ? `Toutes les idées doivent appartenir à cette seule époque : ${NOMS_EPOQUES[epoque]}.`
        : "Toutes les époques sont possibles : varie-les.";
      const demande = `Région : ${REGIONS[region]}.\nPropose ${nombre} idées de cartes : ${typeTexte}.\n${consigneEpoque}\n\n` +
        `Cartes déjà dans le jeu (toutes régions) :\n${liste || "(aucune)"}` +
        (exclues.length ? `\n\nIdées déjà proposées et écartées, à ne pas reproposer :\n${exclues.map((n) => `- ${n}`).join("\n")}` : "");
      return reponse(await demanderClaude(CONSIGNES_IDEES, demande, schemaIdees(epoque ? [epoque] : EPOQUES), 6000));
    }

    if (corps.action === "carte") {
      const nom = String(corps.nom ?? "").trim();
      const resume = String(corps.resume ?? "").trim().slice(0, 400);
      if (!nom || nom.length > 80) return reponse({ erreur: "Nom manquant ou trop long." }, 400);
      const { data: familles } = await sb.from("familles").select("id, nom");
      const listeFamilles = (familles ?? []).map((f) => `- ${f.id} : ${f.nom}`).join("\n");
      const demande = `Type : ${gamme === "archetype" ? "archétype" : "personnage historique"}.\nRégion : ${REGIONS[region]}.\n` +
        `Carte à rédiger : ${nom}${resume ? ` (idée : ${resume})` : ""}.\n\nFamilles disponibles :\n${listeFamilles || "(aucune)"}`;
      return reponse(await demanderClaude(CONSIGNES_CARTE, demande, schemaCarte((familles ?? []).map((f) => f.id)), 12000));
    }

    return reponse({ erreur: "Action inconnue." }, 400);
  } catch (err) {
    if (err instanceof ErreurAgent) return reponse({ erreur: err.message }, err.statut);
    console.error(err);
    return reponse({ erreur: "Erreur inattendue. Réessayez." }, 500);
  }
});
