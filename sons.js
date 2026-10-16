// =============================================================
//  CHRONOLEGENDS — Sons et musique
//  • Bruitages fabriqués par le navigateur (Web Audio) : découpe du
//    paquet, retournement d'une carte.
//  • Jingle d'ouverture et fanfares des cartes rares : fichiers du
//    dossier sons/ (musiques Suno découpées) ; si un fichier manque,
//    la fanfare fabriquée ci-dessous le remplace.
//  • Musique d'ambiance : une par région (sons/ambiance-<région>.mp3),
//    en boucle (fondu, courte pause, reprise douce).
//  Préférences « sons » et « musique », séparées, dans les Paramètres.
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

// Cuivre : note de trompette (attaque « bwah » qui s'ouvre, léger vibrato).
function cuivre(ctx, debut, frequence, duree, volume) {
  const vibrato = ctx.createOscillator(), profondeur = ctx.createGain();
  vibrato.frequency.value = 5.5;
  profondeur.gain.setValueAtTime(0, debut);
  profondeur.gain.linearRampToValueAtTime(frequence * 0.006, debut + Math.min(duree, 0.4));
  vibrato.connect(profondeur);
  const filtre = ctx.createBiquadFilter();
  filtre.type = "lowpass";
  filtre.Q.value = 2;
  filtre.frequency.setValueAtTime(frequence * 1.2, debut);
  filtre.frequency.exponentialRampToValueAtTime(frequence * 6, debut + 0.06);
  filtre.frequency.exponentialRampToValueAtTime(frequence * 3, debut + duree);
  filtre.connect(enveloppe(ctx, debut, duree, volume, 0.025));
  for (const ecart of [-6, 6]) {
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = frequence;
    osc.detune.value = ecart;
    profondeur.connect(osc.frequency);
    osc.connect(filtre);
    osc.start(debut);
    osc.stop(debut + duree);
  }
  vibrato.start(debut);
  vibrato.stop(debut + duree);
}

// Montée de tension : bruit qui s'ouvre vers l'aigu + note qui glisse vers le haut en vibrant.
function montee(ctx, t, duree, force) {
  bruit(ctx, t, duree, 200, 6000, 0.35 * force, 1.4, duree * 0.95);
  const osc = ctx.createOscillator(), filtre = ctx.createBiquadFilter();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(110, t);
  osc.frequency.exponentialRampToValueAtTime(880, t + duree);
  const tremolo = ctx.createOscillator(), profondeur = ctx.createGain();
  tremolo.frequency.setValueAtTime(6, t);
  tremolo.frequency.linearRampToValueAtTime(18, t + duree);
  profondeur.gain.value = 25;
  tremolo.connect(profondeur).connect(osc.frequency);
  filtre.type = "lowpass";
  filtre.frequency.setValueAtTime(300, t);
  filtre.frequency.exponentialRampToValueAtTime(3500, t + duree);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.12 * force, t + duree * 0.95);
  g.gain.exponentialRampToValueAtTime(0.0001, t + duree + 0.05);
  osc.connect(filtre).connect(g).connect(sortieAudio);
  [osc, tremolo].forEach(o => { o.start(t); o.stop(t + duree + 0.1); });
}

// Notes (Hz)
const SOL3 = 196, DO4 = 262, MI4 = 330, SOL4 = 392, DO5 = 523, MI5 = 659, SOL5 = 784, SI5 = 988, DO6 = 1047, MI6 = 1319, SOL6 = 1568, DO7 = 2093;

const SONS = {
  // Ouverture du jeu : courte fanfare héroïque de trompettes et timbales (environ 3 s),
  // calée sur l'écran d'ouverture (la rose des vents arrive, puis le nom apparaît).
  ouverture(ctx, t) {
    // Roulement de timbales et cymbale qui enfle.
    [0, 0.08, 0.16, 0.24, 0.32].forEach((d, i) => boum(ctx, t + d, 0.18 + i * 0.05));
    bruit(ctx, t, 0.75, 3000, 9000, 0.12, 0.6, 0.7);
    // « Ta-ta-taaa… ta-ta-ta-TAAAA ! »
    const s = t + 0.45;
    [[SOL4, 0, 0.14], [SOL4, 0.16, 0.14], [DO5, 0.32, 0.5],
     [SOL4, 0.86, 0.12], [DO5, 1.0, 0.12], [MI5, 1.14, 0.12], [SOL5, 1.28, 1.6]]
      .forEach(([f, d, duree]) => cuivre(ctx, s + d, f, duree, 0.32));
    // Grand final : accord de cuivres, timbale, cloches et étincelles.
    cuivre(ctx, s + 1.28, MI5, 1.6, 0.2);
    cuivre(ctx, s + 1.28, DO5, 1.6, 0.2);
    cuivre(ctx, s + 1.28, SOL3, 1.6, 0.18);
    boum(ctx, s + 1.28, 0.7);
    bruit(ctx, s + 1.28, 1.4, 6000, 3000, 0.1, 0.5, 0.01);
    [DO6, MI6, SOL6, DO7].forEach((f, i) => cloche(ctx, s + 1.3 + i * 0.05, f, 2, 0.12));
    etincelles(ctx, s + 1.5, 10, 1.2, 0.07);
  },
  // Le paquet est découpé : un « zip » de papier.
  decoupe(ctx, t) {
    bruit(ctx, t, 0.3, 1500, 4000, 0.5, 1.2);
    bruit(ctx, t + 0.04, 0.2, 4000, 7000, 0.18, 2);
  },
  // Les cartes glissent hors du paquet : un frottement de carton qui monte, quelques
  // petits « tic » de cartes qui se frôlent, et un léger « toc » quand la pile est sortie.
  glissement(ctx, t) {
    bruit(ctx, t, 0.75, 500, 1500, 0.32, 0.9, 0.18);
    bruit(ctx, t + 0.05, 0.6, 2500, 4500, 0.08, 1.2, 0.2);
    [0.12, 0.24, 0.38, 0.5].forEach((d, i) => bruit(ctx, t + d, 0.035, 3200 + i * 300, 3800 + i * 300, 0.1, 2, 0.003));
    bruit(ctx, t + 0.78, 0.09, 260, 180, 0.3, 1, 0.005);
  },
  // Suspense avant une Légendaire : souffle qui monte et note qui grimpe en tremblant (1,1 s).
  suspense(ctx, t) { montee(ctx, t, 1.1, 1); },
  // Suspense avant une Mythique : plus long, avec des battements de cœur de plus en plus rapprochés (1,7 s).
  suspenseMythique(ctx, t) {
    montee(ctx, t, 1.7, 1.3);
    [0, 0.55, 0.95, 1.25, 1.48].forEach((d, i) => boum(ctx, t + d, 0.3 + i * 0.08));
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

// Musiques enregistrées (fichiers dans sons/) : elles remplacent le son fabriqué du même nom.
// Téléchargées dès le chargement de la page, pour partir sans délai au premier appui.
// Fichier absent : on garde le son fabriqué ci-dessus.
const FICHIERS_SONS = {
  ouverture: "sons/ouverture.mp3",
  epique: "sons/epique.mp3",
  legendaire: "sons/legendaire.mp3",   // aussi pour l'Émeraude
  diamant: "sons/mythique.mp3",        // Mythique et Diamant
  dore: "sons/dore.mp3",               // le prochain booster est doré
};
const fichiersCharges = {};
for (const [nom, chemin] of Object.entries(FICHIERS_SONS)) {
  fichiersCharges[nom] = fetch(chemin).then(r => (r.ok ? r.arrayBuffer() : null)).catch(() => null);
}

async function jouerFichier(ctx, nom) {
  const donnees = await fichiersCharges[nom];
  if (!donnees) return false;
  // decodeAudioData « consomme » les données : on décode une copie et on garde le résultat.
  if (!(donnees instanceof AudioBuffer)) {
    fichiersCharges[nom] = Promise.resolve(await ctx.decodeAudioData(donnees.slice(0)));
  }
  const source = ctx.createBufferSource();
  source.buffer = await fichiersCharges[nom];
  const volume = ctx.createGain();
  volume.gain.value = 0.9;
  source.connect(volume).connect(ctx.destination);   // sans l'écho : la musique a déjà le sien
  source.start();
  return true;
}

// jouerSon("decoupe") — ne fait rien si le joueur a coupé les sons.
async function jouerSon(nom) {
  if (prefs.sons === false || (!SONS[nom] && !FICHIERS_SONS[nom])) return;
  // Pas encore touché l'écran : le navigateur bloquerait le son (et le jouerait plus tard, au mauvais moment).
  if (!contexteAudio && navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
  if (FICHIERS_SONS[nom]) etoufferMusique(nom === "ouverture" ? 0 : 3.5);   // la musique s'efface derrière la fanfare
  try {
    const ctx = audio();
    if (!ctx) return;
    if (FICHIERS_SONS[nom] && await jouerFichier(ctx, nom)) return;
    SONS[nom]?.(ctx, ctx.currentTime + 0.01);
  } catch (e) { /* pas de son : le jeu marche quand même */ }
}

// ---------- Musique : ambiance de la région du joueur, ou musique d'ouverture des boosters ----------
const VOLUME_MUSIQUE = 0.3;   // en fond, sous les bruitages et les fanfares
// Ambiances (une par région, sons/ambiance-<région>.mp3) : lues en continu, elles finissent par un
// fondu, puis 1,5 s de silence avant de reprendre.
const PAUSE_AMBIANCE = 1500;
// Musiques d'ouverture des boosters : boucles continues, sans aucune pause. La boucle va de
// « debut » à « fin » (en secondes dans le fichier) : la fin retombe sur la même mesure que le
// début (découpage fait sur le tempo du morceau).
const BOUCLES = {
  booster: { fichier: "sons/booster.mp3", debut: 0.2, fin: 30.1741 },              // booster ordinaire : 14 mesures à 112 bpm
  "booster-dore": { fichier: "sons/booster-dore.mp3", debut: 0.2, fin: 38.095 },  // booster doré : 16 mesures à 101 bpm
};
// Téléchargées à l'avance (pour partir dès la découpe du paquet) ; absentes → l'ambiance continue.
const tamponsBoucles = {};
for (const [piste, b] of Object.entries(BOUCLES)) {
  tamponsBoucles[piste] = fetch(b.fichier).then(r => (r.ok ? r.arrayBuffer() : null)).catch(() => null);
}
const musique = { piste: null, gain: null, el: null, source: null, attente: null };

// La musique d'ouverture de ce booster existe-t-elle ? (doré : sinon celle des boosters ordinaires)
async function pisteOuverture(dore) {
  if (dore && await tamponsBoucles["booster-dore"]) return "booster-dore";
  return (await tamponsBoucles.booster) ? "booster" : null;
}

function nouveauGain(ctx) {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(VOLUME_MUSIQUE, ctx.currentTime + 2.5);
  gain.connect(ctx.destination);
  return gain;
}

// Lance (ou change, en fondu enchaîné) une piste ; ne fait rien si elle joue déjà.
function demarrerMusique(piste) {
  if (prefs.musique === false || !piste) return;
  if (!contexteAudio && navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
  if (musique.piste === piste) {
    if (musique.el?.paused && !musique.attente && !document.hidden) musique.el.play().catch(() => {});
    return;
  }
  const ctx = audio();
  if (!ctx) return;
  arreterMusique(1.5);
  const gain = nouveauGain(ctx);
  Object.assign(musique, { piste, gain });
  if (BOUCLES[piste]) return lancerBoucle(ctx, piste, gain);

  const el = new Audio(`sons/ambiance-${piste}.mp3`);
  el.preload = "auto";
  // Le volume passe par Web Audio : sur iPhone, le volume d'un lecteur audio ne se règle pas autrement.
  ctx.createMediaElementSource(el).connect(gain);
  el.addEventListener("ended", () => {
    musique.attente = setTimeout(() => {
      musique.attente = null;
      if (musique.el !== el || prefs.musique === false) return;
      el.currentTime = 0;
      if (!document.hidden) el.play().catch(() => {});
    }, PAUSE_AMBIANCE);
  });
  musique.el = el;
  if (!document.hidden) el.play().catch(() => {});
}

// Boucle continue (Web Audio) : décodée une fois, puis rejouée sans aucun blanc.
async function lancerBoucle(ctx, piste, gain) {
  let tampon = await tamponsBoucles[piste];
  if (!tampon) return;
  if (!(tampon instanceof AudioBuffer)) {
    tampon = await ctx.decodeAudioData(tampon.slice(0));
    tamponsBoucles[piste] = Promise.resolve(tampon);
  }
  if (musique.piste !== piste || musique.gain !== gain) return;   // on a changé de musique entre-temps
  const { debut, fin } = BOUCLES[piste];
  const source = ctx.createBufferSource();
  source.buffer = tampon;
  source.loop = true;
  source.loopStart = debut;
  source.loopEnd = fin || tampon.duration;
  source.connect(gain);
  source.start(0, debut);
  musique.source = source;
}

function arreterMusique(fondu = 1) {
  const { el, source, gain } = musique;
  clearTimeout(musique.attente);
  Object.assign(musique, { piste: null, gain: null, el: null, source: null, attente: null });
  if (!gain) return;
  const t = contexteAudio.currentTime;
  gain.gain.cancelScheduledValues(t);
  gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + fondu);
  setTimeout(() => {
    if (el) { el.pause(); el.removeAttribute("src"); el.load(); }
    try { source?.stop(); } catch (e) { /* déjà arrêtée */ }
    gain.disconnect();
  }, fondu * 1000 + 100);
}

// Baisse la musique pendant une fanfare, puis la remonte doucement.
function etoufferMusique(duree) {
  const { gain } = musique;
  if (!gain) return;
  const t = contexteAudio.currentTime;
  gain.gain.cancelScheduledValues(t);
  gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), t);
  gain.gain.exponentialRampToValueAtTime(VOLUME_MUSIQUE * 0.25, t + 0.25);
  gain.gain.setValueAtTime(VOLUME_MUSIQUE * 0.25, t + 0.25 + duree);
  gain.gain.exponentialRampToValueAtTime(VOLUME_MUSIQUE, t + duree + 2.5);
}

// Application en arrière-plan ou écran éteint : la musique se met en pause.
document.addEventListener("visibilitychange", () => {
  if (!contexteAudio) return;
  if (document.hidden) {
    musique.el?.pause();
    contexteAudio.suspend();   // les boucles (Web Audio) s'arrêtent avec le son du jeu
  } else {
    contexteAudio.resume();
    if (musique.el && !musique.attente && prefs.musique !== false) musique.el.play().catch(() => {});
  }
});
