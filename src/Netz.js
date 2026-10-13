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
//   verloren(nr)              die Verbindung zu einem Spieler ist abgerissen; es wird bis zu 20 Sekunden neu versucht
//   wieder(nr)                die Verbindung steht wieder
//   getrennt(nr)              ein Spieler ist endgültig weg (Gast: der Gastgeber, nr = 1)
//   fehler(text)              etwas ist schiefgegangen (Text für den Spieler)
const VORSILBE = 'survivalgame-';
const ZEICHEN = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // ohne I, O, 0, 1: sie verwechselt man leicht
export const CODE_LAENGE = 4;
export const MAX_SPIELER = 4;
const GNADENFRIST = 20000;     // so lange (ms) wird auf eine abgerissene Verbindung gewartet, bevor ein Spieler als weg gilt

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
        this.token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);   // Erkennungszeichen eines Gastes, damit der Gastgeber ihn nach einem Abriss wiedererkennt
        this.neuTimer = null;
        this.neuVersuche = 0;
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
            // Kennen wir diesen Gast schon (gleiches Erkennungszeichen)? Dann hat er sich nach einem Abriss neu verbunden.
            const token = conn.metadata && conn.metadata.token;
            for (const [altNr, alt] of this.spieler) {
                if (token && alt.token === token && altNr !== 1) {
                    clearTimeout(alt.frist);
                    alt.conn = conn;
                    alt.abwesend = false;
                    conn.on('data', (daten) => this.empfange(altNr, daten));
                    conn.on('close', () => this.verbindungAbgerissen(altNr, conn));
                    conn.send({ t: 'willkommen', nr: altNr });
                    this.sendeListe();
                    this.ruf('wieder', altNr);
                    return;
                }
            }
            const nr = this.gesperrt ? 0 : this.freieNummer();
            if (!nr) {                                               // Raum voll oder Spiel läuft schon
                conn.send({ t: this.gesperrt ? 'laeuft' : 'voll' });
                setTimeout(() => conn.close(), 300);
                return;
            }
            this.spieler.set(nr, { name: `Spieler ${nr}`, conn, ping: 0, token, abwesend: false, frist: null });
            conn.send({ t: 'willkommen', nr });
            conn.on('data', (daten) => this.empfange(nr, daten));
            conn.on('close', () => this.verbindungAbgerissen(nr, conn));
            this.sendeListe();
        });
    }

    // Eine Gastverbindung ist abgerissen. Der Platz bleibt 20 Sekunden reserviert: Kommt der Gast zurück, spielt er weiter.
    verbindungAbgerissen(nr, conn) {
        const s = this.spieler.get(nr);
        if (!s || s.conn !== conn || this.geschlossen) return;     // veraltete Meldung einer ersetzten Verbindung
        s.abwesend = true;
        this.ruf('verloren', nr);
        s.frist = setTimeout(() => {
            if (!this.spieler.get(nr) || !this.spieler.get(nr).abwesend) return;
            this.spieler.delete(nr);
            this.sendeListe();
            this.ruf('getrennt', nr);
        }, GNADENFRIST);
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
        this.peer.on('open', () => this.verbindeMitHost(false));
        this.peer.on('error', (err) => {
            // Mitten im Spiel sind manche Meldungen nur Hinweise (zum Beispiel "Raum nicht gefunden" bei einem Neuversuch)
            if (this.verbunden && err.type === 'peer-unavailable') return;
            this.ruf('fehler', this.fehlertext(err));
        });
        this.peer.on('disconnected', () => { if (!this.geschlossen) { try { this.peer.reconnect(); } catch (e) { /* egal */ } } });
    }

    // Baut die Verbindung zum Gastgeber auf (beim Neuversuch mit demselben Erkennungszeichen).
    verbindeMitHost(neuVersuch) {
        const conn = this.peer.connect(VORSILBE + this.code, { reliable: true, metadata: { token: this.token } });
        this.hostConn = conn;
        conn.on('open', () => {
            this.verbunden = true;
            clearTimeout(this.zeitTimer);
            clearInterval(this.neuTimer);
            this.neuVersuche = 0;
            this.starteMessung();
            if (neuVersuch) this.ruf('wieder', 1);
        });
        conn.on('data', (daten) => this.empfange(1, daten));
        conn.on('close', () => {
            if (this.geschlossen || this.endgueltig || conn !== this.hostConn) return;
            this.verbindungZumHostVerloren();
        });
        conn.on('error', () => { if (!this.verbunden) this.ruf('fehler', 'Die Verbindung zum Raum ist fehlgeschlagen.'); });
    }

    // Die Verbindung zum Gastgeber ist abgerissen: bis zu 20 Sekunden lang alle 2 Sekunden neu versuchen.
    verbindungZumHostVerloren() {
        if (this.neuTimer) return;
        this.ruf('verloren', 1);
        this.neuVersuche = 0;
        this.neuTimer = setInterval(() => {
            this.neuVersuche++;
            if (this.neuVersuche > GNADENFRIST / 2000 || this.geschlossen) {
                clearInterval(this.neuTimer);
                this.neuTimer = null;
                if (!this.geschlossen) this.ruf('getrennt', 1);
                return;
            }
            if (this.peer && this.peer.disconnected) { try { this.peer.reconnect(); } catch (e) { /* egal */ } }
            if (this.peer && !this.peer.destroyed) this.verbindeMitHost(true);
        }, 2000);
    }

    // ---------- gemeinsam ----------
    liste() {
        if (this.rolle === 'host') return [...this.spieler.entries()].map(([nr, s]) => ({ nr, name: s.name, ping: s.ping }));
        return this.gastListe;
    }

    // Sendet an alle (Gastgeber) bzw. an den Gastgeber (Gast).
    sende(daten) {
        if (this.rolle === 'host') {
            for (const [nr, s] of this.spieler) if (s.conn && s.conn.open && !s.abwesend) s.conn.send(daten);
        } else if (this.hostConn && this.hostConn.open) {
            this.hostConn.send(daten);
        }
    }

    // Sendet an alle Gäste außer an einen (nur Gastgeber): für das Weiterleiten von Zuständen.
    sendeAnAlleAusser(nrAusnahme, daten) {
        for (const [nr, s] of this.spieler) if (nr !== nrAusnahme && s.conn && s.conn.open && !s.abwesend) s.conn.send(daten);
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
            case 'ende':                                          // der Gastgeber beendet das Spiel absichtlich
                this.endgueltig = true;
                clearInterval(this.neuTimer);
                this.ruf('getrennt', 1);
                break;
            case 'tschuess': {                                    // ein Gast verlässt das Spiel absichtlich: sofort entfernen, keine Wartezeit
                const s = this.spieler.get(vonNr);
                if (s) { clearTimeout(s.frist); this.spieler.delete(vonNr); this.sendeListe(); this.ruf('getrennt', vonNr); }
                break;
            }
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

    // Kurzer Zustandstext für die Anzeige im Spiel (hilft bei der Fehlersuche): Verbindungsstatus des Browsers.
    zustandsText() {
        try {
            if (this.rolle === 'gast') {
                const pc = this.hostConn && this.hostConn.peerConnection;
                return pc ? `Verbindung: ${pc.iceConnectionState}` : 'Verbindung: -';
            }
            const teile = [];
            for (const [nr, s] of this.spieler) {
                if (nr === 1) continue;
                const pc = s.conn && s.conn.peerConnection;
                teile.push(`Spieler ${nr}: ${s.abwesend ? 'abwesend' : (pc ? pc.iceConnectionState : '-')}`);
            }
            return teile.join('   ');
        } catch (e) { return ''; }
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
        // Erst den anderen Bescheid sagen, damit sie nicht 20 Sekunden auf einen "Abriss" warten
        try { this.sende({ t: this.rolle === 'host' ? 'ende' : 'tschuess' }); } catch (e) { /* egal */ }
        const peer = this.peer;
        this.geschlossen = true;
        clearInterval(this.pingTimer);
        clearInterval(this.neuTimer);
        clearTimeout(this.zeitTimer);
        for (const s of this.spieler.values()) clearTimeout(s.frist);
        setTimeout(() => { try { if (peer) peer.destroy(); } catch (e) { /* egal */ } }, 300);    // kurz warten, damit die Abschiedsnachricht noch rausgeht
        this.peer = null;
    }
}
