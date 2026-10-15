// Die Landschaft (Dschungel im Krieg): Bambushütten, Wachtürme, Bunker, Palmen, Büsche, Farne, Autowracks, Sandsäcke, Fahnen.
// Alles ist Pixelgrafik. Jedes Motiv wird einmal in eine kleine Textur gemalt und dann
// beliebig oft als Bild in der Welt verteilt (billig für den Computer, da Bilder).
import { werkzeug, mische, variiere, GRUEN } from './Effects.js';

const ROST = [0x8a4a22, 0x6b3a22, 0x5a2e1a];

// Eine Pixelline (aus kleinen Quadraten), z. B. für Äste, Wedel und Stäbe.
function pLinie(r, c, x1, y1, x2, y2, p = 2) {
    const n = Math.max(1, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / p));
    for (let i = 0; i <= n; i++) {
        r.rect(c, Math.round((x1 + (x2 - x1) * i / n) / p) * p, Math.round((y1 + (y2 - y1) * i / n) / p) * p, p, p);
    }
}

// Eine Laubwolke aus 4-Pixel-Quadraten: oben links heller, unten rechts dunkler, Rand ausgefranst.
function laub(r, rnd, cx, cy, rx, ry, dunkel = 0) {
    const P = 4;
    for (let y = -ry; y <= ry; y += P) {
        for (let x = -rx; x <= rx; x += P) {
            const d = (x / rx) ** 2 + (y / ry) ** 2;
            if (d > 1 || (d > 0.65 && rnd.frac() < 0.45)) continue;
            const licht = -(y / ry) * 0.7 - (x / rx) * 0.25 + rnd.between(-25, 25) / 100;
            const idx = Math.max(0, Math.min(4, Math.round(2 + licht * 2.6)));
            r.rect(variiere(GRUEN[idx], -dunkel), cx + x, cy + y, P, P);
        }
    }
}

// Eine Ranke mit Blättern, die von (x, y) nach unten hängt.
function ranke(r, rnd, x, y, laenge, dunkel = 0) {
    r.rect(variiere(GRUEN[0], -dunkel), x, y, 3, laenge);
    for (let k = 6; k < laenge; k += rnd.between(7, 11)) {
        r.rect(variiere(rnd.pick(GRUEN.slice(1, 5)), -dunkel), x + (k % 2 ? 3 : -4), y + k, 5, 4);
    }
}

// Malt eine Textur einmal (falls es sie noch nicht gibt). zeichne(r, rnd) malt in Bildkoordinaten.
function textur(scene, key, w, h, zeichne) {
    if (scene.textures.exists(key)) return;
    const g = scene.add.graphics();
    zeichne(werkzeug(g, 0, 0), new Phaser.Math.RandomDataGenerator([key]));
    g.generateTexture(key, w, h);
    g.destroy();
}

// ---------------------------------------------------------------------------------------
// Bauten im Hintergrund (Dschungel-Kriegsgebiet): Bambushütten, Holztürme, überwucherte Bunker, Funkmasten, abgebrannte Hütten.
// Der Index i wählt die Art. Alles ist etwas abgedunkelt, damit es hinter den Figuren zurücktritt.
function zeichneRuine(r, rnd, w, h, i = 0) {
    const D = 14;
    const art = i % 6;
    const holz = [0x6a4a2a, 0x5a3e22, 0x7a5632][i % 3], bambus = [0xb89a4a, 0xa88a3e, 0xc8aa5a][i % 3];
    const stroh = [0x8a6a2e, 0x7a5c28, 0x9a7a38][(i + 1) % 3];
    const sack = [0x8a7a50, 0x7a6c44, 0x9a8a5a];
    const sandsaecke = (x, y, n) => {                                                     // eine Reihe Sandsäcke
        for (let k = 0; k < n; k++) {
            r.rect(0x3a3220, x + k * 18, y, 20, 12); r.rect(rnd.pick(sack), x + k * 18 + 1, y + 1, 18, 9); r.rect(0xbaa870, x + k * 18 + 3, y + 2, 12, 2);
        }
    };
    if (art === 0 || art === 3) {                                                          // Hütte auf Pfählen mit Strohdach
        const bw = w - 40, bx = 20, wandH = Math.floor(h * 0.3), boden = h - 26;
        for (const px of [bx + 4, bx + bw / 2 - 2, bx + bw - 10]) r.rect(variiere(holz, -D), px, boden, 6, 26);   // Pfähle
        r.rect(variiere(holz, -D), bx - 4, boden - 4, bw + 8, 6);                                              // Boden
        for (let x = bx; x < bx + bw; x += 6) r.rect(variiere(bambus, rnd.between(-14, 6) - D), x, boden - wandH, 5, wandH - 4);   // Bambuswand
        r.rect(0x1a120a, bx + bw / 2 - 10, boden - wandH + 10, 20, wandH - 14);                                // Tür (dunkel)
        r.rect(0x1a120a, bx + 8, boden - wandH + 8, 12, 10);                                                   // Fenster
        const dachH = Math.floor(h * 0.32);                                                                    // Strohdach: Dreieck mit Fransen
        r.tri(variiere(stroh, -D), bx - 16, boden - wandH, bx + bw + 16, boden - wandH, bx + bw / 2, boden - wandH - dachH);
        for (let k = 0; k < 18; k++) { const t = k / 18, x = bx - 16 + t * (bw + 32); r.rect(variiere(stroh, rnd.between(-20, 12) - D), x, boden - wandH - 2, 3, rnd.between(3, 9)); }
        for (let k = 0; k < 6; k++) r.rect(variiere(stroh, -26 - D), bx + bw / 2 - 20 + k * 7, boden - wandH - dachH * (0.3 + 0.1 * (k % 3)), 3, 8);
        laub(r, rnd, bx + 8, boden - 2, 16, 9, D); laub(r, rnd, bx + bw - 8, boden - 2, 14, 8, D);
        if (art === 3) r.rect(0xc9302c, bx + bw - 30, boden - wandH - dachH + 6, 18, 11);                      // rote Fahne am Dach
    } else if (art === 1) {                                                                // Holzwachturm
        const lx = 28, rx = w - 34, plattform = Math.floor(h * 0.42);
        for (const px of [lx, rx]) { r.rect(variiere(holz, -D), px, plattform, 7, h - plattform); }
        pLinie(r, variiere(holz, -10 - D), lx + 3, plattform + 4, rx + 3, h - 12, 3);                           // Kreuzstreben
        pLinie(r, variiere(holz, -10 - D), rx + 3, plattform + 4, lx + 3, h - 12, 3);
        r.rect(variiere(holz, 8 - D), lx - 12, plattform - 6, rx - lx + 30, 8);                                 // Plattform
        r.rect(variiere(holz, -D), lx - 12, plattform - 28, 4, 22); r.rect(variiere(holz, -D), rx + 14, plattform - 28, 4, 22);   // Geländer
        r.rect(variiere(holz, -D), lx - 12, plattform - 28, rx - lx + 30, 3);
        r.rect(variiere(holz, -D), lx - 8, plattform - 70, 4, 40); r.rect(variiere(holz, -D), rx + 12, plattform - 70, 4, 40);   // Dachpfosten
        r.tri(variiere(stroh, -D), lx - 22, plattform - 70, rx + 28, plattform - 70, (lx + rx) / 2 + 4, plattform - 104);            // Dach
        for (let k = 0; k < 14; k++) r.rect(variiere(stroh, rnd.between(-20, 12) - D), lx - 22 + k * ((rx - lx + 50) / 14), plattform - 72, 3, rnd.between(3, 8));
        sandsaecke(lx - 18, h - 12, 3);
        r.rect(0x20262a, (lx + rx) / 2 - 6, plattform - 46, 14, 12);                                           // Maschinengewehr-Nest (dunkel)
        for (let k = 0; k < 3; k++) ranke(r, rnd, lx + rnd.between(-6, rx - lx), plattform, rnd.between(14, 40), D);
    } else if (art === 2) {                                                                // überwucherter Bunker
        const bh = Math.floor(h * 0.36), by = h - bh;
        r.rect(variiere(0x5a5e5a, -D), 10, by, w - 20, bh);
        r.rect(variiere(0x6a6e68, -D), 10, by, w - 20, 6);
        r.rect(0x14181b, 24, by + 14, w - 48, 9);                                                              // Schießscharte
        r.rect(0x3a3e3a, 10, by, 5, bh); r.rect(0x3a3e3a, w - 15, by, 5, bh);
        for (let k = 0; k < 8; k++) r.rect(variiere(0x4a4e4a, rnd.between(-14, 6) - D), rnd.between(12, w - 30), by + rnd.between(10, bh - 6), rnd.between(8, 20), 3);   // Risse und Putz
        sandsaecke(4, by - 12, Math.floor((w - 8) / 18));
        for (let x = 16; x < w - 16; x += 14) { r.rect(0x20241f, x, by - 34, 2, 22); r.rect(0x20241f, x, by - 28 + (x % 28 ? 2 : 0), 14, 2); }   // Stacheldraht
        laub(r, rnd, w * 0.3, by - 8, 28, 14, D); laub(r, rnd, w * 0.72, by - 6, 24, 12, D);
        for (let k = 0; k < 6; k++) ranke(r, rnd, rnd.between(12, w - 14), by + 4, rnd.between(14, 46), D);
    } else if (art === 4) {                                                                // Funkmast mit Sandsack-Nest
        const mx = w / 2;
        r.rect(0x3a4046, mx - 2, 20, 5, h - 20);
        pLinie(r, 0x3a4046, mx - 18, h - 14, mx, 40, 3); pLinie(r, 0x3a4046, mx + 18, h - 14, mx, 40, 3);
        for (let y = 60; y < h - 20; y += 34) pLinie(r, 0x3a4046, mx - 8 - (y / h) * 8, y, mx + 8 + (y / h) * 8, y, 2);
        r.rect(0x555a5e, mx + 3, 24, 22, 10); r.rect(0x555a5e, mx - 14, 14, 12, 4);                              // Antennen
        r.rect(0xc9302c, mx + 4, 8, 20, 12); r.rect(0x20262a, mx + 12, 8, 4, 12);                                // zerfetzte Fahne
        sandsaecke(mx - 40, h - 12, 5);
        sandsaecke(mx - 30, h - 24, 3);
        laub(r, rnd, mx - 36, h - 4, 14, 8, D); laub(r, rnd, mx + 40, h - 4, 14, 8, D);
    } else {                                                                               // abgebrannte Hütte
        const bw = w - 40, bx = 20, boden = h - 8;
        for (const px of [bx + 2, bx + bw - 8]) r.rect(0x2a2420, px, boden - 56, 6, 56);                          // verkohlte Pfosten
        r.rect(0x2a2420, bx + bw / 2 - 3, boden - 40, 6, 40);
        pLinie(r, 0x2a2420, bx + 4, boden - 54, bx + bw / 2, boden - 70, 4);                                      // eingestürzter Dachbalken
        pLinie(r, 0x2a2420, bx + bw - 6, boden - 54, bx + bw / 2 + 8, boden - 36, 4);
        for (let k = 0; k < 16; k++) r.rect(rnd.pick([0x3a2e26, 0x2a2420, 0x4a3a2c]), bx + rnd.between(0, bw - 8), boden - rnd.between(4, 20), rnd.between(6, 16), rnd.between(3, 8));   // Asche und Trümmer
        for (let k = 0; k < 5; k++) r.rect(rnd.pick([0xff9a2a, 0xff6a1a, 0xffcc44]), bx + rnd.between(4, bw - 6), boden - rnd.between(2, 14), 4, rnd.between(4, 9));     // Glutnester
        for (let k = 0; k < 6; k++) r.rect(0x1c1c1c, bx + bw / 2 + rnd.between(-10, 10), boden - 74 - k * 10, rnd.between(8, 14), 8, 0.5 - k * 0.07);   // Rauchfahne
        laub(r, rnd, bx - 6, boden - 2, 14, 8, D); laub(r, rnd, bx + bw + 4, boden - 2, 12, 7, D);
    }
}

// Eine Palme: gebogener, geringelter Stamm, acht hängende Wedel mit Fiederblättchen und Kokosnüsse.
function zeichnePalme(r, rnd, w, h) {
    const cx = w / 2, hoehe = Math.floor(h * 0.7), neigung = rnd.between(-16, 16);
    let tx = cx, ty = h;
    for (let k = 0; k < hoehe; k += 4) {
        tx = cx + Math.round(Math.sin(k / hoehe * 1.5) * neigung / 2) * 2;
        ty = h - k - 4;
        r.rect(k % 12 < 6 ? 0x6a4a2a : 0x5a3e22, tx - 4 - (k < 12 ? 2 : 0), ty, 8 + (k < 12 ? 4 : 0), 5);
        r.rect(0x8a6a3e, tx - 4, ty, 2, 5);
    }
    const wedel = 9;
    for (let wd = 0; wd < wedel; wd++) {
        const a = -Math.PI / 2 + (wd - (wedel - 1) / 2) * 0.55 + rnd.between(-6, 6) / 100, laenge = rnd.between(42, 62);
        let vx = tx, vy = ty;
        for (let s = 0; s < laenge; s += 3) {
            vx = tx + Math.cos(a) * s * 1.05; vy = ty + Math.sin(a) * s * 0.5 + s * s * 0.012;
            r.rect(GRUEN[rnd.between(1, 3)], vx - 2, vy - 1, 4, 3);
            if (s % 6 === 0 && s > 6) {                                                                          // Fiederblättchen
                const g2 = GRUEN[rnd.between(2, 4)];
                r.rect(g2, vx - 1, vy - 5, 3, 5); r.rect(g2, vx - 1, vy + 2, 3, 6);
            }
        }
    }
    r.rect(0x4a3418, tx - 6, ty + 2, 6, 6); r.rect(0x4a3418, tx + 1, ty + 4, 6, 6);                               // Kokosnüsse
}

// Ein Laubbaum des Dschungels: dicker Stamm mit Brettwurzeln, mächtiges Kronendach, Lianen und rote Blüten.
function zeichneLaubbaum(r, rnd, w, h) {
    const cx = w / 2, th = Math.floor(h * 0.55);
    r.rect(0x4a3322, cx - 7, h - th, 14, th);
    r.rect(0x33231a, cx + 2, h - th, 5, th);
    pLinie(r, 0x4a3322, cx - 7, h - 6, cx - 22, h, 4); pLinie(r, 0x4a3322, cx + 7, h - 6, cx + 22, h, 4);          // Brettwurzeln
    pLinie(r, 0x4a3322, cx, h - th + 12, cx - 26, h - th - 12, 4);
    pLinie(r, 0x4a3322, cx, h - th + 6, cx + 28, h - th - 18, 4);
    laub(r, rnd, cx, h - th - 26, Math.floor(w * 0.4), 32);
    laub(r, rnd, cx - 34, h - th - 8, 26, 18);
    laub(r, rnd, cx + 36, h - th - 12, 26, 18);
    for (let i = 0; i < 7; i++) ranke(r, rnd, cx + rnd.between(-44, 44), h - th - 10, rnd.between(20, 70));
    for (let i = 0; i < 5; i++) r.rect(rnd.pick([0xd9302c, 0xff7a2a, 0xffd23f]), cx + rnd.between(-44, 44), h - th - rnd.between(10, 54), 4, 4);   // Blüten
}

// Ein vom Krieg zerschossener Baum: verkohlter, zersplitterter Stumpf mit Glutnestern und etwas Rauch.
function zeichneTotBaum(r, rnd, w, h) {
    const cx = w / 2 + rnd.between(-6, 6), hh = Math.floor(h * 0.6);
    r.rect(0x241c16, cx - 6, h - hh, 12, hh);
    r.rect(0x14100c, cx + 2, h - hh, 4, hh);
    for (let k = 0; k < 5; k++) r.tri(0x241c16, cx - 6 + k * 3, h - hh, cx - 4 + k * 3, h - hh, cx - 5 + k * 3 + rnd.between(-2, 2), h - hh - rnd.between(8, 28));   // Splitter oben
    for (const [dx, dy, l] of [[-1, 0.5, 26], [1, 0.35, 20]]) {
        const y0 = h - Math.floor(h * dy);
        pLinie(r, 0x241c16, cx, y0, cx + dx * l, y0 - l * 0.5, 3);
    }
    for (let k = 0; k < 5; k++) r.rect(rnd.pick([0xff7a2a, 0xffaa44, 0xcc3a1a]), cx - 6 + rnd.between(0, 10), h - rnd.between(6, hh - 6), 3, rnd.between(3, 6));   // Glut
    for (let k = 0; k < 5; k++) r.rect(0x1c1c1c, cx + rnd.between(-6, 8), h - hh - 20 - k * 10, rnd.between(8, 14), 8, 0.45 - k * 0.07);   // Rauch
    for (let y = h; y > h - Math.floor(h * 0.3); y -= 6) r.rect(rnd.pick(GRUEN.slice(1, 4)), cx - 6 + rnd.between(0, 6), y - 6, rnd.between(3, 6), 5);   // trotzdem ein paar Triebe
}

function zeichneBusch(r, rnd, w, h) {
    laub(r, rnd, w * 0.3, h - 14, w * 0.28, 14);
    laub(r, rnd, w * 0.65, h - 16, w * 0.3, 16);
    laub(r, rnd, w * 0.5, h - 24, w * 0.22, 14);
    for (let i = 0; i < 6; i++) {                                     // tropische Blüten
        r.rect(rnd.pick([0xd9302c, 0xff7a2a, 0xffd23f, 0xf0f0f0]), rnd.between(8, w - 12), rnd.between(h - 38, h - 10), 5, 5);
    }
}

function zeichneFarn(r, rnd, w, h) {
    const cx = w / 2;
    for (let i = 0; i < 7; i++) {
        const dx = (i - 3) * 6, hoehe = h - Math.abs(i - 3) * 3 - 4;
        pLinie(r, GRUEN[rnd.between(1, 3)], cx, h, cx + dx, h - hoehe, 2);
        for (let k = 6; k < hoehe; k += 6) {
            r.rect(GRUEN[rnd.between(2, 4)], cx + dx * k / hoehe - 5, h - k, 4, 3);
            r.rect(GRUEN[rnd.between(2, 4)], cx + dx * k / hoehe + 2, h - k, 4, 3);
        }
    }
}

function zeichneTuft(r, rnd, w, h) {
    for (let x = 2; x < w - 2; x += rnd.between(2, 4)) {
        const hh = rnd.between(6, h);
        pLinie(r, rnd.pick(GRUEN.slice(1, 5)), x, h, x + rnd.between(-4, 4), h - hh, 2);
    }
}

// Ein Autowrack: rostig, ohne Scheiben, mit Moos auf dem Dach und einem Busch im Fahrerraum.
function zeichneAuto(r, rnd, w, h) {
    const farbe = rnd.pick([0x7a4a2a, 0x5c5a52, 0x4a5238, 0x5a4a3a]);
    r.rect(variiere(farbe, -10), 6, h - 40, w - 12, 24);                         // Karosserie
    r.rect(variiere(farbe, 10), 6, h - 40, w - 12, 4);
    r.rect(variiere(farbe, -4), 34, h - 62, w - 78, 24);                         // Kabine
    r.rect(0x14181b, 40, h - 58, 24, 16); r.rect(0x14181b, 70, h - 58, 24, 16);   // Fensterlöcher
    r.rect(0x20262a, 46, h - 58, 4, 16);                                          // Glasreste
    r.rect(variiere(farbe, -30), 6, h - 20, w - 12, 5);                          // Schweller
    for (const wx of [18, w - 40]) {                                              // platte Räder
        r.rect(0x1a1a1a, wx, h - 22, 22, 20); r.rect(0x3a3a3a, wx + 7, h - 15, 8, 8);
    }
    for (let i = 0; i < 5; i++) r.rect(rnd.pick(ROST), rnd.between(10, w - 14), h - 40 + rnd.between(2, 18), 2, rnd.between(6, 14), 0.7);   // Rostspuren
    laub(r, rnd, 62, h - 62, 20, 10);                                             // Moos/Busch auf dem Dach
    laub(r, rnd, 52, h - 48, 14, 10);                                             // Busch im Fenster
    for (let i = 0; i < 2; i++) ranke(r, rnd, rnd.between(10, w - 14), h - 40, rnd.between(10, 20));
    zeichneTuft(r, rnd, 30, 14);
}

// Eine Stellung: Sandsackwall mit Stacheldraht auf Holzpfosten (und ein Busch davor).
function zeichneZaun(r, rnd, w, h) {
    const sack = [0x8a7a50, 0x7a6c44, 0x9a8a5a];
    for (let reihe = 0; reihe < 2; reihe++) {
        for (let k = 0; k < (reihe ? 4 : 5); k++) {
            const x = 8 + k * 20 + (reihe ? 10 : 0), y = h - 12 - reihe * 11;
            r.rect(0x3a3220, x, y, 22, 12); r.rect(rnd.pick(sack), x + 1, y + 1, 20, 9); r.rect(0xbaa870, x + 3, y + 2, 13, 2);
        }
    }
    for (const px of [10, 60, 110]) r.rect(0x4a3a24, px, h - 44, 4, 34);                                         // Pfosten
    for (let x = 8; x < w - 6; x += 12) {                                                                         // Stacheldraht
        r.rect(0x20241f, x, h - 38 + (x % 24 ? 3 : 0), 14, 2);
        if ((x / 12) % 2 === 0) r.rect(0x20241f, x + 6, h - 42, 2, 10);
    }
    laub(r, rnd, 20, h - 3, 16, 7); laub(r, rnd, 100, h - 3, 14, 7);
}

// Eine Fahnenstange mit zerfetzter roter Fahne (Banner einer Kriegspartei).
function zeichneLaterne(r, rnd, w, h) {
    r.rect(0x3a3226, w / 2 - 2, 12, 5, h - 12);
    r.rect(0xe8c030, w / 2 - 3, 8, 7, 6);                                                                         // Knauf
    for (let k = 0; k < 8; k++) {                                                                                  // wehende Fahne in Stufen
        const sw = Math.sin(k * 0.7) * 2;
        r.rect(k % 2 ? 0xa8241f : 0xc9302c, w / 2 + 3 + k * 4, 16 + sw, 4, 30 - k * 1.2);
    }
    r.rect(0x10100c, w / 2 + 16, 24, 8, 8);                                                                       // Emblem
    for (let k = 0; k < 3; k++) r.rect(0xc9302c, w / 2 + 28 + k * 2, 40 + k * 3, 2, 8 - k * 2);                  // Fetzen unten
    laub(r, rnd, w / 2, h - 6, 12, 8);
}

function zeichneTruemmer(r, rnd, w, h) {
    for (let i = 0; i < 6; i++) {
        const bw = rnd.between(12, 26), bh = rnd.between(8, 18);
        r.rect(variiere(rnd.pick([0x5a5650, 0x4a4e52, 0x6a6560]), rnd.between(-8, 8)), rnd.between(0, w - bw), h - bh - rnd.between(0, 8), bw, bh);
    }
    pLinie(r, 0x2a2420, w * 0.6, h - 10, w * 0.7, h - 30, 2);                     // Eisen
    laub(r, rnd, w * 0.35, h - 6, 14, 7);
    zeichneTuft(r, rnd, 26, 14);
}


// Ein ausgebranntes Panzerfahrzeug: flacher Rumpf (man kann darauf stehen), Turmluke, abgeknicktes Rohr,
// Sichtschlitze, ein platter Reifen, Rußflecken, Einschüsse und Bewuchs.
function zeichnePanzer(r, rnd, w, h) {
    const hull = rnd.pick([0x4a5238, 0x555a44, 0x4a4f3a]);
    r.rect(variiere(hull, -14), 4, 6, w - 8, h - 22);                          // Rumpf
    r.rect(variiere(hull, 14), 4, 6, w - 8, 4);                                // Oberkante (hell, Standfläche)
    r.rect(0x000000, 4, h - 20, w - 8, 4, 0.3);                                // Schatten unten
    for (let k = 0; k < 4; k++) r.rect(variiere(hull, -14 + k * 3), w - 10 + k * 2 - 8, 10 + k * 8, 10 - k * 2, 8);   // schräge Frontplatte
    r.rect(variiere(hull, -30), w * 0.42, 0, 46, 10);                          // Turm
    r.rect(variiere(hull, -4), w * 0.42 + 6, 2, 34, 4);
    r.rect(0x2a2a2a, w * 0.42 + 46, 3, 36, 6);                                 // Rohr
    r.rect(0x2a2a2a, w * 0.42 + 78, 6, 12, 6);                                 // geknickte Mündung
    for (let k = 0; k < 4; k++) r.rect(0x101214, 18 + k * 30, 22, 18, 5);      // Sichtschlitze
    for (const wx of [14, 66, 118, w - 52]) {                                  // Räder
        r.rect(0x1a1a1a, wx, h - 22, 28, 22);
        r.rect(0x3a3a3a, wx + 9, h - 14, 10, 8);
    }
    r.rect(0x1a1a1a, 66, h - 15, 28, 15, 0.9);                                 // ein Reifen ist platt
    for (let i = 0; i < 5; i++) r.rect(0x1b1612, rnd.between(8, w - 30), rnd.between(8, 22), rnd.between(12, 26), 6, 0.35);   // Ruß
    for (let i = 0; i < 6; i++) { const bx = rnd.between(10, w - 12), by = rnd.between(12, h - 26); r.rect(0x0c0e10, bx, by, 4, 4); r.rect(0x8a7a5a, bx - 1, by - 1, 6, 1, 0.6); }   // Einschüsse
    for (let i = 0; i < 8; i++) r.rect(rnd.pick(ROST), rnd.between(6, w - 8), rnd.between(10, h - 22), 2, rnd.between(6, 14), 0.7);   // Rost
    laub(r, rnd, w * 0.78, 6, 16, 6);                                          // Moos/Gebüsch auf dem Heck
    for (let x = 6; x < w - 6; x += rnd.between(24, 44)) r.rect(rnd.pick(GRUEN.slice(0, 3)), x, 3, rnd.between(8, 16), 4);   // Moos auf der Oberkante
    for (let i = 0; i < 3; i++) ranke(r, rnd, rnd.between(10, w - 14), 10, rnd.between(10, 24));
    zeichneTuft(r, rnd, 26, 14);
}

function erzeugeTexturen(scene) {
    [[150, 230], [210, 310], [130, 170], [240, 350], [180, 260], [120, 210]].forEach(([w, h], i) =>
        textur(scene, `ruine_${i}`, w, h, (r, rnd) => zeichneRuine(r, rnd, w, h, i)));
    for (let i = 0; i < 3; i++) textur(scene, `baum_${i}`, 130, 190 + i * 20, (r, rnd) => (i === 1 ? zeichneLaubbaum : zeichnePalme)(r, rnd, 130, 190 + i * 20));
    for (let i = 0; i < 3; i++) textur(scene, `totbaum_${i}`, 100, 150 + i * 20, (r, rnd) => zeichneTotBaum(r, rnd, 100, 150 + i * 20));
    for (let i = 0; i < 4; i++) textur(scene, `busch_${i}`, 72, 46, (r, rnd) => zeichneBusch(r, rnd, 72, 46));
    for (let i = 0; i < 3; i++) textur(scene, `farn_${i}`, 44, 34, (r, rnd) => zeichneFarn(r, rnd, 44, 34));
    for (let i = 0; i < 5; i++) textur(scene, `tuft_${i}`, 26, 16, (r, rnd) => zeichneTuft(r, rnd, 26, 16));
    for (let i = 0; i < 3; i++) textur(scene, `auto_${i}`, 132, 70, (r, rnd) => zeichneAuto(r, rnd, 132, 70));
    for (let i = 0; i < 2; i++) textur(scene, `zaun_${i}`, 120, 46, (r, rnd) => zeichneZaun(r, rnd, 120, 46));
    for (let i = 0; i < 6; i++) { const mw = [60, 90, 120][i % 3], mh = [70, 100, 140][Math.floor(i / 2) % 3]; textur(scene, `mauer_${i}`, mw, mh, (r, rnd) => zeichneMauer(r, rnd, mw, mh)); }
    textur(scene, 'laterne_0', 34, 120, (r, rnd) => zeichneLaterne(r, rnd, 34, 120));
    for (let i = 0; i < 3; i++) textur(scene, `truemmer_${i}`, 70, 30, (r, rnd) => zeichneTruemmer(r, rnd, 70, 30));
}


// Ein Mauerrest: ein Stück Wand mit ausgefranster Oberkante, ein bis zwei Fensterlöchern, Rissen und Eisen.
function zeichneMauer(r, rnd, w, h) {
    const basis = rnd.pick([0x4a4e52, 0x57524b, 0x454a45]), S = 6;
    const tops = [];
    let t = rnd.between(0, Math.floor(h * 0.3));
    for (let x = 0; x < w; x += S) {
        t = Math.max(0, Math.min(Math.floor(h * 0.5), t + rnd.pick([-12, -6, 0, 0, 6, 12])));
        tops.push(t);
        r.rect(variiere(basis, rnd.between(-6, 6) - 14), x, t, S, h - t);
    }
    r.rect(0x000000, w - 8, tops[tops.length - 1], 8, h - tops[tops.length - 1], 0.22);
    for (let k = 0; k < (w > 80 ? 2 : 1); k++) {
        const x = 12 + k * 46, y = Math.max(...tops) + 14;
        if (x + 20 < w - 6 && y + 26 < h - 6 && rnd.frac() < 0.85) {
            r.rect(0x14181b, x, y, 20, 26); r.rect(variiere(basis, 8), x - 2, y - 2, 24, 3);
        }
    }
    for (let i = 0; i < w / 40; i++) {
        let cx = rnd.between(6, w - 6), cy = rnd.between(Math.floor(h * 0.3), h - 20);
        for (let k = 0; k < rnd.between(3, 5); k++) { r.rect(0x0c0e10, cx, cy, 2, 6, 0.8); cx += rnd.pick([-3, 3]); cy += 5; }
    }
    for (let i = 0; i < 3; i++) { const cx = rnd.between(4, w - 6); pLinie(r, 0x2a2420, cx, tops[Math.floor(cx / S)], cx + rnd.between(-5, 5), tops[Math.floor(cx / S)] - rnd.between(8, 20), 2); }
    for (let x = 0; x < w; x += rnd.between(20, 40)) r.rect(rnd.pick(GRUEN.slice(0, 3)), x, tops[Math.floor(x / S)] - 2, rnd.between(8, 16), 4);   // Moos oben
    if (rnd.frac() < 0.5) ranke(r, rnd, rnd.between(4, w - 8), tops[0], rnd.between(20, Math.floor(h * 0.5)));
}

// Stützen unter schwebenden Plattformen: Betonsäulen oder Holzpfosten. So sehen die Plattformen wie
// Überreste von Gebäuden aus und nicht, als hingen sie in der Luft. Zu tiefe Stellen enden abgebrochen.
function saeule(g, rnd, x, y0, laenge, gebrochen) {
    g.fillStyle(0x474b4f).fillRect(x - 8, y0, 16, laenge);
    g.fillStyle(0x363a3e).fillRect(x + 3, y0, 5, laenge);
    g.fillStyle(0x5b6065).fillRect(x - 8, y0, 2, laenge);
    for (let y = 40; y < laenge; y += 56) g.fillStyle(0x3a3e42).fillRect(x - 9, y0 + y, 18, 4);     // Bänder
    for (let i = 0; i < laenge / 60; i++) g.fillStyle(0x15181a).fillRect(x - 6 + rnd.between(0, 10), y0 + rnd.between(8, Math.max(9, laenge - 12)), rnd.between(4, 8), 2);   // Risse
    if (gebrochen) {                                                                              // abgebrochenes, ausgefranstes Ende
        for (let k = 0; k < 4; k++) g.fillStyle(0x474b4f).fillRect(x - 8 + k * 4, y0 + laenge, 4, rnd.between(0, 14));
        for (let k = 0; k < 3; k++) g.fillStyle(0x2a2420).fillRect(x - 6 + k * 5, y0 + laenge + 10, 2, rnd.between(8, 18));
    } else {
        g.fillStyle(0x3a3e42).fillRect(x - 12, y0 + laenge - 8, 24, 8);                            // Fuß
        g.fillStyle(0x5a5650).fillRect(x + 8, y0 + laenge - 6, rnd.between(8, 14), 6);              // Schutt
        g.fillStyle(rnd.pick(GRUEN.slice(1, 4))).fillRect(x - 14, y0 + laenge - 4, rnd.between(6, 12), 4);   // etwas Moos
    }
    if (rnd.frac() < 0.4) {                                                                       // eine Ranke an der Säule
        const len = rnd.between(20, Math.max(21, laenge * 0.7));
        g.fillStyle(0x2a4018).fillRect(x + rnd.pick([-9, 7]), y0 + 2, 2, len);
    }
}

function pfosten(g, rnd, x, y0, laenge, gebrochen) {
    g.fillStyle(0x5a3d22).fillRect(x - 4, y0, 8, laenge);
    g.fillStyle(0x3d2916).fillRect(x + 1, y0, 3, laenge);
    for (let i = 0; i < laenge / 40; i++) g.fillStyle(0x2a1c10).fillRect(x - 3, y0 + rnd.between(6, Math.max(7, laenge - 6)), 3, 3);   // Astlöcher
    if (gebrochen) for (let k = 0; k < 3; k++) g.fillStyle(0x5a3d22).fillRect(x - 4 + k * 3, y0 + laenge, 3, rnd.between(0, 10));
    else g.fillStyle(0x5a5650).fillRect(x - 7, y0 + laenge - 5, 14, 5);                           // Fundamentstein
}

// Schräge Pixellinie direkt auf eine Graphics (für Holzstreben).
function strebe(g, c, x1, y1, x2, y2) {
    const n = Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 3);
    g.fillStyle(c);
    for (let i = 0; i <= n; i++) g.fillRect(Math.round(x1 + (x2 - x1) * i / n), Math.round(y1 + (y2 - y1) * i / n), 4, 4);
}

export function buildStuetzen(scene, level) {
    const rnd = new Phaser.Math.RandomDataGenerator(['stuetzen']);
    const g = scene.add.graphics().setDepth(-2);
    const fest = level.platforms.filter(p => p.h >= 40 || p.kollision);
    // Die Oberkante des nächsten festen Bodens unter y (ab Höhe yAb) an der Stelle x
    const darunter = (x, yAb) => {
        let y = Infinity;
        for (const p of fest) {
            const top = p.y - p.h / 2;
            if (top >= yAb - 2 && Math.abs(x - p.x) <= p.w / 2 - 2) y = Math.min(y, top);
        }
        return y;
    };
    // Hier gibt es schon eine eigene Gebäude-Rückwand, ein Gerüst oder einen Schacht: keine Stützen
    const sperre = [[6380, 6920], [10225, 10545], [7400, 7660], [9640, 9900], [11520, 11800], [2730, 3170]];
    const WAND_MAX = 320;
    for (const p of level.platforms.filter(q => q.h < 40 && !q.kollision && !q.brechbar && !q.bruecke && !q.innen)) {
        if (sperre.some(([a, b]) => p.x >= a && p.x <= b)) continue;
        const l = p.x - p.w / 2, r = p.x + p.w / 2, unten = p.y + p.h / 2;
        const holz = p.color === 0x6b4a2a;
        const xs = [l + 10, r - 10];
        if (p.w > 200) xs.push(p.x);
        const gemalt = [];
        for (const x of xs) {
            const boden = darunter(x, unten);
            const luft = boden - unten;
            if (luft < 20) continue;
            const laenge = Math.min(luft, WAND_MAX);
            const gebrochen = luft > WAND_MAX;
            (holz ? pfosten : saeule)(g, rnd, x, unten, laenge, gebrochen);
            gemalt.push([x, laenge]);
        }
        if (holz && gemalt.length >= 2) {                                                         // Kreuzstreben zwischen den Pfosten
            const [a, b] = [gemalt[0], gemalt[gemalt.length - 1]];
            const y1 = unten + 6, y2 = unten + Math.min(a[1], b[1]) * 0.7;
            strebe(g, 0x4a331d, a[0] + 4, y1, b[0] - 4, y2);
            strebe(g, 0x4a331d, b[0] - 4, y1, a[0] + 4, y2);
        }
        // Mauerrest auf der Platte: ein Stück Wand, das noch steht
        if (!holz && p.w >= 100 && rnd.frac() < 0.5) {
            const nr = rnd.between(0, 5);
            const seite = rnd.frac() < 0.5 ? l + 40 : r - 40;
            scene.add.image(seite, p.y - p.h / 2 + 2, `mauer_${nr}`).setOrigin(0.5, 1).setDepth(-4);
        }
    }
}


// ---- Brücken: Fachwerk, Seile und Autobahn-Reste über den Planken, die in Level01.js stehen ----

// Stahlfachwerk über einem Brückenstück: Obergurt, Pfosten, Kreuzstreben, Rost und eine Ranke.
function fachwerk(g, rnd, a, c, oben) {
    const H = 64;
    g.fillStyle(0x4a4036).fillRect(a, oben - H, c - a, 6);
    g.fillStyle(0x62564a).fillRect(a, oben - H, c - a, 2);
    const n = Math.max(2, Math.round((c - a) / 38));
    const schritt = (c - a - 6) / n;
    for (let i = 0; i <= n; i++) g.fillStyle(0x4a4036).fillRect(a + i * schritt, oben - H, 6, H);
    for (let i = 0; i < n; i++) {
        const x1 = a + i * schritt + 6, x2 = a + (i + 1) * schritt;
        if (rnd.frac() < 0.85) strebe(g, 0x4a4036, i % 2 ? x2 : x1, oben - 4, i % 2 ? x1 : x2, oben - H + 6);
    }
    for (let i = 0; i < (c - a) / 14; i++) g.fillStyle(rnd.pick([0x8a4a22, 0x6b3a22])).fillRect(a + rnd.between(0, c - a - 2), oben - H + rnd.between(6, H - 10), 2, rnd.between(6, 14));
    const rx = a + rnd.between(6, Math.max(7, c - a - 6)), len = rnd.between(14, 40);
    g.fillStyle(0x2a4018).fillRect(rx, oben - H + 6, 2, len);
    for (let k = 4; k < len; k += 8) g.fillStyle(rnd.pick(GRUEN.slice(1, 4))).fillRect(rx + (k % 16 ? 2 : -4), oben - H + 6 + k, 5, 4);
}

// Seilbrücke: Holzpfosten an den äußeren Enden, durchhängendes Handseil, kurze Halteseile, lose Enden an der Lücke.
function seilbruecke(g, rnd, stuecke) {
    for (const [a, c, oben] of stuecke) {
        for (const px of [a + 2, c - 6]) {
            g.fillStyle(0x5a3d22).fillRect(px, oben - 46, 6, 46);
            g.fillStyle(0x3d2916).fillRect(px + 4, oben - 46, 2, 46);
        }
        const x1 = a + 5, x2 = c - 3, y0 = oben - 42;
        g.fillStyle(0x8a7a52);
        for (let x = x1; x <= x2; x += 4) {                       // Handseil, in der Mitte durchhängend
            const u = (x - x1) / Math.max(1, x2 - x1);
            g.fillRect(x, y0 + Math.round(Math.sin(u * Math.PI) * 6 / 2) * 2, 4, 2);
        }
        for (let x = x1 + 10; x < x2 - 6; x += 20) g.fillRect(x, y0 + 4, 2, 38);   // senkrechte Halteseile
    }
    // lose, herabhängende Seile an den Enden der Lücke
    for (let i = 0; i < stuecke.length - 1; i++) {
        const ende = stuecke[i][1], anfang = stuecke[i + 1][0], oben = stuecke[i][2];
        g.fillStyle(0x8a7a52).fillRect(ende - 4, oben - 38, 2, rnd.between(20, 34));
        g.fillStyle(0x8a7a52).fillRect(anfang + 4, oben - 38, 2, rnd.between(16, 30));
    }
}

// Autobahn-Reste: Asphaltkappe mit gelber Mittellinie, Leitplanken (an den Bruchenden verbogen), Eisen.
function autobahnReste(kappe, gelaender, rnd, stuecke) {
    for (const [a, c, oben] of stuecke) {
        kappe.fillStyle(0x2a2c2e).fillRect(a, oben, c - a, 5);                          // Asphalt (auf der Platte)
        kappe.fillStyle(0xd9b43a, 0.9);
        for (let x = a + 6; x < c - 10; x += 22) kappe.fillRect(x, oben + 1, 10, 2);   // Mittellinie
        for (let x = a + 8; x < c - 8; x += 36) {
            gelaender.fillStyle(0x7a7d80).fillRect(x, oben - 22, 4, 22);                // Leitplankenpfosten
        }
        gelaender.fillStyle(0x8a8d90).fillRect(a + 4, oben - 20, c - a - 24, 4);        // Leitplanke
        strebe(gelaender, 0x8a8d90, c - 20, oben - 20, c - 6, oben - 8);                // verbogenes Ende
        for (let k = 0; k < 3; k++) gelaender.fillStyle(0x2a2420).fillRect(c - 2 + k * 2, oben + 6 + k * 3, 2, rnd.between(8, 16));   // Eisen
    }
}

// ---- Holzbrücken (aus den Holzböden der Skizze), schlicht wie in Broforce ----
// Ein Bretterdeck mit zwei Tragbalken, darunter ein einfaches Holzfachwerk (Balken mit gekreuzten Streben), das in den Felswänden an beiden Enden sitzt:
// Es gibt keine Stützen darunter. Seitlich stehen Pfosten mit Handlauf und einem Seil dazwischen. Hängt die Brücke nur an einer Wand, ist sie
// abgebrochen: Bretter fehlen, das Fachwerk endet zersplittert, Pfosten sind abgeknickt, ein Stück hängt an einem Seil herab.
export function buildHaengebruecken(scene, level) {
    const rnd = new Phaser.Math.RandomDataGenerator(['holzbruecken']);
    const g = scene.add.graphics().setDepth(2.45);
    const HOLZ = [0x9a7a3c, 0x86652f, 0x74552a, 0x66491f], DUNKEL = 0x2e1f10, BALKEN = 0x4a3418, BALKEN_HELL = 0x6a4c26, SEIL = 0xb0a070, EISEN = 0x3a3a3a;
    const px = (c, x, y, w, h) => g.fillStyle(c).fillRect(Math.round(x), Math.round(y), w, h);
    // eine Strebe von (x0, y0) nach (x1, y1) aus kleinen Quadraten
    const strebe = (x0, y0, x1, y1, c) => {
        const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / 3));
        for (let i = 0; i <= n; i++) px(c, x0 + (x1 - x0) * i / n - 2, y0 + (y1 - y0) * i / n - 2, 4, 4);
    };
    const TIEFE = 28;                                                           // Höhe des Fachwerks unter dem Deck
    for (const b of level.haenge ?? []) {
        const { l, r, y } = b, links = b.links, rechts = b.rechts, ganz = links && rechts;
        const bruch = 44;                                                      // so weit reicht der beschädigte Bereich am freien Ende
        const nahEnde = (x) => (!links && x < l + bruch) || (!rechts && x > r - bruch);
        // --- Deck: Bretter (14 breit) mit Fugen; am freien Ende fehlen manche, die übrigen sind kürzer/zersplittert
        for (let x = l; x < r; x += 14) {
            const ende = nahEnde(x);
            if (ende && rnd.frac() < 0.4) continue;
            const hoeh = ende ? rnd.pick([6, 8, 10]) : 10;
            px(HOLZ[rnd.between(0, 3)], x, y, 12, hoeh);
            px(HOLZ[0], x, y, 12, 2);                                          // helle Oberkante
            px(DUNKEL, x + 12, y, 2, hoeh);                                    // Fuge
            if (!ende && rnd.frac() < 0.25) px(DUNKEL, x + 4, y + 4, 4, 2);    // Astloch
        }
        // --- Tragbalken unter dem Deck und Fachwerk (obere und untere Gurt, gekreuzte Streben)
        const x0 = links ? l : l + bruch * 0.6, x1 = rechts ? r : r - bruch * 0.6;
        if (x1 > x0) {
            px(BALKEN, x0, y + 10, x1 - x0, 6); px(BALKEN_HELL, x0, y + 10, x1 - x0, 2);                       // oberer Gurt
            px(BALKEN, x0, y + 10 + TIEFE, x1 - x0, 6); px(BALKEN_HELL, x0, y + 10 + TIEFE, x1 - x0, 2);       // unterer Gurt
            const feld = Math.max(28, Math.round((x1 - x0) / Math.max(1, Math.round((x1 - x0) / 56))));
            for (let fx = x0; fx + feld <= x1 + 1; fx += feld) {                                                // Streben: X in jedem Feld
                strebe(fx, y + 16, fx + feld, y + 10 + TIEFE, BALKEN); strebe(fx + feld, y + 16, fx, y + 10 + TIEFE, BALKEN);
                px(BALKEN, fx - 3, y + 16, 6, TIEFE - 6);                                                      // senkrechter Pfosten zwischen den Feldern
            }
            px(BALKEN, x1 - 3, y + 16, 6, TIEFE - 6);
        }
        // --- Wandanschluss: dicke Balken, die in die Felswand reichen, mit Eisenbeschlag
        for (const [istAnker, wand, richt] of [[links, l, -1], [rechts, r, 1]]) {
            if (!istAnker) continue;
            px(BALKEN, wand - (richt < 0 ? 0 : 0) + (richt < 0 ? -6 : 0), y + 8, 6, TIEFE + 12);                // Auflagebalken an der Wand
            px(BALKEN_HELL, wand + (richt < 0 ? -6 : 0), y + 8, 2, TIEFE + 12);
            for (const yy of [y + 12, y + 10 + TIEFE]) { px(EISEN, wand - 4 + (richt < 0 ? -4 : 2), yy, 10, 6); px(0x7a7a7a, wand - 2 + (richt < 0 ? -4 : 2), yy + 2, 2, 2); }
        }
        // --- Geländer: Pfosten alle ~56 Pixel (auch an den Enden), oben ein Handlauf, dazwischen ein durchhängendes Seil
        const pfosten = [];
        for (let x = l + 6; x <= r - 6; x += 56) pfosten.push(x);
        if (pfosten[pfosten.length - 1] < r - 12) pfosten.push(r - 6);
        const stehtNoch = (x) => !nahEnde(x) || rnd.frac() < 0.3;
        let vorher = null;
        for (const x of pfosten) {
            if (!stehtNoch(x)) { vorher = null; continue; }
            const hoch = nahEnde(x) ? rnd.between(18, 26) : 38;                // abgeknickte Pfosten am freien Ende
            px(HOLZ[2], x - 3, y - hoch, 6, hoch); px(HOLZ[0], x - 3, y - hoch, 2, hoch); px(DUNKEL, x + 1, y - hoch, 2, hoch);
            px(HOLZ[1], x - 4, y - hoch - 2, 8, 4);                            // Pfostenkappe
            if (vorher && Math.abs(x - vorher.x) < 80) {                       // Seil zwischen den Pfosten, in der Mitte durchhängend
                const n = Math.round((x - vorher.x) / 4);
                for (let i = 0; i <= n; i++) { const t = i / n, yy = vorher.y + (y - hoch - vorher.y) * t + 7 * Math.sin(Math.PI * t) + 6; px(SEIL, vorher.x + (x - vorher.x) * t, yy, 4, 3); }
            }
            vorher = { x, y: y - hoch };
        }
        // --- Abbruch: ein Brett baumelt an einem Seil, Splitter am Ende
        if (!ganz) {
            const richt = links ? 1 : -1, ende = links ? r : l;
            px(HOLZ[2], ende - richt * 18, y + 10, 10, 6); px(HOLZ[2], ende - richt * 16, y + 16, 10, 16); px(DUNKEL, ende - richt * 8, y + 16, 2, 16);
            px(SEIL, ende - richt * 12, y + 8, 2, 8);
            for (let k = 0; k < 4; k++) px(HOLZ[3], ende - richt * (6 + k * 8), y + 10 + TIEFE * 0.4, 4, 6 + rnd.between(0, 8));    // zersplitterte Balkenenden
        }
        // Ranken am Fachwerk
        for (let x = l + 20; x < r - 10; x += rnd.between(70, 140)) if (!nahEnde(x)) for (let k = 0; k < rnd.between(3, 7); k++) px(rnd.pick([0x2c7a2e, 0x3e9a38]), x + (k % 2 ? 2 : 0), y + 16 + k * 4, 4, 4);
    }
}

// ---- Kriegsüberreste (aus level.reste): reine Dekoration, die das Schlachtfeld erzählt ----
//   sperre      Panzersperre (drei gekreuzte Stahlträger)           draht     Rolle Stacheldraht (breite = Pixel)
//   tonne       brennende Tonne mit Flammen und Funken              hubschrauber  abgestürztes Hubschrauberwrack mit Rauchsäule
//   mauer       Mauerrest (breite, hoehe in Pixeln)                  graeber   Reihe einfacher Gräber (anzahl)
//   zelt        Armeezelt                                            banner    zerfetztes Banner des Gegners
export function buildKriegsreste(scene, level) {
    const rnd = new Phaser.Math.RandomDataGenerator(['kriegsreste']);
    const g = scene.add.graphics().setDepth(2.2), hinten = scene.add.graphics().setDepth(-2.8);
    const px = (gr, c, x, y, w, h, a = 1) => gr.fillStyle(c, a).fillRect(Math.round(x), Math.round(y), w, h);
    const feuer = [];
    const balken = (gr, c0, x0, y0, x1, y1, c) => {
        const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / 3));
        for (let i = 0; i <= n; i++) px(gr, c, x0 + (x1 - x0) * i / n - 3, y0 + (y1 - y0) * i / n - 3, 6, 6);
    };
    for (const d of level.reste ?? []) {
        const x = d.x, y = d.y;
        if (d.art === 'sperre') {
            const ROST = [0x4a3a2c, 0x6a5038, 0x2e241c];
            balken(g, 0, x - 18, y, x + 18, y - 40, ROST[1]); balken(g, 0, x + 18, y, x - 18, y - 40, ROST[1]); balken(g, 0, x - 20, y - 18, x + 20, y - 22, ROST[0]);
            px(g, ROST[2], x - 24, y - 4, 10, 4); px(g, ROST[2], x + 14, y - 4, 10, 4); px(g, 0x8a6a48, x - 2, y - 24, 4, 4);
        } else if (d.art === 'draht') {
            const w = d.breite ?? 112, n = Math.round(w / 14);
            px(g, 0x3a2a1a, x - w / 2 - 4, y - 24, 6, 24); px(g, 0x3a2a1a, x + w / 2 - 2, y - 24, 6, 24);
            for (let i = 0; i < n; i++) {
                const cx = x - w / 2 + 7 + i * 14, cy = y - 12 + (i % 2 ? 2 : -2);
                for (const [dx, dy] of [[-6, 0], [-4, -4], [0, -6], [4, -4], [6, 0], [4, 4], [0, 6], [-4, 4]]) px(g, 0x9a9a9a, cx + dx - 1, cy + dy - 1, 2, 2);
                px(g, 0x3a3a3a, cx - 2, cy - 1, 4, 2);
            }
            for (let i = 0; i < 4; i++) px(g, 0xb0b0b0, x - w / 2 + 10 + rnd.between(0, w - 20), y - 24 + rnd.between(0, 20), 2, 2);   // Stacheln
        } else if (d.art === 'tonne') {
            px(g, 0x6a3a22, x - 12, y - 34, 24, 34); px(g, 0x8a4a2a, x - 12, y - 34, 4, 34); px(g, 0x3a1e12, x + 8, y - 34, 4, 34);
            px(g, 0x2a1810, x - 12, y - 26, 24, 3); px(g, 0x2a1810, x - 12, y - 10, 24, 3); px(g, 0x1a1008, x - 10, y - 36, 20, 4);
            feuer.push({ x, y: y - 36, s: 1 });
        } else if (d.art === 'hubschrauber') {
            const OL = [0x2e3226, 0x3a3f2e, 0x4a5238], RUSS = 0x14160f;
            px(hinten, 0x000000, x - 90, y - 4, 190, 5, 0.3);                                           // Schatten
            px(hinten, OL[1], x - 70, y - 44, 100, 36); px(hinten, OL[2], x - 70, y - 44, 100, 5); px(hinten, RUSS, x - 70, y - 22, 100, 14);
            for (let i = 0; i < 7; i++) px(hinten, RUSS, x - 66 + i * 14 + rnd.between(0, 6), y - 40 + rnd.between(0, 24), rnd.pick([8, 12, 16]), rnd.pick([6, 10]));   // Brandflecken
            px(hinten, 0x4a6868, x - 66, y - 40, 22, 18); px(hinten, 0x1a2a2a, x - 60, y - 36, 4, 12); px(hinten, 0x1a2a2a, x - 52, y - 30, 8, 4);   // zerbrochene Scheibe
            px(hinten, OL[0], x + 30, y - 22, 70, 10); px(hinten, OL[1], x + 30, y - 22, 70, 3); px(hinten, OL[0], x + 92, y - 40, 6, 28);          // abgerissenes Heck mit Flosse
            px(hinten, OL[0], x + 14, y - 12, 18, 6);                                                    // Bruchkante
            px(hinten, 0x1a1a1a, x - 14, y - 52, 6, 10);                                                 // Rotormast
            balken(hinten, 0, x - 11, y - 52, x - 66, y - 30, 0x22241a); balken(hinten, 0, x - 11, y - 52, x + 44, y - 26, 0x22241a);        // hängende Rotorblätter
            px(hinten, 0x22241a, x - 60, y - 8, 90, 4); px(hinten, 0x22241a, x - 56, y - 14, 4, 8); px(hinten, 0x22241a, x + 20, y - 14, 4, 8);  // Kufen
            for (let k = 0; k < 4; k++) {                                                                // Rauchsäule
                const r = scene.add.circle(x - 20 + rnd.between(-8, 8), y - 50, rnd.between(8, 14), 0x222222, 0.35).setDepth(-2.7);
                scene.tweens.add({ targets: r, y: y - 180, x: r.x + rnd.between(-30, 30), alpha: 0, scale: 2.4, duration: 3600 + k * 500, delay: k * 900, repeat: -1 });
            }
            feuer.push({ x: x - 10, y: y - 40, s: 0.8 });
        } else if (d.art === 'mauer') {
            const w = d.breite ?? 168, hh = d.hoehe ?? 112, BETON = [0x6a6a66, 0x5e5e5a, 0x74746e];
            let hoch = rnd.between(hh * 0.5, hh);
            for (let xx = 0; xx < w; xx += 8) {
                if (xx % 32 === 0) hoch = Math.max(hh * 0.3, Math.min(hh, hoch + rnd.pick([-32, -16, 0, 0, 16, 32])));      // Bruchkante in groben Stufen
                const hq = Math.round(hoch / 8) * 8;
                for (let yy = 0; yy < hq; yy += 8) { px(hinten, rnd.pick(BETON), x - w / 2 + xx, y - yy - 8, 8, 8); if (yy % 16 === 0) px(hinten, 0x44443f, x - w / 2 + xx, y - yy - 8, 8, 1); }
                if (rnd.frac() < 0.15) px(hinten, 0x2a2a28, x - w / 2 + xx + 2, y - hq - rnd.between(6, 18), 2, rnd.between(8, 18));   // Armierungseisen
            }
            for (let k = 0; k < Math.max(1, Math.floor(w / 70)); k++) px(hinten, 0x2a2a28, x - w / 2 + 14 + k * 62 + rnd.between(0, 10), y - 40, 18, 22);    // Fensterloch
        } else if (d.art === 'graeber') {
            const n = d.anzahl ?? 4;
            for (let i = 0; i < n; i++) {
                const gx = x - (n - 1) * 14 + i * 28;
                px(g, 0x4a3828, gx - 9, y - 5, 18, 5); px(g, 0x5a4634, gx - 7, y - 7, 14, 3);                   // Hügel
                px(g, 0x6a5238, gx - 2, y - 30, 4, 26); px(g, 0x6a5238, gx - 7, y - 24, 14, 4);                  // Kreuz
                if (i % 2 === 0) { px(g, 0x4a5238, gx - 5, y - 36, 10, 6); px(g, 0x2e3226, gx - 5, y - 32, 10, 2); }   // Helm
            }
        } else if (d.art === 'zelt') {
            const w = d.breite ?? 150, hh = 70, OL = [0x4a5238, 0x5a6244, 0x3a4028];
            for (let yy = 0; yy < hh; yy += 4) {
                const halb = (w / 2) * (1 - yy / hh);
                px(hinten, yy % 8 ? OL[0] : OL[1], x - halb, y - yy - 4, halb * 2, 4);
            }
            px(hinten, 0x14160f, x - 14, y - 36, 28, 36); px(hinten, 0x3a3a30, x - 12, y - 34, 24, 4);           // Eingang
            balken(hinten, 0, x - w / 2, y, x - w / 2 - 14, y + 0, 0x6a5a3a); px(hinten, 0x6a5238, x - w / 2 - 6, y - 30, 3, 30); px(hinten, 0x6a5238, x + w / 2 + 3, y - 30, 3, 30);
        } else if (d.art === 'kisten') {
            // Kistenstapel: unten zwei bis drei Kisten, darauf eine oder zwei; einzelne mit Aufdruck, eine Plane obenauf
            const HOLZ = [0x7a6540, 0x6b5636, 0x8a7448], N = d.anzahl ?? rnd.between(2, 4);
            const kiste = (kx, ky, w, h) => {
                px(g, rnd.pick(HOLZ), kx, ky - h, w, h); px(g, 0x4a3d26, kx, ky - h, w, 3); px(g, 0x4a3d26, kx, ky - 3, w, 3);
                px(g, 0x4a3d26, kx, ky - h, 3, h); px(g, 0x4a3d26, kx + w - 3, ky - h, 3, h);
                for (let i = 0; i < Math.round(w / 6); i++) px(g, 0x5a4a2c, kx + 3 + i * 6, ky - h + 3, 1, h - 6);                    // Bretter
                strebeK(kx + 3, ky - h + 3, kx + w - 3, ky - 3);
                if (rnd.frac() < 0.4) { px(g, 0xc8b040, kx + w / 2 - 6, ky - h / 2 - 3, 12, 6); px(g, 0x2a2410, kx + w / 2 - 4, ky - h / 2 - 1, 8, 2); }   // Stempel
            };
            const strebeK = (x0, y0, x1, y1) => { const n = Math.round(Math.hypot(x1 - x0, y1 - y0) / 4); for (let i = 0; i <= n; i++) px(g, 0x5a4a2c, x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, 2, 2); };
            for (let i = 0; i < N && i < 3; i++) kiste(x - N * 15 + i * 30, y, 30, 28);
            if (N >= 3) kiste(x - N * 15 + 14, y - 28, 30, 28);
            if (N === 4) { px(g, 0x4a5238, x - 20, y - 60, 40, 6); px(g, 0x3a4028, x - 20, y - 56, 40, 2); }                            // Plane
        } else if (d.art === 'sandsaecke') {
            const reihen = d.reihen ?? 3, w = d.breite ?? 84;
            for (let rr = 0; rr < reihen; rr++) {
                const v = rr % 2 ? 14 : 0, breiteR = w - rr * 14;
                for (let xx = -breiteR / 2 + v - 14; xx < breiteR / 2; xx += 28) {
                    const sx = x + xx + (rr * 7), sw = 27;
                    px(g, rnd.pick([0xb5a47a, 0xa89868, 0xbcae84]), sx, y - 14 - rr * 14, sw, 13); px(g, 0xcfc29a, sx, y - 14 - rr * 14, sw, 2);
                    px(g, 0x6a5c3e, sx, y - 3 - rr * 14, sw, 2); px(g, 0x7a6c48, sx + 12, y - 9 - rr * 14, 3, 5);
                }
            }
        } else if (d.art === 'auto') {
            const k = scene.add.image(x, y + 2, `auto_${d.nr ?? rnd.between(0, 2)}`).setOrigin(0.5, 1).setDepth(-3);
            if (rnd.frac() < 0.5) k.setFlipX(true);
        } else if (d.art === 'strommast') {
            const hh = d.hoehe ?? 190;
            px(g, 0x4a3a28, x - 4, y - hh, 8, hh); px(g, 0x6a5238, x - 4, y - hh, 2, hh); px(g, 0x2a2018, x + 2, y - hh, 2, hh);
            px(g, 0x4a3a28, x - 28, y - hh + 14, 56, 6); px(g, 0x4a3a28, x - 20, y - hh + 40, 40, 5);
            px(g, 0x4a3a28, x - 14, y - hh + 20, 4, 18); px(g, 0x4a3a28, x + 10, y - hh + 20, 4, 18);                       // Streben
            for (const dx of [-26, -10, 10, 24]) px(g, 0x9aa8b0, dx + x - 2, y - hh + 8, 4, 8);                                // Isolatoren
            for (const [dx, richt] of [[-24, -1], [24, 1]]) {                                                                     // abgerissene Kabel hängen herab
                for (let i = 0; i < 12; i++) px(g, 0x14110e, x + dx + richt * i * 3, y - hh + 14 + Math.round(i * i * 0.7), 3, 2);
            }
            px(g, 0x2a2018, x - 10, y - 6, 20, 6);
        } else if (d.art === 'schienen') {
            const w = d.breite ?? 224;
            for (let sx = x - w / 2; sx < x + w / 2; sx += 14) px(g, 0x4a331d, sx, y - 4, 8, 4);                                 // Schwellen
            px(g, 0x77746e, x - w / 2, y - 6, w, 2); px(g, 0x4a4844, x - w / 2, y - 4, w, 1);                                      // Schiene
            if (d.wagen) {                                                                                                         // Grubenwagen mit Gestein
                const wx = x + (d.wagenX ?? 0);
                px(g, 0x6b3a22, wx - 24, y - 34, 48, 26); px(g, 0x8a4a2a, wx - 24, y - 34, 48, 4); px(g, 0x4a2a18, wx - 26, y - 38, 52, 5);
                px(g, 0x222222, wx - 16, y - 12, 11, 11); px(g, 0x222222, wx + 6, y - 12, 11, 11);
                px(g, 0x8c8474, wx - 14, y - 44, 14, 8); px(g, 0x77716a, wx + 4, y - 46, 12, 10); px(g, 0x948c7c, wx - 4, y - 42, 8, 6);
            }
        } else if (d.art === 'stuetze') {
            // Grubenstütze: vom Boden y bis zur Decke darüber (wird aus den Blöcken gesucht). Pfosten mit Kopfbalken, Fußplatte und Streben.
            let decke = -Infinity;
            for (const p of level.platforms) {
                if (p.brechbar || p.bruecke || p.innen) continue;
                const u = p.y + p.h / 2;
                if (u < y - 40 && u > decke && Math.abs(x - p.x) <= p.w / 2 - 2) decke = u;
            }
            const gap = y - decke;
            if (!isFinite(decke) || gap < 90 || gap > 420) continue;
            const HOLZ = [0x3a2c1e, 0x4c3926, 0x5a4630];
            px(hinten, HOLZ[0], x - 6, decke, 12, gap); px(hinten, HOLZ[1], x - 6, decke, 4, gap);                              // Pfosten
            px(hinten, HOLZ[0], x - 28, decke, 56, 12); px(hinten, HOLZ[2], x - 28, decke, 56, 3);                              // Kopfbalken
            px(hinten, HOLZ[0], x - 12, y - 6, 24, 6);                                                                           // Fußplatte
            if (gap > 130) for (const richt of [-1, 1]) balken(hinten, 0, x + richt * 6, decke + 12, x + richt * 30, decke + 40, HOLZ[0]);   // Streben unter dem Kopfbalken
            if (rnd.frac() < 0.5) px(hinten, 0x2c5a24, x + 6, decke + 14 + rnd.between(0, 20), 4, rnd.between(10, 30));         // Ranke
        } else if (d.art === 'wellblech') {
            // Ein Unterstand aus Wellblech: schräges Dach auf zwei Pfosten, daneben angelehnte Bretter
            const w = d.breite ?? 120;
            px(g, 0x4a3a28, x - w / 2, y - 60, 6, 60); px(g, 0x4a3a28, x + w / 2 - 6, y - 80, 6, 80);
            for (let i = 0; i < w; i += 4) { const hy = y - 64 - Math.round(i / w * 20); px(g, i % 8 ? 0x7a6a58 : 0x8a7a68, x - w / 2 + i, hy, 4, 8); px(g, 0x5a4a38, x - w / 2 + i, hy + 8, 4, 2); }
            px(g, 0x6a3a22, x - w / 2 + 14, y - 34, 18, 6); px(g, 0x6a3a22, x - w / 2 + 14, y - 22, 18, 6);                      // Rost
            px(hinten, 0x2a2018, x - w / 2 + 6, y - 60, w - 12, 60, 0.5);
        } else if (d.art === 'reifen') {
            for (let i = 0; i < (d.anzahl ?? 3); i++) {
                const rx = x + i * 20 - 20, ry = y - 18 - (i === 2 ? 16 : 0);
                px(g, 0x141414, rx, ry, 22, 18); px(g, 0x2a2a2a, rx + 4, ry + 4, 14, 10); px(g, 0x0b0b0b, rx + 8, ry + 7, 6, 4); px(g, 0x3a3a3a, rx + 2, ry + 2, 6, 2);
            }
        } else if (d.art === 'banner') {
            px(g, 0x2a2018, x - 2, y - 110, 4, 110); px(g, 0x6a5a3a, x - 4, y - 114, 8, 6);
            for (let i = 0; i < 40; i += 4) { const h = 36 - Math.floor(i / 8) * 4 + rnd.between(-2, 2); px(g, i % 8 ? 0x6a1a14 : 0x7a2018, x + 2 + i, y - 106 + Math.round(Math.sin(i * 0.4) * 2), 4, h); }
            px(g, 0x14110e, x + 12, y - 92, 14, 14);
        }
    }
    // Feuer (Flammen und Funken) flackern: alle in einem Zeichner, jedes Bild neu
    if (feuer.length) {
        const f = scene.add.graphics().setDepth(2.3);
        const zeichne = () => {
            f.clear();
            const t = scene.time.now;
            const k = scene.cameras.main, v = k.worldView;
            for (const e of feuer) {
                if (e.x < v.x - 80 || e.x > v.right + 80 || e.y < v.y - 120 || e.y > v.bottom + 80) continue;
                f.fillStyle(0xff7a1a, 0.10 + 0.04 * Math.sin(t * 0.01 + e.x)).fillCircle(e.x, e.y - 8, 46 * e.s);                       // Schein
                for (let i = 0; i < 3; i++) {
                    const ph = t * 0.012 + i * 2.1 + e.x, h = (16 + 8 * Math.sin(ph) + i * 3) * e.s, w = (10 - i * 2) * e.s;
                    f.fillStyle(i === 0 ? 0xd8501a : (i === 1 ? 0xff9a2a : 0xffe070)).fillRect(Math.round(e.x - w / 2 + Math.sin(ph * 1.3) * 2), Math.round(e.y - h), Math.round(w), Math.round(h));
                }
                const fk = (t * 0.06 + e.x) % 60;
                f.fillStyle(0xffc060, 1 - fk / 60).fillRect(Math.round(e.x + Math.sin(fk * 0.3 + e.x) * 8), Math.round(e.y - 20 - fk), 2, 2);   // Funke
            }
        };
        scene.events.on('update', zeichne);
        scene.events.once('shutdown', () => scene.events.off('update', zeichne));
    }
}

export function buildBruecken(scene, level) {
    const rnd = new Phaser.Math.RandomDataGenerator(['bruecken']);
    const g = scene.add.graphics().setDepth(-2);
    const kappe = scene.add.graphics().setDepth(2);     // Asphalt liegt über den Platten
    for (const b of level.bruecken ?? []) {
        if (b.art === 'stahl') b.stuecke.forEach(([a, c, oben]) => fachwerk(g, rnd, a, c, oben));
        else if (b.art === 'seil') seilbruecke(g, rnd, b.stuecke);
        else if (b.art === 'autobahn') autobahnReste(kappe, g, rnd, b.stuecke);
    }
}


// Die Metalltreppe am Höhleneingang: Wangen (Schrägbalken) unter den Stufen, Warnstreifen an den Stufenkanten,
// Geländerpfosten mit Handlauf, Rost und eine abgerissene Kette. Die Stufen selbst stehen in Level01.js.
function buildTreppen(scene, level) {
    const rnd = new Phaser.Math.RandomDataGenerator(['treppen']);
    const unten = scene.add.graphics().setDepth(-1);   // hinter den Stufen
    const oben = scene.add.graphics().setDepth(2);     // vor den Stufen, hinter dem Spieler
    for (const t of level.treppen ?? []) {
        const n = t.anzahl, B = t.breite;
        const x0 = t.links, y0 = t.oben0;
        const x1 = x0 + n * B, y1 = y0 + (n - 1) * t.hoehe;
        for (let k = 0; k < 2; k++) strebe(unten, 0x4a4036, x0 + 4, y0 + 10 + k * 4, x1 - 12, y1 + 10 + k * 4);   // zwei Wangen
        for (let i = 1; i < n; i += 2) {                                                                         // Stützen unter jeder zweiten Stufe
            const x = x0 + i * B + 14, y = y0 + i * t.hoehe + 12;
            unten.fillStyle(0x3a342c).fillRect(x, y, 5, Math.min(120, level.boden + 230 - y));
        }
        for (let i = 0; i < n; i++) {
            const x = x0 + i * B, y = y0 + i * t.hoehe;
            for (let s = 0; s < B; s += 8) oben.fillStyle((s / 8) % 2 ? 0x1a1a1a : 0xc9a227).fillRect(x + s, y, 8, 3);   // Warnstreifen
            oben.fillStyle(0x5a554f).fillRect(x + B - 8, y - 30, 4, 30);                                          // Geländerpfosten
            if (rnd.frac() < 0.5) oben.fillStyle(0x8a4a22).fillRect(x + rnd.between(0, B - 4), y + 3, 2, rnd.between(6, 14));   // Rostspur
        }
        strebe(oben, 0x7a746c, x0 + B - 8, y0 - 30, x0 + (n - 1) * B + B - 8, y1 - 30);                            // Handlauf
        for (let k = 0; k < 5; k++) oben.fillStyle(0x6a665e).fillRect(x0 + 8, y0 - 30 + k * 5, 3, 4);              // abgerissene Kette am ersten Pfosten
    }
}


// Gerüst für die Holzabsätze in den Schächten: Eine Strebe (Knagge) stützt jeden Absatz von der Wand her,
// Bolzen halten sie an der Wand, und am freien Ende hängt eine Kette zum nächsten Absatz (zum Festhalten).
function buildGeruest(scene, level) {
    const g = scene.add.graphics().setDepth(-1);      // vor der Höhlenwand, hinter den Absätzen
    for (const e of level.geruest ?? []) {
        const links = e.wand === 'links';
        const wandX = links ? e.x0 : e.x1;
        const richtung = links ? 1 : -1;
        // Strebe: von der Wand (60 unter dem Absatz) schräg bis fast zum freien Ende (Unterseite)
        strebe(g, 0x4a331d, wandX + richtung * 6, e.oben + 62, wandX + richtung * 104, e.oben + 20);
        strebe(g, 0x4a331d, wandX + richtung * 6, e.oben + 66, wandX + richtung * 104, e.oben + 24);
        g.fillStyle(0x2a2a2a).fillRect(wandX + (links ? 2 : -8), e.oben + 56, 6, 6).fillRect(wandX + (links ? 2 : -8), e.oben + 8, 6, 6);   // Bolzen
        // Kette am freien Ende zum nächsten Absatz
        const kx = links ? e.x1 - 10 : e.x0 + 10;
        for (let y = e.oben + 20; y < e.oben + 92; y += 6) g.fillStyle(0x6a665e).fillRect(kx - ((y / 6) % 2 ? 2 : 1), y, (y / 6) % 2 ? 4 : 2, 5);
    }
}


// Fördergerüst über den Minenschächten: zwei schräge Stützen im Stil eines A, ein Querbalken, ein Seilrad oben
// und ein Seil, das in den Schacht hinabhängt. So hat der Schacht einen Grund, warum er im Boden ist.
function buildSchachtkoepfe(scene, level) {
    const g = scene.add.graphics().setDepth(-1);
    for (const s of level.schachtkoepfe ?? []) {
        const mitte = (s.links + s.rechts) / 2, boden = level.boden, spitze = boden - 150;
        for (const [x0, x1] of [[s.links - 8, mitte - 6], [s.rechts + 8, mitte + 6]]) {          // zwei Stützen, oben zusammenlaufend
            for (let k = 0; k < 2; k++) strebe(g, 0x5a3d22, x0 + k * 4, boden, x1 + k * 4, spitze);
        }
        g.fillStyle(0x5a3d22).fillRect(s.links + 6, boden - 70, s.rechts - s.links - 12, 8);       // Querbalken
        g.fillStyle(0x3a2a18).fillRect(mitte - 22, spitze - 10, 44, 8);                            // Kopfbalken
        g.fillStyle(0x333333).fillRect(mitte - 12, spitze - 8, 24, 24);                           // Seilrad (Nabe)
        g.fillStyle(0x555555).fillRect(mitte - 8, spitze - 12, 16, 32).fillRect(mitte - 16, spitze - 4, 32, 16);
        g.fillStyle(0x8a7a52).fillRect(mitte - 1, spitze + 16, 3, 150);                            // Seil in den Schacht
        g.fillStyle(0x3a3a3a).fillRect(mitte - 6, spitze + 164, 12, 8);                            // Haken
    }
}

// Verteilt alles in der Welt. Die Höhe des Bodens an jeder Stelle liest die Funktion "oben" aus den
// festen Blöcken (Erde, Fels, Bunker) der Leveldaten. Dort, wo kein Boden ist (Schächte, Schlucht),
// wird nichts gesetzt.
export function buildLandscape(scene, level) {
    const rnd = new Phaser.Math.RandomDataGenerator(['landschaft']);
    erzeugeTexturen(scene);
    const BODEN = level.boden;
    const fest = level.platforms.filter(p => (p.h >= 40 || p.kollision) && (p.gras !== undefined ? p.gras : p.y - p.h / 2 <= BODEN + 1));
    const oben = (x) => {
        let y = Infinity;
        for (const p of fest) if (Math.abs(x - p.x) <= p.w / 2 - 3) y = Math.min(y, p.y - p.h / 2);
        return y;
    };
    // Bereiche mit wichtigen Bauwerken (Bunker, Hochhaus, Funkturm, Arena): hier nur kleine Pflanzen
    const sperre = level.sperre ?? [[4250, 4900], [6300, 7300], [10150, 10700], [13850, 14850], [13440, 15640], [16050, 17050]];
    const gesperrt = (x) => sperre.some(([a, b]) => x >= a && x <= b);
    const bild = (key, x, y, tiefe, ursprungY = 1) => scene.add.image(x, y, key).setOrigin(0.5, ursprungY).setDepth(tiefe);

    // 1. Verfallene Gebäude im Hintergrund (nur am Boden, nicht auf Klippen)
    const neuAb = level.neuAb ?? Infinity;                                    // ab hier das Gelände aus der Skizze: Häuser, Autos usw. stehen auf jeder ebenen Fläche, nicht nur auf Höhe 0
    const eben = (x, w = 70) => { const y = oben(x); return isFinite(y) && Math.abs(oben(x - w) - y) < 2 && Math.abs(oben(x + w) - y) < 2; };
    for (let x = 160; x < level.width - 200; x += rnd.between(240, 480)) {
        if (gesperrt(x)) continue;
        if (x >= neuAb) { if (eben(x, 90)) bild(`ruine_${rnd.between(0, 5)}`, x, oben(x) + 3, -10); continue; }
        if (Math.abs(oben(x) - BODEN) > 2) continue;
        bild(`ruine_${rnd.between(0, 5)}`, x, BODEN + 3, -10);
    }
    // 2. Bäume, Büsche, Farne, Wracks, Zäune, Laternen, Trümmer
    let letztesWrack = -9999;
    for (let x = 60; x < level.width - 60; x += rnd.between(55, 130)) {
        const y = oben(x);
        if (!isFinite(y)) continue;
        const wurf = rnd.frac();
        const frei = !gesperrt(x);
        if (wurf < 0.08 && frei) bild(`baum_${rnd.between(0, 2)}`, x, y + 2, -4);
        else if (wurf < 0.15 && frei) bild(`totbaum_${rnd.between(0, 2)}`, x, y + 2, -4);
        else if (wurf < 0.25) bild(`busch_${rnd.between(0, 3)}`, x, y + 3, -3);
        else if (wurf < 0.31) bild(`farn_${rnd.between(0, 2)}`, x, y + 3, -3);
        else if (wurf < 0.36 && frei && (x >= neuAb ? eben(x, 60) : y >= BODEN - 2) && x - letztesWrack > (x >= neuAb ? 420 : 900)) { bild(`auto_${rnd.between(0, 2)}`, x, y + 2, -3); letztesWrack = x; }
        else if (wurf < 0.43 && frei) bild(`zaun_${rnd.between(0, 1)}`, x, y + 2, -3);
        else if (wurf < 0.48 && frei) bild('laterne_0', x, y + 2, -3);
        else if (wurf < 0.62) bild(`truemmer_${rnd.between(0, 2)}`, x, y + 3, -3);
    }
    buildStuetzen(scene, level);   // Säulen und Mauerreste unter bzw. auf den schwebenden Plattformen
    buildBruecken(scene, level);   // Fachwerk, Seile und Autobahn-Reste
    buildKriegsreste(scene, level);      // Panzersperren, Stacheldraht, brennende Tonnen, Hubschrauberwrack, Mauerreste, Gräber, Zelte, Banner
    buildHaengebruecken(scene, level);   // Brücken aus der Skizze: an den Wänden befestigt, ohne Stützen
    buildGeruest(scene, level);    // Streben und Ketten an den Holzabsätzen
    buildSchachtkoepfe(scene, level);   // Fördergerüste über den Minenschächten
    buildTreppen(scene, level);    // (Treppen-Dekoration, falls vorhanden)
    // Fahrzeugwracks, die in Level01.js als begehbare Blöcke stehen
    for (const w of level.wracks ?? []) {
        const key = `wrack_${w.w}_${w.h}`;
        textur(scene, key, w.w, w.h, (r, rnd) => zeichnePanzer(r, rnd, w.w, w.h));
        scene.add.image(w.x, w.y + 1, key).setOrigin(0.5, 1).setDepth(3);
    }
    // 3. Hohes Gras im Vordergrund (vor dem Spieler, sehr niedrig, damit es nichts verdeckt)
    for (let x = 20; x < level.width - 20; x += rnd.between(60, 130)) {
        const y = oben(x);
        if (!isFinite(y)) continue;
        bild(`tuft_${rnd.between(0, 4)}`, x, y + 3, 7);
    }
}
