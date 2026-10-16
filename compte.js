// =============================================================
//  CHRONOLEGENDS — Compte avec e-mail et pseudo
//  Chaque joueur commence en invité (compte anonyme Supabase). Il peut :
//    • créer son compte : pseudo + e-mail, puis code reçu par e-mail.
//      C'est le MÊME compte (même user_id) : sa collection est gardée,
//      et le serveur lui offre un booster (supabase/18_comptes.sql) ;
//    • se connecter à un compte existant sur un autre appareil
//      (e-mail, puis code) ;
//    • changer de pseudo, se déconnecter.
//  Le code n'est demandé qu'une fois par appareil : ensuite la
//  connexion reste mémorisée.
//  Chargé APRÈS app.js (utilise sb, $, t, prefs, etat, notifier…).
// =============================================================

// Tant que l'envoi des e-mails n'est pas configuré et testé, les comptes ne sont visibles que
// sur l'appareil de l'administrateur (celui où l'admin est ouvert). Passer à true pour tout le monde.
const COMPTES_OUVERTS = false;
const compteVisible = COMPTES_OUVERTS || (() => { try { return !!localStorage.getItem("chronolegends-admin"); } catch { return false; } })();
$("#rubrique-compte").hidden = $("#bloc-compte").hidden = !compteVisible;

const compte = { invite: true, email: null, pseudo: null };
let etapeCompte = null;      // "creer" | "connexion" | "code" | "pseudo" | "deconnexion"
let codeEnvoye = null;       // { email, type: "email_change" | "email", pseudo }
let compteOccupe = false;

const EMAIL_VALIDE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// ---------- État du compte (après la connexion du joueur, app.js : demarrer) ----------

async function majCompte() {
  const { data: { user } } = await sb.auth.getUser();
  compte.invite = !user || user.is_anonymous || !user.email || !user.email_confirmed_at;
  compte.email = compte.invite ? null : user.email;
  compte.pseudo = null;
  if (!compte.invite) {
    const { data } = await sb.from("joueurs").select("pseudo").maybeSingle();
    compte.pseudo = data?.pseudo || null;
  }
  afficherBlocCompte();
}

// Rubrique « Mon compte » des Paramètres
function afficherBlocCompte() {
  const bloc = $("#bloc-compte");
  if (compte.invite) {
    bloc.innerHTML = `<p class="compte-etat">${echapper(t("compteInvite"))}</p>
      <button class="bouton bouton-or bouton-compte" data-compte="creer">${echapper(t("creerCompteBonus"))}</button>
      <button class="lien-reglages" data-compte="connexion">${echapper(t("dejaCompte"))}</button>`;
  } else {
    bloc.innerHTML = `<p class="compte-etat compte-connecte"><b>${echapper(compte.pseudo || "—")}</b><span>${echapper(compte.email)}</span></p>
      <button class="lien-reglages" data-compte="pseudo">${echapper(t(compte.pseudo ? "changerPseudo" : "choisirPseudo"))}</button>
      <button class="lien-reglages" data-compte="deconnexion">${echapper(t("seDeconnecter"))}</button>`;
  }
}

$("#bloc-compte").addEventListener("click", e => {
  const b = e.target.closest("[data-compte]");
  if (!b) return;
  basculerReglages(false);
  ouvrirCompte(b.dataset.compte);
});

// Après quelques boosters ouverts en invité, le jeu propose (une seule fois) de créer son compte.
function proposerCompte() {
  if (!compteVisible || !compte.invite || prefs.compteSuggere || (prefs.nbOuvertures || 0) < 3) return;
  prefs.compteSuggere = true;
  sauvegarderPrefs();
  setTimeout(() => ouvrirCompte("creer"), 900);
}

// ---------- La fenêtre ----------

function ouvrirCompte(etape) {
  etapeCompte = etape;
  $("#dialogue-compte").hidden = false;
  dessinerEtape();
}

function fermerCompte() {
  if (compteOccupe) return;
  $("#dialogue-compte").hidden = true;
  etapeCompte = null;
}

const champCompte = (nom, type, cle, attributs = "") =>
  `<label class="champ-compte"><span>${echapper(t(cle))}</span><input name="${nom}" type="${type}" ${attributs}></label>`;

function dessinerEtape() {
  const titres = { creer: "creerCompte", connexion: "connexionTitre", code: "codeTitre", pseudo: "choisirPseudo", deconnexion: "deconnexionTitre" };
  $("#titre-compte").textContent = t(titres[etapeCompte]);
  const f = $("#form-compte");
  const erreur = '<p class="erreur-compte" role="alert"></p>';
  if (etapeCompte === "creer") {
    f.innerHTML = `<p>${echapper(t("creerTexte"))}</p>
      ${champCompte("pseudo", "text", "pseudo", 'maxlength="20" autocomplete="nickname" required')}
      <small>${echapper(t("pseudoAide"))}</small>
      ${champCompte("email", "email", "email", 'autocomplete="email" inputmode="email" required')}
      ${erreur}
      <button class="bouton bouton-or" type="submit">${echapper(t("recevoirCode"))}</button>
      <button class="lien-reglages" type="button" data-aller="connexion">${echapper(t("dejaCompte"))}</button>`;
  } else if (etapeCompte === "connexion") {
    const avertir = compte.invite && Object.keys(etat.collection).length > 0;
    f.innerHTML = `<p>${echapper(t("connexionTexte"))}</p>
      ${avertir ? `<p class="avertissement-compte">${echapper(t("connexionAttention"))}</p>` : ""}
      ${champCompte("email", "email", "email", 'autocomplete="email" inputmode="email" required')}
      <div class="anti-robot" id="anti-robot-compte" hidden></div>
      ${erreur}
      <button class="bouton bouton-or" type="submit">${echapper(t("recevoirCode"))}</button>
      ${compte.invite ? `<button class="lien-reglages" type="button" data-aller="creer">${echapper(t("creerCompte"))}</button>` : ""}`;
  } else if (etapeCompte === "code") {
    f.innerHTML = `<p>${echapper(t("codeTexte", { email: codeEnvoye.email }))}</p>
      ${champCompte("code", "text", "code", 'inputmode="numeric" autocomplete="one-time-code" maxlength="10" required class="champ-code"')}
      ${erreur}
      <button class="bouton bouton-or" type="submit">${echapper(t("valider"))}</button>
      <button class="lien-reglages" type="button" data-aller="renvoyer">${echapper(t("renvoyerCode"))}</button>
      <button class="lien-reglages" type="button" data-aller="${codeEnvoye.type === "email" ? "connexion" : "creer"}">${echapper(t("changerEmail"))}</button>`;
  } else if (etapeCompte === "pseudo") {
    f.innerHTML = `${champCompte("pseudo", "text", "pseudo", 'maxlength="20" autocomplete="nickname" required')}
      <small>${echapper(t("pseudoAide"))}</small>
      ${erreur}
      <button class="bouton bouton-or" type="submit">${echapper(t("valider"))}</button>`;
    f.elements.pseudo.value = compte.pseudo || codeEnvoye?.pseudo || "";
  } else if (etapeCompte === "deconnexion") {
    f.innerHTML = `<p>${echapper(t("deconnexionTexte"))}</p>
      ${erreur}
      <button class="bouton" type="submit">${echapper(t("seDeconnecter"))}</button>
      <button class="lien-reglages" type="button" data-aller="fermer">${echapper(t("annuler"))}</button>`;
  }
  // Garde ce que le joueur avait déjà tapé quand il revient en arrière.
  if (codeEnvoye && f.elements.email && !f.elements.email.value) f.elements.email.value = codeEnvoye.email;
  if (codeEnvoye && f.elements.pseudo && !f.elements.pseudo.value) f.elements.pseudo.value = codeEnvoye.pseudo || "";
  f.querySelector("input")?.focus();
}

function erreurCompte(cle) {
  const p = $("#form-compte .erreur-compte");
  if (p) p.textContent = cle ? t(cle) : "";
}

// Message d'erreur Supabase → texte pour le joueur.
function cleErreur(error) {
  const code = error?.code || "", message = error?.message || "";
  if (error?.status === 429 || /rate.?limit|too many|security purposes/i.test(code + message)) return "errTropVite";
  if (/email_exists|already.*registered|already been registered/i.test(code + message)) return "errEmailPris";
  if (/otp_expired|invalid.*otp|token.*(expired|invalid)/i.test(code + message)) return "errCode";
  if (/otp_disabled|signups? not allowed|user.*not.*found/i.test(code + message)) return "errInconnu";
  if (/email_address_invalid|invalid.*email/i.test(code + message)) return "errEmail";
  if (/pseudo_pris/.test(message)) return "errPseudoPris";
  if (/pseudo_invalide/.test(message)) return "errPseudoInvalide";
  if (/captcha|anti_robot/i.test(code + message)) return "errAntiRobot";
  return "errCompte";
}

// Envoi du code : création de compte (changement d'e-mail du compte invité) ou connexion.
async function envoyerCode(type, email, pseudo) {
  if (type === "email_change") {
    const { error } = await sb.auth.updateUser({ email, data: { langue: LANGUE, pseudo } });
    if (error) throw error;
  } else {
    const captchaToken = await jetonAntiRobot($("#anti-robot-compte") || document.createElement("div"));
    const { error } = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: false, captchaToken } });
    if (error) throw error;
  }
  codeEnvoye = { email, type, pseudo };
}

async function validerEtape() {
  const f = $("#form-compte");
  erreurCompte(null);

  if (etapeCompte === "creer") {
    const pseudo = f.elements.pseudo.value.trim().replace(/\s+/g, " ");
    const email = f.elements.email.value.trim().toLowerCase();
    if (pseudo.length < 3) return erreurCompte("errPseudoInvalide");
    if (!EMAIL_VALIDE.test(email)) return erreurCompte("errEmail");
    const { data: dispo, error } = await sb.rpc("pseudo_disponible", { p: pseudo });
    if (error) throw error;
    if (dispo !== "ok") return erreurCompte(dispo === "pris" ? "errPseudoPris" : "errPseudoInvalide");
    await envoyerCode("email_change", email, pseudo);
    return ouvrirCompte("code");
  }

  if (etapeCompte === "connexion") {
    const email = f.elements.email.value.trim().toLowerCase();
    if (!EMAIL_VALIDE.test(email)) return erreurCompte("errEmail");
    await envoyerCode("email", email, null);
    return ouvrirCompte("code");
  }

  if (etapeCompte === "code") {
    const token = f.elements.code.value.replace(/\D/g, "");
    if (token.length < 6) return erreurCompte("errCode");
    const { error } = await sb.auth.verifyOtp({ email: codeEnvoye.email, token, type: codeEnvoye.type });
    if (error) throw error;

    if (codeEnvoye.type === "email") {
      // Connexion à un compte existant : on recharge tout le jeu avec ce compte.
      prefs.compteSuggere = true;
      sauvegarderPrefs();
      notifier(t("connecte"));
      setTimeout(() => location.reload(), 700);
      return;
    }
    // Création : le pseudo, puis le booster offert (le serveur ne le donne qu'une fois).
    let pseudoOk = true;
    const { error: e1 } = await sb.rpc("choisir_pseudo", { p: codeEnvoye.pseudo });
    if (e1) pseudoOk = false;
    const { data: bonus } = await sb.rpc("recompense_compte");
    if (bonus) { etat.boosters = bonus.boosters; majConsigne(); }
    await majCompte();
    if (!pseudoOk) {
      // Pseudo pris entre-temps : le compte est créé, il en choisit un autre.
      ouvrirCompte("pseudo");
      return erreurCompte("errPseudoPris");
    }
    fermerCompteForce();
    notifier(t("compteCree", { pseudo: compte.pseudo, n: bonus?.offerts || 0 }));
    vibrer?.([20, 40, 30]);
    return;
  }

  if (etapeCompte === "pseudo") {
    const pseudo = f.elements.pseudo.value.trim().replace(/\s+/g, " ");
    const { error } = await sb.rpc("choisir_pseudo", { p: pseudo });
    if (error) throw error;
    await majCompte();
    fermerCompteForce();
    notifier(t("pseudoChange"));
    return;
  }

  if (etapeCompte === "deconnexion") {
    await sb.auth.signOut();
    location.reload();   // le jeu repart avec un nouveau compte invité
  }
}

function fermerCompteForce() {
  compteOccupe = false;
  fermerCompte();
}

$("#form-compte").addEventListener("submit", async e => {
  e.preventDefault();
  if (compteOccupe) return;
  compteOccupe = true;
  const bouton = $("#form-compte [type=submit]");
  bouton.disabled = true;
  try {
    await validerEtape();
  } catch (err) {
    console.error(err);
    erreurCompte(cleErreur(err));
  } finally {
    compteOccupe = false;
    const b = $("#form-compte [type=submit]");
    if (b) b.disabled = false;
  }
});

$("#form-compte").addEventListener("click", async e => {
  const aller = e.target.closest("[data-aller]")?.dataset.aller;
  if (!aller || compteOccupe) return;
  if (aller === "fermer") return fermerCompte();
  if (aller !== "renvoyer") return ouvrirCompte(aller);
  // Renvoyer le même code (même e-mail, même type).
  compteOccupe = true;
  try {
    await envoyerCode(codeEnvoye.type, codeEnvoye.email, codeEnvoye.pseudo);
    notifier(t("codeRenvoye"));
  } catch (err) {
    erreurCompte(cleErreur(err));
  } finally {
    compteOccupe = false;
  }
});

$("#fermer-compte").addEventListener("click", fermerCompte);
$("#dialogue-compte").addEventListener("click", e => { if (e.target.id === "dialogue-compte") fermerCompte(); });
document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("#dialogue-compte").hidden) fermerCompte(); });
