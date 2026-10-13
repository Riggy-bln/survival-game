import { sfx } from './Sound.js';

// Gemeinsamer Look aller Menüs (Startmenü, Lobby, Pause): Pixel-Retro-Stil mit warmen Farben, einem animierten Hintergrund aus der
// Landschaft des Spiels (Sonnenuntergang, Bergketten, Lagerfeuer, Hubschrauber) und Knöpfen mit Farbakzent.
// Alle Menüs sind für 960 x 540 gebaut. Die Kamera zoomt nach der Fensterhöhe; die Breite passt sich an, alles bleibt symmetrisch um x = 480.

export const MITTE_X = 480, MITTE_Y = 270;
const X0 = -520, X1 = 1480, Y0 = -200, Y1 = 760;     // so weit wird der Hintergrund gemalt (deckt jede Fensterbreite ab)

const lerp = (a, b, t) => a + (b - a) * t;
const lerpFarbe = (c1, c2, t) => {
    const r = Math.round(lerp((c1 >> 16) & 255, (c2 >> 16) & 255, t)), g = Math.round(lerp((c1 >> 8) & 255, (c2 >> 8) & 255, t)), b = Math.round(lerp(c1 & 255, c2 & 255, t));
    return (r << 16) | (g << 8) | b;
};

// Kamera: Zoom nach der Höhe und immer auf die Mitte des Entwurfs gerichtet (auch nach einer Größenänderung, zum Beispiel Vollbild).
export function zentriere(scene) {
    const cam = scene.cameras.main;
    const an = () => { cam.setZoom(scene.scale.height / 540); cam.centerOn(MITTE_X, MITTE_Y); };
    an();
    scene.scale.on('resize', an);
    scene.events.once('shutdown', () => scene.scale.off('resize', an));
}

// Der animierte Hintergrund. Gibt ein Objekt mit update(zeit) zurück, das die Szene in ihrem update() aufruft.
export function baueHintergrund(scene) {
    const zu = new Phaser.Math.RandomDataGenerator(['menue']);
    const teile = [];

    // --- Himmel: von tiefem Violett über Magenta bis zum glühenden Orange am Horizont ---
    const himmel = scene.add.graphics().setDepth(-100);
    const farben = [[0, 0x0f0c26], [0.35, 0x2f2358], [0.62, 0x8a3a6a], [0.82, 0xd9683a], [1, 0xf5a04a]];
    const HOR = 470, streifen = 48;
    for (let i = 0; i < streifen; i++) {
        const t = i / (streifen - 1);
        let k = 0; while (k < farben.length - 2 && t > farben[k + 1][0]) k++;
        const [ta, ca] = farben[k], [tb, cb] = farben[k + 1];
        himmel.fillStyle(lerpFarbe(ca, cb, Math.max(0, Math.min(1, (t - ta) / (tb - ta))))).fillRect(X0, Y0 + (HOR - Y0) * i / streifen, X1 - X0, (HOR - Y0) / streifen + 2);
    }
    himmel.fillStyle(0xf5a04a).fillRect(X0, HOR, X1 - X0, Y1 - HOR);

    // --- Sterne (funkeln) ---
    const sterne = [];
    for (let i = 0; i < 90; i++) sterne.push({ x: zu.between(X0, X1), y: zu.between(Y0, 250), p: zu.frac() * 6.28, g: zu.pick([2, 2, 2, 3]) });
    const sternG = scene.add.graphics().setDepth(-99);
    teile.push((t) => {
        sternG.clear();
        for (const s of sterne) sternG.fillStyle(0xffffff, 0.25 + 0.6 * Math.max(0, Math.sin(t * 0.002 + s.p))).fillRect(s.x, s.y, s.g, s.g);
    });

    // --- Sonne: pulsierender Schein hinter den Bergen ---
    const sonne = scene.add.graphics().setDepth(-98);
    teile.push((t) => {
        sonne.clear();
        const puls = 1 + 0.04 * Math.sin(t * 0.0014);
        for (const [r, a, c] of [[190, 0.07, 0xff9a55], [140, 0.12, 0xff9a55], [100, 0.5, 0xffb36b], [78, 0.95, 0xffd08a]]) sonne.fillStyle(c, a).fillCircle(660, 430, r * puls);
    });

    // --- Wolken: Pixelhaufen, die langsam vorbeiziehen ---
    const wolken = [];
    for (let i = 0; i < 7; i++) {
        const g = scene.add.graphics().setDepth(-97 + i * 0.01);
        const w = zu.between(90, 190), h = zu.between(14, 26);
        const farbe = zu.pick([0x7a4a7a, 0xa65a6e, 0xd98a6a]);
        for (let k = 0; k < 6; k++) g.fillStyle(farbe, 0.55).fillRect(zu.between(0, w - 40), zu.between(-h, 0) + k * 3, zu.between(40, 90), 8 + zu.between(0, 6));
        g.fillStyle(farbe, 0.45).fillRect(0, 2, w, 8);
        wolken.push({ g, x: zu.between(X0, X1), y: zu.between(20, 250), v: zu.between(4, 14) / 1000, w });
    }
    teile.push((t, dt) => {
        for (const w of wolken) {
            w.x += w.v * dt;
            if (w.x > X1 + 20) w.x = X0 - w.w;
            w.g.setPosition(w.x, w.y);
        }
    });

    // --- Bergketten (verschieden schnell, nahtlos wiederholt) ---
    const P = 1200;
    const kette = (farbe, grund, amp, speed, tiefe, seed, baeume) => {
        const g = scene.add.graphics().setDepth(tiefe);
        const r = new Phaser.Math.RandomDataGenerator([seed]);
        const ph = [r.frac() * 6.28, r.frac() * 6.28, r.frac() * 6.28, r.frac() * 6.28];
        const hoehe = (x) => {
            const a = Math.sin(2 * Math.PI * 1 * x / P + ph[0]), b = Math.sin(2 * Math.PI * 3 * x / P + ph[1]), c = Math.sin(2 * Math.PI * 7 * x / P + ph[2]);
            const grat = 1 - 2 * Math.abs(Math.sin(2 * Math.PI * 2 * x / P + ph[3]));               // spitze Gipfel
            return amp * (0.4 * a + 0.25 * b + 0.12 * c + 0.45 * grat);
        };
        const baeumeX = [];
        if (baeume) for (let i = 0; i < 26; i++) baeumeX.push(r.between(0, P));
        for (let rep = 0; rep < 3; rep++) {
            for (let x = 0; x < P; x += 8) {
                const hh = Math.round(hoehe(x) / 8) * 8, oben = grund - hh;
                g.fillStyle(farbe).fillRect(rep * P + x + X0, oben, 8, Y1 - oben);
                g.fillStyle(lerpFarbe(farbe, 0xffb36b, 0.18)).fillRect(rep * P + x + X0, oben, 8, 3);       // Licht von der Sonne an den Kanten
            }
            for (const bx of baeumeX) {                                                                  // Kiefern aus Pixelstufen
                const hh = Math.round(hoehe(bx) / 8) * 8, oben = grund - hh, th = r.between(4, 8) * 8;
                const x = rep * P + bx + X0;
                g.fillStyle(farbe).fillRect(x + 2, oben - th, 4, th + 2);
                for (let k = 0; k < 5; k++) g.fillRect(x + 4 - (4 + k * 4), oben - th + k * 8, 8 + k * 8, 7);
            }
        }
        teile.push((t) => { g.x = -((t * speed) % P); });
        return g;
    };
    kette(0x7a3d68, 400, 120, 0.004, -94, 'k1', false);
    kette(0x5a2d5a, 440, 100, 0.009, -92, 'k2', true);
    kette(0x3d2149, 480, 80, 0.016, -90, 'k3', true);

    // --- Vordergrund: dunkler Hügel mit Gras, Lagerfeuer und Hubschrauber ---
    const hang = scene.add.graphics().setDepth(-80);
    for (let x = X0; x < X1; x += 8) {
        const h = 40 + 26 * Math.sin(x * 0.006) + 14 * Math.sin(x * 0.019 + 1);
        const oben = 498 - Math.round(h / 8) * 8 * 0.5;
        hang.fillStyle(0x1b1226).fillRect(x, oben, 8, Y1 - oben);
        hang.fillStyle(0x2e3a2a).fillRect(x, oben, 8, 4);
        if ((x / 8) % 5 === 0) hang.fillStyle(0x3c5232).fillRect(x + 2, oben - 4, 2, 4);
    }
    const feuer = scene.add.graphics().setDepth(-79);
    const FX = 120, FY = 492;
    teile.push((t) => {
        feuer.clear();
        const fl = Math.sin(t * 0.02) * 0.5 + 0.5, fl2 = Math.sin(t * 0.031 + 1) * 0.5 + 0.5;
        feuer.fillStyle(0xff8a3c, 0.10 + 0.05 * fl).fillCircle(FX, FY - 12, 70 + 6 * fl);                 // Schein
        feuer.fillStyle(0x5a3a1e).fillRect(FX - 22, FY - 4, 44, 6).fillRect(FX - 16, FY - 10, 6, 8).fillRect(FX + 10, FY - 10, 6, 8);   // Holzscheite
        feuer.fillStyle(0xc2331c).fillRect(FX - 12, FY - 22 - fl * 6, 24, 20 + fl * 6);
        feuer.fillStyle(0xff7a2a).fillRect(FX - 8, FY - 30 - fl2 * 8, 16, 26 + fl2 * 8);
        feuer.fillStyle(0xffd23f).fillRect(FX - 4, FY - 36 - fl * 7, 8, 30 + fl * 7);
        feuer.fillStyle(0xffffff, 0.8).fillRect(FX - 2, FY - 18 - fl2 * 3, 4, 10);
    });
    // Funken und Glut
    if (!scene.textures.exists('menue_px')) {
        const pg = scene.add.graphics(); pg.fillStyle(0xffffff).fillRect(0, 0, 4, 4); pg.generateTexture('menue_px', 4, 4); pg.destroy();
    }
    scene.add.particles(FX, FY - 30, 'menue_px', {
        speedY: { min: -90, max: -30 }, speedX: { min: -25, max: 25 }, lifespan: 1400, frequency: 90, scale: { start: 1, end: 0.2 },
        alpha: { start: 0.9, end: 0 }, tint: [0xffd23f, 0xff8a3c, 0xff5a2a],
    }).setDepth(-78);
    scene.add.particles(0, 0, 'menue_px', {
        x: { min: X0, max: X1 }, y: Y1, speedY: { min: -60, max: -20 }, speedX: { min: -20, max: 20 }, lifespan: 9000, frequency: 260,
        scale: { start: 0.8, end: 0.2 }, alpha: { start: 0.5, end: 0 }, tint: [0xff9944, 0xffcc66, 0xaaaaaa],
    }).setDepth(-77);

    // Hubschrauber: fliegt ab und zu quer durchs Bild
    const heli = scene.add.graphics().setDepth(-85);
    const heliZ = { x: X0 - 200, aktiv: false, naechster: 3000 };
    teile.push((t, dt) => {
        if (!heliZ.aktiv) { heli.clear(); if (t > heliZ.naechster) { heliZ.aktiv = true; heliZ.x = X0 - 100; } return; }
        heliZ.x += 0.14 * dt;
        const y = 110 + Math.sin(heliZ.x * 0.008) * 10;
        heli.clear();
        const x = heliZ.x, c = 0x1a1226;
        heli.fillStyle(c).fillRect(x, y, 46, 16).fillRect(x + 40, y + 4, 36, 6).fillRect(x + 70, y - 8, 6, 14);          // Rumpf, Heck, Flosse
        heli.fillStyle(0x9fd3e6, 0.7).fillRect(x + 4, y + 3, 14, 8);                                                    // Cockpit
        heli.fillStyle(c).fillRect(x + 22, y - 8, 4, 8).fillRect(x + 4, y + 20, 40, 3).fillRect(x + 10, y + 16, 3, 5).fillRect(x + 34, y + 16, 3, 5);
        const rot = 20 + 40 * Math.abs(Math.sin(heliZ.x * 0.3));
        heli.fillRect(x + 24 - rot, y - 10, rot * 2, 3);                                                                // Rotor
        heli.fillStyle(0xff4444, 0.9 * (Math.sin(t * 0.01) > 0 ? 1 : 0.2)).fillRect(x + 72, y - 12, 4, 4);                // Warnlicht
        if (heliZ.x > X1 + 100) { heliZ.aktiv = false; heliZ.naechster = t + zu.between(12000, 26000); }
    });

    // Vögel: kleine V-Formen, die langsam ziehen
    const voegel = scene.add.graphics().setDepth(-86);
    const vs = []; for (let i = 0; i < 5; i++) vs.push({ x: zu.between(X0, X1), y: zu.between(60, 230), v: zu.between(15, 30) / 1000, p: zu.frac() * 6 });
    teile.push((t, dt) => {
        voegel.clear();
        for (const v of vs) {
            v.x += v.v * dt; if (v.x > X1 + 20) v.x = X0 - 20;
            const f = Math.sin(t * 0.012 + v.p) * 4;
            voegel.lineStyle(2, 0x1a1226).beginPath().moveTo(v.x - 8, v.y - f).lineTo(v.x, v.y + 2).lineTo(v.x + 8, v.y - f).strokePath();
        }
    });

    // Dunkle Ränder (Vignette)
    const rand = scene.add.graphics().setDepth(-60);
    for (let i = 0; i < 14; i++) {
        const a = 0.34 * (1 - i / 14);
        rand.fillStyle(0x000000, a).fillRect(X0, Y0 + i * 12, X1 - X0, 12).fillRect(X0, Y1 - (i + 1) * 12, X1 - X0, 12);
        rand.fillStyle(0x000000, a * 0.8).fillRect(X0 + i * 16, Y0, 16, Y1 - Y0).fillRect(X1 - (i + 1) * 16, Y0, 16, Y1 - Y0);
    }

    let zuletzt = 0;
    return {
        update(t) {
            const dt = Math.min(60, t - zuletzt); zuletzt = t;
            for (const f of teile) f(t, dt);
        },
    };
}

// Der Titel: Pixelbuchstaben in drei Lagen (Schatten, Orange, Gelb), die in einer Welle wippen und von einem Glanz überstrichen werden.
export function baueTitel(scene, text, y, groesse = 64) {
    const stil = (farbe, extra = {}) => ({ fontSize: `${groesse}px`, fontFamily: 'monospace', fontStyle: 'bold', color: farbe, ...extra });
    const buchstaben = [];
    const abstand = groesse * 0.62;
    const x0 = MITTE_X - (text.length - 1) * abstand / 2;
    [...text].forEach((z, i) => {
        if (z === ' ') return;
        const x = x0 + i * abstand;
        const lagen = [
            scene.add.text(x + 5, y + 5, z, stil('#14101f')).setOrigin(0.5),
            scene.add.text(x + 3, y + 3, z, stil('#d9501c')).setOrigin(0.5),
            scene.add.text(x, y, z, stil('#ffe066', { stroke: '#7a2a0a', strokeThickness: 4 })).setOrigin(0.5),
        ];
        lagen.forEach((l) => l.setDepth(10));
        buchstaben.push({ lagen, i, y });
    });
    return {
        update(t) {
            for (const b of buchstaben) {
                const wipp = Math.sin(t * 0.003 + b.i * 0.55) * 4;
                b.lagen.forEach((l, k) => l.setY(b.y + (k === 0 ? 5 : k === 1 ? 3 : 0) + wipp));
                const glanz = Math.max(0, Math.sin(t * 0.0016 - b.i * 0.35));
                b.lagen[2].setColor(glanz > 0.92 ? '#ffffff' : (glanz > 0.7 ? '#fff3a8' : '#ffe066'));
            }
        },
    };
}

// Ein Pixelknopf mit Farbakzent. Gibt { rahmen, setAktiv(bool), zerstoere() } zurück. Die Objekte liegen in "objekte" (zum späteren Löschen).
export function pixelKnopf(scene, x, y, breite, hoehe, text, farbe, aktion, optionen = {}) {
    const { schrift = 22, deaktiviert = false } = optionen;
    const g = scene.add.graphics().setDepth(10);
    const label = scene.add.text(x, y, text, { fontSize: `${schrift}px`, fontFamily: 'monospace', fontStyle: 'bold', color: deaktiviert ? '#6f7d88' : '#f4efe6', stroke: '#0d1117', strokeThickness: 3 })
        .setOrigin(0.5).setDepth(11);
    const pfeil = scene.add.text(x - breite / 2 + 26, y, '>', { fontSize: `${schrift}px`, fontFamily: 'monospace', fontStyle: 'bold', color: '#ffdd55' })
        .setOrigin(0.5).setDepth(11).setVisible(false);
    const zone = scene.add.rectangle(x, y, breite, hoehe, 0x000000, 0).setInteractive({ useHandCursor: true }).setDepth(12);
    const k = { x, y, aktiv: false, an: 0, g, label, pfeil, zone, farbe, deaktiviert };
    const zeichne = (t) => {
        g.clear();
        const hov = k.an;                                          // 0 bis 1 (weich ein- und ausblenden)
        const dx = x - breite / 2, dy = y - hoehe / 2 - hov * 2;
        const kerbe = 5;
        const fuell = deaktiviert ? 0x1b2128 : lerpFarbe(0x1c2430, lerpFarbe(0x2b3a52, farbe, 0.22), hov);
        const rand = deaktiviert ? 0x39434c : lerpFarbe(0x44525e, 0xffdd55, hov);
        // dunkler Schatten
        g.fillStyle(0x000000, 0.4).fillRect(dx + 4, dy + 6, breite, hoehe);
        // Rahmen mit abgeschnittenen Ecken (Pixelstil)
        g.fillStyle(rand).fillRect(dx + kerbe, dy, breite - 2 * kerbe, hoehe).fillRect(dx, dy + kerbe, breite, hoehe - 2 * kerbe);
        g.fillStyle(fuell).fillRect(dx + kerbe + 2, dy + 3, breite - 2 * kerbe - 4, hoehe - 6).fillRect(dx + 3, dy + kerbe + 2, breite - 6, hoehe - 2 * kerbe - 4);
        // Lichtband oben, Schatten unten
        g.fillStyle(0xffffff, 0.08 + 0.08 * hov).fillRect(dx + kerbe + 3, dy + 4, breite - 2 * kerbe - 6, 4);
        g.fillStyle(0x000000, 0.25).fillRect(dx + kerbe + 3, dy + hoehe - 8, breite - 2 * kerbe - 6, 4);
        // Farbakzent links (wie ein Griff) und rechts ein kleiner Punkt
        g.fillStyle(deaktiviert ? 0x39434c : farbe).fillRect(dx + 6, dy + 8, 8, hoehe - 16);
        g.fillStyle(0xffffff, 0.35).fillRect(dx + 6, dy + 8, 3, hoehe - 16);
        if (!deaktiviert) g.fillStyle(farbe, 0.6 + 0.4 * hov).fillRect(dx + breite - 16, y - 3 - hov * 2, 6, 6);
        // beim Auswählen: glühender gelber Rahmen
        if (hov > 0.05) { g.lineStyle(2, 0xffdd55, hov * (0.55 + 0.35 * Math.sin(t * 0.008))).strokeRect(dx - 2, dy - 2, breite + 4, hoehe + 4); }
        label.setPosition(x + 8, y - hov * 2); pfeil.setPosition(x - breite / 2 + 28 + Math.sin(t * 0.012) * 3, y - hov * 2);
        pfeil.setVisible(hov > 0.4 && !deaktiviert).setAlpha(hov);
    };
    k.zeichne = zeichne;
    k.hover = false;
    zone.on('pointerover', () => { k.hover = true; if (!deaktiviert && k.beiHover) k.beiHover(); });
    zone.on('pointerout', () => { k.hover = false; });
    zone.on('pointerdown', () => aktion());
    k.zerstoere = () => { g.destroy(); label.destroy(); pfeil.destroy(); zone.destroy(); };
    return k;
}

// Kleine Beschriftung in einem Kasten (Tastenkürzel-Hinweise): [A D] Laufen
export function chip(scene, x, y, taste, text, farbe = 0x4aa3ff) {
    const t1 = scene.add.text(0, 0, taste, { fontSize: '12px', fontFamily: 'monospace', fontStyle: 'bold', color: '#14101f' });
    const t2 = scene.add.text(0, 0, text, { fontSize: '12px', fontFamily: 'monospace', color: '#d8cfc4' });
    const bw = t1.width + 12, gesamt = bw + 6 + t2.width;
    const g = scene.add.graphics().setDepth(10);
    const x0 = x - gesamt / 2;
    g.fillStyle(0x000000, 0.5).fillRect(x0 + 2, y - 8, bw, 18);
    g.fillStyle(farbe).fillRect(x0, y - 10, bw, 18).fillStyle(0xffffff, 0.35).fillRect(x0, y - 10, bw, 3);
    t1.setPosition(x0 + 6, y - 8).setDepth(11);
    t2.setPosition(x0 + bw + 6, y - 8).setDepth(11);
    return gesamt;
}

// Die Beschriftungs-Leiste mit allen Tastenhinweisen, mittig angeordnet
export function chipZeile(scene, y, eintraege) {
    // erst Breiten messen
    const mass = eintraege.map(([taste, text]) => {
        const a = scene.add.text(0, 0, taste, { fontSize: '12px', fontFamily: 'monospace', fontStyle: 'bold' }), b = scene.add.text(0, 0, text, { fontSize: '12px', fontFamily: 'monospace' });
        const w = a.width + 12 + 6 + b.width; a.destroy(); b.destroy(); return w;
    });
    const abstand = 14, gesamt = mass.reduce((s, w) => s + w, 0) + abstand * (mass.length - 1);
    let x = MITTE_X - gesamt / 2;
    eintraege.forEach(([taste, text, farbe], i) => { chip(scene, x + mass[i] / 2, y, taste, text, farbe); x += mass[i] + abstand; });
}

// Eine Statusleiste oben (links und rechts gleich weit vom Rand): kleine Kästen, die man anklicken kann.
export function oberKnopf(scene, x, y, text, aktion, linksBuendig = true) {
    const t = scene.add.text(x, y, text, { fontSize: '14px', fontFamily: 'monospace', fontStyle: 'bold', color: '#d8cfc4', backgroundColor: '#1b2230', padding: { x: 10, y: 5 } })
        .setOrigin(linksBuendig ? 0 : 1, 0.5).setDepth(15).setInteractive({ useHandCursor: true });
    t.on('pointerover', () => t.setColor('#ffdd55'));
    t.on('pointerout', () => t.setColor('#d8cfc4'));
    t.on('pointerdown', aktion);
    return t;
}

export { sfx };
