// =============================================================
//  CHRONOLEGENDS — Partager une carte
//  Fabrique une image « affiche » de la carte (format 1080×1350,
//  idéal pour WhatsApp, Instagram…) puis ouvre le menu de partage
//  du téléphone. Sur ordinateur : l'image est téléchargée et le
//  texte copié.
//
//  L'image est préparée À L'AVANCE (dès que la carte s'affiche) :
//  l'iPhone n'autorise le menu de partage que juste après l'appui,
//  sans attente.
// =============================================================

const ADRESSE_SITE = "https://chronolegendsgames.com";

// Outil qui transforme un morceau de page en image, chargé seulement au premier partage.
let chargementOutil = null;
function chargerOutilImage() {
  chargementOutil ??= new Promise((ok, echec) => {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/dist/html-to-image.js";
    s.integrity = "sha384-UbfRVKN3/elS1r7JcK2FhmPP+KlJ4CvYwbyYD7tH+uTkbT9bNJr9eJeQ0FoFbAgz";
    s.crossOrigin = "anonymous";
    s.onload = () => ok(window.htmlToImage);
    s.onerror = () => { chargementOutil = null; echec(new Error("outil image indisponible")); };
    document.head.appendChild(s);
  });
  return chargementOutil;
}

// Les polices du jeu (Google Fonts), intégrées dans l'image : sinon elle
// s'afficherait dans une police par défaut. Seuls les alphabets latins
// sont gardés, avec l'hébreu (le reste alourdirait l'image pour rien). Fait une seule fois.
let policesIntegrees = null;

function enDataUrl(blob) {
  return new Promise((ok, echec) => {
    const lecteur = new FileReader();
    lecteur.onload = () => ok(lecteur.result);
    lecteur.onerror = echec;
    lecteur.readAsDataURL(blob);
  });
}

async function chargerPolices() {
  const lien = document.querySelector('link[href*="fonts.googleapis.com/css2"]');
  if (!lien) return "";
  const css = await (await fetch(lien.href)).text();
  const blocs = css.split(/(?=\/\* )/).filter(b => /^\/\* (latin|latin-ext|hebrew) \*\//.test(b));
  const resultats = await Promise.all(blocs.map(async bloc => {
    const adresse = bloc.match(/url\((https:[^)]+)\)/)?.[1];
    if (!adresse) return "";
    const donnees = await enDataUrl(await (await fetch(adresse)).blob());
    return bloc.replace(adresse, donnees);
  }));
  return resultats.join("\n");
}

async function fabriquerImage(carte) {
  const outil = await chargerOutilImage();

  // L'affiche est construite hors de l'écran, photographiée, puis retirée.
  const coulisse = document.createElement("div");
  coulisse.className = "coulisse-partage";
  coulisse.innerHTML = `
    <div class="affiche-partage rarete-${carte.rarete}" lang="${LANGUE}" dir="${LANGUE === "he" ? "rtl" : "ltr"}">
      <p class="affiche-titre">ChronoLegends</p>
      <p class="affiche-sous">${echapper(t("partageObtenu"))}</p>
      <div class="affiche-carte">${htmlCarte(carte)}</div>
      <p class="affiche-pied">${ADRESSE_SITE.replace("https://", "")}</p>
    </div>`;
  document.body.appendChild(coulisse);
  const affiche = coulisse.firstElementChild;

  try {
    await document.fonts.ready;
    const img = affiche.querySelector("img");
    if (img) { img.loading = "eager"; await img.decode().catch(() => {}); }
    policesIntegrees ??= await chargerPolices().catch(() => "");
    // Polices et illustration maintenant prêtes : on réajuste le texte juste avant la photo.
    affiche.querySelectorAll(".carte-corps").forEach(ajusterTexte);

    const options = { pixelRatio: 2, fontEmbedCSS: policesIntegrees, cacheBust: false };
    // Safari dessine parfois l'image vide la première fois : on lui fait faire un essai à blanc.
    if (/^((?!chrome|android).)*safari/i.test(navigator.userAgent)) await outil.toBlob(affiche, options);
    const blob = await outil.toBlob(affiche, options);
    const nomFichier = `chronolegends-${carte.id}.png`;
    return new File([blob], nomFichier, { type: "image/png" });
  } finally {
    coulisse.remove();
  }
}

// Une seule préparation par carte (gardée en mémoire tant que la page est ouverte).
const preparations = new Map();
function preparerPartage(carte) {
  const cle = `${LANGUE}:${carte.id}`;   // l'image contient du texte : une par langue
  if (!preparations.has(cle)) {
    const p = fabriquerImage(carte);
    p.catch(e => { console.warn("Partage : image impossible", e); preparations.delete(cle); });
    preparations.set(cle, p);
  }
  return preparations.get(cle);
}

async function partagerCarte(carte) {
  const texte = `${t("partageTexte", { nom: carte.nom, rarete: nomRarete(carte.rarete) })} ${ADRESSE_SITE}`;

  // L'image n'est pas encore prête : on prévient (l'attente peut empêcher le partage sur iPhone).
  let pret = false;
  const preparation = preparerPartage(carte);
  preparation.then(() => { pret = true; }, () => {});
  await Promise.resolve();
  if (!pret) notifier(t("partagePreparation"));

  let fichier = null;
  try { fichier = await preparation; } catch { /* on partagera au moins le texte */ }

  // 1. Téléphone : menu de partage avec l'image.
  if (fichier && navigator.canShare?.({ files: [fichier] })) {
    try {
      await navigator.share({ files: [fichier], text: texte });
      return;
    } catch (e) {
      if (e.name === "AbortError") return;                       // le joueur a fermé le menu
      if (e.name === "NotAllowedError") { notifier(t("partageReessayer")); return; }
    }
  }
  // 2. Pas d'image possible : partage du texte seul.
  if (!fichier && navigator.share) {
    try { await navigator.share({ text: texte }); return; }
    catch (e) { if (e.name === "AbortError") return; }
  }
  // 3. Ordinateur : on télécharge l'image et on copie le texte.
  if (fichier) {
    const lien = document.createElement("a");
    lien.href = URL.createObjectURL(fichier);
    lien.download = fichier.name;
    lien.click();
    setTimeout(() => URL.revokeObjectURL(lien.href), 10000);
  }
  try { await navigator.clipboard.writeText(texte); } catch { /* copie refusée : tant pis */ }
  notifier(t(fichier ? "partageTelecharge" : "partageCopie"));
}
