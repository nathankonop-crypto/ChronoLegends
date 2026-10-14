// =============================================================
//  CHRONOLEGENDS — Vérification anti-robot (Cloudflare Turnstile)
//  Partagé par le jeu et l'administration. Le script de Cloudflare
//  n'est chargé que lorsqu'on en a besoin (création de compte,
//  connexion admin) : les joueurs déjà connectés ne le chargent pas.
//  La vérification du jeton est faite par Supabase, côté serveur.
// =============================================================

let promesseTurnstile = null;

function chargerTurnstile() {
  if (!promesseTurnstile) {
    promesseTurnstile = new Promise((resoudre, rejeter) => {
      const s = document.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      s.async = true;
      s.onload = () => resoudre(window.turnstile);
      s.onerror = () => { promesseTurnstile = null; rejeter(new Error("anti_robot_indisponible")); };
      document.head.appendChild(s);
    });
  }
  return promesseTurnstile;
}

// Affiche la vérification dans « conteneur » et renvoie un jeton (à usage unique).
// Sans clé configurée : renvoie undefined, aucune vérification.
async function jetonAntiRobot(conteneur) {
  if (!TURNSTILE_CLE_SITE) return undefined;
  const turnstile = await chargerTurnstile();
  conteneur.hidden = false;
  conteneur.innerHTML = "";
  return new Promise((resoudre, rejeter) => {
    turnstile.render(conteneur, {
      sitekey: TURNSTILE_CLE_SITE,
      language: "fr",
      theme: "dark",
      callback: jeton => { conteneur.hidden = true; resoudre(jeton); },
      "error-callback": () => rejeter(new Error("anti_robot_echec")),
      "timeout-callback": () => rejeter(new Error("anti_robot_echec")),
    });
  });
}
