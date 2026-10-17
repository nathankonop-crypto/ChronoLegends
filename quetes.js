// =============================================================
//  CHRONOLEGENDS — Onglet « Quêtes » : Chronos, quêtes du jour, quiz,
//  boutique et succès. Tout est décidé et vérifié par le SERVEUR
//  (supabase/24_quetes_succes.sql) : ce fichier ne fait qu'afficher
//  et transmettre les gestes du joueur.
//  Chargé après app.js (utilise sb, $, t, etat, notifier, vibrer, jouerSon…).
// =============================================================

const quetes = { donnees: null, succes: [], question: null, chargement: null, minuteur: null };

// Pièce de Chronos : or frappé de l'étoile-boussole du logo (style.css : .piece-chronos).
const pieceChronos = () => '<span class="piece-chronos" aria-hidden="true"></span>';

// Messages d'erreur du serveur → texte pour le joueur.
const ERREURS_QUETES = {
  pas_assez_de_chronos: "pasAssezChronosCourt",
  quiz_fini_pour_aujourdhui: "quizFini",
  aucune_carte: "quizAucuneCarte",
  deja_change: "changerDejaFait",
  pas_d_autre_quete: "changerImpossible",
};
const messageErreur = error => t(ERREURS_QUETES[Object.keys(ERREURS_QUETES).find(c => error.message.includes(c))] || "quetesErreur");

function nomQuete(q) {
  return t(`quete_${q.code}`, { epoque: nomEpoque(q.param) });
}

function nomSucces(s) {
  return (LANGUE === "en" && s.nom_en) || (LANGUE === "he" && (s.nom_he || s.nom_en)) || s.nom;
}

// ---------- Chargement ----------
async function chargerQuetes() {
  if (quetes.chargement) return quetes.chargement;
  quetes.chargement = (async () => {
    const fuseau = Intl.DateTimeFormat().resolvedOptions().timeZone || null;
    const [q, s] = await Promise.all([
      sb.rpc("mes_quetes", { p_fuseau: fuseau }),
      sb.rpc("mes_succes"),
    ]);
    if (q.error) throw q.error;
    quetes.donnees = q.data;
    quetes.succes = s.error ? [] : s.data || [];
    majPointQuetes();
  })();
  try { await quetes.chargement; } finally { quetes.chargement = null; }
}

// Point rouge sur l'onglet : une quête ou un succès à récupérer.
function majPointQuetes() {
  const d = quetes.donnees;
  const aRecuperer = (d?.quetes || []).some(q => q.progres >= q.objectif && !q.recuperee)
    || quetes.succes.some(s => s.obtenu && !s.recupere);
  $("#point-quetes").hidden = !aRecuperer;
}

// ---------- Affichage ----------
async function afficherQuetes() {
  try {
    await chargerQuetes();
  } catch (err) {
    $("#quetes-contenu").hidden = true;
    $("#quetes-indispo").hidden = false;
    return;
  }
  $("#quetes-contenu").hidden = false;
  $("#quetes-indispo").hidden = true;
  dessinerQuetes();
  dessinerSucces();
  majMinuteurQuetes();
  clearInterval(quetes.minuteur);
  quetes.minuteur = setInterval(() => {
    if ($("#vue-quetes").hidden) return clearInterval(quetes.minuteur);
    // Minuit chez le joueur : de nouvelles quêtes.
    if (quetes.donnees && Date.now() >= new Date(quetes.donnees.fin_du_jour).getTime()) return afficherQuetes();
    majMinuteurQuetes();
  }, 30000);
}

function majSolde(chronos, anime = false) {
  const el = $("#solde-chronos");
  const avant = Number(el.textContent) || 0;
  if (!anime || chronos <= avant) { el.textContent = chronos; return; }
  // Le solde « compte » jusqu'au nouveau montant.
  const debut = performance.now(), duree = 700;
  const pas = now => {
    const p = Math.min(1, (now - debut) / duree);
    el.textContent = Math.round(avant + (chronos - avant) * (1 - (1 - p) ** 3));
    if (p < 1) requestAnimationFrame(pas);
  };
  requestAnimationFrame(pas);
  $("#solde").classList.remove("gagne");
  void $("#solde").offsetWidth;
  $("#solde").classList.add("gagne");
}

function majMinuteurQuetes() {
  const d = quetes.donnees;
  if (!d) return;
  const reste = Math.max(0, new Date(d.fin_du_jour).getTime() - Date.now());
  const h = Math.floor(reste / 3600000), m = Math.floor((reste % 3600000) / 60000);
  $("#quetes-renouvellement").textContent = t("nouvellesQuetesDans", { temps: t("dureeHM", { h, m }) });
}

function dessinerQuetes() {
  const d = quetes.donnees;
  majSolde(d.chronos);
  $("#liste-quetes").innerHTML = (d.quetes || []).map(q => {
    const finie = q.progres >= q.objectif;
    const action = q.recuperee
      ? `<span class="quete-faite">${t("recuperee")}</span>`
      : finie
        ? `<button class="bouton bouton-or quete-recuperer" data-rang="${q.rang}">${t("recuperer")}</button>`
        : d.changement_dispo
          ? `<button class="lien quete-changer" data-rang="${q.rang}">${t("changerQuete")}</button>`
          : "";
    return `<li class="quete${finie ? " finie" : ""}${q.recuperee ? " recuperee" : ""}">
      <div class="quete-texte">
        <span class="quete-nom">${echapper(nomQuete(q))}</span>
        <span class="quete-barre"><span style="width:${Math.round((q.progres / q.objectif) * 100)}%"></span></span>
        <span class="quete-progres">${q.progres}/${q.objectif}</span>
      </div>
      <span class="quete-gain">+${q.chronos} ${pieceChronos()}</span>
      ${action}
    </li>`;
  }).join("");
  $("#bonus-quetes").innerHTML = d.bonus_recupere
    ? t("bonusRecupere")
    : `${echapper(t("bonusQuetes", { n: d.bonus }))} ${pieceChronos()}`;
  $("#quetes-aide-changer").hidden = !d.changement_dispo;
  // Quiz et boutique
  $("#quiz-restants").textContent = t("quizAide", { n: d.quiz_restants });
  if (!quetes.question) $("#quiz-commencer").disabled = d.quiz_restants <= 0;
  $("#prix-booster").innerHTML = `${d.prix_booster} ${pieceChronos()}`;
  $("#acheter-booster").disabled = d.chronos < d.prix_booster;
  $("#manque-chronos").textContent = d.chronos < d.prix_booster ? t("pasAssezChronos", { n: d.prix_booster - d.chronos }) : "";
}

function dessinerSucces() {
  // À récupérer d'abord, puis les plus avancés, puis ceux déjà récupérés.
  const rang = s => (s.obtenu && !s.recupere ? 0 : s.recupere ? 2 : 1);
  const liste = [...quetes.succes].sort((a, b) => rang(a) - rang(b)
    || (b.progres / b.objectif) - (a.progres / a.objectif));
  const obtenus = quetes.succes.filter(s => s.obtenu).length;
  $("#succes-compte").textContent = t("succesAide", { n: obtenus, total: quetes.succes.length });
  $("#liste-succes").innerHTML = liste.map(s => `
    <li class="quete succes${s.obtenu ? " obtenu" : ""}${s.recupere ? " recupere" : ""}">
      <span class="succes-medaille" aria-hidden="true">${s.obtenu ? "★" : "☆"}</span>
      <div class="quete-texte">
        <span class="quete-nom">${echapper(nomSucces(s))}</span>
        ${s.obtenu ? "" : `<span class="quete-barre"><span style="width:${Math.round((s.progres / s.objectif) * 100)}%"></span></span>
        <span class="quete-progres">${s.progres}/${s.objectif}</span>`}
      </div>
      <span class="quete-gain">+${s.chronos} ${pieceChronos()}</span>
      ${s.obtenu && !s.recupere ? `<button class="bouton bouton-or succes-recuperer" data-id="${echapper(s.id)}">${t("recuperer")}</button>` : ""}
      ${s.recupere ? `<span class="quete-faite">✓</span>` : ""}
    </li>`).join("");
}

// ---------- Gestes du joueur ----------
async function recupererQuete(rang, bouton) {
  bouton.disabled = true;
  const { data, error } = await sb.rpc("recuperer_quete", { p_rang: rang });
  if (error) { bouton.disabled = false; return notifier(messageErreur(error)); }
  celebrerGain(data.gain + data.bonus, bouton);
  if (data.bonus) setTimeout(() => notifier(t("bonusGagne", { n: data.bonus })), 500);
  await rafraichirApresGain(data.chronos);
}

async function recupererSucces(id, bouton) {
  bouton.disabled = true;
  const { data, error } = await sb.rpc("recuperer_succes", { p_id: id });
  if (error) { bouton.disabled = false; return notifier(messageErreur(error)); }
  celebrerGain(data.gain, bouton);
  await rafraichirApresGain(data.chronos);
}

async function rafraichirApresGain(chronos) {
  majSolde(chronos, true);
  const avant = quetes.donnees;
  await chargerQuetes().catch(() => {});
  if (!quetes.donnees) quetes.donnees = avant;
  quetes.donnees.chronos = chronos;
  dessinerQuetes();
  dessinerSucces();
  majSolde(chronos);
}

// « +15 » qui s'envole du bouton vers le solde, son de pièce, petite vibration.
function celebrerGain(n, depuis) {
  jouerSon("piece");
  vibrer([12, 30, 18]);
  const r = depuis.getBoundingClientRect();
  const envol = document.createElement("span");
  envol.className = "envol-chronos";
  envol.innerHTML = `+${n} ${pieceChronos()}`;
  envol.style.left = `${r.left + r.width / 2}px`;
  envol.style.top = `${r.top}px`;
  document.body.appendChild(envol);
  envol.addEventListener("animationend", () => envol.remove());
}

async function changerQuete(rang, bouton) {
  bouton.disabled = true;
  const { data, error } = await sb.rpc("changer_quete", { p_rang: rang });
  if (error) { bouton.disabled = false; return notifier(messageErreur(error)); }
  jouerSon("retournement");
  quetes.donnees = data;
  dessinerQuetes();
}

async function acheterBooster() {
  const bouton = $("#acheter-booster");
  bouton.disabled = true;
  const { data, error } = await sb.rpc("acheter_booster");
  if (error) { bouton.disabled = false; return notifier(messageErreur(error)); }
  jouerSon("piece");
  vibrer(25);
  etat.boosters = data.boosters;
  majCompteur();
  majConsigne();
  quetes.donnees.chronos = data.chronos;
  majSolde(data.chronos);
  dessinerQuetes();
  notifier(t("boosterAchete"));
}

// ---------- Quiz d'histoire ----------
function texteChoix(type, choix) {
  if (type === "region") return nomRegion(choix);
  if (type === "epoque") return nomEpoque(choix);
  return CARTES.find(c => c.id === choix)?.nom || choix;
}

async function poserQuestion() {
  const bouton = $("#quiz-commencer");
  bouton.disabled = true;
  const { data, error } = await sb.rpc("quiz_question");
  if (error) { bouton.disabled = false; return notifier(messageErreur(error)); }
  // Carte pas encore chargée (ajoutée depuis l'admin) : on recharge les cartes.
  if (!CARTES.find(c => c.id === data.carte)) await chargerCartes();
  quetes.question = data;
  const carte = CARTES.find(c => c.id === data.carte);
  const nom = carte?.nom || data.carte;
  $("#quiz-question").textContent = data.type === "region" ? t("quizRegion", { nom })
    : data.type === "epoque" ? t("quizEpoque", { nom })
    : t("quizDates", { dates: carte?.dates || "" });
  $("#quiz-choix").innerHTML = data.choix.map(c =>
    `<button class="bouton quiz-reponse" data-choix="${echapper(c)}">${echapper(texteChoix(data.type, c))}</button>`).join("");
  $("#quiz-resultat").textContent = "";
  $("#quiz-resultat").className = "quiz-resultat";
  $("#quiz-zone").hidden = false;
  bouton.hidden = true;
}

async function repondreQuestion(bouton) {
  const q = quetes.question;
  if (!q) return;
  document.querySelectorAll(".quiz-reponse").forEach(b => { b.disabled = true; });
  const { data, error } = await sb.rpc("quiz_repondre", { p_choix: bouton.dataset.choix });
  if (error) { notifier(messageErreur(error)); return finirQuestion(); }
  document.querySelectorAll(".quiz-reponse").forEach(b => {
    b.classList.toggle("juste", b.dataset.choix === data.reponse);
    b.classList.toggle("faux", b === bouton && !data.juste);
  });
  const resultat = $("#quiz-resultat");
  resultat.textContent = data.juste ? t("quizJuste") : t("quizFaux", { r: texteChoix(q.type, data.reponse) });
  resultat.className = `quiz-resultat ${data.juste ? "juste" : "faux"}`;
  jouerSon(data.juste ? "bonneReponse" : "mauvaiseReponse");
  vibrer(data.juste ? [15, 40, 15] : 40);
  quetes.question = null;
  await chargerQuetes().catch(() => {});
  if (quetes.donnees) { dessinerQuetes(); dessinerSucces(); }
  finirQuestion();
}

function finirQuestion() {
  quetes.question = null;
  const bouton = $("#quiz-commencer");
  bouton.hidden = false;
  bouton.textContent = t("quizSuivante");
  bouton.disabled = (quetes.donnees?.quiz_restants ?? 1) <= 0;
}

// ---------- Branchements ----------
$("#liste-quetes").addEventListener("click", e => {
  const r = e.target.closest(".quete-recuperer"), c = e.target.closest(".quete-changer");
  if (r) recupererQuete(Number(r.dataset.rang), r);
  if (c) changerQuete(Number(c.dataset.rang), c);
});
$("#liste-succes").addEventListener("click", e => {
  const r = e.target.closest(".succes-recuperer");
  if (r) recupererSucces(r.dataset.id, r);
});
$("#acheter-booster").addEventListener("click", acheterBooster);
$("#quiz-commencer").addEventListener("click", poserQuestion);
$("#quiz-choix").addEventListener("click", e => {
  const b = e.target.closest(".quiz-reponse");
  if (b && !b.disabled) repondreQuestion(b);
});

// Après chaque booster ouvert (app.js) : les quêtes ont pu avancer (point rouge).
function quetesApresOuverture() {
  chargerQuetes().catch(() => {});
}

// Au démarrage, dès que le jeu est prêt : le point rouge s'il y a quelque chose à récupérer.
(function attendreJeu() {
  if (typeof etatJeu !== "undefined" && etatJeu.pret && !etatJeu.erreur) return chargerQuetes().catch(() => {});
  setTimeout(attendreJeu, 1500);
})();
