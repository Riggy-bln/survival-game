import { sfx } from './Sound.js';

// Mehrspieler im Spiel.
//
// Arbeitsteilung (Gastgeber = "Host", Mitspieler = "Gäste"):
//  - JEDES Gerät steuert seine eigene Figur mit voller Physik (Bewegung, Munition, Inventar, Leben). Dadurch reagiert
//    die Steuerung sofort. 20-mal pro Sekunde geht der Zustand der eigenen Figur an die anderen (über den Gastgeber).
//  - Der GASTGEBER rechnet die Welt: Gegner, Boss, alle Kugeln, Granaten, Fässer, zerstörbare Wände und den Schaden,
//    den Spieler nehmen. Er schickt 20-mal pro Sekunde einen "Weltzustand", den die Gäste nur noch anzeigen.
//  - Gäste melden dem Gastgeber, was sie tun: Schüsse, Granatwürfe, eingesammelte Gegenstände, Wiederbelebungen.
//
// Nachrichten (Feld "t"):
//   z        Zustand einer Spielerfigur             alle -> alle (über den Gastgeber)
//   w        Weltzustand                            Gastgeber -> Gäste
//   sg / gr  Schuss / Granatwurf eines Gastes       Gast -> Gastgeber
//   fx       Effekt (Mündungsfeuer, Explosion ...)  Gastgeber -> Gäste
//   tot      ein Gegner ist gestorben               Gastgeber -> Gäste
//   schaden  du hast Schaden genommen               Gastgeber -> betroffener Gast
//   pk       Gegenstand eingesammelt                Gast <-> Gastgeber
//   bl / belebt  Wiederbeleben (Fortschritt / fertig)
//   sieg / niederlage / neustart  Ende und Neustart
export const SPIELERFARBEN = [0x4f7a3a, 0x3a5f9a, 0x9a4a3a, 0x9a8a3a];   // Spieler 1 grün, 2 blau, 3 rot, 4 gelb

const SENDEPAUSE = 50;     // alle 50 ms eine Nachricht (20 pro Sekunde)

export default class Mehrspieler {
    constructor(scene, netz) {
        this.scene = scene;
        this.netz = netz;
        this.istHost = netz.rolle === 'host';
        this.fern = new Map();             // nr -> Zustand einer fremden Figur
        this.kugelBilder = new Map();      // Gäste: Kugeln anderer, nur als Bild
        this.granatenBilder = new Map();
        this.naechsteSendung = 0;
        this.naechsteBelebenMeldung = 0;
        this.escBis = 0;
        this.verlassen = false;
        this.siegGemeldet = false;

        netz.on('nachricht', (von, daten) => this.empfange(von, daten))
            .on('getrennt', (nr) => this.getrennt(nr))
            .on('spielerGeaendert', () => this.aktualisiereAnzeige())
            .on('ping', () => {})
            .on('verloren', (nr) => this.verloren(nr))
            .on('wieder', (nr) => this.wieder(nr))
            .on('fehler', (text) => scene.showMessage(text));

        this.anzeige = scene.add.text(scene.scale.width - 20, 20, '', {
            fontSize: '14px', color: '#cfd8dc', align: 'right', lineSpacing: 4,
        }).setOrigin(1, 0).setScrollFactor(0).setDepth(20);
        // Banner bei Verbindungsproblemen und eine kleine Diagnosezeile unten links
        this.banner = scene.add.text(scene.scale.width / 2, 70, '', {
            fontSize: '22px', color: '#ffffff', backgroundColor: '#aa2222cc', padding: { x: 14, y: 8 }, align: 'center',
        }).setOrigin(0.5).setScrollFactor(0).setDepth(30).setVisible(false);
        this.diagnose = scene.add.text(14, scene.scale.height - 24, '', { fontSize: '12px', color: '#8fa0ab' }).setScrollFactor(0).setDepth(20);
        this.naechsteDiagnose = 0;
        this.aktualisiereAnzeige();
        scene.showMessage(`Mehrspieler: Du bist Spieler ${netz.meineNr}`);
    }

    // ---------- Senden ----------
    sendeAnAlle(daten) { if (this.istHost) this.netz.sende(daten); }          // nur der Gastgeber verteilt an alle
    sendeAnHost(daten) { if (!this.istHost) this.netz.sende(daten); }
    sendeAn(nr, daten) { if (this.istHost) this.netz.sendeAn(nr, daten); }

    // Das Fenster hat seine Form geändert: Anzeigen am rechten Rand und in der Mitte neu setzen.
    layout() {
        const B = this.scene.scale.width;
        this.anzeige.setX(B - 20);
        this.banner.setX(B / 2);
    }

    // Die Liste oben rechts: Wer ist dabei?
    aktualisiereAnzeige() {
        if (!this.anzeige || !this.anzeige.active) return;
        const zeilen = this.netz.liste().map((s) => {
            const ich = s.nr === this.netz.meineNr ? ' (du)' : '';
            const host = s.nr === 1 ? ' [Gastgeber]' : '';
            const r = this.fern.get(s.nr);
            const unten = (s.nr === this.netz.meineNr ? this.scene.player.tot : (r && r.tot)) ? ' - am Boden' : '';
            return `${s.name}${host}${ich}${unten}`;
        });
        this.anzeige.setText(zeilen.join('\n'));
    }

    // Eigene Verbindung (Gast) oder die eines Mitspielers (Gastgeber) ist abgerissen.
    verloren(nr) {
        if (this.netz.rolle === 'gast') {
            this.banner.setText('Verbindung zum Gastgeber unterbrochen.\nVersuche, sie neu aufzubauen ...').setVisible(true);
        } else {
            const r = this.fern.get(nr);
            if (r) { r.getrennt = true; r.label.setText(`${this.netz.nameVon(nr)} (Verbindung?)`); }
            this.scene.showMessage(`Verbindung zu ${this.netz.nameVon(nr)} unterbrochen ...`);
        }
    }

    wieder(nr) {
        if (this.netz.rolle === 'gast') {
            this.banner.setVisible(false);
            this.scene.showMessage('Wieder verbunden.');
        } else {
            const r = this.fern.get(nr);
            if (r) { r.getrennt = false; r.label.setText(this.netz.nameVon(nr)); }
            this.scene.showMessage(`${this.netz.nameVon(nr)} ist wieder da.`);
        }
    }

    // Jedes Bild aufrufen: eigenen Zustand senden, fremde Figuren und (bei Gästen) die Welt nachführen.
    aktualisiere() {
        const jetzt = this.scene.time.now;
        if (jetzt >= this.naechsteSendung) {
            this.naechsteSendung = jetzt + SENDEPAUSE;
            this.sendeZustand(jetzt);
            if (this.istHost) this.sendeWelt();
        }
        if (jetzt >= this.naechsteDiagnose) {
            this.naechsteDiagnose = jetzt + 1000;
            this.diagnose.setText(`Netz: ${this.netz.zustandsText()}`);
            this.aktualisiereAnzeige();
        }
        const zeit = performance.now();
        for (const r of this.fern.values()) {
            // Zielposition: die zuletzt gemeldete Position, bis zu 100 ms in Laufrichtung weitergedacht (gleicht die Laufzeit aus)
            const alter = Math.min(0.1, (zeit - r.ziel.t) / 1000);
            const zx = r.ziel.x + r.ziel.vx * alter, zy = r.ziel.y + r.ziel.vy * alter;
            const abstand = Math.hypot(zx - r.x, zy - r.y);
            const k = abstand > 250 ? 1 : 0.35;                 // sehr weit weg (zum Beispiel nach Teleport): sofort hin
            r.x += (zx - r.x) * k;
            r.y += (zy - r.y) * k;
            r.vx = r.ziel.vx; r.vy = r.ziel.vy; r.a = r.ziel.a; r.w = r.ziel.w; r.g = r.ziel.g; r.h = r.ziel.h; r.s = r.ziel.s;
            r.tot = !!r.ziel.d;
            r.z = !!r.ziel.z;
            r.label.setPosition(r.x, r.y - 58);
        }
        if (!this.istHost) this.fuehreWeltNach();
    }

    // ---------- Zustand der eigenen Figur ----------
    sendeZustand(jetzt) {
        const sz = this.scene;
        const p = sz.player;
        const zp = sz.zielPunkt();
        const winkel = Phaser.Math.Angle.Between(p.x, p.y, zp.x, zp.y);
        this.netz.sende({
            t: 'z',
            x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10,
            vx: Math.round(p.body.velocity.x), vy: Math.round(p.body.velocity.y),
            a: Math.round(winkel * 100) / 100,
            w: p.inHand(), h: p.health, g: p.body.blocked.down ? 1 : 0, d: p.tot ? 1 : 0, z: p.seil ? 1 : 0,
            s: p.lastShotTime ? Math.round(jetzt - p.lastShotTime) : 9999,    // Millisekunden seit dem letzten Schuss (für den Rückstoß)
        });
    }

    // ---------- Weltzustand (nur Gastgeber) ----------
    // Gegner und Kugeln, 20-mal pro Sekunde. Gegner weit weg von allen Spielern werden nicht mitgeschickt (sie sind unsichtbar).
    sendeWelt() {
        const sz = this.scene;
        const ziele = [sz.player, ...this.fern.values()];
        const nah = (e) => ziele.some((z) => Math.abs(z.x - e.x) < 1500 && Math.abs(z.y - e.y) < 900);
        const jetzt = sz.time.now;
        const e = [];
        for (const g of sz.gegnerNachId) {
            if (!g.active || g.schlaeft || !nah(g)) continue;
            e.push([g.id, Math.round(g.x), Math.round(g.y), Math.round(g.body.velocity.x), g.direction ?? 1,
                g.health, g.maxHealth, g.fillColor, g.lastShotTime ? Math.round(jetzt - g.lastShotTime) : 9999, g.activated ? 1 : 0, g.schild ? 1 : 0]);
        }
        const b = [];
        const kugel = (k, besitzer) => b.push([k.id, Math.round(k.x), Math.round(k.y), Math.round(k.rotation * 100) / 100, besitzer, k.speed ?? 900]);
        for (const k of sz.bullets) if (k.active) kugel(k, k.owner ?? 1);
        for (const k of sz.enemyBullets) if (k.active) kugel(k, k.gross ? 9 : (k.pfeil ? 8 : 0));   // Besitzer 0 = Gegner, 8 = Pfeil, 9 = Felsbrocken
        const g = sz.grenadeList.filter((x) => x.active).map((x) => [x.id, Math.round(x.x), Math.round(x.y), x.owner ?? 1]);
        this.netz.sende({ t: 'w', e, b, g, k: sz.kills });
    }

    // ---------- Weltzustand anzeigen (nur Gäste) ----------
    wendeWeltAn(d) {
        const sz = this.scene;
        sz.kills = d.k;
        for (const a of d.e) {
            const g = sz.gegnerNachId[a[0]];
            if (!g || !g.active) continue;
            const erster = g.zx === undefined;
            g.zx = a[1]; g.zy = a[2];
            if (erster || Math.hypot(g.zx - g.x, g.zy - g.y) > 300) { g.x = a[1]; g.y = a[2]; }
            g.body.velocity.x = a[3];
            g.direction = a[4];
            g.health = a[5]; g.maxHealth = a[6];
            g.setFillStyle(a[7]);
            g.lastShotTime = a[8] >= 9999 ? undefined : sz.time.now - a[8];
            g.schild = !!a[10];
            if (g.activated !== undefined) {                       // die Kreatur: erwacht sie gerade?
                const aktiv = !!a[9];
                if (aktiv && !g.activated) sfx.play('roar');
                g.activated = aktiv;
            }
        }
        // Kugeln: nur die Bilder der Kugeln ANDERER (die eigenen zeigt dieses Gerät selbst, ohne Verzögerung)
        const gesehen = new Set();
        for (const [id, x, y, ang, besitzer, tempo] of d.b) {
            if (besitzer === this.netz.meineNr) continue;
            gesehen.add(id);
            let bild = this.kugelBilder.get(id);
            if (!bild) {
                bild = besitzer === 9 ? sz.add.rectangle(x, y, 22, 22, 0x8a7a60).setStrokeStyle(2, 0x4a4238).setDepth(6)
                    : besitzer === 8 ? sz.add.rectangle(x, y, 26, 3, 0xd8c9a0).setRotation(ang).setDepth(6)
                    : sz.add.rectangle(x, y, 14, 4, besitzer === 0 ? 0xff6644 : 0xffdd55).setRotation(ang).setDepth(6);
                bild.vx = Math.cos(ang) * tempo; bild.vy = Math.sin(ang) * tempo; bild.vonGegner = besitzer === 0 || besitzer >= 8;
                this.kugelBilder.set(id, bild);
                if (besitzer === 0) sfx.play('enemyShot'); else if (besitzer === 8) sfx.play('bogen');
            } else { bild.x = x; bild.y = y; }
        }
        for (const [id, bild] of this.kugelBilder) if (!gesehen.has(id)) { bild.destroy(); this.kugelBilder.delete(id); }
        const gesehenG = new Set();
        for (const [id, x, y, besitzer] of d.g) {
            if (besitzer === this.netz.meineNr) continue;
            gesehenG.add(id);
            let bild = this.granatenBilder.get(id);
            if (!bild) { bild = sz.add.rectangle(x, y, 14, 14, 0x556b2f).setStrokeStyle(2, 0xffffff).setDepth(6); this.granatenBilder.set(id, bild); }
            else { bild.x = x; bild.y = y; }
        }
        for (const [id, bild] of this.granatenBilder) if (!gesehenG.has(id)) { bild.destroy(); this.granatenBilder.delete(id); }
    }

    // Jedes Bild bei Gästen: Gegner weich ans Ziel führen, fremde Kugeln weiterfliegen lassen.
    fuehreWeltNach() {
        const sz = this.scene;
        const dt = Math.min(0.1, sz.game.loop.delta / 1000);
        for (const g of sz.gegnerNachId) {
            if (!g.active || g.zx === undefined) continue;
            g.x += (g.zx - g.x) * 0.4;
            g.y += (g.zy - g.y) * 0.4;
        }
        for (const k of this.kugelBilder.values()) {
            k.x += k.vx * dt; k.y += k.vy * dt;
            sz.fx.spur(k.x, k.y, !k.vonGegner);
        }
    }

    // ---------- Meldungen der Spieler ----------
    // Dieser Spieler hat geschossen. Gäste melden es dem Gastgeber (er erzeugt die echten Kugeln), der Gastgeber verteilt den Effekt.
    meldeSchuss(mx, my, winkel, winkelListe, reichweite, waffe) {
        if (this.istHost) {
            this.sendeAnAlle({ t: 'fx', k: 'schuss', x: mx, y: my, a: winkel, wp: waffe });
        } else {
            const p = this.scene.player;
            this.sendeAnHost({ t: 'sg', x: Math.round(p.x), y: Math.round(p.y), mx, my, a: winkel, w: winkelListe, r: reichweite, wp: waffe });
        }
    }

    // Ein Gast hat zugeschlagen: Der Gastgeber berechnet die Treffer.
    meldeHieb(x, y, a, schwert) { this.sendeAnHost({ t: 'hb', x, y, a: Math.round(a * 100) / 100, s: schwert ? 1 : 0 }); }
    sendeAnAlleAusser(nr, daten) { if (this.istHost) this.netz.sendeAnAlleAusser(nr, daten); }

    meldeGranate(x, y, vx, vy) { this.sendeAnHost({ t: 'gr', x, y, vx, vy }); }

    // Gegenstand eingesammelt: Die anderen entfernen ihn auch.
    meldePickup(id) {
        if (this.istHost) this.sendeAnAlle({ t: 'pk', id });
        else this.sendeAnHost({ t: 'pk', id });
    }

    // Dieser Spieler steht im Ziel: Der Sieg gilt für das ganze Team. Der Gastgeber verteilt ihn an alle (auch zurück an den
    // Absender). Gibt true zurück, wenn der Siegbildschirm hier schon angezeigt wurde.
    meldeSieg() {
        if (this.siegGemeldet) return this.scene.gameOver;
        this.siegGemeldet = true;
        this.netz.sende({ t: 'sieg', nr: this.netz.meineNr });
        if (this.istHost) {
            this.scene.zeigeTeamSieg(this.netz.meineNr);
            return true;
        }
        return false;                // Gast: Der Siegbildschirm kommt, sobald der Gastgeber antwortet
    }

    meldeNiederlage() { this.sendeAnAlle({ t: 'niederlage' }); }

    // Ein Spieler hat die Fahne erreicht: Der Checkpoint gilt für das ganze Team.
    meldeCheckpoint() { this.netz.sende({ t: 'cp' }); }
    // Alle liegen am Boden, es gibt einen Checkpoint: Der Gastgeber schickt alle dorthin zurück.
    meldeRespawn() { this.sendeAnAlle({ t: 'respawn' }); }

    // Wiederbeleben: Fortschritt (0 bis 1) an alle, damit man den Balken über dem Gefallenen sieht
    meldeBelebenFortschritt(ziel, p) {
        const jetzt = this.scene.time.now;
        if (jetzt < this.naechsteBelebenMeldung) return;
        this.naechsteBelebenMeldung = jetzt + 100;
        this.scene.belebenAnzeige(ziel, p);                               // auch lokal anzeigen
        const nachricht = { t: 'bl', ziel, p: Math.round(p * 100) / 100 };
        if (this.istHost) this.sendeAnAlle(nachricht); else this.sendeAnHost(nachricht);
    }

    // Fertig wiederbelebt: Der Gefallene bekommt die Meldung (Gast über den Gastgeber).
    meldeBelebt(ziel) {
        const nachricht = { t: 'belebt', ziel };
        if (this.istHost) this.sendeAn(ziel, nachricht); else this.sendeAnHost(nachricht);
    }

    // Enter auf dem Endbildschirm: Nur der Gastgeber startet das Spiel für alle neu.
    neustartWunsch() {
        if (!this.istHost) {
            this.scene.showMessage('Nur der Gastgeber kann neu starten.');
            return;
        }
        this.netz.sende({ t: 'neustart' });
        this.scene.scene.restart();
    }

    // ---------- Empfangen ----------
    empfange(von, daten) {
        const sz = this.scene;
        switch (daten.t) {
            case 'sieg':
                if (this.istHost) this.netz.sende(daten);              // an alle Gäste weitergeben (auch an den Absender)
                sz.zeigeTeamSieg(daten.nr);
                return;
            case 'niederlage': sz.zeigeNiederlage(); return;
            case 'cp':
                if (this.istHost) this.netz.sende(daten);              // an alle Gäste weitergeben
                sz.checkpointErreicht(true);
                return;
            case 'respawn': sz.respawnAnCheckpoint(); return;
            case 'neustart': sz.scene.restart(); return;
            case 'w': if (!this.istHost) this.wendeWeltAn(daten); return;
            case 'sg': if (this.istHost) sz.fremderSchuss(von, daten); return;
            case 'gr': if (this.istHost) sz.fremdeGranate(von, daten); return;
            case 'hb': if (this.istHost) sz.fremderHieb(von, daten); return;
            case 'fx': if (!this.istHost) sz.effektEmpfangen(daten); return;
            case 'tot': if (!this.istHost) sz.gegnerTotEmpfangen(daten); return;
            case 'schaden': if (!sz.player.tot) sz.player.takeDamage(daten.m, daten.x); return;
            case 'pk': {
                sz.pickupEntfernen(daten.id);
                if (this.istHost) this.netz.sendeAnAlleAusser(von, daten);
                return;
            }
            case 'bl': {
                if (this.istHost) this.netz.sendeAnAlleAusser(von, daten);
                sz.belebenAnzeige(daten.ziel, daten.p);
                return;
            }
            case 'belebt':
                if (daten.ziel === this.netz.meineNr) sz.wiederbelebt();
                else if (this.istHost) this.sendeAn(daten.ziel, daten);
                return;
            case 'z': break;
            default: return;
        }
        const nr = daten.n ?? von;                    // Der Gastgeber trägt bei weitergeleiteten Zuständen die Nummer des Absenders ein.
        if (nr === this.netz.meineNr) return;
        if (this.istHost) this.netz.sendeAnAlleAusser(von, { ...daten, n: von });   // an die anderen Gäste weitergeben
        let r = this.fern.get(nr);
        if (!r) r = this.neueFigur(nr, daten);
        r.ziel = { x: daten.x, y: daten.y, vx: daten.vx, vy: daten.vy, a: daten.a, w: daten.w, g: daten.g, h: daten.h, s: daten.s, d: daten.d, z: daten.z, t: performance.now() };
    }

    neueFigur(nr, daten) {
        const label = this.scene.add.text(daten.x, daten.y - 58, this.netz.nameVon(nr), {
            fontSize: '14px', color: '#ffffff', stroke: '#000000', strokeThickness: 3,
        }).setOrigin(0.5).setDepth(8);
        const r = { nr, name: this.netz.nameVon(nr), x: daten.x, y: daten.y, vx: 0, vy: 0, a: 0, w: 'pistol', g: 1, h: 100, s: 9999, tot: false, label,
            ziel: { x: daten.x, y: daten.y, vx: 0, vy: 0, a: 0, w: 'pistol', g: 1, h: 100, s: 9999, d: 0, t: performance.now() } };
        this.fern.set(nr, r);
        this.aktualisiereAnzeige();
        return r;
    }

    getrennt(nr) {
        const r = this.fern.get(nr);
        const name = r ? r.name : `Spieler ${nr}`;                 // der Name steht nach dem Abgang nicht mehr in der Liste
        if (r) { r.label.destroy(); this.fern.delete(nr); }
        this.aktualisiereAnzeige();
        if (nr === 1 && this.netz.rolle === 'gast') {
            this.scene.showMessage('Der Gastgeber hat das Spiel verlassen.');
            this.scene.time.delayedCall(2200, () => this.beende());
        } else {
            this.scene.showMessage(`${name} hat das Spiel verlassen.`);
        }
    }

    // Zeichnet alle fremden Figuren (die Zeichenfunktion liegt in der Szene).
    zeichne(g, mitte) {
        for (const r of this.fern.values()) {
            const nah = Math.abs(r.x - mitte.x) < 900 && Math.abs(r.y - mitte.y) < 550;
            r.label.setVisible(nah);
            if (nah) this.scene.zeichneFremdenSpieler(g, r);
        }
    }

    // Esc: Zum Verlassen zweimal drücken (damit man nicht aus Versehen aus dem Spiel fliegt).
    escDruecken() {
        const jetzt = this.scene.time.now;
        if (jetzt < this.escBis) { this.beende(); return; }
        this.escBis = jetzt + 2000;
        this.scene.showMessage('Nochmal drücken (Esc oder Pause-Knopf),\num das Spiel zu verlassen.');
    }

    beende() {
        if (this.verlassen) return;
        this.verlassen = true;
        this.netz.schliesse();
        this.scene.registry.set('netz', null);
        this.scene.registry.set('modus', 'einzel');
        this.scene.scene.start('MenuScene');
    }
}
