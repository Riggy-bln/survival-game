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

// Malt einen Ausschnitt EINMAL in ein Bild (eine "Textur") und zeigt dieses Bild danach nur noch an.
// Das ist viel schneller, als jedes Frame tausende Kleinteile neu zu zeichnen. So können wir
// die Erde in feinen 8-Pixel-Kacheln malen, ohne dass das Spiel langsamer wird.
// "zeichne" bekommt ein Werkzeug r, mit dem man in Welt-Koordinaten malt.
function backe(scene, schluessel, x0, y0, breite, hoehe, zeichne) {
    if (!scene.textures.exists(schluessel)) {
        const g = scene.add.graphics();
        const r = {
            rect: (c, x, y, w, h) => g.fillStyle(c).fillRect(x - x0, y - y0, w, h),
            tri: (c, x1, y1, x2, y2, x3, y3) => g.fillStyle(c).fillTriangle(x1 - x0, y1 - y0, x2 - x0, y2 - y0, x3 - x0, y3 - y0),
        };
        zeichne(r);
        g.generateTexture(schluessel, breite, hoehe);
        g.destroy();
    }
    return scene.add.image(x0, y0, schluessel).setOrigin(0, 0).setDepth(1);
}

// Malt ein Stück Erde: l = linke Kante, t = Oberkante, w = Breite, tiefe = wie tief detailliert wird.
function zeichneErde(r, rnd, l, t, w, tiefe, grund, oberflaeche, istDecke) {
    const S = 8;  // Größe einer Kachel ("Pixel") in der Erde
    const hellOben = oberflaeche ? 0x7a5a3c : 0x66564a;
    const GRAS_OBEN = [0x6aa032, 0x7ab83c, 0x5d9029];
    const GRAS_MITTE = [0x4f7f27, 0x467022, 0x588a2c];

    // --- Erde Spalte für Spalte, Kachel für Kachel ---
    for (let x = l; x < l + w; x += S) {
        const bw = Math.min(S, l + w - x);
        // Wie dick die Grasschicht in dieser Spalte ist: 1, 2 oder 3 Kacheln (unregelmäßig)
        const q = rnd.frac();
        const grasTiefe = oberflaeche ? (q < 0.25 ? S : q < 0.8 ? 2 * S : 3 * S) : 0;
        for (let ty = 0; ty < tiefe; ty += S) {
            const hoehe = Math.min(S, tiefe - ty);
            if (ty < grasTiefe) {
                const letzte = ty + S >= grasTiefe;
                const c = ty === 0 ? rnd.pick(GRAS_OBEN) : (letzte ? 0x3b5f1d : rnd.pick(GRAS_MITTE));
                r.rect(c, x, t + ty, bw, hoehe);
                if (ty === 0 && rnd.frac() < 0.6) r.rect(0x9bd14a, x, t, bw, 2);        // Lichtkante
                if (rnd.frac() < 0.35) r.rect(variiere(c, rnd.between(-16, 16)), x + rnd.between(0, 5), t + ty + rnd.between(0, 5), 2, 2);
                continue;
            }
            // Erdkachel: mit der Tiefe vom warmen Braun zur Grundfarbe der Plattform
            let c = mische(hellOben, grund, Math.min(1, ty / tiefe));
            if (Math.floor((ty + 18 * Math.sin(x * 0.02)) / 40) % 2 === 1) c = variiere(c, -7);   // Schichtband
            if (oberflaeche && ty === grasTiefe) c = variiere(c, -14);                             // Schatten unter dem Gras
            c = variiere(c, rnd.between(-8, 8));
            r.rect(c, x, t + ty, bw, hoehe);
            // Körnung: ein bis zwei winzige hellere/dunklere Punkte pro Kachel
            const punkte = rnd.between(0, 2);
            for (let k = 0; k < punkte; k++) {
                r.rect(variiere(c, rnd.pick([-18, -12, 12, 18])), x + rnd.between(0, 5), t + ty + rnd.between(0, 5), 2, 2);
            }
        }
    }

    // --- Steine aus Pixelblöcken (mit Glanz oben links und Schatten unten) ---
    const formen = [[2, 3, 2], [3, 4, 4, 2], [2, 4, 3], [4, 5, 4], [1, 2]];
    for (let i = 0; i < w / 40; i++) {
        const sx = l + rnd.between(8, Math.max(9, w - 24)), sy = t + rnd.between(30, Math.max(31, tiefe - 14));
        const form = rnd.pick(formen);
        const grau = variiere(0x7d776a, rnd.between(-12, 12));
        form.forEach((n, j) => {
            const breite = n * 4;
            r.rect(j === form.length - 1 ? 0x4f4a42 : grau, sx - breite / 2, sy + j * 4, breite, 4);
        });
        r.rect(0xa49f90, sx - form[0] * 2, sy, 4, 4);
    }
    // Kies: kleine helle und dunkle Punkte
    for (let i = 0; i < w / 10; i++) {
        r.rect(rnd.pick([0x93897a, 0x2d241a, 0x8a7d66]), l + rnd.between(0, Math.max(0, w - 3)), t + rnd.between(26, tiefe - 2), 3, 2);
    }
    // Risse: kleine dunkle Zickzack-Linien
    for (let i = 0; i < w / 120; i++) {
        let cx = l + rnd.between(6, Math.max(7, w - 6)), cy = t + rnd.between(28, Math.max(29, tiefe - 30));
        for (let k = 0; k < 5; k++) { r.rect(0x2a2018, cx, cy, 2, 5); cx += rnd.pick([-3, 3]); cy += 5; }
    }

    if (oberflaeche) {
        // Wurzeln wachsen aus der Grasdecke nach unten
        for (let i = 0; i < w / 90; i++) {
            let rx = l + rnd.between(6, Math.max(7, w - 6)), ry = t + 20;
            for (let k = 0; k < 7; k++) {
                r.rect(0x2a1f15, rx, ry, 2, 5);
                ry += 5; rx += rnd.pick([-3, 0, 0, 3]);
                if (k === 3 && rnd.frac() < 0.6) r.rect(0x2a1f15, rx + 3, ry, 6, 2);     // Seitenwurzel
            }
        }
        // Funde aus dem Krieg: Knochen, Metallschrott, Patronenhülsen
        for (let i = 0; i < w / 260; i++) {
            const fx = l + rnd.between(10, Math.max(11, w - 20)), fy = t + rnd.between(40, Math.max(41, tiefe - 10));
            const art = rnd.between(0, 2);
            if (art === 0) { r.rect(0xd8d0bc, fx, fy, 12, 3); r.rect(0xd8d0bc, fx - 2, fy - 1, 3, 5); r.rect(0xd8d0bc, fx + 11, fy - 1, 3, 5); }
            else if (art === 1) { r.rect(0x8a4a22, fx, fy, 10, 5); r.rect(0x5e3016, fx, fy + 4, 10, 1); }
            else { for (let k = 0; k < 3; k++) r.rect(0xc9a227, fx + k * 5, fy + (k % 2) * 2, 2, 5); }
        }
        // --- Halme, Blumen und Büschel auf der Grasdecke ---
        for (let x = l; x < l + w; x += rnd.between(2, 5)) {
            const h = rnd.between(4, 10);
            const gruen = rnd.pick([0x6aa032, 0x7ab83c, 0x8bc84a, 0x5d9029]);
            r.rect(gruen, x, t - h, 2, h);
            if (rnd.frac() < 0.04) {                                               // Blume (Pixelkreuz)
                const bl = rnd.pick([0xe8d44a, 0xd9534f, 0xf0f0f0, 0xb06ad9]);
                r.rect(bl, x - 2, t - h - 2, 6, 2); r.rect(bl, x, t - h - 4, 2, 6);
                r.rect(0xffe066, x, t - h - 2, 2, 2);
            }
        }
        for (let i = 0; i < w / 120; i++) {                                         // trockene Büschel
            const x = l + rnd.between(0, w);
            r.tri(0xa89a52, x - 6, t, x + 6, t, x, t - 12);
            r.tri(0x8a7c3a, x - 2, t, x + 8, t, x + 3, t - 9);
        }
        for (let i = 0; i < w / 200; i++) r.rect(0x7d776a, l + rnd.between(0, w - 8), t - 4, 8, 5);   // Steinchen auf dem Gras
    } else {
        // Untergrund: heller Rand oben, Kiesel auf dem Boden
        r.rect(0x8a7a64, l, t, w, 2);
        for (let i = 0; i < w / 30; i++) r.rect(0x8c8474, l + rnd.between(0, Math.max(0, w - 4)), t - 3, rnd.between(2, 5), 3);
        if (istDecke) {                                                             // Tropfsteine an der Decke
            for (let x = l + 6; x < l + w - 6; x += rnd.between(14, 32)) {
                const h = rnd.between(6, 20);
                r.tri(0x40372c, x - 5, t + tiefe, x + 5, t + tiefe, x, t + tiefe + h);
            }
        }
    }
}

// Gibt allen Plattformen ihr Aussehen. Es gibt drei Arten:
//  1. Erde (Oberfläche und Untergrund): feine 8-Pixel-Kacheln, oben mit Grasschicht.
//  2. Dünne Platten (Beton, Stahl): Kanten, Nieten, Risse, Rostspuren.
//  3. Dicke Blöcke (Beton, Kisten): Ziegelmuster mit Fugen.
// Die Erde wird einmal in Bilder gebacken (siehe backe), der Rest einmal gemalt.
export function decoratePlatforms(scene, platforms, boden) {
    const g = scene.add.graphics().setDepth(1);
    const rnd = new Phaser.Math.RandomDataGenerator(['boden']);
    const TIEFE = 152;     // so tief wird die Erde detailliert gemalt (darunter bleibt die Grundfarbe)
    const ERDFARBEN = [0x5b4a35, 0x4b3b2a];
    let nr = 0;

    for (const p of platforms) {
        const l = p.x - p.w / 2, t = p.y - p.h / 2, b = t + p.h;
        const grundfarbe = p.fillColor;
        const istErde = ERDFARBEN.includes(grundfarbe) && p.h >= 40;

        if (istErde) {
            const anOberflaeche = t <= boden + 1;
            const istDecke = !anOberflaeche && p.h <= 80;
            const tiefe = Math.min(p.h, TIEFE);
            nr += 1;
            // Große Plattformen in Stücke von höchstens 2048 Pixeln Breite teilen (Grenze für Bilder).
            for (let cx = l, i = 0; cx < l + p.w; cx += 2048, i++) {
                const cw = Math.min(2048, l + p.w - cx);
                const oben = 16, unten = istDecke ? 24 : 0;     // Platz für Halme oben und Tropfsteine unten
                const key = `erde_${nr}_${i}`;
                backe(scene, key, cx, t - oben, cw, tiefe + oben + unten, (r) => {
                    const lokal = new Phaser.Math.RandomDataGenerator([key]);   // pro Stück ein fester Zufall
                    zeichneErde(r, lokal, cx, t, cw, tiefe, grundfarbe, anOberflaeche, istDecke);
                });
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
