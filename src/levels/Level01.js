// Level 01: Verlassene Militärzone (13000 Pixel breit, 1500 hoch).
// Die Datei enthält fast nur DATEN. Kleine Hilfsfunktionen sorgen dafür, dass wir
// Hügel, Plattformen, Gegner und Gegenstände mit einfachen Angaben setzen können.
//
// Koordinaten: x = waagerecht, y = senkrecht (0 oben, 1500 unten). Die Oberfläche liegt bei y = BODEN.
// Alle Höhen werden relativ zu BODEN angegeben: BODEN - 100 liegt 100 Pixel ÜBER der Oberfläche.
// Der Spieler springt etwa 150 Pixel hoch und rund 280 Pixel weit.
// Deshalb gilt in diesem Level: Stufen sind höchstens 100 hoch, Lücken höchstens 150 breit.

const HOEHE = 1500;  // Höhe der ganzen Welt: oben Platz für Gebäude, unten für Tunnel und die tiefe Mine
const BODEN = 760;   // Höhe der Oberfläche (Oberkante des Bodens)

// Farben
const ERDE = 0x5b4a35;
const BETON = 0x6a6f73;
const BUNKER = 0x45494d;
const SAND = 0x8a7a55;
const GRAU = 0x5a5a5a;
const OLIV = 0x4a5238;
const FELS = 0x5e5a55;   // Fels (grauer Stein, ohne Gras)

// Die Listen, die am Ende exportiert werden. Die Hilfsfunktionen füllen sie.
const platforms = [];
const decor = [];
const enemies = [];
const rangedEnemies = [];
const skelette = [];
const pickups = [];
const treppen = [];    // Treppen (für die Zeichnung der Wangen, Geländer und Warnstreifen)
const bruecken = [];  // Brücken (für die Zeichnung der Geländer, Streben und Seile)
const huegelformen = [];  // sanfte Hügel (für die Zeichnung der Erdoberfläche)
const hoehlen = [];   // Hintergründe von Höhlen und Gräben (werden als Bilder gemalt)
const lampen = [];    // x-Positionen der Deckenlampen (für Lichtkegel)
const signs = [];
const faesser = [];   // explosive Fässer
const leitern = [];     // Leitern zum Klettern (für Spieler; Gegner benutzen sie nicht)
const schachtkoepfe = [];   // Förderschächte mit Fördergerüst (für die Zeichnung)
const geruest = [];   // Holzabsätze in Schächten (für Stützstreben und Ketten in der Zeichnung)

// ---- Der Untergrund: Erde mit einem Tunnel (siehe ZONE T) ----
const ARENA = 2200;             // Verschiebung der Zonen H und I (und des Ziels) nach rechts: Platz für das Gebirge (ZONE R)
const BREITE = 15400 + ARENA;   // Breite der Welt
const TUNNEL_LINKS = 2740;      // linke Kante des Tunnels (linker Schacht beginnt hier)
const TUNNEL_RECHTS = 4220;     // rechte Kante (rechter Schacht endet hier)
const SCHACHT = 260;            // Breite eines Schachts
const EINGANG = TUNNEL_LINKS + 200;   // hier beginnt die Felsdecke: der Höhleneingang (x 2940)
const TUNNEL_ENDE = 3900;       // hier endet die Tunneldecke: Danach liegt der Einsturzkrater mit dem Hang nach oben
const KRATER_ENDE = 4348;       // hier endet der Krater; ab hier liegt die Oberfläche wieder auf Fels
const VERLIES_ENDE = 4780;      // Ende der Waffenkammer: der Tunnel geht HINTER dem Ausgang noch weiter
const DECKE = 64;               // Mindestdicke der Tunneldecke (Oberfläche bis Unterkante der Basisdecke); Felsen hängen darunter
const TUNNEL_BODEN = 1048;      // y der Oberkante des Tunnelbodens (288 unter der Oberfläche): der Gang ist 228 hoch

// ---- Die tiefe Mine (zweite Ebene unter der Erde, siehe ZONE K) ----
const V = 6000 + ARENA;         // Verschiebung der Boss-Zonen H und I nach rechts (das Level ist länger geworden)
const MINE_L = 7400;            // linke Kante des Förderschachts
const MINE_R = 9900;            // rechte Kante des Ausgangsschachts
const CHASM_L = 8400;           // Schlucht: linke Kante
const CHASM_R = 8640;           // Schlucht: rechte Kante
const KAV_R = 9300;             // Ende der großen Kaverne
const SCHACHT2_L = 9640;        // linke Kante des Ausgangsschachts
const MINE_BODEN = 1330;        // y des Minenbodens (570 unter der Oberfläche)
const MINE_DECKE = 1128;        // Unterkante der Basisdecke im Gang (202 Platz bis zum Boden; Felsen hängen bis zu 64 tiefer)
const KAV_DECKE = 928;          // Unterkante der Basisdecke in der hohen Kaverne
const HOLZ = 0x6b4a2a;          // Holz (Brücken, Absätze)
const METALL = 0x3a4046;        // Stahl (Gitterturm)

// erde: ein Erdblock von "links" bis "rechts" und von "oben" bis "unten" (alles Kanten, keine Mitte).
const erde = (links, rechts, oben, unten, farbe = 0x4b3b2a) =>
    platforms.push({ x: (links + rechts) / 2, y: (oben + unten) / 2, w: rechts - links, h: unten - oben, color: farbe });

erde(0, TUNNEL_LINKS, BODEN, HOEHE);                                              // Erde links vom Tunnel
erde(TUNNEL_LINKS, VERLIES_ENDE, TUNNEL_BODEN, HOEHE);                            // Boden des Tunnels (bis zur Waffenkammer)
erde(VERLIES_ENDE, MINE_L, BODEN, HOEHE);                                         // Erde rechts hinter der Kammer bis zum Förderschacht
erde(MINE_L, MINE_R, MINE_BODEN, HOEHE);                                          // Boden der Mine
erde(MINE_R, 11520, BODEN, HOEHE);                                                // Erde hinter dem Ausgangsschacht (mit sanften Hügeln, ZONE N)
erde(11520, 11800, MINE_BODEN, HOEHE);                                            // Grund der ersten Schlucht (ZONE N)
erde(11800, 12420, BODEN, HOEHE);
erde(12420, 12800, 950, HOEHE);                                                   // Grund der zweiten, flachen Schlucht (190 tief)
erde(12800, BREITE, BODEN, HOEHE);

// huegel: ein fester Block, der AUF DEM BODEN steht. Angabe: linke Kante, Höhe, Breite.
// Aus der Höhe wird die Mitte berechnet (Rechtecke werden von ihrer Mitte aus gezeichnet).
// wrack: ein Fahrzeugwrack (unsichtbarer Block zum Draufstehen; die Landschaft malt das Fahrzeug darüber).
const wracks = [];
const wrack = (links, hoehe, breite) => {
    platforms.push({ x: links + breite / 2, y: BODEN - hoehe / 2, w: breite, h: hoehe, color: OLIV, kollision: true });
    wracks.push({ x: links + breite / 2, y: BODEN, w: breite, h: hoehe });
};
const huegel = (links, hoehe, breite, farbe = ERDE) =>
    platforms.push({ x: links + breite / 2, y: BODEN - hoehe / 2, w: breite, h: hoehe, color: farbe });

// schwebend: eine dünne Plattform in der Luft. Angabe: linke Kante, y der OBERKANTE, Breite.
const schwebend = (links, oben, breite, farbe = BETON) =>
    platforms.push({ x: links + breite / 2, y: oben + 10, w: breite, h: 20, color: farbe });

// Gegner. "oben" = y der Fläche, auf der er steht (Standard: der Boden).
// left/right begrenzen seine Patrouille, hp sind seine Lebenspunkte.
const nahkaempfer = (x, links, rechts, hp = 3, oben = BODEN) =>
    enemies.push({ x, y: oben - 30, left: links, right: rechts, hp });
const fernkaempfer = (x, links, rechts, hp = 3, oben = BODEN) =>
    rangedEnemies.push({ x, y: oben - 30, left: links, right: rechts, hp });
// skelett: ein Skelett-Bogenschütze (Fernkämpfer, schießt Pfeile)
const skelett = (x, links, rechts, hp = 3, oben = BODEN) =>
    skelette.push({ x, y: oben - 30, left: links, right: rechts, hp });

// Gegenstände: "oben" = y der Fläche, auf der sie liegen.
const munition = (x, oben = BODEN) => pickups.push({ x, y: oben - 10, type: 'ammo' });
const heilung = (x, oben = BODEN) => pickups.push({ x, y: oben - 10, type: 'health' });
const schrotflinte = (x, oben = BODEN) => pickups.push({ x, y: oben - 10, type: 'shotgun' });
// fass: ein explosives Fass auf dem Boden (oben = y der Standfläche)
const fass = (x, oben = BODEN) => faesser.push({ x, y: oben - 19 });
const schwert = (x, oben = BODEN) => pickups.push({ x, y: oben - 12, type: 'sword' });   // die Nahkampfwaffe
const granate = (x, oben = BODEN) => pickups.push({ x, y: oben - 10, type: 'grenade' });
const waffe = (x, oben = BODEN) => pickups.push({ x, y: oben - 10, type: 'rifle' });   // das Sturmgewehr

// Dekoration (ohne Physik)
const stacheldraht = (x, oben = BODEN) => {      // oben = y der Standfläche
    decor.push({ x: x, y: oben - 15, w: 6, h: 30, color: 0x555555 });
    decor.push({ x: x + 60, y: oben - 15, w: 6, h: 30, color: 0x555555 });
    decor.push({ x: x + 30, y: oben - 22, w: 60, h: 3, color: 0x999999 });
    decor.push({ x: x + 30, y: oben - 10, w: 60, h: 3, color: 0x999999 });
};
const versorgungspunkt = (x, oben = BODEN) => {  // oben = y der Standfläche
    decor.push({ x: x, y: oben - 20, w: 70, h: 40, color: 0x5b4a2e });        // Kiste
    decor.push({ x: x, y: oben - 20, w: 24, h: 6, color: 0xdd3333 });         // rotes Kreuz
    decor.push({ x: x, y: oben - 20, w: 6, h: 24, color: 0xdd3333 });
    decor.push({ x: x, y: oben - 60, w: 6, h: 40, color: 0x555555 });         // Fahnenmast
    decor.push({ x: x + 16, y: oben - 72, w: 26, h: 14, color: 0xdd3333 });   // Fahne
    signs.push({ x: x, y: oben - 105, text: 'Versorgungspunkt' });
};

// Tunnelblock: ein fester Block, der auf dem TUNNELBODEN steht (Kisten, Stufen).
const tunnelblock = (links, hoehe, breite, farbe = 0x6b5b3a) =>
    platforms.push({ x: links + breite / 2, y: TUNNEL_BODEN - hoehe / 2, w: breite, h: hoehe, color: farbe });

// treppe: Stufen, die nach RECHTS ansteigen. Jede Stufe ist "stufe" Pixel höher als die vorige.
// Die Stufen sind dünne Platten (20 Pixel), keine massiven Blöcke: Darunter bleibt Platz,
// sodass man im Tunnel unter der Treppe hindurch weiter nach rechts gehen kann.
const treppe = (links, anzahl, breite, stufe) => {
    for (let i = 0; i < anzahl; i++) {
        const oben = TUNNEL_BODEN - (i + 1) * stufe;     // Oberkante dieser Stufe
        platforms.push({ x: links + i * breite + breite / 2, y: oben + 10, w: breite, h: 20, color: 0x5a4d3a });
    }
};

// dunkel: ein dunkles Rechteck als Hintergrund (Tunnelinneres), gezeichnet hinter allem.
const dunkel = (links, rechts, oben, unten, farbe = 0x14181b) =>
    decor.push({ x: (links + rechts) / 2, y: (oben + unten) / 2, w: rechts - links, h: unten - oben, color: farbe });

// kiste: ein fester Block auf dem Minenboden (Deckung). Angabe: linke Kante, Höhe, Breite.
const kiste = (links, hoehe, breite, boden = MINE_BODEN) =>
    platforms.push({ x: links + breite / 2, y: boden - hoehe / 2, w: breite, h: hoehe, color: 0x6b5b3a });
// lampe: eine Deckenlampe unter der Decke "decke" (y der Unterkante); die Szene malt einen Lichtkegel dazu.
const lampe = (x, decke) => {
    decor.push({ x: x, y: deckeBei(x, decke) + 8, w: 10, h: 8, color: 0xc9a94e });   // hängt an der tatsächlichen Decke
    lampen.push(x);
};
// stuetze: ein Holzpfosten vom Boden bis zur Decke (nur Dekoration).
const stuetze = (x, decke, boden) => {
    decor.push({ x: x, y: (decke + boden) / 2, w: 10, h: boden - decke, color: 0x6b4a2a });
    decor.push({ x: x + 4, y: (decke + boden) / 2, w: 3, h: boden - decke, color: 0x4a331d });
};
// schacht: ein senkrechter Schacht mit Holzabsätzen im Zickzack (alle 95 Pixel). Oben liegen zwei
// Bretter über dem Rand, dazwischen bleibt eine 80 Pixel breite Lücke zum Hinunterspringen.
// Von unten springt man von Absatz zu Absatz wieder hinauf (95 < 150 Sprunghöhe).
const schacht = (links, rechts) => {
    schwebend(links, BODEN, 90, HOLZ);
    schwebend(rechts - 90, BODEN, 90, HOLZ);
    leiter(links, rechts);
};

// leiter: Holzababsätze im Zickzack an den Wänden einer Schlucht (alle 95 Pixel), damit man wieder hinaufkommt.
function leiter(links, rechts, anzahl = 5) {
    for (let i = 1; i <= anzahl; i++) {
        const x0 = i % 2 === 1 ? links : rechts - 170;
        schwebend(x0, BODEN + 95 * i, 170, HOLZ);
        geruest.push({ x0, x1: x0 + 170, oben: BODEN + 95 * i, wand: i % 2 === 1 ? 'links' : 'rechts' });   // für Streben und Ketten
    }
}
// ---- EINE Blockgröße für das ganze Gelände: BLOCK = 32 Pixel ----
// Alle Hänge, Hügel und Klippen bestehen aus Stufen von 32 Pixel Breite und 32 Pixel Höhe (oder einem
// Vielfachen davon): etwa so breit wie der Spieler. Das ergibt kräftige Pixelblöcke, aber keine Kästen.
// Die Erdtextur selbst bleibt fein (8-Pixel-Kacheln).
const BLOCK = 32;

// Ein kleiner, wiederholbarer Zufallsgenerator (mulberry32): gleicher Startwert = gleiche Zahlenfolge.
// So sieht das Gelände bei jedem Start gleich aus, auch ohne Phaser.
const zufall = (seed) => {
    let a = seed | 0;
    return () => {
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
};

// Baut aus einer Liste von Höhen (eine pro Block-Spalte) das Gelände: gleich hohe Nachbarn werden zu einem
// unsichtbaren Stufenblock verschmolzen (nur zum Laufen). Die Optik malt buildHuegel (Effects.js).
// base = Höhe, auf der das Gelände steht (Standard: die Oberfläche; für einen Hang im Untergrund der Tunnelboden).
// unten = Unterkante der Blöcke: Ist sie höher als base, ist der Hang hohl (eine Kruste über einem Gang).
const gelaendeAusWerten = (links, werte, fels, base = BODEN, unten = base) => {
    const hohl = unten < base;
    if (hohl) for (let i = 0; i < werte.length; i++) werte[i] = Math.max(werte[i], (base - unten) + BLOCK);   // Kruste mindestens 1 Block dick
    const n = werte.length;
    let start = 0;
    for (let i = 1; i <= n; i++) {
        if (i === n || werte[i] !== werte[start]) {
            const h = werte[start];
            if (h > 0) {
                const oben = base - h, dicke = unten - oben;
                platforms.push({ x: links + (start + i) * BLOCK / 2, y: oben + dicke / 2, w: (i - start) * BLOCK, h: dicke, color: fels ? FELS : ERDE, kollision: true });
            }
            start = i;
        }
    }
    huegelformen.push({ links, breite: n * BLOCK, schritt: BLOCK, werte, fels, boden: base, unten: hohl ? unten : undefined });
};

// Macht aus glatten Höhen ein natürliches Gelände: Auf den Hängen kommen Zufallsabweichungen dazu (Buckel, Dellen,
// unterschiedlich lange Absätze), Kuppen und Plateaus bleiben exakt eben (dort stehen Gegner). Benachbarte Spalten
// unterscheiden sich höchstens um einen Block, damit man alles hinaufgehen kann. "rau" = Stärke (1 = normal).
const aufrauen = (glatt, flach, seed, rau = 1.4) => {
    const zu = zufall(seed);
    // Zufallsabweichung plus eine sanfte Welle: Hänge werden holprig und ungleichmäßig statt gleichmäßig gestuft
    const w = glatt.map((h, i) => flach[i] ? h : Math.max(0, Math.round((h + (zu() - 0.5) * 2 * BLOCK * 0.95 * rau + 22 * Math.sin(i * 0.9 + seed)) / BLOCK) * BLOCK));
    for (let i = 1; i < w.length; i++) if (!flach[i]) w[i] = Math.max(w[i - 1] - BLOCK, Math.min(w[i - 1] + BLOCK, w[i]));
    for (let i = w.length - 2; i >= 0; i--) if (!flach[i]) w[i] = Math.max(w[i + 1] - BLOCK, Math.min(w[i + 1] + BLOCK, w[i]));
    return w;
};

// gelaende: ein Gelände nach einer Linie. "punkte" = Liste von [x-Abstand ab links, Höhe]; dazwischen wird
// geradlinig verbunden, aufgeraut und auf ganze Blöcke (32) gerundet. Steigungen über 0,9 vermeiden!
// Waagerechte Strecken (gleiche Höhe an beiden Punkten) bleiben eben. material: 'erde' (mit Gras) oder 'fels'.
const gelaende = (links, punkte, material = 'erde', rau = 1.4, base = BODEN, unten = base) => {
    const n = Math.round(punkte[punkte.length - 1][0] / BLOCK);
    const glatt = [], flach = [];
    for (let i = 0; i < n; i++) {
        const dx = (i + 0.5) * BLOCK;
        let h = punkte[punkte.length - 1][1], eben = true;
        for (let k = 0; k < punkte.length - 1; k++) {
            const [x1, h1] = punkte[k], [x2, h2] = punkte[k + 1];
            if (dx >= x1 && dx <= x2) { h = h1 + (h2 - h1) * (dx - x1) / ((x2 - x1) || 1); eben = h1 === h2; break; }
        }
        glatt.push(eben ? h : h); flach.push(eben);
        if (eben) glatt[i] = Math.round(h / BLOCK) * BLOCK;
    }
    gelaendeAusWerten(links, aufrauen(glatt, flach, links, rau), material === 'fels', base, unten);
};

// sanfterHuegel: ein Hügel mit weichen, unregelmäßigen Hängen und flacher Kuppe (Höhe: Vielfaches von 32).
// Angabe: linke Kante, Breite, Höhe der Kuppe, Anteil der flachen Kuppe an der Breite (0 bis 1).
const sanfterHuegel = (links, breite, hoehe, plateau = 0.3) => {
    const n = Math.round(breite / BLOCK);
    const glatt = [], flach = [];
    for (let i = 0; i < n; i++) {
        const u = (i + 0.5) / n, rand = (1 - plateau) / 2;
        const v = u < rand ? u / rand : (u > 1 - rand ? (1 - u) / rand : 1);
        const h = hoehe * v * v * (3 - 2 * v);                       // weiche S-Kurve (Smoothstep)
        const eben = v >= 0.97;                                       // die Kuppe bleibt eben
        glatt.push(eben ? hoehe : h); flach.push(eben);
    }
    gelaendeAusWerten(links, aufrauen(glatt, flach, links), false);
};

// bodenBei: Die Höhe der Oberfläche (y) an der Stelle x, nachdem das Gelände dort gebaut wurde.
// Damit setzt man Gegenstände, Schilder und Deko genau auf den Boden eines Hügels.
const bodenBei = (x) => {
    for (const f of huegelformen) {
        if (f.boden !== BODEN) continue;                       // Hänge im Untergrund zählen nicht als Oberfläche
        const i = Math.floor((x - f.links) / f.schritt);
        if (i >= 0 && i < f.werte.length) return BODEN - f.werte[i];
    }
    return BODEN;
};

// felsnase: ein Felsbrocken (2 Blöcke hoch), der aus einer Schluchtwand ragt. richtung 1 = ragt nach rechts
// (Wand links), -1 = ragt nach links (Wand rechts). Macht senkrechte Wände unregelmäßig.
const felsnase = (wandX, y, breite, richtung = 1) =>
    platforms.push({ x: wandX + richtung * breite / 2, y: y + 32, w: breite, h: 64, color: FELS });

// ---- Unregelmäßige Höhlen: Decken und Böden aus Blöcken, nicht aus glatten Platten ----

// hoehlendecke: Eine Basisplatte bis "basis" und darunter herabhängende Felsblöcke (jeweils 0 bis maxStufen Blöcke
// tiefer). Wie tief die Decke an jeder Stelle hängt, folgt einem Zufallsweg, bei dem sich benachbarte Spalten um
// höchstens einen Block unterscheiden: So entstehen Vorsprünge, Nischen und Zacken statt einer glatten Linie.
// "frei" = Bereiche, in denen die Decke glatt bleiben muss (zum Beispiel direkt am Eingang, wo der Kopf des
// Spielers Platz braucht). "endeTief" = die letzten Spalten hängen ganz tief (die Höhle läuft aus).
const decken = [];
const hoehlendecke = (links, rechts, basis, maxStufen, seed, frei = [], endeTief = false) => {
    const n = Math.ceil((rechts - links) / BLOCK);
    const zu = zufall(seed);
    const ex = [];
    let e = 0;
    for (let i = 0; i < n; i++) {
        const x = links + i * BLOCK;
        const r = zu();
        if (r < 0.3 && e < maxStufen) e++;
        else if (r < 0.6 && e > 0) e--;
        let wert = e;
        if (endeTief && i >= n - 2) wert = maxStufen;
        if (frei.some(([a, b]) => x + BLOCK > a && x < b)) wert = 0;
        ex.push(wert);
    }
    erde(links, rechts, BODEN, basis);
    let start = 0;
    for (let i = 1; i <= n; i++) {
        if (i === n || ex[i] !== ex[start]) {
            if (ex[start] > 0) erde(links + start * BLOCK, Math.min(rechts, links + i * BLOCK), BODEN, basis + ex[start] * BLOCK);
            start = i;
        }
    }
    decken.push({ links, rechts, basis, ex });
};
// deckeBei: Die Unterkante der Höhlendecke (y) an der Stelle x. Lampen und Stützen richten sich danach.
const deckeBei = (x, vorgabe = BODEN + DECKE) => {
    for (const d of decken) {
        if (x >= d.links && x < d.rechts) return d.basis + d.ex[Math.min(d.ex.length - 1, Math.floor((x - d.links) / BLOCK))] * BLOCK;
    }
    return vorgabe;
};
// haufen: Ein Geröllhaufen auf dem Höhlenboden. "hoehen" = Höhe je 32-Pixel-Spalte, zum Beispiel [32, 64, 32].
// Die Blöcke reichen 32 Pixel in den Boden hinein (damit sie als dicke Blöcke zählen).
const haufen = (links, hoehen, boden = TUNNEL_BODEN) => {
    let start = 0;
    for (let i = 1; i <= hoehen.length; i++) {
        if (i === hoehen.length || hoehen[i] !== hoehen[start]) {
            if (hoehen[start] > 0) erde(links + start * BLOCK, links + i * BLOCK, boden - hoehen[start], boden + 32, FELS);
            start = i;
        }
    }
};
// aushoehlen: schneidet einen rechteckigen Hohlraum aus der Erde. Alle gewöhnlichen Erdblöcke, die ihn berühren,
// werden in Stücke zerteilt (links, rechts, darüber, darunter). So kann man Höhlen in die große Erde "graben".
const aushoehlen = (links, rechts, oben, unten) => {
    const neu = [];
    for (let i = platforms.length - 1; i >= 0; i--) {
        const p = platforms[i];
        if (p.color !== 0x4b3b2a || p.brechbar) continue;
        const l = p.x - p.w / 2, r = p.x + p.w / 2, o = p.y - p.h / 2, u = p.y + p.h / 2;
        if (r <= links || l >= rechts || u <= oben || o >= unten) continue;      // berührt den Hohlraum nicht
        platforms.splice(i, 1);
        const stueck = (a, b, c, d) => { if (b - a > 0 && d - c > 0) neu.push({ x: (a + b) / 2, y: (c + d) / 2, w: b - a, h: d - c, color: 0x4b3b2a }); };
        const ml = Math.max(l, links), mr = Math.min(r, rechts);
        stueck(l, ml, o, u);                       // links vom Hohlraum
        stueck(mr, r, o, u);                       // rechts davon
        stueck(ml, mr, o, Math.min(u, oben));      // darüber
        stueck(ml, mr, Math.max(o, unten), u);     // darunter
    }
    platforms.push(...neu);
};

// hoehlenform: gräbt eine Höhle aus und gibt ihr eine unregelmäßige Form: Von der Decke hängen Felsblöcke (bis zu
// maxDecke Blöcke tief), am Boden liegen kleine Geröllhaufen (bis maxBoden Blöcke hoch). In einer Spalte gibt es nie
// beides, damit man immer durchkommt. "frei" = Bereiche ohne Zacken (unter Schächten, in Räumen, auf Podesten).
const hoehlenform = (links, rechts, oben, unten, seed, frei = [], maxDecke = 2, maxBoden = 1, freiBoden = []) => {
    aushoehlen(links, rechts, oben, unten);
    const n = Math.ceil((rechts - links) / BLOCK), zu = zufall(seed);
    const dec = [], bod = [];
    let e = 0, f = 0;
    for (let i = 0; i < n; i++) {
        const x = links + i * BLOCK;
        const r = zu(), r2 = zu();
        if (r < 0.28 && e < maxDecke) e++; else if (r < 0.58 && e > 0) e--;
        if (r2 < 0.2 && f < maxBoden) f++; else if (r2 < 0.55 && f > 0) f--;
        let a = e, b = f;
        if (frei.some(([p, q]) => x + BLOCK > p && x < q)) { a = 0; b = 0; }
        if (freiBoden.some(([p, q]) => x + BLOCK > p && x < q)) b = 0;   // dort stehen Gegner oder liegt Beute
        if (a > 0 && b > 0) b = 0;
        dec.push(a); bod.push(b);
    }
    for (const [liste, deckeSeite] of [[dec, true], [bod, false]]) {
        let start = 0;
        for (let i = 1; i <= n; i++) {
            if (i === n || liste[i] !== liste[start]) {
                const k = liste[start];
                if (k > 0) {
                    const x0 = links + start * BLOCK, x1 = Math.min(rechts, links + i * BLOCK);
                    if (deckeSeite) erde(x0, x1, oben - BLOCK, oben + k * BLOCK);     // reicht in die Decke hinein (damit es als Erde gemalt wird)
                    else erde(x0, x1, unten - k * BLOCK, unten + 32, FELS);
                }
                start = i;
            }
        }
    }
    const deckeAn = (x) => oben + dec[Math.max(0, Math.min(n - 1, Math.floor((x - links) / BLOCK)))] * BLOCK;
    return { deckeAn };
};
// hoehlenlampe: eine Lampe an der Decke einer solchen Höhle (leuchtet nur in dieser Höhle).
const hoehlenlampe = (form, x) => {
    const y = form.deckeAn(x);
    decor.push({ x, y: y + 8, w: 10, h: 8, color: 0xc9a94e });
    lampen.push({ x, y: y + 20 });
};

// Die Höhlendecken (siehe die Zonen T und K)
hoehlendecke(EINGANG, TUNNEL_ENDE, BODEN + DECKE, 2, 11, [[EINGANG, 3250]]);               // Tunnel (am Eingang glatt)
hoehlendecke(KRATER_ENDE, VERLIES_ENDE, BODEN + DECKE, 2, 12, [], true);                    // Waffenkammer, läuft zum Ende tief aus
hoehlendecke(MINE_L + 260, CHASM_L, MINE_DECKE, 2, 13);                                     // Minengang links der Schlucht
hoehlendecke(CHASM_R, KAV_R, KAV_DECKE, 1, 14);                                             // Kaverne
hoehlendecke(KAV_R, SCHACHT2_L, MINE_DECKE, 2, 15);                                         // Minengang rechts der Kaverne
haufen(3156, [32, 64, 32]);                                                                 // Geröll am Fuß des Eingangs
haufen(7632, [32, 64, 32], MINE_BODEN);                                                     // Geröll, wo der Förderschacht in den Gang mündet

// =====================================================================
// Taktische Bauteile (Broforce-Stil): Leitern, zerstörbare Deckung, Türme, die einstürzen
// =====================================================================
// sprossenleiter: eine Leiter. x = Mitte, oben/unten = y der Enden. seite = in welche Richtung die Plattform am oberen
// Ende liegt (1 = rechts, -1 = links). ausX = so weit neben der Leiter steht man nach dem Ausstieg. Gegner klettern nicht:
// Wer eine Leiter nimmt, kommt also von der Seite oder von oben an sie heran.
const sprossenleiter = (x, oben, unten, seite = 1, art = 'holz', ausX = 22) => leitern.push({ x, oben, unten, seite, art, ausX });

// bauteil: ein zerstörbarer Block. art = 'holz', 'sand' (Sandsäcke), 'beton' oder 'kiste'. hp = Treffer bis zum Bruch
// (Explosionen zerstören jedes Bauteil sofort). gruppe + rolle: Fallen alle "stuetze"-Teile einer Gruppe weg,
// stürzen alle "boden"-Teile derselben Gruppe ein. deckung = auch Gegnerkugeln beschädigen es.
const bauteil = (links, rechts, oben, unten, art, hp, extra = {}) =>
    platforms.push({ x: (links + rechts) / 2, y: (oben + unten) / 2, w: rechts - links, h: unten - oben, brechbar: true, hp, art,
        color: { holz: 0x7a5a2e, sand: 0xb59f6a, beton: 0x7d8185, kiste: 0x7a6540 }[art], ...extra });

// deckung: Sandsäcke oder Kisten auf dem Boden (Standard: Boden an dieser Stelle). Sie halten ein paar Treffer aus, dann sind sie weg.
const deckung = (links, art, breite, hoehe, boden = bodenBei(links + breite / 2)) =>
    bauteil(links, links + breite, boden - hoehe, boden, art, { sand: 5, kiste: 3, beton: 9, holz: 4 }[art] ?? 4, { deckung: true });

// wachturm: Holzturm mit zwei Stützen, Plattform (140 breit), Sandsäcken als Brustwehr und einer Leiter an einer Seite
// (ladeSeite: 1 = Leiter rechts, -1 = links). Schießt man EINE Stütze weg (oder jagt ein Fass daneben hoch), stürzt er ein.
// Gibt die y-Höhe der Plattform zurück. Gegner stellt man danach selbst darauf.
const wachturm = (x, hoehe, ladeSeite = 1) => {
    const gruppe = `turm${x}`;
    const bl = bodenBei(x - 52), br = bodenBei(x + 52);
    const oben = Math.min(bl, br) - hoehe;
    bauteil(x - 63, x - 41, oben + 20, bl, 'holz', 5, { gruppe, rolle: 'stuetze' });
    bauteil(x + 41, x + 63, oben + 20, br, 'holz', 5, { gruppe, rolle: 'stuetze' });
    bauteil(x - 70, x + 70, oben, oben + 20, 'holz', 9999, { gruppe, rolle: 'boden' });
    bauteil(Math.min(x - ladeSeite * 70, x - ladeSeite * 30), Math.max(x - ladeSeite * 70, x - ladeSeite * 30), oben - 28, oben, 'sand', 4, { deckung: true });      // Sandsäcke an der Seite ohne Leiter
    const lx = x + ladeSeite * 92;
    sprossenleiter(lx, oben, bodenBei(lx), -ladeSeite, 'holz', 30);
    return oben;
};

// =====================================================================
// ZONE A: Einstieg (x 0 bis 1400). Ruhig, mit niedrigen Hindernissen zum Üben.
// =====================================================================
// Der Einstieg ist kein flacher Boden mehr, sondern ein Auf und Ab: Startfläche, ein Hügel mit Sandsack-Deckung,
// eine Senke mit Wrack und Mauer, dann ein zweiter Hügel mit dem ersten Gegner. (Plateaus bleiben eben.)
gelaende(0, [[0, 0], [224, 0], [352, 96], [576, 96], [704, 0], [960, 0], [1088, 96], [1312, 96], [1440, 0]]);
signs.push({ x: 150, y: BODEN - 80, text: 'A / D: Laufen\nLeertaste: Springen\nR: Nachladen\nH: Verbandskasten benutzen' });
munition(180);                                   // früh: Einsammeln üben
stacheldraht(40);                                // nur Dekoration, am Start
huegel(392, 126, 96, SAND);                      // Sandsäcke auf dem ersten Hügel (30 über der Kuppe)
huegel(488, 156, 64, SAND);                      // Sandsäcke, höher (60 über der Kuppe)
huegel(692, 64, 64, SAND);                       // Sandsack-Barrikade in der Senke
wrack(764, 60, 216);                             // ausgebranntes Panzerfahrzeug (begehbar, Oberkante 60)
signs.push({ x: 1000, y: BODEN - 130, text: 'Maus: Zielen\nLinke Taste: Schießen' });
nahkaempfer(1200, 1104, 1296, 3, BODEN - 96);    // der erste Gegner, oben auf dem zweiten Hügel
nahkaempfer(870, 800, 940, 3, BODEN - 60);       // ein Wächter auf dem Dach des Wracks

// =====================================================================
// ZONE B: Ruine mit zwei Etagen (x 1450 bis 2300).
// Oben (Deck) kämpft ein Schütze, darunter patrouilliert ein Nahkämpfer.
// =====================================================================
gelaende(1472, [[0, 0], [64, 64], [128, 64]], 'fels');   // Schutthang, über den man zum Deck der Ruine hinaufsteigt (statt eines einzelnen Betonblocks)
hoehlen.push({ links: 1585, rechts: 2135, oben: BODEN - 330, unten: BODEN, art: 'gebaeude', etagen: [140, 240] });   // Rückwand der Ruine
schwebend(1600, BODEN - 140, 360);                       // Deck (Oberkante 360), x 1600 bis 1960
schwebend(2010, BODEN - 240, 110);                       // kleines Versteck darüber (Oberkante 260)
skelett(1780, 1660, 1900, 3, BODEN - 140);          // Schütze auf dem Deck
nahkaempfer(1800, 1650, 1930, 4);                // Nahkämpfer darunter
heilung(2065, BODEN - 240);                              // versteckte Heilung im Versteck
nahkaempfer(2170, 2080, 2250, 3);
sprossenleiter(1988, BODEN - 240, BODEN, 1, 'holz', 28);      // Leiter vom Boden zum Versteck (Oberkante 520)
signs.push({ x: 1925, y: BODEN - 95, text: 'Leitern:\nW / S oder\nPfeiltasten' });

// =====================================================================
// ZONE C: Versorgungspunkt 1 (x 2450 bis 2750). Ruhig, ein Atemzug.
// =====================================================================
gelaende(2304, [[0, 0], [128, 128], [288, 128], [292, 32], [416, 32]]);   // ein Hügel (128 hoch) mit einer Klippe zur Höhle hin
versorgungspunkt(2500, BODEN - 128);
heilung(2455, BODEN - 128);
munition(2548, BODEN - 128);
granate(1850, BODEN - 140);                     // im Versteck der Ruine

// =====================================================================
// ZONE T: Tunnel unter der Erde (x 2740 bis 4220). Ein ALTERNATIVWEG unter Zone D.
// Zwei Schächte (Löcher im Boden) führen hinunter. Unten ist ein dunkler Gang mit Deckung,
// drei Gegnern und Beute. Wer unten bleibt, umgeht die Schützen auf den Terrassen.
// Aus dem Tunnel kommt man über Stufen wieder hinauf (je Schacht 3 Stufen à 77 Pixel).
// =====================================================================
signs.push({ x: 2700, y: BODEN - 70, text: 'Alternative:\nein Höhleneingang\nführt unter die Erde' });
// ---- Der Höhleneingang: ein Graben mit Stufen führt zu einem Felsüberhang ----
// Statt eines Lochs im Boden geht man in einem offenen Graben (x 2740 bis 2940) über einen felsigen Abstieg
// hinab und betritt dann den Tunnel, dessen Felsdecke am Eingang (x 2940) beginnt.
// Über dem Eingang ragt eine Felsstufe auf; vom Rand der Oberfläche führt eine Sprungstrecke von
// 200 Pixeln über den Graben (möglich bis ca. 280).
// Ein natürlicher, felsiger Abstieg: unterschiedlich breite und hohe Absätze, eine Plattform zum Verschnaufen,
// eine Kante, an der man hinunterspringt, und Felsbrocken. Statt gleichmäßiger Stufen wirkt es wie gewachsener Fels.
//             von    bis   Oberkante
const abstieg = [[2740, 2804, 792],    // erste Kante, 32 unter der Oberfläche
                 [2804, 2836, 824],    // kleiner Absatz
                 [2836, 2868, 856],    // Absatz
                 [2868, 2932, 888],    // Plattform zum Verschnaufen (64 breit)
                 [2932, 2996, 920],    // hier beginnt die Felsdecke (x 2940)
                 [2996, 3060, 952],
                 [3060, 3092, 984],
                 [3092, 3156, 1016]];  // letzte Stufe, danach der Tunnelboden (1048)
// Wichtig: Der Boden muss schon vor dem Eingang (Decke ab x 2940, Unterkante 820) auf mindestens 868 abgesunken
// sein, sonst stößt der Kopf des Spielers (48 hoch) an die Deckenkante. Hier ist das ab x 2868 der Fall (888).
for (const [von, bis, oben] of abstieg) erde(von, bis, oben, TUNNEL_BODEN + 60, FELS);
hoehlen.push({ links: TUNNEL_LINKS, rechts: EINGANG, oben: BODEN, unten: TUNNEL_BODEN, art: 'offen' });                 // Graben
hoehlen.push({ links: EINGANG, rechts: TUNNEL_ENDE, oben: BODEN + DECKE, unten: TUNNEL_BODEN, art: 'tunnel', licht: 'links' });  // Mund und Gang
lampen.push(EINGANG + 70);
// Holzstützen und Deckenbalken im Eingangsbereich
for (const sx of [EINGANG + 8, 3110, 3290, 3440]) {
    decor.push({ x: sx, y: (BODEN + DECKE + TUNNEL_BODEN) / 2, w: 10, h: TUNNEL_BODEN - BODEN - DECKE, color: 0x6b4a2a });
    decor.push({ x: sx + 4, y: (BODEN + DECKE + TUNNEL_BODEN) / 2, w: 3, h: TUNNEL_BODEN - BODEN - DECKE, color: 0x4a331d });
}
// Felszähne an der Decke (Stufen, die nach unten schmaler werden) und hängende Ranken
const zapfen = (x, n) => { for (let k = 0; k < n; k++) decor.push({ x: x, y: BODEN + DECKE + 3 + k * 6, w: 18 - k * 5, h: 6, color: 0x4a423a }); };
[22, 62, 104, 146].forEach((d, i) => zapfen(EINGANG + d, 3 - (i % 2)));
[12, 44, 84, 124].forEach((d, i) => decor.push({ x: EINGANG + d, y: BODEN + DECKE + 6 + i * 2, w: 4, h: 12 + i * 4, color: 0x3b5a22 }));
// Lampe am Eingang mit schwachem Lichtschein
decor.push({ x: EINGANG + 70, y: BODEN + DECKE + 52, w: 80, h: 50, color: 0x27261c });
decor.push({ x: EINGANG + 70, y: BODEN + DECKE + 12, w: 2, h: 24, color: 0x222222 });
decor.push({ x: EINGANG + 70, y: BODEN + DECKE + 30, w: 12, h: 9, color: 0xffd866 });
// Reste einer eingestürzten Holzbrücke an beiden Grabenrändern
decor.push({ x: 2756, y: BODEN + 6, w: 32, h: 8, color: 0x6b4a2a });
decor.push({ x: 2776, y: BODEN + 22, w: 8, h: 22, color: 0x4a331d });
decor.push({ x: EINGANG - 16, y: BODEN + 6, w: 32, h: 8, color: 0x6b4a2a });
decor.push({ x: EINGANG - 10, y: BODEN + 20, w: 8, h: 18, color: 0x4a331d });
// Warnschild im Graben und Geröll auf den Stufen
// Schienen mit Grubenwagen am Fuß der Treppe (Dekoration): zeigt, dass hier einmal Erz gefördert wurde
decor.push({ x: 3200, y: TUNNEL_BODEN - 3, w: 300, h: 4, color: 0x77746e });                  // Schienen
for (let sx = 3060; sx < 3350; sx += 26) decor.push({ x: sx, y: TUNNEL_BODEN - 1, w: 6, h: 8, color: 0x5a3d22 });   // Schwellen
decor.push({ x: 3250, y: TUNNEL_BODEN - 26, w: 50, h: 24, color: 0x6b3a22 });                 // Wagenkasten
decor.push({ x: 3250, y: TUNNEL_BODEN - 40, w: 56, h: 5, color: 0x4a2a18 });                  // Rand des Wagens
decor.push({ x: 3238, y: TUNNEL_BODEN - 8, w: 11, h: 11, color: 0x222222 });                  // Räder
decor.push({ x: 3264, y: TUNNEL_BODEN - 8, w: 11, h: 11, color: 0x222222 });
decor.push({ x: 3240, y: TUNNEL_BODEN - 44, w: 16, h: 8, color: 0x8c8474 });                  // Gesteinsbrocken im Wagen
decor.push({ x: 3262, y: TUNNEL_BODEN - 46, w: 12, h: 10, color: 0x77716a });
// Felsbrocken und Geröll auf dem Abstieg (Dekoration)
for (const [bx, by, bw, bh] of [[2820, 824, 22, 14], [2900, 888, 30, 18], [2970, 920, 26, 16], [3075, 984, 22, 14], [2760, 792, 20, 12]]) {
    decor.push({ x: bx, y: by - bh / 2, w: bw, h: bh, color: 0x77716a });
    decor.push({ x: bx - bw / 4, y: by - bh * 0.8, w: bw / 2, h: bh / 2, color: 0x948c7c });
}
signs.push({ x: 2870, y: 806, text: 'EINSTURZ-\nGEFAHR' });
// ---- Der Ausgang des Tunnels: ein Einsturzkrater mit einem natürlichen Berghang nach oben ----
// Am Ende des Tunnels ist die Decke eingestürzt (x 3900 bis 4348): Von dort führt ein Hang aus Erdreich
// zur Oberfläche. Es gibt hier nichts Künstliches mehr: keine Träger, keine Platten. Wer oben über den Hügel kommt,
// springt einfach in den Krater und steigt auf der anderen Seite den Hang wieder hinauf.
// Unter dem Hang liegt ein verschütteter Gang zur Waffenkammer. Sein Eingang ist von einem Felssturz zugeschüttet:
// einer breiten Füllung aus zerstörbaren Erdblöcken. Man muss sich mit Schüssen hindurchgraben (oder eine Granate
// benutzen). Wer das nicht tut, springt auf den Haufen (bis 96 hoch) und geht den Hang hinauf nach draußen.
hoehlen.push({ links: TUNNEL_ENDE, rechts: KRATER_ENDE, oben: BODEN, unten: TUNNEL_BODEN, art: 'offen' });   // Krater: Himmel scheint herein
gelaende(4060, [[0, 128], [64, 128], [256, 288], [288, 288]], 'erde', 0.8, TUNNEL_BODEN, TUNNEL_BODEN - 96);   // der Hang: oben die Kruste, darunter 96 Platz für den Gang
// Der Felssturz: eine breite Füllung aus zerstörbaren Erdblöcken (je 32 mal 32), insgesamt 7 Spalten (224 Pixel).
// Die drei vorderen Spalten liegen unter freiem Himmel und sind niedriger (64 bis 96, wie ein Schutthaufen, je Block
// 2 Treffer). Die vier hinteren füllen den ganzen Gang unter dem Hang aus (96 hoch, je Block 1 Treffer).
// Um hindurchzukommen, muss man mindestens die beiden unteren Reihen jeder Spalte wegschießen: etwa 14 Blöcke.
const sturzSpalten = [[3964, 2, 2], [3996, 2, 2], [4028, 3, 2], [4060, 3, 1], [4092, 3, 1], [4124, 3, 1], [4156, 3, 1]];   // [x, Reihen, Treffer]
for (const [bx, reihen, treffer] of sturzSpalten) {
    for (let r = 0; r < reihen; r++) {
        platforms.push({ x: bx + 16, y: TUNNEL_BODEN - 16 - r * 32, w: 32, h: 32, color: 0x7a5a3c, brechbar: true, hp: treffer, gruppe: 'sturz' });
    }
}
for (let x = 3150; x < VERLIES_ENDE - 40; x += 250) {
    if (x > TUNNEL_ENDE - 20 && x < 4440) continue;                                      // im Krater und im Gang unter dem Hang hängen keine Lampen
    decor.push({ x: x, y: deckeBei(x) + 8, w: 10, h: 8, color: 0xc9a94e });          // Deckenlampen (an der echten Decke)
    lampen.push(x);
}
tunnelblock(3500, 40, 80);                             // Kiste A als Deckung (x 3500 bis 3580)
tunnelblock(3720, 60, 80);                             // Kiste B als Deckung (x 3720 bis 3800)
// (Hier am Eingang des Gangs öffnet sich jetzt der Wartungsschacht zur Tiefen Galerie, siehe ZONE S.)
skelett(3655, 3612, 3690, 3, TUNNEL_BODEN);       // Schütze zwischen den Kisten
nahkaempfer(3880, 3830, 3940, 4, TUNNEL_BODEN);        // Nahkämpfer vor dem Ausgang
munition(3760, TUNNEL_BODEN - 60);                     // Beute auf Kiste B

// ---- Die Waffenkammer hinter der brüchigen Wand (x 4060 bis 4780) ----
// Wer die brüchige Erdwand durchschießt und dem Gang unter dem Hang folgt, findet ein verlassenes Lager:
// ein SCHWERER WÄCHTER (8 Lebenspunkte), Heilung, Munition und das STURMGEWEHR.
hoehlen.push({ links: 4060, rechts: VERLIES_ENDE, oben: BODEN + DECKE, unten: TUNNEL_BODEN, art: 'lager' });     // Gang unter dem Hang und Raum der Kammer
signs.push({ x: 4490, y: TUNNEL_BODEN - 150, text: 'Lager 7\n"Aufgegeben. Sie kamen von unten."' });
decor.push({ x: 4440, y: TUNNEL_BODEN - 70, w: 44, h: 32, color: 0x1d5a3a });           // Terminal (Bildschirm)
decor.push({ x: 4440, y: TUNNEL_BODEN - 45, w: 8, h: 18, color: 0x333333 });            // Terminal (Ständer)
decor.push({ x: 4440, y: TUNNEL_BODEN - 30, w: 70, h: 8, color: 0x55482f });            // Tisch
decor.push({ x: 4690, y: TUNNEL_BODEN - 80, w: 6, h: 80, color: 0x3a4046 });            // Waffenregal (Pfosten)
decor.push({ x: 4750, y: TUNNEL_BODEN - 80, w: 6, h: 80, color: 0x3a4046 });
decor.push({ x: 4720, y: TUNNEL_BODEN - 100, w: 66, h: 5, color: 0x3a4046 });           // Waffenregal (Brett)
tunnelblock(4640, 50, 100);                                    // Tisch mit dem Gewehr (x 4640 bis 4740)
nahkaempfer(4540, 4490, 4600, 8, TUNNEL_BODEN);                // der schwere Wächter
heilung(4400, TUNNEL_BODEN);
munition(4520, TUNNEL_BODEN);
waffe(4690, TUNNEL_BODEN - 50);                                // das Sturmgewehr auf dem Tisch

// =====================================================================
// ZONE S: Die Tiefe Galerie (x 3000 bis 4380, y 1144 bis 1336). Unter dem Tunnel liegt ein zweiter, tieferer Gang.
// Man kommt durch den Wartungsschacht im Tunnelboden (x 3290 bis 3470) hinein und klettert über zwei Holzabsätze wieder
// hinaus. Westlich liegt ein Vorratsraum, östlich ein langer Gang mit Deckung und am Ende die Waffenkammer 2:
// Dort bewacht ein schwerer Wächter das SCHWERT (Nahkampfwaffe, Taste 2).
// =====================================================================
const GAL_O = 1144;             // Unterkante der Basisdecke der Galerie
const GAL_B = 1336;             // Boden der Galerie (288 unter dem Tunnelboden; 96 = Abstand der Absätze im Schacht)
const SCH2_L = 3290, SCH2_R = 3470;
const galerie = hoehlenform(3000, 4380, GAL_O, GAL_B, 21, [[SCH2_L - 40, SCH2_R + 40], [4060, 4380]], 2, 1,
    [[3040, 3290], [3470, 3560], [3640, 3830], [3840, 4050]]);   // Gegner- und Beutebereiche bleiben am Boden frei
aushoehlen(SCH2_L, SCH2_R, TUNNEL_BODEN, GAL_O);                  // der Schacht durch die Decke
schwebend(SCH2_L, GAL_B - 96, 90, HOLZ);                          // Absatz 1 (links, Oberkante 1240)
schwebend(SCH2_R - 90, GAL_B - 192, 90, HOLZ);                    // Absatz 2 (rechts, Oberkante 1144); von hier springt man auf den Tunnelboden
geruest.push({ x0: SCH2_L, x1: SCH2_L + 90, oben: GAL_B - 96, wand: 'links' });
geruest.push({ x0: SCH2_R - 90, x1: SCH2_R, oben: GAL_B - 192, wand: 'rechts' });
erde(4060, 4092, GAL_O, GAL_O + 64);                              // Türsturz vor der Waffenkammer
hoehlen.push({ links: SCH2_L, rechts: SCH2_R, oben: TUNNEL_BODEN, unten: GAL_B, art: 'schacht', eigeneLampen: true });
hoehlen.push({ links: 3000, rechts: SCH2_L, oben: GAL_O, unten: GAL_B, art: 'tunnel', eigeneLampen: true });
hoehlen.push({ links: SCH2_R, rechts: 4060, oben: GAL_O, unten: GAL_B, art: 'tunnel', eigeneLampen: true });
hoehlen.push({ links: 4060, rechts: 4380, oben: GAL_O, unten: GAL_B, art: 'lager', regale: false, eigeneLampen: true });
[3100, 3640, 3880, 4180, 4320].forEach(x => hoehlenlampe(galerie, x));
signs.push({ x: 3380, y: TUNNEL_BODEN - 100, text: 'Wartungsschacht\n(führt in die Tiefe)' });
signs.push({ x: 4180, y: GAL_B - 150, text: 'Waffenkammer 2\n"Für den Nahkampf, wenn\ndie Munition ausgeht."' });
// Vorratsraum im Westen
heilung(3070, GAL_B);
munition(3130, GAL_B);
granate(3190, GAL_B);
nahkaempfer(3170, 3080, 3250, 4, GAL_B);                          // bewacht den Vorrat
// langer Gang im Osten
kiste(3560, 50, 80, GAL_B);
munition(3600, GAL_B - 50);
skelett(3730, 3680, 3800, 3, GAL_B);
fass(3830, GAL_B);
nahkaempfer(3940, 3870, 4020, 4, GAL_B);
// Waffenkammer 2
heilung(4120, GAL_B);
nahkaempfer(4190, 4130, 4260, 8, GAL_B);                          // der schwere Wächter
kiste(4300, 44, 60, GAL_B);                                       // Sockel
schwert(4330, GAL_B - 44);                                        // das Schwert

// =====================================================================
// ZONE D: Der Hügel über der Höhle (x 2940 bis 3770). Die Höhle ist in diesen Hügel hineingegraben: Der Eingang
// liegt an seinem Fuß (x 2940), der Hang steigt über Absätze zum Gipfel (192) und fällt auf der anderen Seite ab.
// Auf den Absätzen sitzen Schützen, auf dem Gipfel wartet ein Nahkämpfer mit Munition.
// =====================================================================
signs.push({ x: 3000, y: BODEN - 170, text: 'Gefahr voraus:\nSchützen am Hang' });
// Der Bergrücken: vier Absätze (96, 224, 352 und eine Klippe zurück auf 192), dann fällt er steil zum Krater ab.
// Zwischen den Absätzen liegen Hänge (Steigung etwa 1:1) und eine echte Felswand (die Klippe auf der Ostseite).
gelaende(EINGANG, [[0, 0], [128, 96], [224, 96], [352, 224], [448, 224], [576, 352], [672, 352], [676, 192], [768, 192]]);
fernkaempfer(3116, 3084, 3148, 3, BODEN - 96);           // Schütze auf dem ersten Absatz
nahkaempfer(3340, 3308, 3372, 4, BODEN - 224);           // Nahkämpfer auf dem zweiten Absatz
skelett(3548, 3534, 3562, 3, BODEN - 352);               // Scharfschütze auf dem Gipfel (352 hoch)
munition(3592, BODEN - 352);                             // Belohnung auf dem Gipfel
fernkaempfer(3662, 3634, 3690, 3, BODEN - 192);          // Schütze auf dem Absatz hinter der Klippe
sprossenleiter(3634, BODEN - 352, BODEN - 192, -1, 'holz', 28);   // Leiter: vom Absatz hinter der Klippe zurück auf den Gipfel
{
    const oben = wachturm(3830, 190, -1);                    // Wachturm am Rand des Kraters: sein Schütze deckt den Abstieg in die Tiefe
    skelett(3835, 3800, 3860, 4, oben);
}

// =====================================================================
// ZONE E: Bunkerhügel (x 4290 bis 4870) und offenes Feld mit Hügeln (x 4900 bis 5600).
// Der Bunker ist kein Betonklotz mehr, sondern ein gestufter Felshügel aus 32er-Blöcken (wie die Höhle):
// Ein begrünter Erdwall mit einem Bunker obenauf: Rampe, Absatz (64), Rampe, Absatz (128), Rampe, Dach (192).
// Hinter dem Dach geht es über einen Absatz (96) hinab, damit man auch zurück hinaufkommt (mehr als 150 springt niemand).
// =====================================================================
signs.push({ x: 4300, y: BODEN - 130, text: 'Bunker voraus:\nGegner auf mehreren Absätzen' });
// Der Erdwall ist jetzt ein richtiger Berg: Absätze auf 96, 192 und 288, oben der Bunker (Dach 336 hoch), dahinter eine Felswand
// hinunter auf einen Absatz (128). Eine Leiter führt von dort zurück aufs Dach.
gelaende(4290, [[0, 0], [96, 96], [192, 96], [288, 192], [384, 192], [480, 288], [576, 288], [580, 128], [640, 128]]);
huegel(4770, 336, 96, BUNKER);                               // der Betonbunker auf dem Berg (Oberkante 336)
sprossenleiter(4888, BODEN - 336, BODEN - 128, -1, 'holz', 28);
nahkaempfer(4434, 4402, 4466, 4, BODEN - 96);                // Nahkämpfer auf dem ersten Absatz
fernkaempfer(4626, 4594, 4658, 4, BODEN - 192);              // Schütze auf dem zweiten Absatz
skelett(4818, 4786, 4850, 4, BODEN - 336);              // Scharfschütze auf dem Bunkerdach
// Wichtig: Die Patrouille muss zu den ebenen Flächen passen. Ein Gegner hat 32 Pixel Breite,
// also reicht er 16 Pixel über seine Grenzen hinaus. Sonst stößt er an die nächste Stufe.
munition(4800, BODEN - 336);                                 // Belohnung auf dem Bunkerdach
granate(6700, BODEN - 300);                     // im Hochhaus (Etage 4)
// Das Feld: zwei Hügel mit einer Senke dazwischen
gelaende(4900, [[0, 0], [128, 64], [256, 64], [352, 0], [704, 0]]);   // ein Hügel, danach eben bis zum Einsturzloch (ZONE Q)
nahkaempfer(5090, 5044, 5136, 3, BODEN - 64);                // auf dem ersten Hügel
nahkaempfer(5285, 5262, 5300, 3);                            // in der Senke, vor dem Einsturzloch
stacheldraht(5262);                                          // nur Dekoration in der Senke

// =====================================================================
// ZONE F: Versorgungspunkt 2 (x 5700 bis 6000).
// =====================================================================
gelaende(5600, [[0, 0], [96, 64], [352, 64], [480, 0]]);       // Anhöhe für den zweiten Versorgungspunkt
versorgungspunkt(5850, BODEN - 64);
heilung(5810, BODEN - 64);
munition(5890, BODEN - 64);

// =====================================================================
// ZONE G: Hochhaus-Ruine (x 6100 bis 7300). Das Gebäude hat sechs Etagen, jede 100 Pixel höher.
// Die Etagen sind im ZICKZACK angeordnet: Auf jeder Etage gibt es eine 120 Pixel breite Lücke
// in der Decke, abwechselnd rechts und links. Man springt durch die Lücke auf die nächste Etage.
//   ungerade Etagen (1, 3, 5): x 6400 bis 6780, Lücke rechts
//   gerade Etagen   (2, 4, 6): x 6520 bis 6900, Lücke links
// Von der 4. Etage führt eine Skybridge nach rechts, ein Abkürzungsweg über den Bodenkämpfen.
// =====================================================================
signs.push({ x: 6060, y: BODEN - 110, text: 'Hochhaus-Ruine:\nGegner auf jeder Etage' });
hoehlen.push({ links: 6380, rechts: 6920, oben: BODEN - 660, unten: BODEN, art: 'gebaeude', etagen: [100, 200, 300, 400, 500, 600] });   // Rückwand des Hochhauses
for (let etage = 1; etage <= 6; etage++) {
    const links = etage % 2 === 1 ? 6400 : 6520;                         // ungerade links, gerade rechts
    schwebend(links, BODEN - 100 * etage, 380);                          // 380 breit, Oberkante = Etagenhöhe
}
hoehlen.push({ links: 7060, rechts: 7260, oben: BODEN - 440, unten: BODEN, art: 'gebaeude', etagen: [400] });   // Gebäuderest am Ende der Skybridge
schwebend(6900, BODEN - 400, 250);                                       // Skybridge (Oberkante wie Etage 4)
// Feuerleiter an der Westseite: vom Boden zu den Etagen 1, 3 und 5
sprossenleiter(6378, BODEN - 100, BODEN, 1, 'stahl', 30);
sprossenleiter(6378, BODEN - 300, BODEN - 100, 1, 'stahl', 30);
sprossenleiter(6378, BODEN - 500, BODEN - 300, 1, 'stahl', 30);

nahkaempfer(6445, 6400, 6480, 4);                                        // am Eingang, unter der ersten Etage
nahkaempfer(6590, 6430, 6750, 4, BODEN - 100);                           // Etage 1
fernkaempfer(6700, 6600, 6820, 3, BODEN - 200);                          // Etage 2
nahkaempfer(6590, 6430, 6750, 4, BODEN - 300);                           // Etage 3
fernkaempfer(6700, 6600, 6820, 3, BODEN - 400);                          // Etage 4
fernkaempfer(6590, 6500, 6680, 3, BODEN - 500);                          // Etage 5
fernkaempfer(6780, 6700, 6860, 5, BODEN - 600);                          // Scharfschütze auf dem Dach
fernkaempfer(7050, 6960, 7110, 3, BODEN - 400);                          // auf der Skybridge
nahkaempfer(7200, 7150, 7260, 4);                                        // am Boden, rechts (hinter den Brückenpfeilern)

heilung(6430, BODEN - 300);                                              // Belohnung auf Etage 3 (linkes Ende)
munition(6430, BODEN - 500);                                             // Belohnung auf Etage 5 (linkes Ende)

// =====================================================================
// ZONE Q: Die Katakomben (x 4990 bis 6560, y 1130 bis 1330). Ein Höhlensystem unter dem Feld und dem Versorgungspunkt.
// Hinein führt das Einsturzloch im Feld (x 5320 bis 5580), hinaus der Schacht vor dem Hochhaus (x 6100 bis 6360):
// Wer unten bleibt, umgeht die Bodenkämpfe. Im Westen liegt die Gruft mit Vorräten, in der Mitte eine hohe Halle mit
// einem schweren Wächter und drei Absätzen voller Beute, ganz im Osten ein Sicherheitsraum mit der SCHROTFLINTE.
// =====================================================================
const KAT_O = 1130;             // Unterkante der Basisdecke
const KAT_B = 1330;             // Boden (wie in der tiefen Mine: 570 unter der Oberfläche)
const katakomben = hoehlenform(4990, 6560, KAT_O, KAT_B, 31,
    [[5290, 5610], [5780, 6020], [6070, 6390], [6420, 6560]], 2, 1,
    [[5010, 5290], [5620, 5780], [5790, 6020], [6390, 6560]]);
aushoehlen(5780, 6020, 930, KAT_O);                          // die hohe Halle (200 höher)
aushoehlen(5320, 5580, BODEN, KAT_O);                        // Einsturzloch
aushoehlen(6100, 6360, BODEN, KAT_O);                        // Ausgangsschacht
schacht(5320, 5580);                                         // Bretter am Rand und Absätze im Zickzack (alle 95 Pixel)
schacht(6100, 6360);
signs.push({ x: 5290, y: BODEN - 90, text: 'Einsturzloch:\nein Weg in die Katakomben' });
hoehlen.push({ links: 4990, rechts: 5320, oben: KAT_O, unten: KAT_B, art: 'tunnel', eigeneLampen: true });
hoehlen.push({ links: 5320, rechts: 5580, oben: BODEN, unten: KAT_B, art: 'schacht', eigeneLampen: true });
hoehlen.push({ links: 5580, rechts: 5780, oben: KAT_O, unten: KAT_B, art: 'tunnel', eigeneLampen: true });
hoehlen.push({ links: 5780, rechts: 6020, oben: 930, unten: KAT_B, art: 'tunnel', eigeneLampen: true });
hoehlen.push({ links: 6020, rechts: 6100, oben: KAT_O, unten: KAT_B, art: 'tunnel', eigeneLampen: true });
hoehlen.push({ links: 6100, rechts: 6360, oben: BODEN, unten: KAT_B, art: 'schacht', eigeneLampen: true });
hoehlen.push({ links: 6360, rechts: 6560, oben: KAT_O, unten: KAT_B, art: 'lager', regale: false, eigeneLampen: true });
[5060, 5200, 5660, 6060, 6430, 6520].forEach(x => hoehlenlampe(katakomben, x));
// die hohe Halle: Absätze im Zickzack nach oben
schwebend(5790, KAT_B - 100, 90, HOLZ);                      // Absatz 1 (Oberkante 1230)
schwebend(5920, KAT_B - 200, 90, HOLZ);                      // Absatz 2 (Oberkante 1130)
schwebend(5800, KAT_B - 300, 100, HOLZ);                     // Absatz 3 (Oberkante 1030), die Beute
// Gruft im Westen
heilung(5020, KAT_B);
granate(5065, KAT_B);
munition(5110, KAT_B);
nahkaempfer(5200, 5150, 5260, 4, KAT_B);
skelett(5240, 5225, 5275, 3, KAT_B);
// Gang zur Halle
kiste(5620, 50, 80, KAT_B);
munition(5660, KAT_B - 50);
skelett(5745, 5722, 5768, 3, KAT_B);
// Halle
nahkaempfer(5880, 5820, 5990, 8, KAT_B);                     // der schwere Wächter
munition(5835, KAT_B - 100);
heilung(5965, KAT_B - 200);
granate(5850, KAT_B - 300);
granate(5880, KAT_B - 300);
skelett(5850, 5820, 5880, 4, KAT_B - 300);             // Schütze ganz oben
fass(5990, KAT_B);
// Sicherheitsraum im Osten
kiste(6480, 44, 60, KAT_B);
schrotflinte(6510, KAT_B - 44);
heilung(6400, KAT_B);

// =====================================================================
// ZONE J: Steinbruch mit Schlucht (x 7300 bis 9640). Der Boden steigt in Stufen zu einer Klippe
// (280 Pixel hoch), eine morsche Holzbrücke führt über eine Schlucht, dahinter geht es hinab.
// Unter der Schlucht liegt die tiefe Mine (ZONE K). Alles hier ist die Hauptroute über Tage.
// =====================================================================
signs.push({ x: 7250, y: BODEN - 110, text: 'Steinbruch:\nKlippen, eine Schlucht\nund ein Förderschacht' });
nahkaempfer(7330, 7270, 7380, 3);                                         // vor dem Schacht
signs.push({ x: 7530, y: BODEN - 70, text: 'Förderschacht\nzur Mine' });
schacht(MINE_L, MINE_L + 260);                                             // Förderschacht (x 7400 bis 7660)
schachtkoepfe.push({ links: MINE_L, rechts: MINE_L + 260 });                // mit Fördergerüst
gelaende(7696, [[0, 0], [160, 96], [256, 96], [512, 288], [704, 288]]);   // Klippe: Rampe, Absatz (96), Rampe, Plateau (288) bis x 8400
schwebend(CHASM_L, BODEN - 288, 100, HOLZ);                                // morsche Brücke über die Schlucht
schwebend(CHASM_R - 100, BODEN - 288, 100, HOLZ);                          // (in der Mitte fehlen 40 Pixel)
felsnase(CHASM_L, 808, 64, 1); felsnase(CHASM_L, 880, 32, 1); felsnase(CHASM_L, 960, 96, 1); felsnase(CHASM_L, 1040, 64, 1);   // Felsnasen in der Schluchtwand links
felsnase(CHASM_R, 800, 96, -1); felsnase(CHASM_R, 868, 32, -1);       // und rechts
bruecken.push({ art: 'seil', stuecke: [[CHASM_L, CHASM_L + 100, BODEN - 288], [CHASM_R - 100, CHASM_R, BODEN - 288]] });   // Seile und Pfosten
gelaende(CHASM_R, [[0, 288], [192, 288], [416, 160], [512, 160], [768, 0]]);   // Plateau, Rampe, Absatz (160), Rampe hinab bis x 9408
nahkaempfer(7905, 7874, 7934, 3, BODEN - 96);                              // auf dem Absatz der Klippe
{
    const oben = wachturm(8320, 220, -1);                                      // Wachturm 1 auf dem Plateau (Leiter links)
    skelett(8325, 8290, 8350, 4, oben);                                        // Scharfschütze oben
    fass(8200, bodenBei(8200));                                                // ein Fass neben der Stütze: damit stürzt der Turm ein
}
{
    const oben = wachturm(8745, 200, -1);                                      // Wachturm 2 auf dem Plateau hinter der Schlucht
    fernkaempfer(8735, 8705, 8760, 4, oben);
    fass(8830, bodenBei(8830));
}
nahkaempfer(9105, 9074, 9134, 3, BODEN - 160);                             // auf dem Absatz des Abstiegs
nahkaempfer(9530, 9450, 9600, 4);                                          // am Boden vor dem Ausgangsschacht
heilung(8225, BODEN - 288);                                                // Belohnung auf dem Plateau
munition(8822, BODEN - 288);                                               // Beute hinter der Brücke
schacht(SCHACHT2_L, MINE_R);                                               // Ausgangsschacht (x 9640 bis 9900)
schachtkoepfe.push({ links: SCHACHT2_L, rechts: MINE_R });

// =====================================================================
// ZONE K: Die tiefe Mine (y 1160 bis 1330, Kaverne bis y 960). Eine zweite Ebene unter der Erde.
// Zugang: Förderschacht (links), die Schlucht (fällt direkt hinein) und der Ausgangsschacht (rechts).
// Der Gang hat Deckung, die Kaverne hat drei Ebenen mit Beute auf dem obersten Steg.
// =====================================================================
hoehlen.push({ links: MINE_L, rechts: MINE_L + 260, oben: BODEN, unten: MINE_BODEN, art: 'schacht' });    // Förderschacht
hoehlen.push({ links: MINE_L + 260, rechts: CHASM_L, oben: MINE_DECKE, unten: MINE_BODEN, art: 'tunnel' }); // Gang 1
hoehlen.push({ links: CHASM_L, rechts: CHASM_R, oben: BODEN, unten: MINE_BODEN, art: 'schacht' });          // Schlucht
hoehlen.push({ links: CHASM_R, rechts: KAV_R, oben: KAV_DECKE, unten: MINE_BODEN, art: 'tunnel' });         // Kaverne
hoehlen.push({ links: KAV_R, rechts: SCHACHT2_L, oben: MINE_DECKE, unten: MINE_BODEN, art: 'tunnel' });     // Gang 2
hoehlen.push({ links: SCHACHT2_L, rechts: MINE_R, oben: BODEN, unten: MINE_BODEN, art: 'schacht' });        // Ausgangsschacht
[7780, 7990, 8210].forEach(x => lampe(x, MINE_DECKE));
[8800, 9050].forEach(x => lampe(x, KAV_DECKE));
lampe(9440, MINE_DECKE);
[7700, 7920, 8160, 8340].forEach(x => stuetze(x, MINE_DECKE, MINE_BODEN));
[9340, 9560].forEach(x => stuetze(x, MINE_DECKE, MINE_BODEN));
signs.push({ x: 7780, y: MINE_BODEN - 110, text: 'Mine 3\n"Nicht allein hinuntergehen."' });

// Gang 1 (x 7660 bis 8400)
kiste(7800, 50, 80);                                                       // Deckung
kiste(8060, 70, 80);
nahkaempfer(7970, 7900, 8040, 4, MINE_BODEN);                              // zwischen den Kisten
skelett(8250, 8200, 8330, 3, MINE_BODEN);                             // hinter der zweiten Kiste
munition(8100, MINE_BODEN - 70);                                           // Beute auf Kiste 2
// Unter der Schlucht (x 8400 bis 8640): hier landet, wer hineinfällt
heilung(8520, MINE_BODEN);
// Kaverne (x 8640 bis 9300): drei Ebenen, Steg ganz oben
schwebend(8700, MINE_BODEN - 100, 160, HOLZ);                              // Ebene 1 (Oberkante 1230)
schwebend(8880, MINE_BODEN - 200, 160, HOLZ);                              // Ebene 2 (Oberkante 1130)
schwebend(9060, MINE_BODEN - 280, 230, HOLZ);                              // Ebene 3, der Steg (Oberkante 1050)
nahkaempfer(8950, 8700, 9250, 8, MINE_BODEN);                              // der schwere Wächter am Boden
skelett(8780, 8720, 8840, 3, MINE_BODEN - 100);                       // Schütze auf Ebene 1
skelett(9150, 9090, 9270, 4, MINE_BODEN - 280);                       // Schütze auf dem Steg
munition(8960, MINE_BODEN - 200);                                          // Beute auf Ebene 2
heilung(9100, MINE_BODEN - 280);                                           // Belohnung auf dem Steg
granate(9230, MINE_BODEN - 280);
// Gang 2 (x 9300 bis 9640)
kiste(9480, 50, 80);
nahkaempfer(9400, 9320, 9460, 4, MINE_BODEN);
munition(9360, MINE_BODEN);

// =====================================================================
// ZONE L: Funkturm (x 9950 bis 10900). Ein freiwilliger Aufstieg auf einen hohen Turm
// (Plattformen im Wechsel links und rechts, 105 Pixel auseinander). Oben liegt Beute.
// =====================================================================
versorgungspunkt(10030);
heilung(9990);
munition(10070);
signs.push({ x: 10250, y: BODEN - 130, text: 'Funkturm:\nein Aufstieg lohnt sich' });
hoehlen.push({ links: 10225, rechts: 10545, oben: BODEN - 650, unten: BODEN, art: 'turm', etagen: [105, 210, 315, 420, 525, 630] });   // Gitterturm
for (let k = 1; k <= 5; k++) schwebend(k % 2 === 1 ? 10250 : 10420, BODEN - 105 * k, 100, METALL);
schwebend(10330, BODEN - 630, 260, BETON);                                 // Aussichtsdeck (Oberkante 130)
sprossenleiter(10228, BODEN - 525, BODEN, 1, 'stahl', 28);                 // Leiter am Turm: vom Boden bis zum fünften Absatz
decor.push({ x: 10335, y: BODEN - 665, w: 6, h: 70, color: 0x3a4046 });    // Antennenmast (steht auf dem Deck, Oberkante 630)
decor.push({ x: 10335, y: BODEN - 705, w: 24, h: 6, color: 0x3a4046 });
decor.push({ x: 10335, y: BODEN - 685, w: 40, h: 6, color: 0x3a4046 });
heilung(10360, BODEN - 630);
granate(10450, BODEN - 630);
munition(10540, BODEN - 630);
fernkaempfer(10520, 10430, 10570, 5, BODEN - 630);                         // Scharfschütze auf dem Deck
nahkaempfer(10200, 10120, 10300, 4);                                       // am Fuß des Turms
gelaende(10608, [[0, 0], [96, 64], [256, 64], [352, 0]]);   // Hügel hinter dem Turm
nahkaempfer(10750, 10720, 10790, 4, BODEN - 64);
fernkaempfer(10830, 10805, 10848, 3, BODEN - 64);

// =====================================================================
// ZONE N: Das Tal der Brücken (x 10950 bis 13400). Sanfte Hügel, zwei Schluchten und zwei kaputte Brücken.
//   Hügel 1 (x 11020 bis 11460): niedrig, mit Kuppe.
//   Schlucht 1 (x 11520 bis 11800): tief (570), kaputte Stahlbrücke mit Lücke, unten Wasser; hinaus über Absätze.
//   Hügel 2 (x 11860 bis 12380): hoch (140), oben die Reste eines Hauses.
//   Schlucht 2 (x 12420 bis 12800): flach (190), eingestürzte Autobahnbrücke; hinaus über einen Absatz rechts.
//   Hügel 3 (x 12900 bis 13380): niedrig, fällt zum Boss-Gebiet ab.
// =====================================================================
signs.push({ x: 10990, y: BODEN - 90, text: 'Tal der Brücken:\nHügel, Schluchten\nund kaputte Brücken' });
sanfterHuegel(11020, 448, 160, 0.2);
skelett(11245, 11205, 11285, 3, BODEN - 160);                         // Schütze auf der Kuppe von Hügel 1
munition(11200, BODEN - 160);
signs.push({ x: 11470, y: BODEN - 70, text: 'Vorsicht:\nBrücke beschädigt' });
// Schlucht 1: Stahlbrücke mit 80 Pixel Lücke, darunter Absätze und Wasser
schwebend(11520, BODEN, 110, METALL);                                      // linkes Brückenstück (x 11520 bis 11630)
schwebend(11710, BODEN, 90, METALL);                                       // rechtes Brückenstück (x 11710 bis 11800)
bruecken.push({ art: 'stahl', stuecke: [[11520, 11630, BODEN], [11710, 11800, BODEN]] });
leiter(11520, 11800);
hoehlen.push({ links: 11520, rechts: 11800, oben: BODEN, unten: MINE_BODEN, art: 'schacht', wasser: true });
nahkaempfer(11660, 11570, 11750, 4, MINE_BODEN);                           // unten im Wasser
heilung(11580, MINE_BODEN);
// Hügel 2 mit Hausresten
// Der Hügel wird von einer Spalte geteilt: Dahinter steht eine hohe Felsnadel. Wer danebenspringt, fällt aus dem Bild.
gelaende(11808, [[0, 0], [128, 96], [192, 192], [400, 192]]);
huegel(12312, 224, 104);                                                    // die Felsnadel (12312 bis 12416)
aushoehlen(12208, 12312, BODEN, HOEHE);                                    // die Spalte (104 breit): bodenlos
hoehlen.push({ links: 12208, rechts: 12312, oben: BODEN, unten: HOEHE, art: 'schacht', eigeneLampen: true });
skelett(12364, 12340, 12388, 3, BODEN - 224);                              // Scharfschütze auf der Nadel
schwebend(12040, BODEN - 192 - 95, 160, BETON);                            // Reste der Decke eines Hauses
skelett(12120, 12075, 12165, 4, BODEN - 192);                         // Schütze auf der Kuppe
heilung(12090, BODEN - 192);
munition(12120, BODEN - 287);                                              // Beute auf der Deckenplatte
granate(12170, BODEN - 287);
signs.push({ x: 12480, y: BODEN - 70, text: 'Autobahnbrücke:\neingestürzt' });
// Schlucht 2: eingestürzte Autobahnbrücke aus Betonplatten, flache Schlucht mit Absatz rechts
schwebend(12420, BODEN, 130, BETON);                                       // Platte 1, bündig mit dem Boden (x 12420 bis 12550)
schwebend(12590, BODEN + 30, 90, BETON);                                   // Platte 2, abgesackt (x 12590 bis 12680)
schwebend(12690, BODEN + 95, 110, BETON);                                  // Absatz rechts zum Hinaufklettern
bruecken.push({ art: 'autobahn', stuecke: [[12420, 12550, BODEN], [12590, 12680, BODEN + 30]] });
aushoehlen(12420, 12800, 950, HOEHE);                                       // kein Boden mehr: Die Schlucht ist bodenlos
hoehlen.push({ links: 12420, rechts: 12800, oben: BODEN, unten: HOEHE, art: 'schacht', eigeneLampen: true });
skelett(12745, 12712, 12778, 3, BODEN + 95);                          // auf dem Absatz
nahkaempfer(12850, 12820, 12880, 3);                                       // zwischen Schlucht und Hügel 3
// Hügel 3
gelaende(12896, [[0, 0], [96, 128], [240, 128]]);                          // Hügel 3a
gelaende(13236, [[0, 160], [96, 160], [140, 0]]);                          // Hügel 3b, hinter einer zweiten Spalte
aushoehlen(13136, 13236, BODEN, HOEHE);                                    // Spalte (100 breit): bodenlos
hoehlen.push({ links: 13136, rechts: 13236, oben: BODEN, unten: HOEHE, art: 'schacht', eigeneLampen: true });
nahkaempfer(13040, 13010, 13070, 4, BODEN - 128);
munition(13112, BODEN - 128);
fernkaempfer(13290, 13262, 13312, 4, BODEN - 160);

// =====================================================================
// ZONE R: Das Gebirge (x 13440 bis 15640). Hier gibt es die größten Höhenunterschiede des Levels: Über der Erde führt
// der Weg in Terrassen und kleinen Klippen (je 96 hoch) bis zum Gipfel (544 hoch) und auf der anderen Seite wieder
// hinab. Wer lieber unten bleibt, nimmt den Stollen: Eine Felstreppe führt in einen Tunnel unter dem Berg
// (Pit-Halle mit Brücke, Lager mit Vorräten), und ein Schacht bringt einen ins Tal vor der Arena zurück.
// =====================================================================
signs.push({ x: 13400, y: BODEN - 130, text: 'Das Gebirge:\nüber den Gipfel oder\ndurch den Stollen' });
const ST_L = 13440, ST_EIN = 13640, ST_SCH = 15200, ST_R = 15460;      // Graben, Tunnelbeginn, Ausgangsschacht (links/rechts)
const stollen = hoehlenform(ST_EIN, ST_R, BODEN + DECKE, TUNNEL_BODEN, 41,
    [[ST_EIN, 13950], [ST_SCH - 40, ST_R], [14150, 14420]], 2, 1,
    [[ST_EIN, 13990], [14040, 14150], [14150, 14420], [14470, 14600], [14620, 15200], [ST_SCH - 60, ST_R]]);
aushoehlen(ST_L, ST_EIN, BODEN, TUNNEL_BODEN);                           // der offene Graben vor dem Tunnel
aushoehlen(ST_SCH, ST_R, BODEN, TUNNEL_BODEN);                           // der Ausgangsschacht
aushoehlen(14150, 14420, TUNNEL_BODEN, TUNNEL_BODEN + 100);              // die Grube in der Mitte
// Die Felstreppe in den Tunnel (genau wie am ersten Höhleneingang): 8 Absätze, unterschiedlich breit
for (const [von, bis, oben] of [[13440, 13504, 792], [13504, 13536, 824], [13536, 13568, 856], [13568, 13632, 888],
    [13632, 13696, 920], [13696, 13760, 952], [13760, 13792, 984], [13792, 13856, 1016]]) erde(von, bis, oben, TUNNEL_BODEN + 60, FELS);
// Die Rampe aus der Grube heraus (Stufen zu 32 Pixeln) und die Brücke darüber
erde(14344, 14376, TUNNEL_BODEN + 68, TUNNEL_BODEN + 132, FELS);
erde(14376, 14408, TUNNEL_BODEN + 36, TUNNEL_BODEN + 132, FELS);
erde(14408, 14420, TUNNEL_BODEN + 4, TUNNEL_BODEN + 132, FELS);
schwebend(14150, TUNNEL_BODEN - 20, 110, HOLZ);                          // Steg am Rand der Grube (man springt von hier hinüber oder hinunter)
bruecken.push({ art: 'seil', stuecke: [[14150, 14260, TUNNEL_BODEN - 20]] });
// Schacht nach oben: Bretter am Rand und zwei Absätze
schwebend(ST_SCH, BODEN, 90, HOLZ);
schwebend(ST_R - 90, BODEN, 90, HOLZ);
leiter(ST_SCH, ST_R, 2);
hoehlen.push({ links: ST_L, rechts: ST_EIN, oben: BODEN, unten: TUNNEL_BODEN, art: 'offen' });
hoehlen.push({ links: ST_EIN, rechts: 14150, oben: BODEN + DECKE, unten: TUNNEL_BODEN, art: 'tunnel', licht: 'links', eigeneLampen: true });
hoehlen.push({ links: 14150, rechts: 14420, oben: BODEN + DECKE, unten: TUNNEL_BODEN + 100, art: 'tunnel', eigeneLampen: true });
hoehlen.push({ links: 14420, rechts: ST_SCH, oben: BODEN + DECKE, unten: TUNNEL_BODEN, art: 'tunnel', eigeneLampen: true });
hoehlen.push({ links: ST_SCH, rechts: ST_R, oben: BODEN, unten: TUNNEL_BODEN, art: 'schacht', eigeneLampen: true });
[13720, 13960, 14230, 14380, 14560, 14780, 15020].forEach(x => hoehlenlampe(stollen, x));
for (const sx of [ST_EIN + 8, 13900, 14500, 14950]) {                    // Holzstützen
    decor.push({ x: sx, y: (BODEN + DECKE + TUNNEL_BODEN) / 2, w: 10, h: TUNNEL_BODEN - BODEN - DECKE, color: 0x6b4a2a });
    decor.push({ x: sx + 4, y: (BODEN + DECKE + TUNNEL_BODEN) / 2, w: 3, h: TUNNEL_BODEN - BODEN - DECKE, color: 0x4a331d });
}
signs.push({ x: 13500, y: 806, text: 'STOLLEN 2\nBetreten auf eigene Gefahr' });
// Inhalt des Stollens
tunnelblock(14040, 40, 80);                                              // Deckung im ersten Gang
munition(14080, TUNNEL_BODEN - 40);
nahkaempfer(13930, 13880, 13990, 4, TUNNEL_BODEN);
fass(14134, TUNNEL_BODEN);
nahkaempfer(14260, 14190, 14320, 8, TUNNEL_BODEN + 100);                // der schwere Wächter in der Grube
heilung(14200, TUNNEL_BODEN + 100);                                      // Beute in der Grube
granate(14240, TUNNEL_BODEN + 100);
munition(14260, TUNNEL_BODEN + 100);
tunnelblock(14430, 60, 60);                                              // Deckung vor dem Schützen
skelett(14545, 14510, 14580, 4, TUNNEL_BODEN);
fass(14580, TUNNEL_BODEN);
nahkaempfer(14700, 14650, 14760, 4, TUNNEL_BODEN);
tunnelblock(14800, 40, 80);
munition(14840, TUNNEL_BODEN - 40);
skelett(14945, 14905, 14985, 4, TUNNEL_BODEN);
heilung(15010, TUNNEL_BODEN);
granate(15050, TUNNEL_BODEN);
nahkaempfer(15100, 15060, 15140, 6, TUNNEL_BODEN);                       // der Wächter vor dem Schacht

// Die Gipfelroute über der Erde
gelaende(13640, [[0, 0], [160, 96], [256, 96], [384, 224], [480, 224], [484, 320], [608, 320], [736, 448], [832, 448],
    [836, 544], [1000, 544], [1004, 352], [1100, 352], [1228, 160], [1324, 160], [1484, 0], [1560, 0]], 'fels');
nahkaempfer(13850, 13824, 13872, 3, BODEN - 96);
fernkaempfer(14072, 14040, 14104, 3, BODEN - 224);
nahkaempfer(14186, 14146, 14226, 4, BODEN - 320);
skelett(14424, 14392, 14456, 4, BODEN - 448);
skelett(14590, 14545, 14630, 6, BODEN - 544);                       // Scharfschütze am Gipfel
heilung(14510, BODEN - 544);
munition(14535, BODEN - 544);
granate(14560, BODEN - 544);
fass(14610, BODEN - 544);
nahkaempfer(14692, 14660, 14724, 4, BODEN - 352);
fernkaempfer(14916, 14884, 14948, 3, BODEN - 160);
signs.push({ x: 14430, y: BODEN - 640, text: 'Gipfel' });
// Leitern an den Klippen: Statt zu springen kann man klettern (und von oben wieder hinunter)
sprossenleiter(14098, BODEN - 320, BODEN - 224, 1, 'holz', 28);
sprossenleiter(14454, BODEN - 544, BODEN - 448, 1, 'holz', 28);
sprossenleiter(14662, BODEN - 544, BODEN - 352, -1, 'holz', 28);
signs.push({ x: 14575, y: BODEN - 544 - 70, text: 'Seilbahn zum Boss\nE: einhängen' });
// Versorgung am Endturm der Seilbahn: Wer fährt, überspringt die Vorräte vor der Arena und findet sie hier.
decor.push({ x: 16160, y: BODEN - 14, w: 64, h: 28, color: 0x5b4a2e });                   // Kiste
decor.push({ x: 16160, y: BODEN - 14, w: 20, h: 6, color: 0xdd3333 });                    // rotes Kreuz
decor.push({ x: 16160, y: BODEN - 14, w: 6, h: 20, color: 0xdd3333 });
signs.push({ x: 16160, y: BODEN - 70, text: 'Vorräte\nfür den Kampf' });
heilung(16170); granate(16190); munition(16250); munition(16275);
// Das Tal hinter dem Gebirge
nahkaempfer(15540, 15500, 15600, 4);
stacheldraht(15500);

// =====================================================================
// ZONE H: Vor der Arena (x 13400 bis 13850). Hier rüstet man sich aus.
// =====================================================================
signs.push({ x: 13500 + ARENA, y: BODEN - 100, text: 'Etwas Großes wartet voraus...' });
gelaende(13440 + ARENA, [[0, 0], [96, 64], [288, 64], [384, 0]]);       // Anhöhe vor der Arena
schrotflinte(13845 + ARENA);                              // Alternative zum Gewehr für den Bosskampf (unten am Hang)
granate(13560 + ARENA, BODEN - 64);                       // vor dem Boss: Granaten aufsparen
heilung(13620 + ARENA, BODEN - 64);
munition(13670 + ARENA, BODEN - 64);
munition(13715 + ARENA, BODEN - 64);

// =====================================================================
// ZONE I: Arena der starken Kreatur (x 13900 bis 14700).
// Drei Plattformen zum Ausweichen. Ihre Unterkante liegt über dem Kopf der Kreatur (Höhe 100),
// sie kann darunter durchlaufen.
// =====================================================================
// Die Plattformen sind Reste einer eingestürzten Hochstraße: Fahrbahnstücke mit Asphalt, Leitplanken und Säulen darunter.
schwebend(14040 + ARENA, BODEN - 120, 140);
schwebend(14230 + ARENA, BODEN - 170, 140);
schwebend(14420 + ARENA, BODEN - 120, 140);
// Ein hoher Laufsteg über der mittleren Platte (auf zwei Pfeilern): Von hier oben sieht man die Kreatur kommen. Die Leiter steht links.
bauteil(16425, 16575, BODEN - 300, BODEN - 280, 'beton', 9999, { gruppe: 'arena', rolle: 'boden' });
bauteil(16442, 16462, BODEN - 280, BODEN - 170, 'beton', 12, { gruppe: 'arena', rolle: 'stuetze' });
bauteil(16538, 16558, BODEN - 280, BODEN - 170, 'beton', 12, { gruppe: 'arena', rolle: 'stuetze' });
sprossenleiter(16405, BODEN - 300, BODEN, 1, 'stahl', 30);
bruecken.push({ art: 'autobahn', stuecke: [[14040 + ARENA, 14180 + ARENA, BODEN - 120], [14230 + ARENA, 14370 + ARENA, BODEN - 170], [14420 + ARENA, 14560 + ARENA, BODEN - 120]] });

// =====================================================================
// Explosive Fässer: stehen bei Gegnergruppen. Ein Schuss oder eine Granate lässt sie explodieren,
// benachbarte Fässer folgen (Kettenreaktion). Auch der Spieler nimmt Schaden: Abstand halten!
// =====================================================================
fass(1240, BODEN - 96);                      // Zone A, beim ersten Gegner
fass(1850, BODEN - 140);                     // Zone B, auf dem Deck beim Schützen
fass(2150);
fass(3620, TUNNEL_BODEN);                    // im Tunnel zwischen den Kisten
fass(5100, BODEN - 64); fass(5262);          // Zone E, auf dem offenen Feld
fass(6385);                                  // Zone G, vor dem Hochhaus
fass(6590, BODEN - 300);                     // im Hochhaus (Etage 3)
fass(7330); fass(7930, BODEN - 96);          // Zone J, vor dem Schacht und auf der Klippe
fass(8900, MINE_BODEN);                      // in der Kaverne
fass(10200);                                 // am Funkturm
fass(14100 + ARENA); fass(14550 + ARENA);                    // in der Boss-Arena: den Boss damit locken
fass(11240, BODEN - 160); fass(12140, BODEN - 192); fass(13092, BODEN - 128);   // im Tal der Brücken

// Landeplatz des Hubschraubers (Dekoration): eine betonierte Fläche mit einem gelben H und Randlichtern
decor.push({ x: 8800 + V, y: BODEN - 2, w: 280, h: 6, color: 0x6a6f73 });
decor.push({ x: 8800 + V - 20, y: BODEN - 7, w: 6, h: 22, color: 0xd9b43a });     // H: linker Balken
decor.push({ x: 8800 + V + 20, y: BODEN - 7, w: 6, h: 22, color: 0xd9b43a });     // H: rechter Balken
decor.push({ x: 8800 + V, y: BODEN - 7, w: 46, h: 6, color: 0xd9b43a });          // H: Querbalken
for (const dx of [-135, 135]) decor.push({ x: 8800 + V + dx, y: BODEN - 8, w: 6, h: 8, color: 0xcc3333 });   // Randlichter

export default {
    width: BREITE,   // Breite der Welt in Pixeln
    height: HOEHE,   // Höhe der Welt in Pixeln
    boden: BODEN,    // Höhe der Oberfläche
    goalX: 8800 + V, // Mitte des Evakuierungspunkts (Hubschrauber)
    platforms,
    decor,
    signs,
    enemies,
    rangedEnemies,
    skelette,
    // Die große Fahne auf dem Gipfel (Checkpoint) und die Seilbahn vom Gipfel bis kurz vor die Arena
    flagge: { x: 14492, y: BODEN - 544 },
    seilbahn: { x0: 14610, y0: BODEN - 544 - 100, x1: 16100, y1: BODEN - 150,
                masten: [15100, 15560].map(x => ({ x, boden: bodenBei(x) })) },
    boss: { x: 8250 + V, y: BODEN - 60, left: 8040 + V, right: 8620 + V, hp: 80 },
    // Die Brut: schlafende Brutlinge am Arenarand, die die Kreatur in Phase 2 und 3 ruft
    brutlinge: [16290, 16820, 16340, 16770, 16400, 16720, 16460, 16670].map(x => ({ x, y: BODEN - 18, left: 16240, right: 16860, hp: 2 })),
    pickups,
    faesser,
    bruecken,
    treppen,
    wracks,
    geruest,
    schachtkoepfe,
    leitern,
    huegelformen,
    hoehlen,
    lampen,
};
