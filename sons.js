// =============================================================
//  CHRONOLEGENDS — Sons discrets
//  Fabriqués par le navigateur (Web Audio) : aucun fichier à
//  télécharger. Trois sons : la découpe du paquet, le retournement
//  d'une carte, et un carillon pour les cartes exceptionnelles
//  (Légendaire, Mythique, Émeraude, Diamant).
//  Désactivables dans les Paramètres (préférence « sons »).
// =============================================================

let contexteAudio = null;
const VOLUME = 0.22;   // volume général, volontairement bas

// Le navigateur n'autorise le son qu'après un geste du joueur :
// tous les sons sont déclenchés par un appui, c'est donc le cas.
function audio() {
  if (!contexteAudio) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    contexteAudio = new C();
  }
  if (contexteAudio.state === "suspended") contexteAudio.resume();
  return contexteAudio;
}

// Bruit blanc filtré (froissement, découpe).
function bruit(ctx, debut, duree, frequence, volume, q = 1) {
  const n = Math.ceil(ctx.sampleRate * duree);
  const tampon = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = tampon.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  const source = ctx.createBufferSource();
  source.buffer = tampon;
  const filtre = ctx.createBiquadFilter();
  filtre.type = "bandpass";
  filtre.frequency.setValueAtTime(frequence, debut);
  filtre.frequency.exponentialRampToValueAtTime(frequence * 2.2, debut + duree);
  filtre.Q.value = q;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, debut);
  gain.gain.exponentialRampToValueAtTime(volume * VOLUME, debut + duree * 0.15);
  gain.gain.exponentialRampToValueAtTime(0.0001, debut + duree);
  source.connect(filtre).connect(gain).connect(ctx.destination);
  source.start(debut);
  source.stop(debut + duree);
}

// Note douce (sinusoïde qui s'éteint lentement, comme une clochette).
function note(ctx, debut, frequence, duree, volume, type = "sine") {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.value = frequence;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, debut);
  gain.gain.exponentialRampToValueAtTime(volume * VOLUME, debut + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, debut + duree);
  osc.connect(gain).connect(ctx.destination);
  osc.start(debut);
  osc.stop(debut + duree);
}

const SONS = {
  // Le paquet est découpé : un « zip » de papier.
  decoupe(ctx, t) {
    bruit(ctx, t, 0.28, 1800, 0.9, 1.4);
    bruit(ctx, t + 0.05, 0.18, 3500, 0.4, 2);
  },
  // Une carte se retourne : un petit souffle de carton.
  retournement(ctx, t) {
    bruit(ctx, t, 0.12, 900, 0.7, 0.9);
    note(ctx, t + 0.02, 220, 0.08, 0.25, "triangle");
  },
  // Carte Épique : deux notes légères.
  epique(ctx, t) {
    [659, 988].forEach((f, i) => note(ctx, t + i * 0.09, f, 0.5, 0.35));
  },
  // Légendaire / Émeraude : petit carillon montant.
  legendaire(ctx, t) {
    [523, 659, 784, 1047].forEach((f, i) => note(ctx, t + i * 0.08, f, 0.9, 0.4));
  },
  // Mythique / Diamant : carillon plus long, avec des scintillements aigus.
  diamant(ctx, t) {
    [523, 659, 784, 1047, 1319].forEach((f, i) => note(ctx, t + i * 0.08, f, 1.3, 0.4));
    [2093, 2637, 3136, 2637].forEach((f, i) => note(ctx, t + 0.45 + i * 0.07, f, 0.6, 0.12));
  },
};

// jouerSon("decoupe") — ne fait rien si le joueur a coupé les sons.
function jouerSon(nom) {
  if (prefs.sons === false || !SONS[nom]) return;
  try {
    const ctx = audio();
    if (ctx) SONS[nom](ctx, ctx.currentTime + 0.01);
  } catch (e) { /* pas de son : le jeu marche quand même */ }
}
