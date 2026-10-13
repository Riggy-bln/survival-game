import Netz, { CODE_LAENGE, MAX_SPIELER } from '../Netz.js';
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
        this.cameras.main.setZoom(this.scale.width / 960).centerOn(480, 270);
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
        this.unten = this.add.text(480, 505, host
            ? 'Enter: Spiel starten      C: Code kopieren      Esc: Zurück'
            : 'Esc: Zurück', { fontSize: '16px', color: '#7f8f9a' }).setOrigin(0.5);

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
        this.netz = new Netz()
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
            return `Spieler ${s.nr}${rolle}${ping}${ich}`;
        });
        for (let i = zeilen.length; i < MAX_SPIELER; i++) zeilen.push(`Spieler ${i + 1}   - frei -`);
        this.listeText.setText(zeilen.join('\n'));
        if (this.rolle === 'gast' && this.netz.verbunden) this.hinweis.setText('Verbunden. Esc beendet die Verbindung.');
    }

    taste(e) {
        if (e.key === 'Escape') { this.zurueck(); return; }
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
