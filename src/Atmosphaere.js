import { MAX_BREITE } from './Anpassung.js';

// Stimmung und Tiefe für die Landschaft über der Erde: Der Himmel wechselt die Farbe je nach Ort im Level, Lichtstrahlen fallen durch den
// Rauch, Bodennebel zieht durch die Täler, und Blätter und Lianen hängen im Vordergrund vor dem Bild (Parallax schneller als die Welt).
// Alles Aufwendige wird einmal in kleine Bilder gebacken (Texturen) und dann nur noch als Bild bewegt.

const lerp = (a, b, t) => a + (b - a) * t;
const klemme = (v, a, b) => Math.max(a, Math.min(b, v));

// Malt in einen Zeichner und backt das Ergebnis als Textur (einmal pro Schlüssel).
function backeTextur(scene, key, breite, hoehe, zeichne) {
    if (scene.textures.exists(key)) return;
    const g = scene.add.graphics();
    zeichne(g);
    g.generateTexture(key, breite, hoehe);
    g.destroy();
}

// ---------------------------------------------------------------------------------------------------------------------
// Stimmung: eine farbige, durchsichtige Fläche über dem Hintergrund (aber unter der Welt). Je nach Ort im Level ändert sie sich:
// kühles Blau am Anfang, dunkles Grün in den Bergen, gelber Dunst in der Mitte, rotes Glühen vor dem Boss.
// ---------------------------------------------------------------------------------------------------------------------
const STIMMUNGEN = [
    { x: 0,     farbe: [10, 40, 60],  alpha: 0.00 },
    { x: 2500,  farbe: [10, 60, 90],  alpha: 0.10 },
    { x: 5500,  farbe: [8, 40, 28],   alpha: 0.14 },
    { x: 8500,  farbe: [120, 100, 20], alpha: 0.12 },
    { x: 11500, farbe: [90, 50, 10],  alpha: 0.12 },
    { x: 14000, farbe: [130, 30, 10], alpha: 0.17 },
    { x: 17600, farbe: [150, 20, 5],  alpha: 0.24 },
];

export function baueStimmung(scene, breite = 17600) {
    const skala = breite / 17600;               // die Orte in STIMMUNGEN gelten für ein 17600 breites Level
    const flaeche = scene.add.rectangle(0, 0, MAX_BREITE + 200, 2400, 0x000000, 0).setOrigin(0, 0).setScrollFactor(0).setDepth(-22.9);
    return {
        update(kameraMitteX) {
            let i = 0;
            const x = kameraMitteX / skala;
            while (i < STIMMUNGEN.length - 2 && x > STIMMUNGEN[i + 1].x) i++;
            const a = STIMMUNGEN[i], b = STIMMUNGEN[i + 1];
            const t = klemme((x - a.x) / (b.x - a.x), 0, 1);
            const f = a.farbe.map((v, k) => Math.round(lerp(v, b.farbe[k], t)));
            flaeche.setFillStyle((f[0] << 16) | (f[1] << 8) | f[2], lerp(a.alpha, b.alpha, t));
        },
    };
}

// ---------------------------------------------------------------------------------------------------------------------
// Lichtstrahlen: schräge, helle Streifen, die durch Rauch und Blätter fallen. Sie pulsieren sehr langsam.
// ---------------------------------------------------------------------------------------------------------------------
export function baueLichtstrahlen(scene) {
    backeTextur(scene, 'atmo_strahl', 96, 640, (g) => {
        for (let y = 0; y < 640; y += 8) {
            const breite = 24 + (y / 640) * 64;                                  // oben schmal, unten breit
            for (let x = 0; x < 96; x += 8) {
                const d = Math.abs(x + 4 - 48) / (breite / 2 + 1);                // 0 in der Mitte, 1 am Rand
                if (d >= 1) continue;
                const alpha = (1 - d) * (1 - y / 760) * 0.55;
                g.fillStyle(0xfff0b0, Math.round(alpha * 10) / 10).fillRect(x, y, 8, 8);
            }
        }
    });
    const rnd = new Phaser.Math.RandomDataGenerator(['strahlen']);
    for (let i = 0; i < 6; i++) {
        const s = scene.add.image(rnd.between(100, 1500), -60, 'atmo_strahl').setOrigin(0.5, 0).setScrollFactor(0.05 + i * 0.03, 0)
            .setDepth(-22.8).setBlendMode(Phaser.BlendModes.ADD).setAngle(rnd.between(14, 26)).setAlpha(0).setScale(rnd.between(10, 18) / 10);
        s.x = rnd.between(80, 3000);
        scene.tweens.add({ targets: s, alpha: { from: 0.02, to: 0.09 }, duration: rnd.between(6000, 12000), yoyo: true, repeat: -1, delay: rnd.between(0, 6000), ease: 'Sine.easeInOut' });
    }
}

// ---------------------------------------------------------------------------------------------------------------------
// Bodennebel: weiche, flache Dunstbänke, die in den Tälern liegen und langsam treiben. Sie liegen HINTER der Erde (nur in der Luft sichtbar).
// ---------------------------------------------------------------------------------------------------------------------
export function baueBodennebel(scene, weltBreite, boden) {
    backeTextur(scene, 'atmo_nebel', 480, 120, (g) => {
        const rnd = new Phaser.Math.RandomDataGenerator(['nebel']);
        for (let k = 0; k < 40; k++) {                                            // mehrere weiche Haufen übereinander
            const cx = rnd.between(60, 420), cy = rnd.between(40, 90), rx = rnd.between(50, 130), ry = rnd.between(14, 32);
            for (let y = -ry; y < ry; y += 8) for (let x = -rx; x < rx; x += 8) {
                const d = Math.hypot(x / rx, y / ry);
                if (d >= 1) continue;
                g.fillStyle(0xc8e0c0, Math.round((1 - d) * 0.07 * 100) / 100).fillRect(cx + x, cy + y, 8, 8);
            }
        }
    });
    const rnd = new Phaser.Math.RandomDataGenerator(['nebelbaenke']);
    for (let x = 200; x < weltBreite; x += rnd.between(520, 900)) {
        const n = scene.add.image(x, boden - rnd.between(30, 70), 'atmo_nebel').setDepth(-6).setAlpha(rnd.between(55, 100) / 100).setScale(rnd.between(14, 26) / 10, rnd.between(10, 16) / 10);
        scene.tweens.add({ targets: n, x: n.x + rnd.pick([-1, 1]) * rnd.between(60, 160), duration: rnd.between(14000, 26000), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
}

// ---------------------------------------------------------------------------------------------------------------------
// Vordergrund: dunkle Pflanzen, die vor dem Bild vorbeiziehen (näher an der Kamera als alles andere, also schneller als die Welt):
// Palmwedel und große Blätter in den oberen Ecken, hängende Lianen und Äste, Farne und hohes Gras am unteren Rand, ab und zu ein Baumstamm
// am Bildrand. Sie bleiben am Rand, damit das Spielfeld frei bleibt, werden durchsichtiger, wenn sie vor dem Spieler vorbeiziehen, und
// verschwinden unter der Erde. In der Arena gibt es kaum welche (freie Sicht), im dichten Dschungel viele.
// ---------------------------------------------------------------------------------------------------------------------
const VG = { schatten: 0x050f09, basis: 0x0b2314, mitte: 0x12361f, licht: 0x1f5230, rand: 0x2f7a40, blume: 0xd9533a, gelb: 0xe8c040, holz: [0x140e09, 0x1f1610, 0x2c2016, 0x3a2c1c] };
const rasterZelle = (g, x, y, farbe, a = 1) => g.fillStyle(farbe, a).fillRect(Math.round(x / 4) * 4, Math.round(y / 4) * 4, 4, 4);

// Ein Fiederwedel: gebogene Mittelrippe mit dichten Fiedern links und rechts, die nach unten hängen. Oben beleuchtet (heller), unten im Schatten.
function fiederWedel(g, x0, y0, laenge, winkel, kruemmung, fiederLaenge, rn) {
    let x = x0, y = y0, w = winkel;
    for (let s = 0; s < laenge; s += 4) {
        const t = s / laenge;
        w += kruemmung / (laenge / 4);
        x += Math.cos(w) * 4; y += Math.sin(w) * 4;
        rasterZelle(g, x, y, VG.mitte);
        if (s % 4 === 0 && t > 0.06) {
            const L = fiederLaenge * Math.pow(Math.sin(Math.PI * Math.min(1, t * 0.95 + 0.05)), 0.8) * (0.55 + 0.45 * (1 - t));
            for (const seite of [-1, 1]) {
                const dirx = Math.cos(w + seite * 1.15), diry = Math.sin(w + seite * 1.15) + 0.55;           // schräg nach außen, dazu hängend
                const n = Math.hypot(dirx, diry);
                for (let k = 4; k < L; k += 4) {
                    const lx = x + dirx / n * k, ly = y + diry / n * k + k * k * 0.006;
                    const hell = diry / n < 0.3 && seite === -1;                                         // die oben liegenden Fiedern fangen das Licht
                    rasterZelle(g, lx, ly, k > L * 0.7 ? VG.schatten : (hell ? VG.licht : VG.basis));
                }
            }
        }
    }
}

// Ein großes Blatt (wie Banane oder Monstera): Oval mit Mittelrippe, Seitenadern und eingeschnittenem Rand.
function grossesBlatt(g, cx, cy, a, b, winkel, rn) {
    const co = Math.cos(winkel), si = Math.sin(winkel);
    for (let y = -b; y <= b; y += 4) for (let x = -a; x <= a; x += 4) {
        const u = x * co + y * si, v = -x * si + y * co;
        const d = Math.pow(u / a, 2) + Math.pow(v / b, 2);
        if (d > 1) continue;
        if (d > 0.62 && rn.frac() < 0.32) continue;                                                     // Einschnitte am Rand
        let c = VG.basis;
        if (v < -b * 0.2) c = VG.mitte; if (v < -b * 0.55) c = VG.licht;                                // oben heller
        if (d > 0.85) c = VG.schatten;
        if (Math.abs(v) < 4) c = VG.rand;                                                                // Mittelrippe
        else if (Math.abs((u + Math.abs(v) * 1.2) % 28) < 4 && d < 0.8) c = c === VG.schatten ? c : VG.mitte;   // Seitenadern
        rasterZelle(g, cx + x, cy + y, c);
    }
}

function vgLiane(g, laenge, rn, breite = 48) {
    let x = breite / 2;
    for (let y = 0; y < laenge; y += 4) {
        x += rn.pick([-4, 0, 0, 0, 4]); x = klemme(x, 8, breite - 16);
        rasterZelle(g, x, y, VG.schatten); if (y % 8 === 0) rasterZelle(g, x + 4, y, VG.basis);
        if (y > 24 && y % 40 === 16) {                                                                  // Blätter abwechselnd links und rechts
            const seite = (y / 40) % 2 === 0 ? 1 : -1;
            for (let k = 1; k <= 3; k++) for (let j = 0; j < 3 - (k === 3 ? 1 : 0); j++) rasterZelle(g, x + seite * (4 + k * 4), y + j * 4 - (k === 2 ? 4 : 0), j === 0 ? VG.licht : VG.mitte);
        }
    }
    if (rn.frac() < 0.5) { rasterZelle(g, x, laenge, VG.blume); rasterZelle(g, x + 4, laenge, VG.blume); rasterZelle(g, x, laenge + 4, VG.gelb); }   // Blüte am Ende
}

function vgAst(g, w, h, rn) {
    let y = h * 0.35;
    for (let x = 0; x < w; x += 4) {
        y += rn.pick([-2, 0, 0, 0, 2]); y = klemme(y, 18, h * 0.5);
        const dicke = Math.round((22 - x / w * 12) / 4) * 4;
        for (let k = 0; k < dicke; k += 4) rasterZelle(g, x, y + k, k === 0 ? VG.holz[2] : (k >= dicke - 4 ? VG.holz[0] : VG.holz[1]));
        if (rn.frac() < 0.12) rasterZelle(g, x, y - 4, VG.holz[3]);
        if (x > 60 && x % 56 === 0) fiederWedel(g, x, y + dicke, rn.between(70, 120), Math.PI * 0.5 + rn.pick([-0.5, 0.5]), rn.pick([-0.6, 0.6]), rn.between(22, 34), rn);   // Wedel hängen vom Ast
    }
}

function vgStamm(g, w, h, rn) {
    for (let y = 0; y < h; y += 4) {
        const wackel = Math.round(Math.sin(y * 0.012) * 8 / 4) * 4;
        for (let x = 12; x < w - 12; x += 4) {
            const t = (x - 12) / (w - 24);
            let c = t < 0.2 ? VG.holz[3] : (t < 0.45 ? VG.holz[2] : (t < 0.8 ? VG.holz[1] : VG.holz[0]));
            if (rn.frac() < 0.08) c = VG.holz[(rn.between(0, 3))];
            rasterZelle(g, x + wackel, y, c);
        }
        if (y % 96 === 40) for (let k = 0; k < 24; k += 4) rasterZelle(g, 12 + k + wackel, y + 4, VG.schatten);   // Astloch / Narbe
    }
    for (let k = 0; k < 3; k++) vgLianeAn(g, 14 + k * 20, rn.between(40, 200), rn.between(180, 340), rn);
}
function vgLianeAn(g, x0, y0, laenge, rn) { let x = x0; for (let y = y0; y < y0 + laenge; y += 4) { x += rn.pick([-4, 0, 0, 4]); rasterZelle(g, x, y, VG.basis); if (y % 24 === 0) rasterZelle(g, x + 4, y, VG.licht); } }

function vgGras(g, w, h, rn) {
    for (let x = 0; x < w; x += 4) {
        if (rn.frac() < 0.35) continue;
        const hoehe = Math.round(rn.between(24, h - 8) * (0.5 + 0.5 * Math.sin(x / w * Math.PI)) / 4) * 4;
        let bx = x, richtung = rn.pick([-1, 1]);
        for (let y = 0; y < hoehe; y += 4) {
            if (y > hoehe * 0.55 && y % 8 === 0) bx += richtung * 4;
            rasterZelle(g, bx, h - 4 - y, y > hoehe * 0.7 ? VG.mitte : VG.basis);
            if (y > hoehe - 8) rasterZelle(g, bx, h - 4 - y, VG.licht);
        }
    }
}

function vgFarn(g, w, h, rn) {
    for (let i = 0; i < 9; i++) {
        const winkel = -Math.PI / 2 + (i - 4) * 0.34 + rn.between(-10, 10) / 100;
        fiederWedel(g, w / 2 + rn.between(-12, 12), h - 4, rn.between(110, 200), winkel, (i - 4) * 0.12, rn.between(18, 30), rn);
    }
}

export function baueVordergrund(scene, weltBreite, boden) {
    const bk = (key, w, h, fn) => backeTextur(scene, key, w, h, (g) => fn(g, new Phaser.Math.RandomDataGenerator([key])));
    bk('vg_palme', 360, 300, (g, rn) => { for (let i = 0; i < 6; i++) fiederWedel(g, rn.between(0, 24), rn.between(0, 30), rn.between(210, 330) - i * 12, -0.15 + i * 0.27 + rn.between(-5, 5) / 100, 1.0 - i * 0.1 + rn.between(-10, 10) / 100, rn.between(30, 46), rn); });
    bk('vg_blatt', 320, 280, (g, rn) => { grossesBlatt(g, 90, 60, 120, 44, 0.55, rn); grossesBlatt(g, 170, 130, 130, 50, 0.9, rn); grossesBlatt(g, 40, 160, 100, 36, 1.2, rn); });
    bk('vg_liane1', 56, 200, (g, rn) => vgLiane(g, 170, rn));
    bk('vg_liane2', 56, 300, (g, rn) => vgLiane(g, 270, rn));
    bk('vg_liane3', 56, 380, (g, rn) => vgLiane(g, 350, rn));
    bk('vg_ast', 620, 160, (g, rn) => vgAst(g, 620, 160, rn));
    bk('vg_stamm', 96, 760, (g, rn) => vgStamm(g, 96, 760, rn));
    bk('vg_gras', 380, 120, (g, rn) => vgGras(g, 380, 120, rn));
    bk('vg_farn', 380, 230, (g, rn) => vgFarn(g, 380, 230, rn));

    // Wie dicht der Dschungel im Vordergrund an welcher Stelle des Levels ist (0 = frei, 1 = sehr dicht)
    const dichte = (x) => x < 2200 ? 0.8 : x < 4400 ? 0.6 : x < 6500 ? 0.95 : x < 9700 ? 0.5 : x < 12000 ? 0.75 : x < 13400 ? 0.9 : x < 15600 ? 0.4 : 0.15;
    const rnd = new Phaser.Math.RandomDataGenerator(['vordergrundplatz2']);
    const teile = [];
    const H = () => scene.scale.height;
    // Beschreibung einer Sorte: Textur, Verankerung (oben, unten, Seite), Parallaxfaktor, Größe, Spiegelung möglich
    const SORTEN = [
        { key: 'vg_palme',  anker: 'oo', faktor: [1.25, 1.4],  skala: [1.0, 1.5], gewicht: 3, spiegel: true },
        { key: 'vg_blatt',  anker: 'oo', faktor: [1.35, 1.6],  skala: [0.9, 1.4], gewicht: 2, spiegel: true },
        { key: 'vg_liane1', anker: 'oo', faktor: [1.15, 1.3],  skala: [1, 1.4],   gewicht: 2 },
        { key: 'vg_liane2', anker: 'oo', faktor: [1.2, 1.35],  skala: [1, 1.3],   gewicht: 2 },
        { key: 'vg_liane3', anker: 'oo', faktor: [1.25, 1.45], skala: [1, 1.2],   gewicht: 1 },
        { key: 'vg_ast',    anker: 'oo', faktor: [1.1, 1.2],   skala: [1.2, 2.0], gewicht: 2, spiegel: true },
        { key: 'vg_farn',   anker: 'uu', faktor: [1.3, 1.55],  skala: [1.0, 1.6], gewicht: 3, spiegel: true },
        { key: 'vg_gras',   anker: 'uu', faktor: [1.15, 1.3],  skala: [1.0, 2.0], gewicht: 3, spiegel: true },
        { key: 'vg_stamm',  anker: 'ss', faktor: [1.6, 1.8],   skala: [1.0, 1.5], gewicht: 1 },
    ];
    const lose = [];
    for (const so of SORTEN) for (let i = 0; i < so.gewicht; i++) lose.push(so);
    let letzteX = 0;
    for (let x = 300; x < weltBreite; x += rnd.between(380, 820)) {
        if (rnd.frac() > dichte(x)) continue;
        // an manchen Stellen mehrere Teile zusammen: eine Gruppe (zum Beispiel Palme oben und Farn unten) wirkt wie echter Bewuchs
        const gruppe = rnd.frac() < 0.4 ? 2 : 1;
        for (let k = 0; k < gruppe; k++) {
            const so = rnd.pick(lose);
            const faktor = rnd.between(so.faktor[0] * 100, so.faktor[1] * 100) / 100, skala = rnd.between(so.skala[0] * 100, so.skala[1] * 100) / 100;
            const bild = scene.add.image(0, 0, so.key).setScrollFactor(faktor, 0).setDepth(19).setScale(skala);
            const spiegeln = so.spiegel && rnd.frac() < 0.5;
            if (spiegeln) bild.setFlipX(true);
            // Der Anker bestimmt, wo am Bildschirmrand das Teil sitzt: oben links/rechts, unten links/rechts, Seitenmitte
            const rechts = rnd.frac() < 0.5;
            bild.setOrigin(so.anker === 'ss' ? 0.5 : 0, so.anker === 'uu' ? 1 : 0);
            // Weltposition, bei der das Teil auf dem Bildschirm erscheint, wenn die Kamera bei x steht
            const kameraX = x + k * rnd.between(60, 200);
            const bildschirmX = rechts ? scene.scale.width - bild.displayWidth * rnd.between(60, 100) / 100 : -bild.displayWidth * rnd.between(0, 35) / 100;
            bild.x = kameraX * faktor - kameraX + bildschirmX + (kameraX - scene.scale.width / 2) * 0 + (scene.scale.width / 2) * (faktor - 1) * 0;
            // Umrechnung: Bildschirm-x = bild.x - scrollX * faktor, mit scrollX = kameraX - Breite/2  =>  bild.x = bildschirmX + faktor * (kameraX - Breite/2)
            bild.x = bildschirmX + faktor * (kameraX - scene.scale.width / 2);
            if (so.anker === 'ss') bild.x = (rechts ? scene.scale.width - 30 : 30) + faktor * (kameraX - scene.scale.width / 2);
            teile.push({ bild, so, kameraX, unten: so.anker === 'uu', ziel: 0.92, aktuell: 0.92 });
        }
        letzteX = x;
    }
    const lage = () => { for (const t of teile) if (t.unten) t.bild.y = H(); else if (t.bild.y !== 0) t.bild.y = 0; };
    lage();
    scene.scale.on('resize', lage);
    return {
        // kameraMitteY: für das Ausblenden unter der Erde; spielerX/Y: Bildschirmposition des Spielers (zum Durchsichtigwerden vor ihm); scrollX: Kamera
        update(kameraMitteY, spielerX, spielerY, scrollX) {
            const unterErde = klemme(1 - (kameraMitteY - (boden - 60)) / 260, 0, 1);
            for (const t of teile) {
                const b = t.bild;
                const sx = b.x - scrollX * b.scrollFactorX, links = sx, rechts = sx + b.displayWidth, breiteB = b.displayWidth, hoehe = b.displayHeight;
                const oben = b.originY === 1 ? H() - hoehe : 0, unten = oben + hoehe;
                const ueberlappt = spielerX !== undefined && spielerX > links - 70 && spielerX < rechts + 70 && spielerY > oben - 90 && spielerY < unten + 90 && breiteB > 0;
                t.ziel = ueberlappt ? 0.28 : 0.92;
                t.aktuell += (t.ziel - t.aktuell) * 0.08;
                b.setAlpha(t.aktuell * unterErde);
                b.setVisible(rechts > -20 && links < 3000 && unterErde > 0.01);
            }
        },
    };
}

// ---------------------------------------------------------------------------------------------------------------------
// Bodendetails: Der Boden ist über lange Strecken flach und gleich. Auf ebenen Stücken liegen deshalb Spuren des Krieges: Einschlagkrater
// (verbrannte Stellen), Pfützen, umgestürzte verkohlte Stämme, Reifenstapel, zerbrochene Bretter, Geröll und Stümpfe. Nur Dekoration ohne Physik.
// Sie meiden Gegner, Gegenstände, Fässer, Leitern und Fahnen.
// ---------------------------------------------------------------------------------------------------------------------
export function baueBodendetails(scene, level) {
    const boden = level.boden, ERDEN = [0x5b4a35, 0x4b3b2a, 0x5e5a55];
    const fest = level.platforms.filter((p) => ERDEN.includes(p.color) && !p.brechbar && p.y + p.h / 2 > boden - 30 && p.y - p.h / 2 <= boden + 1);
    const hoeheBei = (x) => { let y = Infinity; for (const p of fest) if (x >= p.x - p.w / 2 && x <= p.x + p.w / 2) y = Math.min(y, p.y - p.h / 2); return y; };
    // Orte, die frei bleiben sollen
    const meiden = [];
    for (const l of [level.enemies, level.rangedEnemies, level.skelette, level.pickups, level.faesser]) for (const e of l) meiden.push(e.x);
    for (const sg of level.signs) meiden.push(sg.x);
    for (const f of level.flaggen ?? []) meiden.push(f.x + 40);
    for (const ld of level.leitern) meiden.push(ld.x);
    for (const t of level.tuerme ?? []) meiden.push(t.x);
    for (const w of level.wracks ?? []) meiden.push(w.x);
    for (const d of level.decor) if (d.y > boden - 400 && d.w < 200 && d.y < boden + 5) meiden.push(d.x);
    for (const o of [[level.goalX, 300]]) meiden.push(o[0]);
    const frei = (x, bis) => !meiden.some((m) => m > x - 50 && m < bis + 50);
    // Höhlen und offene Spalten: darüber nichts
    const loecher = level.hoehlen.filter((h) => h.oben <= boden + 1 && h.art !== 'gebaeude' && h.art !== 'turm');
    const imLoch = (x) => loecher.some((h) => x > h.links - 10 && x < h.rechts + 10);

    const rn = new Phaser.Math.RandomDataGenerator(['bodendetails']);
    const g = scene.add.graphics().setDepth(2.5);
    const px = (c, x, y, w, h, a = 1) => g.fillStyle(c, a).fillRect(Math.round(x / 2) * 2, Math.round(y / 2) * 2, w, h);
    const genutzt = [];
    const platz = (x0, x1) => !genutzt.some(([a, b]) => x1 > a - 20 && x0 < b + 20);

    const props = {
        krater(x, y, m) {                                   // verbrannte Mulde mit aufgeworfenem Rand
            const w = Math.min(m, rn.between(5, 9) * 16) & ~3;
            for (let k = 0; k < w; k += 4) {
                const f = Math.sin(k / w * Math.PI), tiefe = Math.round(f * 3) * 2;
                px(0x1c130c, x + k - w / 2, y - 2, 4, 2 + tiefe, 0.7);
                px(0x2a1d12, x + k - w / 2, y - 2 + tiefe, 4, 2, 0.5);
                if (k < 12 || k > w - 16) px(rn.pick([0x5a4630, 0x6a5238]), x + k - w / 2, y - 6, 4, 6);   // Rand
            }
            return w;
        },
        pfuetze(x, y, m) {
            const w = Math.min(m, rn.between(4, 8) * 16) & ~3;
            for (let k = 4; k < w - 4; k += 4) { px(0x2c3c38, x + k - w / 2, y - 2, 4, 4, 0.9); if (rn.frac() < 0.35) px(0x7aa098, x + k - w / 2 + 1, y - 2, 2, 2, 0.8); }
            px(0x1c2824, x - w / 2 + 4, y, w - 8, 2, 0.8);
            return w;
        },
        stamm(x, y, m) {                                    // umgestürzter, verkohlter Baumstamm
            const w = Math.min(m - 4, rn.between(5, 8) * 16) & ~3;
            px(0x24180e, x - w / 2, y - 12, w, 12);
            px(0x3a2916, x - w / 2, y - 12, w, 4);
            for (let k = 8; k < w - 8; k += rn.between(10, 22)) px(0x120c07, x - w / 2 + k, y - 10, 2, 8);
            px(0x5a3a1c, x - w / 2 - 2, y - 11, 4, 10); px(0x7a5a3a, x - w / 2 - 2, y - 8, 2, 4);
            px(0x1a1008, x + w / 2 - 6, y - 14, 8, 6);
            return w + 4;
        },
        reifen(x, y, m) {
            const n = Math.min(rn.between(1, 3), Math.floor((m - 10) / 22));
            for (let i = 0; i < n; i++) {
                const rx = x + i * 22 - n * 11 + (i === 2 ? -10 : 0), ry = y - 18 - (i === 2 ? 14 : 0);
                px(0x141414, rx, ry, 20, 18); px(0x2a2a2a, rx + 4, ry + 4, 12, 10); px(0x0b0b0b, rx + 7, ry + 7, 6, 4);
                px(0x3a3a3a, rx + 2, ry + 2, 4, 2);
            }
            return n * 22 + 10;
        },
        bretter(x, y) {
            for (let i = 0; i < 3; i++) { const bx = x - 24 + i * 14, bl = rn.between(30, 54); px(rn.pick([0x6b4a2a, 0x5a3d22]), bx, y - 4 - (i === 1 ? 4 : 0), bl, 4); px(0x3a2812, bx, y - (i === 1 ? 4 : 0), bl, 2); px(0x8a8a8a, bx + 3, y - 3 - (i === 1 ? 4 : 0), 2, 2); }
            return 80;
        },
        geroell(x, y) {
            for (let i = 0; i < rn.between(5, 9); i++) { const s = rn.pick([6, 8, 10, 14]), gx = x + rn.between(-28, 28); px(rn.pick([0x6a645a, 0x57524a, 0x7d776a]), gx, y - s + 2, s, s - 2); px(0x9a9484, gx, y - s + 2, s / 2, 2); px(0x3a3630, gx, y - 2, s, 2, 0.8); }
            return 72;
        },
        stumpf(x, y) {
            const h = rn.between(3, 6) * 8;
            px(0x2a1c10, x - 8, y - h, 16, h); px(0x3e2a18, x - 8, y - h, 6, h); px(0x14100b, x - 8, y - h, 16, 4);
            if (rn.frac() < 0.5) px(0x4a3a24, x + 8, y - h + 4, 8, 4);
            return 36;
        },
    };
    const mindest = { krater: 64, pfuetze: 64, stamm: 84, reifen: 32, bretter: 80, geroell: 72, stumpf: 36 };
    const arten = ['krater', 'krater', 'pfuetze', 'pfuetze', 'stamm', 'reifen', 'bretter', 'geroell', 'stumpf'];

    // Abstand von x bis zur nächsten Stelle, die frei bleiben soll, und bis zum Ende der ebenen Strecke
    const luftBis = (x) => meiden.reduce((m, o) => Math.min(m, Math.abs(o - x)), 9999);
    const ebeneHalb = (x, hy) => { let k = 0; while (k < 120 && hoeheBei(x - k - 8) === hy && hoeheBei(x + k + 8) === hy) k += 8; return k; };
    let x = 200;
    while (x < level.width - 300) {
        x += rn.between(90, 240);
        const hy = hoeheBei(x);
        if (!isFinite(hy) || imLoch(x)) continue;
        const halb = Math.min(ebeneHalb(x, hy), luftBis(x) - 14, 90);
        const m = Math.floor(halb * 2);
        const moeglich = arten.filter((a) => mindest[a] <= m);
        if (!moeglich.length) continue;
        const art = rn.pick(moeglich);
        if (!platz(x - m / 2, x + m / 2)) continue;
        const breite = props[art](x, hy, m);
        genutzt.push([x - breite / 2, x + breite / 2]);
    }
}
