// Stufenhilfe: Damit man sanfte Hügel hinauflaufen kann, obwohl die Physik nur Rechtecke kennt.
// Ein Hang besteht aus vielen kleinen Stufen (je 4 bis 20 Pixel hoch). Ohne Hilfe bliebe man an
// jeder Stufe hängen. Die Hilfe hebt die Figur um die Stufenhöhe an, wenn sie gegen eine
// niedrige Kante läuft. Höhere Hindernisse (Mauern, Kisten) bleiben Hindernisse: Dafür springt man.
const STUFE_MAX = 22;

export function stufenHilfe(wesen, richtung) {
    const body = wesen.body;
    if (!body || richtung === 0 || !body.blocked.down) return;
    if (!(richtung > 0 ? body.blocked.right : body.blocked.left)) return;
    const fuss = body.bottom;
    const vorneX = richtung > 0 ? body.right + 1 : body.left - 1;
    for (const p of wesen.scene.platforms) {
        const b = p.body;
        if (!b || vorneX < b.left || vorneX > b.right) continue;
        const hoehe = fuss - b.top;
        if (hoehe > 0.5 && hoehe <= STUFE_MAX) {
            wesen.y -= hoehe + 0.5;       // das Spielobjekt anheben (der Körper folgt ihm im nächsten Schritt)
            return;
        }
    }
}
