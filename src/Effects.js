import { MAX_BREITE } from './Anpassung.js';
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
    const B = MAX_BREITE, H = scene.scale.height;   // so breit wie das breiteste mögliche Fenster
    for (let i = 0; i < streifen; i++) {
        const c = Phaser.Display.Color.Interpolate.ColorWithColor(von, bis, streifen - 1, i);
        g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b));
        g.fillRect(0, (H / streifen) * i, B, H / streifen + 1);
    }
    // Große, blasse Sonne hinter dem Dunst
    scene.add.circle(934, H * 0.61, 100, 0xffb36b, 0.55).setScrollFactor(0.03).setDepth(-29);
    scene.add.circle(934, H * 0.61, 145, 0xff9a55, 0.18).setScrollFactor(0.03).setDepth(-29);
}

// Eine Schicht Stadtsilhouette. Je kleiner scrollFaktor, desto "weiter weg": Sie bewegt
// sich langsamer als die Kamera. Das ist der Parallax-Effekt, der Tiefe erzeugt.
export function buildSkyline(scene, worldWidth, boden, scrollFaktor, farbe, hoeheMin, hoeheMax, seed) {
    const rnd = new Phaser.Math.RandomDataGenerator([seed]);
    const g = scene.add.graphics().setScrollFactor(scrollFaktor).setDepth(-20 + scrollFaktor);
    // Auf dem Bildschirm soll der Fuß der Gebäude etwa auf Höhe der Oberfläche liegen,
    // wenn der Spieler dort steht. Die Kamera steht dann etwa (boden - 60 - Fensterhöhe/2) tief.
    const tief = boden - 60 - scene.scale.height / 2;
    const fuss = (boden - tief) + scrollFaktor * tief + 40;
    g.fillStyle(farbe);
    const reichweite = worldWidth * scrollFaktor + MAX_BREITE + 200;
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
export function mische(c1, c2, t) {
    const a = farbe.ValueToColor(c1), b = farbe.ValueToColor(c2);
    return farbe.GetColor(Math.round(a.r + (b.r - a.r) * t), Math.round(a.g + (b.g - a.g) * t), Math.round(a.b + (b.b - a.b) * t));
}
export function variiere(c, n) {
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
export function werkzeug(g, x0, y0) {
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

// Malt ein Stück Erde: l = linke Kante, t = Oberkante, w = Breite, tiefe = wie tief detailliert wird.
// Schneidet aus einem Malwerkzeug Rechtecke heraus (z. B. abgerundete Ecken): alles, was in "weg" liegt, wird nicht gemalt.
function mitAusschnitt(r, weg) {
    const rect = (c, x, y, w, h, a = 1) => {
        let teile = [[x, y, w, h]];
        for (const [wx, wy, ww, wh] of weg) {
            const neu = [];
            for (const [px, py, pw, ph] of teile) {
                if (px >= wx + ww || px + pw <= wx || py >= wy + wh || py + ph <= wy) { neu.push([px, py, pw, ph]); continue; }
                if (py < wy) neu.push([px, py, pw, wy - py]);                                     // darüber
                if (py + ph > wy + wh) neu.push([px, wy + wh, pw, py + ph - wy - wh]);            // darunter
                const y0 = Math.max(py, wy), y1 = Math.min(py + ph, wy + wh);
                if (px < wx) neu.push([px, y0, wx - px, y1 - y0]);                                // links
                if (px + pw > wx + ww) neu.push([wx + ww, y0, px + pw - wx - ww, y1 - y0]);       // rechts
            }
            teile = neu;
        }
        for (const [px, py, pw, ph] of teile) r.rect(c, px, py, pw, ph, a);
    };
    return { rect, tri: r.tri, ell: r.ell, line: r.line };
}

// Wo grenzt ein Block an freie Luft? frei = { oben(x), unten(x), links(y), rechts(y) } (je true = offen), plus echte Kanten dieses Bildstücks.
// Entlang jedes offenen Randes wird die Kante wie bei der Grasdecke ausgefranst: Die Kante springt in 4-Pixel-Schritten vor und zurück
// (0 bis 8 Pixel), und darunter liegt ein Saum aus dunklerer, bemooster Erde in unterschiedlicher Dicke (4 bis 12 Pixel).
const SAUM_ERDE = [0x4a3a28, 0x3e3022, 0x54402c, 0x463822], SAUM_FELS = [0x4f4b46, 0x5e5a55, 0x57534d, 0x6a665e];
const SAUM_MOOS = [0x2c5a24, 0x3b6a28, 0x34602a];
function zackenProfil(n, rn) {                       // zufälliger Weg: jeder Wert ist 0, 4 oder 8 und unterscheidet sich vom Nachbarn höchstens um 4
    const out = []; let d = rn.pick([0, 4]);
    for (let i = 0; i < n; i++) { d = Math.max(0, Math.min(8, d + rn.pick([-4, 0, 0, 4]))); out.push(d); }
    return out;
}
function randKerben(l, t, w, u, frei, kanten, oberflaeche, rn) {
    const weg = [], saum = [], offen = { oben: [], unten: [], links: [], rechts: [] };
    const sammle = (seite, a, b) => { for (let k = a; k < b; k += 8) if (frei[seite](k + 4)) offen[seite].push(k); };
    if (kanten.oben && !oberflaeche) sammle('oben', l, l + w);
    if (kanten.unten) sammle('unten', l, l + w);
    if (kanten.links) sammle('links', t, u);
    if (kanten.rechts) sammle('rechts', t, u);
    const d = {};
    for (const seite of ['oben', 'unten', 'links', 'rechts']) d[seite] = zackenProfil(offen[seite].length, rn);
    offen.oben.forEach((x, i) => { if (d.oben[i]) weg.push([x, t, 8, d.oben[i]]); saum.push([x, t + d.oben[i], 8, 4 * rn.between(1, 3)]); });
    offen.unten.forEach((x, i) => { const th = 4 * rn.between(1, 3); if (d.unten[i]) weg.push([x, u - d.unten[i], 8, d.unten[i]]); saum.push([x, u - d.unten[i] - th, 8, th]); });
    offen.links.forEach((y, i) => { if (d.links[i]) weg.push([l, y, d.links[i], 8]); saum.push([l + d.links[i], y, 4 * rn.between(1, 3), 8]); });
    offen.rechts.forEach((y, i) => { const th = 4 * rn.between(1, 3); if (d.rechts[i]) weg.push([l + w - d.rechts[i], y, d.rechts[i], 8]); saum.push([l + w - d.rechts[i] - th, y, th, 8]); });
    // abgerundete Außenecken in zwei Pixelstufen, wo beide anliegenden Seiten offen sind
    const istOffen = (liste, v) => liste.includes(v);
    const ecke = (ox, oy, sx, sy) => { for (let k = 1; k <= 2; k++) weg.push([sx > 0 ? ox : ox - 4 * (3 - k), sy > 0 ? oy + 4 * (k - 1) : oy - 4 * k, 4 * (3 - k), 4]); };
    if (istOffen(offen.oben, l) && istOffen(offen.links, t)) ecke(l, t, 1, 1);
    if (istOffen(offen.oben, l + w - 8) && istOffen(offen.rechts, t)) ecke(l + w, t, -1, 1);
    if (istOffen(offen.unten, l) && istOffen(offen.links, u - 8)) ecke(l, u, 1, -1);
    if (istOffen(offen.unten, l + w - 8) && istOffen(offen.rechts, u - 8)) ecke(l + w, u, -1, -1);
    return { weg, saum, offen };
}
// zeichneSaum: malt die Säume (Liste von Rechtecken) über die Erde, von außen nach innen heller werdend; ab und zu ein Moosfleck.
function zeichneSaum(r, saum, fels, rn) {
    for (const [x, y, w, h] of saum) {
        r.rect(rn.pick(fels ? SAUM_FELS : SAUM_ERDE), x, y, w, h);
        if (!fels && rn.frac() < 0.18) r.rect(rn.pick(SAUM_MOOS), x + rn.between(0, 2), y + rn.between(0, 2), Math.min(w, 4), Math.min(h, 4));
    }
}

function zeichneErde(r, rnd, l, t, w, tiefe, grund, oberflaeche, istDecke, frei = null, kanten = {}) {
    const u = t + tiefe;
    const rn = new Phaser.Math.RandomDataGenerator(['rand' + l + '_' + t]);
    let saum = null;
    if (frei) {
        const k = randKerben(l, t, w, u, frei, kanten, oberflaeche, rn);
        saum = k.saum;
        if (k.weg.length) r = mitAusschnitt(r, k.weg);
    }
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

    if (saum) zeichneSaum(r, saum, grund === 0x5e5a55, rn);

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
    }
}


// Pflanzenfarben für Moos, Efeu und Laub (von dunkel nach hell)
export const GRUEN = [0x1d5a24, 0x2c7a2e, 0x3e9a38, 0x5cb844, 0x8ad45a];   // satte Dschungelgrüns (von dunkel nach hell)

// Lässt eine Plattform zuwachsen: Moos oben, Ranken mit Blättern, die nach unten hängen.
// "ranken" = wie viele Ranken pro 100 Pixel Breite hängen. Alles in 2- bis 4-Pixel-Blöcken.
function bewuchs(g, rnd, l, t, w, h, ranken = 0.5, moos = true) {
    if (moos) {
        for (let x = l; x < l + w; x += rnd.between(22, 60)) {
            const bw = rnd.between(8, 22);
            g.fillStyle(rnd.pick(GRUEN.slice(0, 3))).fillRect(x, t - 2, Math.min(bw, l + w - x), 5);
            g.fillStyle(rnd.pick(GRUEN.slice(2, 5))).fillRect(x + 2, t - 4, Math.min(bw - 4, l + w - x - 2), 3);
        }
    }
    for (let i = 0; i < w / 100 * ranken; i++) {
        const x = l + rnd.between(2, Math.max(3, w - 4)), laenge = rnd.between(10, 56);
        g.fillStyle(GRUEN[0]).fillRect(x, t + h, 3, laenge);
        for (let y = 6; y < laenge; y += rnd.between(7, 11)) {                    // Blätter links und rechts
            g.fillStyle(rnd.pick(GRUEN.slice(1, 5))).fillRect(x + (y % 2 ? 3 : -4), t + h + y, 5, 4);
        }
    }
}


// Zerstörbare Erdblöcke: Sie sehen aus wie die normale Erde ringsum (gleiche 8-Pixel-Kacheln und Farbverlauf).
// Nur ein paar feine Unterschiede verraten, dass man sie zerschießen kann: ein, zwei dünne Haarrisse und ein
// kaum sichtbarer, etwas hellerer Ton. Die Kacheln richten sich nach der Weltposition (nicht nach dem Block),
// damit aneinandergrenzende Blöcke ohne Naht ineinander übergehen. Das Bild gehört zum Block und wird mit ihm entfernt.
function kachelZufall(x, y, k = 0) {            // wiederholbarer Zufallswert zwischen 0 und 1 für eine Weltposition
    const v = Math.sin(x * 12.9898 + y * 78.233 + k * 37.719) * 43758.5453;
    return v - Math.floor(v);
}

// Zerstörbare Bauteile außer Erde: Holz (Böden und Stützen), Sandsäcke, Beton und Holzkisten.
function zeichneBauteil(g, art, l, t, w, h, p) {
    const rnd = new Phaser.Math.RandomDataGenerator(['bau' + art + p.x + '_' + p.y]);
    if (art === 'holz') {
        const waagerecht = w >= h;                                                  // Boden/Steg oder Pfosten
        g.fillStyle(0x7a5a2e).fillRect(l, t, w, h);
        if (waagerecht) {
            for (let x = 0; x < w; x += 26 + rnd.between(0, 10)) g.fillStyle(0x4a331d).fillRect(l + x, t, 2, h);          // Fugen der Bohlen
            g.fillStyle(0x9a7a44).fillRect(l, t, w, 3);                                                                  // Lichtkante oben
            g.fillStyle(0x3a2814).fillRect(l, t + h - 4, w, 4);                                                          // Schatten unten
            for (let x = 8; x < w - 4; x += 40) g.fillStyle(0x2a1d10).fillRect(l + x, t + 6, 3, 3);                       // Nägel
        } else {
            for (let y = 0; y < h; y += 30 + rnd.between(0, 10)) g.fillStyle(0x4a331d).fillRect(l, t + y, w, 2);
            g.fillStyle(0x9a7a44).fillRect(l, t, 3, h);
            g.fillStyle(0x3a2814).fillRect(l + w - 3, t, 3, h);
            for (let y = 10; y < h - 6; y += 36) g.fillStyle(0x2a1d10).fillRect(l + w / 2, t + y, 3, 3);
        }
        for (let i = 0; i < 3; i++) g.fillStyle(variiere(0x7a5a2e, rnd.between(-18, 18)), 0.6).fillRect(l + rnd.between(0, Math.max(0, w - 10)), t + rnd.between(2, Math.max(3, h - 4)), rnd.between(6, 14), 2);   // Maserung
    } else if (art === 'sand') {
        const reihe = 14;
        for (let y = 0, r = 0; y < h; y += reihe, r++) {
            for (let x = (r % 2) * -11; x < w; x += 24) {
                const bx = Math.max(0, x), bw = Math.min(24, w - bx, x + 24 - bx);
                if (bw <= 4) continue;
                const farbe = variiere(0xb59f6a, rnd.between(-12, 12));
                g.fillStyle(0x6e5e3a).fillRect(l + bx, t + y, bw, Math.min(reihe, h - y));
                g.fillStyle(farbe).fillRect(l + bx + 1, t + y + 1, bw - 2, Math.min(reihe, h - y) - 3);
                g.fillStyle(0xd0bb86, 0.7).fillRect(l + bx + 2, t + y + 2, bw - 5, 2);
                g.fillStyle(0x7e6c42, 0.7).fillRect(l + bx + 3, t + y + Math.min(reihe, h - y) - 5, bw - 6, 2);
            }
        }
    } else if (art === 'beton') {
        g.fillStyle(0x7d8185).fillRect(l, t, w, h);
        for (let y = 0; y < h; y += 32) g.fillStyle(0x5a5e62).fillRect(l, t + y, w, 2);
        g.fillStyle(0x9aa0a4).fillRect(l, t, w, 3);
        g.fillStyle(0x4c5054).fillRect(l, t + h - 3, w, 3);
        for (let i = 0; i < Math.max(2, w * h / 1800); i++) g.fillStyle(0x666a6e, 0.8).fillRect(l + rnd.between(2, Math.max(3, w - 10)), t + rnd.between(2, Math.max(3, h - 8)), rnd.between(4, 10), rnd.between(3, 6));   // Abplatzungen
        for (let k = 0; k < 2; k++) {                                                                                  // Risse
            let cx = l + rnd.between(4, Math.max(5, w - 6)), cy = t + rnd.between(0, 6);
            for (let j = 0; j < 4 && cy < t + h - 3; j++) { g.fillStyle(0x2f3236, 0.7).fillRect(cx, cy, 2, 6); cx += rnd.pick([-2, 2]); cy += 6; }
        }
        g.fillStyle(0x8c5a2a).fillRect(l + 3, t + 4, 3, 3).fillRect(l + w - 6, t + 4, 3, 3);                         // rostige Bolzen
    } else if (art === 'kiste') {
        g.fillStyle(0x7a6540).fillRect(l, t, w, h);
        for (let x = 16; x < w; x += 16) g.fillStyle(0x4a3d26).fillRect(l + x, t, 2, h);
        g.fillStyle(0x4a3d26).fillRect(l, t, w, 4).fillRect(l, t + h - 4, w, 4).fillRect(l, t, 4, h).fillRect(l + w - 4, t, 4, h);
        const n = Math.ceil(Math.hypot(w, h) / 4);
        for (let i = 0; i <= n; i++) { const u = i / n; g.fillStyle(0x5a4a2e).fillRect(Math.round(l + u * w) - 2, Math.round(t + u * h) - 2, 4, 4); }
        g.fillStyle(0x9a8660).fillRect(l, t, w, 2);
    }
}

function zeichneBroeckelig(scene, p) {
    const g = scene.add.graphics().setDepth(1.2);
    const l = p.x - p.width / 2, t = p.y - p.height / 2, w = p.width, h = p.height;
    if (p.art === 'turm') return g;                                    // Türme malt die Szene als Ganzes (siehe baueTuerme)
    if (p.art) { zeichneBauteil(g, p.art, l, t, w, h, p); return g; }
    // Der Rand wird ausgefranst wie bei der Grasdecke: Randkacheln sind 0 oder 4 Pixel kürzer, und innen liegt ein dunkler, bemooster Saum.
    const rn = new Phaser.Math.RandomDataGenerator(['bk' + p.x + '_' + p.y]);
    const nx = Math.ceil(w / 8), ny = Math.ceil(h / 8);
    const pT = zackenProfil(nx, rn).map(v => Math.min(4, v)), pB = zackenProfil(nx, rn).map(v => Math.min(4, v));
    const pL = zackenProfil(ny, rn).map(v => Math.min(4, v)), pR = zackenProfil(ny, rn).map(v => Math.min(4, v));
    for (let y = 0; y < h; y += 8) {
        for (let x = 0; x < w; x += 8) {
            const wx = l + x, wy = t + y;
            let c = mische(0x7a5a3c, 0x4b3b2a, Math.max(0, Math.min(1, (wy - 900) / 260)));    // wie der Hang daneben
            c = variiere(c, Math.round((kachelZufall(wx, wy) - 0.5) * 16) + 5);                // +5: ein ganz kleines bisschen heller
            const sx = x / 8, sy = y / 8, rx = nx - 1 - sx, ry = ny - 1 - sy;
            if (Math.min(sx, rx) === 0 && Math.min(sy, ry) === 0) continue;                    // ganz in der Ecke: weg
            let x0 = wx, y0 = wy, x1 = wx + 8, y1 = wy + 8;
            if (sy === 0) y0 += pT[sx]; if (ry === 0) y1 -= pB[sx];
            if (sx === 0) x0 += pL[sy]; if (rx === 0) x1 -= pR[sy];
            g.fillStyle(c).fillRect(x0, y0, x1 - x0, y1 - y0);
            // Saum: die äußerste Kachel bekommt eine dunklere, ab und zu bemooste Kante
            const rand = [sy === 0 && [x0, y0, 8, 4], ry === 0 && [x0, y1 - 4, 8, 4], sx === 0 && [x0, y0, 4, 8], rx === 0 && [x1 - 4, y0, 4, 8]].filter(Boolean);
            for (const [qx, qy, qw, qh] of rand) {
                g.fillStyle(rn.pick(SAUM_ERDE)).fillRect(qx, qy, qw, qh);
                if (rn.frac() < 0.15) g.fillStyle(rn.pick(SAUM_MOOS)).fillRect(qx, qy, Math.min(qw, 4), Math.min(qh, 4));
            }
            if (kachelZufall(wx, wy, 1) < 0.5) {                                                // feine Körnung wie in der normalen Erde
                g.fillStyle(variiere(c, kachelZufall(wx, wy, 2) < 0.5 ? -16 : 14)).fillRect(wx + Math.floor(kachelZufall(wx, wy, 3) * 5), wy + Math.floor(kachelZufall(wx, wy, 4) * 5), 2, 2);
            }
        }
    }
    // Haarrisse: ein bis zwei dünne, dunkle Linien (2 Pixel breit), sonst nichts
    const rnd = new Phaser.Math.RandomDataGenerator(['riss' + p.x + '_' + p.y]);
    for (let i = 0; i < rnd.between(1, 2); i++) {
        let cx = l + rnd.between(4, w - 8), cy = t + rnd.between(0, 6);
        for (let k = 0; k < 5 && cy < t + h - 2; k++) {
            g.fillStyle(0x2a1d12, 0.55).fillRect(cx, cy, 2, 5);
            cx += rnd.pick([-2, 2]); cy += 5;
        }
    }
    return g;
}

// Gibt allen Plattformen ihr Aussehen. Es gibt drei Arten:
//  1. Erde (Oberfläche und Untergrund): feine 8-Pixel-Kacheln, oben mit Grasschicht.
//  2. Dünne Platten (Beton, Stahl): Kanten, Nieten, Risse, Rostspuren.
//  3. Dicke Blöcke (Beton, Kisten): Ziegelmuster mit Fugen.
// Die Erde wird einmal in Bilder gebacken (siehe backe), der Rest einmal gemalt.
export function decoratePlatforms(scene, platforms, boden) {
    const g = scene.add.graphics().setDepth(1);
    const rnd = new Phaser.Math.RandomDataGenerator(['boden']);
    const TIEFE = 760;     // so tief wird die Erde detailliert gemalt: bis ganz nach unten (Erdblöcke sind höchstens 740 hoch)
    const FELS = 0x5e5a55;                    // grauer Fels (Felsstufen am Höhleneingang)
    const ERDFARBEN = [0x5b4a35, 0x4b3b2a, FELS];
    let nr = 0;
    const feste = platforms.filter(q => !q.brechbar && q.height >= 30);     // alles, was Erde verdeckt (auch die unsichtbaren Hügelblöcke)

    for (const p of platforms) {
        if (p.kollisionNur) continue;      // Hügel-Stufenblöcke sind unsichtbar: ihre Optik malt buildHuegel
        if (p.brechbar) { p.deko = zeichneBroeckelig(scene, p); continue; }   // brüchige Wand: eigenes, entfernbares Bild
        const l = p.x - p.width / 2, t = p.y - p.height / 2, b = t + p.height;
        const grundfarbe = p.fillColor;
        const istErde = ERDFARBEN.includes(grundfarbe) && p.height >= 40;

        if (istErde) {
            const anOberflaeche = t <= boden + 1 && grundfarbe !== FELS;   // Fels trägt kein Gras
            const istDecke = !anOberflaeche && p.height <= 180;
            const tiefe = Math.min(p.height, TIEFE);
            nr += 1;
            // Welche Ränder des Blocks grenzen an freie Luft? (Nachbarblöcke verdecken sie.)
            const nahe = feste.filter(q => q !== p && Math.abs(q.x - p.x) <= (q.width + p.width) / 2 + 4 && Math.abs(q.y - p.y) <= (q.height + p.height) / 2 + 4);
            const bedeckt = (x, y) => nahe.some(q => Math.abs(x - q.x) <= q.width / 2 && Math.abs(y - q.y) <= q.height / 2);
            const frei = {
                oben: (x) => !bedeckt(x, t - 3), unten: (x) => !bedeckt(x, b + 3),
                links: (y) => !bedeckt(l - 3, y), rechts: (y) => !bedeckt(l + p.width + 3, y),
            };
            // Große Plattformen in Stücke von höchstens 2048 Pixeln Breite teilen (Grenze für Bilder).
            for (let cx = l, i = 0; cx < l + p.width; cx += 2048, i++) {
                const cw = Math.min(2048, l + p.width - cx);
                const oben = 16, unten = 24;                     // Platz für Halme oben und hängende Wurzeln unten
                const kanten = { oben: true, unten: tiefe === p.height, links: cx === l, rechts: cx + cw === l + p.width };
                const key = `erde_${nr}_${i}`;
                backe(scene, key, cx, t - oben, cw, tiefe + oben + unten, (r) => {
                    const lokal = new Phaser.Math.RandomDataGenerator([key]);   // pro Stück ein fester Zufall
                    zeichneErde(r, lokal, cx, t, cw, tiefe, grundfarbe, anOberflaeche, istDecke, frei, kanten);
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
            bewuchs(g, rnd, l, t, p.width, p.height, 0.4);                        // etwas Moos und Ranken
            if (grundfarbe !== 0x6b4a2a) bruchkante(g, rnd, l, t, p.width, p.height, grundfarbe);   // abgebrochene Betonkanten
        } else if (grundfarbe === 0x6b5b3a) {
            // --- Holzkiste: senkrechte Bretter, Rahmen, Kreuzstreben und Metallecken ---
            g.fillStyle(0x7a6540).fillRect(l, t, p.width, p.height);
            for (let x = l + 16; x < l + p.width; x += 16) g.fillStyle(0x4a3d26).fillRect(x, t, 2, p.height);     // Brettfugen
            g.fillStyle(0x4a3d26).fillRect(l, t, p.width, 4).fillRect(l, t + p.height - 4, p.width, 4);          // Rahmen oben/unten
            g.fillStyle(0x4a3d26).fillRect(l, t, 4, p.height).fillRect(l + p.width - 4, t, 4, p.height);
            const n = Math.ceil(Math.hypot(p.width, p.height) / 4);
            for (let i = 0; i <= n; i++) {                                                                       // Kreuzstreben
                const u = i / n;
                g.fillStyle(0x5a4a2e).fillRect(Math.round(l + u * p.width) - 2, Math.round(t + u * p.height) - 2, 4, 4);
                g.fillStyle(0x5a4a2e).fillRect(Math.round(l + (1 - u) * p.width) - 2, Math.round(t + u * p.height) - 2, 4, 4);
            }
            for (const [cx, cy] of [[l, t], [l + p.width - 6, t], [l, t + p.height - 6], [l + p.width - 6, t + p.height - 6]]) g.fillStyle(0x3a3a3a).fillRect(cx, cy, 6, 6);
            g.fillStyle(0x9a8660).fillRect(l, t, p.width, 2);                                                    // Lichtkante
        } else if (grundfarbe === 0x8a7a55) {
            // --- Sandsäcke: gestapelte Säcke, jede zweite Reihe versetzt, mit Nähten und Schatten ---
            g.fillStyle(0x6a5c3e).fillRect(l, t, p.width, p.height);
            for (let ry = 0; ry < p.height; ry += 16) {
                const versatz = (ry / 16) % 2 === 0 ? 0 : 16;
                for (let x = l - versatz; x < l + p.width; x += 32) {
                    const x0 = Math.max(l, x), x1 = Math.min(l + p.width, x + 31), hh = Math.min(15, p.height - ry);
                    if (x1 <= x0) continue;
                    g.fillStyle(variiere(0x9a8a62, rnd.between(-10, 8))).fillRect(x0, t + ry, x1 - x0, hh);
                    g.fillStyle(0xb5a47a).fillRect(x0, t + ry, x1 - x0, 2);                                       // Licht oben
                    g.fillStyle(0x6a5c3e).fillRect(x0, t + ry + hh - 2, x1 - x0, 2);                              // Schatten unten
                    g.fillStyle(0x7a6c48).fillRect(x + 14, t + ry + 4, 3, 6);                                      // Naht
                }
            }
        } else {
            // --- Dicke Blöcke (Beton, Kisten): Ziegelmuster mit Fugen ---
            const fuge = variiere(grundfarbe, -45);
            // Raster = die Blockgröße des Spiels (32): Steine sind 64 breit und 32 hoch, jede zweite Reihe versetzt
            for (let ry = 0; ry < p.height; ry += 32) {
                g.fillStyle(fuge).fillRect(l, t + ry, p.width, 3);
                const versatz = (ry / 32) % 2 === 0 ? 0 : 32;
                for (let x = l + versatz; x < l + p.width; x += 64) {
                    if (x > l) g.fillStyle(fuge).fillRect(x, t + ry, 3, 32);
                    if (rnd.frac() < 0.12) g.fillStyle(variiere(grundfarbe, rnd.between(-14, 14))).fillRect(x + 4, t + ry + 4, 56, 24);
                }
            }
            g.fillStyle(variiere(grundfarbe, 25)).fillRect(l, t, p.width, 3);
            bewuchs(g, rnd, l, t, p.width, 0, 0.3);                               // Moos oben, wenige Ranken
            // Efeu wächst an einer Seite die Wand hoch
            const seite = rnd.frac() < 0.5 ? l : l + p.width - 6;
            for (let y = p.height; y > Math.max(8, p.height - rnd.between(30, 120)); y -= 6) {
                g.fillStyle(rnd.pick(GRUEN.slice(1, 5))).fillRect(seite + rnd.between(0, 3), t + y - 6, rnd.between(4, 9), 6);
            }
        }
    }
}


// Eine Pixellinie (aus Quadraten) für Streben und Eisen.
function pl(r, c, x1, y1, x2, y2, p = 2, a = 1) {
    const n = Math.max(1, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / p));
    for (let i = 0; i <= n; i++) {
        r.rect(c, Math.round((x1 + (x2 - x1) * i / n) / p) * p, Math.round((y1 + (y2 - y1) * i / n) / p) * p, p, p, a);
    }
}

// Die Rückwand eines verfallenen Gebäudes (Hintergrund hinter Plattformen, die Etagen sind).
// h.etagen = Höhen der Geschossdecken über dem Boden (nach oben). Oben ist die Kante ausgefranst,
// in der Wand sind Fensteröffnungen, Risse, Armierungseisen und eingeschlagene Stellen.
function zeichneGebaeude(r, rnd, h) {
    const l = h.links, t = h.oben, w = h.rechts - h.links, hh = h.unten - h.oben;
    const basis = rnd.pick([0x3a3f43, 0x403c38, 0x363b38]), S = 8;
    // Ausgefranste Oberkante
    const tops = [];
    let top = rnd.between(0, Math.floor(hh * 0.12));
    for (let x = 0; x < w; x += S) {
        top = Math.max(0, Math.min(Math.floor(hh * 0.3), top + rnd.pick([-24, -16, -8, 0, 0, 8, 16, 24])));
        tops.push(top);
        r.rect(variiere(basis, rnd.between(-5, 5)), l + x, t + top, Math.min(S, w - x), hh - top);
    }
    const hoeheAn = (x) => tops[Math.max(0, Math.min(tops.length - 1, Math.floor((x - l) / S)))];
    // Geschossdecken als dunkle Bänder und Fensteröffnungen in jeder Etage
    const decken = (h.etagen ?? [Math.round(hh * 0.45)]).map(e => h.unten - e);
    const unterkanten = [h.unten, ...decken];
    decken.forEach(y => r.rect(variiere(basis, -22), l, y, w, 8));
    for (let k = 0; k < unterkanten.length; k++) {
        const boden = unterkanten[k] - 8, decke = (decken[k] ?? t) + 8;
        if (boden - decke < 40) continue;
        for (let x = l + 22; x < l + w - 40; x += rnd.between(54, 70)) {
            if (decke + 12 < t + hoeheAn(x) || rnd.frac() < 0.12) continue;
            const ow = rnd.between(34, 48), oh = Math.min(boden - decke - 26, rnd.between(40, 62));
            const oy = boden - oh - 6;
            r.rect(0x14181b, x, oy, ow, oh);
            r.rect(variiere(basis, 16), x - 2, oy - 3, ow + 4, 4);                          // Sturz
            r.rect(variiere(basis, 10), x - 2, oy + oh, ow + 4, 3);                         // Brüstung
            if (rnd.frac() < 0.4) r.rect(0x1c2226, x + 6, oy + oh - 14, rnd.between(12, 20), 14);   // Möbel/Schutt im Raum
            if (rnd.frac() < 0.3) { r.rect(0x20262a, x + 4, oy, 4, oh); r.rect(0x20262a, x + ow - 12, oy + 8, 4, oh - 8); }   // Glasreste
            if (rnd.frac() < 0.18) {                                                           // ausgebrochene Wand: Schutt davor
                r.rect(variiere(basis, -10), x + ow, oy + oh - 8, 14, 8); r.rect(variiere(basis, -4), x + ow + 6, oy + oh - 14, 8, 6);
            }
        }
    }
    // Eckpfeiler (heller) und Risse
    for (const px of [l, l + w - 16]) r.rect(variiere(basis, 12), px, t + hoeheAn(px + 8), 16, hh - hoeheAn(px + 8));
    for (let i = 0; i < w / 50; i++) {
        let cx = l + rnd.between(6, w - 6), cy = t + hoeheAn(cx) + rnd.between(10, Math.max(11, hh / 2));
        for (let k = 0; k < rnd.between(3, 7); k++) { r.rect(0x0c0e10, cx, cy, 2, 6, 0.8); cx += rnd.pick([-3, 3]); cy += 5; }
    }
    // Armierungseisen an der Bruchkante
    for (let i = 0; i < 6; i++) {
        const cx = l + rnd.between(4, w - 6);
        pl(r, 0x2a2420, cx, t + hoeheAn(cx), cx + rnd.between(-6, 6), t + hoeheAn(cx) - rnd.between(10, 26), 2);
    }
    // Bewuchs: wenige Ranken, Moos auf den Geschossdecken, ein Baum aus dem Dach
    for (let i = 0; i < w / 60; i++) {
        const x = l + rnd.between(2, w - 6), len = rnd.between(30, Math.floor(hh * 0.45));
        r.rect(0x2a4018, x, t + hoeheAn(x), 3, len);
        for (let k = 6; k < len; k += rnd.between(8, 12)) r.rect(rnd.pick(GRUEN.slice(0, 4)), x + (k % 2 ? 3 : -4), t + hoeheAn(x) + k, 5, 4);
    }
    for (const y of decken) {
        for (let x = l; x < l + w; x += rnd.between(30, 70)) r.rect(rnd.pick(GRUEN.slice(0, 3)), x, y - 3, rnd.between(8, 20), 4);
    }
    if (rnd.frac() < 0.7) {
        const cx = l + rnd.between(30, w - 30), tp = t + hoeheAn(cx);
        r.rect(0x3a2a1c, cx - 3, tp - 30, 7, 32);
        for (const [dx, dy, rx, ry] of [[0, -42, 20, 14], [-14, -32, 11, 8], [14, -34, 12, 8]]) {
            for (let yy = -ry; yy <= ry; yy += 4) for (let xx = -rx; xx <= rx; xx += 4) {
                if ((xx / rx) ** 2 + (yy / ry) ** 2 <= 1 && rnd.frac() > 0.2) r.rect(GRUEN[rnd.between(0, 3)], cx + dx + xx, tp + dy + yy, 4, 4);
            }
        }
    }
    // dunkle Kante unten
    r.rect(0x000000, l, h.unten - 10, w, 10, 0.18);
}

// Ein rostiger Gitterturm (Funkturm): zwei Beine, waagerechte Ringe, Kreuzstreben, Rost und Ranken.
function zeichneTurm(r, rnd, h) {
    const l = h.links, t = h.oben, w = h.rechts - h.links, hh = h.unten - h.oben;
    const eisen = 0x4a4036, hell = 0x62564a, dunkel = 0x2c2620;
    const beinL = l + 14, beinR = l + w - 22;
    const ringe = (h.etagen ?? [Math.round(hh / 2)]).map(e => h.unten - e);
    const alle = [h.unten, ...ringe];
    for (const bx of [beinL, beinR]) {                              // zwei senkrechte Beine
        r.rect(eisen, bx, t, 8, hh); r.rect(hell, bx, t, 2, hh); r.rect(dunkel, bx + 6, t, 2, hh);
    }
    ringe.forEach(y => { r.rect(eisen, beinL, y, beinR - beinL + 8, 6); r.rect(hell, beinL, y, beinR - beinL + 8, 2); });
    for (let k = 0; k < alle.length - 1; k++) {                     // Kreuzstreben zwischen den Ringen
        const unten = alle[k], oben = alle[k + 1];
        if (oben < t) continue;
        pl(r, eisen, beinL + 8, unten, beinR, oben + 6, 3);
        if (rnd.frac() < 0.75) pl(r, eisen, beinR, unten, beinL + 8, oben + 6, 3);        // manche Streben sind abgebrochen
    }
    for (let i = 0; i < 30; i++) r.rect(rnd.pick(ROST_FARBEN), l + rnd.between(10, w - 10), t + rnd.between(0, hh - 10), 2, rnd.between(6, 16), 0.6);   // Rostspuren
    for (const bx of [beinL + 4, beinR + 4]) {                      // Ranken ranken sich die Beine hoch
        for (let y = h.unten; y > h.unten - rnd.between(hh * 0.3, hh * 0.7); y -= 6) {
            r.rect(rnd.pick(GRUEN.slice(1, 5)), bx + rnd.between(-6, 2), y - 6, rnd.between(4, 10), 6);
        }
    }
    r.rect(dunkel, beinL - 6, h.unten - 10, 20, 10); r.rect(dunkel, beinR - 4, h.unten - 10, 20, 10);   // Fundamente
}

const ROST_FARBEN = [0x8a4a22, 0x6b3a22, 0x5a2e1a];

// Bruchkanten unter einer Betonplatte: abgebrochene Stücke hängen herab, Eisen ragen an den Enden heraus.
function bruchkante(g, rnd, l, t, w, h, farbe) {
    const b = t + h;
    for (let x = l; x < l + w; x += rnd.between(10, 26)) {
        g.fillStyle(variiere(farbe, rnd.between(-45, -25))).fillRect(x, b, Math.min(rnd.between(6, 14), l + w - x), rnd.between(3, 9));
    }
    for (const [x0, richtung] of [[l, -1], [l + w, 1]]) {
        if (rnd.frac() < 0.3) continue;
        for (let k = 0; k < rnd.between(1, 3); k++) {
            const len = rnd.between(8, 18), y = t + rnd.between(4, Math.max(5, h - 4));
            g.fillStyle(0x2a2420).fillRect(richtung > 0 ? x0 : x0 - len, y, len, 2);
        }
    }
}

// ---- Hintergrund der Höhlen: Die Wand hinter dem Spieler, statt einer schwarzen Fläche ----

// Malt eine Höhlenwand. h = { links, rechts, oben, unten, art, licht } ; lampen = x-Positionen der Deckenlampen.
// art 'tunnel' = dunkler Fels, 'offen' = Graben/Schacht mit Erdwand und Himmelslicht, 'lager' = Betonraum.
function zeichneHoehle(r, rnd, h, lampen) {
    if (h.art === 'gebaeude') return zeichneGebaeude(r, rnd, h);   // eigene Zeichnung für Gebäuderückwände
    if (h.art === 'turm') return zeichneTurm(r, rnd, h);
    const l = h.links, t = h.oben, w = h.rechts - h.links, hh = h.unten - h.oben;
    const farben = {
        tunnel: { basis: 0x251f1a, hell: 0x332b24, dunkel: 0x15110e },
        offen:  { basis: 0x3d3024, hell: 0x4d3d2d, dunkel: 0x2a2018 },
        schacht:{ basis: 0x33281e, hell: 0x41342a, dunkel: 0x1f1812 },
        lager:  { basis: 0x2b3034, hell: 0x383e43, dunkel: 0x1b1f22 },
    }[h.art];
    const S = 8;

    // --- 1. Wand aus 8-Pixel-Kacheln, oben dunkler, unten etwas heller ---
    for (let y = 0; y < hh; y += S) {
        for (let x = 0; x < w; x += S) {
            const c = variiere(mische(farben.dunkel, farben.basis, Math.min(1, 0.5 + y / hh * 0.6)), rnd.between(-5, 5));
            r.rect(c, l + x, t + y, Math.min(S, w - x), Math.min(S, hh - y));
        }
    }
    // --- 2. Gesteinsschichten: waagerechte helle/dunkle Streifen mit Unterbrechungen ---
    for (let y = 16; y < hh - 8; y += rnd.between(20, 34)) {
        for (let x = 0; x < w; x += rnd.between(30, 90)) {
            const len = rnd.between(24, 80);
            r.rect(rnd.frac() < 0.5 ? farben.hell : farben.dunkel, l + x, t + y, Math.min(len, w - x), rnd.pick([2, 4]), 0.7);
        }
    }
    // --- 3. Risse (Pixelstufen) und einzelne helle Steine in der Wand ---
    for (let i = 0; i < w / 90; i++) {
        let cx = l + rnd.between(4, Math.max(5, w - 4)), cy = t + rnd.between(10, Math.max(11, hh - 60));
        for (let k = 0; k < rnd.between(3, 6); k++) {
            r.rect(0x0c0907, cx, cy, 2, 6, 0.8);
            cx += rnd.pick([-3, 3]); cy += 5;
        }
    }
    for (let i = 0; i < w / 40; i++) {
        const bw = rnd.pick([8, 12, 16]);
        r.rect(farben.hell, l + rnd.between(0, Math.max(0, w - bw)), t + rnd.between(8, Math.max(9, hh - 20)), bw, 8, 0.6);
    }

    if (h.art === 'tunnel') {
        // --- 4. Felszähne an der Decke und Felsspitzen am Boden (Silhouetten im Hintergrund) ---
        for (let x = 0; x < w; x += rnd.between(30, 70)) {
            const sp = rnd.between(2, 5) * 4;
            for (let k = 0; k < sp; k += 4) r.rect(0x1c1713, l + x - (10 - k / 2) / 2, t + k, 10 - k / 2, 4);
        }
        for (let x = 20; x < w; x += rnd.between(80, 170)) {
            const sp = rnd.between(2, 4) * 4;
            for (let k = 0; k < sp; k += 4) r.rect(0x1c1713, l + x - (12 - k * 1.5) / 2, t + hh - k - 4, 12 - k * 1.5, 4);
        }
        // --- 5. Feuchtes Moos (grünliche Flecken unten) ---
        for (let i = 0; i < w / 60; i++) {
            const mx = l + rnd.between(0, w - 16), my = t + hh - rnd.between(10, 40);
            for (let k = 0; k < rnd.between(2, 5); k++) r.rect(0x2d4026, mx + k * 8, my + (k % 2) * 8, 8, 8, 0.6);
        }
        // --- 6. Leuchtende Kristalle ---
        for (let i = 0; i < w / 260; i++) {
            const kx = l + rnd.between(20, Math.max(21, w - 20)), ky = t + rnd.between(30, hh - 20);
            const kc = rnd.pick([0x6fd3ff, 0xb48cff]);
            r.rect(kc, kx - 10, ky - 10, 22, 26, 0.10);              // Schein
            r.rect(kc, kx, ky, 4, 10); r.rect(kc, kx + 4, ky + 4, 4, 6); r.rect(0xffffff, kx, ky, 2, 4, 0.8);
        }
    }
    if (h.art === 'tunnel' || h.art === 'lager') {
        // --- 7. Rohre an der Decke, mit Gelenken, Rost und Verschraubung ---
        r.rect(0x4a3b30, l, t + 12, w, 8); r.rect(0x6b5646, l, t + 12, w, 2); r.rect(0x2c2119, l, t + 18, w, 2);
        for (let x = rnd.between(40, 100); x < w; x += rnd.between(110, 170)) {
            r.rect(0x33271e, l + x, t + 9, 8, 14); r.rect(0x8a6a4a, l + x + 2, t + 11, 2, 2);
            r.rect(0x6b3a22, l + x + 3, t + 22, 2, rnd.between(4, 12), 0.8);   // Rostspur / Tropfen
        }
        // Kabel: hängen in Stufen durch
        for (let x = 0; x < w - 160; x += 160) {
            for (let k = 0; k <= 160; k += 8) {
                const sag = Math.round(Math.sin(k / 160 * Math.PI) * 3) * 4;
                r.rect(0x0e0e0e, l + x + k, t + 26 + sag, 8, 3, 0.9);
            }
        }
    }
    if (h.art === 'lager') {
        // Regale an der Wand (nicht im Treppenhaus) und Warnstreifen am Boden
        for (let x = 30; h.regale !== false && x < w - 60; x += rnd.between(110, 170)) {
            r.rect(0x1b1f22, l + x, t + 40, 64, 6);
            r.rect(0x1b1f22, l + x, t + 82, 64, 6);
            r.rect(0x1b1f22, l + x, t + 40, 4, 100); r.rect(0x1b1f22, l + x + 60, t + 40, 4, 100);
            r.rect(rnd.pick([0x4a4130, 0x3a4a3a]), l + x + 8, t + 26, 20, 14); r.rect(rnd.pick([0x4a4130, 0x3a4a3a]), l + x + 34, t + 68, 22, 14);
        }
        for (let x = 0; x < w; x += 24) {
            r.rect(0xc9a227, l + x, t + hh - 10, 12, 6, 0.8); r.rect(0x1a1a1a, l + x + 12, t + hh - 10, 12, 6, 0.8);
        }
    }
    if (h.art === 'offen' || h.art === 'schacht') {
        // Himmelslicht fällt in senkrechten Streifen in den Graben
        for (let x = 0; x < w; x += 32) {
            r.rect(0xffe9b0, l + x + rnd.between(0, 10), t, rnd.pick([16, 24]), hh, 0.06);
        }
        // Wurzeln hängen von oben herab
        for (let i = 0; i < w / 40; i++) {
            const rx = l + rnd.between(2, Math.max(3, w - 4));
            for (let k = 0; k < rnd.between(4, 12); k++) r.rect(0x241a11, rx + (k % 3 === 0 ? 2 : 0), t + k * 4, 2, 4);
        }
    }

    // --- 8. Lichtkegel unter den Lampen (abgestuft, sehr durchsichtig) und Lichtfleck am Boden ---
    for (const lamp of lampen) {
        // Zahl = Lampe im Tunnel/Mine (gilt für alle Höhlen ohne "eigeneLampen"); Objekt {x, y} = Lampe in genau einer Höhle (nach Höhe)
        const eigene = typeof lamp === 'object';
        if (eigene ? (lamp.y < h.oben || lamp.y > h.unten) : h.eigeneLampen) continue;
        const lx = eigene ? lamp.x : lamp;
        if (lx < h.links + 10 || lx > h.rechts - 10) continue;
        const cx = lx;
        for (let k = 0, y = 20; y < hh - 4; k++, y += 8) {
            r.rect(0xffd866, cx - (12 + k * 5), t + y, 24 + k * 10, 8, 0.045);
        }
        r.rect(0xffd866, cx - 70, t + hh - 6, 140, 6, 0.10);
        r.rect(0xffd866, cx - 36, t + hh - 6, 72, 6, 0.12);
    }
    // --- 9. Pfützen auf dem Boden ---
    for (let i = 0; i < w / 150; i++) {
        const px = l + rnd.between(0, Math.max(0, w - 60)), len = rnd.between(30, 64);
        r.rect(0x5f7f90, px, t + hh - 5, len, 5, 0.45); r.rect(0x9fc6d6, px + 4, t + hh - 5, len / 2, 2, 0.5);
    }
    // Tiefe: im Schacht wird es nach unten immer dunkler
    if (h.art === 'schacht') {
        for (let y = 0; y < hh; y += 8) r.rect(0x000000, l, t + y, w, 8, 0.7 * y / hh);
    }
    // Wasser am Grund von Schluchten: dunkles Blau, helle Wellenkämme, Schilf
    if (h.wasser) {
        r.rect(0x24475a, l, t + hh - 22, w, 22, 0.92);
        for (let x = 0; x < w; x += rnd.between(10, 24)) r.rect(0x7fb6c8, l + x, t + hh - 22, rnd.between(6, 14), 2, 0.75);
        r.rect(0x000000, l, t + hh - 22, w, 22, 0.12);
        for (let i = 0; i < w / 40; i++) {
            const sx = l + rnd.between(0, w - 2), sh = rnd.between(10, 22);
            r.rect(GRUEN[1], sx, t + hh - 22 - sh, 2, sh + 2); r.rect(GRUEN[3], sx + 2, t + hh - 22 - sh + 4, 2, 6);
        }
    }
    // --- 10. Schatten an der Decke und an den Seiten, Tageslicht vom Eingang her ---
    for (let y = 0; y < hh * 0.4; y += 8) r.rect(0x000000, l, t + y, w, 8, 0.4 * (1 - y / (hh * 0.4)));
    if (h.licht === 'links') {
        for (let x = 0; x < 360; x += 16) r.rect(0xffe9b0, l + x, t, 16, hh, 0.16 * (1 - x / 360));
    }
}

// Backt die Hintergründe aller Höhlen einmal in Bilder und legt sie hinter Spielwelt und Dekoration.
// Welche Ränder eines Höhlenhintergrunds grenzen an die freie Landschaft (und nicht an Erde)? Nur dort werden sie verpixelt.
function offeneSeiten(h) {
    if (h.offen) return h.offen;
    if (h.art === 'gebaeude' || h.art === 'turm') return ['links', 'rechts', 'oben'];
    if (h.art === 'offen') return ['oben'];
    if (h.art === 'schacht') return h.oben <= 770 ? ['oben'] : [];     // ein Schacht von der Oberfläche ist oben offen
    return [];
}

// Ein Malwerkzeug, das nur Pixel zeichnet, die "innen" liegen: Zu den offenen Rändern hin werden es in 4-Pixel-Zellen immer weniger
// (Zufallsmuster), sodass kein gerader Strich zwischen Höhle und Landschaft bleibt, sondern ein unregelmäßiger, verpixelter Übergang.
function verpixelterRand(r, h, offen) {
    if (!offen.length) return r;
    const BAND = 14, Z = 4;
    const hash = (x, y) => { let n = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + 1274126177) | 0; n = Math.imul(n ^ (n >> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
    const abstand = (x, y) => {
        let d = Infinity;
        if (offen.includes('links')) d = Math.min(d, x - h.links);
        if (offen.includes('rechts')) d = Math.min(d, h.rechts - x);
        if (offen.includes('oben')) d = Math.min(d, y - h.oben);
        if (offen.includes('unten')) d = Math.min(d, h.unten - y);
        return d;
    };
    const rect = (c, x, y, w, hh, a = 1) => {
        // ganz im inneren Bereich: normal zeichnen
        const innen = (!offen.includes('links') || x >= h.links + BAND) && (!offen.includes('rechts') || x + w <= h.rechts - BAND) &&
            (!offen.includes('oben') || y >= h.oben + BAND) && (!offen.includes('unten') || y + hh <= h.unten - BAND);
        if (innen) { r.rect(c, x, y, w, hh, a); return; }
        for (let cy = y; cy < y + hh; cy += Z) {
            for (let cx = x; cx < x + w; cx += Z) {
                const d = abstand(cx + Z / 2, cy + Z / 2);
                if (d >= BAND || hash(Math.floor(cx / Z), Math.floor(cy / Z)) < Math.max(0, d) / BAND) r.rect(c, cx, cy, Math.min(Z, x + w - cx), Math.min(Z, y + hh - cy), a);
            }
        }
    };
    return { rect, tri: r.tri, ell: r.ell, line: r.line };
}

export function buildCaves(scene, hoehlen, lampen) {
    hoehlen.forEach((h, i) => {
        const key = `hoehle_${i}`;
        const offen = offeneSeiten(h);
        const bild = backe(scene, key, h.links, h.oben, h.rechts - h.links, h.unten - h.oben, (r) => {
            zeichneHoehle(verpixelterRand(r, h, offen), new Phaser.Math.RandomDataGenerator([key]), h, lampen);
        });
        bild.setDepth(-5);
    });
}


// ---- Sanfte Hügel: Erdoberfläche, die der Treppenform der Hügel folgt ----

// Malt einen Hügel in 8-Pixel-Spalten: oben Grasschicht (1 bis 3 Kacheln), darunter Erde, die nach unten
// dunkler wird. Gleicher Stil wie der flache Boden. f = { links, breite, schritt, werte[] } (siehe Level01.js).
function zeichneHuegel(r, rnd, f, boden) {
    boden = f.boden ?? boden;            // Hänge im Untergrund haben eine eigene Standhöhe
    const fels = !!f.fels;   // Felshang statt Grashügel: graue Steinkacheln statt grüner Grasschicht
    const GRAS_OBEN = fels ? [0x8c8474, 0x7d776a, 0x948c7c] : [0x6aa032, 0x7ab83c, 0x5d9029];
    const GRAS_MITTE = fels ? [0x6f6a5e, 0x66605a, 0x757066] : [0x4f7f27, 0x467022, 0x588a2c];
    const S = 8, UNTEN = f.unten ?? (boden + 28);   // Unterkante der Zeichnung (hohle Hänge enden früher)
    // Stufenkanten: An jeder Stelle, wo ein Nachbar niedriger ist, entsteht eine senkrechte Wand. Ihre Kante wird ausgefranst und
    // bekommt einen dunklen, bemoosten Saum (wie die Grasdecke oben), die oberen Ecken werden abgerundet.
    const rk = new Phaser.Math.RandomDataGenerator(['kante' + f.links + '_' + f.breite]);
    const wegH = [], saumH = [];
    const spalten = f.werte.length, hoeheAn = (i) => (i < 0 || i >= spalten ? 0 : f.werte[i]);
    for (let i = 0; i <= spalten; i++) {
        const bx = f.links + i * f.schritt, hl = hoeheAn(i - 1), hr = hoeheAn(i);
        const wand = (links, top, fuss) => {              // links = true: Wand auf der linken Seite der höheren Spalte
            const n = Math.max(0, Math.floor((fuss - top - 12) / 8)), prof = zackenProfil(n, rk);
            for (let k = 0; k < n; k++) {
                const y = top + 12 + k * 8, dd = prof[k], th = 4 * rk.between(1, 3);
                if (links) { if (dd) wegH.push([bx, y, dd, 8]); saumH.push([bx + dd, y, th, 8]); }
                else { if (dd) wegH.push([bx - dd, y, dd, 8]); saumH.push([bx - dd - th, y, th, 8]); }
            }
            for (let k = 1; k <= 2; k++) wegH.push([links ? bx : bx - 4 * (3 - k), top + 4 * (k - 1), 4 * (3 - k), 4]);   // obere Ecke abrunden
        };
        if (hr > hl && hr > 0) wand(true, boden - hr, boden - Math.max(hl, 0));
        if (hl > hr && hl > 0) wand(false, boden - hl, boden - Math.max(hr, 0));
    }
    if (wegH.length) r = mitAusschnitt(r, wegH);
    for (let x = f.links; x < f.links + f.breite; x += S) {
        const hoehe = f.werte[Math.min(f.werte.length - 1, Math.floor((x - f.links) / f.schritt))];
        if (hoehe <= 0) continue;
        const top = boden - hoehe;
        const q = rnd.frac();
        const grasTiefe = q < 0.25 ? S : (q < 0.8 ? 2 * S : 3 * S);
        for (let ty = 0; top + ty < UNTEN; ty += S) {
            const hh = Math.min(S, UNTEN - top - ty);
            if (ty < grasTiefe) {
                const letzte = ty + S >= grasTiefe;
                const c = ty === 0 ? rnd.pick(GRAS_OBEN) : (letzte ? (fels ? 0x4f4b46 : 0x3b5f1d) : rnd.pick(GRAS_MITTE));
                r.rect(c, x, top + ty, S, hh);
                if (ty === 0 && rnd.frac() < 0.6) r.rect(fels ? 0xb4afa2 : 0x9bd14a, x, top, S, 2);
                continue;
            }
            let c = fels ? mische(0x6a645a, 0x3a3630, Math.min(1, (ty - grasTiefe) / 120)) : mische(0x7a5a3c, 0x4b3b2a, Math.min(1, (ty - grasTiefe) / 120));
            if (ty === grasTiefe) c = variiere(c, -14);                     // Schatten unter dem Gras
            c = variiere(c, rnd.between(-8, 8));
            r.rect(c, x, top + ty, S, hh);
            for (let k = 0; k < rnd.between(0, 2); k++) {
                r.rect(variiere(c, rnd.pick([-18, -12, 12, 18])), x + rnd.between(0, 5), top + ty + rnd.between(0, 5), 2, 2);
            }
        }
        // Halme auf der Grasdecke (nicht auf Fels)
        if (!fels && rnd.frac() < 0.8) {
            const h = rnd.between(4, 10);
            r.rect(rnd.pick([0x6aa032, 0x7ab83c, 0x8bc84a, 0x5d9029]), x + rnd.between(0, 5), top - h, 2, h);
        }
    }
    zeichneSaum(r, saumH, fels, rk);
    // Steine im Hügel (Pixelblöcke mit Licht und Schatten)
    for (let i = 0; i < f.breite / (fels ? 30 : 60); i++) {
        const sx = f.links + rnd.between(8, f.breite - 8);
        const hoehe = f.werte[Math.min(f.werte.length - 1, Math.floor((sx - f.links) / f.schritt))];
        if (hoehe < 36) continue;
        const sy = boden - hoehe + rnd.between(30, Math.max(31, hoehe - 6));
        for (const [dx, dy, bw, c] of [[0, 0, 12, 0x7d776a], [-2, 4, 16, 0x7d776a], [0, 8, 12, 0x4f4a42]]) r.rect(c, sx + dx, sy + dy, bw, 4);
        r.rect(0xa49f90, sx, sy, 4, 4);
    }
    // Blumen (nicht auf Fels)
    for (let i = 0; i < (fels ? 0 : f.breite / 90); i++) {
        const bx = Math.round((f.links + rnd.between(10, f.breite - 10)) / 2) * 2;
        const hoehe = f.werte[Math.min(f.werte.length - 1, Math.floor((bx - f.links) / f.schritt))];
        if (hoehe <= 0) continue;
        const top = boden - hoehe, hh = rnd.between(5, 8) * 2, bl = rnd.pick([0xe8d44a, 0xd9534f, 0xf0f0f0, 0xb06ad9]);
        r.rect(0x4f6b2a, bx, top - hh, 2, hh + 2);
        r.rect(bl, bx - 3, top - hh - 2, 4, 4); r.rect(bl, bx + 1, top - hh - 2, 4, 4); r.rect(0xffe066, bx - 1, top - hh - 2, 4, 4);
    }
}

// Backt die Erdoberflächen aller sanften Hügel und legt sie über den flachen Boden.
export function buildHuegel(scene, formen, boden) {
    formen.forEach((f, i) => {
        const maxH = Math.max(...f.werte);
        const key = `huegel_${i}`;
        const basis = f.boden ?? boden, y0 = basis - maxH - 20;
        const bild = backe(scene, key, f.links, y0, f.breite, (f.unten ?? (basis + 28)) - y0, (r) => {
            zeichneHuegel(r, new Phaser.Math.RandomDataGenerator([key]), f, boden);
        });
        bild.setDepth(1.5);       // über dem flachen Boden, unter Figuren und Dekoration
    });
}

// Ferne Berge: eine weiche Silhouette aus 8-Pixel-Spalten (summierte Sinuswellen), optional mit Kiefern.
export function buildBerge(scene, worldWidth, boden, scrollFaktor, farbe, mitte, amp, seed, baeume = false, spitz = false) {
    const rnd = new Phaser.Math.RandomDataGenerator([seed]);
    const g = scene.add.graphics().setScrollFactor(scrollFaktor).setDepth(-25 + scrollFaktor);
    const tief = boden - 60 - scene.scale.height / 2;
    const fuss = (boden - tief) + scrollFaktor * tief + 40;
    const p1 = rnd.frac() * 6, p2 = rnd.frac() * 6, p3 = rnd.frac() * 6;
    g.fillStyle(farbe);
    const reichweite = worldWidth * scrollFaktor + MAX_BREITE + 200;
    for (let x = -50; x < reichweite; x += 8) {
        let h = mitte + amp * (0.5 * Math.sin(x * 0.004 + p1) + 0.3 * Math.sin(x * 0.011 + p2) + 0.2 * Math.sin(x * 0.027 + p3));
        if (spitz) {                                                // Felsgrate: spitze Gipfel und steile Flanken statt sanfter Wellen
            const grat = 1 - 2 * Math.abs(Math.sin(x * 0.0034 + p2)), grat2 = 1 - 2 * Math.abs(Math.sin(x * 0.0091 + p3));
            h = mitte + amp * (0.55 * grat + 0.3 * grat2 + 0.15 * Math.sin(x * 0.03 + p1));
        }
        const hq = Math.round(h / 8) * 8, basis = fuss - hq;
        g.fillRect(x, basis, 8, hq + 900);
        if (baeume && rnd.frac() < 0.14) {                         // kleine Kiefer aus Pixelstufen
            const th = rnd.between(3, 6) * 8;
            g.fillRect(x + 2, basis - th, 4, th + 2);
            for (let k = 0; k < 4; k++) g.fillRect(x + 4 - (4 + k * 4), basis - th + k * 8, 8 + k * 8, 6);
        }
    }
}

// Dunkle Ränder wie bei einem alten Film: die Mitte bleibt hell, die Ecken werden dunkel.
// Das Bild entsteht einmal auf einer Canvas-Fläche (einem Mal-Brett des Browsers).
export function buildVignette(scene) {
    const B = scene.scale.width, H = scene.scale.height, key = `vignette_${B}`;   // pro Fensterbreite ein eigenes Bild
    if (!scene.textures.exists(key)) {
        const tex = scene.textures.createCanvas(key, B, H);
        const ctx = tex.getContext();
        const grad = ctx.createRadialGradient(B / 2, H / 2, H * 0.37, B / 2, H / 2, B * 0.65);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(1, 'rgba(0,0,0,0.6)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, B, H);
        tex.refresh();
    }
    if (scene.vignetteBild) scene.vignetteBild.destroy();
    scene.vignetteBild = scene.add.image(0, 0, key).setOrigin(0, 0).setScrollFactor(0).setDepth(15);
}

// Glut und Asche, die über den ganzen Bildschirm nach oben treiben (Stimmung).
export function buildEmbers(scene) {
    scene.add.particles(0, 0, 'px', {
        x: { min: 0, max: MAX_BREITE }, y: scene.scale.height + 20, lifespan: 7000, frequency: 140,
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
        // Leuchtspur: ein kurzlebiger Punkt pro Frame hinter jeder Kugel (bildet einen Schweif)
        this.spurSpielerE = emitter({ lifespan: 140, speed: 0, scale: { start: 1.6, end: 0 },
            alpha: { start: 0.9, end: 0 }, tint: [0xffee99, 0xffcc55] });
        this.spurGegnerE = emitter({ lifespan: 180, speed: 0, scale: { start: 2, end: 0 },
            alpha: { start: 0.8, end: 0 }, tint: [0xff8844, 0xff5533] });
        // Patronenhülsen: fliegen nach hinten oben aus der Waffe und fallen mit der Schwerkraft
        this.huelseLE = emitter({ lifespan: { min: 500, max: 800 }, speed: { min: 70, max: 140 },
            angle: { min: 200, max: 250 }, gravityY: 900, rotate: { start: 0, end: 360 },
            scale: 1.3, tint: [0xd9b84a, 0xc9a227] });
        this.huelseRE = emitter({ lifespan: { min: 500, max: 800 }, speed: { min: 70, max: 140 },
            angle: { min: 290, max: 340 }, gravityY: 900, rotate: { start: 0, end: -360 },
            scale: 1.3, tint: [0xd9b84a, 0xc9a227] });
        this.staubE = emitter({ lifespan: { min: 200, max: 450 }, speed: { min: 30, max: 120 },
            angle: { min: 200, max: 340 }, gravityY: 100, scale: { start: 1.6, end: 0 }, alpha: { start: 0.6, end: 0 },
            tint: [0xb09a7a, 0x8a7a60] });
    }

    // Mündungsfeuer: ein heller Zacken in Schussrichtung, zwei kleine seitliche Zacken und ein Lichtschein.
    // groesse: 1 = Pistole, größer = stärkere Waffe. Nach 80 Millisekunden ist alles weg.
    muzzleFlash(x, y, winkel, groesse = 1, farbe = 0xffdd55) {
        const scene = this.scene;
        const g = scene.add.graphics({ x, y }).setDepth(8).setRotation(winkel);
        g.fillStyle(farbe, 0.95).fillTriangle(0, -5 * groesse, 0, 5 * groesse, 30 * groesse, 0);   // Hauptflamme
        g.fillStyle(farbe, 0.8)
            .fillTriangle(2, 0, 11 * groesse, -11 * groesse, 13 * groesse, -1)                      // Zacken oben
            .fillTriangle(2, 0, 11 * groesse, 11 * groesse, 13 * groesse, 1);                       // Zacken unten
        g.fillStyle(0xffffff, 1).fillTriangle(0, -2.5 * groesse, 0, 2.5 * groesse, 18 * groesse, 0); // heißer Kern
        scene.tweens.add({ targets: g, alpha: 0, scaleX: 1.5, duration: 80, onComplete: () => g.destroy() });
        const licht = scene.add.circle(x, y, 26 * groesse, farbe, 0.35).setDepth(8).setBlendMode(Phaser.BlendModes.ADD);
        scene.tweens.add({ targets: licht, alpha: 0, scale: 1.7, duration: 110, onComplete: () => licht.destroy() });
    }

    // Patronenhülse auswerfen. richtung: 1 = Schütze schaut nach rechts (Hülse fliegt nach links hinten).
    huelse(x, y, richtung) {
        (richtung > 0 ? this.huelseLE : this.huelseRE).emitParticleAt(x, y, 1);
    }

    // Leuchtspur-Punkt an der Position einer Kugel
    spur(x, y, vomSpieler) {
        (vomSpieler ? this.spurSpielerE : this.spurGegnerE).emitParticleAt(x, y, 1);
    }

    // Rauchwolke an der Mündung (stärkere Waffen)
    muendungsrauch(x, y) { this.rauchE.explode(3, x, y); }

    // Druckwelle am Boden: ein flacher Streifen, der sich nach beiden Seiten ausbreitet, dazu Staub.
    druckwelle(x, y) {
        const w = this.scene.add.rectangle(x, y, 40, 8, 0xffe0a0, 0.8).setDepth(8);
        this.scene.tweens.add({ targets: w, scaleX: 12, alpha: 0, duration: 350, onComplete: () => w.destroy() });
        this.staubE.explode(10, x - 30, y); this.staubE.explode(10, x + 30, y);
    }

    // Einsammeln: ein Ring weitet sich, Funken fliegen, ein kurzer Text steigt auf und verblasst.
    pickup(x, y, farbe, text) {
        const scene = this.scene;
        const ring = scene.add.circle(x, y, 8, farbe, 0).setStrokeStyle(3, farbe).setDepth(9);
        scene.tweens.add({ targets: ring, scale: 3.4, alpha: 0, duration: 380, onComplete: () => ring.destroy() });
        this.funkenE.explode(12, x, y);
        const t = scene.add.text(x, y - 16, text, {
            fontSize: '16px', color: '#ffffff', fontStyle: 'bold', stroke: '#000000', strokeThickness: 3,
        }).setOrigin(0.5).setDepth(25);
        scene.tweens.add({ targets: t, y: y - 52, alpha: 0, duration: 950, ease: 'Sine.easeOut', onComplete: () => t.destroy() });
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
