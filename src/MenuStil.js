import { sfx } from './Sound.js';

// Gemeinsamer Look aller Menüs (Startmenü, Lobby, Pause): Pixel-Retro-Stil, "Krieg im Dschungel". Ein animierter Hintergrund aus
// Dschungelschichten (Palmen, Dunst, Rauchsäulen, Explosionen am Horizont, Leuchtspur, Hubschrauber), eine echte Pixelschrift
// (jeder Buchstabe aus Quadraten gebaut) und olivgrüne Knöpfe mit Farbakzent.
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

// ---------------------------------------------------------------------------------------------------------------------
// Pixelschrift: eine 5 x 7 Bitmap-Schrift. Jedes "#" ist ein Quadrat von "px" Pixeln.
// ---------------------------------------------------------------------------------------------------------------------
const G = {
    'A': ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
    'B': ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
    'C': ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
    'D': ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
    'E': ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
    'F': ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
    'G': ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.###.'],
    'H': ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
    'I': ['.###.', '..#..', '..#..', '..#..', '..#..', '..#..', '.###.'],
    'J': ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
    'K': ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
    'L': ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
    'M': ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
    'N': ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
    'O': ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
    'P': ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
    'Q': ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
    'R': ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
    'S': ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
    'T': ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
    'U': ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
    'V': ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
    'W': ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
    'X': ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
    'Y': ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
    'Z': ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
    '0': ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
    '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
    '2': ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
    '3': ['.###.', '#...#', '....#', '..##.', '....#', '#...#', '.###.'],
    '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
    '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
    '6': ['.###.', '#....', '#....', '####.', '#...#', '#...#', '.###.'],
    '7': ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
    '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
    '9': ['.###.', '#...#', '#...#', '.####', '....#', '....#', '.###.'],
    '.': ['.....', '.....', '.....', '.....', '.....', '.##..', '.##..'],
    ',': ['.....', '.....', '.....', '.....', '.##..', '..#..', '.#...'],
    ':': ['.....', '.##..', '.##..', '.....', '.##..', '.##..', '.....'],
    '-': ['.....', '.....', '.....', '#####', '.....', '.....', '.....'],
    '!': ['..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..'],
    '?': ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'],
    '(': ['...#.', '..#..', '.#...', '.#...', '.#...', '..#..', '...#.'],
    ')': ['.#...', '..#..', '...#.', '...#.', '...#.', '..#..', '.#...'],
    '+': ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'],
    '/': ['....#', '....#', '...#.', '..#..', '.#...', '#....', '#....'],
    '_': ['.....', '.....', '.....', '.....', '.....', '.....', '#####'],
    '>': ['#....', '.#...', '..#..', '...#.', '..#..', '.#...', '#....'],
    '[': ['.###.', '.#...', '.#...', '.#...', '.#...', '.#...', '.###.'],
    ']': ['.###.', '...#.', '...#.', '...#.', '...#.', '...#.', '.###.'],
    "'": ['..#..', '..#..', '.#...', '.....', '.....', '.....', '.....'],
    '"': ['.#.#.', '.#.#.', '.....', '.....', '.....', '.....', '.....'],
    '=': ['.....', '.....', '#####', '.....', '#####', '.....', '.....'],
    ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
};
const UMLAUT = { 'Ä': 'A', 'Ö': 'O', 'Ü': 'U' };

// Zeichnet Text als Quadrate in eine Graphics. farbeFn(zeile, spalte, zeichenNr) liefert die Farbe eines Quadrats (null = auslassen).
function glyphen(g, text, px, x0, y0, farbeFn, dx = 0, dy = 0) {
    let nr = 0;
    for (const z0 of text.toUpperCase()) {
        const z = UMLAUT[z0] ?? z0, rows = G[z] ?? G['?'];
        const cx = nr * 6;
        for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) {
            if (rows[r][c] !== '#') continue;
            const f = farbeFn(r, c, nr);
            if (f === null) continue;
            g.fillStyle(f).fillRect(x0 + (cx + c) * px + dx, y0 + r * px + dy, px, px);
        }
        if (UMLAUT[z0]) for (const c of [1, 3]) { const f = farbeFn(0, c, nr); if (f !== null) g.fillStyle(f).fillRect(x0 + (cx + c) * px + dx, y0 - 2 * px + dy, px, px); }
        nr++;
    }
}
const textBreite = (text, px) => (text.length * 6 - 1) * px;

// Ein Pixeltext in einer Graphics, um (0, 0) zentriert (danach mit setPosition verschieben). outline = Farbe des Rands (oder null).
export function pixelText(scene, text, px, farbe, outline = 0x0d1117) {
    const g = scene.add.graphics();
    const x0 = -textBreite(text, px) / 2, y0 = -3.5 * px;
    const o = Math.max(1, Math.round(px / 2));
    if (outline !== null) for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1], [0, 2], [1, 2]]) glyphen(g, text, px, x0, y0, () => outline, ox * o, oy * o);
    glyphen(g, text, px, x0, y0, () => farbe);
    return g;
}

// ---------------------------------------------------------------------------------------------------------------------
// Hintergrund: Krieg im Dschungel
// ---------------------------------------------------------------------------------------------------------------------

// Eine Palme aus Pixelstufen: gebogener Stamm, Wedel, die nach unten hängen, und Kokosnüsse.
function palme(g, x, y, hoehe, farbe, r) {
    const biegung = (r.frac() - 0.5) * 36;
    let tx = x, ty = y;
    for (let k = 0; k < hoehe; k += 8) {
        tx = x + Math.round(Math.sin(k / hoehe * 1.6) * biegung / 4) * 4;
        g.fillStyle(farbe).fillRect(tx - 3, y - k - 8, 7, 9);
        ty = y - k - 8;
    }
    const wedel = 8, laenge = r.between(46, 78);
    for (let w = 0; w < wedel; w++) {
        const a = -Math.PI / 2 + (w - (wedel - 1) / 2) * 0.62 + (r.frac() - 0.5) * 0.2;
        for (let s = 0; s < laenge; s += 5) {
            const px = tx + Math.cos(a) * s * 1.1, py = ty + Math.sin(a) * s * 0.55 + s * s * 0.011;
            const d = Math.max(3, 8 - s / 12);
            g.fillStyle(farbe).fillRect(px - d / 2, py - d / 2, d, d);
        }
    }
    g.fillStyle(lerpFarbe(farbe, 0x3a2a12, 0.6)).fillRect(tx - 5, ty + 2, 5, 5).fillRect(tx + 2, ty + 3, 5, 5);   // Kokosnüsse
}

// Der animierte Hintergrund. Gibt ein Objekt mit update(zeit) zurück, das die Szene in ihrem update() aufruft.
export function baueHintergrund(scene) {
    const zu = new Phaser.Math.RandomDataGenerator(['dschungel']);
    const teile = [];
    const HOR = 430;

    // --- Himmel: finsteres Blaugrün oben, giftiger Dunst, am Horizont das Glühen der Brände ---
    const himmel = scene.add.graphics().setDepth(-100);
    const farben = [[0, 0x07141a], [0.4, 0x123a36], [0.7, 0x4a6a34], [0.88, 0xb8803a], [1, 0xeda040]];
    const streifen = 52;
    for (let i = 0; i < streifen; i++) {
        const t = i / (streifen - 1);
        let k = 0; while (k < farben.length - 2 && t > farben[k + 1][0]) k++;
        const [ta, ca] = farben[k], [tb, cb] = farben[k + 1];
        himmel.fillStyle(lerpFarbe(ca, cb, Math.max(0, Math.min(1, (t - ta) / (tb - ta))))).fillRect(X0, Y0 + (HOR - Y0) * i / streifen, X1 - X0, (HOR - Y0) / streifen + 2);
    }
    himmel.fillStyle(0xeda040).fillRect(X0, HOR, X1 - X0, Y1 - HOR);
    // pulsierendes Glühen der Brände hinter dem Horizont
    const glut = scene.add.graphics().setDepth(-99);
    teile.push((t) => {
        glut.clear();
        const f = 0.5 + 0.5 * Math.sin(t * 0.0013);
        for (const [x, r] of [[160, 190], [470, 150], [830, 210]]) {
            glut.fillStyle(0xff6a22, 0.07 + 0.03 * f).fillCircle(x, HOR - 10, r * (1 + 0.04 * f));
            glut.fillStyle(0xff9a44, 0.10 + 0.04 * f).fillCircle(x, HOR - 5, r * 0.55);
        }
    });

    // --- Dunstbänder, die langsam durchs Bild ziehen ---
    const dunst = [];
    for (let i = 0; i < 5; i++) {
        const g = scene.add.graphics().setDepth(-93 + i * 0.4);
        const w = zu.between(300, 600);
        for (let k = 0; k < 4; k++) g.fillStyle(zu.pick([0xc8d08a, 0xa8c07a, 0xe0d08a]), 0.07).fillRect(zu.between(0, 80), k * 5, w - zu.between(0, 120), 7);
        dunst.push({ g, x: zu.between(X0, X1), y: zu.between(HOR - 120, HOR + 40), v: zu.between(6, 16) / 1000, w });
    }
    teile.push((t, dt) => {
        for (const d of dunst) { d.x += d.v * dt; if (d.x > X1) d.x = X0 - d.w; d.g.setPosition(d.x, d.y); }
    });

    // --- Rauchsäulen von brennenden Stellungen ---
    if (!scene.textures.exists('menue_rauch')) {
        const pg = scene.add.graphics();
        for (let r = 12; r > 2; r -= 2) pg.fillStyle(0xffffff, 0.18).fillCircle(14, 14, r);
        pg.generateTexture('menue_rauch', 28, 28); pg.destroy();
    }
    if (!scene.textures.exists('menue_px')) {
        const pg = scene.add.graphics(); pg.fillStyle(0xffffff).fillRect(0, 0, 4, 4); pg.generateTexture('menue_px', 4, 4); pg.destroy();
    }
    for (const x of [60, 330, 640, 900]) {
        scene.add.particles(x, HOR - 10, 'menue_rauch', {
            speedY: { min: -38, max: -18 }, speedX: { min: -10, max: 14 }, lifespan: 9000, frequency: 160, scale: { start: 1.2, end: 6 },
            alpha: { start: 0.5, end: 0 }, tint: [0x1c1a18, 0x2c2622, 0x3a3028], rotate: { min: 0, max: 360 },
        }).setDepth(-96);
    }

    // --- Dschungelschichten (nahtlos wiederholt, verschieden schnell) ---
    const P = 1200;
    const schicht = (farbe, grund, amp, speed, tiefe, seed, palmen, palmenHoehe) => {
        const g = scene.add.graphics().setDepth(tiefe);
        const r = new Phaser.Math.RandomDataGenerator([seed]);
        const ph = [r.frac() * 6.28, r.frac() * 6.28, r.frac() * 6.28];
        const rauschen = []; for (let i = 0; i < P / 8; i++) rauschen.push(r.frac());
        const hoehe = (x) => {
            const i = Math.floor(((x % P) + P) % P / 8);
            return amp * (0.45 * Math.sin(2 * Math.PI * x / P + ph[0]) + 0.28 * Math.sin(2 * Math.PI * 3 * x / P + ph[1]) + 0.12 * Math.sin(2 * Math.PI * 9 * x / P + ph[2]) + 0.35) + rauschen[i] * 14;   // klumpiges Blätterdach
        };
        const px = []; for (let i = 0; i < palmen; i++) px.push(r.between(0, P));
        for (let rep = 0; rep < 3; rep++) {
            for (let x = 0; x < P; x += 8) {
                const hh = Math.round(hoehe(x) / 4) * 4, oben = grund - hh;
                g.fillStyle(farbe).fillRect(rep * P + x + X0, oben, 8, Y1 - oben);
                if (rauschen[x / 8] > 0.75) g.fillStyle(lerpFarbe(farbe, 0x6aa04a, 0.16)).fillRect(rep * P + x + X0, oben, 8, 4);   // helle Blattspitzen
            }
            const rr = new Phaser.Math.RandomDataGenerator([seed + 'p' + rep]);
            for (const bx of px) palme(g, rep * P + bx + X0, grund - Math.round(hoehe(bx) / 4) * 4 + 6, palmenHoehe + rr.between(-20, 40), farbe, rr);
        }
        teile.push((t) => { g.x = -((t * speed) % P); });
        return g;
    };
    schicht(0x1d5a40, 420, 60, 0.004, -92, 'd1', 9, 70);
    schicht(0x124030, 455, 78, 0.009, -90, 'd2', 8, 100);
    schicht(0x0a2a1e, 490, 70, 0.016, -88, 'd3', 6, 140);

    // --- Explosionen am Horizont, Leuchtspur, Hubschrauber ---
    const effekte = scene.add.graphics().setDepth(-91);
    const expl = [], spuren = [];
    let naechsteExpl = 1500, naechsteSpur = 800;
    const blitz = scene.add.rectangle(MITTE_X, MITTE_Y, X1 - X0, Y1 - Y0, 0xffb060, 0).setDepth(-50);
    teile.push((t, dt) => {
        if (t > naechsteExpl) { expl.push({ x: zu.between(60, 900), y: HOR - zu.between(20, 90), t0: t }); naechsteExpl = t + zu.between(2200, 5500); }
        if (t > naechsteSpur) {
            const l = zu.frac() < 0.5;
            spuren.push({ x: l ? zu.between(0, 300) : zu.between(660, 960), y: HOR - 10, dx: (l ? 1 : -1) * zu.between(150, 420), dy: -zu.between(140, 300), t0: t, farbe: zu.pick([0xfff09a, 0xa8ff6a, 0xff8a5a]) });
            naechsteSpur = t + zu.between(500, 1800);
        }
        effekte.clear();
        let blitzA = 0;
        for (let i = expl.length - 1; i >= 0; i--) {
            const e = expl[i], a = (t - e.t0) / 900;
            if (a > 1) { expl.splice(i, 1); continue; }
            const r = 12 + 62 * Math.sqrt(a);
            effekte.fillStyle(0xff5a1a, 0.55 * (1 - a)).fillCircle(e.x, e.y, r);
            effekte.fillStyle(0xffb040, 0.8 * (1 - a)).fillCircle(e.x, e.y, r * 0.66);
            effekte.fillStyle(0xfff3b0, 0.9 * (1 - a)).fillCircle(e.x, e.y, r * 0.32);
            effekte.lineStyle(3, 0xffd080, 0.6 * (1 - a)).strokeCircle(e.x, e.y - 4, r * 1.5);
            if (a < 0.2) blitzA = Math.max(blitzA, 0.16 * (1 - a / 0.2));
            for (let k = 0; k < 7; k++) { const aa = k * 0.9 + e.x; effekte.fillStyle(0xffcc66, 0.8 * (1 - a)).fillRect(e.x + Math.cos(aa) * r * 1.2, e.y + Math.sin(aa) * r * 0.9 - a * 40, 4, 4); }
        }
        blitz.setAlpha(blitzA);
        for (let i = spuren.length - 1; i >= 0; i--) {
            const s = spuren[i], a = (t - s.t0) / 1000;
            if (a > 1) { spuren.splice(i, 1); continue; }
            const pos = (u) => [s.x + s.dx * u, s.y + s.dy * u - 120 * u * (1 - u) * 1.4];
            const [x1, y1] = pos(a), [x2, y2] = pos(Math.max(0, a - 0.07));
            effekte.lineStyle(3, s.farbe, 0.95).beginPath().moveTo(x1, y1).lineTo(x2, y2).strokePath();
            effekte.fillStyle(0xffffff, 0.9).fillRect(x1 - 1, y1 - 1, 3, 3);
        }
    });
    // Hubschrauber (Huey): zwei Stück in verschiedener Höhe und Richtung
    const hubschrauber = (hoehe, richtung, tempo, tiefe) => {
        const g = scene.add.graphics().setDepth(tiefe);
        const z = { x: richtung > 0 ? X0 - 150 : X1 + 150, aktiv: false, naechster: zu.between(1500, 6000) };
        teile.push((t, dt) => {
            if (!z.aktiv) { g.clear(); if (t > z.naechster) { z.aktiv = true; z.x = richtung > 0 ? X0 - 120 : X1 + 120; } return; }
            z.x += richtung * tempo * dt;
            const y = hoehe + Math.sin(z.x * 0.01) * 8;
            g.clear();
            const c = 0x07130d, f = -richtung;                    // f = Richtung zum Heck: Der Hubschrauber fliegt mit der Nase voran
            const X = (dx) => z.x + dx * f;
            const box = (dx, dy, w, h) => g.fillRect(f > 0 ? z.x + dx : z.x - dx - w, y + dy, w, h);
            g.fillStyle(c);
            box(0, 0, 52, 18); box(6, -6, 40, 6); box(46, 4, 44, 7); box(84, -10, 6, 16);   // Rumpf, Kabine, Heckausleger, Heckflosse
            box(4, 20, 50, 3); box(10, 17, 3, 5); box(38, 17, 3, 5);                         // Landekufen
            box(22, -12, 5, 7);                                                              // Rotormast
            const rot = 24 + 44 * Math.abs(Math.sin(t * 0.04));
            g.fillRect(X(24) - rot, y - 14, rot * 2, 3);                                     // Hauptrotor
            g.fillStyle(0x9fd3a0, 0.6); box(-2, 2, 12, 10);                                  // Cockpitfenster
            g.fillStyle(0xff4444, Math.sin(t * 0.012) > 0 ? 0.95 : 0.2).fillRect(X(88) - 2, y - 14, 4, 4);   // Warnlicht am Heck
            g.fillStyle(0xfff0a0, 0.18).fillTriangle(X(0), y + 14, X(-170), y + 130, X(-90), y + 150);       // Scheinwerferkegel nach vorn unten
            if ((richtung > 0 && z.x > X1 + 200) || (richtung < 0 && z.x < X0 - 200)) { z.aktiv = false; z.naechster = t + zu.between(9000, 20000); }
        });
    };
    hubschrauber(120, 1, 0.12, -89);
    hubschrauber(200, -1, 0.09, -89);

    // --- Vordergrund links und rechts (gespiegelt): dichte Blätter, Farn und Ranken, die leicht im Wind schwingen ---
    const blattbueschel = (richtung, seed) => {
        const g = scene.add.graphics().setDepth(-70);
        const r = new Phaser.Math.RandomDataGenerator([seed]);
        for (let b = 0; b < 16; b++) {
            const a = -Math.PI / 2 + richtung * (0.04 + b * 0.1) + (r.frac() - 0.5) * 0.15;     // von senkrecht bis zur Seite aufgefächert
            const len = r.between(110, 250), farbe = r.pick([0x0a2a1a, 0x0e3a24, 0x14502e, 0x082016]);
            for (let s = 0; s < len; s += 5) {
                const bx = Math.cos(a) * s, by = Math.sin(a) * s + s * s * 0.0035;                // Blätter hängen zur Spitze hin durch
                const breit = Math.max(3, 17 - s / 11);
                g.fillStyle(farbe).fillRect(bx - breit / 2, by, breit, 6);
                if (s % 20 === 0) g.fillStyle(lerpFarbe(farbe, 0x6aa04a, 0.3)).fillRect(bx - breit / 2, by, breit, 2);
            }
        }
        return g;
    };
    const links = blattbueschel(1, 'bl'), rechts = blattbueschel(1, 'bl');       // beide gleich gebaut; der rechte wird gespiegelt: perfekt symmetrisch
    rechts.setScale(-1, 1);
    teile.push((t) => {
        const w = Math.sin(t * 0.0012) * 0.025;
        const halb = scene.scale.width / (2 * (scene.scale.height / 540));          // halbe sichtbare Breite im Menü-Entwurf: Die Büsche sitzen immer an den Bildrändern
        links.setPosition(MITTE_X - halb + 6, 560).setRotation(w);
        rechts.setPosition(MITTE_X + halb - 6, 560).setRotation(-w);
    });
    // Lianen von oben in den Ecken
    const lianen = scene.add.graphics().setDepth(-69);
    const ranken = []; for (let i = 0; i < 9; i++) { const seite = i % 2 ? 1 : -1; ranken.push({ x: MITTE_X + seite * (170 + Math.floor(i / 2) * 80 + zu.between(0, 30)), l: zu.between(70, 190), p: zu.frac() * 6 }); }
    teile.push((t) => {
        lianen.clear();
        for (const v of ranken) {
            for (let s = 0; s < v.l; s += 6) {
                const sx = v.x + Math.sin(t * 0.0013 + v.p + s * 0.02) * (s * 0.06);
                lianen.fillStyle(0x0c3a22).fillRect(sx, Y0 + 200 + s, 3, 7);
                if (s % 24 === 0) lianen.fillStyle(0x1a6a3a).fillRect(sx - 6, Y0 + 200 + s + 2, 7, 4).fillRect(sx + 3, Y0 + 200 + s + 5, 7, 4);
            }
        }
    });

    // --- Kein harter Boden: Der Dschungel verschwindet unten in dunklem Dunst ---
    const nebel = scene.add.graphics().setDepth(-66);
    for (let i = 0; i < 28; i++) nebel.fillStyle(0x03120a, Math.min(0.92, 0.03 + i * 0.034)).fillRect(X0, 400 + i * 13, X1 - X0, 14);

    // Glut und Asche, die über das Bild treiben
    scene.add.particles(0, 0, 'menue_px', {
        x: { min: X0, max: X1 }, y: Y1, speedY: { min: -70, max: -25 }, speedX: { min: -25, max: 25 }, lifespan: 9000, frequency: 200,
        scale: { start: 0.9, end: 0.2 }, alpha: { start: 0.65, end: 0 }, tint: [0xff9944, 0xffcc66, 0x888866],
    }).setDepth(-65);

    // Dunkle Ränder (Vignette) in Grün-Schwarz
    const rand = scene.add.graphics().setDepth(-60);
    for (let i = 0; i < 14; i++) {
        const a = 0.4 * (1 - i / 14);
        rand.fillStyle(0x020a06, a).fillRect(X0, Y0 + i * 12, X1 - X0, 12).fillRect(X0, Y1 - (i + 1) * 12, X1 - X0, 12);
        rand.fillStyle(0x020a06, a * 0.8).fillRect(X0 + i * 16, Y0, 16, Y1 - Y0).fillRect(X1 - (i + 1) * 16, Y0, 16, Y1 - Y0);
    }

    let zuletzt = 0;
    return {
        update(t) {
            const dt = Math.min(60, t - zuletzt); zuletzt = t;
            for (const f of teile) f(t, dt);
        },
    };
}

// Der Titel: echte Pixelbuchstaben (5 x 7 Quadrate je Buchstabe) mit Farbverlauf von Gelb über Orange nach Rot, dunklem Rand, Tiefe
// nach unten rechts und leicht abgenutzten Stellen (wie ein Kriegsplakat). Die Buchstaben wippen in einer Welle.
export function baueTitel(scene, text, y, px = 8) {
    const buchstaben = [];
    const gesamt = textBreite(text, px);
    const x0 = MITTE_X - gesamt / 2;
    const rr = new Phaser.Math.RandomDataGenerator(['titel' + text]);
    const verlauf = [0xfff0a0, 0xffe45a, 0xffc22a, 0xff9a2a, 0xf0701c, 0xdb4a1a, 0xb8341a];
    [...text].forEach((z, i) => {
        if (z === ' ') return;
        const g = scene.add.graphics().setDepth(10);
        const lx = i * 6 * px;                                           // x-Versatz dieses Buchstabens innerhalb der Zeile
        const draw = (farbeFn, dx = 0, dy = 0) => {
            const rows = G[UMLAUT[z] ?? z] ?? G['?'];
            for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) {
                if (rows[r][c] !== '#') continue;
                const f = farbeFn(r, c); if (f === null) continue;
                g.fillStyle(f).fillRect(lx + c * px + dx, r * px + dy, px, px);
            }
            if (UMLAUT[z]) for (const c of [1, 3]) g.fillStyle(farbeFn(0, c) ?? 0xffe45a).fillRect(lx + c * px + dx, -2 * px + dy, px, px);
        };
        const o = Math.max(1, Math.round(px / 2));
        for (let k = 6; k >= 1; k--) { const v = Math.round(k * px * 0.4); draw(() => lerpFarbe(0x3a0f08, 0x8a2410, 1 - k / 6), v, v); }        // Tiefe
        for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]) draw(() => 0x1a0a06, ox * o, oy * o);   // dunkler Rand
        draw((r, c) => (rr.frac() < 0.05 ? null : verlauf[r]));                                                             // Fläche (abgenutzt)
        draw((r, c) => ((r === 0 && rr.frac() < 0.6) ? 0xffffff : null), 0, 0);                                              // Glanzpunkte oben
        g.setPosition(x0, y - 3.5 * px);
        buchstaben.push({ g, i, y0: y - 3.5 * px });
    });
    return {
        update(t) {
            for (const b of buchstaben) b.g.setY(b.y0 + Math.sin(t * 0.003 + b.i * 0.55) * 4);
        },
    };
}

// Ein Pixelknopf im Dschungel-Look (olivgrün, Pixelecken, Farbakzent, Pixelschrift). Gibt { zeichne(t), an, hover, zerstoere() } zurück.
export function pixelKnopf(scene, x, y, breite, hoehe, text, farbe, aktion, optionen = {}) {
    const { px = 3, deaktiviert = false } = optionen;
    const g = scene.add.graphics().setDepth(10);
    const label = pixelText(scene, text, px, deaktiviert ? 0x6f7d88 : 0xf4efe0, 0x0d1117).setDepth(11);
    const pfeil = pixelText(scene, '>', px, 0xffdd55, 0x0d1117).setDepth(11).setVisible(false);
    const zone = scene.add.rectangle(x, y, breite, hoehe, 0x000000, 0).setInteractive({ useHandCursor: true }).setDepth(12);
    const k = { x, y, aktiv: false, an: 0, hover: false, g, label, pfeil, zone, farbe, deaktiviert };
    const zeichne = (t) => {
        g.clear();
        const hov = k.an;                                          // 0 bis 1 (weich ein- und ausblenden)
        const dx = x - breite / 2, dy = y - hoehe / 2 - hov * 2;
        const kerbe = 5;
        const fuell = deaktiviert ? 0x151c18 : lerpFarbe(0x16241a, lerpFarbe(0x24402a, farbe, 0.28), hov);
        const rand = deaktiviert ? 0x333f38 : lerpFarbe(0x56653a, 0xffdd55, hov);
        g.fillStyle(0x000000, 0.45).fillRect(dx + 4, dy + 6, breite, hoehe);                                                  // Schatten
        g.fillStyle(rand).fillRect(dx + kerbe, dy, breite - 2 * kerbe, hoehe).fillRect(dx, dy + kerbe, breite, hoehe - 2 * kerbe);   // Rahmen mit Pixelecken
        g.fillStyle(fuell).fillRect(dx + kerbe + 2, dy + 3, breite - 2 * kerbe - 4, hoehe - 6).fillRect(dx + 3, dy + kerbe + 2, breite - 6, hoehe - 2 * kerbe - 4);
        g.fillStyle(0xffffff, 0.07 + 0.07 * hov).fillRect(dx + kerbe + 3, dy + 4, breite - 2 * kerbe - 6, 4);               // Lichtband oben
        g.fillStyle(0x000000, 0.28).fillRect(dx + kerbe + 3, dy + hoehe - 8, breite - 2 * kerbe - 6, 4);                    // Schatten unten
        g.fillStyle(deaktiviert ? 0x333f38 : farbe).fillRect(dx + 6, dy + 8, 8, hoehe - 16);                                // Farbakzent links
        g.fillStyle(0xffffff, 0.35).fillRect(dx + 6, dy + 8, 3, hoehe - 16);
        if (!deaktiviert) g.fillStyle(farbe, 0.6 + 0.4 * hov).fillRect(dx + breite - 16, y - 3 - hov * 2, 6, 6);           // Punkt rechts
        for (const [nx, ny] of [[10, 10], [breite - 12, 10], [10, hoehe - 12], [breite - 12, hoehe - 12]]) g.fillStyle(0x0d1117, 0.6).fillRect(dx + nx, dy + ny, 3, 3);   // Nieten
        if (hov > 0.05) g.lineStyle(2, 0xffdd55, hov * (0.55 + 0.35 * Math.sin(t * 0.008))).strokeRect(dx - 2, dy - 2, breite + 4, hoehe + 4);
        label.setPosition(x + 8, y - hov * 2);
        pfeil.setPosition(x - breite / 2 + 30 + Math.sin(t * 0.012) * 3, y - hov * 2).setVisible(hov > 0.4 && !deaktiviert).setAlpha(hov);
    };
    k.zeichne = zeichne;
    zone.on('pointerover', () => { k.hover = true; if (!deaktiviert && k.beiHover) k.beiHover(); });
    zone.on('pointerout', () => { k.hover = false; });
    zone.on('pointerdown', () => aktion());
    k.zerstoere = () => { g.destroy(); label.destroy(); pfeil.destroy(); zone.destroy(); };
    return k;
}

// Ein kleiner Knopf oben am Rand (Ton, Vollbild) in Pixelschrift auf dunklem Kasten.
export function oberKnopf(scene, x, y, text, aktion, linksBuendig = true, breiteText = text) {
    const px = 2, bw = textBreite(breiteText, px) + 24, bh = 7 * px + 16;
    const x0 = linksBuendig ? x : x - bw;
    const kasten = scene.add.graphics().setDepth(15);
    const label = pixelText(scene, text, px, 0xe8dcc0, 0x0d1117).setDepth(16);
    const zone = scene.add.rectangle(x0 + bw / 2, y, bw, bh, 0x000000, 0).setInteractive({ useHandCursor: true }).setDepth(17);
    const o = { text, zone, hover: false };
    const zeichne = () => {
        kasten.clear();
        kasten.fillStyle(0x000000, 0.4).fillRect(x0 + 3, y - bh / 2 + 4, bw, bh);
        kasten.fillStyle(o.hover ? 0xffdd55 : 0x56653a).fillRect(x0, y - bh / 2, bw, bh);
        kasten.fillStyle(0x16241a).fillRect(x0 + 2, y - bh / 2 + 2, bw - 4, bh - 4);
        kasten.fillStyle(0xffffff, 0.07).fillRect(x0 + 2, y - bh / 2 + 2, bw - 4, 3);
    };
    zeichne();
    label.setPosition(x0 + bw / 2, y);
    zone.on('pointerover', () => { o.hover = true; zeichne(); });
    zone.on('pointerout', () => { o.hover = false; zeichne(); });
    zone.on('pointerdown', aktion);
    o.setText = (t) => { /* die Beschriftung wird neu gebaut */ label.clear(); const px2 = px; const gx = -textBreite(t, px2) / 2, gy = -3.5 * px2;
        for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1], [0, 2], [1, 2]]) glyphen(label, t, px2, gx, gy, () => 0x0d1117, ox, oy);
        glyphen(label, t, px2, gx, gy, () => 0xe8dcc0); };
    return o;
}

// Eine veränderliche Pixelbeschriftung (mehrere Zeilen möglich), mittig um (x, y). setText(text) malt sie neu.
export function pixelLabel(scene, x, y, px, farbe, tiefe = 10) {
    const g = scene.add.graphics().setDepth(tiefe);
    const o = Math.max(1, Math.round(px / 2));
    const obj = {
        g, farbe,
        setText(text, f = farbe) {
            g.clear();
            const zeilen = String(text).split('\n');
            zeilen.forEach((z, i) => {
                const gx = x - textBreite(z, px) / 2, gy = y + (i - (zeilen.length - 1) / 2) * 10 * px - 3.5 * px;
                for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1], [0, 2], [1, 2]]) glyphen(g, z, px, gx, gy, () => 0x0d1117, ox * o, oy * o);
                glyphen(g, z, px, gx, gy, () => f);
            });
            return obj;
        },
    };
    return obj;
}

export { sfx };
