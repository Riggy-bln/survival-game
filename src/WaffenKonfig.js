// Alle Zahlen der Waffen an EINER Stelle (Balancing). Hier ändert man Schaden, Munition, Feuerrate usw., ohne den Spielcode anzufassen.
// Wo die Waffen im Level liegen, steht NICHT hier, sondern in WaffenPlatzierung.js.

// Ausrüstung beim Spielstart
export const START = {
    messer: 5,          // so viele Wurfmesser hat man am Anfang (zusätzlich zu den Fäusten)
};

// Wurfmesser: Sie bleiben nach dem Wurf im Level liegen (oder stecken in einer Wand) und müssen wieder aufgesammelt werden.
export const MESSER = {
    schaden: 2,             // Schaden bei einem Treffer (normale Gegner haben 3 Leben, die Faust macht 1, das Schwert 2)
    tempo: 820,             // Fluggeschwindigkeit (Pixel pro Sekunde)
    schwerkraft: 330,       // wie stark das Messer fällt (0 = fliegt völlig gerade; die Welt hat 900)
    pause: 340,             // Pause zwischen zwei Würfen (ms)
    aufhebenNach: 350,      // so lange nach dem Landen kann man es noch nicht aufheben (ms), damit man es nicht sofort wieder einsammelt
    reichweite: 1100,       // weiter fliegt es höchstens (Pixel), danach fällt es zu Boden
};

// Die Waffen. typ bestimmt, wie sie schießt:
//   'kugel'    Kugeln aus einem Magazin (pistol, rifle = Maschinengewehr, shotgun)
//   'rakete'   Rakete mit Flächenschaden
//   'flamme'   Dauerfeuer aus Treibstoff, brennt Gegner an
// fireDelay = Pause zwischen Schüssen (ms), magSize = Magazin, reloadTime = Nachladezeit (ms),
// startReserve = Reserve beim ersten Aufheben, maxReserve = so viel kann man höchstens tragen,
// halbauto: true = ein Schuss pro Mausklick (Dauerdrücken schießt nicht weiter)
export const WAFFEN = {
    pistol:  { name: 'Pistol',         typ: 'kugel', fireDelay: 150, halbauto: true, magSize: 12, reloadTime: 1200, startReserve: 24, maxReserve: 60 },
    rifle:   { name: 'Machine gun',    typ: 'kugel', fireDelay: 85,  magSize: 30, reloadTime: 1700, startReserve: 60, maxReserve: 120 },
    // Schrotflinte: pellets = Schrotkugeln pro Schuss, spread = Streuung (Bogenmaß), range = Reichweite (ms Flugzeit)
    shotgun: { name: 'Shotgun',        typ: 'kugel', fireDelay: 700, magSize: 6, reloadTime: 2000, pellets: 6, spread: 0.3, range: 330, startReserve: 12, maxReserve: 30 },
    // Raketenwerfer: magSize 1 = nach jedem Schuss wird nachgeladen. radius und schaden gelten für die Explosion (Gegner im Radius).
    rocket:  { name: 'Rocket launcher', typ: 'rakete', fireDelay: 900, halbauto: true, magSize: 1, reloadTime: 1800, startReserve: 3, maxReserve: 8,
               tempo: 560, radius: 120, schaden: 6, selbstschaden: 25 },
    // Flammenwerfer: Treibstoff statt Munition. verbrauch = Treibstoff pro Sekunde, reichweite in Pixeln, kegel = halber Öffnungswinkel (Bogenmaß).
    // Gegner im Kegel nehmen alle "tick" ms den Schaden "schaden" und brennen danach noch "brenndauer" ms weiter (Schaden alle "brandTick" ms).
    flame:   { name: 'Flamethrower',   typ: 'flamme', maxTreibstoff: 100, startTreibstoff: 100, verbrauch: 14, reichweite: 190, kegel: 0.3,
               tick: 160, schaden: 0.5, brenndauer: 2200, brandTick: 400, brandSchaden: 0.5 },
};

// Wie viel gibt eine Munitionskiste (ammo-Gegenstand im Level) bzw. ein zweites Exemplar derselben Waffe?
export const NACHSCHUB = {
    treibstoff: 50,     // Prozentpunkte Treibstoff für den Flammenwerfer
    raketen: 2,         // Raketen
};
