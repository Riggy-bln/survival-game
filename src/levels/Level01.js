// Level 01: reine DATEN, keine Logik.
// GameScene.js liest diese Listen und baut daraus die Welt.
// Koordinaten: x = waagerecht, y = senkrecht (0 oben, 540 unten).
// Bei allen Objekten ist (x, y) die MITTE. Die Boden-Oberkante liegt bei y = 500.
// Faustregel: Ein Objekt der Höhe h, das auf dem Boden steht, hat y = 500 - h / 2.
// Der Spieler springt etwa 150 Pixel hoch. Hindernisse zum Überspringen bleiben darunter.
export default {
    width: 4000,   // Breite der Welt in Pixeln

    // Feste Flächen, auf denen man stehen kann. w = Breite, h = Höhe.
    // "color" ist optional; ohne Angabe nimmt die Szene eine Standardfarbe.
    platforms: [
        { x: 2000, y: 520, w: 4000, h: 40, color: 0x4b3b2a },  // Boden über die ganze Welt

        // ---- Abschnitt 1: Einstieg (x 0 bis 900) ----
        { x: 300, y: 485, w: 100, h: 30, color: 0x8a7a55 },    // Sandsäcke, niedrig (30)
        { x: 420, y: 470, w: 100, h: 60, color: 0x8a7a55 },    // Sandsäcke, höher (60)
        { x: 620, y: 450, w: 30,  h: 100, color: 0x5a5a5a },   // zerstörte Mauer (100)
        { x: 800, y: 470, w: 220, h: 60, color: 0x4a5238 },    // ausgebranntes Militärfahrzeug

        // ---- Abschnitt 2: Erste Begegnung (x 900 bis 1400) ----
        { x: 1200, y: 400, w: 160, h: 20 },                    // Plattform zum Ausweichen

        // ---- Abschnitt 3: Versorgungspunkt (x 1500 bis 1800) ----
        { x: 1750, y: 380, w: 120, h: 20 },                    // Versteck mit Extra-Munition

        // ---- Abschnitt 4: Gefährlicherer Bereich (x 1950 bis 3100) ----
        // Der "Graben" ist der Boden zwischen zwei Erdwällen (je 90 hoch, also überspringbar).
        { x: 2010, y: 480, w: 80,  h: 40, color: 0x8a7a55 },   // Sandsäcke am Eingang (Deckung)
        { x: 2200, y: 455, w: 200, h: 90, color: 0x5b4a35 },   // Erdwall links  (x 2100 bis 2300)
        { x: 2600, y: 455, w: 200, h: 90, color: 0x5b4a35 },   // Erdwall rechts (x 2500 bis 2700)
        { x: 2400, y: 330, w: 140, h: 20 },                    // Brücke über dem Graben (Umweg)
        { x: 2900, y: 445, w: 30,  h: 110, color: 0x5a5a5a },  // hohe Mauer: Deckung vor dem Ende

        // ---- Abschnitt 5: Arena der starken Kreatur (x 3250 bis 3680) ----
        // Zwei Sprungplattformen zum Ausweichen vor dem Sturmangriff. Ihre Unterkante (390)
        // liegt über dem Kopf der Kreatur (404), sie kann also darunter durchlaufen.
        { x: 3360, y: 380, w: 120, h: 20 },
        { x: 3580, y: 380, w: 120, h: 20 },
    ],

    // Dekoration OHNE Physik: nur zum Anschauen, man läuft hindurch.
    // Reihenfolge = Zeichenreihenfolge (spätere liegen oben).
    decor: [
        // Stacheldraht (Abschnitt 1): zwei Pfosten und ein Draht dazwischen
        { x: 500, y: 485, w: 6,  h: 30, color: 0x555555 },
        { x: 560, y: 485, w: 6,  h: 30, color: 0x555555 },
        { x: 530, y: 478, w: 60, h: 3,  color: 0x999999 },
        { x: 530, y: 490, w: 60, h: 3,  color: 0x999999 },

        // Versorgungspunkt (Abschnitt 3): Kiste mit rotem Kreuz
        { x: 1620, y: 480, w: 70, h: 40, color: 0x5b4a2e },
        { x: 1620, y: 480, w: 24, h: 6,  color: 0xdd3333 },
        { x: 1620, y: 480, w: 6,  h: 24, color: 0xdd3333 },
        { x: 1620, y: 440, w: 6,  h: 40, color: 0x555555 },    // Fahnenmast
        { x: 1636, y: 428, w: 26, h: 14, color: 0xdd3333 },    // Fahne
    ],

    // Hinweisschilder (Text in der Welt) für die Lernphase
    signs: [
        { x: 1960, y: 400, text: 'Gefahr voraus:\nSchützen auf den Wällen' },
        { x: 150,  y: 420, text: 'A / D: Laufen\nLeertaste: Springen' },
        { x: 1000, y: 380, text: 'Maus: Zielen\nLinke Taste: Schießen' },
        { x: 1620, y: 395, text: 'Versorgungspunkt' },
        { x: 3200, y: 400, text: 'Etwas Großes wartet voraus...' },
    ],

    // Gegner. left und right sind die Grenzen ihrer Patrouille.
    enemies: [
        { x: 1150, y: 450, left: 1000, right: 1300 },   // Abschnitt 2: der erste Gegner
        { x: 2400, y: 450, left: 2320, right: 2480 },   // Abschnitt 4: im Graben, zwischen den Wällen
    ],

    // Die starke Kreatur (Abschnitt 5). left/right begrenzen die Arena, in der sie bleibt.
    boss: { x: 3480, y: 440, left: 3300, right: 3640 },

    // Fernkämpfer: bleiben auf Abstand und schießen. left/right begrenzen, wohin sie ausweichen.
    rangedEnemies: [
        { x: 2600, y: 370, left: 2530, right: 2670 },   // Abschnitt 4: Schütze auf dem rechten Wall
        { x: 3020, y: 450, left: 2960, right: 3100 },   // Abschnitt 4: Schütze hinter der hohen Mauer
    ],

    // Gegenstände zum Aufsammeln. type: 'ammo' (Munition) oder 'health' (Heilung).
    pickups: [
        { x: 200,  y: 490, type: 'ammo' },     // früh im Level: Einsammeln üben
        { x: 1600, y: 490, type: 'health' },   // Versorgungspunkt
        { x: 1680, y: 490, type: 'ammo' },     // Versorgungspunkt
        { x: 1750, y: 350, type: 'ammo' },     // versteckt auf dem hohen Versteck
        { x: 2400, y: 300, type: 'health' },   // auf der Brücke: Belohnung für den Umweg
        { x: 2350, y: 490, type: 'ammo' },     // im Graben: riskant, aber lohnend
        { x: 2800, y: 490, type: 'ammo' },     // zwischen Wall und hoher Mauer

        // Vorbereitung vor der Arena (Abschnitt 5): Wer bis hierher kommt, soll gerüstet sein.
        { x: 3140, y: 490, type: 'health' },
        { x: 3180, y: 490, type: 'ammo' },
        { x: 3220, y: 490, type: 'ammo' },
    ],
};
