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

        // ---- weiter hinten (vorerst wie zuvor) ----
        { x: 2100, y: 330, w: 200, h: 20 },
        { x: 2500, y: 250, w: 200, h: 20 },
        { x: 3000, y: 380, w: 300, h: 20 },
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
        { x: 150,  y: 420, text: 'A / D: Laufen\nLeertaste: Springen' },
        { x: 1000, y: 380, text: 'Maus: Zielen\nLinke Taste: Schießen' },
        { x: 1620, y: 395, text: 'Versorgungspunkt' },
    ],

    // Gegner. left und right sind die Grenzen ihrer Patrouille.
    enemies: [
        { x: 1150, y: 450, left: 1000, right: 1300 },   // Abschnitt 2: der erste Gegner
        { x: 2150, y: 450, left: 2000, right: 2350 },
    ],

    // Gegenstände zum Aufsammeln. type: 'ammo' (Munition) oder 'health' (Heilung).
    pickups: [
        { x: 200,  y: 490, type: 'ammo' },     // früh im Level: Einsammeln üben
        { x: 1600, y: 490, type: 'health' },   // Versorgungspunkt
        { x: 1680, y: 490, type: 'ammo' },     // Versorgungspunkt
        { x: 1750, y: 350, type: 'ammo' },     // versteckt auf dem hohen Versteck
        { x: 2500, y: 230, type: 'health' },   // auf der hohen Plattform
        { x: 2800, y: 490, type: 'ammo' },
    ],
};
