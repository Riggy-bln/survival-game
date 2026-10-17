// ======================================================================================================================
//  TREFFER-EFFEKTE: Blut, Gore und der nasse Treffer-Klang. Alle Einstellungen an EINER Stelle.
// ======================================================================================================================
//  Die Spiellogik (Schaden, Waffen) wird hier nicht berührt. Diese Datei steuert nur, wie Treffer aussehen und klingen.

export const TREFFER = {
    // ---- Gesamtregler ----
    gore: 1,              // Gesamtstärke der ZUSÄTZLICHEN Gore-Effekte (große Spritzer, Brocken, Gedärme, abgetrennte Glieder):
                          //   0 = aus (normales Blut bleibt), 1 = normal, 2 = doppelt so oft und kräftig
    blutMenge: 1,         // Menge des normalen Bluts (Tropfen und Spritzer): 0 = kein Blut, 1 = normal, 2 = doppelt
    intensitaetMax: 2.2,  // so stark darf ein einzelner Treffer höchstens wirken (Obergrenze nach allen Faktoren)

    // ---- Das normale Blut (jeder Treffer) ----
    blut: {
        tropfen: 7,                 // Grundzahl kleiner, schneller Tropfen bei Stärke 1
        spritzer: 2,                // Grundzahl größerer, langsamerer Spritzer
        nebel: 1,                   // Grundzahl feiner Nebelwolken
        tempo: [140, 520],          // Geschwindigkeit der Tropfen (Pixel pro Sekunde, min/max)
        spritzerTempo: [70, 300],   // Geschwindigkeit der Spritzer
        lebensdauer: [0.35, 0.9],   // so lange fliegen sie (Sekunden, min/max)
        groesse: [2, 3.5],          // Größe der Tropfen (Pixel)
        spritzerGroesse: [3.5, 7],  // Größe der Spritzer
        kegel: 0.5,                 // Streuung nach vorn (Bogenmaß, halber Öffnungswinkel)
        rueckanteil: 0.3,           // Anteil, der nach hinten (zum Schützen) spritzt
        schwerkraft: 900,
    },

    // ---- Zusätzliche Gore-Effekte: Wahrscheinlichkeiten (0 bis 1) je Treffer bzw. Tod, vor Multiplikation mit gore und waffen[...].gore ----
    wahrscheinlichkeit: {
        grosserSpritzer: 0.22,      // ein großer Blutschwall bei einem Treffer
        extraBlut: 0.5,             // zusätzliche Tropfen bei starken Treffern (Schaden ab schwelle.stark)
        brocken: 0.09,              // ein Fleischbrocken bei einem starken Treffer
        organ: 0.035,               // ein Gedärm-Strang (Cartoon) bei einem starken Treffer
        gliedTreffer: 0.0,          // ein abgetrenntes Glied schon beim Treffer (nur sehr starke Waffen, siehe waffen[...].gore)
        // beim Tod eines Gegners (immer stärker als ein normaler Treffer):
        todBrocken: 0.7,
        todOrgan: 0.22,
        todGlied: 0.22,
    },
    schwelle: { stark: 2, sehrStark: 5 },   // ab diesem Schaden gilt ein Treffer als stark bzw. sehr stark

    // ---- Waffen: wie kräftig wirken ihre Treffer? ----
    //   intensitaet  Faktor für Menge und Tempo des Bluts (1 = Pistole)
    //   gore         Faktor für die Wahrscheinlichkeit der Zusatzeffekte (0 = nie)
    //   art          'blut' (Standard), 'feuer' (Funken und Rauch statt Blut)
    //   gliedTod     Chance auf ein abgetrenntes Glied beim Tod (überschreibt wahrscheinlichkeit.todGlied, wenn angegeben)
    waffen: {
        pistol:  { intensitaet: 0.8, gore: 0.7 },
        rifle:   { intensitaet: 0.75, gore: 0.8 },               // Dauerfeuer: jeder Treffer klein, aber immer wieder anders
        shotgun: { intensitaet: 1.0, gore: 1.4, gliedTod: 0.45 },  // jede Schrotkugel für sich, aber nah und kräftig
        rocket:  { intensitaet: 2.2, gore: 2.5, gliedTod: 0.7 },
        grenade: { intensitaet: 2.0, gore: 2.2, gliedTod: 0.6 },
        knife:   { intensitaet: 1.0, gore: 0.9 },
        sword:   { intensitaet: 1.2, gore: 1.2, gliedTod: 0.3 },
        fist:    { intensitaet: 0.6, gore: 0.3 },
        flame:   { intensitaet: 0.8, gore: 1.0, art: 'feuer', gliedTod: 0 },
    },

    // ---- Leistung ----
    maxTeilchen: 260,       // so viele Teilchen gleichzeitig höchstens (darüber werden neue Effekte kleiner oder entfallen)
    maxFlecken: 70,         // so viele Blutflecken am Boden höchstens (die ältesten verschwinden zuerst)
    fleckenDauer: 6,        // Sekunden, bis ein Fleck verblasst
    maxJeBild: 3,           // höchstens so viele Treffer-Effekte pro Bild voll ausführen (bei Dauerfeuer auf mehrere Gegner)
    dauerfeuerSchwelle: 90, // folgt ein Treffer schneller als so viele Millisekunden auf den vorigen, wird er kleiner (Dauerfeuer)

    // ---- Der nasse Treffer-Klang ----
    ton: {
        lautstaerke: 1,     // Gesamtlautstärke des Treffer-Klangs (0 = aus)
        variation: 0.08,    // zufällige Abweichung der Tonhöhe (0,08 = plus/minus 8 %)
        pauseMs: 55,        // mindestens so viel Zeit zwischen zwei Treffer-Klängen (verhindert Brei bei Dauerfeuer und Schrot)
        stimmen: 4,         // so viele gleichzeitig höchstens
        starkFaktor: 0.09,  // wie viel lauter und tiefer ein starker Treffer wird (je Schadenspunkt)
        todLautstaerke: 0.9,
    },
};
