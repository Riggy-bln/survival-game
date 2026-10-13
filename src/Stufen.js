// Stufenhilfe: Damit man sanfte Hügel hinauflaufen kann, obwohl die Physik nur Rechtecke kennt.
// Ein Hang besteht aus Stufen von je einem Block (32 Pixel). Ohne Hilfe bliebe man an
// jeder Stufe hängen. Die Hilfe hebt die Figur um die Stufenhöhe an, wenn sie gegen eine
// niedrige Kante läuft. Höhere Hindernisse (Mauern, Kisten) bleiben Hindernisse: Dafür springt man.
const STUFE_MAX = 34;   // etwas mehr als ein Block (32), damit die Hänge aus 32er-Stufen begehbar sind

export function stufenHilfe(wesen, richtung) {
    const body = wesen.body;
    if (!body || richtung === 0 || !body.blocked.down) return;
    if (!(richtung > 0 ? body.blocked.right : body.blocked.left)) return;
    const fuss = body.bottom;
    const vorneX = richtung > 0 ? body.right + 1 : body.left - 1;
    // Alle Hindernisse direkt vor der Figur: Ihre Oberkante liegt über den Füßen, und sie reichen in die Körperhöhe.
    // Maßgeblich ist das HÖCHSTE Hindernis. Ragt hinter einer kleinen Stufe eine hohe Wand auf, ist es eine Wand
    // und keine Stufe: Dann wird nicht angehoben (sonst zappelt die Figur vor der Wand auf und ab).
    let hoechste = Infinity;
    for (const p of wesen.scene.platforms) {
        const b = p.body;
        if (!b || vorneX < b.left || vorneX > b.right) continue;
        if (b.bottom <= body.top || b.top >= fuss - 0.5) continue;      // ganz über dem Kopf oder nicht über den Füßen
        if (b.top < hoechste) hoechste = b.top;
    }
    const hoehe = fuss - hoechste;
    if (hoehe > 0.5 && hoehe <= STUFE_MAX) wesen.y -= hoehe + 0.5;       // das Spielobjekt anheben (der Körper folgt im nächsten Schritt)
}
