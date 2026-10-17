import { WAFFEN } from './WaffenKonfig.js';

// Der Flammenwerfer: Flammenteilchen (eigene Zeichnung, Pixelstil), Schaden im Kegel vor dem Spieler und Brennen über die Zeit.
// Die Szene ruft update() in jedem Bild auf und sagt, ob gerade gefeuert wird.
//   - Die Flamme reicht nur bis zur ersten Wand (Strahl gegen die Plattformen), nicht durch sie hindurch.
//   - Gegner im Kegel nehmen Schaden und brennen danach noch eine Weile weiter ("brennt"-Eintrag am Gegner).
const FARBEN = [0xfffbd0, 0xffd84a, 0xff9a22, 0xe04a12, 0x8a2a10, 0x3a2a26];   // von heißem Weiß bis zu dunklem Rauch

// Strahl gegen ein Rechteck (Schnittpunkt-Methode): Abstand bis zum Treffer oder Unendlich
function strahlBox(ox, oy, dx, dy, l, r, t, b, max) {
    let tmin = 0, tmax = max;
    if (Math.abs(dx) < 1e-6) { if (ox < l || ox > r) return Infinity; }
    else { let a = (l - ox) / dx, c = (r - ox) / dx; if (a > c) [a, c] = [c, a]; tmin = Math.max(tmin, a); tmax = Math.min(tmax, c); }
    if (Math.abs(dy) < 1e-6) { if (oy < t || oy > b) return Infinity; }
    else { let a = (t - oy) / dy, c = (b - oy) / dy; if (a > c) [a, c] = [c, a]; tmin = Math.max(tmin, a); tmax = Math.min(tmax, c); }
    return tmin <= tmax ? tmin : Infinity;
}

export default class Flammenwerfer {
    constructor(scene) {
        this.scene = scene;
        this.g = scene.add.graphics().setDepth(7);
        this.teilchen = [];
        this.brennend = new Set();      // Gegner, die gerade brennen
        this.letzterTick = 0;
    }

    // Wie weit reicht die Flamme in diese Richtung? (bis zur ersten Wand, höchstens die Reichweite)
    laenge(ox, oy, winkel) {
        const w = WAFFEN.flame, dx = Math.cos(winkel), dy = Math.sin(winkel);
        let l = w.reichweite;
        for (const p of this.scene.platforms) {
            const b = p.body;
            if (!b || !p.active || b.right < Math.min(ox, ox + dx * l) - 4 || b.left > Math.max(ox, ox + dx * l) + 4) continue;
            l = Math.min(l, strahlBox(ox, oy, dx, dy, b.left, b.right, b.top, b.bottom, l));
        }
        return l;
    }

    neu(x, y, vx, vy, leben, groesse) { this.teilchen.push({ x, y, vx, vy, alter: 0, leben, groesse }); }

    // aktiv: wird gerade gefeuert? p = Spieler, winkel = Zielrichtung, delta = ms seit dem letzten Bild, schadenRechnen = Gastgeber/Einzelspieler
    update(aktiv, p, winkel, delta, schadenRechnen) {
        const scene = this.scene, w = WAFFEN.flame, dt = delta / 1000, jetzt = scene.time.now;
        const ox = p.x + Math.cos(winkel) * 30, oy = p.y - 6 + Math.sin(winkel) * 30;       // Düse
        if (aktiv) {
            const l = this.laenge(ox, oy, winkel);
            const anzahl = Math.max(1, Math.round(delta / 16 * 3));
            for (let i = 0; i < anzahl; i++) {
                const a = winkel + (Math.random() - 0.5) * w.kegel * 1.6;
                const leben = 0.34 + Math.random() * 0.14, tempo = l / (leben * 0.8) * (0.8 + Math.random() * 0.3);
                this.neu(ox, oy, Math.cos(a) * tempo, Math.sin(a) * tempo, leben, 5 + Math.random() * 3);
            }
            if (schadenRechnen && jetzt - this.letzterTick >= w.tick) {
                this.letzterTick = jetzt;
                this.schadeImKegel(ox, oy, winkel, l);
            }
        }
        if (schadenRechnen) this.brennen(jetzt);
        // Brennende Gegner züngeln: kleine Flammen steigen auf
        for (const e of this.brennend) {
            if (!e.active) continue;
            if (Math.random() < 0.6) this.neu(e.x + (Math.random() - 0.5) * e.width * 0.8, e.y + e.height * 0.2 - Math.random() * e.height * 0.5,
                (Math.random() - 0.5) * 30, -70 - Math.random() * 60, 0.3 + Math.random() * 0.2, 4 + Math.random() * 3);
        }
        // Teilchen bewegen und zeichnen
        const g = this.g;
        g.clear();
        for (let i = this.teilchen.length - 1; i >= 0; i--) {
            const t = this.teilchen[i];
            t.alter += dt;
            if (t.alter >= t.leben) { this.teilchen.splice(i, 1); continue; }
            t.x += t.vx * dt; t.y += t.vy * dt;
            t.vx *= 1 - 1.4 * dt; t.vy = t.vy * (1 - 1.4 * dt) - 90 * dt;                // Flammen bremsen und steigen
            const f = t.alter / t.leben, farbe = FARBEN[Math.min(FARBEN.length - 1, Math.floor(f * FARBEN.length))];
            const r = t.groesse * (0.7 + f * 1.6);
            g.fillStyle(farbe, f < 0.75 ? 0.9 : 0.9 * (1 - f) * 4).fillRect(Math.round(t.x - r / 2), Math.round(t.y - r / 2), Math.round(r), Math.round(r));   // Pixelquadrate wie der Rest des Spiels
        }
    }

    // Alle Gegner im Kegel vor der Düse treffen
    schadeImKegel(ox, oy, winkel, l) {
        const scene = this.scene, w = WAFFEN.flame, jetzt = scene.time.now;
        const cos = Math.cos(winkel), sin = Math.sin(winkel);
        for (const e of scene.enemies) {
            if (!e.active) continue;
            const dx = e.x - ox, dy = e.y - oy;
            const vor = dx * cos + dy * sin, quer = Math.abs(-dx * sin + dy * cos);
            if (vor < -e.width / 2 || vor > l + e.width / 2) continue;
            if (quer > e.height / 2 + 10 + Math.max(0, vor) * Math.tan(w.kegel)) continue;
            e.brennt = { bis: jetzt + w.brenndauer, naechster: jetzt + w.brandTick };
            this.brennend.add(e);
            e.letzterTreffer = { a: winkel, w: 'flame', s: 1 };
            if (e.takeDamage(w.schaden, 'feuer')) { this.brennend.delete(e); scene.gegnerStirbt(e); }
            else if (Math.random() < 0.35) scene.treffer.zeige(e.x, e.y - 6, 99, 'flame', 1);     // Funken und Rauch am brennenden Gegner
        }
        for (const f of scene.faesser) {                                               // explosive Fässer fangen Feuer
            if (!f.active || f.zuendet) continue;
            const dx = f.x - ox, dy = f.y - oy, vor = dx * cos + dy * sin, quer = Math.abs(-dx * sin + dy * cos);
            if (vor > 0 && vor <= l + 20 && quer <= 24 + vor * Math.tan(w.kegel)) scene.zuendeFass(f);
        }
    }

    // Brennende Gegner nehmen weiter Schaden, bis die Brenndauer um ist (oder sie sterben)
    brennen(jetzt) {
        const w = WAFFEN.flame;
        for (const e of [...this.brennend]) {
            if (!e.active || !e.brennt || jetzt > e.brennt.bis) { this.brennend.delete(e); if (e.brennt) e.brennt = null; continue; }
            if (jetzt >= e.brennt.naechster) {
                e.brennt.naechster = jetzt + w.brandTick;
                e.letzterTreffer = { a: 99, w: 'flame', s: 1 };
                if (e.takeDamage(w.brandSchaden, 'feuer')) { this.brennend.delete(e); this.scene.gegnerStirbt(e); }
            }
        }
    }

    // Sofort alles Feuer löschen (Szene verlassen)
    aufraeumen() {
        this.teilchen.length = 0;
        this.brennend.clear();
        if (this.g) this.g.clear();
    }
}
