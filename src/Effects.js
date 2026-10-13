// Alles Optische, was nicht zur Spiellogik gehört: Himmel, Hintergrund-Schichten,
// Oberflächen der Plattformen und Partikel (Blut, Funken, Staub, Explosionen).
// Die Szene ruft nur noch ein paar kurze Funktionen auf.

// Malt den Himmel (Farbbänder von oben nach unten) und eine tiefe Sonne.
// setScrollFactor(0) = am Bildschirm festgeheftet, scrollt nie.
export function buildSky(scene) {
    const g = scene.add.graphics().setScrollFactor(0).setDepth(-30);
    // Von dunkel-violett oben zu glühend orange am Horizont, in 18 Streifen.
    const von = Phaser.Display.Color.ValueToColor(0x1c1a2e);
    const bis = Phaser.Display.Color.ValueToColor(0xc4623a);
    const streifen = 18;
    for (let i = 0; i < streifen; i++) {
        const c = Phaser.Display.Color.Interpolate.ColorWithColor(von, bis, streifen - 1, i);
        g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b));
        g.fillRect(0, (540 / streifen) * i, 960, 540 / streifen + 1);
    }
    // Große, blasse Sonne hinter dem Dunst
    scene.add.circle(700, 330, 90, 0xffb36b, 0.55).setScrollFactor(0.03).setDepth(-29);
    scene.add.circle(700, 330, 130, 0xff9a55, 0.18).setScrollFactor(0.03).setDepth(-29);
}

// Eine Schicht Stadtsilhouette. Je kleiner scrollFaktor, desto "weiter weg": Sie bewegt
// sich langsamer als die Kamera. Das ist der Parallax-Effekt, der Tiefe erzeugt.
export function buildSkyline(scene, worldWidth, boden, scrollFaktor, farbe, hoeheMin, hoeheMax, seed) {
    const rnd = new Phaser.Math.RandomDataGenerator([seed]);
    const g = scene.add.graphics().setScrollFactor(scrollFaktor).setDepth(-20 + scrollFaktor);
    // Auf dem Bildschirm soll der Fuß der Gebäude etwa auf Höhe der Oberfläche liegen,
    // wenn der Spieler dort steht (Kamera ca. 430 Pixel tief).
    const fuss = (boden - 430) + scrollFaktor * 430 + 40;
    g.fillStyle(farbe);
    const reichweite = worldWidth * scrollFaktor + 1100;
    for (let x = -50; x < reichweite; ) {
        const breite = rnd.between(50, 130);
        const hoehe = rnd.between(hoeheMin, hoeheMax);
        g.fillRect(x, fuss - hoehe, breite, hoehe + 900);              // Gebäude (nach unten verlängert)
        if (rnd.frac() < 0.5) g.fillRect(x + 10, fuss - hoehe - 18, 14, 18);  // kaputter Aufbau
        if (rnd.frac() < 0.35) {                                       // zackiger Einsturz oben
            g.fillTriangle(x + breite * 0.4, fuss - hoehe, x + breite, fuss - hoehe, x + breite, fuss - hoehe - 30);
        }
        x += breite + rnd.between(0, 20);
    }
}

// Kleine Farbhelfer: zwei Farben mischen und eine Farbe um einen Wert heller/dunkler machen.
const farbe = Phaser.Display.Color;
function mische(c1, c2, t) {
    const a = farbe.ValueToColor(c1), b = farbe.ValueToColor(c2);
    return farbe.GetColor(Math.round(a.r + (b.r - a.r) * t), Math.round(a.g + (b.g - a.g) * t), Math.round(a.b + (b.b - a.b) * t));
}
function variiere(c, n) {
    const a = farbe.ValueToColor(c);
    const k = (v) => Math.max(0, Math.min(255, v + n));
    return farbe.GetColor(k(a.r), k(a.g), k(a.b));
}

// Gibt allen Plattformen ihr Aussehen. Es gibt drei Arten:
//  1. Erde an der Oberfläche: Grasdecke, Mutterboden, Steine, Wurzeln, tiefer dunkler.
//  2. Erde im Untergrund (Tunnel): dunkles Gestein, Kiesel, Tropfsteine an Tunneldecken.
//  3. Beton/Kisten/Stufen: Fugen, Nieten, Risse, Rostspuren.
// Alles wird einmal gemalt (statisch). Der feste Startwert macht das Ergebnis immer gleich.
export function decoratePlatforms(scene, platforms, boden) {
    const g = scene.add.graphics().setDepth(1);
    const rnd = new Phaser.Math.RandomDataGenerator(['boden']);
    const KACHEL = 20;     // Größe eines Erdstücks
    const TIEFE = 140;     // so tief wird die Erde detailliert gemalt (darunter bleibt die Grundfarbe)
    const ERDFARBEN = [0x5b4a35, 0x4b3b2a];

    for (const p of platforms) {
        const l = p.x - p.w / 2, t = p.y - p.h / 2, b = t + p.h;
        const grundfarbe = p.fillColor;
        const istErde = ERDFARBEN.includes(grundfarbe) && p.h >= 40;
        const anOberflaeche = t <= boden + 1;

        if (istErde) {
            // --- Erdschichten als Kacheln: oben braun und warm, nach unten dunkler und kühler ---
            const bis = Math.min(p.h, TIEFE);
            const hellOben = anOberflaeche ? 0x6b5238 : 0x5a4a3a;
            const dunkelUnten = anOberflaeche ? 0x3f3226 : 0x30281f;
            for (let ty = 0; ty < bis; ty += KACHEL) {
                for (let tx = l; tx < l + p.w; tx += KACHEL) {
                    const c = variiere(mische(hellOben, dunkelUnten, ty / TIEFE), rnd.between(-9, 9));
                    g.fillStyle(c).fillRect(tx, t + ty, Math.min(KACHEL - 1, l + p.w - tx), Math.min(KACHEL - 1, bis - ty));
                }
            }
            // Steine im Boden
            for (let i = 0; i < p.w / 80; i++) {
                const sx = l + rnd.between(10, Math.max(11, p.w - 10)), sy = t + rnd.between(24, Math.max(25, bis - 6));
                const sw = rnd.between(8, 18), sh = rnd.between(6, 11);
                g.fillStyle(0x6f6a5e).fillEllipse(sx, sy, sw, sh);
                g.fillStyle(0x8d887a).fillEllipse(sx - 2, sy - 2, sw * 0.5, sh * 0.4);
            }
            if (anOberflaeche) {
                // Wurzeln, die von der Grasdecke nach unten wachsen
                g.lineStyle(2, 0x2e2318);
                for (let i = 0; i < p.w / 110; i++) {
                    let rx = l + rnd.between(6, Math.max(7, p.w - 6)), ry = t + 8;
                    g.beginPath().moveTo(rx, ry);
                    for (let k = 0; k < 4; k++) { rx += rnd.between(-6, 6); ry += rnd.between(7, 12); g.lineTo(rx, ry); }
                    g.strokePath();
                }
                // Grasdecke mit ausgefranstem Rand nach unten
                g.fillStyle(0x4a5e22).fillRect(l, t, p.w, 8);
                for (let x = l; x < l + p.w; x += 4) g.fillRect(x, t + 8, 4, rnd.between(2, 8));
                g.fillStyle(0x6f8a34).fillRect(l, t, p.w, 3);
                // Halme, Blumen und trockene Büschel
                for (let x = l; x < l + p.w; x += rnd.between(3, 7)) {
                    const h = rnd.between(3, 9);
                    g.fillStyle(rnd.frac() < 0.5 ? 0x6f8a34 : 0x86a042).fillRect(x, t - h, 2, h);
                    if (rnd.frac() < 0.04) {
                        g.fillStyle(rnd.pick([0xe8d44a, 0xd9534f, 0xf0f0f0])).fillRect(x - 1, t - h - 3, 4, 4);
                    }
                }
                for (let i = 0; i < p.w / 150; i++) {                    // trockene Büschel
                    const x = l + rnd.between(0, p.w);
                    g.fillStyle(0x9a8a4a).fillTriangle(x - 5, t, x + 5, t, x, t - 11);
                }
            } else {
                // Untergrund: heller Rand oben, Kiesel, Tropfsteine an dünnen Decken
                g.fillStyle(0x6d5d4a).fillRect(l, t, p.w, 3);
                for (let i = 0; i < p.w / 50; i++) {
                    g.fillStyle(0x7c7466).fillRect(l + rnd.between(0, p.w), t - 2, rnd.between(2, 4), 3);
                }
                if (p.h <= 80) {                                          // Tunneldecke
                    g.fillStyle(0x2c241c).fillRect(l, b - 4, p.w, 4);
                    for (let x = l + 6; x < l + p.w - 6; x += rnd.between(18, 40)) {
                        const h = rnd.between(6, 18);
                        g.fillStyle(0x3a3027).fillTriangle(x - 4, b, x + 4, b, x, b + h);
                    }
                }
            }
        } else if (p.h < 40) {
            // --- Dünne Platte (Beton, Stahl): Kanten, Nieten, Risse, Rost ---
            g.fillStyle(variiere(grundfarbe, 22)).fillRect(l, t, p.w, 3);
            g.fillStyle(variiere(grundfarbe, -40)).fillRect(l, b - 4, p.w, 4);
            for (let x = l + 10; x < l + p.w - 6; x += 44) g.fillStyle(variiere(grundfarbe, -50)).fillRect(x, t + 8, 4, 4);
            for (let i = 0; i < p.w / 120; i++) {
                const x = l + rnd.between(6, Math.max(7, p.w - 12));
                g.lineStyle(1, variiere(grundfarbe, -55)).beginPath().moveTo(x, t + 3).lineTo(x + rnd.between(-6, 6), b - 4).strokePath();
            }
            for (let i = 0; i < p.w / 90; i++) {                           // Rostspuren nach unten
                const x = l + rnd.between(4, Math.max(5, p.w - 4));
                g.fillStyle(0x6b3a22, 0.7).fillRect(x, b, 2, rnd.between(5, 15));
            }
        } else {
            // --- Dicke Blöcke (Beton, Kisten): Ziegelmuster mit Fugen ---
            const fuge = variiere(grundfarbe, -45);
            for (let ry = 0; ry < p.h; ry += 20) {
                g.fillStyle(fuge).fillRect(l, t + ry, p.w, 2);
                const versatz = (ry / 20) % 2 === 0 ? 0 : 20;
                for (let x = l + versatz; x < l + p.w; x += 40) {
                    if (x > l) g.fillStyle(fuge).fillRect(x, t + ry, 2, 20);
                    if (rnd.frac() < 0.12) g.fillStyle(variiere(grundfarbe, rnd.between(-14, 14))).fillRect(x + 3, t + ry + 3, 34, 15);
                }
            }
            g.fillStyle(variiere(grundfarbe, 25)).fillRect(l, t, p.w, 3);
        }
    }
}

// Dunkle Ränder wie bei einem alten Film: die Mitte bleibt hell, die Ecken werden dunkel.
// Das Bild entsteht einmal auf einer Canvas-Fläche (einem Mal-Brett des Browsers).
export function buildVignette(scene) {
    if (!scene.textures.exists('vignette')) {
        const tex = scene.textures.createCanvas('vignette', 960, 540);
        const ctx = tex.getContext();
        const grad = ctx.createRadialGradient(480, 270, 200, 480, 270, 620);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(1, 'rgba(0,0,0,0.6)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 960, 540);
        tex.refresh();
    }
    scene.add.image(0, 0, 'vignette').setOrigin(0, 0).setScrollFactor(0).setDepth(15);
}

// Glut und Asche, die über den ganzen Bildschirm nach oben treiben (Stimmung).
export function buildEmbers(scene) {
    scene.add.particles(0, 0, 'px', {
        x: { min: 0, max: 960 }, y: 560, lifespan: 7000, frequency: 140,
        speedY: { min: -70, max: -25 }, speedX: { min: -25, max: 25 },
        scale: { start: 1, end: 0.3 }, alpha: { start: 0.8, end: 0 },
        tint: [0xff9944, 0xffcc66, 0x888888],
    }).setScrollFactor(0).setDepth(14);
}

// Partikel-Effekte. Ein Partikel ist ein winziges Quadrat, das fliegt, fällt und verschwindet.
export default class Effects {
    constructor(scene) {
        this.scene = scene;
        // Eine 4x4-Pixel-Textur, die wir selbst malen. Alle Partikel benutzen sie (mit anderer Farbe).
        if (!scene.textures.exists('px')) {
            const t = scene.add.graphics();
            t.fillStyle(0xffffff).fillRect(0, 0, 4, 4);
            t.generateTexture('px', 4, 4);
            t.destroy();
        }
        const emitter = (config) => scene.add.particles(0, 0, 'px', { emitting: false, ...config }).setDepth(7);
        this.blutE = emitter({ lifespan: { min: 300, max: 700 }, speed: { min: 80, max: 260 },
            angle: { min: 180, max: 360 }, gravityY: 800, scale: { start: 1.4, end: 0.4 },
            tint: [0xaa1111, 0xcc2222, 0x771111] });
        this.funkenE = emitter({ lifespan: { min: 150, max: 350 }, speed: { min: 100, max: 300 },
            angle: { min: 0, max: 360 }, gravityY: 500, scale: { start: 1, end: 0 },
            tint: [0xffee88, 0xffbb44, 0xffffff] });
        this.feuerE = emitter({ lifespan: { min: 300, max: 800 }, speed: { min: 80, max: 380 },
            angle: { min: 0, max: 360 }, gravityY: 200, scale: { start: 2.5, end: 0 },
            tint: [0xffdd55, 0xff8822, 0xff4411] });
        this.truemmerE = emitter({ lifespan: { min: 500, max: 1100 }, speed: { min: 150, max: 450 },
            angle: { min: 180, max: 360 }, gravityY: 900, scale: { start: 2, end: 1 },
            tint: [0x4b3b2a, 0x6b5b4a, 0x333333] });
        this.rauchE = emitter({ lifespan: { min: 600, max: 1400 }, speed: { min: 20, max: 90 },
            angle: { min: 240, max: 300 }, gravityY: -40, scale: { start: 3, end: 6 }, alpha: { start: 0.45, end: 0 },
            tint: [0x333333, 0x555555] });
        this.staubE = emitter({ lifespan: { min: 200, max: 450 }, speed: { min: 30, max: 120 },
            angle: { min: 200, max: 340 }, gravityY: 100, scale: { start: 1.6, end: 0 }, alpha: { start: 0.6, end: 0 },
            tint: [0xb09a7a, 0x8a7a60] });
    }

    blood(x, y, anzahl = 8) { this.blutE.explode(anzahl, x, y); }
    sparks(x, y, anzahl = 5) { this.funkenE.explode(anzahl, x, y); }
    dust(x, y) { this.staubE.explode(6, x, y); }
    muzzle(x, y) { this.funkenE.explode(4, x, y); }

    // Tod eines Gegners: viel Blut und eine Leiche, die umkippt und liegen bleibt.
    death(x, y, farbe = 0xcc4444, richtung = 1, groesse = 1) {
        this.blutE.explode(26, x, y);
        this.corpse(x, y + 24 * groesse, farbe, richtung, groesse);
    }

    // Die Leiche ist ein kleines Bild aus Rechtecken, gezeichnet relativ zu den Füßen (0, 0).
    // Ein Tween dreht sie um die Füße um 90 Grad: Sie kippt um.
    corpse(x, y, farbe, richtung, groesse) {
        const scene = this.scene;
        const dunkel = Phaser.Display.Color.ValueToColor(farbe).darken(40).color;
        const g = scene.add.graphics({ x, y }).setDepth(2);
        g.fillStyle(dunkel).fillRect(-12, -14, 24, 14);       // Beine
        g.fillStyle(farbe).fillRect(-13, -34, 26, 20);         // Rumpf
        g.fillStyle(0x8a6a50).fillRect(-8, -48, 16, 14);       // Kopf
        g.setScale(groesse);
        scene.tweens.add({
            targets: g, angle: 90 * richtung, duration: 320, ease: 'Bounce.easeOut',
        });
        // Nur die letzten 12 Leichen behalten, sonst wird das Spiel mit der Zeit langsamer.
        this.leichen = this.leichen ?? [];
        this.leichen.push(g);
        if (this.leichen.length > 12) this.leichen.shift().destroy();
    }

    // Der Boss stirbt: mehrere Explosionen hintereinander.
    bossDeath(x, y) {
        for (let i = 0; i < 5; i++) {
            this.scene.time.delayedCall(i * 180, () => {
                this.explosion(x + Phaser.Math.Between(-40, 40), y + Phaser.Math.Between(-50, 40));
                this.scene.cameras.main.shake(180, 0.012);
            });
        }
    }

    // Explosion: Feuer, Trümmer, Rauch.
    explosion(x, y) {
        this.feuerE.explode(40, x, y);
        this.truemmerE.explode(24, x, y);
        this.rauchE.explode(14, x, y);
    }
}
