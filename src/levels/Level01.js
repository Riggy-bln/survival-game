// Level 01: reine DATEN, keine Logik.
// GameScene.js liest diese Listen und baut daraus die Welt.
// Koordinaten: x = waagerecht, y = senkrecht (0 oben, 540 unten).
// Bei Plattformen und Gegenständen ist (x, y) die MITTE des Objekts.
export default {
    width: 4000,   // Breite der Welt in Pixeln

    // Feste Flächen, auf denen man stehen kann. w = Breite, h = Höhe.
    // "color" ist optional; ohne Angabe nimmt die Szene eine Standardfarbe.
    platforms: [
        { x: 2000, y: 520, w: 4000, h: 40, color: 0x4b3b2a },  // Boden über die ganze Welt
        { x: 700,  y: 400, w: 200, h: 20 },
        { x: 1100, y: 320, w: 200, h: 20 },
        { x: 1600, y: 400, w: 300, h: 20 },
        { x: 2100, y: 330, w: 200, h: 20 },
        { x: 2500, y: 250, w: 200, h: 20 },
        { x: 3000, y: 380, w: 300, h: 20 },
    ],

    // Gegner. left und right sind die Grenzen ihrer Patrouille.
    enemies: [
        { x: 900,  y: 450, left: 750,  right: 1050 },
        { x: 1900, y: 450, left: 1750, right: 2150 },
    ],

    // Gegenstände zum Aufsammeln. type: 'ammo' (Munition) oder 'health' (Heilung).
    pickups: [
        { x: 600,  y: 490, type: 'ammo' },
        { x: 1100, y: 300, type: 'health' },   // auf der Plattform bei x = 1100
        { x: 1450, y: 490, type: 'ammo' },
        { x: 2500, y: 230, type: 'health' },   // auf der hohen Plattform
        { x: 2800, y: 490, type: 'ammo' },
    ],
};
