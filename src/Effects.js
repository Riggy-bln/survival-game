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

    // Weiche Flecken (große, sehr durchsichtige Ellipsen): wie Feuchtigkeit und Mineralien im Boden
    for (let i = 0; i < w * tiefe / 9000; i++) {
        const ex = l + rnd.between(0, w), ey = t + rnd.between(14, Math.max(15, tiefe - 4));
        if (rnd.frac() < 0.5) r.ell(0x000000, ex, ey, rnd.between(30, 90), rnd.between(8, 26), 0.12);
        else r.ell(oberflaeche ? 0xc8a070 : 0x9a9080, ex, ey, rnd.between(30, 80), rnd.between(8, 22), 0.08);
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
    // Kiesel
    for (let i = 0; i < w / 14; i++) {
        const px = l + rnd.between(0, w), py = t + rnd.between(22, Math.max(23, tiefe - 3));
        const s = rnd.between(3, 6);
        r.ell(0x7d776a, px, py, s, s - 1, 0.85);
        r.ell(0xb0aca0, px - 1, py - 1, s * 0.5, s * 0.4, 0.6);
    }
    // Runde Felsbrocken mit Schatten, Glanzlicht und Riss
    for (let i = 0; i < w / 85; i++) {
        const bx = l + rnd.between(14, Math.max(15, w - 14)), by = t + rnd.between(36, Math.max(37, tiefe - 16));
        const bw = rnd.between(18, 46), bh = Math.round(bw * rnd.between(55, 80) / 100);
        r.ell(0x000000, bx + 2, by + 3, bw, bh, 0.35);
        r.ell(variiere(0x77716a, rnd.between(-14, 14)), bx, by, bw, bh);
        r.ell(0xb4afa2, bx - bw * 0.18, by - bh * 0.2, bw * 0.45, bh * 0.35, 0.55);
        r.line(0x2a2622, 1, bx + bw * 0.1, by - bh * 0.3, bx + bw * 0.25, by + bh * 0.3, 0.7);
    }
    // Risse: dunkle, verzweigte Linien
    for (let i = 0; i < w / 110; i++) {
        let cx = l + rnd.between(6, Math.max(7, w - 6)), cy = t + rnd.between(30, Math.max(31, tiefe - 40));
        for (let k = 0; k < rnd.between(4, 8); k++) {
            const nx = cx + rnd.between(-7, 7), ny = cy + rnd.between(5, 10);
            r.line(0x14100c, rnd.between(1, 2), cx, cy, nx, ny, 0.7);
            if (rnd.frac() < 0.25) r.line(0x14100c, 1, nx, ny, nx + rnd.between(-10, 10), ny + rnd.between(3, 8), 0.6);
            cx = nx; cy = ny;
        }
    }

    if (oberflaeche) {
        // Wurzeln: gebogene, nach unten dünner werdende Linien mit Wurzelhaaren
        for (let i = 0; i < w / 70; i++) {
            let rx = l + rnd.between(6, Math.max(7, w - 6)), ry = t + gras(rx);
            let winkel = Math.PI / 2 + rnd.between(-30, 30) / 100;
            const laenge = rnd.between(6, 12);
            for (let k = 0; k < laenge; k++) {
                winkel += rnd.between(-35, 35) / 100;
                const nx = rx + Math.cos(winkel) * rnd.between(6, 10), ny = ry + Math.abs(Math.sin(winkel)) * rnd.between(6, 10);
                r.line(0x241a11, Math.max(1, 3 - k / 3), rx, ry, nx, ny, 0.9);
                if (rnd.frac() < 0.3) r.line(0x241a11, 1, nx, ny, nx + rnd.between(-8, 8), ny + rnd.between(2, 7), 0.7);
                rx = nx; ry = ny;
            }
        }
        // Funde aus dem Krieg: Knochen, Patronenhülsen, Stacheldraht, Metallplatten
        for (let i = 0; i < w / 230; i++) {
            const fx = l + rnd.between(14, Math.max(15, w - 24)), fy = t + rnd.between(40, Math.max(41, tiefe - 12));
            const art = rnd.between(0, 3);
            if (art === 0) {            // Knochen
                r.line(0xcfc7b0, 3, fx, fy, fx + 14, fy + rnd.between(-3, 3), 0.95);
                r.ell(0xcfc7b0, fx, fy, 5, 5); r.ell(0xcfc7b0, fx + 14, fy, 5, 5);
            } else if (art === 1) {     // Patronenhülsen
                for (let k = 0; k < 3; k++) r.line(0xc9a227, 3, fx + k * 5, fy + k, fx + k * 5 + 2, fy + 7, 0.95);
            } else if (art === 2) {     // Stacheldraht
                let sx = fx;
                for (let k = 0; k < 6; k++) { r.line(0x8d8f93, 1, sx, fy, sx + 5, fy + (k % 2 ? 4 : -4), 0.9); sx += 5; }
            } else {                    // verrostete Platte, schräg
                r.tri(0x8a4a22, fx, fy, fx + 16, fy - 3, fx + 12, fy + 6, 0.95);
                r.tri(0x5e3016, fx, fy, fx + 12, fy + 6, fx + 2, fy + 5, 0.9);
            }
        }

        // --- Gras oben: Halme als spitze Dreiecke, hinten dunkel und kurz, vorne hell und länger ---
        for (let x = l; x < l + w; x += rnd.between(2, 4)) {                         // hintere Reihe
            const h = rnd.between(4, 9);
            r.tri(rnd.pick([0x384e20, 0x435c26]), x - 2, t + 3, x + 2, t + 3, x + rnd.between(-3, 3), t - h);
        }
        for (let x = l; x < l + w; x += rnd.between(2, 5)) {                         // vordere Reihe
            const h = rnd.between(7, rnd.frac() < 0.1 ? 22 : 15);
            const c = rnd.frac() < 0.07 ? 0x9a8f50 : rnd.pick([0x4f6b2a, 0x5f7f32, 0x75963d, 0x8fae4a]);
            r.tri(c, x - 1.5, t + 3, x + 1.5, t + 3, x + rnd.between(-5, 5), t - h);
        }
        // Franse unter der Grasdecke: Grasbüschel hängen ein Stück in die Erde
        for (let x = l; x < l + w; x += 3) {
            const gy = t + gras(x);
            r.tri(0x2f4a1c, x - 2, gy - 1, x + 2, gy - 1, x + rnd.between(-2, 2), gy + rnd.between(2, 8), 0.9);
        }
        // Blumen
        for (let i = 0; i < w / 260; i++) {
            const bx = l + rnd.between(10, Math.max(11, w - 10)), hh = rnd.between(10, 17);
            r.line(0x4f6b2a, 1, bx, t + 2, bx, t - hh, 1);
            const bl = rnd.pick([0xe6e0d0, 0xd9b43a, 0xb04a4a]);
            for (let k = 0; k < 5; k++) {
                const a = k * Math.PI * 2 / 5;
                r.ell(bl, bx + Math.cos(a) * 2.5, t - hh + Math.sin(a) * 2.5, 3, 3, 0.95);
            }
            r.ell(0xf2c230, bx, t - hh, 3, 3);
        }
        // trockene Büschel und kleine Steine auf der Oberfläche
        for (let i = 0; i < w / 120; i++) {
            const x = l + rnd.between(0, w);
            r.tri(0xa89a52, x - 6, t + 2, x + 6, t + 2, x, t - 12);
            r.tri(0x8a7c3a, x - 2, t + 2, x + 8, t + 2, x + 3, t - 9);
        }
        for (let i = 0; i < w / 200; i++) {
            const x = l + rnd.between(4, Math.max(5, w - 12)), s = rnd.between(6, 12);
            r.ell(0x77716a, x, t, s, s * 0.6);
            r.ell(0xb4afa2, x - s * 0.15, t - 2, s * 0.4, s * 0.25, 0.6);
        }
    } else {
        // Untergrund: Geröll auf dem Boden, Tropfsteine an Decken
        for (let i = 0; i < w / 25; i++) {
            const s = rnd.between(3, 8);
            r.ell(rnd.pick([0x7d776a, 0x66605a, 0x8c8474]), l + rnd.between(0, w), t - 1, s, s * 0.7);
        }
        if (istDecke) {
            for (let x = l + 6; x < l + w - 6; x += rnd.between(14, 30)) {
                const h = rnd.between(6, 22);
                r.tri(0x40372c, x - 5, t + tiefe - 1, x + 5, t + tiefe - 1, x, t + tiefe + h);
                r.tri(0x5a4e40, x - 2, t + tiefe - 1, x + 1, t + tiefe - 1, x - 1, t + tiefe + h * 0.7, 0.8);
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
