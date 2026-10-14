// =============================================================
//  CHRONOLEGENDS — Page d'administration
//  La sécurité ne repose PAS sur cette page : c'est la base de
//  données (règles RLS) qui refuse toute écriture si l'utilisateur
//  connecté n'est pas dans la table « administrateurs ». Cacher
//  des boutons ici ne sert qu'au confort.
// =============================================================

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_CLE_PUBLIQUE);
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
function versCarte(l) {
  return { id: l.id, nom: l.nom, gamme: l.gamme, dates: l.dates, lieu: l.lieu, region: l.region,
    extension: l.epoque, rarete: l.rarete, finition: l.finition, texte: l.description, image: l.image };
}

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
  const { error } = await sb.auth.signInWithPassword({
    email: $("#email").value.trim(),
    password: $("#mot-de-passe").value,
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
  const { data, error } = await sb.from("cartes").select("*").order("epoque").order("ordre");
  if (error) { notifier(`Erreur de chargement : ${error.message}`); return; }
  cartes = data;
}

function afficherListe() {
  $("#vue-liste").hidden = false;
  $("#vue-formulaire").hidden = true;

  const texte = $("#recherche").value.trim().toLowerCase();
  const filtres = { rarete: $("#filtre-rarete").value, gamme: $("#filtre-gamme").value,
    region: $("#filtre-region").value, epoque: $("#filtre-epoque").value };

  const visibles = cartes.filter(c =>
    Object.entries(filtres).every(([champ, v]) => !v || c[champ] === v) &&
    (!texte || [c.nom, c.lieu, c.dates, c.id].join(" ").toLowerCase().includes(texte)));

  $("#nb-cartes").textContent = visibles.length === cartes.length
    ? `(${cartes.length})` : `(${visibles.length} sur ${cartes.length})`;
  $("#aucun-resultat").hidden = visibles.length > 0;

  const tbody = $("#lignes");
  tbody.innerHTML = "";
  for (const c of visibles) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="vignette">${c.image ? `<img src="${echapper(c.image)}" alt="" loading="lazy">` : `<span>${echapper(initiales(c.nom))}</span>`}</td>
      <td class="col-nom">${echapper(c.nom)}</td>
      <td>${numeroDe(c)}</td>
      <td>${EXTENSIONS[c.epoque].nom}</td>
      <td><span class="pastille rarete-${c.rarete}">${RARETES[c.rarete].nom}</span></td>
      <td>${GAMMES[c.gamme]}</td>
      <td>${REGIONS[c.region]}</td>
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

for (const id of ["#recherche", "#filtre-rarete", "#filtre-gamme", "#filtre-region", "#filtre-epoque"]) {
  $(id).addEventListener("input", afficherListe);
}

// ---------- Formulaire ----------

function ouvrirFormulaire(ligne) {
  carteEditee = ligne || null;
  nouvelleImage && URL.revokeObjectURL(nouvelleImage.url);
  nouvelleImage = null;
  imageRetiree = false;
  idModifieALaMain = false;
  form.reset();
  $("#erreur-carte").textContent = "";
  $("#fichier-image").value = "";
  $("#info-image").textContent = "Recadrée automatiquement au centre en paysage 4:3, puis compressée (WebP 800×600).";

  const l = ligne || { nom: "", id: "", gamme: "personnage", rarete: "ordinaire", finition: "normale",
    epoque: "antiquite", region: "moyen-orient", dates: "", lieu: "", description: "" };
  for (const champ of ["nom", "id", "gamme", "rarete", "finition", "epoque", "region", "dates", "lieu", "description"]) {
    form.elements[champ].value = l[champ] ?? "";
  }
  form.elements.id.readOnly = !!ligne;
  $("#aide-id").textContent = ligne
    ? "L'identifiant ne peut plus changer : il relie la carte aux collections des joueurs."
    : "Créé à partir du nom. Il ne pourra plus changer une fois la carte créée.";
  $("#titre-formulaire").textContent = ligne ? `Modifier « ${ligne.nom} »` : "Nouvelle carte";
  $("#bouton-enregistrer").textContent = ligne ? "Enregistrer les modifications" : "Créer la carte";

  $("#vue-liste").hidden = true;
  $("#vue-formulaire").hidden = false;
  window.scrollTo(0, 0);
  majApercu();
  form.elements.nom.focus();
}

$("#bouton-nouvelle").addEventListener("click", () => ouvrirFormulaire(null));
$("#bouton-retour").addEventListener("click", afficherListe);

form.elements.nom.addEventListener("input", () => {
  if (!carteEditee && !idModifieALaMain) form.elements.id.value = versIdentifiant(form.elements.nom.value);
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
    finition: f.finition.value, epoque: f.epoque.value, region: f.region.value,
    dates: f.dates.value.trim(), lieu: f.lieu.value.trim(), description: f.description.value.trim(),
  };
}

function majApercu() {
  const v = valeursFormulaire();
  $("#compte-description").textContent = form.elements.description.value.length;
  $("#retirer-image").hidden = !imageActuelle();

  // Numéro tel qu'il apparaîtra : place actuelle, ou en fin d'époque pour une nouvelle carte.
  const autres = cartesEpoque(v.epoque).filter(c => c.id !== carteEditee?.id);
  const garde = carteEditee && carteEditee.epoque === v.epoque;
  const total = autres.length + 1;
  const n = garde ? cartesEpoque(v.epoque).findIndex(c => c.id === carteEditee.id) + 1 : total;
  const numero = `${String(n).padStart(String(total).length, "0")}/${total}`;

  const carte = versCarte({ ...v, nom: v.nom || "Nom de la carte", image: imageActuelle() });
  $("#apercu").innerHTML = rendreCarte(carte, numero);
  $("#apercu-note").textContent = v.finition !== "normale"
    ? `Finition « ${FINITIONS[v.finition]} » enregistrée, mais pas encore dessinée dans le jeu.` : "";
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

// ---------- Démarrage ----------

remplirSelect($("#filtre-rarete"), nomsRarete, true);
remplirSelect($("#filtre-gamme"), GAMMES, true);
remplirSelect($("#filtre-region"), REGIONS, true);
remplirSelect($("#filtre-epoque"), nomsEpoque, true);
remplirSelect(form.elements.gamme, GAMMES);
remplirSelect(form.elements.rarete, nomsRarete);
remplirSelect(form.elements.finition, FINITIONS);
remplirSelect(form.elements.epoque, nomsEpoque);
remplirSelect(form.elements.region, REGIONS);

(async () => {
  const { data: { session } } = await sb.auth.getSession();
  if (session) await apresConnexion();
  else montrer("connexion");
})();
