import { sfx } from './Sound.js';

// Touch-Steuerung für das Handy, angelehnt an Brawl Stars:
//   LINKER Daumen   = Bewegungsstick (schwebt dorthin, wo man hintippt). Seitlich = Laufen, nach oben schieben = Springen.
//   RECHTER Daumen  = Zielstick. Ziehen zielt, solange man gezogen hält, feuert die Waffe automatisch.
//                     Kurzes Tippen = Schnellschuss (oder Hieb) auf den nächsten Gegner.
//   Knöpfe          = Springen, Nachladen, Granate, Verbandskasten, Interaktion (Seilbahn, Wiederbeleben), Pause, Vollbild.
//   Inventarleiste  = Plätze antippen.
// Das Touch-Modul schaltet sich selbst ein, sobald der erste Finger den Bildschirm berührt (oder auf Handys/Tablets sofort).
// Zum Testen am Computer: Adresse mit ?touch=1 öffnen, dann steuert die Maus die Sticks (immer nur ein "Finger").

const R = 105;                   // Radius eines Sticks (größer = unempfindlicher: man muss weiter ziehen)
const GRANATE_R = 170;           // so weit zieht man vom Granatenknopf für den weitesten Wurf
const TIPP_ZEIT = 260;           // so kurz muss ein Tippen sein (ms)
const ZIELHILFE = 0.2;           // so nah (im Bogenmaß) muss ein Gegner an der Zielrichtung liegen, damit sie einrastet

// Knöpfe: Position und Größe im Spielfenster (720 hoch, rechts verankert: B = Fensterbreite)
const knoepfeFuer = (B, H) => ({
    nachladen:  { x: B - 195, y: H - 330, r: 36 },
    granate:    { x: B - 85,  y: H - 390, r: 40 },
    heilen:     { x: B - 85,  y: H - 270, r: 40 },
    interaktion:{ x: B - 350, y: H - 250, r: 46 },
    pause:      { x: B - 42,  y: 40,  r: 26 },
    vollbild:   { x: B - 108, y: 40,  r: 26 },
});

export default class Touch {
    constructor(scene) {
        this.scene = scene;
        this.K = knoepfeFuer(scene.scale.width, scene.scale.height);
        const dev = scene.sys.game.device;
        const param = new URLSearchParams(window.location.search).get('touch');
        this.erzwungen = param === '1';                         // Testmodus mit der Maus
        this.aktiv = this.erzwungen || !!scene.registry.get('touch') || !!(dev.os.android || dev.os.iOS || dev.os.iPad || dev.os.iPhone);
        this.links = { id: null, bx: 0, by: 0, x: 0, y: 0 };
        this.rechts = { id: null, bx: 0, by: 0, x: 0, y: 0, t0: 0, bewegt: false };
        this.finger = new Map();                                // Finger-Nummer -> gedrückter Knopf
        this.gedrueckt = {};                                    // Name -> true, solange gehalten
        this.winkel = 0;                                        // aktuelle Zielrichtung
        this.tippBis = 0;                                       // bis dahin gilt ein Tipp als "Schuss"
        this.tippFlag = false;
        this.tippEvent = false;                                 // in diesem Bild getippt?
        this.feuer = false;                                     // Zielstick wird gezogen gehalten
        this.feuerBeginn = false;                               // in diesem Bild neu begonnen
        this.zielSichtbarBis = 0;
        this.endeTipp = false;
        this.eTipp = false;                                     // Interaktion getippt (ein Bild lang)
        this.sprungTipp = false;                                // Stick nach oben neu gedrückt
        this.druckZeit = {};                                    // wann ein Knopf zuletzt gedrückt wurde (für die Welle)
        this.sprungVorher = false;
        this.interaktionText = null;                            // wird von der Szene gesetzt, solange etwas zum Benutzen da ist
        this.granatenZiel = null;                               // {id, x, y}: gerade wird eine Granate gezielt (Knopf gedrückt und gezogen)
        this.granatenWurf = null;                               // {winkel, abstand}: Wurf, den die Szene im nächsten Bild ausführt

        scene.input.addPointer(3);                              // bis zu fünf Finger
        this.g = scene.add.graphics().setScrollFactor(0).setDepth(40);
        const stil = { fontSize: '16px', color: '#ffffff', stroke: '#000000', strokeThickness: 3, fontFamily: 'monospace' };
        this.eText = scene.add.text(this.K.interaktion.x, this.K.interaktion.y, 'E', { ...stil, fontSize: '34px', fontStyle: 'bold' }).setOrigin(0.5).setScrollFactor(0).setDepth(41);
        this.eLabel = scene.add.text(this.K.interaktion.x, this.K.interaktion.y - 62, '', { ...stil, fontSize: '18px' }).setOrigin(0.5).setScrollFactor(0).setDepth(41);
        this.zahlGranate = scene.add.text(this.K.granate.x + 26, this.K.granate.y + 24, '', stil).setOrigin(0.5).setScrollFactor(0).setDepth(41);
        this.zahlHeilen = scene.add.text(this.K.heilen.x + 26, this.K.heilen.y + 24, '', stil).setOrigin(0.5).setScrollFactor(0).setDepth(41);

        scene.input.on('pointerdown', (p) => this.runter(p));
        scene.input.on('pointermove', (p) => this.bewegt(p));
        scene.input.on('pointerup', (p) => this.hoch(p));
        scene.input.on('pointerupoutside', (p) => this.hoch(p));
        // Beim Verlassen der Szene aufräumen (die Ereignisse hängen an der Eingabe der Szene und verschwinden mit ihr)
        this.setzeSichtbar();
    }

    // Das Fenster hat seine Form geändert: Knöpfe rechts neu verankern.
    layout() {
        this.K = knoepfeFuer(this.scene.scale.width, this.scene.scale.height);
        const k = this.K;
        this.eText.setPosition(k.interaktion.x, k.interaktion.y);
        this.eLabel.setPosition(k.interaktion.x, k.interaktion.y - 62);
        this.zahlGranate.setPosition(k.granate.x + 26, k.granate.y + 24);
        this.zahlHeilen.setPosition(k.heilen.x + 26, k.heilen.y + 24);
    }

    setzeSichtbar() {
        const an = this.aktiv;
        this.g.setVisible(an);
        this.eText.setVisible(false);
        this.eLabel.setVisible(false);
        this.zahlGranate.setVisible(an);
        this.zahlHeilen.setVisible(an);
    }

    // ---------- Eingaben ----------

    knopfBei(x, y) {
        for (const [name, k] of Object.entries(this.K)) {
            if (name === 'interaktion' && !this.interaktionText) continue;
            if (Math.hypot(x - k.x, y - k.y) <= k.r + 10) return name;
        }
        return null;
    }

    runter(p) {
        if (!this.aktiv) {
            if (!p.wasTouch) return;
            this.aktiv = true;
            this.scene.registry.set('touch', true);
            this.setzeSichtbar();
        } else if (!p.wasTouch && !this.erzwungen) {
            return;                                             // die Maus zählt nur im Testmodus
        }
        const s = this.scene;
        const knopf = this.knopfBei(p.x, p.y);
        if (knopf) { this.knopfDruecken(knopf, p.id); return; }
        if (s.gameOver) { this.endeTipp = true; return; }
        for (let i = 0; i < (s.slotRects ?? []).length; i++) {   // Inventarleiste antippen
            const r = s.slotRects[i];
            if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y - 6 && p.y <= r.y + r.h + 6) {
                if (!s.player.tot) { s.player.waehle(i + 1); sfx.play('hit'); }
                return;
            }
        }
        if (p.y < 130) return;
        const st = p.x < s.scale.width / 2 ? this.links : this.rechts;
        if (st.id !== null) return;
        st.id = p.id; st.bx = p.x; st.by = p.y; st.x = 0; st.y = 0;
        if (st === this.rechts) { st.t0 = s.time.now; st.bewegt = false; }
    }

    knopfDruecken(name, id) {
        const s = this.scene, p = s.player;
        this.finger.set(id, name);
        this.gedrueckt[name] = true;
        this.druckZeit[name] = this.scene.time.now;
        if (name === 'nachladen') p.touchEin.nachladen = true;
        else if (name === 'granate') {
            if (p.grenades > 0 && !p.tot) this.granatenZiel = { id, x: 0, y: 0 };      // zielen: ziehen, loslassen wirft
            else s.showMessage('Keine Granaten mehr!');
        }
        else if (name === 'heilen') p.touchEin.heilen = true;
        else if (name === 'interaktion') this.eTipp = true;
        else if (name === 'pause') s.touchPause();
        else if (name === 'vollbild') s.vollbildUmschalten();
    }

    bewegt(p) {
        if (this.granatenZiel && this.granatenZiel.id === p.id) {
            const k = this.K.granate;
            let dx = p.x - k.x, dy = p.y - k.y;
            const len = Math.hypot(dx, dy);
            if (len > GRANATE_R) { dx *= GRANATE_R / len; dy *= GRANATE_R / len; }
            this.granatenZiel.x = dx; this.granatenZiel.y = dy;
        }
        for (const st of [this.links, this.rechts]) {
            if (st.id !== p.id) continue;
            let dx = p.x - st.bx, dy = p.y - st.by;
            const len = Math.hypot(dx, dy);
            if (len > R) {                                      // der Stick folgt dem Daumen, wenn er zu weit gezogen wird
                st.bx += dx / len * (len - R);
                st.by += dy / len * (len - R);
                dx = p.x - st.bx; dy = p.y - st.by;
            }
            st.x = Phaser.Math.Clamp(dx / R, -1, 1);
            st.y = Phaser.Math.Clamp(dy / R, -1, 1);
            if (st === this.rechts && Math.hypot(st.x, st.y) > 0.4) st.bewegt = true;
        }
    }

    hoch(p) {
        const name = this.finger.get(p.id);
        if (name) { this.finger.delete(p.id); this.gedrueckt[name] = false; }
        if (this.granatenZiel && this.granatenZiel.id === p.id) {
            const z = this.granatenZiel, len = Math.hypot(z.x, z.y);
            this.granatenZiel = null;
            if (len < 26) this.granatenWurf = { winkel: this.naechsterWinkel(true), abstand: 340 };          // nur getippt: auf den nächsten Gegner
            else this.granatenWurf = { winkel: Math.atan2(z.y, z.x), abstand: 140 + (len / GRANATE_R) * 520 };   // gezogen: Richtung und Weite
            this.zielSichtbarBis = 0;
        }
        if (this.links.id === p.id) { this.links.id = null; this.links.x = 0; this.links.y = 0; }
        if (this.rechts.id === p.id) {
            const kurz = this.scene.time.now - this.rechts.t0 < TIPP_ZEIT;
            if (kurz && !this.rechts.bewegt && !this.scene.gameOver) this.tippFlag = true;     // kurzes Tippen = Schnellschuss
            this.rechts.id = null; this.rechts.x = 0; this.rechts.y = 0; this.rechts.bewegt = false;
        }
    }

    // ---------- Jedes Bild ----------

    update() {
        const s = this.scene, p = s.player, ein = p.touchEin;
        this.tippEvent = this.tippFlag; this.tippFlag = false;
        const eTippJetzt = this.eTipp; this.eTipp = false; this.eTippAktuell = eTippJetzt;
        if (!this.aktiv) return;
        const lebt = !p.tot && !s.gameOver;
        if (!lebt) this.granatenZiel = null;
        if (this.granatenWurf) {                                // der gezielte Wurf
            const w = this.granatenWurf; this.granatenWurf = null;
            if (lebt && p.grenades > 0) { this.winkel = w.winkel; s.throwGrenade(w.winkel, w.abstand); }
        }

        // Bewegung: links/rechts laufen, nach oben schieben (oder Sprungknopf) springt
        const lx = lebt ? this.links.x : 0, ly = lebt ? this.links.y : 0;
        // Überwiegend seitlich = laufen; überwiegend hoch/runter = klettern oder springen (so löst ein leicht schräger Daumen auf der Leiter nichts aus)
        ein.links = lx < -0.35 && Math.abs(lx) > Math.abs(ly) * 0.7;
        ein.rechts = lx > 0.35 && Math.abs(lx) > Math.abs(ly) * 0.7;
        ein.hoch = ly < -0.55 && Math.abs(ly) > Math.abs(lx) * 0.7;
        ein.runter = ly > 0.55 && Math.abs(ly) > Math.abs(lx) * 0.7;
        const sprung = lebt && ly < -0.65;                      // nach oben schieben = springen (es gibt keinen Sprungknopf)
        ein.sprung = sprung;
        this.sprungTipp = sprung && !this.sprungVorher;
        this.sprungVorher = sprung;

        // Zielen
        const m = Math.hypot(this.rechts.x, this.rechts.y);
        const jetzt = s.time.now;
        const vorherFeuer = this.feuer;
        this.feuer = lebt && this.rechts.id !== null && m > 0.4;
        this.feuerBeginn = this.feuer && !vorherFeuer;
        if (this.feuer) {
            // Der Winkel folgt dem Daumen etwas träge: Das glättet Zittern und macht das Zielen ruhiger
            const ziel = this.hilfe(Math.atan2(this.rechts.y, this.rechts.x));
            this.winkel += Phaser.Math.Angle.Wrap(ziel - this.winkel) * (this.feuerBeginn ? 1 : 0.4);
            this.zielSichtbarBis = jetzt + 400;
        } else if (this.tippEvent && lebt) {
            this.winkel = this.naechsterWinkel();
            this.tippBis = jetzt + 120;
            this.zielSichtbarBis = jetzt + 300;
        } else if (jetzt > this.zielSichtbarBis && Math.abs(lx) > 0.35) {
            this.winkel = lx > 0 ? 0 : Math.PI;                 // ohne Zielen schaut die Figur in Laufrichtung
        }

        // Zahlen an den Knöpfen
        this.zahlGranate.setText(`x${p.grenades}`);
        this.zahlHeilen.setText(`x${p.medkits}`);
        const zeigeE = !!this.interaktionText && lebt;
        this.eText.setVisible(zeigeE); this.eLabel.setVisible(zeigeE).setText(this.interaktionText ?? '');
        this.zeichne(zeigeE);
    }

    // Gilt ein Tippen gerade als Schuss? (Dann feuert die Szene einen Moment lang.)
    tippSchuss() { return this.scene.time.now < this.tippBis; }

    // Der Zielpunkt in der Welt (für Schießen, Granate, Hieb und Mitspieler-Anzeige).
    zielPunkt(p) {
        return { x: p.x + Math.cos(this.winkel) * 340, y: p.y + Math.sin(this.winkel) * 340 };
    }

    // Zielhilfe: Liegt ein Gegner fast in Zielrichtung, rastet der Schuss auf ihn ein.
    hilfe(winkel) {
        const p = this.scene.player;
        let beste = null, abst = ZIELHILFE;
        for (const e of this.scene.enemies) {
            if (!e.active) continue;
            const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy);
            if (d > 800 || d < 30) continue;
            const w = Math.atan2(dy, dx), diff = Math.abs(Phaser.Math.Angle.Wrap(w - winkel));
            if (diff < abst) { abst = diff; beste = w; }
        }
        return beste ?? winkel;
    }

    // Der Winkel zum nächsten Gegner (für den Schnellschuss). Ohne Gegner in der Nähe: in Blickrichtung.
    // Die Zielhilfe ist bewusst nur mittelstark: kürzere Reichweite, und der Schuss geht nur zu 80 % in Richtung des Gegners
    // (der Rest bleibt waagerecht), also etwas ungenauer als ein exakter Treffer. exakt = true (Granatenwurf) zielt voll.
    naechsterWinkel(exakt = false) {
        const p = this.scene.player;
        let beste = null, bd = Infinity;
        for (const e of this.scene.enemies) {
            if (!e.active) continue;
            const dx = e.x - p.x, dy = e.y - p.y;
            if (Math.abs(dx) > (exakt ? 800 : 640) || Math.abs(dy) > (exakt ? 450 : 340)) continue;
            const d = Math.hypot(dx, dy);
            if (d < bd) { bd = d; beste = Math.atan2(dy, dx); }
        }
        if (beste === null) return Math.cos(this.winkel) >= 0 ? 0 : Math.PI;
        if (exakt) return beste;
        const waagerecht = Math.cos(beste) >= 0 ? 0 : Math.PI;
        return waagerecht + Phaser.Math.Angle.Wrap(beste - waagerecht) * 0.8;
    }

    // ---------- Zeichnen ----------

    zeichne(zeigeE) {
        const g = this.g, s = this.scene, p = s.player;
        g.clear();
        const jetzt = s.time.now;
        // Ein "Glasknopf": durchsichtiger Farbton, dunklere Mulde unten, heller Rand oben links, Glanzbogen und Glanzfleck.
        // Beim Drücken wird er etwas kleiner und heller, und eine Welle läuft nach außen.
        const glas = (name, x, y, r, farbe, aktiv, schwach = false) => {
            const rr = r * (aktiv ? 0.93 : 1), a = schwach ? 0.5 : 1;
            g.fillStyle(0x000000, 0.2 * a).fillCircle(x + 2, y + 4, rr + 2);                              // weicher Schatten
            g.fillStyle(farbe, (aktiv ? 0.5 : 0.26) * a).fillCircle(x, y, rr);                            // Glaskörper
            g.fillStyle(0x000000, 0.16 * a).fillCircle(x, y + rr * 0.2, rr * 0.8);                        // Mulde unten
            g.fillStyle(0xffffff, (aktiv ? 0.14 : 0.07) * a).fillCircle(x - rr * 0.1, y - rr * 0.15, rr * 0.62);
            g.lineStyle(3, 0xffffff, (aktiv ? 0.85 : 0.5) * a).strokeCircle(x, y, rr);                    // Rand
            g.lineStyle(3, 0xffffff, (aktiv ? 0.9 : 0.6) * a).beginPath().arc(x, y, rr - 5, Math.PI * 1.05, Math.PI * 1.6, false).strokePath();   // Glanzbogen
            g.lineStyle(2, 0x000000, 0.28 * a).beginPath().arc(x, y, rr - 4, Math.PI * 0.05, Math.PI * 0.55, false).strokePath();               // Schattenbogen
            g.fillStyle(0xffffff, 0.3 * a).fillEllipse(x - rr * 0.34, y - rr * 0.56, rr * 0.5, rr * 0.2);  // Glanzfleck
            const t0 = this.druckZeit[name];
            if (t0 !== undefined && jetzt - t0 < 380) {
                const alter = jetzt - t0;
                g.lineStyle(3, 0xffffff, 0.5 * (1 - alter / 380)).strokeCircle(x, y, r + alter * 0.06);   // Welle
            }
        };
        // Sticks: im Ruhezustand ein blasser Hinweis, beim Berühren wandert die Mitte zum Finger
        const stick = (st, mx, my, farbe) => {
            const an = st.id !== null;
            const bx = an ? st.bx : mx, by = an ? st.by : my;
            g.fillStyle(farbe, an ? 0.12 : 0.06).fillCircle(bx, by, R);                                  // Scheibe
            g.lineStyle(3, farbe, an ? 0.55 : 0.25).strokeCircle(bx, by, R);
            g.lineStyle(2, 0xffffff, an ? 0.2 : 0.1).strokeCircle(bx, by, R * 0.55);                      // innerer Ring
            for (let k = 0; k < 4; k++) {                                                               // Kerben an den Himmelsrichtungen
                const w = k * Math.PI / 2;
                g.lineStyle(3, 0xffffff, an ? 0.4 : 0.18).beginPath().moveTo(bx + Math.cos(w) * (R - 12), by + Math.sin(w) * (R - 12)).lineTo(bx + Math.cos(w) * (R - 3), by + Math.sin(w) * (R - 3)).strokePath();
            }
            const kx = bx + st.x * R, ky = by + st.y * R;
            glas('stick', kx, ky, 40, farbe, an, !an);                                                  // Griff aus Glas
        };
        stick(this.links, 170, s.scale.height - 135, 0x66c2ff);
        stick(this.rechts, s.scale.width - 170, s.scale.height - 135, 0xff8a5c);
        if (this.rechts.id !== null && this.feuer) {                    // Zielrichtung als Linie
            g.lineStyle(3, 0xff8a5c, 0.5).beginPath().moveTo(this.rechts.bx, this.rechts.by).lineTo(this.rechts.bx + this.rechts.x * R * 1.6, this.rechts.by + this.rechts.y * R * 1.6).strokePath();
        }
        // Granate zielen: gepunktete Flugbahn und Aufschlagpunkt (in Weltkoordinaten berechnet, auf den Bildschirm umgerechnet)
        const gz = this.granatenZiel;
        if (gz) {
            const cam = s.cameras.main, kn = this.K.granate;
            const len = Math.hypot(gz.x, gz.y);
            const w = len < 26 ? this.naechsterWinkel(true) : Math.atan2(gz.y, gz.x);
            const abstand = len < 26 ? 340 : 140 + (len / GRANATE_R) * 520;
            const tempo = Phaser.Math.Clamp(abstand * 1.6, 250, 650);
            let x = p.x, y = p.y - 10, vx = Math.cos(w) * tempo, vy = Math.sin(w) * tempo - 180, treffer = null;
            for (let t = 0; t < 1.5 && !treffer; t += 0.04) {
                vy += 900 * 0.04; x += vx * 0.04; y += vy * 0.04;
                for (const pl of s.platforms) {
                    const b = pl.body;
                    if (b && x >= b.left && x <= b.right && y >= b.top && y <= b.bottom) { treffer = { x, y }; break; }
                }
                if (!treffer) g.fillStyle(0xffffff, 0.75).fillCircle(x - cam.worldView.x, y - cam.worldView.y, 3);
            }
            const ex = (treffer ?? { x, y }).x - cam.worldView.x, ey = (treffer ?? { x, y }).y - cam.worldView.y;
            g.lineStyle(3, 0xff5533, 0.9).strokeCircle(ex, ey, 18);
            g.fillStyle(0xff5533, 0.25).fillCircle(ex, ey, 18);
            g.lineStyle(3, 0xffffff, 0.5).beginPath().moveTo(kn.x, kn.y).lineTo(kn.x + gz.x, kn.y + gz.y).strokePath();
            g.fillStyle(0xffffff, 0.5).fillCircle(kn.x + gz.x, kn.y + gz.y, 16);
        }
        // Knöpfe (aus Glas, jeder mit eigenem Farbton)
        const k = this.K;
        const nachlaedt = p.isReloading();
        glas('nachladen', k.nachladen.x, k.nachladen.y, k.nachladen.r, 0xffc933, this.gedrueckt.nachladen || nachlaedt);
        g.lineStyle(5, 0xfff0b0, 0.95).beginPath().arc(k.nachladen.x, k.nachladen.y, 13, 0.5 + (nachlaedt ? jetzt * 0.006 : 0), 5.4 + (nachlaedt ? jetzt * 0.006 : 0), false).strokePath();   // dreht sich beim Nachladen
        const ax = k.nachladen.x + Math.cos(0.5 + (nachlaedt ? jetzt * 0.006 : 0)) * 13, ay = k.nachladen.y + Math.sin(0.5 + (nachlaedt ? jetzt * 0.006 : 0)) * 13;
        g.fillStyle(0xfff0b0, 0.95).fillCircle(ax, ay, 4);
        glas('granate', k.granate.x, k.granate.y, k.granate.r, 0x7ccf5a, this.gedrueckt.granate || !!this.granatenZiel, p.grenades === 0);
        s.zeichneSymbol(g, 'grenade', k.granate.x, k.granate.y - 2, p.grenades > 0 ? 1 : 0.3);
        glas('heilen', k.heilen.x, k.heilen.y, k.heilen.r, 0xff5a5a, this.gedrueckt.heilen, p.medkits === 0 || p.health >= p.maxHealth);
        s.zeichneSymbol(g, 'medkit', k.heilen.x, k.heilen.y - 2, p.medkits > 0 ? 1 : 0.3);
        if (zeigeE) {                                                                                  // Interaktion: atmet leicht, damit man sie bemerkt
            const atem = 1 + 0.04 * Math.sin(jetzt * 0.006);
            glas('interaktion', k.interaktion.x, k.interaktion.y, k.interaktion.r * atem, 0x66c2ff, this.gedrueckt.interaktion);
        }
        glas('pause', k.pause.x, k.pause.y, k.pause.r, 0xcfd8dc, this.gedrueckt.pause);
        g.fillStyle(0xffffff, 0.85).fillRoundedRect(k.pause.x - 9, k.pause.y - 10, 6, 20, 2).fillRoundedRect(k.pause.x + 3, k.pause.y - 10, 6, 20, 2);
        glas('vollbild', k.vollbild.x, k.vollbild.y, k.vollbild.r, 0xcfd8dc, this.gedrueckt.vollbild);
        g.lineStyle(3, 0xffffff, 0.85);
        const c = k.vollbild, d = 11, l = 6;
        for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
            g.beginPath().moveTo(c.x + sx * d, c.y + sy * (d - l)).lineTo(c.x + sx * d, c.y + sy * d).lineTo(c.x + sx * (d - l), c.y + sy * d).strokePath();
        }
    }
}
