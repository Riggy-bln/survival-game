import Netz, { CODE_LAENGE, MAX_SPIELER, saubererName } from '../Netz.js';
import { sfx } from '../Sound.js';
import { zentriere, baueHintergrund, baueTitel, pixelKnopf, MITTE_X } from '../MenuStil.js';

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
        zentriere(this);                                  // Kamera nach der Höhe, auch nach Vollbild mittig
        this.hintergrund = baueHintergrund(this);
        const host = this.rolle === 'host';
        this.titelAnim = baueTitel(this, host ? 'CREATE ROOM' : 'JOIN ROOM', 50, 5);
        this.knoepfe = [];
        const schrift = (groesse, farbe, extra = {}) => ({ fontSize: `${groesse}px`, fontFamily: 'monospace', color: farbe, stroke: '#14101f', strokeThickness: 3, ...extra });
        // Tafeln hinter den Texten (dunkel, mit farbigem Rand)
        const tafel = (x, y, b, h, rand) => {
            const g = this.add.graphics().setDepth(8);
            g.fillStyle(0x000000, 0.4).fillRect(x - b / 2 + 4, y - h / 2 + 5, b, h);
            g.fillStyle(rand).fillRect(x - b / 2, y - h / 2, b, h);
            g.fillStyle(0x14101f, 0.92).fillRect(x - b / 2 + 3, y - h / 2 + 3, b - 6, h - 6);
            g.fillStyle(0xffffff, 0.06).fillRect(x - b / 2 + 3, y - h / 2 + 3, b - 6, 4);
        };
        tafel(MITTE_X, 202, 400, 112, 0xffdd55);
        tafel(MITTE_X, 376, 470, 142, 0x4aa3ff);

        this.hinweis = this.add.text(MITTE_X, 108, host
            ? 'Give this code to your friends. They choose "Join room".'
            : 'Type the room code and press Enter.',
            schrift(15, '#e8dcc8', { align: 'center' })).setOrigin(0.5).setDepth(10);
        this.codeText = this.add.text(MITTE_X, 202, host ? '...' : '', schrift(76, '#ffdd55', { fontStyle: 'bold', stroke: '#7a2a0a', strokeThickness: 5 })).setOrigin(0.5).setDepth(10);
        this.status = this.add.text(MITTE_X, 283, '', schrift(16, '#cfd8dc', { align: 'center' })).setOrigin(0.5).setDepth(10);
        this.listeText = this.add.text(MITTE_X, 376, '', schrift(19, '#e6edf2', { align: 'center', lineSpacing: 8 })).setOrigin(0.5).setDepth(10);
        this.unten = this.add.text(MITTE_X, 484, host
            ? 'Enter: start game      C: copy code      Tab: name      Esc: back'
            : 'Tab: name      Esc: back', schrift(12, '#b8a898')).setOrigin(0.5).setDepth(10);

        // Dein Name: Tab zum Ändern. Er wird im Browser gemerkt.
        let gemerkt = '';
        try { gemerkt = localStorage.getItem('spielername') || ''; } catch (err) { /* egal */ }
        this.name = saubererName(gemerkt);
        this.nameEdit = false;
        this.nameText = this.add.text(MITTE_X, 460, '', schrift(15, '#cfd8dc')).setOrigin(0.5).setDepth(10);
        this.zeigeName();

        // Knöpfe (für Handy und Maus)
        if (host) {
            this.knopf(MITTE_X - 250, 516, 'START GAME', () => this.hostStart(), 200, 0x58c06a);
            this.knopf(MITTE_X, 516, 'CHANGE NAME', () => this.nameAbfragen(), 200, 0x4aa3ff);
            this.knopf(MITTE_X + 250, 516, 'BACK', () => this.zurueck(), 200, 0x8a96a0);
        } else {
            this.knopf(MITTE_X - 285, 516, 'ENTER CODE', () => this.codeAbfragen(), 180, 0xffc933);
            this.knopf(MITTE_X - 95, 516, 'JOIN', () => this.verbinde(), 180, 0x58c06a);
            this.knopf(MITTE_X + 95, 516, 'CHANGE NAME', () => this.nameAbfragen(), 180, 0x4aa3ff);
            this.knopf(MITTE_X + 285, 516, 'BACK', () => this.zurueck(), 180, 0x8a96a0);
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
                this.setzeStatus('Room open. Waiting for players ...', '#9fd89f');
                this.zeigeListe();
            })
            .on('willkommen', (nr) => {
                this.setzeStatus(`Connected! You are Player ${nr}. Waiting for the host to start.`, '#9fd89f');
                sfx.play('pickup');
                this.zeigeListe();
            })
            .on('nachricht', (von, daten) => { if (daten.t === 'start') this.starteSpiel(); })   // Gäste: der Gastgeber hat gestartet
            .on('spielerGeaendert', () => { this.zeigeListe(); })
            .on('ping', (vonNr, ms) => { if (this.rolle === 'gast') this.pingZumHost = ms; this.zeigeListe(); })
            .on('getrennt', (nr) => {
                if (this.rolle === 'gast') this.setzeStatus('The host has left the room.', '#ff9966');
                this.zeigeListe();
            })
            .on('fehler', (text) => {
                this.setzeStatus(text, '#ff8866');
                if (this.rolle === 'gast') { this.versucht = false; this.zeigeEingabe(); }   // nochmal versuchen können
            });
    }

    starteHost() {
        this.neuesNetz();
        this.setzeStatus('Creating room ...', '#cfd8dc');
        this.netz.erstelleRaum();
    }

    // Gast: Beitritt versuchen
    verbinde() {
        if (this.versucht || this.eingabe.length < CODE_LAENGE) return;
        this.versucht = true;
        this.neuesNetz();
        this.setzeStatus('Connecting ...', '#cfd8dc');
        this.netz.tritBei(this.eingabe);
    }

    zeigeName() {
        const blink = this.nameEdit && Math.floor(this.time.now / 400) % 2 === 0 ? '|' : '';
        this.nameText.setText(this.nameEdit
            ? `Your name: ${this.name}${blink}   (Enter: done)`
            : `Your name: ${this.name || '(default)'}   (Tab: change)`).setColor(this.nameEdit ? '#ffdd55' : '#cfd8dc');
    }

    update(zeit) {
        this.hintergrund.update(zeit);
        this.titelAnim.update(zeit);
        this.knoepfe.forEach(k => { k.an += ((k.hover ? 1 : 0) - k.an) * 0.25; k.zeichne(zeit); });
        if (this.nameEdit) this.zeigeName();
    }

    // Namenseingabe: gibt true zurück, wenn die Taste hier verbraucht wurde.
    nameTaste(e) {
        if (e.key === 'Tab') {
            e.preventDefault();
            if (this.rolle === 'gast' && this.netz && this.netz.verbunden) { this.setzeStatus('You can only change your name before joining.', '#ff9966'); return true; }
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
            const ich = s.nr === this.netz.meineNr ? '  <- you' : '';
            // Anzeige der Laufzeit: Der Gastgeber sieht den Ping jedes Gastes, ein Gast sieht den Ping zum Gastgeber
            let ping = '';
            if (this.rolle === 'host' && s.nr !== 1) ping = `   ${s.ping || '-'} ms`;
            if (this.rolle === 'gast' && s.nr === 1) ping = `   ${this.pingZumHost ?? '-'} ms`;
            const rolle = s.nr === 1 ? ' (Host)' : '';
            return `${s.nr}. ${s.name}${rolle}${ping}${ich}`;
        });
        for (let i = zeilen.length; i < MAX_SPIELER; i++) zeilen.push(`${i + 1}. - free -`);
        this.listeText.setText(zeilen.join('\n'));
        if (this.rolle === 'gast' && this.netz.verbunden) this.hinweis.setText('Connected. Esc ends the connection.');
    }

    // Knopf zum Antippen (Handy und Maus). Die Tastatur-Kürzel funktionieren weiter.
    knopf(x, y, text, aktion, breite = 150, farbe = 0x4aa3ff) {
        const k = pixelKnopf(this, x, y, breite, 38, text, farbe, aktion, { px: 2 });
        this.knoepfe.push(k);
        return k;
    }

    // Name per Eingabefenster ändern (am Handy gibt es keine Tastatur-Eingabe im Spiel)
    nameAbfragen() {
        if (this.rolle === 'gast' && this.netz && this.netz.verbunden) { this.setzeStatus('You can only change your name before joining.', '#ff9966'); return; }
        const n = window.prompt('Your name (max. 12 characters):', this.name);
        if (n === null) return;
        this.name = saubererName(n);
        this.nameFertig();
        this.zeigeName();
    }

    codeAbfragen() {
        if (this.versucht) return;
        const c = window.prompt(`Room code (${CODE_LAENGE} characters):`, this.eingabe);
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
            this.setzeStatus('Waiting for at least one other player.', '#ff9966');
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
            if (e.key === 'Enter') this.setzeStatus('Waiting for at least one other player.', '#ff9966');
            if (e.key.toLowerCase() === 'c' && this.netz && this.netz.code) {
                try { navigator.clipboard.writeText(this.netz.code); this.setzeStatus('Code copied.', '#9fd89f'); } catch (err) { /* egal */ }
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
