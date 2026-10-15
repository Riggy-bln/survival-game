// Kleine Mechaniken, die das Spielen belohnender machen: eine Fortschrittsleiste mit den Fahnen als Etappenziele, Rückmeldung bei Mehrfach-Abschüssen,
// ein Rang am Ende (Zeit, besiegte Gegner, Tode) und eine kleine Hilfe, wenn man an derselben Stelle immer wieder scheitert.
// Alles ist Anzeige oder kleine Zugabe und verändert die Spielregeln nicht.

// ---------------------------------------------------------------------------------------------------------------------
// Fortschrittsleiste oben in der Mitte: wie weit man auf dem Weg zum Hubschrauber ist. Fahnen sind Etappenziele (grün = erreicht).
// Sichtbarer Fortschritt gibt das Gefühl, voranzukommen, und lässt einen "nur noch bis zur nächsten Fahne" weiterspielen.
// ---------------------------------------------------------------------------------------------------------------------
export function baueFortschritt(scene, level) {
    const g = scene.add.graphics().setScrollFactor(0).setDepth(20);
    const text = scene.add.text(0, 0, '', { fontFamily: 'monospace', fontSize: '12px', color: '#d8f0e0' }).setScrollFactor(0).setDepth(21).setOrigin(0.5, 0);
    let weitester = 0;
    const ziel = level.goalX;
    return {
        update(spielerX) {
            weitester = Math.max(weitester, Math.min(spielerX, ziel));
            const B = scene.scale.width, breite = Math.min(460, B - 560), x0 = (B - breite) / 2, y0 = 14, h = 10;
            if (breite < 160) { g.clear(); text.setVisible(false); return; }
            g.clear();
            g.fillStyle(0x000000, 0.55).fillRect(x0 - 4, y0 - 4, breite + 8, h + 8);
            g.fillStyle(0x24413a, 1).fillRect(x0, y0, breite, h);
            g.fillStyle(0x58c06a, 1).fillRect(x0, y0, breite * weitester / ziel, h);
            for (const f of scene.flaggen ?? []) {                                              // Fahnen als Etappenmarken
                const fx = x0 + breite * Math.min(1, f.x / ziel);
                g.fillStyle(f.erreicht ? 0xb8ffc8 : 0xff6a6a, 1).fillRect(fx - 1, y0 - 5, 3, h + 10).fillTriangle(fx + 2, y0 - 5, fx + 9, y0 - 2, fx + 2, y0 + 1);
            }
            g.fillStyle(0x66ff99, 1).fillRect(x0 + breite - 2, y0 - 6, 5, h + 12);             // Ziel
            const px = x0 + breite * Math.min(1, spielerX / ziel);                                // der Spieler
            g.fillStyle(0xffffff, 1).fillCircle(px, y0 + h / 2, 5).lineStyle(2, 0x000000, 0.8).strokeCircle(px, y0 + h / 2, 5);
            const erreicht = (scene.flaggen ?? []).filter((f) => f.erreicht).length, gesamt = (scene.flaggen ?? []).length;
            text.setVisible(true).setPosition(B / 2, y0 + h + 6).setText(`${Math.round(100 * weitester / ziel)}%   checkpoints ${erreicht}/${gesamt}`);
        },
    };
}

// ---------------------------------------------------------------------------------------------------------------------
// Mehrfach-Abschüsse: Fallen mehrere Gegner kurz hintereinander (zum Beispiel durch ein Fass), erscheint eine Rückmeldung am Ort des Geschehens.
// ---------------------------------------------------------------------------------------------------------------------
const MEHRFACH = [null, null, ['DOUBLE KILL!', 0xffe066], ['TRIPLE KILL!', 0xffa040], ['MEGA KILL!', 0xff5a3a], ['MONSTER KILL!', 0xff2a8a]];
export function mehrfachAbschuss(scene, gegner) {
    const jetzt = scene.time.now;
    scene.killZeiten = (scene.killZeiten ?? []).filter((t) => jetzt - t < 1600);
    scene.killZeiten.push(jetzt);
    const n = Math.min(scene.killZeiten.length, MEHRFACH.length - 1);
    const eintrag = MEHRFACH[n];
    if (eintrag && scene.fx && scene.fx.pickup) scene.fx.pickup(gegner.x, gegner.y - 40, eintrag[1], eintrag[0]);
}

// ---------------------------------------------------------------------------------------------------------------------
// Rang am Ende: S, A, B oder C aus besiegten Gegnern und Toden. Ein Ziel für den nächsten Versuch ("diesmal ohne zu sterben!").
// ---------------------------------------------------------------------------------------------------------------------
export function berechneRang(kills, gesamt, tode) {
    const punkte = 50 * (gesamt ? kills / gesamt : 1) + (tode === 0 ? 50 : Math.max(0, 50 - tode * 12));
    return punkte >= 92 ? 'S' : (punkte >= 76 ? 'A' : (punkte >= 55 ? 'B' : 'C'));
}

// ---------------------------------------------------------------------------------------------------------------------
// Hilfe bei wiederholtem Scheitern: Wer dreimal hintereinander an derselben Fahne stirbt, bekommt beim nächsten Neustart ein kleines Paket
// (Heilung und Granaten). Das nimmt Frust, ohne dass das Spiel leichter wird, wenn man gut spielt.
// ---------------------------------------------------------------------------------------------------------------------
export function hilfePaket(scene, spieler) {
    scene.todeAnFahne = (scene.todeAnFahne ?? 0);
    if (scene.todeAnFahne >= 3 && !scene.mp) {
        spieler.medkits = Math.min((spieler.medkits ?? 0) + 2, 5);
        spieler.grenades = Math.min((spieler.grenades ?? 0) + 3, 8);
        scene.showMessage('Supply drop!\n+2 medkits, +3 grenades');
        scene.todeAnFahne = 0;
    }
}
