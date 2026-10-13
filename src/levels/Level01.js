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
const pickups = [];
const treppen = [];    // Treppen (für die Zeichnung der Wangen, Geländer und Warnstreifen)
const bruecken = [];  // Brücken (für die Zeichnung der Geländer, Streben und Seile)
const huegelformen = [];  // sanfte Hügel (für die Zeichnung der Erdoberfläche)
const hoehlen = [];   // Hintergründe von Höhlen und Gräben (werden als Bilder gemalt)
const lampen = [];    // x-Positionen der Deckenlampen (für Lichtkegel)
const signs = [];
const faesser = [];   // explosive Fässer

// ---- Der Untergrund: Erde mit einem Tunnel (siehe ZONE T) ----
const BREITE = 15400;           // Breite der Welt
const TUNNEL_LINKS = 2740;      // linke Kante des Tunnels (linker Schacht beginnt hier)
const TUNNEL_RECHTS = 4220;     // rechte Kante (rechter Schacht endet hier)
const SCHACHT = 260;            // Breite eines Schachts
const EINGANG = TUNNEL_LINKS + 200;   // hier beginnt die Felsdecke: der Höhleneingang (x 2940)
const VERLIES_ENDE = 4780;      // Ende der Waffenkammer: der Tunnel geht HINTER dem Ausgang noch weiter
const DECKE = 60;               // Dicke der Tunneldecke (Oberfläche bis Unterkante der Decke)
const TUNNEL_BODEN = 1048;      // y der Oberkante des Tunnelbodens (288 unter der Oberfläche): der Gang ist 228 hoch

// ---- Die tiefe Mine (zweite Ebene unter der Erde, siehe ZONE K) ----
const V = 6000;                 // Verschiebung der Boss-Zonen H und I nach rechts (das Level ist länger geworden)
const MINE_L = 7400;            // linke Kante des Förderschachts
const MINE_R = 9900;            // rechte Kante des Ausgangsschachts
const CHASM_L = 8400;           // Schlucht: linke Kante
const CHASM_R = 8640;           // Schlucht: rechte Kante
const KAV_R = 9300;             // Ende der großen Kaverne
const SCHACHT2_L = 9640;        // linke Kante des Ausgangsschachts
const MINE_BODEN = 1330;        // y des Minenbodens (570 unter der Oberfläche)
const MINE_DECKE = 1160;        // Unterkante der Decke im Gang (170 Platz bis zum Boden)
const KAV_DECKE = 960;          // Unterkante der Decke in der hohen Kaverne
const HOLZ = 0x6b4a2a;          // Holz (Brücken, Absätze)
const METALL = 0x3a4046;        // Stahl (Gitterturm)

// erde: ein Erdblock von "links" bis "rechts" und von "oben" bis "unten" (alles Kanten, keine Mitte).
const erde = (links, rechts, oben, unten, farbe = 0x4b3b2a) =>
    platforms.push({ x: (links + rechts) / 2, y: (oben + unten) / 2, w: rechts - links, h: unten - oben, color: farbe });

erde(0, TUNNEL_LINKS, BODEN, HOEHE);                                              // Erde links vom Tunnel
erde(EINGANG, TUNNEL_RECHTS - SCHACHT, BODEN, BODEN + DECKE);                     // Decke über dem Tunnel (beginnt am Höhleneingang)
erde(TUNNEL_LINKS, VERLIES_ENDE, TUNNEL_BODEN, HOEHE);                            // Boden des Tunnels (bis zur Waffenkammer)
erde(TUNNEL_RECHTS, VERLIES_ENDE, BODEN, BODEN + DECKE);                          // Decke über der Waffenkammer
erde(VERLIES_ENDE, MINE_L, BODEN, HOEHE);                                         // Erde rechts hinter der Kammer bis zum Förderschacht
erde(MINE_L, MINE_R, MINE_BODEN, HOEHE);                                          // Boden der Mine
erde(MINE_L + 260, CHASM_L, BODEN, MINE_DECKE);                                   // Decke des Minengangs (links der Schlucht)
erde(CHASM_R, KAV_R, BODEN, KAV_DECKE);                                           // Decke der hohen Kaverne
erde(KAV_R, SCHACHT2_L, BODEN, MINE_DECKE);                                       // Decke des Minengangs (rechts der Kaverne)
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

// Gegenstände: "oben" = y der Fläche, auf der sie liegen.
const munition = (x, oben = BODEN) => pickups.push({ x, y: oben - 10, type: 'ammo' });
const heilung = (x, oben = BODEN) => pickups.push({ x, y: oben - 10, type: 'health' });
const schrotflinte = (x, oben = BODEN) => pickups.push({ x, y: oben - 10, type: 'shotgun' });
// fass: ein explosives Fass auf dem Boden (oben = y der Standfläche)
const fass = (x, oben = BODEN) => faesser.push({ x, y: oben - 19 });
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
    decor.push({ x: x, y: decke + 8, w: 10, h: 8, color: 0xc9a94e });
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
    for (let i = 1; i <= 5; i++) schwebend(i % 2 === 1 ? links : rechts - 170, BODEN + 95 * i, 170, HOLZ);
};

// leiter: Holzababsätze im Zickzack an den Wänden einer Schlucht (alle 95 Pixel), damit man wieder hinaufkommt.
const leiter = (links, rechts, anzahl = 5) => {
    for (let i = 1; i <= anzahl; i++) schwebend(i % 2 === 1 ? links : rechts - 170, BODEN + 95 * i, 170, HOLZ);
};
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
const gelaendeAusWerten = (links, werte, fels) => {
    const n = werte.length;
    let start = 0;
    for (let i = 1; i <= n; i++) {
        if (i === n || werte[i] !== werte[start]) {
            const h = werte[start];
            if (h > 0) platforms.push({ x: links + (start + i) * BLOCK / 2, y: BODEN - h / 2, w: (i - start) * BLOCK, h, color: fels ? FELS : ERDE, kollision: true });
            start = i;
        }
    }
    huegelformen.push({ links, breite: n * BLOCK, schritt: BLOCK, werte, fels });
};

// Macht aus glatten Höhen ein natürliches Gelände: Auf den Hängen kommen Zufallsabweichungen dazu (Buckel, Dellen,
// unterschiedlich lange Absätze), Kuppen und Plateaus bleiben exakt eben (dort stehen Gegner). Benachbarte Spalten
// unterscheiden sich höchstens um einen Block, damit man alles hinaufgehen kann. "rau" = Stärke (1 = normal).
const aufrauen = (glatt, flach, seed, rau = 1) => {
    const zu = zufall(seed);
    const w = glatt.map((h, i) => flach[i] ? h : Math.max(0, Math.round((h + (zu() - 0.5) * 2 * BLOCK * 0.95 * rau) / BLOCK) * BLOCK));
    for (let i = 1; i < w.length; i++) if (!flach[i]) w[i] = Math.max(w[i - 1] - BLOCK, Math.min(w[i - 1] + BLOCK, w[i]));
    for (let i = w.length - 2; i >= 0; i--) if (!flach[i]) w[i] = Math.max(w[i + 1] - BLOCK, Math.min(w[i + 1] + BLOCK, w[i]));
    return w;
};

// gelaende: ein Gelände nach einer Linie. "punkte" = Liste von [x-Abstand ab links, Höhe]; dazwischen wird
// geradlinig verbunden, aufgeraut und auf ganze Blöcke (32) gerundet. Steigungen über 0,9 vermeiden!
// Waagerechte Strecken (gleiche Höhe an beiden Punkten) bleiben eben. material: 'erde' (mit Gras) oder 'fels'.
const gelaende = (links, punkte, material = 'erde', rau = 1) => {
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
    gelaendeAusWerten(links, aufrauen(glatt, flach, links, rau), material === 'fels');
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
        const i = Math.floor((x - f.links) / f.schritt);
        if (i >= 0 && i < f.werte.length) return BODEN - f.werte[i];
    }
    return BODEN;
};

// felsnase: ein Felsbrocken (2 Blöcke hoch), der aus einer Schluchtwand ragt. richtung 1 = ragt nach rechts
// (Wand links), -1 = ragt nach links (Wand rechts). Macht senkrechte Wände unregelmäßig.
const felsnase = (wandX, y, breite, richtung = 1) =>
    platforms.push({ x: wandX + richtung * breite / 2, y: y + 32, w: breite, h: 64, color: FELS });

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

// =====================================================================
// ZONE B: Ruine mit zwei Etagen (x 1450 bis 2300).
// Oben (Deck) kämpft ein Schütze, darunter patrouilliert ein Nahkämpfer.
// =====================================================================
huegel(1450, 60, 160, BETON);                    // Stufe zum Deck
hoehlen.push({ links: 1585, rechts: 2135, oben: BODEN - 330, unten: BODEN, art: 'gebaeude', etagen: [140, 240] });   // Rückwand der Ruine
schwebend(1600, BODEN - 140, 360);                       // Deck (Oberkante 360), x 1600 bis 1960
schwebend(2010, BODEN - 240, 110);                       // kleines Versteck darüber (Oberkante 260)
fernkaempfer(1780, 1660, 1900, 3, BODEN - 140);          // Schütze auf dem Deck
nahkaempfer(1800, 1650, 1930, 4);                // Nahkämpfer darunter
heilung(2065, BODEN - 240);                              // versteckte Heilung im Versteck
nahkaempfer(2190, 2080, 2276, 3);

// =====================================================================
// ZONE C: Versorgungspunkt 1 (x 2450 bis 2750). Ruhig, ein Atemzug.
// =====================================================================
gelaende(2304, [[0, 0], [96, 64], [320, 64], [416, 0]]);      // sanfte Anhöhe für den Versorgungspunkt
versorgungspunkt(2570, BODEN - 64);
heilung(2530, BODEN - 64);
munition(2610, BODEN - 64);
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
hoehlen.push({ links: EINGANG, rechts: TUNNEL_RECHTS - SCHACHT, oben: BODEN + DECKE, unten: TUNNEL_BODEN, art: 'tunnel', licht: 'links' });  // Mund und Gang
lampen.push(EINGANG + 70);
// Holzstützen und Deckenbalken im Eingangsbereich
decor.push({ x: (EINGANG + 3500) / 2, y: BODEN + DECKE + 5, w: 3500 - EINGANG, h: 10, color: 0x5a3d22 });    // Balken
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
hoehlen.push({ links: TUNNEL_RECHTS - SCHACHT, rechts: TUNNEL_RECHTS, oben: BODEN, unten: TUNNEL_BODEN, art: 'offen' });   // rechter Schacht
for (let x = 3150; x < VERLIES_ENDE - 40; x += 250) {
    if (x > TUNNEL_RECHTS - SCHACHT - 20 && x < TUNNEL_RECHTS + 20) continue;           // über dem Schacht gibt es keine Decke
    decor.push({ x: x, y: BODEN + DECKE + 8, w: 10, h: 8, color: 0xc9a94e });          // Deckenlampen
    lampen.push(x);
}
treppe(TUNNEL_RECHTS - 200, 4, 50, 72);                // Stufen im rechten Schacht (x 4020 bis 4220), je 72 hoch
tunnelblock(3480, 40, 80);                             // Kiste A als Deckung (x 3480 bis 3560)
tunnelblock(3720, 60, 80);                             // Kiste B als Deckung (x 3720 bis 3800)
nahkaempfer(3330, 3224, 3420, 4, TUNNEL_BODEN);        // Nahkämpfer am Eingang des Gangs
fernkaempfer(3640, 3590, 3690, 3, TUNNEL_BODEN);       // Schütze zwischen den Kisten
nahkaempfer(3880, 3830, 3940, 4, TUNNEL_BODEN);        // Nahkämpfer vor dem Ausgang
munition(3760, TUNNEL_BODEN - 60);                     // Beute auf Kiste B

// ---- Die Waffenkammer am Ende des Tunnels (x 4220 bis 4780) ----
// Wer den Ausgang nicht nimmt, sondern unter den Stufen weitergeht, findet ein verlassenes Lager:
// ein SCHWERER WÄCHTER (8 Lebenspunkte), Heilung, Munition und das STURMGEWEHR.
hoehlen.push({ links: TUNNEL_RECHTS, rechts: VERLIES_ENDE, oben: BODEN + DECKE, unten: TUNNEL_BODEN, art: 'lager' });     // Raum der Kammer
signs.push({ x: 4330, y: TUNNEL_BODEN - 120, text: 'Lager 7\n"Aufgegeben. Sie kamen von unten."' });
decor.push({ x: 4290, y: TUNNEL_BODEN - 70, w: 44, h: 32, color: 0x1d5a3a });           // Terminal (Bildschirm)
decor.push({ x: 4290, y: TUNNEL_BODEN - 45, w: 8, h: 18, color: 0x333333 });            // Terminal (Ständer)
decor.push({ x: 4290, y: TUNNEL_BODEN - 30, w: 70, h: 8, color: 0x55482f });            // Tisch
decor.push({ x: 4690, y: TUNNEL_BODEN - 80, w: 6, h: 80, color: 0x3a4046 });            // Waffenregal (Pfosten)
decor.push({ x: 4750, y: TUNNEL_BODEN - 80, w: 6, h: 80, color: 0x3a4046 });
decor.push({ x: 4720, y: TUNNEL_BODEN - 100, w: 66, h: 5, color: 0x3a4046 });           // Waffenregal (Brett)
tunnelblock(4640, 50, 100);                                    // Tisch mit dem Gewehr (x 4640 bis 4740)
nahkaempfer(4440, 4330, 4600, 8, TUNNEL_BODEN);                // der schwere Wächter
heilung(4350, TUNNEL_BODEN);
munition(4540, TUNNEL_BODEN);
waffe(4690, TUNNEL_BODEN - 50);                                // das Sturmgewehr auf dem Tisch

// =====================================================================
// ZONE D: Der Hügel über der Höhle (x 2940 bis 3770). Die Höhle ist in diesen Hügel hineingegraben: Der Eingang
// liegt an seinem Fuß (x 2940), der Hang steigt über Absätze zum Gipfel (192) und fällt auf der anderen Seite ab.
// Auf den Absätzen sitzen Schützen, auf dem Gipfel wartet ein Nahkämpfer mit Munition.
// =====================================================================
signs.push({ x: 3000, y: BODEN - 170, text: 'Gefahr voraus:\nSchützen am Hang' });
gelaende(EINGANG, [[0, 0], [160, 96], [256, 96], [384, 192], [512, 192], [640, 96], [736, 96], [832, 0]]);
fernkaempfer(3148, 3116, 3180, 3, BODEN - 96);           // Schütze auf dem ersten Absatz
nahkaempfer(3388, 3340, 3436, 4, BODEN - 192);           // Nahkämpfer auf dem Gipfel
munition(3410, BODEN - 192);                             // Belohnung auf dem Gipfel
fernkaempfer(3628, 3596, 3660, 3, BODEN - 96);           // Schütze auf dem zweiten Absatz

// =====================================================================
// ZONE E: Bunkerhügel (x 4290 bis 4870) und offenes Feld mit Hügeln (x 4900 bis 5600).
// Der Bunker ist kein Betonklotz mehr, sondern ein gestufter Felshügel aus 32er-Blöcken (wie die Höhle):
// Ein begrünter Erdwall mit einem Bunker obenauf: Rampe, Absatz (64), Rampe, Absatz (128), Rampe, Dach (192).
// Hinter dem Dach geht es über einen Absatz (96) hinab, damit man auch zurück hinaufkommt (mehr als 150 springt niemand).
// =====================================================================
signs.push({ x: 4262, y: BODEN - 130, text: 'Bunker voraus:\nGegner auf mehreren Absätzen' });
gelaende(4290, [[0, 0], [96, 64], [192, 64], [288, 128], [384, 128], [480, 192], [576, 192], [580, 96], [672, 96], [676, 0]]);   // Erdwall
huegel(4770, 240, 96, BUNKER);                               // der Betonbunker auf dem Wall (Oberkante 240)
nahkaempfer(4434, 4402, 4466, 4, BODEN - 64);                // Nahkämpfer auf dem ersten Absatz
fernkaempfer(4626, 4594, 4658, 4, BODEN - 128);              // Schütze auf dem zweiten Absatz
fernkaempfer(4818, 4786, 4850, 4, BODEN - 240);              // Scharfschütze auf dem Bunkerdach
// Wichtig: Die Patrouille muss zu den ebenen Flächen passen. Ein Gegner hat 32 Pixel Breite,
// also reicht er 16 Pixel über seine Grenzen hinaus. Sonst stößt er an die nächste Stufe.
munition(4800, BODEN - 240);                                 // Belohnung auf dem Bunkerdach
granate(6700, BODEN - 300);                     // im Hochhaus (Etage 4)
// Das Feld: zwei Hügel mit einer Senke dazwischen
gelaende(4900, [[0, 0], [128, 64], [256, 64], [352, 0], [448, 0], [576, 96], [672, 96], [704, 0]]);
nahkaempfer(5090, 5044, 5136, 3, BODEN - 64);                // auf dem ersten Hügel
nahkaempfer(5300, 5268, 5332, 3);                            // in der Senke
fernkaempfer(5524, 5492, 5556, 3, BODEN - 96);               // Schütze auf dem zweiten Hügel
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
signs.push({ x: 6200, y: BODEN - 110, text: 'Hochhaus-Ruine:\nGegner auf jeder Etage' });
hoehlen.push({ links: 6380, rechts: 6920, oben: BODEN - 660, unten: BODEN, art: 'gebaeude', etagen: [100, 200, 300, 400, 500, 600] });   // Rückwand des Hochhauses
for (let etage = 1; etage <= 6; etage++) {
    const links = etage % 2 === 1 ? 6400 : 6520;                         // ungerade links, gerade rechts
    schwebend(links, BODEN - 100 * etage, 380);                          // 380 breit, Oberkante = Etagenhöhe
}
hoehlen.push({ links: 7060, rechts: 7260, oben: BODEN - 440, unten: BODEN, art: 'gebaeude', etagen: [400] });   // Gebäuderest am Ende der Skybridge
schwebend(6900, BODEN - 400, 250);                                       // Skybridge (Oberkante wie Etage 4)

nahkaempfer(6250, 6170, 6330, 4);                                        // am Eingang, links
nahkaempfer(6590, 6430, 6750, 4, BODEN - 100);                           // Etage 1
fernkaempfer(6700, 6600, 6820, 3, BODEN - 200);                          // Etage 2
nahkaempfer(6590, 6430, 6750, 4, BODEN - 300);                           // Etage 3
fernkaempfer(6700, 6600, 6820, 3, BODEN - 400);                          // Etage 4
fernkaempfer(6590, 6500, 6680, 3, BODEN - 500);                          // Etage 5
fernkaempfer(6780, 6700, 6860, 5, BODEN - 600);                          // Scharfschütze auf dem Dach
fernkaempfer(7050, 6960, 7110, 3, BODEN - 400);                          // auf der Skybridge
nahkaempfer(7100, 6960, 7250, 4);                                        // am Boden, rechts

heilung(6430, BODEN - 300);                                              // Belohnung auf Etage 3 (linkes Ende)
munition(6430, BODEN - 500);                                             // Belohnung auf Etage 5 (linkes Ende)

// =====================================================================
// ZONE J: Steinbruch mit Schlucht (x 7300 bis 9640). Der Boden steigt in Stufen zu einer Klippe
// (280 Pixel hoch), eine morsche Holzbrücke führt über eine Schlucht, dahinter geht es hinab.
// Unter der Schlucht liegt die tiefe Mine (ZONE K). Alles hier ist die Hauptroute über Tage.
// =====================================================================
signs.push({ x: 7250, y: BODEN - 110, text: 'Steinbruch:\nKlippen, eine Schlucht\nund ein Förderschacht' });
nahkaempfer(7330, 7270, 7380, 3);                                         // vor dem Schacht
signs.push({ x: 7530, y: BODEN - 70, text: 'Förderschacht\nzur Mine' });
schacht(MINE_L, MINE_L + 260);                                             // Förderschacht (x 7400 bis 7660)
gelaende(7696, [[0, 0], [160, 96], [256, 96], [512, 288], [704, 288]]);   // Klippe: Rampe, Absatz (96), Rampe, Plateau (288) bis x 8400
schwebend(CHASM_L, BODEN - 288, 100, HOLZ);                                // morsche Brücke über die Schlucht
schwebend(CHASM_R - 100, BODEN - 288, 100, HOLZ);                          // (in der Mitte fehlen 40 Pixel)
felsnase(CHASM_L, 880, 64, 1); felsnase(CHASM_L, 1040, 96, 1);      // Felsnasen in der Schluchtwand links
felsnase(CHASM_R, 820, 96, -1); felsnase(CHASM_R, 910, 64, -1);        // und rechts
bruecken.push({ art: 'seil', stuecke: [[CHASM_L, CHASM_L + 100, BODEN - 288], [CHASM_R - 100, CHASM_R, BODEN - 288]] });   // Seile und Pfosten
gelaende(CHASM_R, [[0, 288], [192, 288], [416, 160], [512, 160], [768, 0]]);   // Plateau, Rampe, Absatz (160), Rampe hinab bis x 9408
nahkaempfer(7905, 7874, 7934, 3, BODEN - 96);                              // auf dem Absatz der Klippe
fernkaempfer(8310, 8245, 8380, 4, BODEN - 288);                            // Scharfschütze auf dem Plateau
fernkaempfer(8750, 8665, 8815, 4, BODEN - 288);                            // Schütze auf dem Plateau dahinter
nahkaempfer(9105, 9074, 9134, 3, BODEN - 160);                             // auf dem Absatz des Abstiegs
nahkaempfer(9530, 9450, 9600, 4);                                          // am Boden vor dem Ausgangsschacht
heilung(8225, BODEN - 288);                                                // Belohnung auf dem Plateau
munition(8700, BODEN - 288);                                               // Beute hinter der Brücke
schacht(SCHACHT2_L, MINE_R);                                               // Ausgangsschacht (x 9640 bis 9900)

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
decor.push({ x: (MINE_L + 260 + CHASM_L) / 2, y: MINE_DECKE + 5, w: CHASM_L - MINE_L - 260, h: 10, color: 0x5a3d22 });   // Deckenbalken
decor.push({ x: (CHASM_R + KAV_R) / 2, y: KAV_DECKE + 5, w: KAV_R - CHASM_R, h: 10, color: 0x5a3d22 });
decor.push({ x: (KAV_R + SCHACHT2_L) / 2, y: MINE_DECKE + 5, w: SCHACHT2_L - KAV_R, h: 10, color: 0x5a3d22 });
signs.push({ x: 7780, y: MINE_BODEN - 110, text: 'Mine 3\n"Nicht allein hinuntergehen."' });

// Gang 1 (x 7660 bis 8400)
kiste(7800, 50, 80);                                                       // Deckung
kiste(8060, 70, 80);
nahkaempfer(7970, 7900, 8040, 4, MINE_BODEN);                              // zwischen den Kisten
fernkaempfer(8250, 8200, 8330, 3, MINE_BODEN);                             // hinter der zweiten Kiste
munition(8100, MINE_BODEN - 70);                                           // Beute auf Kiste 2
// Unter der Schlucht (x 8400 bis 8640): hier landet, wer hineinfällt
heilung(8520, MINE_BODEN);
// Kaverne (x 8640 bis 9300): drei Ebenen, Steg ganz oben
schwebend(8700, MINE_BODEN - 100, 160, HOLZ);                              // Ebene 1 (Oberkante 1230)
schwebend(8880, MINE_BODEN - 200, 160, HOLZ);                              // Ebene 2 (Oberkante 1130)
schwebend(9060, MINE_BODEN - 280, 230, HOLZ);                              // Ebene 3, der Steg (Oberkante 1050)
nahkaempfer(8950, 8700, 9250, 8, MINE_BODEN);                              // der schwere Wächter am Boden
fernkaempfer(8780, 8720, 8840, 3, MINE_BODEN - 100);                       // Schütze auf Ebene 1
fernkaempfer(9150, 9090, 9270, 4, MINE_BODEN - 280);                       // Schütze auf dem Steg
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
decor.push({ x: 10335, y: BODEN - 700, w: 6, h: 70, color: 0x3a4046 });    // Antennenmast
decor.push({ x: 10335, y: BODEN - 745, w: 24, h: 6, color: 0x3a4046 });
decor.push({ x: 10335, y: BODEN - 765, w: 40, h: 6, color: 0x3a4046 });
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
sanfterHuegel(11020, 448, 96, 0.2);
fernkaempfer(11245, 11205, 11285, 3, BODEN - 96);                         // Schütze auf der Kuppe von Hügel 1
munition(11200, BODEN - 96);
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
sanfterHuegel(11808, 608, 128, 0.2);
schwebend(12040, BODEN - 128 - 95, 160, BETON);                            // Reste der Decke eines Hauses
fernkaempfer(12120, 12075, 12165, 4, BODEN - 128);                         // Schütze auf der Kuppe
heilung(12090, BODEN - 128);
munition(12120, BODEN - 223);                                              // Beute auf der Deckenplatte
granate(12170, BODEN - 223);
signs.push({ x: 12390, y: BODEN - 70, text: 'Autobahnbrücke:\neingestürzt' });
// Schlucht 2: eingestürzte Autobahnbrücke aus Betonplatten, flache Schlucht mit Absatz rechts
schwebend(12420, BODEN, 130, BETON);                                       // Platte 1, bündig mit dem Boden (x 12420 bis 12550)
schwebend(12590, BODEN + 30, 90, BETON);                                   // Platte 2, abgesackt (x 12590 bis 12680)
schwebend(12690, BODEN + 95, 110, BETON);                                  // Absatz rechts zum Hinaufklettern
bruecken.push({ art: 'autobahn', stuecke: [[12420, 12550, BODEN], [12590, 12680, BODEN + 30]] });
hoehlen.push({ links: 12420, rechts: 12800, oben: BODEN, unten: 950, art: 'schacht', wasser: true });
nahkaempfer(12540, 12450, 12640, 4, 950);                                  // unten in der Schlucht
fernkaempfer(12745, 12712, 12778, 3, BODEN + 95);                          // auf dem Absatz
granate(12480, 950);
nahkaempfer(12850, 12820, 12880, 3);                                       // zwischen Schlucht und Hügel 3
// Hügel 3
sanfterHuegel(12896, 480, 64, 0.4);
nahkaempfer(13140, 13065, 13215, 4, BODEN - 64);
fernkaempfer(13190, 13090, 13200, 4, BODEN - 64);
munition(13120, BODEN - 64);

// =====================================================================
// ZONE H: Vor der Arena (x 13400 bis 13850). Hier rüstet man sich aus.
// =====================================================================
signs.push({ x: 13500, y: BODEN - 100, text: 'Etwas Großes wartet voraus...' });
gelaende(13440, [[0, 0], [96, 64], [288, 64], [384, 0]]);       // Anhöhe vor der Arena
schrotflinte(13845);                              // Alternative zum Gewehr für den Bosskampf (unten am Hang)
granate(13560, BODEN - 64);                       // vor dem Boss: Granaten aufsparen
heilung(13620, BODEN - 64);
munition(13670, BODEN - 64);
munition(13715, BODEN - 64);

// =====================================================================
// ZONE I: Arena der starken Kreatur (x 13900 bis 14700).
// Drei Plattformen zum Ausweichen. Ihre Unterkante liegt über dem Kopf der Kreatur (Höhe 100),
// sie kann darunter durchlaufen.
// =====================================================================
schwebend(14040, BODEN - 120, 140);
schwebend(14230, BODEN - 170, 140);
schwebend(14420, BODEN - 120, 140);

// =====================================================================
// Explosive Fässer: stehen bei Gegnergruppen. Ein Schuss oder eine Granate lässt sie explodieren,
// benachbarte Fässer folgen (Kettenreaktion). Auch der Spieler nimmt Schaden: Abstand halten!
// =====================================================================
fass(1240, BODEN - 96);                      // Zone A, beim ersten Gegner
fass(1850, BODEN - 140);                     // Zone B, auf dem Deck beim Schützen
fass(2150);
fass(3430, BODEN - 192);                     // Zone D, auf dem Gipfel
fass(3620, TUNNEL_BODEN);                    // im Tunnel zwischen den Kisten
fass(5100, BODEN - 64); fass(5330);          // Zone E, auf dem offenen Feld
fass(6250);                                  // Zone G, vor dem Hochhaus
fass(6590, BODEN - 300);                     // im Hochhaus (Etage 3)
fass(7330); fass(7930, BODEN - 96);          // Zone J, vor dem Schacht und auf der Klippe
fass(8900, MINE_BODEN);                      // in der Kaverne
fass(10200);                                 // am Funkturm
fass(14100); fass(14550);                    // in der Boss-Arena: den Boss damit locken
fass(11240, BODEN - 96); fass(12140, BODEN - 128); fass(13160, BODEN - 64);   // im Tal der Brücken

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
    boss: { x: 8250 + V, y: BODEN - 60, left: 7980 + V, right: 8650 + V, hp: 50 },
    pickups,
    faesser,
    bruecken,
    treppen,
    wracks,
    huegelformen,
    hoehlen,
    lampen,
};
