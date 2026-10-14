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

export function baueStimmung(scene) {
    const flaeche = scene.add.rectangle(0, 0, MAX_BREITE + 200, 2400, 0x000000, 0).setOrigin(0, 0).setScrollFactor(0).setDepth(-22.9);
    return {
        update(kameraMitteX) {
            let i = 0;
            while (i < STIMMUNGEN.length - 2 && kameraMitteX > STIMMUNGEN[i + 1].x) i++;
            const a = STIMMUNGEN[i], b = STIMMUNGEN[i + 1];
            const t = klemme((kameraMitteX - a.x) / (b.x - a.x), 0, 1);
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
        const n = scene.add.image(x, boden - rnd.between(30, 70), 'atmo_nebel').setDepth(-4).setAlpha(rnd.between(55, 100) / 100).setScale(rnd.between(14, 26) / 10, rnd.between(10, 16) / 10);
        scene.tweens.add({ targets: n, x: n.x + rnd.pick([-1, 1]) * rnd.between(60, 160), duration: rnd.between(14000, 26000), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
}

// ---------------------------------------------------------------------------------------------------------------------
// Vordergrund: dunkle Blätter und Lianen, die oben ins Bild hängen. Sie bewegen sich schneller als die Welt (näher an der Kamera) und
// verschwinden, sobald man unter der Erde ist.
// ---------------------------------------------------------------------------------------------------------------------
function wedel(g, x, y, laenge, richtung, farbe, rn) {
    // ein breites Blatt: die Mittelachse biegt sich nach unten, die Breite wächst in der Mitte und läuft spitz zu; der Rand ist leicht gezackt
    const bogen = rn.between(30, 80) / 100, steig = rn.between(-10, 70) / 100, breite = rn.between(12, 22);
    const hell = farbe + 0x030a05;
    for (let sx = 0; sx < laenge; sx += 4) {
        const t = sx / laenge, mitteY = y + (t * steig + Math.pow(t, 2) * bogen) * laenge * 0.6;
        const w = Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.05)), 0.7) * breite;
        const px = Math.round((x + richtung * sx) / 4) * 4;
        for (let dy = -w; dy < w; dy += 4) {
            if (Math.abs(dy) > w * 0.55 && rn.frac() < 0.35) continue;                // ausgefranster Rand
            g.fillStyle(Math.abs(dy) < 4 ? hell : farbe).fillRect(px, Math.round((mitteY + dy) / 4) * 4, 4, 4);
        }
    }
}

export function baueVordergrund(scene, weltBreite, boden) {
    backeTextur(scene, 'atmo_blatt', 360, 300, (g) => {
        const rn = new Phaser.Math.RandomDataGenerator(['vordergrund']);
        for (let i = 0; i < 7; i++) wedel(g, rn.between(0, 30), rn.between(-10, 30), rn.between(140, 340), 1, rn.pick([0x07160e, 0x0a2014, 0x0c2a18]), rn);
    });
    backeTextur(scene, 'atmo_blatt2', 360, 300, (g) => {
        const rn = new Phaser.Math.RandomDataGenerator(['vordergrund2']);
        for (let i = 0; i < 7; i++) wedel(g, 360 - rn.between(0, 30), rn.between(-10, 30), rn.between(140, 340), -1, rn.pick([0x07160e, 0x0a2014, 0x0c2a18]), rn);
    });
    backeTextur(scene, 'atmo_liane', 40, 260, (g) => {
        const rn = new Phaser.Math.RandomDataGenerator(['lianen']);
        let x = 16;
        for (let y = 0; y < 240; y += 4) { x += rn.pick([-4, 0, 0, 4]); x = klemme(x, 4, 32); g.fillStyle(0x08180f).fillRect(x, y, 4, 4); if (y % 48 === 16) g.fillStyle(0x0c2a18).fillRect(x + 4, y, 8, 8); }
    });
    const rnd = new Phaser.Math.RandomDataGenerator(['vordergrundplatz']);
    const teile = [];
    for (let x = 300; x < weltBreite; x += rnd.between(700, 1300)) {
        const art = rnd.between(0, 2);
        const faktor = rnd.between(120, 150) / 100;                                 // >1: schneller als die Welt
        const b = scene.add.image(x, 0, art === 0 ? 'atmo_blatt' : (art === 1 ? 'atmo_blatt2' : 'atmo_liane')).setOrigin(0, 0)
            .setScrollFactor(faktor, 0).setDepth(19).setAlpha(0.92);
        if (art === 2) b.setScale(rnd.between(10, 20) / 10);
        // Die Ruhelage so wählen, dass es bei Kamerabewegung auf Höhe von x erscheint (Faktor beachten)
        b.x = x * faktor - rnd.between(0, 400) * (faktor - 1);
        teile.push(b);
    }
    return {
        update(kameraMitteY) {
            const a = klemme(1 - (kameraMitteY - (boden - 60)) / 260, 0, 0.92);       // unter der Erde ausblenden
            for (const t of teile) t.setAlpha(a);
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
