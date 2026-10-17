// =============================================================
//  CHRONOLEGENDS — Page d'administration
//  La sécurité ne repose PAS sur cette page : c'est la base de
//  données (règles RLS) qui refuse toute écriture si l'utilisateur
//  connecté n'est pas dans la table « administrateurs ». Cacher
//  des boutons ici ne sert qu'au confort.
// =============================================================

// Session séparée de celle du jeu : se connecter ici ne touche pas au compte joueur du navigateur.
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_CLE_PUBLIQUE, {
  auth: { storageKey: "chronolegends-admin" },
});
const BUCKET = "illustrations";
const LARGEUR_IMAGE = 800, HAUTEUR_IMAGE = 600, QUALITE_IMAGE = 0.82;

const $ = sel => document.querySelector(sel);
const form = $("#form-carte");

let cartes = [];          // lignes de la base
let carteEditee = null;   // ligne en cours de modification (null = création)
let nouvelleImage = null; // { blob, url } : image traitée, pas encore envoyée
let imageRetiree = false;
let idModifieALaMain = false;

// ---------- Petits outils ----------

function notifier(message) {
  const n = $("#notification");
  n.textContent = message;
  n.classList.add("visible");
  clearTimeout(notifier.t);
  notifier.t = setTimeout(() => n.classList.remove("visible"), 3200);
}

function montrer(ecran) {
  for (const e of ["connexion", "refuse", "admin"]) $(`#ecran-${e}`).hidden = e !== ecran;
}

function remplirSelect(select, valeurs, garderPremiere = false) {
  if (!garderPremiere) select.innerHTML = "";
  for (const [cle, nom] of Object.entries(valeurs)) select.add(new Option(nom, cle));
}

const nomsRarete = Object.fromEntries(Object.entries(RARETES).map(([k, v]) => [k, v.nom]));
const nomsEpoque = Object.fromEntries(Object.entries(EXTENSIONS).map(([k, v]) => [k, v.nom]));

// « Jeanne d'Arc » → « jeanne-d-arc »
function versIdentifiant(nom) {
  return nom.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

// Ligne de la base → objet carte utilisé par le dessin (carte.js)
// L'admin est en français ; l'aperçu peut basculer en anglais (bouton FR / EN).
LANGUE = "fr";
let langueApercu = "fr";
let finitionApercu = "normale";   // bureau de test : aperçu seulement, la finition est tirée au sort dans le jeu
const CHAMPS_EN = ["nom_en", "dates_en", "lieu_en", "description_en"];
const CHAMPS_PLUS = ["en_savoir_plus", "en_savoir_plus_en", "en_savoir_plus_he"];   // « En savoir plus », personnages historiques

// Ligne de la base → objet carte utilisé par le dessin (carte.js), dans la langue demandée.
function versCarte(l, langue = "fr") {
  const champ = nom => (langue === "en" && l[`${nom}_en`]) || l[nom] || "";
  return { id: l.id, nom: champ("nom"), gamme: l.gamme, dates: champ("dates"), lieu: champ("lieu"),
    region: l.region, extension: l.epoque, rarete: l.rarete, famille: l.famille || null, religion: l.religion || null,
    texte: champ("description"), image: l.image };
}

// La carte compte dans cette région : principale ou secondaire.
const dansRegion = (c, region) => c.region === region || (c.regions_secondaires || []).includes(region);
const nomsRegions = c => [c.region, ...(c.regions_secondaires || [])].map(r => REGIONS[r]).join(" + ");

function cartesEpoque(epoque) {
  return cartes.filter(c => c.epoque === epoque)
    .sort((a, b) => a.ordre - b.ordre || a.nom.localeCompare(b.nom));
}

// Numéro « 08/41 » calculé comme dans le jeu (position dans l'époque).
function numeroDe(ligne) {
  const liste = cartesEpoque(ligne.epoque);
  const total = String(liste.length);
  const n = liste.findIndex(c => c.id === ligne.id) + 1;
  return `${String(n).padStart(total.length, "0")}/${total}`;
}

// Chemin d'un fichier dans notre stockage, à partir de son adresse publique.
function cheminStockage(url) {
  const repere = `/storage/v1/object/public/${BUCKET}/`;
  return url && url.includes(repere) ? decodeURIComponent(url.split(repere)[1]) : null;
}

// ---------- Connexion ----------

$("#form-connexion").addEventListener("submit", async e => {
  e.preventDefault();
  const bouton = $("#bouton-connexion");
  bouton.disabled = true;
  $("#erreur-connexion").textContent = "";
  let captchaToken;
  try {
    captchaToken = await jetonAntiRobot($("#anti-robot-admin"));   // jeton à usage unique, vérifié par Supabase
  } catch (err) {
    bouton.disabled = false;
    $("#erreur-connexion").textContent = "La vérification anti-robot a échoué. Réessayez.";
    return;
  }
  const { error } = await sb.auth.signInWithPassword({
    email: $("#email").value.trim(),
    password: $("#mot-de-passe").value,
    options: { captchaToken },
  });
  bouton.disabled = false;
  $("#mot-de-passe").value = "";
  if (error) {
    $("#erreur-connexion").textContent = error.status === 400
      ? "E-mail ou mot de passe incorrect."
      : `Connexion impossible : ${error.message}`;
    return;
  }
  await apresConnexion();
});

document.querySelectorAll('[data-action="deconnexion"]').forEach(b =>
  b.addEventListener("click", async () => {
    await sb.auth.signOut();
    montrer("connexion");
  }));

async function apresConnexion() {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return montrer("connexion");
  // Vérification faite par la base elle-même (fonction est_admin).
  const { data: admin, error } = await sb.rpc("est_admin");
  if (error || !admin) return montrer("refuse");
  $("#qui").textContent = user.email;
  montrer("admin");
  await chargerCartes();
  afficherListe();
}

// ---------- Liste ----------

async function chargerCartes() {
  const [{ data, error }, familles] = await Promise.all([
    sb.from("cartes").select("*").order("epoque").order("ordre"),
    sb.from("familles").select("*").order("ordre").order("nom"),
  ]);
  if (error) { notifier(`Erreur de chargement : ${error.message}`); return; }
  cartes = data;
  if (familles.error) notifier(`Familles indisponibles : ${familles.error.message}`);
  FAMILLES = Object.fromEntries((familles.data || []).map(f => [f.id, f]));
  remplirFamilles();
}

// Listes déroulantes des familles (filtre de la liste + formulaire).
function remplirFamilles() {
  const noms = Object.fromEntries(Object.values(FAMILLES).map(f => [f.id, f.nom]));
  const filtre = $("#filtre-famille");
  const avant = filtre.value;
  filtre.innerHTML = '<option value="">Toutes les familles</option><option value="-">Sans famille</option>';
  remplirSelect(filtre, noms, true);
  filtre.value = avant in noms || avant === "-" ? avant : "";
  const select = form.elements.famille;
  select.innerHTML = '<option value="">— Aucune famille —</option>';
  remplirSelect(select, noms, true);
}

function afficherListe() {
  $("#vue-liste").hidden = false;
  $("#vue-formulaire").hidden = true;
  $("#vue-familles").hidden = true;
  $("#vue-succes").hidden = true;
  $("#vue-agent").hidden = true;
  $("#vue-pyramide").hidden = true;

  const texte = $("#recherche").value.trim().toLowerCase();
  const filtres = { rarete: $("#filtre-rarete").value, gamme: $("#filtre-gamme").value, epoque: $("#filtre-epoque").value };
  const region = $("#filtre-region").value;
  const famille = $("#filtre-famille").value;   // "" = toutes, "-" = sans famille
  const statut = $("#filtre-statut").value;

  const visibles = cartes.filter(c =>
    Object.entries(filtres).every(([champ, v]) => !v || c[champ] === v) &&
    (!region || dansRegion(c, region)) &&
    (!famille || (famille === "-" ? !c.famille : c.famille === famille)) &&
    (!statut || (c.statut ?? "validee") === statut) &&
    (!texte || [c.nom, c.nom_en, c.lieu, c.dates, c.id].join(" ").toLowerCase().includes(texte)));

  $("#nb-cartes").textContent = visibles.length === cartes.length
    ? `(${cartes.length})` : `(${visibles.length} sur ${cartes.length})`;
  $("#aucun-resultat").hidden = visibles.length > 0;

  const tbody = $("#lignes");
  tbody.innerHTML = "";
  for (const c of visibles) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="vignette">${c.image ? `<img src="${echapper(c.image)}" alt="" loading="lazy">` : `<span>${echapper(initiales(c.nom))}</span>`}</td>
      <td class="col-nom">${echapper(c.nom)}${c.statut === "brouillon" ? ' <span class="badge-brouillon">Brouillon</span>' : ""}</td>
      <td>${numeroDe(c)}</td>
      <td>${EXTENSIONS[c.epoque].nom}</td>
      <td><span class="pastille rarete-${c.rarete}">${RARETES[c.rarete].nom}</span></td>
      <td>${GAMMES[c.gamme]}</td>
      <td>${c.famille && FAMILLES[c.famille] ? echapper(FAMILLES[c.famille].nom) : ""}</td>
      <td>${nomsRegions(c)}</td>
      <td class="col-actions">
        <button class="bouton petit" data-modifier="${echapper(c.id)}">Modifier</button>
        <button class="bouton petit bouton-danger" data-supprimer="${echapper(c.id)}">Supprimer</button>
      </td>`;
    tbody.appendChild(tr);
  }
}

$("#lignes").addEventListener("click", e => {
  const mod = e.target.closest("[data-modifier]");
  const sup = e.target.closest("[data-supprimer]");
  if (mod) ouvrirFormulaire(cartes.find(c => c.id === mod.dataset.modifier));
  if (sup) demanderSuppression(cartes.find(c => c.id === sup.dataset.supprimer));
});

for (const id of ["#recherche", "#filtre-rarete", "#filtre-gamme", "#filtre-region", "#filtre-epoque", "#filtre-famille", "#filtre-statut"]) {
  $(id).addEventListener("input", afficherListe);
}

// ---------- Formulaire ----------

function ouvrirFormulaire(ligne) {
  carteEditee = ligne || null;
  nouvelleImage && URL.revokeObjectURL(nouvelleImage.url);
  nouvelleImage = null;
  imageRetiree = false;
  idModifieALaMain = false;
  oublierRetouches();
  form.reset();
  $("#erreur-carte").textContent = "";
  $("#fichier-image").value = "";
  $("#info-image").textContent = "Recadrée automatiquement au centre en paysage 4:3, puis compressée (WebP 800×600).";

  const l = ligne || { nom: "", id: "", gamme: "personnage", rarete: "ordinaire",
    epoque: "antiquite", region: "moyen-orient", dates: "", lieu: "", description: "" };
  for (const champ of ["nom", "id", "gamme", "rarete", "famille", "religion", "epoque", "region", "dates", "lieu", "description", ...CHAMPS_EN, ...CHAMPS_PLUS]) {
    form.elements[champ].value = l[champ] ?? "";
  }
  for (const caseRegion of $("#cases-regions").querySelectorAll("input")) caseRegion.checked = (l.regions_secondaires || []).includes(caseRegion.value);
  // Carte existante : son statut (« validee » si la colonne n'existe pas encore) ; nouvelle carte : brouillon.
  form.elements.statut.value = ligne ? (ligne.statut || "validee") : "brouillon";
  form.elements.id.readOnly = !!ligne;
  avantIA = null;
  noteIA("");
  $("#bouton-ia").disabled = iaEnCours || !form.elements.nom.value.trim();
  $("#aide-id").textContent = ligne
    ? "L'identifiant ne peut plus changer : il relie la carte aux collections des joueurs."
    : "Créé à partir du nom. Il ne pourra plus changer une fois la carte créée.";
  $("#titre-formulaire").textContent = ligne ? `Modifier « ${ligne.nom} »` : "Nouvelle carte";
  $("#bouton-enregistrer").textContent = ligne ? "Enregistrer les modifications" : "Créer la carte";

  $("#vue-liste").hidden = true;
  $("#vue-succes").hidden = true;
  $("#vue-formulaire").hidden = false;
  window.scrollTo(0, 0);
  majApercu();
  form.elements.nom.focus();
}

$("#bouton-nouvelle").addEventListener("click", () => ouvrirFormulaire(null));

document.querySelectorAll("[data-apercu]").forEach(b => b.addEventListener("click", () => {
  langueApercu = b.dataset.apercu;
  document.querySelectorAll("[data-apercu]").forEach(x => x.classList.toggle("actif", x === b));
  majApercu();
}));
$("#bouton-retour").addEventListener("click", afficherListe);

document.querySelectorAll("[data-finition-apercu]").forEach(b => b.addEventListener("click", () => {
  finitionApercu = b.dataset.finitionApercu;
  document.querySelectorAll("[data-finition-apercu]").forEach(x => x.classList.toggle("actif", x === b));
  $("#apercu-note").textContent = finitionApercu === "normale" ? ""
    : "Aperçu seulement : dans le jeu, la finition est tirée au sort à l'ouverture des boosters.";
  majApercu();
}));

form.elements.nom.addEventListener("input", () => {
  if (!carteEditee && !idModifieALaMain) form.elements.id.value = versIdentifiant(form.elements.nom.value);
  if (!iaEnCours) $("#bouton-ia").disabled = !form.elements.nom.value.trim();
});

// ---------- Remplir avec l'IA (Edge Function « remplir-carte ») ----------
// L'IA propose un brouillon ; rien n'est enregistré avant « Enregistrer ».

const CHAMPS_IA = ["dates", "lieu", "description", "region", "epoque", ...CHAMPS_EN, ...CHAMPS_PLUS];
let avantIA = null;     // valeurs remplacées, pour « Annuler »
let iaEnCours = false;

function noteIA(texte, { alerte = false, annulable = false } = {}) {
  $("#note-ia").hidden = !texte;
  $("#note-ia").classList.toggle("alerte", alerte);
  $("#texte-ia").textContent = texte;
  $("#annuler-ia").hidden = !annulable;
}

$("#bouton-ia").addEventListener("click", async () => {
  const nom = form.elements.nom.value.trim();
  if (!nom || iaEnCours) return;
  iaEnCours = true;
  const bouton = $("#bouton-ia");
  bouton.disabled = true;
  bouton.textContent = "✨ Rédaction…";
  noteIA("L'IA rédige la carte… (10 à 30 secondes)");

  const { data, error } = await sb.functions.invoke("remplir-carte", { body: { nom } });

  iaEnCours = false;
  bouton.textContent = "✨ Remplir avec l'IA";
  bouton.disabled = !form.elements.nom.value.trim();

  if (error) {
    let message = "L'IA n'a pas pu répondre. Réessayez.";
    try { message = (await error.context.json()).erreur || message; } catch (e) { /* réponse sans détail */ }
    noteIA(message, { alerte: true });
    return;
  }

  avantIA = Object.fromEntries(CHAMPS_IA.map(c => [c, form.elements[c].value]));
  for (const c of CHAMPS_IA) {
    if (data[c] !== undefined) form.elements[c].value = data[c];
  }
  majApercu();
  if (data.probleme) {
    noteIA(`⚠️ ${data.probleme} Relisez avec attention avant d'enregistrer.`, { alerte: true, annulable: true });
  } else {
    noteIA("Rempli par l'IA : relisez et corrigez si besoin avant d'enregistrer.", { annulable: true });
  }
  if (!imageActuelle()) peindreIllustration();   // comme l'agent : le texte, puis l'image
});

$("#annuler-ia").addEventListener("click", () => {
  if (!avantIA) return;
  for (const c of CHAMPS_IA) form.elements[c].value = avantIA[c];
  avantIA = null;
  majApercu();
  noteIA("");
});
form.elements.id.addEventListener("input", () => { idModifieALaMain = true; });
form.addEventListener("input", majApercu);

function imageActuelle() {
  if (nouvelleImage) return nouvelleImage.url;
  if (imageRetiree) return null;
  return carteEditee?.image || null;
}

function valeursFormulaire() {
  const f = form.elements;
  return {
    id: f.id.value.trim(), nom: f.nom.value.trim(), gamme: f.gamme.value, rarete: f.rarete.value,
    epoque: f.epoque.value, region: f.region.value, statut: f.statut.value,
    regions_secondaires: regionsCochees(),
    // Famille : seulement pour les personnages historiques.
    famille: (f.gamme.value === "personnage" && f.famille.value) || null,
    religion: (f.gamme.value === "personnage" && f.religion.value) || null,
    dates: f.dates.value.trim(), lieu: f.lieu.value.trim(), description: f.description.value.trim(),
    // Anglais : vide = null, le jeu affiche alors le français.
    ...Object.fromEntries(CHAMPS_EN.map(c => [c, f[c].value.trim() || null])),
    // « En savoir plus » : seulement pour les personnages historiques (vide = pas de bouton).
    ...Object.fromEntries(CHAMPS_PLUS.map(c => [c, (f.gamme.value === "personnage" && f[c].value.trim()) || null])),
  };
}

// Régions secondaires cochées (jamais la région principale).
function regionsCochees() {
  return [...$("#cases-regions").querySelectorAll("input:checked")].map(i => i.value).filter(r => r !== form.elements.region.value);
}

// La case de la région principale est grisée : elle est déjà la région de la carte.
function majCasesRegions() {
  for (const caseRegion of $("#cases-regions").querySelectorAll("input")) {
    const principale = caseRegion.value === form.elements.region.value;
    caseRegion.disabled = principale;
    if (principale) caseRegion.checked = false;
    caseRegion.parentElement.classList.toggle("principale", principale);
  }
}

function majApercu() {
  majCasesRegions();
  const v = valeursFormulaire();
  $("#compte-description").textContent = form.elements.description.value.length;
  $("#retirer-image").hidden = !imageActuelle();
  $("#zone-retouche").hidden = !imageActuelle();

  // Numéro tel qu'il apparaîtra : place actuelle, ou en fin d'époque pour une nouvelle carte.
  const autres = cartesEpoque(v.epoque).filter(c => c.id !== carteEditee?.id);
  const garde = carteEditee && carteEditee.epoque === v.epoque;
  const total = autres.length + 1;
  const n = garde ? cartesEpoque(v.epoque).findIndex(c => c.id === carteEditee.id) + 1 : total;
  const numero = `${String(n).padStart(String(total).length, "0")}/${total}`;

  $("#compte-description-en").textContent = form.elements.description_en.value.length;
  $("#compte-plus").textContent = form.elements.en_savoir_plus.value.length;
  $("#compte-plus-en").textContent = form.elements.en_savoir_plus_en.value.length;
  $("#compte-plus-he").textContent = form.elements.en_savoir_plus_he.value.length;
  $("#bloc-plus").hidden = $("#bloc-plus-en").hidden = $("#bloc-plus-he").hidden = $("#bloc-famille").hidden = $("#bloc-religion").hidden = v.gamme !== "personnage";
  const carte = { ...versCarte({ ...v, nom: v.nom || "Nom de la carte", image: imageActuelle() }, langueApercu), finition: finitionApercu };
  LANGUE = langueApercu;                      // le dessin de la carte suit la langue de l'aperçu
  $("#apercu").innerHTML = rendreCarte(carte, numero);
  LANGUE = "fr";
}

// ---------- Image : recadrage 4:3 au centre + compression WebP ----------

$("#fichier-image").addEventListener("change", async e => {
  const fichier = e.target.files[0];
  if (!fichier) return;
  $("#info-image").textContent = "Traitement de l'image…";
  try {
    const { blob, largeur, hauteur } = await preparerImage(fichier);
    nouvelleImage && URL.revokeObjectURL(nouvelleImage.url);
    nouvelleImage = { blob, url: URL.createObjectURL(blob) };
    imageRetiree = false;
    oublierRetouches();
    const recadree = Math.abs(largeur / hauteur - 4 / 3) > 0.01;
    $("#info-image").textContent = `${largeur}×${hauteur} → ${recadree ? "recadrée au centre, " : ""}`
      + `${LARGEUR_IMAGE}×${HAUTEUR_IMAGE} WebP, ${Math.round(blob.size / 1024)} Ko. Envoyée à l'enregistrement.`;
    majApercu();
  } catch (err) {
    $("#info-image").textContent = err.message;
    e.target.value = "";
  }
});

$("#retirer-image").addEventListener("click", () => {
  nouvelleImage && URL.revokeObjectURL(nouvelleImage.url);
  nouvelleImage = null;
  imageRetiree = true;
  $("#fichier-image").value = "";
  oublierRetouches();
  majApercu();
});

// ---------- Retouche de l'illustration par l'IA (Nano Banana, Edge Function « agent-cartes ») ----------
// La retouche part de l'image affichée (même pas encore enregistrée) : on peut enchaîner plusieurs retouches,
// et revenir en arrière une à une. Rien n'est envoyé au stockage avant « Enregistrer ».

let avantRetouche = [];   // images remplacées par les retouches ; null = l'image enregistrée de la carte
let retoucheEnCours = false;

function oublierRetouches() {
  for (const ancienne of avantRetouche) ancienne && URL.revokeObjectURL(ancienne.url);
  avantRetouche = [];
  $("#annuler-retouche").hidden = true;
  $("#consigne-retouche").value = "";
  $("#consigne-peindre").value = "";
}

const versBase64 = blob => new Promise((ok, echec) => {
  const lecteur = new FileReader();
  lecteur.onload = () => ok(String(lecteur.result).split(",")[1]);
  lecteur.onerror = () => echec(new Error("Lecture de l'image impossible."));
  lecteur.readAsDataURL(blob);
});

async function retoucherImage() {
  const consigne = $("#consigne-retouche").value.trim();
  const source = imageActuelle();
  if (!consigne) return ($("#info-retouche").textContent = "Écrivez d'abord ce qu'il faut changer.");
  if (!source || retoucheEnCours) return;
  retoucheEnCours = true;
  const bouton = $("#bouton-retouche");
  bouton.disabled = true;
  bouton.textContent = "🎨 Retouche…";
  $("#info-retouche").textContent = "Nano Banana retouche l'image… (20 à 60 secondes)";
  try {
    const blob = nouvelleImage?.blob ?? await (await fetch(source)).blob();
    const peinte = await appelAgent({ action: "retouche", image: await versBase64(blob), mime: blob.type || "image/webp", consigne });
    const brute = await (await fetch(`data:${peinte.mime};base64,${peinte.data}`)).blob();
    const prete = await preparerImage(brute);
    avantRetouche.push(nouvelleImage);   // gardée pour « Revenir à l'image d'avant »
    nouvelleImage = { blob: prete.blob, url: URL.createObjectURL(prete.blob) };
    imageRetiree = false;
    $("#annuler-retouche").hidden = false;
    $("#info-retouche").textContent = "Retouchée ✓ Cliquez sur « Enregistrer » pour la garder, ou retouchez encore.";
    majApercu();
  } catch (err) {
    $("#info-retouche").textContent = `✗ ${err.message}`;
  } finally {
    retoucheEnCours = false;
    bouton.disabled = false;
    bouton.textContent = "🎨 Retoucher";
  }
}

$("#bouton-retouche").addEventListener("click", retoucherImage);

// ---------- Illustration peinte par l'IA (Nano Banana, action « image » d'agent-cartes) ----------
// Claude décrit d'abord l'image (fidèle à l'époque) à partir des champs de la carte et de la précision
// facultative, puis Nano Banana la peint ; le style est ajouté par le serveur.

let peintureEnCours = false;

async function peindreIllustration() {
  const v = valeursFormulaire();
  if (!v.nom) return ($("#info-peindre").textContent = "Écrivez d'abord le nom de la carte.");
  if (peintureEnCours) return;
  peintureEnCours = true;
  const bouton = $("#bouton-peindre");
  bouton.disabled = true;
  bouton.textContent = "🎨 Peinture…";
  $("#info-peindre").textContent = "Claude décrit l'image fidèle à l'époque… (10 à 30 secondes)";
  try {
    const { prompt_image } = await appelAgent({
      action: "prompt", gamme: v.gamme, region: v.region, epoque: v.epoque,
      nom: v.nom, dates: v.dates, lieu: v.lieu, description: v.description, demande: $("#consigne-peindre").value.trim(),
    });
    $("#info-peindre").textContent = "Nano Banana peint l'illustration… (20 à 60 secondes)";
    const peinte = await appelAgent({ action: "image", prompt: prompt_image });
    const brute = await (await fetch(`data:${peinte.mime};base64,${peinte.data}`)).blob();
    const prete = await preparerImage(brute);
    avantRetouche.push(nouvelleImage);   // l'image d'avant reste récupérable (« Revenir à l'image d'avant »)
    nouvelleImage = { blob: prete.blob, url: URL.createObjectURL(prete.blob) };
    imageRetiree = false;
    $("#annuler-retouche").hidden = false;
    $("#info-peindre").textContent = "Peinte ✓ Cliquez sur « Enregistrer » pour la garder, peignez-en une autre, ou retouchez-la ci-dessous.";
    majApercu();
  } catch (err) {
    $("#info-peindre").textContent = `✗ ${err.message}`;
  } finally {
    peintureEnCours = false;
    bouton.disabled = false;
    bouton.textContent = "🎨 Peindre l'illustration";
  }
}

$("#bouton-peindre").addEventListener("click", peindreIllustration);
$("#annuler-retouche").addEventListener("click", () => {
  if (!avantRetouche.length || retoucheEnCours) return;
  nouvelleImage && URL.revokeObjectURL(nouvelleImage.url);
  nouvelleImage = avantRetouche.pop();
  $("#annuler-retouche").hidden = avantRetouche.length === 0;
  $("#info-retouche").textContent = "Image d'avant remise.";
  majApercu();
});

async function preparerImage(fichier) {
  let source;
  try { source = await createImageBitmap(fichier); }
  catch { throw new Error("Ce fichier n'est pas une image lisible (essayez JPG, PNG ou WebP)."); }
  const largeur = source.width, hauteur = source.height;

  // Plus grande zone 4:3 au centre de l'image : on coupe sans jamais déformer.
  let sl = largeur, sh = Math.round(largeur * 3 / 4);
  if (sh > hauteur) { sh = hauteur; sl = Math.round(hauteur * 4 / 3); }
  const sx = Math.round((largeur - sl) / 2), sy = Math.round((hauteur - sh) / 2);

  const canvas = document.createElement("canvas");
  canvas.width = LARGEUR_IMAGE;
  canvas.height = HAUTEUR_IMAGE;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, sx, sy, sl, sh, 0, 0, LARGEUR_IMAGE, HAUTEUR_IMAGE);
  source.close?.();

  const blob = await new Promise(r => canvas.toBlob(r, "image/webp", QUALITE_IMAGE));
  if (!blob || blob.type !== "image/webp") {
    throw new Error("Ce navigateur ne sait pas créer d'image WebP. Utilisez Chrome, Edge ou Firefox.");
  }
  return { blob, largeur, hauteur };
}

// ---------- Enregistrer ----------

form.addEventListener("submit", async e => {
  e.preventDefault();
  const erreur = $("#erreur-carte");
  erreur.textContent = "";
  const v = valeursFormulaire();

  if (!v.nom) return (erreur.textContent = "Le nom est obligatoire.");
  if (!/^[a-z0-9-]+$/.test(v.id)) return (erreur.textContent = "Identifiant invalide : lettres minuscules, chiffres et tirets uniquement.");
  if (!carteEditee && cartes.some(c => c.id === v.id)) {
    return (erreur.textContent = `L'identifiant « ${v.id} » existe déjà. Modifiez-le (ex. ${v.id}-2).`);
  }

  const bouton = $("#bouton-enregistrer");
  bouton.disabled = true;
  bouton.textContent = "Enregistrement…";
  let fichierEnvoye = null;

  try {
    // 1. Envoi de la nouvelle image (nom unique pour éviter les vieilles versions en cache).
    let image = imageRetiree ? null : carteEditee?.image ?? null;
    if (nouvelleImage) {
      fichierEnvoye = `${v.id}-${Date.now()}.webp`;
      const { error } = await sb.storage.from(BUCKET)
        .upload(fichierEnvoye, nouvelleImage.blob, { contentType: "image/webp", upsert: false });
      if (error) throw new Error(`Envoi de l'image refusé : ${error.message}`);
      image = sb.storage.from(BUCKET).getPublicUrl(fichierEnvoye).data.publicUrl;
    }

    // 2. Position dans l'époque : en fin de liste pour une nouvelle carte ou un changement d'époque.
    const finEpoque = Math.max(0, ...cartesEpoque(v.epoque).map(c => c.ordre)) + 1;
    const ordre = carteEditee && carteEditee.epoque === v.epoque ? carteEditee.ordre : finEpoque;
    const ligne = { ...v, image, ordre };

    // 3. Écriture dans la base (refusée par la base si l'on n'est pas admin).
    const requete = carteEditee
      ? sb.from("cartes").update(ligne).eq("id", carteEditee.id).select()
      : sb.from("cartes").insert(ligne).select();
    const { data, error } = await requete;
    if (error) throw new Error(`Enregistrement refusé : ${error.message}`);
    if (!data || data.length === 0) throw new Error("Enregistrement refusé par la base (droits administrateur ?).");

    // 4. L'ancienne image n'est plus utilisée : on la supprime du stockage.
    const ancienne = cheminStockage(carteEditee?.image);
    if (ancienne && ancienne !== fichierEnvoye && image !== carteEditee.image) {
      await sb.storage.from(BUCKET).remove([ancienne]);
    }

    notifier(carteEditee ? `« ${v.nom} » modifiée.` : `« ${v.nom} » créée.`);
    await chargerCartes();
    afficherListe();
  } catch (err) {
    if (fichierEnvoye) await sb.storage.from(BUCKET).remove([fichierEnvoye]);   // ne pas laisser d'image orpheline
    erreur.textContent = err.message;
  } finally {
    bouton.disabled = false;
    bouton.textContent = carteEditee ? "Enregistrer les modifications" : "Créer la carte";
  }
});

// ---------- Supprimer (avec confirmation) ----------

let aSupprimer = null;

function demanderSuppression(ligne) {
  aSupprimer = ligne;
  $("#texte-suppression").textContent =
    `« ${ligne.nom} » (${RARETES[ligne.rarete].nom}, ${EXTENSIONS[ligne.epoque].nom}) sera retirée du jeu `
    + "et son illustration effacée. Cette action est définitive.";
  $("#dialogue-suppression").hidden = false;
  $("#annuler-suppression").focus();
}

function fermerDialogue() {
  $("#dialogue-suppression").hidden = true;
  aSupprimer = null;
}

$("#annuler-suppression").addEventListener("click", fermerDialogue);
$("#dialogue-suppression").addEventListener("click", e => { if (e.target.id === "dialogue-suppression") fermerDialogue(); });
document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("#dialogue-suppression").hidden) fermerDialogue(); });

$("#confirmer-suppression").addEventListener("click", async () => {
  const ligne = aSupprimer;
  if (!ligne) return;
  const bouton = $("#confirmer-suppression");
  bouton.disabled = true;
  const { data, error } = await sb.from("cartes").delete().eq("id", ligne.id).select();
  bouton.disabled = false;
  fermerDialogue();
  if (error || !data?.length) {
    notifier(`Suppression refusée${error ? ` : ${error.message}` : ""}.`);
    return;
  }
  const chemin = cheminStockage(ligne.image);
  if (chemin) await sb.storage.from(BUCKET).remove([chemin]);
  notifier(`« ${ligne.nom} » supprimée.`);
  await chargerCartes();
  afficherListe();
});

// ---------- Familles : créer, renommer, changer d'emblème, supprimer ----------

function afficherFamillesAdmin() {
  $("#vue-pyramide").hidden = true;
  $("#vue-agent").hidden = true;
  $("#vue-liste").hidden = true;
  $("#vue-succes").hidden = true;
  $("#vue-formulaire").hidden = true;
  $("#vue-familles").hidden = false;
  const liste = Object.values(FAMILLES).sort((a, b) => a.ordre - b.ordre || a.nom.localeCompare(b.nom));
  $("#nb-familles").textContent = `(${liste.length})`;
  const tbody = $("#lignes-familles");
  tbody.innerHTML = "";
  for (const f of liste) tbody.appendChild(ligneFamille(f));
}

const optionsEmblemes = choisi => Object.entries(EMBLEMES)
  .map(([cle, e]) => `<option value="${cle}"${cle === choisi ? " selected" : ""}>${e.nom}</option>`).join("");

// Une ligne modifiable du tableau ; famille = null pour une nouvelle famille.
function ligneFamille(f) {
  const nouvelle = !f;
  f ||= { id: "", nom: "", nom_en: "", nom_he: "", embleme: "etoile",
          ordre: Math.max(0, ...Object.values(FAMILLES).map(x => x.ordre)) + 1 };
  const nb = cartes.filter(c => c.famille === f.id).length;
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td><span class="choix-embleme"><span class="embleme-apercu">${dessinEmbleme(f.embleme)}</span>
      <select name="embleme" aria-label="Emblème">${optionsEmblemes(f.embleme)}</select></span></td>
    <td><input name="nom" maxlength="40" value="${echapper(f.nom)}" placeholder="ex. Conquérants" aria-label="Nom français"></td>
    <td><input name="nom_en" maxlength="40" value="${echapper(f.nom_en || "")}" placeholder="ex. Conquerors" lang="en" aria-label="Nom anglais"></td>
    <td><input name="nom_he" maxlength="40" value="${echapper(f.nom_he || "")}" lang="he" dir="rtl" aria-label="Nom hébreu"></td>
    <td><input name="ordre" type="number" min="0" value="${f.ordre}" aria-label="Ordre"></td>
    <td>${nouvelle ? "—" : nb}</td>
    <td class="col-actions">
      <button class="bouton petit bouton-or" data-action="enregistrer">${nouvelle ? "Créer" : "Enregistrer"}</button>
      ${nouvelle ? `<button class="bouton petit" data-action="annuler">Annuler</button>`
                 : `<button class="bouton petit bouton-danger" data-action="supprimer">Supprimer</button>`}
    </td>`;
  const champ = nom => tr.querySelector(`[name="${nom}"]`);
  champ("embleme").addEventListener("input", () => {
    tr.querySelector(".embleme-apercu").innerHTML = dessinEmbleme(champ("embleme").value);
  });

  tr.querySelector('[data-action="enregistrer"]').addEventListener("click", async e => {
    const valeurs = {
      nom: champ("nom").value.trim(), nom_en: champ("nom_en").value.trim() || null,
      nom_he: champ("nom_he").value.trim() || null, embleme: champ("embleme").value,
      ordre: Number(champ("ordre").value) || 0,
    };
    if (!valeurs.nom) return notifier("Le nom français est obligatoire.");
    let requete;
    if (nouvelle) {
      const id = versIdentifiant(valeurs.nom);
      if (!id) return notifier("Nom invalide.");
      if (FAMILLES[id]) return notifier(`La famille « ${FAMILLES[id].nom} » existe déjà.`);
      requete = sb.from("familles").insert({ id, ...valeurs }).select();
    } else {
      requete = sb.from("familles").update(valeurs).eq("id", f.id).select();
    }
    e.target.disabled = true;
    const { data, error } = await requete;
    e.target.disabled = false;
    if (error || !data?.length) return notifier(`Enregistrement refusé${error ? ` : ${error.message}` : ""}.`);
    notifier(nouvelle ? `Famille « ${valeurs.nom} » créée.` : `Famille « ${valeurs.nom} » enregistrée.`);
    await chargerCartes();
    afficherFamillesAdmin();
  });

  tr.querySelector('[data-action="annuler"]')?.addEventListener("click", () => tr.remove());

  // Suppression en deux temps : le bouton demande confirmation.
  const supprimer = tr.querySelector('[data-action="supprimer"]');
  supprimer?.addEventListener("click", async () => {
    if (!supprimer.dataset.confirme) {
      supprimer.dataset.confirme = "1";
      supprimer.textContent = nb ? `Confirmer (${nb} carte${nb > 1 ? "s" : ""} sans famille)` : "Confirmer";
      setTimeout(() => { delete supprimer.dataset.confirme; supprimer.textContent = "Supprimer"; }, 4000);
      return;
    }
    const { data, error } = await sb.from("familles").delete().eq("id", f.id).select();
    if (error || !data?.length) return notifier(`Suppression refusée${error ? ` : ${error.message}` : ""}.`);
    notifier(`Famille « ${f.nom} » supprimée.`);
    await chargerCartes();
    afficherFamillesAdmin();
  });
  return tr;
}

$("#bouton-familles").addEventListener("click", afficherFamillesAdmin);
$("#familles-retour").addEventListener("click", afficherListe);
$("#famille-nouvelle").addEventListener("click", () => {
  const tr = ligneFamille(null);
  $("#lignes-familles").prepend(tr);
  tr.querySelector('[name="nom"]').focus();
});

// ---------- Succès : la liste que les joueurs peuvent débloquer (table « succes ») ----------
// Chaque succès : un type (la condition), des paramètres, un seuil et des Chronos.

const TYPES_SUCCES = {
  ensemble: "Ensemble de cartes (toutes possédées)",
  cartes_differentes: "Nombre de cartes différentes",
  boosters_ouverts: "Nombre de boosters ouverts",
  booster_dore: "Nombre de boosters dorés ouverts",
  rarete: "Première carte d'une rareté",
  finition: "Première finition (Émeraude, Diamant)",
  serie: "Jours de jeu d'affilée",
  quiz: "Bonnes réponses au quiz",
};
const AVEC_SEUIL = ["cartes_differentes", "boosters_ouverts", "booster_dore", "serie", "quiz"];
const RELIGIONS_ADMIN = { christianisme: "Christianisme", judaisme: "Judaïsme", islam: "Islam" };
let SUCCES = [];

const optionsSelect = (valeurs, choisi, vide = "") =>
  (vide ? `<option value="">${vide}</option>` : "") +
  Object.entries(valeurs).map(([k, v]) => `<option value="${k}"${k === choisi ? " selected" : ""}>${echapper(v)}</option>`).join("");

// Cartes validées qui correspondent aux critères d'un « ensemble » (comme le serveur : progres_succes).
function cartesEnsemble(p) {
  const mots = (p.mots || []).map(m => m.toLowerCase());
  return cartes.filter(c => (c.statut ?? "validee") === "validee"
    && (!p.famille || c.famille === p.famille) && (!p.epoque || c.epoque === p.epoque)
    && (!p.gamme || c.gamme === p.gamme) && (!p.rarete || c.rarete === p.rarete)
    && (!p.religion || c.religion === p.religion)
    && (!p.region || p.region === "joueur" || dansRegion(c, p.region))
    && (!mots.length || mots.some(m => c.nom.toLowerCase().includes(m)))
    && (!p.cartes || p.cartes.includes(c.id)));
}

async function afficherSuccesAdmin() {
  for (const v of ["#vue-pyramide", "#vue-agent", "#vue-liste", "#vue-formulaire", "#vue-familles"]) $(v).hidden = true;
  $("#vue-succes").hidden = false;
  const { data, error } = await sb.from("succes").select("*").order("ordre").order("id");
  if (error) {
    $("#lignes-succes").innerHTML = `<tr><td colspan="8">Succès indisponibles : ${echapper(error.message)} (le script 24_quetes_succes.sql a-t-il été lancé ?)</td></tr>`;
    return;
  }
  SUCCES = data;
  $("#nb-succes").textContent = `(${data.length})`;
  const tbody = $("#lignes-succes");
  tbody.innerHTML = "";
  data.forEach(s => tbody.appendChild(ligneSucces(s)));
}

function ligneSucces(s) {
  const nouveau = !s;
  s ||= { id: "", nom: "", nom_en: "", nom_he: "", type: "ensemble", param: {}, seuil: 1, chronos: 100,
          ordre: Math.max(0, ...SUCCES.map(x => x.ordre)) + 1, actif: true };
  const p = s.param || {};
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td><input name="nom" maxlength="60" value="${echapper(s.nom)}" placeholder="ex. Tous les mendiants" aria-label="Nom français"></td>
    <td><input name="nom_en" maxlength="60" value="${echapper(s.nom_en || "")}" lang="en" aria-label="Nom anglais"></td>
    <td><input name="nom_he" maxlength="60" value="${echapper(s.nom_he || "")}" lang="he" dir="rtl" aria-label="Nom hébreu"></td>
    <td class="condition-succes">
      <select name="type" aria-label="Condition">${optionsSelect(TYPES_SUCCES, s.type)}</select>
      <span class="parametres" data-pour="ensemble">
        <select name="famille" aria-label="Famille">${optionsSelect(Object.fromEntries(Object.values(FAMILLES).map(f => [f.id, f.nom])), p.famille, "Toute famille")}</select>
        <select name="epoque" aria-label="Époque">${optionsSelect(nomsEpoque, p.epoque, "Toute époque")}</select>
        <select name="region" aria-label="Région">${optionsSelect({ joueur: "Région du joueur", ...REGIONS }, p.region, "Toute région")}</select>
        <select name="gamme" aria-label="Type de carte">${optionsSelect(GAMMES, p.gamme, "Tout type")}</select>
        <select name="rarete_e" aria-label="Rareté">${optionsSelect(nomsRarete, p.rarete, "Toute rareté")}</select>
        <select name="religion" aria-label="Religion">${optionsSelect(RELIGIONS_ADMIN, p.religion, "Toute religion")}</select>
        <input name="mots" value="${echapper((p.mots || []).join(", "))}" placeholder="mots du nom, ex. mendiant" aria-label="Mots dans le nom">
        <input name="cartes" value="${echapper((p.cartes || []).join(", "))}" placeholder="ou identifiants, ex. saladin, cyrus-ii" aria-label="Liste de cartes">
        <small class="apercu-ensemble"></small>
      </span>
      <span class="parametres" data-pour="rarete"><select name="rarete" aria-label="Rareté">${optionsSelect(nomsRarete, p.rarete)}</select></span>
      <span class="parametres" data-pour="finition"><select name="finition" aria-label="Finition">${optionsSelect({ emeraude: "Émeraude", diamant: "Diamant" }, p.finition)}</select></span>
      <span class="parametres" data-pour="seuil"><input name="seuil" type="number" min="1" value="${s.seuil}" aria-label="Nombre à atteindre"></span>
    </td>
    <td><input name="chronos" type="number" min="0" step="10" value="${s.chronos}" aria-label="Chronos"></td>
    <td><input name="ordre" type="number" min="0" value="${s.ordre}" aria-label="Ordre"></td>
    <td><input name="actif" type="checkbox"${s.actif ? " checked" : ""} aria-label="Actif"></td>
    <td class="col-actions">
      <button class="bouton petit bouton-or" data-action="enregistrer">${nouveau ? "Créer" : "Enregistrer"}</button>
      ${nouveau ? `<button class="bouton petit" data-action="annuler">Annuler</button>`
                : `<button class="bouton petit bouton-danger" data-action="supprimer">Supprimer</button>`}
    </td>`;
  const champ = nom => tr.querySelector(`[name="${nom}"]`);
  const liste = nom => champ(nom).value.split(",").map(x => x.trim()).filter(Boolean);
  const parametres = () => {
    const type = champ("type").value;
    if (type === "rarete") return { rarete: champ("rarete").value };
    if (type === "finition") return { finition: champ("finition").value };
    if (type !== "ensemble") return {};
    const q = {};
    for (const n of ["famille", "epoque", "region", "gamme", "religion"]) if (champ(n).value) q[n] = champ(n).value;
    if (champ("rarete_e").value) q.rarete = champ("rarete_e").value;
    if (liste("mots").length) q.mots = liste("mots");
    if (liste("cartes").length) q.cartes = liste("cartes");
    return q;
  };
  // Seuls les réglages de la condition choisie sont visibles ; aperçu du nombre de cartes de l'ensemble.
  const maj = () => {
    const type = champ("type").value;
    tr.querySelectorAll(".parametres").forEach(el => {
      el.hidden = el.dataset.pour === "seuil" ? !AVEC_SEUIL.includes(type) : el.dataset.pour !== type;
    });
    if (type === "ensemble") {
      const n = cartesEnsemble(parametres()).length;
      tr.querySelector(".apercu-ensemble").textContent = champ("region").value === "joueur"
        ? `${n} cartes en tout (le joueur : seulement celles de sa région)`
        : `${n} carte${n > 1 ? "s" : ""} validée${n > 1 ? "s" : ""}${n ? "" : " : ce succès sera caché"}`;
    }
  };
  tr.addEventListener("input", maj);
  maj();

  tr.querySelector('[data-action="enregistrer"]').addEventListener("click", async e => {
    const valeurs = {
      nom: champ("nom").value.trim(), nom_en: champ("nom_en").value.trim() || null, nom_he: champ("nom_he").value.trim() || null,
      type: champ("type").value, param: parametres(),
      seuil: AVEC_SEUIL.includes(champ("type").value) ? Math.max(1, Number(champ("seuil").value) || 1) : 1,
      chronos: Math.max(0, Number(champ("chronos").value) || 0), ordre: Number(champ("ordre").value) || 0,
      actif: champ("actif").checked,
    };
    if (!valeurs.nom) return notifier("Le nom français est obligatoire.");
    let requete;
    if (nouveau) {
      const id = versIdentifiant(valeurs.nom);
      if (!id) return notifier("Nom invalide.");
      if (SUCCES.some(x => x.id === id)) return notifier("Un succès porte déjà ce nom.");
      requete = sb.from("succes").insert({ id, ...valeurs }).select();
    } else {
      requete = sb.from("succes").update(valeurs).eq("id", s.id).select();
    }
    e.target.disabled = true;
    const { data, error } = await requete;
    e.target.disabled = false;
    if (error || !data?.length) return notifier(`Enregistrement refusé${error ? ` : ${error.message}` : ""}.`);
    notifier(nouveau ? `Succès « ${valeurs.nom} » créé.` : `Succès « ${valeurs.nom} » enregistré.`);
    afficherSuccesAdmin();
  });

  tr.querySelector('[data-action="annuler"]')?.addEventListener("click", () => tr.remove());

  // Suppression en deux temps (les joueurs qui l'avaient obtenu le perdent de leur liste).
  const supprimer = tr.querySelector('[data-action="supprimer"]');
  supprimer?.addEventListener("click", async () => {
    if (!supprimer.dataset.confirme) {
      supprimer.dataset.confirme = "1";
      supprimer.textContent = "Confirmer";
      setTimeout(() => { delete supprimer.dataset.confirme; supprimer.textContent = "Supprimer"; }, 4000);
      return;
    }
    const { data, error } = await sb.from("succes").delete().eq("id", s.id).select();
    if (error || !data?.length) return notifier(`Suppression refusée${error ? ` : ${error.message}` : ""}.`);
    notifier(`Succès « ${s.nom} » supprimé.`);
    afficherSuccesAdmin();
  });
  return tr;
}

$("#bouton-succes").addEventListener("click", afficherSuccesAdmin);
$("#succes-retour").addEventListener("click", afficherListe);
$("#succes-nouveau").addEventListener("click", () => {
  const tr = ligneSucces(null);
  $("#lignes-succes").prepend(tr);
  tr.querySelector('[name="nom"]').focus();
});

// ---------- Agent de cartes (Edge Function « agent-cartes ») ----------
// 1. Claude propose des idées pour une région ; 2. pour chaque idée cochée, il rédige la carte,
// Nano Banana la peint, et la carte est enregistrée en BROUILLON (à relire puis valider).

let agentIdees = [];          // { nom, epoque, region, resume } proposées
let agentEcartees = [];       // noms déjà proposés, pour que « Autres idées » en trouve de nouvelles
let agentEnCours = false;

function afficherAgent() {
  $("#vue-pyramide").hidden = true;
  $("#vue-liste").hidden = true;
  $("#vue-succes").hidden = true;
  $("#vue-formulaire").hidden = true;
  $("#vue-familles").hidden = true;
  $("#vue-agent").hidden = false;
}

function etatAgent(texte, alerte = false) {
  $("#agent-etat").hidden = !texte;
  $("#agent-etat").textContent = texte;
  $("#agent-etat").classList.toggle("alerte", alerte);
}

async function appelAgent(corps) {
  const { data, error } = await sb.functions.invoke("agent-cartes", { body: corps });
  if (error) {
    let message = "L'agent n'a pas pu répondre. Réessayez.";
    try { message = (await error.context.json()).erreur || message; } catch (e) { /* réponse sans détail */ }
    throw new Error(message);
  }
  return data;
}

function bloquerAgent(oui) {
  agentEnCours = oui;
  for (const id of ["#agent-idees", "#agent-autres", "#agent-creer", "#agent-gamme", "#agent-region", "#agent-epoque", "#agent-nombre", "#agent-demande"]) $(id).disabled = oui;
}

async function chercherIdees(autres = false) {
  if (agentEnCours) return;
  agentEcartees = autres ? [...agentEcartees, ...agentIdees.map(i => i.nom)] : [];
  bloquerAgent(true);
  etatAgent("Claude cherche des idées… (20 à 60 secondes)");
  try {
    const data = await appelAgent({
      action: "idees", gamme: $("#agent-gamme").value, region: $("#agent-region").value, epoque: $("#agent-epoque").value,
      nombre: Number($("#agent-nombre").value) || 5, exclure: agentEcartees, demande: $("#agent-demande").value.trim(),
    });
    agentIdees = data.idees || [];
    $("#agent-liste").innerHTML = agentIdees.map((idee, i) => `
      <li data-index="${i}">
        <input type="checkbox" checked aria-label="Créer ${echapper(idee.nom)}">
        <span class="agent-texte"><b>${echapper(idee.nom)}</b><small>${echapper(nomsEpoque[idee.epoque] || idee.epoque)}${idee.region ? ` · ${echapper(REGIONS[idee.region] || idee.region)}` : ""} — ${echapper(idee.resume)}</small></span>
        <span class="agent-statut"></span>
      </li>`).join("");
    $("#agent-propositions").hidden = agentIdees.length === 0;
    etatAgent(agentIdees.length ? "Décochez les idées qui ne vous plaisent pas, puis « Créer les cartes cochées »." : "Aucune idée trouvée.");
  } catch (err) {
    etatAgent(err.message, true);
  } finally {
    bloquerAgent(false);
  }
}

// Identifiant libre : « scribe-sumerien », sinon « scribe-sumerien-2 »…
function identifiantLibre(nom) {
  const base = versIdentifiant(nom) || "carte";
  let id = base, n = 2;
  while (cartes.some(c => c.id === id)) id = `${base}-${n++}`;
  return id;
}

async function creerCarteAgent(idee, gamme, region, statut) {
  region = idee.region || region;   // « Toutes les régions » : chaque idée a sa région
  statut.className = "agent-statut";
  statut.textContent = "✍️ Rédaction…";
  const c = await appelAgent({ action: "carte", gamme, region, nom: idee.nom, resume: idee.resume, demande: $("#agent-demande").value.trim() });

  // L'illustration : si elle échoue, la carte est quand même enregistrée (image à ajouter à la main).
  statut.textContent = "🎨 Illustration…";
  let image = null, fichierEnvoye = null, noteImage = "";
  const id = identifiantLibre(c.nom);
  try {
    const peinte = await appelAgent({ action: "image", prompt: c.prompt_image });
    const brute = await (await fetch(`data:${peinte.mime};base64,${peinte.data}`)).blob();
    const { blob } = await preparerImage(brute);
    fichierEnvoye = `${id}-${Date.now()}.webp`;
    const { error } = await sb.storage.from(BUCKET).upload(fichierEnvoye, blob, { contentType: "image/webp", upsert: false });
    if (error) throw new Error(`envoi refusé : ${error.message}`);
    image = sb.storage.from(BUCKET).getPublicUrl(fichierEnvoye).data.publicUrl;
  } catch (err) {
    fichierEnvoye = null;
    noteImage = ` (sans image : ${err.message})`;
  }

  statut.textContent = "💾 Enregistrement…";
  const personnage = gamme === "personnage";
  const ligne = {
    id, nom: c.nom, gamme, region, epoque: c.epoque, rarete: c.rarete, statut: "brouillon",
    famille: (personnage && FAMILLES[c.famille] && c.famille) || null,
    religion: (personnage && c.religion) || null,
    dates: c.dates, lieu: c.lieu, description: c.description,
    nom_en: c.nom_en || null, dates_en: c.dates_en || null, lieu_en: c.lieu_en || null, description_en: c.description_en || null,
    en_savoir_plus: (personnage && c.en_savoir_plus) || null,
    en_savoir_plus_en: (personnage && c.en_savoir_plus_en) || null,
    en_savoir_plus_he: (personnage && c.en_savoir_plus_he) || null,
    image, ordre: Math.max(0, ...cartesEpoque(c.epoque).map(x => x.ordre)) + 1,
  };
  const { data, error } = await sb.from("cartes").insert(ligne).select();
  if (error || !data?.length) {
    if (image) await sb.storage.from(BUCKET).remove([cheminStockage(image)]);   // pas d'image orpheline
    throw new Error(`Enregistrement refusé : ${error?.message || "droits administrateur ?"}`);
  }
  cartes.push(data[0]);   // pour les numéros et identifiants des cartes suivantes
  statut.classList.add(noteImage ? "erreur" : "ok");
  statut.textContent = `✓ Brouillon créé${noteImage}${c.probleme ? ` ⚠️ ${c.probleme}` : ""}`;
}

async function creerCartesCochees() {
  if (agentEnCours) return;
  const choisies = [...$("#agent-liste").children].filter(li => li.querySelector("input").checked && !li.dataset.fait);
  if (!choisies.length) return etatAgent("Cochez au moins une idée.", true);
  const gamme = $("#agent-gamme").value, region = $("#agent-region").value;
  bloquerAgent(true);
  let reussies = 0;
  for (const [n, li] of choisies.entries()) {
    etatAgent(`Carte ${n + 1} sur ${choisies.length}… (environ 1 minute chacune, gardez cette page ouverte)`);
    const statut = li.querySelector(".agent-statut");
    try {
      await creerCarteAgent(agentIdees[li.dataset.index], gamme, region, statut);
      li.dataset.fait = "1";
      li.querySelector("input").disabled = true;
      reussies++;
    } catch (err) {
      statut.className = "agent-statut erreur";
      statut.textContent = `✗ ${err.message}`;
    }
  }
  bloquerAgent(false);
  etatAgent(`${reussies} brouillon${reussies > 1 ? "s" : ""} créé${reussies > 1 ? "s" : ""} sur ${choisies.length}. Retrouvez-les dans la liste avec le filtre « Brouillons » pour les relire et les valider.`);
}

// ---------- Pyramide des raretés ----------
// Combien de cartes à chaque rareté (de Mythique en haut à Ordinaire en bas), selon les filtres,
// et le détail par région : pour voir où il manque des cartes.

const RARETES_PYRAMIDE = Object.keys(RARETES).sort((a, b) => RARETES[b].ordre - RARETES[a].ordre);   // mythique → ordinaire

function cartesPyramide({ sansRegion = false } = {}) {
  const region = $("#pyramide-region").value, epoque = $("#pyramide-epoque").value;
  const gamme = $("#pyramide-gamme").value, statut = $("#pyramide-statut").value;
  return cartes.filter(c =>
    (sansRegion || !region || dansRegion(c, region)) && (!epoque || c.epoque === epoque) &&
    (!gamme || c.gamme === gamme) && (!statut || (c.statut ?? "validee") === statut));
}

// Partage « total » proportionnellement aux poids, en nombres entiers dont la somme fait exactement « total »
// (les cartes restantes après l'arrondi vont aux étages qui ont perdu le plus à l'arrondi).
function repartirTotal(total, poids) {
  const somme = poids.reduce((s, p) => s + p, 0);
  const exacts = poids.map(p => (total * p) / somme);
  const parts = exacts.map(Math.floor);
  const ordre = exacts.map((x, i) => [x - parts[i], i]).sort((a, b) => b[0] - a[0]);
  const reste = total - parts.reduce((s, n) => s + n, 0);
  for (let k = 0; k < reste; k++) parts[ordre[k][1]]++;
  return parts;
}

function afficherPyramide() {
  for (const v of ["#vue-liste", "#vue-formulaire", "#vue-familles", "#vue-agent", "#vue-succes"]) $(v).hidden = true;
  $("#vue-pyramide").hidden = false;

  const liste = cartesPyramide();
  const total = liste.length;
  const brouillons = $("#pyramide-statut").value === "validee"
    ? cartes.filter(c => c.statut === "brouillon") : [];
  // Objectif : chaque étage contient « facteur » fois plus de cartes que celui du dessus.
  // Le sommet est calculé à partir des Mythiques ET des Légendaires (le plus grand des deux),
  // pour que les deux étages du haut soient respectés ; on en déduit les étages du dessous.
  const facteur = Math.max(1.1, Math.min(4, Number($("#pyramide-facteur").value) || 1.6));
  const nb = r => liste.filter(c => c.rarete === r).length;
  // Nombre de cartes visé (facultatif) : on répartit exactement ce total entre les étages,
  // sinon on part des Mythiques et Légendaires déjà là.
  const vise = Math.round(Number($("#pyramide-total").value)) || 0;
  const poids = RARETES_PYRAMIDE.map((_, i) => facteur ** i);
  const sommet = vise > 0 ? vise / poids.reduce((s, p) => s + p, 0) : Math.max(nb("mythique"), nb("legendaire") / facteur);
  const objectifs = vise > 0 ? repartirTotal(vise, poids) : poids.map(p => Math.round(sommet * p));
  const objectif = i => objectifs[i];
  const totalObjectif = objectifs.reduce((s, n) => s + n, 0);
  $("#pyramide").innerHTML = RARETES_PYRAMIDE.map((r, i) => {
    const n = nb(r);
    const ecart = n - objectif(i);
    const lignObjectif = !sommet ? "" : `<span class="etage-objectif">Objectif ≈ ${objectif(i)} · ${
      ecart < 0 ? `<b class="manque">il en manque ${-ecart}</b>` : ecart > 0 ? `${ecart} en plus` : "✓ juste"}</span>`;
    const enAttente = brouillons.filter(c => c.rarete === r && (!$("#pyramide-region").value || dansRegion(c, $("#pyramide-region").value))
      && (!$("#pyramide-epoque").value || c.epoque === $("#pyramide-epoque").value)
      && (!$("#pyramide-gamme").value || c.gamme === $("#pyramide-gamme").value)).length;
    const largeur = 28 + (72 * i) / (RARETES_PYRAMIDE.length - 1);
    const pourcent = total ? Math.round((n / total) * 100) : 0;
    return `<div class="etage rarete-${r}" style="width:${largeur}%">
      <span class="etage-nom">${RARETES[r].nom}</span>
      <span class="etage-nombre">${n} carte${n > 1 ? "s" : ""} · ${pourcent} %${enAttente ? ` <em>(+${enAttente} brouillon${enAttente > 1 ? "s" : ""})</em>` : ""}</span>
      ${lignObjectif}
    </div>`;
  }).join("") + `<p class="pyramide-total">${total} carte${total > 1 ? "s" : ""} au total${
    vise > 0 ? ` · objectif : ${totalObjectif} cartes (encore ${Math.max(0, totalObjectif - total)} à créer)`
      : sommet ? ` · objectif ≈ ${totalObjectif} cartes pour une pyramide équilibrée` : ""}</p>`;

  // Tableau par région : une ligne par région, une colonne par rareté.
  const toutes = cartesPyramide({ sansRegion: true });
  const ligne = (nom, cartesLigne, classe = "") => `<tr class="${classe}"><th>${nom}</th>${RARETES_PYRAMIDE.map(r => {
    const n = cartesLigne.filter(c => c.rarete === r).length;
    return `<td class="${n ? "" : "zero"}">${n}</td>`;
  }).join("")}<td class="total">${cartesLigne.length}</td></tr>`;
  $("#repartition").innerHTML = `<thead><tr><th></th>${RARETES_PYRAMIDE.map(r => `<th>${RARETES[r].nom}</th>`).join("")}<th>Total</th></tr></thead>
    <tbody>${Object.entries(REGIONS).map(([cle, nom]) => ligne(nom, toutes.filter(c => dansRegion(c, cle)),
      cle === $("#pyramide-region").value ? "choisie" : "")).join("")}${ligne("Total", toutes, "ligne-total")}</tbody>`;
}

$("#bouton-pyramide").addEventListener("click", afficherPyramide);
$("#pyramide-retour").addEventListener("click", afficherListe);
for (const id of ["#pyramide-region", "#pyramide-epoque", "#pyramide-gamme", "#pyramide-statut"]) $(id).addEventListener("change", afficherPyramide);
$("#pyramide-facteur").addEventListener("input", afficherPyramide);
$("#pyramide-total").addEventListener("input", afficherPyramide);

// Menu « Tester un booster » : se referme après un choix ou un clic ailleurs.
document.addEventListener("click", e => {
  const menu = $("#menu-demo");
  if (menu.open && (!menu.contains(e.target) || e.target.closest("a"))) menu.open = false;
});

$("#bouton-agent").addEventListener("click", afficherAgent);
$("#agent-retour").addEventListener("click", () => {
  if (agentEnCours) return notifier("L'agent travaille encore : attendez la fin.");
  $("#filtre-statut").value = "brouillon";
  afficherListe();
});
$("#agent-idees").addEventListener("click", () => chercherIdees(false));
$("#agent-autres").addEventListener("click", () => chercherIdees(true));
$("#agent-creer").addEventListener("click", creerCartesCochees);
addEventListener("beforeunload", e => { if (agentEnCours) e.preventDefault(); });

// ---------- Démarrage ----------

remplirSelect($("#filtre-rarete"), nomsRarete, true);
remplirSelect($("#filtre-gamme"), GAMMES, true);
remplirSelect($("#filtre-region"), REGIONS, true);
remplirSelect($("#filtre-epoque"), nomsEpoque, true);
remplirSelect(form.elements.gamme, GAMMES);
remplirSelect(form.elements.rarete, nomsRarete);
remplirSelect(form.elements.epoque, nomsEpoque);
remplirSelect(form.elements.region, REGIONS);
$("#cases-regions").innerHTML = Object.entries(REGIONS)
  .map(([cle, nom]) => `<label><input type="checkbox" value="${cle}"> ${nom}</label>`).join("");
remplirSelect($("#pyramide-region"), REGIONS, true);
remplirSelect($("#pyramide-epoque"), nomsEpoque, true);
remplirSelect($("#pyramide-gamme"), GAMMES, true);
remplirSelect($("#agent-region"), REGIONS, true);
$("#agent-region").value = "moyen-orient";
remplirSelect($("#agent-epoque"), nomsEpoque, true);

(async () => {
  const { data: { session } } = await sb.auth.getSession();
  if (session) await apresConnexion();
  else montrer("connexion");
})();
