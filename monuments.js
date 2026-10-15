/* =============================================================
   CHRONOLEGENDS — Monuments en filigrane sur les boosters
   Chaque dessin : ligne de sol en y = 0, centré en x = 0,
   largeur w et hauteur h (pour l'ajuster au paquet).
   Les « trous » (portes, arches, fenêtres) utilisent fill-rule evenodd.
   ============================================================= */

const MONUMENTS = (() => {
  const r = (x, y, w, h) => `M${x} ${y}h${w}v${h}h${-w}Z`;
  // Arche à sommet arrondi, posée sur yb
  const arche = (x, yb, w, h) => `M${x} ${yb}V${yb - h + w / 2}A${w / 2} ${w / 2} 0 0 1 ${x + w} ${yb - h + w / 2}V${yb}Z`;
  const p = (d, o = 1) => `<path fill-rule="evenodd" d="${d}"${o < 1 ? ` fill-opacity="${o}"` : ""}/>`;
  const sol = w => p(r(-w / 2, 0, w, .35));

  // Toit à bords relevés (Asie) : bas en y, de largeur wr, posé sur un corps de largeur wb
  const toit = (wb, wr, y, cx = 0, ep = 2.4) =>
    `M${cx - wr / 2} ${y - 1.2}Q${cx - wr / 2 + 2} ${y} ${cx - wb / 2 - .5} ${y}H${cx + wb / 2 + .5}Q${cx + wr / 2 - 2} ${y} ${cx + wr / 2} ${y - 1.2}L${cx + wb / 2} ${y - ep}H${cx - wb / 2}Z`;

  // ---------- Bustes de personnages (comme dans un musée) ----------
  // Profil tourné vers la droite, posé sur un socle, entre deux branches de laurier.
  // coupe : hauteur où commence un chapeau ou une coiffure (le haut du crâne n'est pas dessiné).
  const tete = coupe => {
    const haut = coupe == null ? "Q-4.6 -20.4 0 -20.5Q4.1 -20.3 4.4 -16.4" : `L-4.75 ${coupe}H4.3L4.4 -16.4`;
    return `M-6.5 -3.2Q-6.6 -6.8 -3.2 -7.8L-2.6 -10.4Q-4.8 -11.6 -4.8 -15.2${haut}` +
      "L4.7 -15.3L4.35 -14.7L5.5 -12.4L4.55 -12.1L4.75 -11.5L4.4 -11.2L4.6 -10.6L4.2 -10.2" +
      "Q4.3 -9.2 3.4 -9Q2.2 -9 1.8 -8.4L1.9 -7.4Q5.6 -6.6 6.5 -3.2Z";
  };
  const OREILLE = "M-.9 -15.1Q-2.4 -14.1 -1 -12.5Q-1.9 -13.9 -.9 -15.1Z M-1.25 -14.3Q-1.7 -13.9 -1.15 -13.4Q-1.4 -13.9 -1.25 -14.3Z";
  const OEIL = "M3.25 -14.45h.75v.28h-.75Z";
  // Feuille en amande au point (x, y), orientée selon l'angle a (radians)
  const feuille = (x, y, a, L = 1.7, l = .5) => {
    const c = Math.cos(a), s = Math.sin(a), n = [-s * l, c * l];
    const mx = x + c * L / 2, my = y + s * L / 2;
    return `M${x.toFixed(2)} ${y.toFixed(2)}Q${(mx + n[0]).toFixed(2)} ${(my + n[1]).toFixed(2)} ${(x + c * L).toFixed(2)} ${(y + s * L).toFixed(2)}` +
      `Q${(mx - n[0]).toFixed(2)} ${(my - n[1]).toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)}Z`;
  };
  // Branche de laurier qui monte le long du buste (cote : -1 à gauche, 1 à droite)
  const branche = cote => {
    let d = "";
    const pt = t => [cote * (5.2 + 6 * t - 2.6 * t * t), -1.2 - 15 * t];
    for (let i = 0; i < 9; i++) {
      const t = .06 + i * .105, [x, y] = pt(t), [x2, y2] = pt(t + .02);
      const dir = Math.atan2(y2 - y, x2 - x);
      d += feuille(x, y, dir + cote * .75, 2.3, .62) + feuille(x, y, dir - cote * .75, 2.1, .58);
    }
    const [xa, ya] = pt(0), [xb, yb] = pt(.5), [xc, yc] = pt(1);
    d += `M${xa} ${ya}Q${xb + cote * 1.2} ${yb} ${xc} ${yc}L${xc - cote * .25} ${yc + .2}Q${xb + cote * .9} ${yb} ${xa - cote * .3} ${ya}Z`;
    return p(d, .8);
  };
  const SOCLE = "M-4.5 0H4.5V-.8H3.6V-2.6H4.2V-3.2H-4.2V-2.6H-3.6V-.8H-4.5Z";
  const buste = ({ coupe = null, trous = "", dessus = "", derriere = "" }) =>
    (derriere ? p(derriere) : "") + p(tete(coupe) + OREILLE + OEIL + trous) + (dessus ? p(dessus) : "") +
    p(SOCLE + r(-3.6, -2.1, 7.2, .22)) + branche(-1) + branche(1) + sol(26);
  const couronneLaurier = (x1, y1, x2, y2, h) => {
    let d = "";
    for (let i = 0; i <= 7; i++) {
      const t = i / 7, x = x1 + (x2 - x1) * t, y = y1 + (y2 - y1) * t - Math.sin(t * Math.PI) * h;
      d += feuille(x, y, Math.PI + .5 + (i % 2 ? .6 : -.2), 1.5, .45);
    }
    return d;
  };

  return {
    gizeh: {
      nom: "Pyramides de Gizeh", w: 58, h: 15,
      dessin: () => {
        // Face d'une pyramide (de la base gauche xg au sommet sx,sy puis à xd), avec ses rangées de pierres
        const face = (xg, sx, sy, xd, o) => {
          let d = `M${xg} 0L${sx} ${sy}L${xd} 0Z`;
          for (let y = -1.6; y > sy + 1.4; y -= 1.6) {
            const t = y / sy, a = xg + (sx - xg) * t, b = xd + (sx - xd) * t;
            d += r(a + .35, y, b - a - .7, .16);
          }
          return p(d, o);
        };
        const palmier = x => p(`M${x} 0Q${x + .7} -3.2 ${x - .2} -6.6H${x + .3}Q${x + 1.2} -3.2 ${x + .5} 0Z`) +
          p(`M${x} -6.6Q${x - 2.4} -7.9 ${x - 3.5} -5.9Q${x - 1.8} -7 ${x} -6.6Z M${x + .2} -6.6Q${x + 2.6} -7.9 ${x + 3.7} -5.8Q${x + 2} -7 ${x + .2} -6.6Z` +
            `M${x} -6.7Q${x - 1.6} -8.9 ${x - 3.2} -8.6Q${x - 1.4} -8 ${x} -6.7Z M${x + .2} -6.7Q${x + 1.8} -8.9 ${x + 3.4} -8.5Q${x + 1.5} -8 ${x + .2} -6.7Z`);
        return [
        face(17, 22, -6, 23.8, 1), p("M22 -6L27 0H23.8Z", .55),
        face(3, 12, -10.5, 15, 1), p("M12 -10.5L21 0H15Z", .55),
        face(-22, -7, -15, -2, 1), p("M-7 -15L8 0H-2Z", .55),
        palmier(28),
        // Sphinx couché devant
        p("M-28 0V-1.4Q-28 -2.2 -26.8 -2.2H-23.2V-3.4Q-23.2 -4.8 -21.9 -4.9Q-20.5 -4.9 -20.4 -3.6L-20 -2.6V0Z"),
        sol(58),
      ].join("");
      },
    },

    parthenon: {
      nom: "Parthénon", w: 44, h: 20.6,
      dessin: () => {
        const colonnes = Array.from({ length: 8 }, (_, i) => {
          const cx = -17.5 + i * 5;
          return r(cx - 1.2, -12, 2.4, 9) + r(cx - .55, -11.5, .2, 8) + r(cx + .35, -11.5, .2, 8) + r(cx - 1.7, -12.7, 3.4, .7);
        }).join("");
        return [
          p(r(-22, -1, 44, 1) + r(-21, -2, 42, 1) + r(-20, -3, 40, 1)),
          p(colonnes),
          p(r(-20.5, -14, 41, 1.3)),
          p(r(-20.5, -15.6, 41, 1.6) + Array.from({ length: 16 }, (_, i) => r(-19.6 + i * 2.6, -15.3, .6, 1)).join(""), .75),
          p(r(-21.3, -16.1, 42.6, .5)),
          p("M-21.3 -16.1L0 -20.6L21.3 -16.1Z M-17.5 -16.6L0 -19.9L17.5 -16.6Z"),
          sol(46),
        ].join("");
      },
    },

    colisee: {
      nom: "Colisée", w: 50, h: 15.5,
      dessin: () => {
        const toitPts = [[-25, -15], [-6, -15.8], [6, -15.4], [10, -12.5], [13, -12], [16, -9], [19, -8.5], [22, -5.5], [25, -5]];
        const hautA = x => {
          for (let i = 0; i < toitPts.length - 1; i++) {
            const [x1, y1] = toitPts[i], [x2, y2] = toitPts[i + 1];
            if (x >= x1 && x <= x2) return y1 + (y2 - y1) * (x - x1) / (x2 - x1);
          }
          return 0;
        };
        let d = "M-25 0" + toitPts.map(([x, y]) => `L${x} ${y}`).join("") + "L25 0Z";
        for (const [yb, yh] of [[-.6, -4.2], [-5.1, -8.7], [-9.6, -13.1]]) {
          for (let x = -23.6; x + 2 <= 24; x += 3.1) {
            if (Math.max(hautA(x), hautA(x + 2)) < yh - .6) d += arche(x, yb, 2, yb - yh);
          }
        }
        // Corniches : fines lignes entre les étages, seulement là où le mur est assez haut
        for (const y of [-4.75, -9.25, -13.6]) {
          let x2 = -24.6;
          while (x2 < 24.6 && hautA(x2 + .2) < y - .4) x2 += .2;
          if (x2 > -20) d += r(-24.6, y, x2 + 24.6, .22);
        }
        for (let x = -23.4; x < 24; x += 3.1) if (hautA(x + 1.2) < -14.4) d += r(x + .4, -14.35, .9, .55);
        return p(d) + sol(52);
      },
    },

    chateau: {
      nom: "Château fort", w: 40, h: 21,
      dessin: () => {
        const merlons = [];
        for (let x = -11.6; x < 11; x += 2.2) if (x + 1.2 < -5 || x > 5) merlons.push(r(x, -8.2, 1.2, 1.2));
        for (let x = -4.8; x < 4.5; x += 2) merlons.push(r(x, -14, 1.1, 1));
        const tour = x => p(r(x - 3, -11, 6, 11) + r(x - .3, -8, .6, 2.2) + r(x - .3, -4, .6, 1.6)) + p(r(x + .8, -11, 2.2, 11), .35) +
          p(`M${x - 4} -11L${x} -18L${x + 4} -11Z`) +
          p(r(x - .15, -21, .3, 3.2) + `M${x + .15} -21L${x + 2.6} -20.2L${x + .15} -19.4Z`);
        return [
          p(r(-12, -7, 24, 7) + arche(-2, 0, 4, 4.6)),
          p(r(-5, -13, 10, 6) + arche(-.7, -9, 1.4, 2.2)),
          p(merlons.join("")),
          tour(-15), tour(15),
          sol(42),
        ].join("");
      },
    },

    pagode: {
      nom: "Pagode", w: 48, h: 19.5,
      dessin: () => {
        const parts = [p(r(-8, -1, 16, 1))];
        let y = -1, wb = 10;
        for (let i = 0; i < 3; i++) {
          parts.push(p(r(-wb / 2, y - 2.4, wb, 2.4) + r(-.6, y - 2, 1.2, 1.6)));
          y -= 2.4;
          parts.push(p(toit(wb, wb + 6, y)));
          y -= 2.4;
          wb -= 2.4;
        }
        parts.push(p(r(-.25, y - 3.5, .5, 3.5) + r(-.9, y - 1.4, 1.8, .4) + r(-.7, y - 2.3, 1.4, .35)));
        // Deux pavillons de chaque côté
        for (const dx of [-17, 17]) {
          parts.push(p(r(dx - 4, -4, 8, 4) + r(dx - .7, -3, 1.4, 3)));
          parts.push(p(toit(8, 13, -4, dx)));
        }
        parts.push(sol(50));
        return parts.join("");
      },
    },

    taj: {
      nom: "Taj Mahal", w: 50, h: 23,
      dessin: () => {
        const chhatri = x => p(r(x - 1.6, -11.4, 3.2, 1.4)) +
          p(`M${x - 1.8} -11.4C${x - 2.2} -12.8 ${x - 1} -13.8 ${x} -14.4C${x + 1} -13.8 ${x + 2.2} -12.8 ${x + 1.8} -11.4Z`);
        const minaret = x => p(r(x - .8, -17, 1.6, 15.5) + r(x - 1.3, -6.5, 2.6, .6) + r(x - 1.3, -11.5, 2.6, .6) + r(x - 1.3, -16.2, 2.6, .6)) +
          p(`M${x - 1.1} -17Q${x} -19.4 ${x + 1.1} -17Z` + r(x - .1, -19.9, .2, .9));
        return [
          p(r(-25, -1.5, 50, 1.5)),
          p(r(-10, -10, 20, 8.5) + "M-2.6 -1.5V-6.5Q-2.6 -8.6 0 -9.2Q2.6 -8.6 2.6 -6.5V-1.5Z" +
            arche(-8, -1.5, 2, 3) + arche(-8, -5.6, 2, 3) + arche(6, -1.5, 2, 3) + arche(6, -5.6, 2, 3)),
          p(r(-4.6, -11.6, 9.2, 1.6)),
          p("M-4.6 -11.6C-7.4 -14.8 -4.4 -18.8 0 -21C4.4 -18.8 7.4 -14.8 4.6 -11.6Z"),
          p(r(-.2, -23, .4, 2.2)),
          chhatri(-7.5), chhatri(7.5), minaret(-21), minaret(21),
          sol(52),
        ].join("");
      },
    },

    maya: {
      nom: "Pyramide maya", w: 42, h: 19,
      dessin: () => {
        const parts = [];
        for (let i = 0; i < 9; i++) {
          const w = 40 - i * 3.4, y = -(i + 1) * 1.55;
          // Marches de l'escalier central (fines entailles)
          parts.push(p(r(-w / 2, y, w, 1.55) + r(-2.6, y + .35, 5.2, .25) + r(-2.6, y + 1.05, 5.2, .25)));
        }
        parts.push(p(r(-3.4, -14, .7, 14) + r(2.7, -14, .7, 14)));
        parts.push(p(r(-4.5, -18.4, 9, 4.4) + r(-1, -17.2, 2, 3.2) + r(-3.4, -17.2, 1.4, 2.4) + r(2, -17.2, 1.4, 2.4)));
        parts.push(p(r(-5, -19, 10, .6)));
        parts.push(sol(44));
        return parts.join("");
      },
    },

    eiffel: {
      nom: "Tour Eiffel", w: 44, h: 33,
      dessin: () => {
        const arbre = x => p(r(x - .3, -2.6, .6, 2.6)) + `<ellipse cx="${x}" cy="-4.4" rx="2" ry="2.5"/>`;
        return [
          p("M-9 0Q-5.6 -4.2 -4 -9.5H4Q5.6 -4.2 9 0H6.2Q0 -7.2 -6.2 0Z M-3.2 -8.9L-1.6 -8.9L-2.6 -6.4Z M3.2 -8.9L1.6 -8.9L2.6 -6.4Z"),
          p(r(-5, -10.4, 10, .9) + Array.from({ length: 7 }, (_, i) => r(-4.2 + i * 1.25, -10.15, .55, .4)).join("")),
          p("M-3.8 -10.4L-2.2 -18.6H2.2L3.8 -10.4Z M-1.8 -11.2L0 -16.4L1.8 -11.2Z"),
          p(r(-2.8, -19.4, 5.6, .8)),
          p("M-1.9 -19.4L-.45 -29.5H.45L1.9 -19.4Z"),
          p(r(-.8, -30.2, 1.6, .7) + r(-.15, -33, .3, 2.8)),
          arbre(-14), arbre(-19), arbre(14), arbre(19),
          sol(46),
        ].join("");
      },
    },

    moai: {
      nom: "Moaï de l'île de Pâques", w: 50, h: 14.6,
      dessin: () => {
        // Profil tourné vers la droite : front lourd, long nez, menton marqué
        const moai = (x, k) => p(`M${x} 0V${-5.5 * k}L${x - .3 * k} ${-8 * k}Q${x - .4 * k} ${-11.5 * k} ${x + 1 * k} ${-12 * k}H${x + 3 * k}` +
          `L${x + 3.4 * k} ${-10.6 * k}L${x + 3.1 * k} ${-10.1 * k}L${x + 4.3 * k} ${-7.5 * k}L${x + 3.6 * k} ${-7.1 * k}` +
          `L${x + 3.8 * k} ${-6.6 * k}L${x + 3.4 * k} ${-6.2 * k}L${x + 3.8 * k} ${-5.3 * k}L${x + 3 * k} ${-4.8 * k}L${x + 3.3 * k} 0Z` +
          // oreille allongée
          `M${x + .8 * k} ${-9.6 * k}h${.5 * k}v${3 * k}h${-.5 * k}Z`);
        return [
          p(r(-25, -1.6, 50, 1.6)),
          `<g transform="translate(0 -1.6)">`, moai(-21, .86), moai(-12, 1), moai(-3, 1.08), moai(6, .95), moai(15, .9), `</g>`,
          sol(52),
        ].join("");
      },
    },

    stonehenge: {
      nom: "Stonehenge", w: 56, h: 14,
      dessin: () => {
        // Pierres légèrement irrégulières : sommet arrondi, un peu penchées
        const pierre = (x, w, h, dx = 0) => `M${x} 0L${x + .25 + dx} ${-h}Q${x + w / 2 + dx} ${-h - .5} ${x + w - .25 + dx} ${-h}L${x + w} 0Z`;
        const linteau = (x, y, w) => `M${x} ${y}Q${x + w / 2} ${y - .5} ${x + w} ${y}L${x + w - .2} ${y - 1.3}Q${x + w / 2} ${y - 1.7} ${x + .2} ${y - 1.3}Z`;
        return [
          p(pierre(-21, 2.6, 9, -.2) + pierre(-16.6, 2.6, 9.1, .1)), p(linteau(-21.6, -9, 8)),
          p(pierre(-4, 3, 12) + pierre(1, 3, 12.1)), p(linteau(-4.7, -12, 9.4)),
          p(pierre(14, 2.6, 9.2) + pierre(18.4, 2.6, 9, .2)), p(linteau(13.5, -9.1, 8)),
          p(pierre(-11, 2.2, 6, .3) + pierre(8.6, 2.2, 5.2, -.2) + "M-8 0L-7.3 -6.8L-5.2 -6.6L-5.6 0Z"),
          p(pierre(-26.5, 1.8, 3.4) + pierre(23.5, 1.7, 2.8) + "M-24 0L-23.6 -1.2H-19.4L-19 0Z M9.5 0L12.6 -2.4L13.6 -1.6L11 0Z"),
          sol(56),
        ].join("");
      },
    },
    // ---------- Personnages historiques (bustes) ----------
    napoleon: {
      nom: "Napoléon", type: "personnage", w: 26, h: 25,
      dessin: () => buste({
        coupe: -17.5,
        // col haut de l'uniforme, épaulette
        trous: "M-2.8 -8.3Q0 -7 2.2 -7.7Q0 -6.7 -2.8 -7.8Z" + r(-6, -5.7, .22, 1.3) + r(-5.3, -6.2, .22, 1.3) + r(-4.6, -6.6, .22, 1.3),
        // bicorne porté « en bataille » + mèche sur le front
        dessus: "M-10 -17Q-8.6 -18.6 -6.8 -20.4Q-3.6 -23.9 .2 -23.9Q4 -23.9 7.2 -20.4Q9 -18.6 10.4 -16.8Q.2 -19.6 -10 -17Z M4.6 -20.6a.85 .85 0 1 0 0 .01Z M3.6 -17.3Q4.7 -16.6 3.9 -15.8Q4.1 -16.7 3.6 -17.3Z",
      }),
    },
    lincoln: {
      nom: "Abraham Lincoln", type: "personnage", w: 26, h: 27.5,
      dessin: () => buste({
        coupe: -17.5,
        trous: "M-1.6 -7.9Q1 -6.6 3.6 -6.9Q1 -6.2 -1.6 -7.4Z",
        // haut-de-forme et barbe le long de la mâchoire
        dessus: r(-4.4, -27.3, 8.4, 9.3) + "M-6.4 -17.9Q-.2 -18.9 6 -17.9V-17.5Q-.2 -18.4 -6.4 -17.5Z" +
          "M-.9 -13Q-1.6 -9.6 1 -8.1Q3.5 -7.3 4.7 -8.8L4.5 -10.3Q4.3 -9.2 3.4 -9Q2.2 -9 1.8 -8.4Q.2 -9.8 -.3 -13Z",
      }),
    },
    cesar: {
      nom: "Jules César", type: "personnage", w: 26, h: 21.5,
      dessin: () => buste({
        // couronne de laurier et plis de la toge
        trous: "M-5 -4Q-1.5 -7 3 -5.8Q-1.5 -6.4 -5 -4Z M-3.6 -3.4Q0 -5.6 4.4 -4.4Q0 -5 -3.6 -3.4Z",
        // couronne de laurier : feuilles qui dépassent tout autour du crâne, pointées vers l'arrière
        dessus: Array.from({ length: 9 }, (_, i) => {
          const a = Math.PI * (1.05 + i * .085), x = -.2 + Math.cos(a) * 4.75, y = -15.7 + Math.sin(a) * 4.75;
          return feuille(x, y, a - Math.PI / 2 - .35 + (i % 2 ? .5 : 0), 1.9, .5);
        }).join(""),
      }),
    },
    cleopatre: {
      nom: "Cléopâtre", type: "personnage", w: 26, h: 23,
      dessin: () => buste({
        coupe: -17.5,
        // œil maquillé à l'égyptienne, grand collier
        trous: "M3 -14.5H4.2L4.5 -14.15H3Z M-4.6 -4.6Q0 -8 5 -5Q0 -7.2 -4.6 -4.6Z M-5.6 -3.6Q0 -7 6 -3.6Q0 -6.2 -5.6 -3.6Z",
        // perruque qui tombe dans le dos, coiffe et cobra royal
        derriere: "M-4.8 -15.2Q-6.6 -12 -5.8 -7.4L-3.2 -7.8L-2.6 -10.4Q-4.8 -11.6 -4.8 -15.2Z",
        dessus: "M-5.1 -17.8Q-5.6 -21.6 -.2 -21.9Q4.4 -21.5 4.5 -17.8Z M-4.9 -17.6Q-5.6 -15.6 -4.8 -15.2Z" +
          "M4.1 -19.4Q5.7 -20.4 5.3 -21.8Q4.9 -22.6 4.5 -21.7Q5 -20.6 3.8 -20.1Z",
      }),
    },
    jeanne: {
      nom: "Jeanne d'Arc", type: "personnage", w: 30, h: 25,
      dessin: () => buste({
        coupe: -16.2,
        // plaques de l'armure sur l'épaule
        trous: "M-6.3 -4.6Q-5.6 -7.4 -2.6 -7.6Q-5 -6.6 -6.3 -4.6Z M-6.4 -3.4Q-5.4 -6 -2.2 -6.2Q-4.8 -5.2 -6.4 -3.4Z" + r(-1, -6.4, .22, 3),
        // cheveux courts « au bol » et étendard
        dessus: "M-5 -16.4Q-5.6 -21.2 -.2 -21Q4.7 -20.8 4.6 -16.4L4.3 -16.6Q3.6 -16 3 -16.6Q2.4 -16 1.8 -16.6Z" +
          r(7, -25, .35, 22) + "M7.35 -25H13L11.6 -22.5L13 -20H7.35Z",
      }),
    },
    charlemagne: {
      nom: "Charlemagne", type: "personnage", w: 26, h: 23,
      dessin: () => buste({
        coupe: -17.5,
        trous: "M-3 -7.9Q0 -6.4 3 -7.2Q0 -6 -3 -7.4Z",
        // couronne à fleurons et longue barbe
        dessus: "M-4.7 -17.8V-20.6L-3.4 -19.6L-2 -22L-.5 -19.9L1 -22.2L2.4 -19.9L3.6 -21.4L4.3 -19.4V-17.8Z" +
          "M-.6 -13Q-1.4 -9.2 .4 -7.2Q1.6 -5.6 3.4 -5.6Q5.6 -6.4 5.2 -9L4.6 -10.6Q4.3 -9.2 3.4 -9Q2.2 -9 1.8 -8.4Q.4 -9.6 0 -13Z",
      }),
    },
  };
})();

// Place un monument dans le filigrane du paquet (viewBox 0 0 63 98), posé en bas.
function dessinMonument(cle, { largeur = 54, hauteur = 21, base = 88.6 } = {}) {
  const m = MONUMENTS[cle];
  const s = Math.min(largeur / m.w, hauteur / m.h);
  return `<g transform="translate(31.5 ${base}) scale(${s.toFixed(3)})">${m.dessin()}</g>`;
}
