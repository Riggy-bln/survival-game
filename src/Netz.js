// Netzwerk für den Online-Mehrspielermodus. Eine kleine Hülle um PeerJS (WebRTC), damit der Rest des Spiels
// nur "Raum erstellen", "beitreten" und "senden" kennt und nichts über die Bibliothek wissen muss.
//
// So funktioniert es: PeerJS betreibt einen öffentlichen Vermittlungsserver. Jeder Browser meldet sich dort mit einer
// Kennung an. Der Gastgeber (Host) nimmt eine Kennung aus dem 4-stelligen Raumcode ("survivalgame-K7QX"). Ein Gast
// fragt den Vermittler nach dieser Kennung und baut dann eine DIREKTE Verbindung zum Gastgeber auf. Danach laufen
// alle Nachrichten direkt zwischen den Browsern, nicht mehr über den Vermittler.
//
// Rufe, die man mit netz.on('name', funktion) einhängen kann:
//   bereit(code)              Raum ist offen (nur Gastgeber)
//   willkommen(nr)            Verbindung steht, Spielernummer ist vergeben (nur Gast)
//   spielerGeaendert(liste)   Spielerliste hat sich geändert: [{ nr, name, ping }]
//   ping(nr, ms)              neue Laufzeitmessung
//   nachricht(vonNr, daten)   eine Spielnachricht ist angekommen
//   getrennt(nr)              ein Spieler hat die Verbindung verloren (Gast: der Gastgeber, nr = 1)
//   fehler(text)              etwas ist schiefgegangen (Text für den Spieler)
const VORSILBE = 'survivalgame-';
const ZEICHEN = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // ohne I, O, 0, 1: sie verwechselt man leicht
export const CODE_LAENGE = 4;
export const MAX_SPIELER = 4;

const zufallscode = () => Array.from({ length: CODE_LAENGE }, () => ZEICHEN[Math.floor(Math.random() * ZEICHEN.length)]).join('');

export default class Netz {
    constructor() {
        this.rufe = {};
        this.peer = null;
        this.rolle = null;          // 'host' oder 'gast'
        this.meineNr = 0;
        this.code = '';
        this.spieler = new Map();   // nur Gastgeber: nr -> { name, conn, ping }
        this.gastListe = [];        // nur Gast: die zuletzt empfangene Spielerliste
        this.hostConn = null;       // nur Gast: die Verbindung zum Gastgeber
        this.verbunden = false;
        this.gesperrt = false;      // nur Gastgeber: Das Spiel läuft schon, es kommen keine neuen Spieler mehr hinein
        this.geschlossen = false;
        this.pingTimer = null;
        this.zeitTimer = null;
    }

    on(name, funktion) { this.rufe[name] = funktion; return this; }
    ruf(name, ...args) { if (this.rufe[name]) this.rufe[name](...args); }

    // ---------- Gastgeber ----------
    erstelleRaum(versuch = 0) {
        this.rolle = 'host';
        this.meineNr = 1;
        this.spieler = new Map([[1, { name: 'Spieler 1', conn: null, ping: 0 }]]);
        this.code = zufallscode();
        this.peer = new Peer(VORSILBE + this.code);
        this.peer.on('open', () => { this.ruf('bereit', this.code); this.starteMessung(); });
        this.peer.on('connection', (conn) => this.neueVerbindung(conn));
        this.peer.on('error', (err) => {
            if (err.type === 'unavailable-id' && versuch < 5) {     // Code schon vergeben: einen neuen versuchen
                this.peer.destroy();
                this.erstelleRaum(versuch + 1);
                return;
            }
            this.ruf('fehler', this.fehlertext(err));
        });
        this.peer.on('disconnected', () => { if (!this.geschlossen) { try { this.peer.reconnect(); } catch (e) { /* egal */ } } });
    }

    neueVerbindung(conn) {
        conn.on('open', () => {
            const nr = this.gesperrt ? 0 : this.freieNummer();
            if (!nr) {                                               // Raum voll oder Spiel läuft schon
                conn.send({ t: this.gesperrt ? 'laeuft' : 'voll' });
                setTimeout(() => conn.close(), 300);
                return;
            }
            this.spieler.set(nr, { name: `Spieler ${nr}`, conn, ping: 0 });
            conn.send({ t: 'willkommen', nr });
            conn.on('data', (daten) => this.empfange(nr, daten));
            conn.on('close', () => {
                this.spieler.delete(nr);
                this.sendeListe();
                this.ruf('getrennt', nr);
            });
            this.sendeListe();
        });
    }

    freieNummer() {
        for (let nr = 2; nr <= MAX_SPIELER; nr++) if (!this.spieler.has(nr)) return nr;
        return 0;
    }

    // Verteilt die Spielerliste an alle und meldet sie auch dem eigenen Spiel.
    sendeListe() {
        const liste = this.liste();
        this.sende({ t: 'spieler', liste });
        this.ruf('spielerGeaendert', liste);
    }

    // ---------- Gast ----------
    tritBei(code) {
        this.rolle = 'gast';
        this.code = code.toUpperCase();
        this.peer = new Peer();
        // Nach 12 Sekunden ohne Verbindung aufgeben und eine verständliche Meldung zeigen
        this.zeitTimer = setTimeout(() => {
            if (!this.verbunden && !this.geschlossen) this.ruf('fehler', 'Keine Antwort. Stimmt der Code, und ist der Raum noch offen?');
        }, 12000);
        this.peer.on('open', () => {
            const conn = this.peer.connect(VORSILBE + this.code, { reliable: true });
            this.hostConn = conn;
            conn.on('open', () => {
                this.verbunden = true;
                clearTimeout(this.zeitTimer);
                this.starteMessung();
            });
            conn.on('data', (daten) => this.empfange(1, daten));
            conn.on('close', () => { if (!this.geschlossen) this.ruf('getrennt', 1); });
            conn.on('error', () => this.ruf('fehler', 'Die Verbindung zum Raum ist fehlgeschlagen.'));
        });
        this.peer.on('error', (err) => this.ruf('fehler', this.fehlertext(err)));
    }

    // ---------- gemeinsam ----------
    liste() {
        if (this.rolle === 'host') return [...this.spieler.entries()].map(([nr, s]) => ({ nr, name: s.name, ping: s.ping }));
        return this.gastListe;
    }

    // Sendet an alle (Gastgeber) bzw. an den Gastgeber (Gast).
    sende(daten) {
        if (this.rolle === 'host') {
            for (const [nr, s] of this.spieler) if (s.conn && s.conn.open) s.conn.send(daten);
        } else if (this.hostConn && this.hostConn.open) {
            this.hostConn.send(daten);
        }
    }

    // Sendet an alle Gäste außer an einen (nur Gastgeber): für das Weiterleiten von Zuständen.
    sendeAnAlleAusser(nrAusnahme, daten) {
        for (const [nr, s] of this.spieler) if (nr !== nrAusnahme && s.conn && s.conn.open) s.conn.send(daten);
    }

    // Sendet nur an einen bestimmten Spieler (nur Gastgeber).
    sendeAn(nr, daten) {
        const s = this.spieler.get(nr);
        if (s && s.conn && s.conn.open) s.conn.send(daten);
    }

    empfange(vonNr, daten) {
        if (!daten || typeof daten !== 'object') return;
        switch (daten.t) {
            case 'willkommen': this.meineNr = daten.nr; this.ruf('willkommen', daten.nr); break;
            case 'spieler': this.gastListe = daten.liste; this.ruf('spielerGeaendert', daten.liste); break;
            case 'voll': this.ruf('fehler', 'Der Raum ist voll.'); break;
            case 'laeuft': this.ruf('fehler', 'Das Spiel läuft bereits.'); break;
            case 'ping': this.antworte(vonNr, { t: 'pong', zeit: daten.zeit }); break;
            case 'pong': {
                const ms = Math.round(performance.now() - daten.zeit);
                if (this.rolle === 'host' && this.spieler.has(vonNr)) this.spieler.get(vonNr).ping = ms;
                this.ruf('ping', vonNr, ms);
                break;
            }
            default: this.ruf('nachricht', vonNr, daten);
        }
    }

    antworte(nr, daten) {
        if (this.rolle === 'host') this.sendeAn(nr, daten); else this.sende(daten);
    }

    // Jede Sekunde ein Ping: Die Antwort verrät, wie lange eine Nachricht hin und zurück braucht.
    starteMessung() {
        clearInterval(this.pingTimer);
        this.pingTimer = setInterval(() => {
            const nachricht = { t: 'ping', zeit: performance.now() };
            if (this.rolle === 'host') { for (const [nr] of this.spieler) if (nr !== 1) this.sendeAn(nr, nachricht); }
            else this.sende(nachricht);
        }, 1000);
    }

    fehlertext(err) {
        switch (err.type) {
            case 'peer-unavailable': return 'Raum nicht gefunden. Prüfe den Code.';
            case 'network': case 'server-error': case 'socket-error': case 'socket-closed':
                return 'Keine Verbindung zum Vermittlungsserver. Prüfe dein Internet.';
            case 'browser-incompatible': return 'Dieser Browser unterstützt keine direkten Verbindungen.';
            case 'webrtc': return 'Die direkte Verbindung konnte nicht aufgebaut werden (Netzwerk blockiert?).';
            default: return `Verbindungsfehler (${err.type}).`;
        }
    }

    schliesse() {
        this.geschlossen = true;
        clearInterval(this.pingTimer);
        clearTimeout(this.zeitTimer);
        try { if (this.peer) this.peer.destroy(); } catch (e) { /* egal */ }
        this.peer = null;
    }
}
