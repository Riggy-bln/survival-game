// Die Landschaft: verlassene, zugewachsene Ruinen, Bäume, Büsche, Farne, Autowracks, Zäune.
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
// Verfallene Gebäude für den Hintergrund. Alles etwas abgedunkelt, damit sie zurücktreten.
function zeichneRuine(r, rnd, w, h) {
    const D = 28;                                  // Abdunklung für den Hintergrund
    const basis = rnd.pick([0x4a4e52, 0x57524b, 0x454a45, 0x5a5650]);
    const S = 8;
    // Ausgefranste Oberkante: jede 8-Pixel-Spalte hat eine eigene Höhe, benachbarte unterscheiden sich wenig
    const tops = [];
    let t = rnd.between(0, Math.floor(h * 0.2));
    for (let x = 0; x < w; x += S) {
        t = Math.max(0, Math.min(Math.floor(h * 0.35), t + rnd.pick([-24, -16, -8, 0, 0, 8, 16])));
        tops.push(t);
        r.rect(variiere(basis, rnd.between(-6, 6) - D), x, t, S, h - t);
    }
    // Schattenseite rechts
    r.rect(0x000000, w - 10, tops[tops.length - 1], 10, h - tops[tops.length - 1], 0.25);
    // Fenster in Reihen, manche zerbrochen, manche zugewachsen
    for (let y = 40; y < h - 40; y += 52) {
        for (let x = 14; x < w - 30; x += 38) {
            const top = tops[Math.floor(x / S)];
            if (y < top + 12 || rnd.frac() < 0.15) continue;
            r.rect(0x14181b, x, y, 20, 28);
            r.rect(variiere(basis, 14 - D), x - 2, y - 2, 24, 3);                            // Sturz
            if (rnd.frac() < 0.3) { r.rect(0x20262a, x + 4, y, 4, 28); r.rect(0x20262a, x + 12, y + 8, 4, 20); }   // Glasreste
            if (rnd.frac() < 0.12) {                                                         // Pflanzen wachsen heraus
                laub(r, rnd, x + 10, y + 26, 10, 7, D);
                ranke(r, rnd, x + rnd.between(2, 16), y + 30, rnd.between(12, 40), D);
            }
        }
    }
    // Risse
    for (let i = 0; i < w / 60; i++) {
        let cx = rnd.between(6, w - 6), cy = rnd.between(tops[Math.floor(cx / S)] + 8, h - 40);
        for (let k = 0; k < rnd.between(3, 6); k++) { r.rect(0x0c0e10, cx, cy, 2, 6, 0.8); cx += rnd.pick([-3, 3]); cy += 5; }
    }
    // Armierungseisen ragen aus den Bruchkanten
    for (let i = 0; i < 4; i++) {
        const cx = rnd.between(4, w - 6) , top = tops[Math.floor(cx / S)];
        pLinie(r, 0x2a2420, cx, top, cx + rnd.between(-6, 6), top - rnd.between(10, 24), 2);
    }
    // Ranken hängen von der Oberkante und von Simsen herab
    for (let i = 0; i < w / 40; i++) {
        const x = rnd.between(2, w - 6);
        ranke(r, rnd, x, tops[Math.floor(x / S)], rnd.between(20, Math.floor(h * 0.6)), D);
    }
    // Efeu an den Ecken, Moos und Gebüsch am Fuß
    for (const seite of [0, w - 12]) {
        for (let y = h; y > h - rnd.between(60, Math.floor(h * 0.8)); y -= 6) {
            r.rect(variiere(rnd.pick(GRUEN.slice(1, 5)), -D), seite + rnd.between(0, 4), y - 6, rnd.between(6, 12), 6);
        }
    }
    for (let x = 0; x < w; x += rnd.between(26, 56)) laub(r, rnd, x, h - 4, rnd.between(8, 14), rnd.between(4, 8), D);
    // Auf dem Dach wächst manchmal ein Baum
    if (rnd.frac() < 0.3) {
        const cx = rnd.between(24, w - 24), top = tops[Math.floor(cx / S)];
        r.rect(variiere(0x4a3322, -D), cx - 3, top - 36, 7, 38);
        laub(r, rnd, cx, top - 46, 22, 16, D);
        laub(r, rnd, cx - 14, top - 36, 12, 9, D);
    }
}

// Ein lebender Baum (verzweigt, mit dichtem Laub und Ranken).
function zeichneBaum(r, rnd, w, h) {
    const cx = w / 2, th = Math.floor(h * 0.55);
    r.rect(0x4a3322, cx - 5, h - th, 10, th);
    r.rect(0x33231a, cx + 1, h - th, 4, th);
    r.rect(0x4a3322, cx - 9, h - 8, 18, 8);                                       // Wurzelansatz
    pLinie(r, 0x4a3322, cx, h - th + 10, cx - 22, h - th - 14, 4);                 // Äste
    pLinie(r, 0x4a3322, cx, h - th + 4, cx + 24, h - th - 20, 4);
    laub(r, rnd, cx, h - th - 22, Math.floor(w * 0.32), 28);
    laub(r, rnd, cx - 28, h - th - 6, 22, 16);
    laub(r, rnd, cx + 30, h - th - 10, 22, 16);
    for (let i = 0; i < 4; i++) ranke(r, rnd, cx + rnd.between(-34, 34), h - th - 8, rnd.between(16, 56));
}

// Ein toter Baum: kahl, schief, mit Efeu an einer Seite.
function zeichneTotBaum(r, rnd, w, h) {
    const cx = w / 2 + rnd.between(-6, 6);
    r.rect(0x3a2e26, cx - 4, h - Math.floor(h * 0.7), 8, Math.floor(h * 0.7));
    r.rect(0x241b16, cx + 1, h - Math.floor(h * 0.7), 3, Math.floor(h * 0.7));
    for (const [dx, dy, l] of [[-1, 0.45, 38], [1, 0.55, 30], [-1, 0.75, 24], [1, 0.3, 26]]) {
        const y0 = h - Math.floor(h * dy);
        pLinie(r, 0x3a2e26, cx, y0, cx + dx * l, y0 - l * 0.7, 2);
        pLinie(r, 0x3a2e26, cx + dx * l, y0 - l * 0.7, cx + dx * (l + 10), y0 - l * 0.7 - 12, 2);
    }
    for (let y = h; y > h - Math.floor(h * 0.5); y -= 6) r.rect(rnd.pick(GRUEN.slice(1, 5)), cx - 5 + rnd.between(0, 4), y - 6, rnd.between(4, 8), 6);
}

function zeichneBusch(r, rnd, w, h) {
    laub(r, rnd, w * 0.3, h - 14, w * 0.28, 14);
    laub(r, rnd, w * 0.65, h - 16, w * 0.3, 16);
    laub(r, rnd, w * 0.5, h - 24, w * 0.22, 14);
    for (let i = 0; i < 4; i++) {                                     // Blüten und Beeren
        r.rect(rnd.pick([0xe6e0d0, 0xd9b43a, 0xb04a4a]), rnd.between(8, w - 12), rnd.between(h - 36, h - 10), 4, 4);
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

function zeichneZaun(r, rnd, w, h) {
    for (let x = 6; x < w - 6; x += 24) {
        r.rect(0x5a4630, x, h - rnd.between(30, 40), 5, 40);                       // Pfosten
    }
    r.rect(0x6a5438, 4, h - 34, 70, 5);                                           // Latten (eine hängt schief)
    pLinie(r, 0x6a5438, 70, h - 34, 106, h - 18, 3);
    r.rect(0x6a5438, 4, h - 20, 52, 5);
    for (let i = 0; i < 3; i++) ranke(r, rnd, rnd.between(6, w - 10), h - 34, rnd.between(10, 30));
    laub(r, rnd, 24, h - 4, 18, 8); laub(r, rnd, 90, h - 4, 14, 7);
}

function zeichneLaterne(r, rnd, w, h) {
    r.rect(0x3a4046, w / 2 - 2, 14, 5, h - 14);
    pLinie(r, 0x3a4046, w / 2, 16, w / 2 + 14, 6, 4);                              // verbogener Arm
    r.rect(0x555a5e, w / 2 + 10, 8, 14, 6);
    r.rect(0x20262a, w / 2 + 12, 14, 8, 4);                                        // kaputte Lampe
    for (let k = 0; k < 3; k++) ranke(r, rnd, w / 2 - 2 + rnd.between(-2, 2), 20 + k * 20, rnd.between(14, 40));
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

function erzeugeTexturen(scene) {
    [[150, 230], [210, 310], [130, 170], [240, 350], [180, 260], [120, 210]].forEach(([w, h], i) =>
        textur(scene, `ruine_${i}`, w, h, (r, rnd) => zeichneRuine(r, rnd, w, h)));
    for (let i = 0; i < 3; i++) textur(scene, `baum_${i}`, 130, 190 + i * 20, (r, rnd) => zeichneBaum(r, rnd, 130, 190 + i * 20));
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
    const fest = level.platforms.filter(p => p.h >= 40);
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
    const sperre = [[6380, 6920], [10225, 10545], [7400, 7660], [9640, 9900]];
    const WAND_MAX = 320;
    for (const p of level.platforms.filter(q => q.h < 40)) {
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

// Verteilt alles in der Welt. Die Höhe des Bodens an jeder Stelle liest die Funktion "oben" aus den
// festen Blöcken (Erde, Fels, Bunker) der Leveldaten. Dort, wo kein Boden ist (Schächte, Schlucht),
// wird nichts gesetzt.
export function buildLandscape(scene, level) {
    const rnd = new Phaser.Math.RandomDataGenerator(['landschaft']);
    erzeugeTexturen(scene);
    const BODEN = level.boden;
    const fest = level.platforms.filter(p => p.h >= 40 && p.y - p.h / 2 <= BODEN + 1);
    const oben = (x) => {
        let y = Infinity;
        for (const p of fest) if (Math.abs(x - p.x) <= p.w / 2 - 3) y = Math.min(y, p.y - p.h / 2);
        return y;
    };
    // Bereiche mit wichtigen Bauwerken (Bunker, Hochhaus, Funkturm, Arena): hier nur kleine Pflanzen
    const sperre = [[4250, 4800], [6300, 7300], [10150, 10700], [11450, 12450]];
    const gesperrt = (x) => sperre.some(([a, b]) => x >= a && x <= b);
    const bild = (key, x, y, tiefe, ursprungY = 1) => scene.add.image(x, y, key).setOrigin(0.5, ursprungY).setDepth(tiefe);

    // 1. Verfallene Gebäude im Hintergrund (nur am Boden, nicht auf Klippen)
    for (let x = 160; x < level.width - 200; x += rnd.between(240, 480)) {
        if (gesperrt(x) || Math.abs(oben(x) - BODEN) > 2) continue;
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
        else if (wurf < 0.36 && frei && y >= BODEN - 2 && x - letztesWrack > 900) { bild(`auto_${rnd.between(0, 2)}`, x, y + 2, -3); letztesWrack = x; }
        else if (wurf < 0.43 && frei) bild(`zaun_${rnd.between(0, 1)}`, x, y + 2, -3);
        else if (wurf < 0.48 && frei) bild('laterne_0', x, y + 2, -3);
        else if (wurf < 0.62) bild(`truemmer_${rnd.between(0, 2)}`, x, y + 3, -3);
    }
    buildStuetzen(scene, level);   // Säulen und Mauerreste unter bzw. auf den schwebenden Plattformen
    // 3. Hohes Gras im Vordergrund (vor dem Spieler, sehr niedrig, damit es nichts verdeckt)
    for (let x = 20; x < level.width - 20; x += rnd.between(60, 130)) {
        const y = oben(x);
        if (!isFinite(y)) continue;
        bild(`tuft_${rnd.between(0, 4)}`, x, y + 3, 7);
    }
}
