// Mehrspieler im Spiel (Schritt 1): Die Spieler sehen sich gegenseitig.
//
// So läuft es: Jeder Spieler steuert seine eigene Figur wie im Einzelspielermodus (volle Physik auf seinem Gerät,
// deshalb reagiert die Steuerung sofort, ohne Verzögerung). 20-mal pro Sekunde schickt jedes Gerät den Zustand seiner
// Figur (Position, Tempo, Zielrichtung, Waffe, Leben) an den Gastgeber. Der Gastgeber leitet ihn an die anderen
// weiter. Die Figuren der anderen werden nur gezeichnet und weich nachgeführt, sie haben keine Physik.
//
// In diesem Schritt gibt es im Online-Modus noch KEINE Gegner. Sie kommen im nächsten Schritt (der Gastgeber rechnet
// sie und schickt ihre Positionen).
export const SPIELERFARBEN = [0x4f7a3a, 0x3a5f9a, 0x9a4a3a, 0x9a8a3a];   // Spieler 1 grün, 2 blau, 3 rot, 4 gelb

const SENDEPAUSE = 50;     // alle 50 ms ein Zustand (20 pro Sekunde)

export default class Mehrspieler {
    constructor(scene, netz) {
        this.scene = scene;
        this.netz = netz;
        this.fern = new Map();             // nr -> { x, y, vx, vy, a, w, g, h, ziel, label }
        this.naechsteSendung = 0;
        this.escBis = 0;
        this.verlassen = false;

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

    // Eigene Verbindung (Gast) oder die eines Mitspielers (Gastgeber) ist abgerissen.
    verloren(nr) {
        if (this.netz.rolle === 'gast') {
            this.banner.setText('Verbindung zum Gastgeber unterbrochen.\nVersuche, sie neu aufzubauen ...').setVisible(true);
        } else {
            const r = this.fern.get(nr);
            if (r) { r.getrennt = true; r.label.setText(`Spieler ${nr} (Verbindung?)`); }
            this.scene.showMessage(`Verbindung zu Spieler ${nr} unterbrochen ...`);
        }
    }

    wieder(nr) {
        if (this.netz.rolle === 'gast') {
            this.banner.setVisible(false);
            this.scene.showMessage('Wieder verbunden.');
        } else {
            const r = this.fern.get(nr);
            if (r) { r.getrennt = false; r.label.setText(`Spieler ${nr}`); }
            this.scene.showMessage(`Spieler ${nr} ist wieder da.`);
        }
    }

    // Die Liste oben rechts: Wer ist dabei?
    aktualisiereAnzeige() {
        if (!this.anzeige || !this.anzeige.active) return;
        const zeilen = this.netz.liste().map((s) => {
            const ich = s.nr === this.netz.meineNr ? ' (du)' : '';
            const host = s.nr === 1 ? ' [Gastgeber]' : '';
            return `Spieler ${s.nr}${host}${ich}`;
        });
        this.anzeige.setText(zeilen.join('\n'));
    }

    // Jedes Bild aufrufen: eigenen Zustand senden und die fremden Figuren nachführen.
    aktualisiere() {
        const jetzt = this.scene.time.now;
        if (jetzt >= this.naechsteSendung) {
            this.naechsteSendung = jetzt + SENDEPAUSE;
            this.sendeZustand(jetzt);
        }
        if (jetzt >= this.naechsteDiagnose) {
            this.naechsteDiagnose = jetzt + 1000;
            this.diagnose.setText(`Netz: ${this.netz.zustandsText()}`);
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
            r.vx = r.ziel.vx; r.a = r.ziel.a; r.w = r.ziel.w; r.g = r.ziel.g; r.h = r.ziel.h; r.s = r.ziel.s;
            r.label.setPosition(r.x, r.y - 58);
        }
    }

    sendeZustand(jetzt) {
        const sz = this.scene;
        const p = sz.player;
        const zeiger = sz.input.activePointer;
        const winkel = Phaser.Math.Angle.Between(p.x, p.y, zeiger.worldX, zeiger.worldY);
        this.netz.sende({
            t: 'z',
            x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10,
            vx: Math.round(p.body.velocity.x), vy: Math.round(p.body.velocity.y),
            a: Math.round(winkel * 100) / 100,
            w: p.weapon, h: p.health, g: p.body.blocked.down ? 1 : 0,
            s: p.lastShotTime ? Math.round(jetzt - p.lastShotTime) : 9999,    // Millisekunden seit dem letzten Schuss (für den Rückstoß)
        });
    }

    empfange(von, daten) {
        if (daten.t !== 'z') return;
        const nr = daten.n ?? von;                    // Der Gastgeber trägt bei weitergeleiteten Zuständen die Nummer des Absenders ein.
        if (nr === this.netz.meineNr) return;
        if (this.netz.rolle === 'host') {             // Der Gastgeber gibt den Zustand an die anderen Gäste weiter
            this.netz.sendeAnAlleAusser(von, { ...daten, n: von });
        }
        let r = this.fern.get(nr);
        if (!r) r = this.neueFigur(nr, daten);
        r.ziel = { x: daten.x, y: daten.y, vx: daten.vx, vy: daten.vy, a: daten.a, w: daten.w, g: daten.g, h: daten.h, s: daten.s, t: performance.now() };
    }

    neueFigur(nr, daten) {
        const label = this.scene.add.text(daten.x, daten.y - 58, `Spieler ${nr}`, {
            fontSize: '14px', color: '#ffffff', stroke: '#000000', strokeThickness: 3,
        }).setOrigin(0.5).setDepth(8);
        const r = { nr, x: daten.x, y: daten.y, vx: 0, vy: 0, a: 0, w: 'pistol', g: 1, h: 100, s: 9999, label,
            ziel: { x: daten.x, y: daten.y, vx: 0, vy: 0, a: 0, w: 'pistol', g: 1, h: 100, s: 9999, t: performance.now() } };
        this.fern.set(nr, r);
        this.aktualisiereAnzeige();
        return r;
    }

    getrennt(nr) {
        const r = this.fern.get(nr);
        if (r) { r.label.destroy(); this.fern.delete(nr); }
        this.aktualisiereAnzeige();
        if (nr === 1 && this.netz.rolle === 'gast') {
            this.scene.showMessage('Der Gastgeber hat das Spiel verlassen.');
            this.scene.time.delayedCall(2200, () => this.beende());
        } else {
            this.scene.showMessage(`Spieler ${nr} hat das Spiel verlassen.`);
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
        this.scene.showMessage('Esc nochmal drücken,\num das Spiel zu verlassen.');
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
