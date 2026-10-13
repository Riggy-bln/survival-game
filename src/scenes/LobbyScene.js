import Netz, { CODE_LAENGE, MAX_SPIELER, saubererName } from '../Netz.js';
import { sfx } from '../Sound.js';

// Die Lobby für den Online-Mehrspielermodus.
//   rolle 'host': erstellt einen Raum und zeigt den Code, den man Freunden gibt.
//   rolle 'gast': gibt den Code ein und tritt dem Raum bei.
// In diesem Schritt wird nur die VERBINDUNG getestet (Spielerliste, Ping). Das Spiel selbst starten wir im nächsten Schritt.
export default class LobbyScene extends Phaser.Scene {
    constructor() {
        super('LobbyScene');
    }

    init(daten) {
        this.rolle = daten && daten.rolle === 'gast' ? 'gast' : 'host';
    }

    create() {
        this.cameras.main.setZoom(this.scale.height / 540).centerOn(480, 270);   // nach der Höhe, die Breite passt sich an
        const host = this.rolle === 'host';
        this.add.text(480, 60, host ? 'RAUM ERSTELLEN' : 'RAUM BEITRETEN', { fontSize: '40px', color: '#e0e6ea', fontStyle: 'bold' }).setOrigin(0.5);

        this.hinweis = this.add.text(480, 120, host
            ? 'Gib diesen Code deinen Freunden. Sie wählen "Raum beitreten".'
            : 'Tippe den Raumcode ein und drücke Enter.',
            { fontSize: '18px', color: '#9fb0bd', align: 'center' }).setOrigin(0.5);
        this.codeText = this.add.text(480, 205, host ? '...' : '', {
            fontSize: '84px', color: '#ffdd55', fontStyle: 'bold', fontFamily: 'monospace',
        }).setOrigin(0.5);
        this.status = this.add.text(480, 290, '', { fontSize: '20px', color: '#cfd8dc', align: 'center' }).setOrigin(0.5);
        this.listeText = this.add.text(480, 370, '', { fontSize: '22px', color: '#e6edf2', align: 'center', lineSpacing: 8, fontFamily: 'monospace' }).setOrigin(0.5);
        this.unten = this.add.text(480, 492, host
            ? 'Enter: Spiel starten      C: Code kopieren      Esc: Zurück'
            : 'Esc: Zurück', { fontSize: '16px', color: '#7f8f9a' }).setOrigin(0.5);

        // Dein Name: Tab zum Ändern. Er wird im Browser gemerkt.
        let gemerkt = '';
        try { gemerkt = localStorage.getItem('spielername') || ''; } catch (err) { /* egal */ }
        this.name = saubererName(gemerkt);
        this.nameEdit = false;
        this.nameText = this.add.text(480, 470, '', { fontSize: '18px', color: '#cfd8dc' }).setOrigin(0.5);
        this.zeigeName();

        // Knöpfe (für Handy und Maus)
        if (host) {
            this.knopf(240, 528, 'Spiel starten', () => this.hostStart(), 170);
            this.knopf(480, 528, 'Name ändern', () => this.nameAbfragen(), 170);
            this.knopf(720, 528, 'Zurück', () => this.zurueck(), 170);
        } else {
            this.knopf(150, 528, 'Code eingeben', () => this.codeAbfragen(), 160);
            this.knopf(330, 528, 'Beitreten', () => this.verbinde(), 160);
            this.knopf(560, 528, 'Name ändern', () => this.nameAbfragen(), 160);
            this.knopf(760, 528, 'Zurück', () => this.zurueck(), 160);
        }

        this.pingZumHost = null;
        this.eingabe = '';
        this.versucht = false;     // Gast: wurde schon eine Verbindung versucht?
        this.netz = null;

        this.input.keyboard.on('keydown', (e) => this.taste(e));
        this.spielGestartet = false;
        this.events.once('shutdown', () => { if (this.netz && !this.spielGestartet) this.netz.schliesse(); });

        if (host) this.starteHost(); else this.zeigeEingabe();
    }

    // Ein neues Netzwerk-Objekt mit allen Rückrufen für die Anzeige.
    neuesNetz() {
        if (this.netz) this.netz.schliesse();
        this.netz = new Netz();
        this.netz.meinName = this.name;
        this.netz
            .on('bereit', (code) => {
                this.codeText.setText(code.split('').join(' '));
                this.setzeStatus('Raum offen. Warte auf Mitspieler ...', '#9fd89f');
                this.zeigeListe();
            })
            .on('willkommen', (nr) => {
                this.setzeStatus(`Verbunden! Du bist Spieler ${nr}. Warte, bis der Gastgeber startet.`, '#9fd89f');
                sfx.play('pickup');
                this.zeigeListe();
            })
            .on('nachricht', (von, daten) => { if (daten.t === 'start') this.starteSpiel(); })   // Gäste: der Gastgeber hat gestartet
            .on('spielerGeaendert', () => { this.zeigeListe(); })
            .on('ping', (vonNr, ms) => { if (this.rolle === 'gast') this.pingZumHost = ms; this.zeigeListe(); })
            .on('getrennt', (nr) => {
                if (this.rolle === 'gast') this.setzeStatus('Der Gastgeber hat den Raum verlassen.', '#ff9966');
                this.zeigeListe();
            })
            .on('fehler', (text) => {
                this.setzeStatus(text, '#ff8866');
                if (this.rolle === 'gast') { this.versucht = false; this.zeigeEingabe(); }   // nochmal versuchen können
            });
    }

    starteHost() {
        this.neuesNetz();
        this.setzeStatus('Erstelle Raum ...', '#cfd8dc');
        this.netz.erstelleRaum();
    }

    // Gast: Beitritt versuchen
    verbinde() {
        if (this.versucht || this.eingabe.length < CODE_LAENGE) return;
        this.versucht = true;
        this.neuesNetz();
        this.setzeStatus('Verbinde ...', '#cfd8dc');
        this.netz.tritBei(this.eingabe);
    }

    zeigeName() {
        const blink = this.nameEdit && Math.floor(this.time.now / 400) % 2 === 0 ? '|' : '';
        this.nameText.setText(this.nameEdit
            ? `Dein Name: ${this.name}${blink}   (Enter: fertig)`
            : `Dein Name: ${this.name || '(Standard)'}   (Tab: ändern)`).setColor(this.nameEdit ? '#ffdd55' : '#cfd8dc');
    }

    update() { if (this.nameEdit) this.zeigeName(); }

    // Namenseingabe: gibt true zurück, wenn die Taste hier verbraucht wurde.
    nameTaste(e) {
        if (e.key === 'Tab') {
            e.preventDefault();
            if (this.rolle === 'gast' && this.netz && this.netz.verbunden) { this.setzeStatus('Den Namen kannst du nur vor dem Beitritt ändern.', '#ff9966'); return true; }
            this.nameEdit = !this.nameEdit;
            if (!this.nameEdit) this.nameFertig();
            this.zeigeName();
            return true;
        }
        if (!this.nameEdit) return false;
        if (e.key === 'Enter') { this.nameEdit = false; this.nameFertig(); }
        else if (e.key === 'Backspace') this.name = this.name.slice(0, -1);
        else if (e.key.length === 1 && /^[\p{L}\p{N} _-]$/u.test(e.key) && this.name.length < 12) this.name += e.key;
        this.zeigeName();
        return true;
    }

    nameFertig() {
        this.name = saubererName(this.name);
        try { localStorage.setItem('spielername', this.name); } catch (err) { /* egal */ }
        if (this.netz) this.netz.setzeMeinenNamen(this.name);
        this.zeigeListe();
    }

    setzeStatus(text, farbe) { this.status.setText(text).setColor(farbe); }

    // Gast: zeigt die eingetippten Zeichen mit Strichen für die fehlenden
    zeigeEingabe() {
        const gefuellt = this.eingabe.padEnd(CODE_LAENGE, '_');
        this.codeText.setText(gefuellt.split('').join(' '));
    }

    zeigeListe() {
        if (!this.netz) return;
        const zeilen = this.netz.liste().map((s) => {
            const ich = s.nr === this.netz.meineNr ? '  <- du' : '';
            // Anzeige der Laufzeit: Der Gastgeber sieht den Ping jedes Gastes, ein Gast sieht den Ping zum Gastgeber
            let ping = '';
            if (this.rolle === 'host' && s.nr !== 1) ping = `   ${s.ping || '-'} ms`;
            if (this.rolle === 'gast' && s.nr === 1) ping = `   ${this.pingZumHost ?? '-'} ms`;
            const rolle = s.nr === 1 ? ' (Gastgeber)' : '';
            return `${s.nr}. ${s.name}${rolle}${ping}${ich}`;
        });
        for (let i = zeilen.length; i < MAX_SPIELER; i++) zeilen.push(`${i + 1}. - frei -`);
        this.listeText.setText(zeilen.join('\n'));
        if (this.rolle === 'gast' && this.netz.verbunden) this.hinweis.setText('Verbunden. Esc beendet die Verbindung.');
    }

    // Knopf zum Antippen (Handy und Maus). Die Tastatur-Kürzel funktionieren weiter.
    knopf(x, y, text, aktion, breite = 150) {
        const r = this.add.rectangle(x, y, breite, 32, 0x1b2630, 0.95).setStrokeStyle(2, 0x6f8190).setInteractive({ useHandCursor: true });
        this.add.text(x, y, text, { fontSize: '16px', color: '#e6edf2' }).setOrigin(0.5);
        r.on('pointerdown', aktion);
        return r;
    }

    // Name per Eingabefenster ändern (am Handy gibt es keine Tastatur-Eingabe im Spiel)
    nameAbfragen() {
        if (this.rolle === 'gast' && this.netz && this.netz.verbunden) { this.setzeStatus('Den Namen kannst du nur vor dem Beitritt ändern.', '#ff9966'); return; }
        const n = window.prompt('Dein Name (höchstens 12 Zeichen):', this.name);
        if (n === null) return;
        this.name = saubererName(n);
        this.nameFertig();
        this.zeigeName();
    }

    codeAbfragen() {
        if (this.versucht) return;
        const c = window.prompt(`Raumcode (${CODE_LAENGE} Zeichen):`, this.eingabe);
        if (c === null) return;
        this.eingabe = c.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LAENGE);
        this.zeigeEingabe();
        if (this.eingabe.length === CODE_LAENGE) this.verbinde();
    }

    // Gastgeber: Spiel starten (Enter oder Knopf)
    hostStart() {
        if (this.netz && this.netz.verbunden !== undefined && this.netz.liste().length >= 2) {
            this.netz.sende({ t: 'start' });                       // alle Gäste starten gleichzeitig
            this.netz.gesperrt = true;                              // ab jetzt kommen keine neuen Spieler mehr hinein
            this.starteSpiel();
        } else {
            this.setzeStatus('Warte auf mindestens einen Mitspieler.', '#ff9966');
        }
    }

    taste(e) {
        if (e.key === 'Escape') { if (this.nameEdit) { this.nameEdit = false; this.nameFertig(); this.zeigeName(); } else this.zurueck(); return; }
        if (this.nameTaste(e)) return;
        if (this.rolle === 'host') {
            if (e.key === 'Enter' && this.netz && this.netz.verbunden !== undefined && this.netz.liste().length >= 2) {
                this.netz.sende({ t: 'start' });                       // alle Gäste starten gleichzeitig
                this.netz.gesperrt = true;                              // ab jetzt kommen keine neuen Spieler mehr hinein
                this.starteSpiel();
                return;
            }
            if (e.key === 'Enter') this.setzeStatus('Warte auf mindestens einen Mitspieler.', '#ff9966');
            if (e.key.toLowerCase() === 'c' && this.netz && this.netz.code) {
                try { navigator.clipboard.writeText(this.netz.code); this.setzeStatus('Code kopiert.', '#9fd89f'); } catch (err) { /* egal */ }
            }
            return;
        }
        if (this.versucht) return;
        if (e.key === 'Backspace') { this.eingabe = this.eingabe.slice(0, -1); this.zeigeEingabe(); }
        else if (e.key === 'Enter') this.verbinde();
        else if (/^[a-zA-Z0-9]$/.test(e.key) && this.eingabe.length < CODE_LAENGE) {
            this.eingabe += e.key.toUpperCase();
            this.zeigeEingabe();
        }
    }

    // Startet das Spiel für diesen Spieler: Netzwerk und Rolle bleiben für die Spielszene in der Registry erhalten.
    starteSpiel() {
        if (this.spielGestartet) return;
        this.spielGestartet = true;
        this.registry.set('netz', this.netz);
        this.registry.set('modus', this.rolle);
        this.scene.start('GameScene');
    }

    zurueck() {
        if (this.netz) this.netz.schliesse();
        this.scene.start('MenuScene');
    }
}
