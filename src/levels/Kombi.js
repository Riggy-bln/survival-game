// Das zusammengesetzte Level: der Anfang des früheren langen Levels (Level01.js) bis zum Ende der ersten Höhle, danach das neue Level aus der Skizze
// (LevelNeu.js) bis zur Boss-Arena mit dem Hubschrauber.
//
//   [ altes Level: Start, Tunnel mit erster Höhle, Krater, Waffenkammer, Bunkerhügel ] -> [ neues Level: Hof, Schluchten, Feld ... Arena, Hubschrauber ]
//   x = 0                                                      x = SCHNITT_X (4928)      x = VERSATZ_X + ... (neues Level beginnt dort)
//
// Beide Teile haben eine andere Höhe der Oberfläche (alt 760, neu 1000). Der alte Teil wird deshalb um VERSATZ_Y nach unten geschoben: Seine Oberfläche
// liegt dann auch bei 1000, und die beiden Teile passen am Übergang bündig aneinander. Der neue Teil wird um VERSATZ_X nach rechts geschoben, sodass sein
// erster Block genau dort beginnt, wo das alte Gelände abgeschnitten wird.
import alt from './Level01.js';
import neu from './LevelNeu.js';

const SCHNITT_X = 4928;                       // alles vom alten Level rechts davon entfällt (28 * 56: bündig mit dem 56er-Raster)
const VERSATZ_Y = 1000 - alt.boden;           // der alte Teil rutscht so weit nach unten (240)
const VERSATZ_X = SCHNITT_X - 56;             // der neue Teil beginnt bei x = 56 (zwei Zellen Rand, dann der erste Block)

const verschiebeY = (o, felder) => { const k = { ...o }; for (const f of felder) if (typeof k[f] === 'number') k[f] += VERSATZ_Y; return k; };
const verschiebeX = (o, felder) => { const k = { ...o }; for (const f of felder) if (typeof k[f] === 'number') k[f] += VERSATZ_X; return k; };
const links = (x) => x < SCHNITT_X;           // gehört zum alten Teil?

// ---- alter Teil: nach unten schieben, rechts abschneiden ----
const altPlatten = [];
for (const p of alt.platforms) {
    const l = p.x - p.w / 2, r = Math.min(p.x + p.w / 2, SCHNITT_X);
    if (l >= SCHNITT_X || r <= l) continue;
    altPlatten.push({ ...p, x: (l + r) / 2, w: r - l, y: p.y + VERSATZ_Y });
}
const altListe = (liste, feldY, feldX = ['x']) => (liste ?? []).filter((e) => links(e.x)).map((e) => verschiebeY(e, feldY));
const altGegner = (liste) => (liste ?? []).filter((e) => links(e.x)).map((e) => ({ ...e, y: e.y + VERSATZ_Y, left: Math.min(e.left, SCHNITT_X - 20), right: Math.min(e.right, SCHNITT_X - 20) }));
const altHoehlen = (alt.hoehlen ?? []).filter((h) => h.links < SCHNITT_X).map((h) => ({ ...h, rechts: Math.min(h.rechts, SCHNITT_X), oben: h.oben + VERSATZ_Y, unten: h.unten + VERSATZ_Y }));
const altHuegel = (alt.huegelformen ?? []).filter((f) => f.links < SCHNITT_X).map((f) => ({ ...f, boden: (f.boden ?? alt.boden) + VERSATZ_Y, unten: f.unten !== undefined ? f.unten + VERSATZ_Y : undefined }));
const altLampen = (alt.lampen ?? []).filter((l) => links(typeof l === 'object' ? l.x : l)).map((l) => (typeof l === 'object' ? { ...l, y: l.y + VERSATZ_Y } : l));

// ---- neuer Teil: nach rechts schieben ----
const neuListeX = (liste, felder = ['x']) => (liste ?? []).map((e) => verschiebeX(e, felder));
const neuPlatten = neu.platforms.map((p) => ({ ...p, x: p.x + VERSATZ_X }));
const neuGegner = (liste) => (liste ?? []).map((e) => ({ ...e, x: e.x + VERSATZ_X, left: e.left + VERSATZ_X, right: e.right + VERSATZ_X }));
const neuHoehlen = (neu.hoehlen ?? []).map((h) => ({ ...h, links: h.links + VERSATZ_X, rechts: h.rechts + VERSATZ_X }));
const neuLampen = (neu.lampen ?? []).map((l) => (typeof l === 'object' ? { ...l, x: l.x + VERSATZ_X } : l + VERSATZ_X));
// Die Übungshinweise vom Anfang des neuen Levels ("Move", "Aim") stehen schon am Start des alten Teils
const neuSchilder = (neu.signs ?? []).filter((s) => s.x > 800).map((s) => ({ ...s, x: s.x + VERSATZ_X }));

const level = {
    width: VERSATZ_X + neu.width,
    height: Math.max(neu.height, alt.height + VERSATZ_Y),
    boden: neu.boden,
    abschnitt: 0.5,                                       // Das ganze Spiel soll aus mehreren Kapiteln bestehen: Dieses Level ist etwa die Hälfte eines Kapitels
    neuAb: SCHNITT_X,                                     // ab hier gilt das neue Gelände (für den Landschaftsgenerator)
    sperre: [[4250, 4930]],                               // hier stehen der Bunker und der Höhleneingang: keine Bäume, Zäune oder Wracks aus dem Landschaftsgenerator
    erdVerlauf: { boden: neu.boden, hell: 0.95, rate: 1.0, min: 0.3 },
    titel: neu.titel, einstieg: neu.einstieg, abschluss: neu.abschluss, abschlussHinweis: neu.abschlussHinweis,
    // der Spieler startet am Anfang des alten Teils (auf dem Boden, 200 Pixel vom Rand)
    start: { x: 200, y: neu.boden - 60 },
    goalX: neu.goalX + VERSATZ_X, goalY: neu.goalY,
    platforms: [...altPlatten, ...neuPlatten],
    decor: [...altListe(alt.decor, ['y']), ...neuListeX(neu.decor)],
    signs: [...altListe(alt.signs, ['y']), ...neuSchilder],
    enemies: [...altGegner(alt.enemies), ...neuGegner(neu.enemies)],
    rangedEnemies: [...altGegner(alt.rangedEnemies), ...neuGegner(neu.rangedEnemies)],
    skelette: [...altGegner(alt.skelette), ...neuGegner(neu.skelette)],
    pickups: [...altListe(alt.pickups, ['y']), ...neuListeX(neu.pickups)],
    faesser: [...altListe(alt.faesser, ['y']), ...neuListeX(neu.faesser)],
    bruecken: [...(alt.bruecken ?? []).filter((b) => b.stuecke.every((s) => s[1] < SCHNITT_X)).map((b) => ({ ...b, stuecke: b.stuecke.map((s) => [s[0], s[1], s[2] + VERSATZ_Y]) })),
        ...(neu.bruecken ?? []).map((b) => ({ ...b, stuecke: b.stuecke.map((s) => [s[0] + VERSATZ_X, s[1] + VERSATZ_X, s[2]]) }))],
    treppen: [],
    wracks: [...altListe(alt.wracks, ['y']), ...neuListeX(neu.wracks)],
    geruest: [...(alt.geruest ?? []).filter((g) => g.x1 < SCHNITT_X).map((g) => ({ ...g, oben: g.oben + VERSATZ_Y })), ...(neu.geruest ?? [])],
    schachtkoepfe: [...(alt.schachtkoepfe ?? []).filter((s) => s.rechts < SCHNITT_X), ...(neu.schachtkoepfe ?? []).map((s) => ({ links: s.links + VERSATZ_X, rechts: s.rechts + VERSATZ_X }))],
    leitern: [...altListe(alt.leitern, ['oben', 'unten']), ...neuListeX(neu.leitern)],
    tuerme: [...(alt.tuerme ?? []).filter((t) => links(t.x + 100)).map((t) => verschiebeY(t, ['oben', 'bl', 'br'])), ...neuListeX(neu.tuerme)],
    huegelformen: [...altHuegel, ...(neu.huegelformen ?? [])],
    hoehlen: [...altHoehlen, ...neuHoehlen],
    lampen: [...altLampen, ...neuLampen],
    haenge: neuListeX(neu.haenge, ['l', 'r']),
    // die erste Flagge steht gleich hinter dem Übergang: Wer die erste Höhle geschafft hat, startet nach einem Tod nicht wieder am Anfang
    flaggen: [{ x: SCHNITT_X + 372, y: neu.boden }, ...neuListeX(neu.flaggen)],
    reste: neuListeX(neu.reste),
    boss: neu.boss ? { ...neu.boss, x: neu.boss.x + VERSATZ_X, left: neu.boss.left + VERSATZ_X, right: neu.boss.right + VERSATZ_X } : undefined,
    brutlinge: neuGegner(neu.brutlinge),
};
export default level;
