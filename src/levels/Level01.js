// Level 01: Verlassene Militärzone (9000 Pixel breit).
// Die Datei enthält fast nur DATEN. Kleine Hilfsfunktionen sorgen dafür, dass wir
// Hügel, Plattformen, Gegner und Gegenstände mit einfachen Angaben setzen können.
//
// Koordinaten: x = waagerecht, y = senkrecht (0 oben, 1100 unten). Die Oberfläche liegt bei y = BODEN.
// Alle Höhen werden relativ zu BODEN angegeben: BODEN - 100 liegt 100 Pixel ÜBER der Oberfläche.
// Der Spieler springt etwa 150 Pixel hoch und rund 280 Pixel weit.
// Deshalb gilt in diesem Level: Stufen sind höchstens 100 hoch, Lücken höchstens 150 breit.

const HOEHE = 1100;  // Höhe der ganzen Welt: oben Platz für Gebäude, unten für Tunnel
const BODEN = 760;   // Höhe der Oberfläche (Oberkante des Bodens)

// Farben
const ERDE = 0x5b4a35;
const BETON = 0x6a6f73;
const BUNKER = 0x45494d;
const SAND = 0x8a7a55;
const GRAU = 0x5a5a5a;
const OLIV = 0x4a5238;

// Die Listen, die am Ende exportiert werden. Die Hilfsfunktionen füllen sie.
const platforms = [];
const decor = [];
const enemies = [];
const rangedEnemies = [];
const pickups = [];
const signs = [];

// Die Erde: eine dicke Platte von der Oberfläche bis ganz nach unten, über die ganze Welt.
platforms.push({ x: 4500, y: BODEN + (HOEHE - BODEN) / 2, w: 9000, h: HOEHE - BODEN, color: 0x4b3b2a });

// huegel: ein fester Block, der AUF DEM BODEN steht. Angabe: linke Kante, Höhe, Breite.
// Aus der Höhe wird die Mitte berechnet (Rechtecke werden von ihrer Mitte aus gezeichnet).
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

// Dekoration (ohne Physik)
const stacheldraht = (x) => {
    decor.push({ x: x, y: BODEN - 15, w: 6, h: 30, color: 0x555555 });
    decor.push({ x: x + 60, y: BODEN - 15, w: 6, h: 30, color: 0x555555 });
    decor.push({ x: x + 30, y: BODEN - 22, w: 60, h: 3, color: 0x999999 });
    decor.push({ x: x + 30, y: BODEN - 10, w: 60, h: 3, color: 0x999999 });
};
const versorgungspunkt = (x) => {
    decor.push({ x: x, y: BODEN - 20, w: 70, h: 40, color: 0x5b4a2e });        // Kiste
    decor.push({ x: x, y: BODEN - 20, w: 24, h: 6, color: 0xdd3333 });         // rotes Kreuz
    decor.push({ x: x, y: BODEN - 20, w: 6, h: 24, color: 0xdd3333 });
    decor.push({ x: x, y: BODEN - 60, w: 6, h: 40, color: 0x555555 });         // Fahnenmast
    decor.push({ x: x + 16, y: BODEN - 72, w: 26, h: 14, color: 0xdd3333 });   // Fahne
    signs.push({ x: x, y: BODEN - 105, text: 'Versorgungspunkt' });
};

// =====================================================================
// ZONE A: Einstieg (x 0 bis 1400). Ruhig, mit niedrigen Hindernissen zum Üben.
// =====================================================================
signs.push({ x: 150, y: BODEN - 80, text: 'A / D: Laufen\nLeertaste: Springen\nR: Nachladen' });
munition(180);                                   // früh: Einsammeln üben
huegel(250, 30, 100, SAND);                      // Sandsäcke, niedrig
huegel(350, 60, 100, SAND);                      // Sandsäcke, höher
stacheldraht(470);                               // nur Dekoration
huegel(600, 100, 30, GRAU);                      // zerstörte Mauer (100)
huegel(760, 60, 220, OLIV);                      // ausgebranntes Fahrzeug
signs.push({ x: 1000, y: BODEN - 120, text: 'Maus: Zielen\nLinke Taste: Schießen' });
nahkaempfer(1150, 1050, 1350, 3);                // der erste Gegner

// =====================================================================
// ZONE B: Ruine mit zwei Etagen (x 1450 bis 2300).
// Oben (Deck) kämpft ein Schütze, darunter patrouilliert ein Nahkämpfer.
// =====================================================================
huegel(1450, 60, 160, BETON);                    // Stufe zum Deck
schwebend(1600, BODEN - 140, 360);                       // Deck (Oberkante 360), x 1600 bis 1960
schwebend(2010, BODEN - 240, 110);                       // kleines Versteck darüber (Oberkante 260)
fernkaempfer(1780, 1660, 1900, 3, BODEN - 140);          // Schütze auf dem Deck
nahkaempfer(1800, 1650, 1930, 4);                // Nahkämpfer darunter
heilung(2065, BODEN - 240);                              // versteckte Heilung im Versteck
nahkaempfer(2200, 2080, 2330, 3);

// =====================================================================
// ZONE C: Versorgungspunkt 1 (x 2450 bis 2750). Ruhig, ein Atemzug.
// =====================================================================
versorgungspunkt(2600);
heilung(2560);
munition(2640);

// =====================================================================
// ZONE D: Grabenanlage mit Terrassen (x 2900 bis 3900).
// Der Graben liegt zwischen zwei Terrassen. Schützen oben, Nahkämpfer unten.
// =====================================================================
signs.push({ x: 2900, y: BODEN - 100, text: 'Gefahr voraus:\nSchützen auf den Terrassen' });
huegel(2980, 40, 80, SAND);                      // Deckung am Eingang
huegel(3050, 90, 140);                           // linke Terrasse, untere Stufe (x 3050 bis 3190)
huegel(3190, 180, 140);                          // linke Terrasse, obere Stufe  (x 3190 bis 3330)
huegel(3530, 180, 140);                          // rechte Terrasse, obere Stufe (x 3530 bis 3670)
huegel(3670, 90, 140);                           // rechte Terrasse, untere Stufe (x 3670 bis 3810)
schwebend(3380, BODEN - 200, 100, GRAU);                 // Brücke über dem Graben
munition(3430, BODEN - 200);                             // Belohnung auf der Brücke
fernkaempfer(3270, 3215, 3305, 3, BODEN - 180);          // Schütze links oben (Oberkante 320)
fernkaempfer(3600, 3555, 3645, 3, BODEN - 180);          // Schütze rechts oben
fernkaempfer(3740, 3695, 3785, 3, BODEN - 90);          // Schütze rechts unten (Oberkante 410)
nahkaempfer(3430, 3350, 3510, 4);                // Nahkämpfer im Graben
huegel(3900, 110, 30, GRAU);                     // hohe Mauer als Deckung

// =====================================================================
// ZONE E: Bunker (x 4100 bis 5600). Eine Pyramide aus drei Etagen zum Überklettern,
// danach ein offenes Feld mit Sandsack-Deckungen.
// =====================================================================
signs.push({ x: 4180, y: BODEN - 120, text: 'Bunker voraus:\nGegner auf mehreren Etagen' });
huegel(4300, 100, 480, BUNKER);                  // untere Etage (Oberkante 400), x 4300 bis 4780
huegel(4400, 200, 300, BUNKER);                  // mittlere Etage (Oberkante 300), x 4400 bis 4700
huegel(4500, 300, 100, BUNKER);                  // Dach (Oberkante 200), x 4500 bis 4600
fernkaempfer(4550, 4515, 4585, 4, BODEN - 300);          // Scharfschütze auf dem Dach
fernkaempfer(4650, 4625, 4680, 3, BODEN - 200);          // Schütze auf der mittleren Etage
// Wichtig: Die Patrouille muss zu den freien Flächen passen. Ein Gegner hat 32 Pixel Breite,
// also reicht er 16 Pixel über seine Grenzen hinaus. Sonst stößt er an die nächste Etage.
nahkaempfer(4350, 4320, 4380, 4, BODEN - 100);           // Nahkämpfer unten links
nahkaempfer(4740, 4725, 4760, 4, BODEN - 100);           // Nahkämpfer unten rechts
munition(4550, BODEN - 300);                             // Belohnung auf dem Dach
huegel(4900, 40, 80, SAND);                      // offenes Feld: drei Sandsack-Deckungen
huegel(5100, 40, 80, SAND);
huegel(5300, 40, 80, SAND);
nahkaempfer(5040, 5000, 5080, 3);
nahkaempfer(5240, 5200, 5280, 3);
fernkaempfer(5470, 5400, 5560, 3);               // Schütze hinter den Deckungen
stacheldraht(5560);

// =====================================================================
// ZONE F: Versorgungspunkt 2 (x 5700 bis 6000).
// =====================================================================
versorgungspunkt(5850);
heilung(5810);
munition(5890);

// =====================================================================
// ZONE G: Plateaus in verschiedenen Höhen (x 6100 bis 7350).
// Oben Schützen auf Plattformen, unten Nahkämpfer. Man kann oben oder unten durchlaufen.
// =====================================================================
signs.push({ x: 6050, y: BODEN - 80, text: 'Gegner oben UND unten' });
schwebend(6150, BODEN - 120, 160);
schwebend(6420, BODEN - 180, 160);
schwebend(6690, BODEN - 240, 160);
schwebend(6960, BODEN - 180, 160);
schwebend(7200, BODEN - 120, 120);
munition(6230, BODEN - 120);
heilung(6770, BODEN - 240);
fernkaempfer(6500, 6445, 6555, 3, BODEN - 180);
fernkaempfer(6770, 6715, 6825, 4, BODEN - 240);
fernkaempfer(7040, 6985, 7095, 3, BODEN - 180);
nahkaempfer(6300, 6150, 6450, 4);
nahkaempfer(6900, 6700, 7100, 4);

// =====================================================================
// ZONE H: Vor der Arena (x 7400 bis 7850). Hier rüstet man sich aus.
// =====================================================================
signs.push({ x: 7500, y: BODEN - 100, text: 'Etwas Großes wartet voraus...' });
heilung(7600);
munition(7660);
munition(7720);

// =====================================================================
// ZONE I: Arena der starken Kreatur (x 7900 bis 8700).
// Drei Plattformen zum Ausweichen. Ihre Unterkante liegt über dem Kopf der Kreatur (Höhe 100),
// sie kann darunter durchlaufen.
// =====================================================================
schwebend(8040, BODEN - 120, 140);
schwebend(8230, BODEN - 170, 140);
schwebend(8420, BODEN - 120, 140);

export default {
    width: 9000,     // Breite der Welt in Pixeln
    height: HOEHE,   // Höhe der Welt in Pixeln
    boden: BODEN,    // Höhe der Oberfläche
    goalX: 8800,     // Mitte des Evakuierungspunkts (Hubschrauber)
    platforms,
    decor,
    signs,
    enemies,
    rangedEnemies,
    boss: { x: 8250, y: BODEN - 60, left: 7980, right: 8650, hp: 50 },
    pickups,
};
