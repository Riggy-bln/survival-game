// ======================================================================================================================
//  WO LIEGEN DIE WAFFEN?  Hier legst DU für jedes Level fest, wo welche Waffe liegt und wie die Entdeckung wirkt.
//  Nur diese Datei enthält Waffen-Koordinaten. Der Waffentausch und alles andere funktioniert in jedem Level gleich.
// ======================================================================================================================
//
//  Man trägt immer nur EINE Schusswaffe. Findet man eine zweite, öffnet sich der Waffentausch (Taste E): Man wählt, welche man behält,
//  die andere bleibt am Boden liegen und kann später wieder geholt werden. Messer sind davon unabhängig.
//
//  AUFBAU: Jedes Level hat drei Listen:
//    waffen   die Gegenstände (siehe unten)
//    schilder Hinweistafeln in der Landschaft: { x, y, text }   (Teil der Vorfreude: sie zeigen, dass hier etwas wartet)
//    zonen    unsichtbare Bereiche, die beim ersten Betreten einen leisen Hinweis auslösen: { x, y, radius, text }
//
//  EIN EINTRAG in "waffen":
//      { weaponType: 'rocketLauncher', x: 10520, y: 2054,
//        route: 'optional',          // 'haupt' = liegt auf dem Weg, 'optional' = Abstecher oder Rätsel (nur zur Info, ändert nichts am Spiel)
//        entdeckung: 'gross',        // 'gross' = Fund wird gefeiert (Fanfare, Banner, Lichtschein); 'normal' = kurze Meldung; 'klein' = nur ein Klang
//        leuchten: true,             // leiser Lichtschein, der erst aus der Nähe (ca. 650 Pixel) sichtbar wird
//        notiz: '...' }              // freie Notiz für dich (wird nicht benutzt)
//  weaponType: 'pistol', 'machineGun', 'shotgun', 'rocketLauncher', 'flamethrower', dazu die Nachschub-Kisten 'rocketAmmo' und 'fuel'.
//  Optional bei Waffen: ammo: { mag: 6, res: 10 } legt fest, mit wie viel Munition sie liegt (sonst die Startwerte aus WaffenKonfig.js).
//
//  KOORDINATEN: wie überall im Spiel in Pixeln. x = 0 ist der linke Rand und wächst nach rechts, y = 0 ist der obere Rand und WÄCHST NACH UNTEN.
//  Die Zahl steht für die MITTE des Gegenstands. Ein Gegenstand steht auf dem Boden, wenn y = Oberkante des Bodens minus halbe Höhe (etwa 10).
//  Beispiel: Boden-Oberkante 1000 -> y = 990. Das Level ist in 56-Pixel-Zellen gebaut; die Oberkanten sind 48 + n * 56 (944, 1000, 1056 ...).
//
//  SO FINDEST DU KOORDINATEN: Öffne das Spiel mit  ?debug=1  (z. B. http://localhost:8001/?debug=1). Links unten stehen dann die Position
//  des Spielers und der Maus. Strg + Klick schreibt die Mausposition als fertige Zeile in die Konsole. Mit ?x=4000&y=900 startest du direkt dort.
//  Zum Testen: ?waffe=rocket beginnt das Spiel mit einer Waffe in der Hand (pistol, rifle, shotgun, rocket, flame).
//
//  Die Level: 'kombi' = Standard-Level (/), 'neu' = ?level=neu, 'alt' = ?level=alt.
//  Alle Eintragungen wurden gegen die Level-Geometrie geprüft: Der Gegenstand steht auf festem Boden, mit freiem Kopfraum, nicht in einer Wand.
//
//  PLAN für das Standard-Level (Kombi), in Spielreihenfolge von links nach rechts:
//   1. PISTOLE (haupt, klein):    gleich hinter dem ersten Gegner und dem Zielen-Schild. Man lernt erst die Wurfmesser, dann das Schießen.
//   2. MASCHINENGEWEHR (optional): am Ende des verlassenen Depots 7 (Höhle unter der Startebene): "They came from below." Früher Abstecher.
//   3. SCHROTFLINTE (optional):   auf der hohen Insel (Leiter nach oben), mit einem Skelett als Wächter.
//   4. MASCHINENGEWEHR (optional): zweite Chance in einer Höhle bei x 8700, falls man es unterwegs gegen eine andere Waffe getauscht hat.
//   5. RAKETENWERFER (optional, groß): im "Tresor" am Ende des langen, tiefen Tunnels (Schild: "risky, but it pays off"), mit Gegnern auf dem Weg.
//   6. FLAMMENWERFER (optional, groß): ganz oben auf dem Himmelsweg der Wegkreuzung "surface, tunnel or sky", nach einer Treppe und Skeletten.
//   7. NACHSCHUB vor dem Endboss: Raketen und Treibstoff am Lager, das das Schild "Stock up and fight smart!" meint.
//   8. SCHROTFLINTE in der Boss-Arena (haupt): eine Wahl mitten im Kampf.
// ======================================================================================================================

export const WAFFEN_PLATZIERUNG = {
    // ---- Standard-Level (Anfang des alten Levels + neues Level bis zur Boss-Arena) ----
    kombi: {
        waffen: [
            { weaponType: 'pistol', x: 1030, y: 934, route: 'haupt', entdeckung: 'klein',
              notiz: 'Erste Waffe: nach dem ersten Gegner (x 870) und dem Schild "Mouse: Aim, Left click: Shoot" (x 1000).' },
            { weaponType: 'machineGun', x: 4690, y: 1220, route: 'optional', entdeckung: 'normal', leuchten: true,
              notiz: 'Depot 7 (Höhle ab x 2744, Lager x 4088 bis 4760): "Abandoned. They came from below."' },
            { weaponType: 'shotgun', x: 6356, y: 430, route: 'optional', entdeckung: 'normal',
              notiz: 'Hohe Insel über der Startebene, ein Skelett bewacht sie.' },
            { weaponType: 'machineGun', x: 8708, y: 1158, route: 'optional', entdeckung: 'klein',
              notiz: 'Zweite Chance für das Maschinengewehr (Höhle x 8008 bis 9142).' },
            { weaponType: 'rocketLauncher', x: 10520, y: 2054, route: 'optional', entdeckung: 'gross', leuchten: true,
              notiz: 'Der Tresor am Ende des tiefen Tunnels (x 7560 bis 11032, y 1840 bis 2064). Drei Gegner im Tunnel, am Ende die Plattform mit Munition und Verbandskasten.' },
            { weaponType: 'flamethrower', x: 15700, y: 92, route: 'optional', entdeckung: 'gross', leuchten: true,
              notiz: 'Himmelsweg: Treppe ab x 13608 bis zum obersten Gang (Oberkante y 104), Skelette, am Ende des Gangs bei x 15736.' },
            { weaponType: 'rocketAmmo', x: 18260, y: 598, route: 'haupt', entdeckung: 'klein', notiz: 'Lager vor dem Boss (Schild "Stock up").' },
            { weaponType: 'fuel', x: 18330, y: 596, route: 'haupt', entdeckung: 'klein' },
            { weaponType: 'shotgun', x: 19124, y: 598, route: 'haupt', entdeckung: 'klein', notiz: 'In der Boss-Arena.' },
        ],
        schilder: [
            { x: 1030, y: 902, text: 'A dropped sidearm.\nOne gun at a time:\nswap with E' },
            { x: 10180, y: 2040, text: 'Something heavy was\nstored down here...' },
            { x: 13640, y: 392, text: 'Higher ground.\nThe scorched path\nleads up.' },
        ],
        zonen: [
            { x: 10060, y: 2060, radius: 260, text: 'A faint glow ahead.' },
            { x: 15000, y: 100, radius: 330, text: 'The air shimmers with heat.' },
            { x: 4400, y: 1230, radius: 260, text: 'Faint light at the far end of the depot.' },
        ],
    },

    // ---- ?level=neu (das neue Level allein: gleiche Orte, x um 4872 nach links verschoben) ----
    neu: {
        waffen: [
            { weaponType: 'pistol', x: 480, y: 990, route: 'haupt', entdeckung: 'klein' },
            { weaponType: 'machineGun', x: 3836, y: 1158, route: 'optional', entdeckung: 'normal', leuchten: true },
            { weaponType: 'shotgun', x: 1484, y: 430, route: 'optional', entdeckung: 'normal' },
            { weaponType: 'rocketLauncher', x: 5648, y: 2054, route: 'optional', entdeckung: 'gross', leuchten: true },
            { weaponType: 'flamethrower', x: 10828, y: 92, route: 'optional', entdeckung: 'gross', leuchten: true },
            { weaponType: 'rocketAmmo', x: 13388, y: 598, route: 'haupt', entdeckung: 'klein' },
            { weaponType: 'fuel', x: 13458, y: 596, route: 'haupt', entdeckung: 'klein' },
            { weaponType: 'shotgun', x: 14252, y: 598, route: 'haupt', entdeckung: 'klein' },
        ],
        schilder: [
            { x: 5308, y: 2040, text: 'Something heavy was\nstored down here...' },
            { x: 8768, y: 392, text: 'Higher ground.\nThe scorched path\nleads up.' },
        ],
        zonen: [
            { x: 5188, y: 2060, radius: 260, text: 'A faint glow ahead.' },
            { x: 10128, y: 100, radius: 330, text: 'The air shimmers with heat.' },
        ],
    },

    // ---- ?level=alt (das frühere lange Level) ----
    alt: {
        waffen: [
            { weaponType: 'pistol', x: 1030, y: 694, route: 'haupt', entdeckung: 'klein' },
            { weaponType: 'machineGun', x: 4690, y: 980, route: 'optional', entdeckung: 'normal' },
            { weaponType: 'shotgun', x: 6510, y: 1266, route: 'optional', entdeckung: 'normal' },
            { weaponType: 'shotgun', x: 16045, y: 750, route: 'haupt', entdeckung: 'klein' },
        ],
        schilder: [],
        zonen: [],
    },
};

// Welcher Name steht in Auswahl.js für welches Level? (Nicht ändern.)
export const WAFFEN_TYP = {          // weaponType -> interner Name
    pistol: 'pistol', machineGun: 'rifle', shotgun: 'shotgun', rocketLauncher: 'rocket', flamethrower: 'flame',
    rocketAmmo: 'rocketAmmo', fuel: 'fuel',
};
