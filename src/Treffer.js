import { TREFFER as T } from './TrefferKonfig.js';

// Treffer-Effekte: Blut, Gore und Funken. EIN Teilchensystem für die ganze Szene (eine Zeichenfläche, eine Liste), das für jeden Treffer
// Teilchen mit zufälliger Größe, Geschwindigkeit, Lebensdauer und Richtung hinzufügt. Es erzeugt nichts pro Treffer außer ein paar Einträgen in
// einer Liste, räumt abgelaufene Teilchen selbst weg und begrenzt sich nach oben (T.maxTeilchen, T.maxFlecken, T.maxJeBild).
// Alle Zahlen stehen in TrefferKonfig.js.
//
// Teilchenarten:
//   tropfen   kleiner, schneller Blutstrich              spritzer  größeres Quadrat, hinterlässt Flecken am Boden
//   nebel     feiner roter Dunst                         brocken   Fleischbrocken, hüpft und bleibt liegen
//   organ     Cartoon-Gedärm (wellige rosa Schlange)     glied     abgetrenntes Glied, dreht sich weg
//   funke     Funke (Feuer)                              rauch     Rauch (Feuer)             blitz  kurzer Treffer-Blitz
const BLUT = [0xaa1111, 0xcc2222, 0x881111, 0xdd3333, 0x6e0e0e];
const ORGAN = [0xd9707a, 0xc45863, 0xe58a92];
const FEUER = [0xfffbd0, 0xffd84a, 0xff9a22, 0xe04a12];
const rnd = (a, b) => a + Math.random() * (b - a);
const zw = ([a, b]) => rnd(a, b);
const wahl = (liste) => liste[Math.floor(Math.random() * liste.length)];
const KOLLISION = new Set(['spritzer', 'brocken', 'organ', 'glied']);

export default class Treffer {
    constructor(scene) {
        this.scene = scene;
        this.g = scene.add.graphics().setDepth(7);          // alle Teilchen
        this.fg = scene.add.graphics().setDepth(1.6);       // Blutflecken am Boden (hinter den Figuren)
        this.t = [];
        this.flecken = [];
        this.imBild = 0;                                    // wie viele Effekte in diesem Bild schon ausgeführt wurden
        this.letzterTreffer = -999;
        this.zeichneteLeer = true;
    }

    // Plattformen in der Nähe (für den Aufprall der Teilchen), einmal pro Effekt ermittelt
    nahe(x, y) {
        const r = [];
        for (const p of this.scene.platforms) {
            const b = p.body;
            if (!b || !p.active || b.right < x - 450 || b.left > x + 450 || b.bottom < y - 350 || b.top > y + 350) continue;
            r.push({ l: b.left, r: b.right, t: b.top, b: b.bottom });
        }
        return r;
    }

    neu(art, x, y, vx, vy, leben, gr, farbe, extra = {}) {
        if (this.t.length >= T.maxTeilchen) return null;
        const p = { art, x, y, vx, vy, alter: 0, leben, gr, farbe, rot: Math.random() * 6.28, drehung: rnd(-9, 9), hopser: 0, rastet: false, ...extra };
        this.t.push(p);
        return p;
    }

    fleck(x, y, w, h, farbe = 0x7a0f0f, leben = T.fleckenDauer) {
        if (T.blutMenge <= 0) return;
        this.flecken.push({ x, y, w, h, alter: 0, leben, farbe });
        if (this.flecken.length > T.maxFlecken) this.flecken.shift();
    }

    // Wie stark ist dieser Treffer? (Waffe, Schaden, aktuelle Auslastung)
    staerke(W, schaden) {
        return Math.min(T.intensitaetMax, W.intensitaet * (0.75 + Math.min(schaden, 6) * 0.1));
    }

    // Ein ganz normaler Treffer. winkel = Flugrichtung des Geschosses (> 7 oder undefined: keine Richtung bekannt).
    zeige(x, y, winkel, waffe = 'pistol', schaden = 1) {
        const W = T.waffen[waffe] ?? T.waffen.pistol, jetzt = this.scene.time.now;
        if (++this.imBild > T.maxJeBild) return;                               // zu viele Treffer im selben Bild (z. B. Schrot oder Dauerfeuer)
        const schnell = jetzt - this.letzterTreffer < T.dauerfeuerSchwelle;
        this.letzterTreffer = jetzt;
        const frei = 1 - this.t.length / T.maxTeilchen;
        if (frei <= 0.05) return;
        const faktor = frei * (schnell ? 0.65 : 1), inten = this.staerke(W, schaden);
        const hat = Math.abs(winkel) <= 7, a0 = hat ? winkel : -Math.PI / 2;
        if (W.art === 'feuer') { this.feuer(x, y, inten * faktor); return; }
        const nahe = this.nahe(x, y);
        const dichte = T.blutMenge * inten * faktor;
        const B = T.blut, kegel = (hat ? B.kegel : 1.3) * (0.6 + inten * 0.4);
        const nT = Math.round(B.tropfen * dichte * rnd(0.7, 1.3)), nS = Math.round(B.spritzer * dichte * rnd(0.5, 1.4));
        for (let i = 0; i < nT; i++) this.tropfen(x, y, a0, kegel, inten, hat);
        for (let i = 0; i < nS; i++) this.spritzer(x, y, a0, kegel, inten, hat, nahe);
        if (T.blutMenge > 0) {
            if (Math.random() < 0.7) this.neu('nebel', x, y, rnd(-30, 30), rnd(-40, 10), rnd(0.25, 0.5), rnd(7, 14) * inten, wahl([0xaa1111, 0x771111]));
            this.neu('blitz', x, y, 0, 0, 0.12, 6 + inten * 3, 0xff5544);
        }
        // Zusätzliche Gore-Effekte (nur wenn T.gore > 0), je nach Waffe und Stärke des Treffers
        const gk = T.gore * W.gore, P = T.wahrscheinlichkeit, stark = schaden >= T.schwelle.stark, sehrStark = schaden >= T.schwelle.sehrStark;
        if (gk <= 0 || T.blutMenge <= 0) return;
        if (Math.random() < P.grosserSpritzer * gk) this.grosserSpritzer(x, y, a0, hat, inten, nahe);
        if (stark && Math.random() < P.extraBlut * gk) for (let i = 0; i < Math.ceil(nT * 0.5); i++) this.tropfen(x, y, a0, kegel * 1.4, inten * 1.2, hat);
        if (stark && Math.random() < P.brocken * gk) for (let i = 0, n = sehrStark ? 2 : 1; i < n; i++) this.brocken(x, y, a0, hat, nahe);
        if (stark && Math.random() < P.organ * gk) this.organ(x, y, a0, hat, nahe);
        if (sehrStark && Math.random() < P.gliedTreffer * gk) this.glied(x, y, a0, hat, nahe, 0xcc4444);
    }

    // Tod eines Gegners: viel mehr Blut, ein Fleck am Boden und (je nach Waffe und Zufall) Brocken, Gedärme, ein abgetrenntes Glied.
    // info = { a: Richtung des letzten Treffers, w: Waffe, s: Schaden }, enemy = der Gegner (für Farbe und Fußhöhe).
    tod(x, y, info, enemy) {
        const waffe = info?.w ?? 'pistol', W = T.waffen[waffe] ?? T.waffen.pistol, schaden = info?.s ?? 1;
        const hat = info && Math.abs(info.a) <= 7, a0 = hat ? info.a : -Math.PI / 2;
        const frei = Math.max(0.35, 1 - this.t.length / T.maxTeilchen);
        const inten = Math.max(1, this.staerke(W, Math.max(schaden, 2))) * frei;
        const fuss = y + (enemy ? enemy.height / 2 : 24), nahe = this.nahe(x, y);
        if (W.art === 'feuer') {                                                      // verbrannt: Funken, Rauch und ein dunkler Fleck
            this.feuer(x, y, 2.4 * frei);
            for (let i = 0; i < 6; i++) this.neu('rauch', x + rnd(-14, 14), y + rnd(-20, 20), rnd(-20, 20), rnd(-90, -40), rnd(0.8, 1.6), rnd(9, 16), 0x2e2a28);
            this.fleck(x, fuss, 40, 6, 0x1c1816, 12);
            return;
        }
        const B = T.blut, kegel = (hat ? B.kegel : 1.3) * 1.3;
        const nT = Math.round(B.tropfen * 2.2 * T.blutMenge * inten * rnd(0.85, 1.2)), nS = Math.round(B.spritzer * 3 * T.blutMenge * inten * rnd(0.8, 1.2));
        for (let i = 0; i < nT; i++) this.tropfen(x, y, a0, kegel, inten, hat);
        for (let i = 0; i < nS; i++) this.spritzer(x, y, a0, kegel, inten, hat, nahe);
        for (let i = 0; i < 3; i++) this.neu('nebel', x + rnd(-10, 10), y + rnd(-14, 10), rnd(-40, 40), rnd(-60, 0), rnd(0.35, 0.7), rnd(10, 20), wahl([0xaa1111, 0x771111]));
        this.neu('blitz', x, y, 0, 0, 0.16, 14, 0xff5544);
        if (T.blutMenge > 0) this.fleck(x, fuss, rnd(34, 50), 6, 0x7a0f0f, 14);        // Blutlache unter dem Gefallenen
        const gk = T.gore * W.gore, P = T.wahrscheinlichkeit;
        if (gk <= 0 || T.blutMenge <= 0) return;
        if (Math.random() < Math.min(1, P.grosserSpritzer * 2 * gk)) this.grosserSpritzer(x, y, a0, hat, inten, nahe);
        if (Math.random() < Math.min(1, P.todBrocken * gk)) for (let i = 0, n = 2 + Math.floor(Math.random() * 3 * Math.min(2, gk)); i < n; i++) this.brocken(x, y, a0, hat, nahe);
        if (Math.random() < Math.min(1, P.todOrgan * gk)) for (let i = 0, n = 1 + (Math.random() < 0.3 ? 1 : 0); i < n; i++) this.organ(x, y, a0, hat, nahe);
        const pGlied = Math.min(1, (W.gliedTod ?? P.todGlied) * T.gore);
        if (Math.random() < pGlied) this.glied(x, y, a0, hat, nahe, enemy?.baseColor ?? 0xcc4444);
    }

    // ---- Bausteine ----
    tropfen(x, y, a0, kegel, inten, hat) {
        const B = T.blut, hinten = hat && Math.random() < B.rueckanteil;
        const a = hinten ? a0 + Math.PI + rnd(-0.8, 0.8) : a0 + rnd(-kegel, kegel), v = zw(B.tempo) * (hinten ? 0.5 : 1) * (0.7 + inten * 0.3);
        this.neu('tropfen', x, y, Math.cos(a) * v, Math.sin(a) * v, zw(B.lebensdauer), zw(B.groesse), wahl(BLUT));
    }

    spritzer(x, y, a0, kegel, inten, hat, nahe) {
        const B = T.blut, hinten = hat && Math.random() < B.rueckanteil * 0.7;
        const a = hinten ? a0 + Math.PI + rnd(-1, 1) : a0 + rnd(-kegel * 1.3, kegel * 1.3), v = zw(B.spritzerTempo) * (0.7 + inten * 0.3);
        this.neu('spritzer', x, y, Math.cos(a) * v, Math.sin(a) * v - 40, zw(B.lebensdauer) * 1.2, zw(B.spritzerGroesse) * (0.8 + inten * 0.2), wahl(BLUT), { nahe });
    }

    grosserSpritzer(x, y, a0, hat, inten, nahe) {
        const n = 6 + Math.floor(Math.random() * 7) * Math.min(1.5, T.gore);
        for (let i = 0; i < n; i++) {
            const a = a0 + rnd(-0.9, 0.9), v = rnd(120, 420) * (0.7 + inten * 0.3);
            this.neu('spritzer', x, y, Math.cos(a) * v, Math.sin(a) * v - 60, rnd(0.5, 1.1), rnd(5, 9), wahl(BLUT), { nahe });
        }
        this.neu('nebel', x, y, 0, -20, 0.35, 24, 0x990f0f);
    }

    brocken(x, y, a0, hat, nahe) {
        const a = a0 + rnd(-0.8, 0.8), v = rnd(110, 320);
        this.neu('brocken', x, y, Math.cos(a) * v, Math.sin(a) * v - 120, rnd(1.4, 2.2), rnd(6, 10), wahl([0x8a1a1a, 0x6e1010, 0xa02525]), { nahe });
    }

    organ(x, y, a0, hat, nahe) {
        const a = a0 + rnd(-0.7, 0.7), v = rnd(110, 260);
        this.neu('organ', x, y, Math.cos(a) * v, Math.sin(a) * v - 140, rnd(1.4, 2.2), rnd(22, 34), wahl(ORGAN), { nahe, drehung: rnd(-6, 6) });
    }

    glied(x, y, a0, hat, nahe, farbe) {
        const a = a0 + rnd(-0.6, 0.6), v = rnd(160, 360);
        this.neu('glied', x, y, Math.cos(a) * v, Math.sin(a) * v - 180, rnd(1.6, 2.4), rnd(16, 22), farbe, { nahe, drehung: rnd(-8, 8) });
    }

    // Feuer: Funken und Rauch statt Blut
    feuer(x, y, staerke) {
        const n = Math.max(2, Math.round(6 * staerke));
        for (let i = 0; i < n; i++) this.neu('funke', x, y, rnd(-160, 160), rnd(-220, -20), rnd(0.25, 0.6), rnd(2, 4), wahl(FEUER));
        for (let i = 0; i < Math.ceil(n / 3); i++) this.neu('rauch', x + rnd(-8, 8), y + rnd(-8, 8), rnd(-20, 20), rnd(-80, -30), rnd(0.5, 1), rnd(6, 11), 0x3a3634);
        this.neu('blitz', x, y, 0, 0, 0.1, 6 + staerke * 3, 0xff9a22);
    }

    // ---- Jedes Bild: bewegen, zeichnen, aufräumen ----
    update(delta) {
        this.imBild = 0;
        const dt = Math.min(delta, 50) / 1000, g = this.g, G = T.blut.schwerkraft;
        if (this.t.length || !this.zeichneteLeer) {
            g.clear();
            this.zeichneteLeer = this.t.length === 0;
            for (let i = this.t.length - 1; i >= 0; i--) {
                const p = this.t[i];
                p.alter += dt;
                if (p.alter >= p.leben) { if (p.art === 'brocken' && p.rastet) this.fleck(p.x, p.y, 10, 4, 0x6e1010, 4); this.t.splice(i, 1); continue; }
                if (!p.rastet) {
                    const vorher = p.y;
                    if (p.art === 'rauch') { p.vy -= 20 * dt; p.vx *= 1 - 1.2 * dt; }
                    else if (p.art === 'nebel') { p.vx *= 1 - 3 * dt; p.vy *= 1 - 3 * dt; }
                    else if (p.art !== 'blitz') p.vy += (p.art === 'funke' ? 500 : G) * dt;
                    p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.drehung * dt;
                    if (p.nahe && KOLLISION.has(p.art) && this.aufprall(p, vorher)) { this.t.splice(i, 1); continue; }
                }
                this.zeichne(g, p);
            }
        }
        if (this.flecken.length) {
            const fg = this.fg;
            fg.clear();
            for (let i = this.flecken.length - 1; i >= 0; i--) {
                const f = this.flecken[i];
                f.alter += dt;
                if (f.alter >= f.leben) { this.flecken.splice(i, 1); continue; }
                const a = Math.min(1, (f.leben - f.alter) / 2) * 0.85;               // die letzten zwei Sekunden verblassen
                fg.fillStyle(f.farbe, a).fillRect(Math.round(f.x - f.w / 2), Math.round(f.y - f.h / 2), Math.round(f.w), Math.round(f.h));
                fg.fillStyle(0x4a0808, a * 0.7).fillRect(Math.round(f.x - f.w / 4), Math.round(f.y - f.h / 4), Math.round(f.w / 2), Math.max(1, Math.round(f.h / 2)));
            }
            if (!this.flecken.length) fg.clear();
        }
    }

    // Trifft ein Teilchen eine Plattform? Spritzer hinterlassen einen Fleck, Brocken/Gedärme/Glieder hüpfen und bleiben liegen.
    // Gibt true zurück, wenn das Teilchen verschwindet.
    aufprall(p, vorher) {
        for (const r of p.nahe) {
            if (p.x < r.l || p.x > r.r || p.y < r.t || p.y > r.b) continue;
            const vonOben = vorher <= r.t + 3;
            if (p.art === 'spritzer') {
                if (vonOben) this.fleck(p.x, r.t - 1, p.gr * rnd(1.3, 2.4), Math.max(2, p.gr * 0.5), p.farbe);
                else this.fleck(p.x, p.y, 3, p.gr * 1.4, p.farbe, 3);
                return true;
            }
            if (vonOben) {
                p.y = r.t - 1;
                p.vx *= 0.65; p.vy = -p.vy * 0.32; p.drehung *= 0.5; p.hopser++;
                if (p.hopser >= 3 || Math.abs(p.vy) < 50) {                           // liegt: ein Fleck und langsam verblassen
                    p.vx = 0; p.vy = 0; p.rastet = true; p.drehung = 0;
                    p.leben = Math.min(p.leben, p.alter + 1.3);
                    this.fleck(p.x, r.t - 1, p.gr * 1.6, 3, 0x6e1010, 5);
                }
            } else { p.vx = -p.vx * 0.3; p.vy *= 0.5; p.x -= Math.sign(p.vx || 1) * 2; }
            return false;
        }
        return false;
    }

    zeichne(g, p) {
        const rest = 1 - p.alter / p.leben, a = rest < 0.25 ? rest / 0.25 : 1;
        switch (p.art) {
            case 'tropfen':
                g.lineStyle(Math.max(1.5, p.gr), p.farbe, a).beginPath().moveTo(p.x - p.vx * 0.022, p.y - p.vy * 0.022).lineTo(p.x, p.y).strokePath();
                break;
            case 'spritzer':
                g.fillStyle(p.farbe, a).fillRect(Math.round(p.x - p.gr / 2), Math.round(p.y - p.gr / 2), Math.round(p.gr), Math.round(p.gr));
                g.fillStyle(0xe03a3a, a * 0.6).fillRect(Math.round(p.x - p.gr / 2), Math.round(p.y - p.gr / 2), Math.max(1, Math.round(p.gr / 2.5)), Math.max(1, Math.round(p.gr / 2.5)));   // Glanzpunkt
                break;
            case 'nebel':
                g.fillStyle(p.farbe, 0.45 * rest).fillCircle(p.x, p.y, p.gr * (1.4 - rest * 0.6));
                break;
            case 'blitz':
                g.fillStyle(p.farbe, 0.85 * rest).fillCircle(p.x, p.y, p.gr * (1.6 - rest));
                break;
            case 'funke':
                g.fillStyle(p.farbe, a).fillRect(Math.round(p.x - p.gr / 2), Math.round(p.y - p.gr / 2), Math.round(p.gr), Math.round(p.gr));
                break;
            case 'rauch':
                g.fillStyle(p.farbe, 0.5 * rest).fillCircle(p.x, p.y, p.gr * (1 + (1 - rest) * 1.2));
                break;
            case 'brocken': {
                const s = Math.round(p.gr);
                g.fillStyle(0x3a0707, a).fillRect(Math.round(p.x - s / 2) - 1, Math.round(p.y - s / 2) - 1, s + 2, s + 2);
                g.fillStyle(p.farbe, a).fillRect(Math.round(p.x - s / 2), Math.round(p.y - s / 2), s, s);
                g.fillStyle(0xd05a5a, a * 0.7).fillRect(Math.round(p.x - s / 2) + 1, Math.round(p.y - s / 2) + 1, Math.max(1, Math.round(s / 3)), Math.max(1, Math.round(s / 3)));
                break;
            }
            case 'organ': {                                                          // wellige rosa Schlange (Cartoon-Gedärm)
                const n = 7, c = Math.cos(p.rot), s = Math.sin(p.rot), pts = [];
                for (let k = 0; k < n; k++) {
                    const t = k / (n - 1) - 0.5, welle = Math.sin(p.alter * 9 + k * 1.3) * 5;
                    pts.push({ x: p.x + c * t * p.gr - s * welle, y: p.y + s * t * p.gr + c * welle });
                }
                g.lineStyle(7, 0x7a2a34, a).strokePoints(pts, false, false);
                g.lineStyle(4.5, p.farbe, a).strokePoints(pts, false, false);
                g.lineStyle(1.5, 0xffc0c8, a * 0.7).strokePoints(pts.map((q) => ({ x: q.x - 1, y: q.y - 1 })), false, false);
                break;
            }
            case 'glied': {                                                          // abgetrenntes Glied: Rechteck in der Farbe des Gegners mit blutigem Ende
                const c = Math.cos(p.rot), s = Math.sin(p.rot), L = p.gr / 2, B = 4.5;
                const ecke = (u, v) => ({ x: p.x + c * u - s * v, y: p.y + s * u + c * v });
                g.fillStyle(p.farbe, a).fillPoints([ecke(-L, -B), ecke(L, -B), ecke(L, B), ecke(-L, B)], true);
                g.fillStyle(0xe0b890, a).fillPoints([ecke(L - 5, -B + 1), ecke(L, -B + 1), ecke(L, B - 1), ecke(L - 5, B - 1)], true);          // Hand/Fuß
                g.fillStyle(0xaa1111, a).fillPoints([ecke(-L, -B), ecke(-L + 4, -B), ecke(-L + 4, B), ecke(-L, B)], true);                        // blutiges Ende
                break;
            }
        }
    }

    // Alles wegräumen (Szene verlassen / Neustart)
    aufraeumen() {
        this.t.length = 0;
        this.flecken.length = 0;
        if (this.g) this.g.clear();
        if (this.fg) this.fg.clear();
    }
}
