import { MAX_BREITE } from './Anpassung.js';

// Hintergrund im Stil "Krieg im Dschungel" (wie in Broforce): ein giftig-grüner Himmel mit dem Glühen der Brände am Horizont,
// Rauchsäulen, Dschungelschichten mit Palmen, Wachtürmen und Hütten, die mit der Kamera verschieden schnell ziehen (Parallax),
// Hubschrauber in der Ferne und ab und zu das Aufblitzen einer weit entfernten Explosion.

const lerp = (a, b, t) => a + (b - a) * t;
const lerpFarbe = (c1, c2, t) => {
    const r = Math.round(lerp((c1 >> 16) & 255, (c2 >> 16) & 255, t)), g = Math.round(lerp((c1 >> 8) & 255, (c2 >> 8) & 255, t)), b = Math.round(lerp(c1 & 255, c2 & 255, t));
    return (r << 16) | (g << 8) | b;
};

// Eine weiche Rauchtextur (einmal malen, mehrfach benutzen)
function rauchTextur(scene) {
    if (scene.textures.exists('dschungel_rauch')) return;
    const g = scene.add.graphics();
    for (let r = 16; r > 2; r -= 2) g.fillStyle(0xffffff, 0.16).fillCircle(18, 18, r);
    g.generateTexture('dschungel_rauch', 36, 36);
    g.destroy();
}

// Der Himmel: von finsterem Blaugrün über giftigen Dunst zu glühendem Orange am Horizont, dazu eine blasse Sonne und ziehende Rauchwolken.
export function buildDschungelHimmel(scene) {
    const g = scene.add.graphics().setScrollFactor(0).setDepth(-30);
    const farben = [[0, 0x0a2a32], [0.32, 0x14604c], [0.58, 0x6e9a46], [0.78, 0xdcaa3a], [1, 0xf4702c]];
    const B = MAX_BREITE, H = scene.scale.height, streifen = 40;
    for (let i = 0; i < streifen; i++) {
        const t = i / (streifen - 1);
        let k = 0; while (k < farben.length - 2 && t > farben[k + 1][0]) k++;
        const [ta, ca] = farben[k], [tb, cb] = farben[k + 1];
        g.fillStyle(lerpFarbe(ca, cb, Math.max(0, Math.min(1, (t - ta) / (tb - ta))))).fillRect(0, (H / streifen) * i, B, H / streifen + 1);
    }
    // Übergänge zwischen den Farbstreifen verpixeln: Pixelzellen der vorigen Farbe ragen unregelmäßig in den nächsten Streifen
    const rh = new Phaser.Math.RandomDataGenerator(['himmelpixel']), sh = H / streifen, Z = 6;
    for (let i = 1; i < streifen; i++) {
        const t = (i - 1) / (streifen - 1);
        let k = 0; while (k < farben.length - 2 && t > farben[k + 1][0]) k++;
        const [ta, ca] = farben[k], [tb, cb] = farben[k + 1];
        g.fillStyle(lerpFarbe(ca, cb, Math.max(0, Math.min(1, (t - ta) / (tb - ta)))));
        const y0 = sh * i;
        for (let zeile = 0; zeile < 2; zeile++) {
            const p = [0.35, 0.12][zeile];
            for (let x = 0; x < B; x += Z) if (rh.frac() < p) g.fillRect(x, y0 + zeile * Z, Z, Z);
        }
    }
    // blasse, vom Rauch verdeckte Sonne
    scene.add.circle(900, H * 0.5, 120, 0xffd890, 0.14).setScrollFactor(0.03).setDepth(-29);
    scene.add.circle(900, H * 0.5, 86, 0xffe6a8, 0.5).setScrollFactor(0.03).setDepth(-29);
    scene.add.circle(900, H * 0.5, 62, 0xfff3c8, 0.55).setScrollFactor(0.03).setDepth(-29);

    // Rauchwolken: große, dunkle, durchsichtige Pixelhaufen, die langsam hin- und herziehen
    const rnd = new Phaser.Math.RandomDataGenerator(['rauchwolken']);
    for (let i = 0; i < 7; i++) {
        const w = rnd.between(240, 520), h = rnd.between(40, 80);
        const wolke = scene.add.graphics().setScrollFactor(0.02 + i * 0.006).setDepth(-28);
        const farbe = rnd.pick([0x1c2218, 0x2a2a20, 0x33281e]);
        for (let k = 0; k < 9; k++) wolke.fillStyle(farbe, rnd.between(18, 34) / 100).fillRect(rnd.between(0, w * 0.5), rnd.between(0, h * 0.7), rnd.between(w * 0.3, w * 0.6), rnd.between(10, h * 0.5));
        wolke.setPosition(rnd.between(-100, B), rnd.between(20, H * 0.55));
        scene.tweens.add({ targets: wolke, x: wolke.x + rnd.pick([-1, 1]) * rnd.between(160, 380), duration: rnd.between(40000, 90000), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    // Hubschrauber in der Ferne: Schattenrisse, die langsam durch das Bild fliegen (Rotor dreht sich)
    const heli = (hoehe, nachRechts, dauer, verzoegerung, groesse) => {
        // Gezeichnet mit der Nase links; wer nach rechts fliegt, wird gespiegelt (die Nase zeigt immer in Flugrichtung)
        const c = scene.add.container(0, hoehe).setScrollFactor(0).setDepth(-27).setScale(nachRechts ? -groesse : groesse, groesse);
        const k = scene.add.graphics();
        const f = 0x08140e;
        k.fillStyle(f).fillRect(0, 0, 52, 18).fillRect(46, 4, 44, 7).fillRect(84, -10, 6, 16).fillRect(4, 20, 50, 3).fillRect(10, 17, 3, 5).fillRect(38, 17, 3, 5).fillRect(22, -12, 5, 7);   // Rumpf (Nase links)
        k.fillStyle(0x6aa070, 0.5).fillRect(-2, 2, 12, 10);                                                      // Cockpitfenster
        const rotor = scene.add.rectangle(24, -14, 96, 3, f);
        scene.tweens.add({ targets: rotor, scaleX: 0.15, duration: 80, yoyo: true, repeat: -1 });
        const licht = scene.add.rectangle(88, -12, 4, 4, 0xff4444);
        scene.tweens.add({ targets: licht, alpha: 0.15, duration: 450, yoyo: true, repeat: -1 });
        c.add([k, rotor, licht]);
        const von = nachRechts ? -200 : B + 200, nach = nachRechts ? B + 200 : -200;
        c.x = von;
        scene.tweens.add({ targets: c, x: { from: von, to: nach }, duration: dauer, delay: verzoegerung, repeat: -1, repeatDelay: rnd.between(8000, 20000) });
    };
    heli(90, false, 52000, 3000, 0.9);
    heli(150, true, 70000, 25000, 0.6);

    // Entfernte Explosionen am Horizont: kurzes Aufblitzen mit Glut
    scene.time.addEvent({
        delay: 3200, loop: true, callback: () => {
            const x = rnd.between(80, B - 80), y = H * rnd.between(62, 84) / 100;
            const blitz = scene.add.circle(x, y, 10, 0xffc860, 0.9).setScrollFactor(0).setDepth(-26);
            const kern = scene.add.circle(x, y, 5, 0xffffff, 0.95).setScrollFactor(0).setDepth(-26);
            scene.tweens.add({ targets: blitz, scale: 5, alpha: 0, duration: 700, ease: 'Cubic.easeOut', onComplete: () => blitz.destroy() });
            scene.tweens.add({ targets: kern, scale: 3, alpha: 0, duration: 380, onComplete: () => kern.destroy() });
        },
    });
}

// Eine Palme in Pixelstufen (für die Dschungelschichten): gebogener Stamm, hängende Wedel, Kokosnüsse.
function palme(g, x, y, hoehe, farbe, r) {
    const biegung = (r.frac() - 0.5) * 30;
    let tx = x, ty = y;
    for (let k = 0; k < hoehe; k += 6) {
        tx = x + Math.round(Math.sin(k / hoehe * 1.6) * biegung / 3) * 3;
        g.fillStyle(farbe).fillRect(tx - 3, y - k - 6, 6, 7);
        ty = y - k - 6;
    }
    const wedel = 8, laenge = r.between(40, 70);
    for (let w = 0; w < wedel; w++) {
        const a = -Math.PI / 2 + (w - (wedel - 1) / 2) * 0.62 + (r.frac() - 0.5) * 0.2;
        for (let s = 0; s < laenge; s += 4) {
            const px = tx + Math.cos(a) * s * 1.1, py = ty + Math.sin(a) * s * 0.55 + s * s * 0.011;
            const d = Math.max(2, 7 - s / 12);
            g.fillStyle(farbe).fillRect(px - d / 2, py - d / 2, d, d);
        }
    }
}

// Ein Wachturm aus Holz mit Strohdach (Schattenriss) oder eine Hütte oder ein Funkmast.
function lagerTeil(g, art, x, y, farbe) {
    if (art === 0) {                                                       // Wachturm
        g.fillStyle(farbe).fillRect(x - 22, y - 70, 4, 70).fillRect(x + 18, y - 70, 4, 70);
        g.lineStyle(2, farbe).beginPath().moveTo(x - 20, y - 66).lineTo(x + 20, y - 8).moveTo(x + 20, y - 66).lineTo(x - 20, y - 8).strokePath();
        g.fillRect(x - 28, y - 76, 56, 6).fillRect(x - 24, y - 94, 3, 18).fillRect(x + 21, y - 94, 3, 18).fillRect(x - 24, y - 96, 48, 3);
        g.fillTriangle(x - 32, y - 96, x + 32, y - 96, x, y - 122);
        g.fillRect(x - 4, y - 90, 8, 12);
    } else if (art === 1) {                                                // Hütte
        g.fillRect(x - 26, y - 22, 52, 22);
        g.fillTriangle(x - 34, y - 22, x + 34, y - 22, x, y - 52);
        g.fillRect(x - 24, y, 3, 8).fillRect(x + 21, y, 3, 8);
    } else {                                                               // Funkmast mit Fahne
        g.fillRect(x - 2, y - 120, 4, 120);
        g.lineStyle(2, farbe).beginPath().moveTo(x - 14, y).lineTo(x, y - 90).lineTo(x + 14, y).moveTo(x - 10, y - 36).lineTo(x + 10, y - 36).strokePath();
        g.fillRect(x, y - 118, 18, 10);
        g.fillRect(x - 6, y - 124, 12, 3);
    }
}

// Eine Dschungelschicht: klumpiges Blätterdach mit Palmen (und, wenn lager = true, Wachtürmen, Hütten und Funkmasten darauf).
// scrollFaktor: je kleiner, desto weiter weg. mitte/amp = Höhe und Schwankung des Blätterdachs.
export function buildDschungelSchicht(scene, worldWidth, boden, scrollFaktor, farbe, mitte, amp, seed, palmen, palmenHoehe, lager, tiefe) {
    const rnd = new Phaser.Math.RandomDataGenerator([seed]);
    const g = scene.add.graphics().setScrollFactor(scrollFaktor).setDepth(tiefe);
    const tief = boden - 60 - scene.scale.height / 2;
    const fuss = (boden - tief) + scrollFaktor * tief + 40;
    const p1 = rnd.frac() * 6, p2 = rnd.frac() * 6, p3 = rnd.frac() * 6;
    const reichweite = worldWidth * scrollFaktor + MAX_BREITE + 200;
    const hoeheBei = (x) => mitte + amp * (0.5 * Math.sin(x * 0.004 + p1) + 0.3 * Math.sin(x * 0.011 + p2) + 0.2 * Math.sin(x * 0.027 + p3));
    const hell = lerpFarbe(farbe, 0x9ad060, 0.2);
    for (let x = -50; x < reichweite; x += 8) {
        const hq = Math.round((hoeheBei(x) + rnd.between(0, 12)) / 4) * 4, basis = fuss - hq;
        g.fillStyle(farbe).fillRect(x, basis, 8, hq + 900);
        if (rnd.frac() < 0.3) g.fillStyle(hell).fillRect(x, basis, 8, 4);          // helle Blattspitzen
    }
    for (let x = rnd.between(20, 120); x < reichweite; x += rnd.between(Math.floor(reichweite / (palmen * 1.6)), Math.floor(reichweite / (palmen * 0.7)))) {
        const hq = Math.round(hoeheBei(x) / 4) * 4;
        palme(g, x, fuss - hq + 6, palmenHoehe + rnd.between(-15, 35), farbe, rnd);
    }
    if (lager) {
        const dunkel = lerpFarbe(farbe, 0x000000, 0.3);
        for (let x = rnd.between(300, 700); x < reichweite; x += rnd.between(700, 1500)) {
            const hq = Math.round(hoeheBei(x) / 4) * 4;
            lagerTeil(g, rnd.between(0, 2), x, fuss - hq + 4, dunkel);
        }
    }
}

// Rauchsäulen und das Glühen von Bränden an den ferneren Dschungelschichten (Position folgt der Schicht)
export function buildBrandherde(scene, worldWidth, boden, scrollFaktor, seed, anzahl) {
    rauchTextur(scene);
    const rnd = new Phaser.Math.RandomDataGenerator([seed]);
    const tief = boden - 60 - scene.scale.height / 2;
    const fuss = (boden - tief) + scrollFaktor * tief + 40;
    const reichweite = worldWidth * scrollFaktor + MAX_BREITE;
    const glut = scene.add.graphics().setScrollFactor(scrollFaktor).setDepth(-25.5);
    const herde = [];
    for (let i = 0; i < anzahl; i++) {
        const x = (i + rnd.frac() * 0.8) * reichweite / anzahl, y = fuss - rnd.between(150, 260);
        herde.push({ x, y, r: rnd.between(70, 130) });
        scene.add.particles(x, y, 'dschungel_rauch', {
            speedY: { min: -34, max: -16 }, speedX: { min: -8, max: 14 }, lifespan: 9000, frequency: 220, scale: { start: 1.2, end: 6 },
            alpha: { start: 0.42, end: 0 }, tint: [0x1c1a18, 0x2c2622, 0x3a3028], rotate: { min: 0, max: 360 },
        }).setScrollFactor(scrollFaktor).setDepth(-25.4);
    }
    for (const h of herde) {
        glut.fillStyle(0xff7a2a, 0.12).fillCircle(h.x, h.y + 40, h.r).fillStyle(0xffa844, 0.16).fillCircle(h.x, h.y + 40, h.r * 0.5);
    }
    scene.tweens.add({ targets: glut, alpha: 0.6, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
}
