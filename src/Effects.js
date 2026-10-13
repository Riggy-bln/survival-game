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
// Das Mal-Werkzeug für die Erde: rechnet Welt-Koordinaten in Bild-Koordinaten um (x0, y0 = Ecke des Bildes).
// Jede Form hat am Ende eine optionale Deckkraft a (1 = voll sichtbar, 0.2 = fast durchsichtig).
function werkzeug(g, x0, y0) {
    return {
        rect: (c, x, y, w, h, a = 1) => g.fillStyle(c, a).fillRect(x - x0, y - y0, w, h),
        tri: (c, x1, y1, x2, y2, x3, y3, a = 1) => g.fillStyle(c, a).fillTriangle(x1 - x0, y1 - y0, x2 - x0, y2 - y0, x3 - x0, y3 - y0),
        ell: (c, x, y, w, h, a = 1) => g.fillStyle(c, a).fillEllipse(x - x0, y - y0, w, h),
        line: (c, breite, x1, y1, x2, y2, a = 1) => g.lineStyle(breite, c, a).beginPath().moveTo(x1 - x0, y1 - y0).lineTo(x2 - x0, y2 - y0).strokePath(),
    };
}

function backe(scene, schluessel, x0, y0, breite, hoehe, zeichne) {
    if (!scene.textures.exists(schluessel)) {
        const g = scene.add.graphics();
        const r = werkzeug(g, x0, y0);
        zeichne(r);
        let ok = false;
        try {
            g.generateTexture(schluessel, breite, hoehe);
            // Selbstprüfung: Ist im fertigen Bild wirklich etwas gemalt? (Alpha-Wert > 0)
            const daten = scene.textures.get(schluessel).getSourceImage().getContext('2d')
                .getImageData(0, 0, breite, hoehe).data;
            for (let i = 3; i < daten.length; i += 4 * 97) { if (daten[i] > 0) { ok = true; break; } }
        } catch (fehler) {
            if (window.zeigeFehler) window.zeigeFehler('Erd-Textur fehlgeschlagen: ' + fehler);
        }
        g.destroy();
        if (!ok) {
            // Ersatzweg: direkt zeichnen (langsamer, aber sichtbar)
            if (window.zeigeFehler) window.zeigeFehler('Erd-Textur ' + schluessel + ' war leer: zeichne direkt.');
            const d = scene.add.graphics().setDepth(1);
            zeichne(werkzeug(d, 0, 0));
            return d;
        }
    }
    return scene.add.image(x0, y0, schluessel).setOrigin(0, 0).setDepth(1);
}

// Eine Welle als Funktion der Welt-X-Position. Weil sie nur von x abhängt (nicht vom Bildausschnitt),
// setzen sich die Erdschichten über Abschnittsgrenzen hinweg nahtlos fort.
const welle = (x, hoehe, tempo, phase) => hoehe * Math.sin(x * tempo + phase);

// ---- Pixel-Helfer: alles in der Erde wird aus quadratischen "Pixeln" gebaut, nicht aus Rundungen ----

// Eine Ellipse aus Pixelquadraten der Größe "p". farbeFn bekommt einen Lichtwert (-1 = oben links,
// +1 = unten rechts) und liefert die Farbe: so entstehen Glanz und Schatten. "umriss" malt den Rand dunkel.
function pixelEllipse(r, cx, cy, breite, hoehe, p, farbeFn, alpha = 1, umriss = null) {
    const a = breite / 2, b = hoehe / 2;
    const innen = (x, y) => ((x + p / 2 - cx) / a) ** 2 + ((y + p / 2 - cy) / b) ** 2 <= 1;
    const x0 = Math.round((cx - a) / p) * p, y0 = Math.round((cy - b) / p) * p;
    for (let y = y0; y < cy + b; y += p) {
        for (let x = x0; x < cx + a; x += p) {
            if (!innen(x, y)) continue;
            const rand = !innen(x - p, y) || !innen(x + p, y) || !innen(x, y - p) || !innen(x, y + p);
            const licht = ((x + p / 2 - cx) / a + (y + p / 2 - cy) / b) / 2 * 1.6;   // etwa -1 bis +1
            r.rect(umriss !== null && rand ? umriss : farbeFn(licht), x, y, p, p, alpha);
        }
    }
}

// Eine Linie aus Pixelquadraten der Größe "p" (statt einer glatten Linie).
function pixelLinie(r, c, x1, y1, x2, y2, p, alpha = 1) {
    const n = Math.max(1, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / p));
    for (let i = 0; i <= n; i++) {
        r.rect(c, Math.round((x1 + (x2 - x1) * i / n) / p) * p, Math.round((y1 + (y2 - y1) * i / n) / p) * p, p, p, alpha);
    }
}

// Ein Grashalm aus 2-Pixel-Stufen: wächst nach oben und neigt sich dabei um "neigung" Pixel.
function pixelHalm(r, c, x, yBasis, hoehe, neigung, p) {
    for (let k = 0; k < hoehe; k += p) {
        const dx = Math.round(neigung * (k / hoehe) / p) * p;
        r.rect(c, x + dx, yBasis - k - p, k < hoehe * 0.35 ? p * 2 : p, p);   // unten dicker, oben spitz
    }
}

// Malt ein Stück Erde: l = linke Kante, t = Oberkante, w = Breite, tiefe = wie tief gemalt wird.
// Statt eines Kachelrasters gibt es geschwungene Schichten (Gras, Humus, Mutterboden, Lehm,
// dunkler Untergrund, Fels), darüber weiche Flecken, Körnung, runde Felsen, Wurzeln und Risse.
function zeichneErde(r, rnd, l, t, w, tiefe, grund, oberflaeche, istDecke) {
    const SPALTE = 4;   // Schichten werden in 4 Pixel breiten Streifen gemalt (die Kanten sind wellig)

    // Untergrenze jeder Schicht (Tiefe unter der Oberkante) als Funktion von x
    const gras  = (x) => 7 + welle(x, 3, 0.06, 0) + welle(x, 2, 0.17, 1.3);
    const humus = (x) => gras(x) + 13 + welle(x, 5, 0.031, 0.5) + welle(x, 3, 0.11, 2);
    const boden = (x) => 54 + welle(x, 10, 0.017, 2) + welle(x, 6, 0.043, 0);
    const lehm  = (x) => boden(x) + 38 + welle(x, 9, 0.013, 4) + welle(x, 5, 0.05, 1);
    const tief  = (x) => lehm(x) + 70 + welle(x, 18, 0.009, 1) + welle(x, 8, 0.037, 3);

    // Schichten von oben nach unten: [Untergrenze(x), Farbe]. Die letzte reicht bis ganz nach unten.
    const schichten = oberflaeche
        ? [[gras, 0x46602a], [humus, 0x2f241b], [boden, 0x54402d], [lehm, 0x78603f], [tief, 0x40342a], [() => 9999, 0x4b4a46]]
        : [[() => 6, 0x6a5e50], [(x) => 46 + welle(x, 8, 0.02, 1), 0x4a4038], [(x) => 130 + welle(x, 14, 0.012, 2), 0x41372f],
           [(x) => 250 + welle(x, 20, 0.009, 4), 0x39322c], [() => 9999, 0x34312e]];

    for (let x = l; x < l + w; x += SPALTE) {
        const bw = Math.min(SPALTE, l + w - x);
        let y0 = 0;
        schichten.forEach(([grenze, c], k) => {
            const y1 = Math.min(tiefe, grenze(x));
            if (y1 > y0) {
                // Die Farbe schwankt sanft mit x, damit keine Fläche gleichmäßig aussieht
                r.rect(variiere(c, Math.round(welle(x, 4, 0.09, k * 1.7) + welle(x, 3, 0.23, k))), x, t + y0, bw, y1 - y0);
                if (k > 0) r.rect(0x000000, x, t + y0, bw, 2, 0.28);          // dunkle Schichtkante
                y0 = y1;
            }
        });
    }

    // Weiche Flecken: grobe Pixelblöcke (8 Pixel) mit geringer Deckkraft
    for (let i = 0; i < w * tiefe / 9000; i++) {
        const ex = l + rnd.between(0, w), ey = t + rnd.between(14, Math.max(15, tiefe - 4));
        const c = rnd.frac() < 0.5 ? 0x000000 : (oberflaeche ? 0xc8a070 : 0x9a8f80);
        pixelEllipse(r, ex, ey, rnd.between(30, 90), rnd.between(10, 26), 8, () => c, c === 0 ? 0.12 : 0.08);
    }
    // Feine, wellige Schichtlinien
    for (let d = 40; d < tiefe; d += rnd.between(24, 34)) {
        for (let x = l; x < l + w; x += SPALTE) {
            r.rect(0x000000, x, t + d + welle(x, 4, 0.05, d), SPALTE, 1, 0.13);
        }
    }
    // Körnung: winzige helle und dunkle Punkte, frei verteilt (nicht auf einem Raster)
    for (let i = 0; i < w * tiefe / 200; i++) {
        r.rect(rnd.pick([0x1c140e, 0x1c140e, 0xb09872, 0x6a5a48]), l + rnd.between(0, Math.max(0, w - 3)),
            t + rnd.between(12, Math.max(13, tiefe - 2)), rnd.between(2, 3), rnd.between(1, 2), 0.5);
    }
    // Kiesel: ein oder zwei einzelne Pixel
    for (let i = 0; i < w / 14; i++) {
        const px = l + rnd.between(0, w), py = t + rnd.between(22, Math.max(23, tiefe - 3));
        r.rect(rnd.pick([0x7d776a, 0x66605a, 0x8c8474]), px, py, 4, 4);
        if (rnd.frac() < 0.4) r.rect(0xb0aca0, px, py, 2, 2);
        if (rnd.frac() < 0.3) r.rect(0x7d776a, px + 4, py + 2, 4, 2);
    }
    // Felsbrocken aus Pixelblöcken: Umriss dunkel, Licht oben links, Schatten unten rechts
    for (let i = 0; i < w / 85; i++) {
        const bx = l + rnd.between(14, Math.max(15, w - 14)), by = t + rnd.between(36, Math.max(37, tiefe - 16));
        const bw = rnd.between(3, 7) * 4, bh = Math.max(8, Math.round(bw * rnd.between(55, 80) / 100 / 4) * 4);
        const grau = variiere(0x77716a, rnd.between(-12, 12));
        pixelEllipse(r, bx, by, bw, bh, 4, (licht) => licht < -0.45 ? 0xb4afa2 : licht > 0.5 ? 0x4f4b46 : grau, 1, 0x26221e);
    }
    // Risse: dunkle Pixelzickzack-Linien, manchmal mit Abzweig
    for (let i = 0; i < w / 110; i++) {
        let cx = l + rnd.between(6, Math.max(7, w - 6)), cy = t + rnd.between(30, Math.max(31, tiefe - 40));
        for (let k = 0; k < rnd.between(4, 8); k++) {
            const nx = cx + rnd.pick([-6, -4, 4, 6]), ny = cy + rnd.between(4, 8);
            pixelLinie(r, 0x14100c, cx, cy, nx, ny, 2, 0.8);
            if (rnd.frac() < 0.25) pixelLinie(r, 0x14100c, nx, ny, nx + rnd.pick([-10, 10]), ny + rnd.between(2, 6), 2, 0.7);
            cx = nx; cy = ny;
        }
    }

    if (oberflaeche) {
        // Wurzeln: Pixelketten, die von der Grasdecke nach unten wachsen (unten dünner)
        for (let i = 0; i < w / 70; i++) {
            let rx = l + rnd.between(6, Math.max(7, w - 6)), ry = t + gras(rx);
            const laenge = rnd.between(6, 12);
            for (let k = 0; k < laenge; k++) {
                const nx = rx + rnd.pick([-4, -2, 0, 0, 2, 4]), ny = ry + rnd.between(4, 8);
                pixelLinie(r, 0x241a11, rx, ry, nx, ny, k < 3 ? 4 : 2, 0.95);
                if (rnd.frac() < 0.25) pixelLinie(r, 0x241a11, nx, ny, nx + rnd.pick([-8, 8]), ny + rnd.between(2, 6), 2, 0.8);
                rx = nx; ry = ny;
            }
        }
        // Funde aus dem Krieg als Pixelbilder: Knochen, Patronenhülsen, Stacheldraht, Metallplatten
        for (let i = 0; i < w / 230; i++) {
            const fx = l + rnd.between(14, Math.max(15, w - 24)), fy = t + rnd.between(40, Math.max(41, tiefe - 12));
            const art = rnd.between(0, 3);
            if (art === 0) {            // Knochen
                r.rect(0xcfc7b0, fx, fy, 16, 4);
                r.rect(0xcfc7b0, fx - 2, fy - 2, 4, 8); r.rect(0xcfc7b0, fx + 14, fy - 2, 4, 8);
                r.rect(0x8f8872, fx, fy + 2, 16, 2, 0.6);
            } else if (art === 1) {     // Patronenhülsen
                for (let k = 0; k < 3; k++) { r.rect(0xc9a227, fx + k * 6, fy + k * 2, 4, 8); r.rect(0xf0d060, fx + k * 6, fy + k * 2, 2, 8); }
            } else if (art === 2) {     // Stacheldraht
                for (let k = 0; k < 8; k++) r.rect(0x8d8f93, fx + k * 4, fy + (k % 2) * 4, 4, 2);
                r.rect(0x8d8f93, fx + 8, fy - 2, 2, 8);
            } else {                    // verrostete Platte
                r.rect(0x8a4a22, fx, fy, 16, 4); r.rect(0x8a4a22, fx + 4, fy + 4, 12, 4);
                r.rect(0x5e3016, fx + 4, fy + 6, 12, 2); r.rect(0xb0642e, fx, fy, 6, 2);
            }
        }

        // --- Gras oben: Pixel-Halme, hinten dunkel und kurz, vorn hell und länger ---
        for (let x = l; x < l + w; x += rnd.pick([4, 4, 6])) {                         // hintere Reihe
            pixelHalm(r, rnd.pick([0x384e20, 0x435c26]), x, t + 3, rnd.between(2, 4) * 2, rnd.pick([-2, 0, 2]), 2);
        }
        for (let x = l; x < l + w; x += rnd.pick([2, 4, 4, 6])) {                      // vordere Reihe
            const h = rnd.between(4, rnd.frac() < 0.1 ? 11 : 8) * 2;
            const c = rnd.frac() < 0.07 ? 0x9a8f50 : rnd.pick([0x4f6b2a, 0x5f7f32, 0x75963d, 0x8fae4a]);
            pixelHalm(r, c, x, t + 3, h, rnd.pick([-4, -2, 0, 2, 4]), 2);
        }
        // Franse unter der Grasdecke: kleine Pixel-Zapfen hängen in die Erde
        for (let x = l; x < l + w; x += 4) {
            r.rect(0x2f4a1c, x, t + gras(x), 2, rnd.pick([2, 4, 6, 8]));
        }
        // Blumen: vier Blütenpixel um eine Mitte
        for (let i = 0; i < w / 260; i++) {
            const bx = Math.round((l + rnd.between(10, Math.max(11, w - 10))) / 2) * 2, hh = rnd.between(5, 8) * 2;
            r.rect(0x4f6b2a, bx, t - hh, 2, hh + 3);
            const bl = rnd.pick([0xe6e0d0, 0xd9b43a, 0xb04a4a]);
            r.rect(bl, bx - 4, t - hh - 2, 4, 4); r.rect(bl, bx + 2, t - hh - 2, 4, 4);
            r.rect(bl, bx - 1, t - hh - 5, 4, 4); r.rect(bl, bx - 1, t - hh + 1, 4, 4);
            r.rect(0xf2c230, bx - 1, t - hh - 2, 4, 4);
        }
        // trockene Büschel (gestapelte Pixelreihen) und kleine Steine auf der Oberfläche
        for (let i = 0; i < w / 120; i++) {
            const x = Math.round((l + rnd.between(0, w)) / 2) * 2;
            for (let k = 0; k < 5; k++) r.rect(k % 2 ? 0xa89a52 : 0x8a7c3a, x - (5 - k) * 2, t - k * 2 - 2, (5 - k) * 4, 2);
        }
        for (let i = 0; i < w / 200; i++) {
            const x = l + rnd.between(4, Math.max(5, w - 12)), n = rnd.between(2, 3) * 4;
            pixelEllipse(r, x, t - 2, n * 2, n, 4, (licht) => licht < -0.4 ? 0xb4afa2 : licht > 0.5 ? 0x4f4b46 : 0x77716a, 1, 0x26221e);
        }
    } else {
        // Untergrund: Geröll aus Pixeln auf dem Boden, Tropfsteine an Decken
        for (let i = 0; i < w / 25; i++) {
            const gx = l + rnd.between(0, w), n = rnd.pick([4, 4, 8]);
            r.rect(rnd.pick([0x7d776a, 0x66605a, 0x8c8474]), gx, t - n / 2, n, n / 2 + 2);
        }
        if (istDecke) {
            for (let x = l + 6; x < l + w - 6; x += rnd.between(14, 30)) {
                const h = rnd.between(2, 5) * 4;
                for (let k = 0; k < h; k += 4) {            // Zapfen aus Pixelstufen: wird nach unten schmaler
                    const breite = Math.max(2, 10 - Math.floor(k * 10 / h / 2) * 2);
                    r.rect(0x40372c, x - breite / 2, t + tiefe - 1 + k, breite, 4);
                    r.rect(0x5a4e40, x - breite / 2, t + tiefe - 1 + k, 2, 4, 0.8);
                }
            }
        }
    }

    // Tiefe: nach unten wird es dunkler (weiche Streifen mit steigender Deckkraft)
    for (let yy = 0; yy < tiefe; yy += 10) r.rect(0x000000, l, t + yy, w, 10, 0.30 * yy / tiefe);
    // Kantenschatten an den Seiten: gibt dem Block Rundung
    r.rect(0x000000, l, t + 8, 3, tiefe - 8, 0.25);
    r.rect(0x000000, l + w - 3, t + 8, 3, tiefe - 8, 0.25);
}

// Gibt allen Plattformen ihr Aussehen. Es gibt drei Arten:
//  1. Erde (Oberfläche und Untergrund): feine 8-Pixel-Kacheln, oben mit Grasschicht.
//  2. Dünne Platten (Beton, Stahl): Kanten, Nieten, Risse, Rostspuren.
//  3. Dicke Blöcke (Beton, Kisten): Ziegelmuster mit Fugen.
// Die Erde wird einmal in Bilder gebacken (siehe backe), der Rest einmal gemalt.
export function decoratePlatforms(scene, platforms, boden) {
    const g = scene.add.graphics().setDepth(1);
    const rnd = new Phaser.Math.RandomDataGenerator(['boden']);
    const TIEFE = 400;     // so tief wird die Erde detailliert gemalt: bis ganz nach unten (Erdblöcke sind höchstens 340 hoch)
    const ERDFARBEN = [0x5b4a35, 0x4b3b2a];
    let nr = 0;

    for (const p of platforms) {
        const l = p.x - p.width / 2, t = p.y - p.height / 2, b = t + p.height;
        const grundfarbe = p.fillColor;
        const istErde = ERDFARBEN.includes(grundfarbe) && p.height >= 40;

        if (istErde) {
            const anOberflaeche = t <= boden + 1;
            const istDecke = !anOberflaeche && p.height <= 80;
            const tiefe = Math.min(p.height, TIEFE);
            nr += 1;
            // Große Plattformen in Stücke von höchstens 2048 Pixeln Breite teilen (Grenze für Bilder).
            for (let cx = l, i = 0; cx < l + p.width; cx += 2048, i++) {
                const cw = Math.min(2048, l + p.width - cx);
                const oben = 16, unten = istDecke ? 24 : 0;     // Platz für Halme oben und Tropfsteine unten
                const key = `erde_${nr}_${i}`;
                backe(scene, key, cx, t - oben, cw, tiefe + oben + unten, (r) => {
                    const lokal = new Phaser.Math.RandomDataGenerator([key]);   // pro Stück ein fester Zufall
                    zeichneErde(r, lokal, cx, t, cw, tiefe, grundfarbe, anOberflaeche, istDecke);
                });
            }
        } else if (p.height < 40) {
            // --- Dünne Platte (Beton, Stahl): Kanten, Nieten, Risse, Rost ---
            g.fillStyle(variiere(grundfarbe, 22)).fillRect(l, t, p.width, 3);
            g.fillStyle(variiere(grundfarbe, -40)).fillRect(l, b - 4, p.width, 4);
            for (let x = l + 10; x < l + p.width - 6; x += 44) g.fillStyle(variiere(grundfarbe, -50)).fillRect(x, t + 8, 4, 4);
            for (let i = 0; i < p.width / 120; i++) {
                const x = l + rnd.between(6, Math.max(7, p.width - 12));
                g.lineStyle(1, variiere(grundfarbe, -55)).beginPath().moveTo(x, t + 3).lineTo(x + rnd.between(-6, 6), b - 4).strokePath();
            }
            for (let i = 0; i < p.width / 90; i++) {                           // Rostspuren nach unten
                const x = l + rnd.between(4, Math.max(5, p.width - 4));
                g.fillStyle(0x6b3a22, 0.7).fillRect(x, b, 2, rnd.between(5, 15));
            }
        } else {
            // --- Dicke Blöcke (Beton, Kisten): Ziegelmuster mit Fugen ---
            const fuge = variiere(grundfarbe, -45);
            for (let ry = 0; ry < p.height; ry += 20) {
                g.fillStyle(fuge).fillRect(l, t + ry, p.width, 2);
                const versatz = (ry / 20) % 2 === 0 ? 0 : 20;
                for (let x = l + versatz; x < l + p.width; x += 40) {
                    if (x > l) g.fillStyle(fuge).fillRect(x, t + ry, 2, 20);
                    if (rnd.frac() < 0.12) g.fillStyle(variiere(grundfarbe, rnd.between(-14, 14))).fillRect(x + 3, t + ry + 3, 34, 15);
                }
            }
            g.fillStyle(variiere(grundfarbe, 25)).fillRect(l, t, p.width, 3);
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
