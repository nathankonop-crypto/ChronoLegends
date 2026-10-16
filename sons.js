// =============================================================
//  CHRONOLEGENDS — Sons discrets
//  Fabriqués par le navigateur (Web Audio) : aucun fichier à
//  télécharger. La découpe du paquet, le retournement d'une carte,
//  et une petite fanfare pour les cartes exceptionnelles, de plus
//  en plus grande : Épique < Légendaire / Émeraude < Mythique / Diamant.
//  Désactivables dans les Paramètres (préférence « sons »).
// =============================================================

let contexteAudio = null;
let sortieAudio = null;    // tout passe par ici : volume général + écho (réverbération)
const VOLUME = 0.5;        // volume général (un compresseur évite que ça sature)

// Le navigateur n'autorise le son qu'après un geste du joueur :
// tous les sons sont déclenchés par un appui, c'est donc le cas.
function audio() {
  if (!contexteAudio) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    contexteAudio = new C();
    preparerSortie(contexteAudio);
  }
  if (contexteAudio.state === "suspended") contexteAudio.resume();
  return contexteAudio;
}

// Sortie : son direct + écho d'une grande salle, puis compresseur et volume.
function preparerSortie(ctx) {
  const compresseur = ctx.createDynamicsCompressor();
  compresseur.threshold.value = -14;
  compresseur.ratio.value = 4;
  const volume = ctx.createGain();
  volume.gain.value = VOLUME;
  compresseur.connect(volume).connect(ctx.destination);

  // Écho fabriqué : un bruit qui s'éteint en 2,5 s, comme dans une salle voûtée.
  const duree = 2.5, n = Math.ceil(ctx.sampleRate * duree);
  const impulsion = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let canal = 0; canal < 2; canal++) {
    const d = impulsion.getChannelData(canal);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
  }
  const echo = ctx.createConvolver();
  echo.buffer = impulsion;
  const dosageEcho = ctx.createGain();
  dosageEcho.gain.value = 0.35;

  sortieAudio = ctx.createGain();
  sortieAudio.connect(compresseur);
  sortieAudio.connect(echo).connect(dosageEcho).connect(compresseur);
}

// Enveloppe : monte vite, puis s'éteint doucement.
function enveloppe(ctx, debut, duree, volume, attaque = 0.01) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, debut);
  g.gain.exponentialRampToValueAtTime(volume, debut + attaque);
  g.gain.exponentialRampToValueAtTime(0.0001, debut + duree);
  g.connect(sortieAudio);
  return g;
}

// Bruit filtré qui glisse d'une fréquence à l'autre (découpe, souffle, « whoosh »).
function bruit(ctx, debut, duree, de, a, volume, q = 1, attaque = 0.03) {
  const n = Math.ceil(ctx.sampleRate * duree);
  const tampon = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = tampon.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  const source = ctx.createBufferSource();
  source.buffer = tampon;
  const filtre = ctx.createBiquadFilter();
  filtre.type = "bandpass";
  filtre.Q.value = q;
  filtre.frequency.setValueAtTime(de, debut);
  filtre.frequency.exponentialRampToValueAtTime(a, debut + duree);
  source.connect(filtre).connect(enveloppe(ctx, debut, duree, volume, attaque));
  source.start(debut);
  source.stop(debut + duree);
}

// Cloche : une note riche (plusieurs harmoniques qui s'éteignent à des vitesses différentes).
function cloche(ctx, debut, frequence, duree, volume) {
  [[1, 1], [2, 0.5], [3.01, 0.25], [4.17, 0.15], [5.43, 0.08]].forEach(([rapport, part], i) => {
    const osc = ctx.createOscillator();
    osc.frequency.value = frequence * rapport;
    osc.detune.value = (Math.random() - 0.5) * 6;
    osc.connect(enveloppe(ctx, debut, duree / (1 + i * 0.6), volume * part, 0.004));
    osc.start(debut);
    osc.stop(debut + duree);
  });
}

// Accord de « cuivres » doux qui enfle (dents de scie adoucies par un filtre).
function accord(ctx, debut, frequences, duree, volume) {
  for (const f of frequences) {
    for (const ecart of [-7, 7]) {   // deux voix légèrement désaccordées : son plus ample
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.value = f;
      osc.detune.value = ecart;
      const filtre = ctx.createBiquadFilter();
      filtre.type = "lowpass";
      filtre.frequency.setValueAtTime(400, debut);
      filtre.frequency.exponentialRampToValueAtTime(2800, debut + 0.25);
      filtre.frequency.exponentialRampToValueAtTime(900, debut + duree);
      osc.connect(filtre).connect(enveloppe(ctx, debut, duree, volume / frequences.length, 0.08));
      osc.start(debut);
      osc.stop(debut + duree);
    }
  }
}

// Coup sourd grave (le « boum » des cartes les plus rares).
function boum(ctx, debut, volume) {
  const osc = ctx.createOscillator();
  osc.frequency.setValueAtTime(140, debut);
  osc.frequency.exponentialRampToValueAtTime(42, debut + 0.5);
  osc.connect(enveloppe(ctx, debut, 0.7, volume, 0.005));
  osc.start(debut);
  osc.stop(debut + 0.7);
}

// Scintillements : petites notes aiguës au hasard, comme des étincelles.
function etincelles(ctx, debut, nombre, duree, volume) {
  const gamme = [2093, 2349, 2637, 3136, 3520, 4186];
  for (let i = 0; i < nombre; i++) {
    const t = debut + Math.random() * duree;
    cloche(ctx, t, gamme[Math.floor(Math.random() * gamme.length)], 0.5, volume * (0.5 + Math.random() * 0.5));
  }
}

// Notes (Hz)
const DO4 = 262, MI4 = 330, SOL4 = 392, DO5 = 523, MI5 = 659, SOL5 = 784, SI5 = 988, DO6 = 1047, MI6 = 1319, SOL6 = 1568, DO7 = 2093;

const SONS = {
  // Le paquet est découpé : un « zip » de papier.
  decoupe(ctx, t) {
    bruit(ctx, t, 0.3, 1500, 4000, 0.5, 1.2);
    bruit(ctx, t + 0.04, 0.2, 4000, 7000, 0.18, 2);
  },
  // Une carte se retourne : un petit souffle de carton.
  retournement(ctx, t) {
    bruit(ctx, t, 0.14, 700, 1800, 0.35, 0.8, 0.01);
  },
  // Épique : « whoosh » qui monte, puis un « ta-daa ! » de cloches.
  epique(ctx, t) {
    bruit(ctx, t, 0.35, 400, 3000, 0.25, 1.5, 0.3);
    cloche(ctx, t + 0.3, SOL5, 0.6, 0.3);
    [DO6, MI6, SOL6].forEach(f => cloche(ctx, t + 0.45, f, 1.6, 0.22));
    accord(ctx, t + 0.45, [DO5, MI5, SOL5], 1.2, 0.12);
  },
  // Légendaire / Émeraude : montée, arpège de cloches, accord de cuivres et étincelles.
  legendaire(ctx, t) {
    bruit(ctx, t, 0.5, 300, 4000, 0.3, 1.5, 0.45);
    [DO5, MI5, SOL5, DO6, MI6].forEach((f, i) => cloche(ctx, t + 0.4 + i * 0.07, f, 1.4, 0.24));
    accord(ctx, t + 0.75, [DO4, SOL4, DO5, MI5], 2, 0.22);
    [DO6, MI6, SOL6].forEach(f => cloche(ctx, t + 0.75, f, 2.2, 0.16));
    etincelles(ctx, t + 0.9, 8, 1, 0.08);
  },
  // Mythique / Diamant : boum, grande montée, double arpège, accord éclatant et pluie d'étincelles.
  diamant(ctx, t) {
    bruit(ctx, t, 0.7, 200, 6000, 0.35, 1.8, 0.65);
    boum(ctx, t + 0.65, 0.6);
    [DO5, MI5, SOL5, DO6, MI6, SOL6, DO7].forEach((f, i) => cloche(ctx, t + 0.65 + i * 0.06, f, 1.6, 0.22));
    accord(ctx, t + 1.05, [DO4, SOL4, DO5, MI5, SI5], 2.8, 0.26);
    [DO6, MI6, SOL6, DO7].forEach(f => cloche(ctx, t + 1.05, f, 3, 0.15));
    etincelles(ctx, t + 1.1, 18, 1.8, 0.09);
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
