// Alle Geräusche des Spiels, ohne eine einzige Audiodatei: Sie werden live berechnet
// (Web Audio API des Browsers). Ein "Oszillator" erzeugt einen Ton, "Rauschen" klingt
// wie Zischen oder Knall. Später kann man echte Sounddateien an derselben Stelle einsetzen.
// ---------------------------------------------------------------------------------------------------------------------
// Echte Aufnahmen (Sample-Gruppen). Neue Waffen oder Geräusche kommen einfach hier dazu: Dateien in sounds/..., Name, Lautstärke eintragen.
//   dateien   mehrere Aufnahmen: bei jedem Abspielen wird eine andere gewählt, damit Dauerfeuer nicht nach Maschine klingt
//   vol       Grundlautstärke (0 bis 1), hier kann man einzelne Geräusche lauter oder leiser machen
//   tonhoehe  zufällige Abweichung der Abspielgeschwindigkeit, z. B. 0.03 = plus/minus 3 %
//   stimmen   wie viele Exemplare gleichzeitig klingen dürfen (bei mehr wird das älteste ausgeblendet: kein Übersteuern)
// Quellen und Lizenzen: sounds/LICENSES.md
// ---------------------------------------------------------------------------------------------------------------------
import { TREFFER } from './TrefferKonfig.js';
const nummeriert = (ordner, name, anzahl) => Array.from({ length: anzahl }, (_, i) => `sounds/${ordner}/${name}${i + 1}.wav`);
const SAMPLES = {
    'ak47.schuss':    { dateien: nummeriert('ak47', 'shot', 6), vol: 0.8, tonhoehe: 0.03, stimmen: 8 },
    'ak47.nachladen': { dateien: ['sounds/ak47/reload.wav'], vol: 0.7, tonhoehe: 0, stimmen: 1 },
    'pistol.schuss':  { dateien: nummeriert('pistol', 'shot', 5), vol: 0.8, tonhoehe: 0.03, stimmen: 5 },
    'knife.wurf':     { dateien: nummeriert('knife', 'throw', 3), vol: 0.5, tonhoehe: 0.06, stimmen: 4 },
    'knife.treffer':  { dateien: nummeriert('knife', 'hit', 3), vol: 0.6, tonhoehe: 0.05, stimmen: 4 },
    'knife.auf':      { dateien: nummeriert('knife', 'pickup', 2), vol: 0.5, tonhoehe: 0.12, stimmen: 3 },
    'rocket.start':   { dateien: ['sounds/rocket/launch.wav'], vol: 0.7, tonhoehe: 0.03, stimmen: 2 },
    'rocket.knall':   { dateien: ['sounds/rocket/explosion.wav'], vol: 0.9, tonhoehe: 0.04, stimmen: 3 },
    // Der nasse Treffer-Klang (Lautstärke, Pause und Stimmenzahl stehen in TrefferKonfig.js, Abschnitt ton)
    'treffer.nass':   { dateien: nummeriert('splat', 'hit', 5), vol: 0.6, tonhoehe: TREFFER.ton.variation, stimmen: TREFFER.ton.stimmen, pause: TREFFER.ton.pauseMs },
    'treffer.tod':    { dateien: nummeriert('splat', 'death', 4), vol: 0.7, tonhoehe: TREFFER.ton.variation, stimmen: 2, pause: 120 },
    'flame.start':    { dateien: ['sounds/flame/start.wav'], vol: 0.5, tonhoehe: 0, stimmen: 1 },
    'flame.ende':     { dateien: ['sounds/flame/end.wav'], vol: 0.45, tonhoehe: 0, stimmen: 1 },
};
// Dauergeräusche, die in einer Schleife laufen, solange sie gebraucht werden (zum Beispiel der Flammenwerfer)
const SCHLEIFEN = {
    'flame.schleife': { datei: 'sounds/flame/loop.wav', vol: 0.42, einblenden: 0.25, ausblenden: 0.07, art: 'waffen' },
};
// Gesamtlautstärke je Art (0 bis 1): hier oder zur Laufzeit mit sfx.setzeLautstaerke('waffen', 0.5) einstellen
const LAUTSTAERKE = { waffen: 1, nachladen: 1, treffer: TREFFER.ton.lautstaerke };

class Sound {
    constructor() {
        this.ctx = null;      // der Audio-Kontext; wird erst beim ersten Abspielen erstellt
        this.muted = false;
        this.roh = {};        // Schlüssel -> geladene, noch nicht dekodierte Dateien (ArrayBuffer)
        this.puffer = {};     // Schlüssel -> dekodierte Aufnahmen (AudioBuffer)
        this.aktiv = {};      // Schlüssel -> gerade klingende Exemplare (für die Stimmenbegrenzung und zum Abbrechen)
        this.lautstaerke = { ...LAUTSTAERKE };
        this.schleifen = {};  // laufende Dauergeräusche: Schlüssel -> { quelle, gain }
        this.master = null;   // gemeinsamer Lautstärkeregler aller echten Aufnahmen
    }

    // Lädt alle Aufnahmen schon beim Start herunter (noch ohne Audio-Kontext, den dürfen Browser erst nach einem Klick erstellen).
    // Fehlt eine Datei, wird sie übersprungen: Das Spiel läuft weiter und nimmt dann den Ersatzton aus dem Code.
    vorladen() {
        if (this.geladen) return;
        this.geladen = true;
        for (const [schluessel, info] of Object.entries(SAMPLES)) {
            this.roh[schluessel] = [];
            info.dateien.forEach(async (url, i) => {
                try {
                    const antwort = await fetch(url);
                    if (!antwort.ok) throw new Error(antwort.status);
                    this.roh[schluessel][i] = await antwort.arrayBuffer();
                    if (this.ctx) this.dekodiere(schluessel);
                } catch (fehler) { console.warn('Sound konnte nicht geladen werden:', url, fehler); }
            });
        }
        for (const [schluessel, info] of Object.entries(SCHLEIFEN)) {            // Dauergeräusche: eine Datei je Schleife
            this.roh[schluessel] = [];
            fetch(info.datei).then(a => { if (!a.ok) throw new Error(a.status); return a.arrayBuffer(); }).then((daten) => {
                this.roh[schluessel][0] = daten;
                if (this.ctx) this.dekodiere(schluessel);
            }).catch(fehler => console.warn('Sound konnte nicht geladen werden:', info.datei, fehler));
        }
        // Der erste Klick oder Tastendruck schaltet den Ton frei und dekodiert die Aufnahmen
        const frei = () => { this.context(); window.removeEventListener('pointerdown', frei); window.removeEventListener('keydown', frei); };
        window.addEventListener('pointerdown', frei);
        window.addEventListener('keydown', frei);
    }

    // Wandelt geladene Dateien in abspielbare Puffer um (braucht den Audio-Kontext)
    dekodiere(schluessel) {
        const liste = this.roh[schluessel] ?? [];
        this.puffer[schluessel] = this.puffer[schluessel] ?? [];
        liste.forEach((daten, i) => {
            if (!daten || this.puffer[schluessel][i] !== undefined) return;
            this.puffer[schluessel][i] = null;                         // "wird gerade dekodiert"
            // Der Puffer wird kopiert, weil dekodieren ihn leert
            this.ctx.decodeAudioData(daten.slice(0)).then(
                (b) => { this.puffer[schluessel][i] = b; },
                (fehler) => { console.warn('Sound konnte nicht dekodiert werden:', schluessel, fehler); });
        });
    }

    // Gibt es mindestens eine fertig dekodierte Aufnahme dieser Gruppe?
    hat(schluessel) {
        return (this.puffer[schluessel] ?? []).some(Boolean);
    }

    setzeLautstaerke(art, wert) {
        this.lautstaerke[art] = Math.max(0, Math.min(1, wert));
    }

    // Spielt eine echte Aufnahme der Gruppe ab. Gibt true zurück, wenn etwas erklungen ist (sonst nimmt der Aufrufer den Ersatzton).
    spiele(schluessel, art = 'waffen', tempo = 1, lautst = 1) {
        if (this.muted) return true;
        const ctx = this.context();
        const info = SAMPLES[schluessel];
        if (!ctx || !info || !this.hat(schluessel)) return false;
        if (info.pause) {                                            // Mindestabstand zwischen zwei Klängen dieser Gruppe (verhindert Brei)
            const jetzt = performance.now(), l = this.letzteZeit ?? (this.letzteZeit = {});
            if (jetzt - (l[schluessel] ?? -999) < info.pause) return true;
            l[schluessel] = jetzt;
        }
        const fertig = this.puffer[schluessel].filter(Boolean);
        // nie zweimal dieselbe Aufnahme hintereinander (sonst klingt Dauerfeuer wie eine Maschine)
        let i;
        do { i = Math.floor(Math.random() * fertig.length); } while (fertig.length > 1 && i === this.letzte?.[schluessel]);
        (this.letzte = this.letzte ?? {})[schluessel] = i;
        const quelle = ctx.createBufferSource(), gain = ctx.createGain();
        quelle.buffer = fertig[i];
        quelle.playbackRate.value = tempo * (1 + (Math.random() * 2 - 1) * info.tonhoehe);
        gain.gain.value = info.vol * lautst * (this.lautstaerke[art] ?? 1) * (0.92 + Math.random() * 0.16);
        quelle.connect(gain).connect(ctx.destination);
        // Stimmenbegrenzung: zu viele gleichzeitig? Das älteste kurz ausblenden und beenden
        const liste = this.aktiv[schluessel] = (this.aktiv[schluessel] ?? []);
        while (liste.length >= info.stimmen) this.beende(liste.shift());
        const eintrag = { quelle, gain };
        liste.push(eintrag);
        quelle.onended = () => { const k = liste.indexOf(eintrag); if (k >= 0) liste.splice(k, 1); };
        quelle.start();
        return true;
    }

    // Beendet ein Exemplar mit kurzem Ausblenden (kein Knacken)
    beende(eintrag) {
        try {
            const t = this.ctx.currentTime;
            eintrag.gain.gain.cancelScheduledValues(t);
            eintrag.gain.gain.setValueAtTime(eintrag.gain.gain.value, t);
            eintrag.gain.gain.linearRampToValueAtTime(0, t + 0.04);
            eintrag.quelle.stop(t + 0.05);
        } catch (e) { /* war schon zu Ende */ }
    }

    // Startet ein Dauergeräusch (Schleife). Läuft es schon, passiert nichts. Fehlt die Aufnahme, läuft ein einfaches Rauschen aus dem Code.
    schleifeStart(schluessel) {
        if (this.muted || this.schleifen[schluessel]) return;
        const ctx = this.context(), info = SCHLEIFEN[schluessel];
        if (!ctx || !info) return;
        let puffer = this.puffer[schluessel]?.[0];
        if (!puffer) {                                              // Ersatz: 1,5 s gefiltertes Rauschen
            puffer = this.ersatzRauschen ?? (this.ersatzRauschen = (() => {
                const n = Math.ceil(ctx.sampleRate * 1.5), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
                let tief = 0; for (let i = 0; i < n; i++) { tief += (Math.random() * 2 - 1 - tief) * 0.35; d[i] = tief; }
                return b; })());
        }
        const quelle = ctx.createBufferSource(), gain = ctx.createGain(), t = ctx.currentTime;
        quelle.buffer = puffer; quelle.loop = true;
        const ziel = info.vol * (this.lautstaerke[info.art] ?? 1);
        gain.gain.setValueAtTime(0.0001, t); gain.gain.linearRampToValueAtTime(ziel, t + info.einblenden);
        quelle.connect(gain).connect(ctx.destination);
        quelle.start();
        this.schleifen[schluessel] = { quelle, gain };
    }

    // Beendet ein Dauergeräusch sofort und sauber (kurzes Ausblenden gegen Knacken). Läuft es nicht, passiert nichts.
    schleifeStopp(schluessel) {
        const l = this.schleifen[schluessel];
        if (!l) return;
        delete this.schleifen[schluessel];
        try {
            const t = this.ctx.currentTime, aus = SCHLEIFEN[schluessel].ausblenden;
            l.gain.gain.cancelScheduledValues(t);
            l.gain.gain.setValueAtTime(Math.max(0.0001, l.gain.gain.value), t);
            l.gain.gain.linearRampToValueAtTime(0, t + aus);
            l.quelle.stop(t + aus + 0.02);
        } catch (e) { /* war schon zu Ende */ }
    }

    // Beendet alle Dauergeräusche (Szene verlassen, Pause, Tod, Neustart)
    schleifenStoppen() {
        for (const k of Object.keys(this.schleifen)) this.schleifeStopp(k);
    }

    // Bricht alle laufenden Exemplare einer Gruppe ab (z. B. das Nachladen, wenn die Waffe gewechselt wird)
    stoppe(schluessel) {
        for (const e of (this.aktiv[schluessel] ?? []).splice(0)) this.beende(e);
    }

    // Browser erlauben Ton erst nach einer Benutzeraktion (Klick/Taste), deshalb "lazy" erstellen.
    context() {
        if (!this.ctx) {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return null;
            this.ctx = new AC();
            for (const k of Object.keys(this.roh)) this.dekodiere(k);   // schon geladene Aufnahmen jetzt dekodieren
        }
        if (this.ctx.state === 'suspended') this.ctx.resume();
        return this.ctx;
    }

    toggle() {
        this.muted = !this.muted;
        return this.muted;
    }

    // Ein Ton, der von freq nach endFreq gleitet und dabei leiser wird.
    tone(freq, endFreq, dauer, typ = 'square', lautstaerke = 0.15, start = 0) {
        const ctx = this.context();
        if (!ctx) return;
        const t = ctx.currentTime + start;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = typ;
        osc.frequency.setValueAtTime(freq, t);
        osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), t + dauer);
        gain.gain.setValueAtTime(lautstaerke, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + dauer);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t);
        osc.stop(t + dauer);
    }

    // Rauschen (zufällige Werte), durch einen Filter gedämpft: Knall, Zischen, Explosion.
    noise(dauer, lautstaerke = 0.2, filterFreq = 2000, start = 0) {
        const ctx = this.context();
        if (!ctx) return;
        const t = ctx.currentTime + start;
        const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dauer), ctx.sampleRate);
        const daten = buffer.getChannelData(0);
        for (let i = 0; i < daten.length; i++) daten[i] = Math.random() * 2 - 1;
        const quelle = ctx.createBufferSource();
        quelle.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(filterFreq, t);
        filter.frequency.exponentialRampToValueAtTime(100, t + dauer);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(lautstaerke, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + dauer);
        quelle.connect(filter).connect(gain).connect(ctx.destination);
        quelle.start(t);
    }

    // Ein Schuss wie aus einer echten Waffe: ein scharfer, heller Knall (Rauschen, das in Millisekunden abfällt), darunter ein tiefer Wumms,
    // dazu ein dumpfes Echo, das von den Hängen zurückkommt. Je größer "wucht", desto tiefer und lauter.
    schuss(wucht = 1, echo = 0.1) {
        const ctx = this.context();
        if (!ctx) return;
        const t = ctx.currentTime, v = 0.85 + Math.random() * 0.3;   // kleine Zufallsabweichung: Kein Schuss klingt exakt wie der vorige
        const mix = ctx.createGain();
        mix.gain.value = 0.9;
        mix.connect(ctx.destination);
        const rauschen = (dauer) => {
            const b = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dauer), ctx.sampleRate), d = b.getChannelData(0);
            for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
            const q = ctx.createBufferSource(); q.buffer = b; return q;
        };
        // 1. Der Knall: Rauschen mit Hochpass, fällt exponentiell ab (das "Crack")
        const knall = rauschen(0.22), hp = ctx.createBiquadFilter(), gk = ctx.createGain();
        hp.type = 'highpass'; hp.frequency.value = 500 / wucht;
        gk.gain.setValueAtTime(0.9 * wucht, t); gk.gain.exponentialRampToValueAtTime(0.001, t + 0.05 + 0.06 * wucht);
        knall.connect(hp).connect(gk).connect(mix); knall.start(t);
        // 2. Der Körper: gefiltertes Rauschen, etwas länger, tiefer
        const koerper = rauschen(0.4), lp = ctx.createBiquadFilter(), gb = ctx.createGain();
        lp.type = 'lowpass'; lp.frequency.setValueAtTime(2600 * v, t); lp.frequency.exponentialRampToValueAtTime(180, t + 0.3 * wucht);
        gb.gain.setValueAtTime(0.7 * wucht, t); gb.gain.exponentialRampToValueAtTime(0.001, t + 0.12 + 0.2 * wucht);
        koerper.connect(lp).connect(gb).connect(mix); koerper.start(t);
        // 3. Der Wumms: ein sehr schnell fallender tiefer Ton
        const o = ctx.createOscillator(), go = ctx.createGain();
        o.type = 'sine'; o.frequency.setValueAtTime(190 / wucht * v, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.14);
        go.gain.setValueAtTime(0.9 * wucht, t); go.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
        o.connect(go).connect(mix); o.start(t); o.stop(t + 0.2);
        // 4. Das Echo: dumpfer, leiser Nachhall
        if (echo > 0) {
            const e = rauschen(0.6), le = ctx.createBiquadFilter(), ge = ctx.createGain();
            le.type = 'lowpass'; le.frequency.value = 900;
            ge.gain.setValueAtTime(0.0001, t); ge.gain.linearRampToValueAtTime(echo * wucht, t + 0.07); ge.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
            e.connect(le).connect(ge).connect(mix); e.start(t);
        }
    }

    // Desert Eagle (.50 AE): ein ohrenbetäubender, trockener Peitschenknall, ein sehr tiefer, langer Donner darunter, ein metallisches Klingeln
    // vom Schlitten und ein langer, hallender Nachklang (Faltungshall aus einem selbst erzeugten, abklingenden Rauschen).
    deagle() {
        const ctx = this.context();
        if (!ctx) return;
        const t = ctx.currentTime, v = 0.93 + Math.random() * 0.14;
        if (!this.hall) {                                            // Hall-Impuls einmal bauen: 1,6 s abklingendes Rauschen
            const n = Math.ceil(ctx.sampleRate * 1.6), imp = ctx.createBuffer(2, n, ctx.sampleRate);
            for (let k = 0; k < 2; k++) { const d = imp.getChannelData(k); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3.2); }
            this.hall = ctx.createConvolver(); this.hall.buffer = imp;
            const gh = ctx.createGain(); gh.gain.value = 0.55; this.hall.connect(gh).connect(ctx.destination);
        }
        const aus = ctx.createGain(); aus.gain.value = 1;
        aus.connect(ctx.destination);
        const hallSend = ctx.createGain(); hallSend.gain.value = 0.9; aus.connect(hallSend).connect(this.hall);
        const rauschen = (dauer) => {
            const b = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dauer), ctx.sampleRate), d = b.getChannelData(0);
            for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
            const q = ctx.createBufferSource(); q.buffer = b; return q;
        };
        const schicht = (dauer, filter, freq0, freq1, vol, abfall) => {
            const q = rauschen(dauer), f = ctx.createBiquadFilter(), g = ctx.createGain();
            f.type = filter; f.frequency.setValueAtTime(freq0, t); if (freq1) f.frequency.exponentialRampToValueAtTime(freq1, t + abfall);
            g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + abfall);
            q.connect(f).connect(g).connect(aus); q.start(t);
        };
        schicht(0.1, 'highpass', 1800, 0, 1.3, 0.045);               // der scharfe Peitschenknall (Mündungsknall)
        schicht(0.25, 'bandpass', 3200 * v, 600, 0.9, 0.12);         // der Körper des Knalls
        schicht(0.5, 'lowpass', 1400, 120, 0.9, 0.38);               // der dumpfe Rückstoß-Donner
        const o = ctx.createOscillator(), go = ctx.createGain();     // sehr tiefer Schlag, der die Brust trifft
        o.type = 'sine'; o.frequency.setValueAtTime(115 * v, t); o.frequency.exponentialRampToValueAtTime(30, t + 0.28);
        go.gain.setValueAtTime(1.1, t); go.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        o.connect(go).connect(aus); o.start(t); o.stop(t + 0.35);
        const ring = ctx.createOscillator(), gr = ctx.createGain();  // metallisches Klingeln des Schlittens
        ring.type = 'triangle'; ring.frequency.value = 2150 * v;
        gr.gain.setValueAtTime(0.0001, t); gr.gain.linearRampToValueAtTime(0.07, t + 0.004); gr.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
        ring.connect(gr).connect(aus); ring.start(t); ring.stop(t + 0.25);
    }

    // AK-47 (7,62 x 39): ein harter, übersteuerter Peitschenschlag. Echte Aufnahmen klingen so, weil das Mikrofon bei dem Pegel an die Grenze kommt:
    // Wir bauen darum erst den Knall aus mehreren Rauschschichten und drücken ihn dann durch einen Übersteuerer (WaveShaper) und einen Kompressor.
    // Dazu: ein Klick am Anfang (Druckwelle), ein kehliges Bellen in den unteren Mitten (200-500 Hz), kurzer Bass, das metallische Klacken von
    // Verschluss und Schlitten kurz nach dem Schuss, und Echos von Hängen. Jeder Schuss ist leicht verschieden.
    ak47() {
        const ctx = this.context();
        if (!ctx) return;
        const t = ctx.currentTime, v = 0.93 + Math.random() * 0.14;
        if (!this.akZerrer) {                                                   // Übersteuerungskurve und Kompressor einmal bauen
            const n = 1024, kurve = new Float32Array(n);
            for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; kurve[i] = Math.tanh(x * 3.2) / Math.tanh(3.2); }
            this.akZerrer = ctx.createWaveShaper(); this.akZerrer.curve = kurve; this.akZerrer.oversample = '2x';
            this.akKomp = ctx.createDynamicsCompressor();
            this.akKomp.threshold.value = -18; this.akKomp.ratio.value = 8; this.akKomp.attack.value = 0.001; this.akKomp.release.value = 0.12;
            const ausgang = ctx.createGain(); ausgang.gain.value = 0.85;
            this.akZerrer.connect(this.akKomp).connect(ausgang).connect(ctx.destination);
        }
        const aus = ctx.createGain(); aus.gain.value = 0.9; aus.connect(this.akZerrer);
        const rauschen = (dauer) => {
            const b = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dauer), ctx.sampleRate), d = b.getChannelData(0);
            for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
            const q = ctx.createBufferSource(); q.buffer = b; return q;
        };
        // Ein Rauschstoß: Beginn, Filtertyp, Frequenz (optional gleitend nach frei1), Güte, Lautstärke, Abklingzeit
        const stoss = (start, typ, freq, q, vol, abfall, frei1 = 0) => {
            const quelle = rauschen(abfall + 0.05), f = ctx.createBiquadFilter(), g = ctx.createGain();
            f.type = typ; f.frequency.setValueAtTime(freq, t + start); f.Q.value = q;
            if (frei1) f.frequency.exponentialRampToValueAtTime(frei1, t + start + abfall);
            g.gain.setValueAtTime(vol, t + start); g.gain.exponentialRampToValueAtTime(0.001, t + start + abfall);
            quelle.connect(f).connect(g).connect(aus); quelle.start(t + start);
        };
        stoss(0, 'highpass', 3000, 0.7, 1.6, 0.012);                            // Klick: die Druckwelle, nur ein paar Millisekunden
        stoss(0, 'bandpass', 5200 * v, 0.7, 1.0, 0.05);                         // helles Zischen der Überschallmündung
        stoss(0.001, 'bandpass', 2200 * v, 0.8, 1.1, 0.08, 900);                // der "Riss", gleitet von hell nach mittig
        stoss(0.002, 'bandpass', 380 * v, 1.0, 1.4, 0.11);                      // kehliges Bellen in den unteren Mitten
        stoss(0.003, 'lowpass', 500, 0.7, 1.0, 0.18);                           // dumpfer Körper
        const o = ctx.createOscillator(), go = ctx.createGain();                // Schlag in den Bass
        o.type = 'sine'; o.frequency.setValueAtTime(150 * v, t); o.frequency.exponentialRampToValueAtTime(52, t + 0.09);
        go.gain.setValueAtTime(0.9, t); go.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
        o.connect(go).connect(aus); o.start(t); o.stop(t + 0.14);
        stoss(0.032, 'bandpass', 2800, 6, 0.22, 0.03);                          // metallisches Klacken des Verschlusses
        stoss(0.052, 'bandpass', 1500, 4, 0.12, 0.025);                         // zweites, tieferes Klacken (Schlitten)
        stoss(0.08, 'bandpass', 1200, 0.6, 0.4, 0.13);                          // erstes Echo (nahe Wand)
        stoss(0.17, 'bandpass', 800, 0.5, 0.26, 0.22);                          // zweites Echo (Hang)
        stoss(0.31, 'lowpass', 550, 0.5, 0.14, 0.35);                           // Nachhall in der Ferne
        stoss(0.5, 'lowpass', 400, 0.5, 0.06, 0.4);                             // ganz leises Ausklingen
    }

    // Nachladen: eine Folge aus Metallklicks und dumpfen Schlägen, verteilt über die Nachladezeit (dauer in Millisekunden).
    // Gewehr und Pistole: Magazin entriegeln, Magazin herausgleiten, neues Magazin einschieben, Schlitten bzw. Verschluss durchladen.
    // Schrotflinte: Patrone für Patrone einlegen, am Ende durchladen (Vorderschaft nach hinten und wieder nach vorn).
    nachladen(waffe = 'rifle', dauer = 1500) {
        const ctx = this.context();
        if (!ctx) return;
        if (waffe === 'rifle') {          // das Gewehr (AK-47) hat eine echte Aufnahme; sie wird leicht an die Nachladezeit angepasst
            const b = this.puffer['ak47.nachladen']?.[0];
            const tempo = b ? Math.max(0.9, Math.min(1, b.duration / (dauer / 1000))) : 1;
            if (b && this.spiele('ak47.nachladen', 'nachladen', tempo)) return;
        }
        const D = dauer / 1000, t0 = ctx.currentTime;
        const rauschen = (laenge) => {
            const b = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * laenge), ctx.sampleRate), d = b.getChannelData(0);
            for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
            const q = ctx.createBufferSource(); q.buffer = b; return q;
        };
        // Ein Klick: kurzer Rauschstoß durch einen schmalen Filter (Metall), Frequenz leicht zufällig
        const klick = (bruch, freq, q, vol, laenge = 0.03) => {
            const start = t0 + bruch * D, quelle = rauschen(laenge + 0.02), f = ctx.createBiquadFilter(), g = ctx.createGain();
            f.type = 'bandpass'; f.frequency.value = freq * (0.94 + Math.random() * 0.12); f.Q.value = q;
            g.gain.setValueAtTime(vol, start); g.gain.exponentialRampToValueAtTime(0.001, start + laenge);
            quelle.connect(f).connect(g).connect(ctx.destination); quelle.start(start);
        };
        // Ein dumpfer Schlag (Magazin rastet ein, Verschluss schlägt an)
        const schlag = (bruch, freq, vol, laenge = 0.07) => {
            const start = t0 + bruch * D, o = ctx.createOscillator(), g = ctx.createGain();
            o.type = 'sine'; o.frequency.setValueAtTime(freq, start); o.frequency.exponentialRampToValueAtTime(freq * 0.4, start + laenge);
            g.gain.setValueAtTime(vol, start); g.gain.exponentialRampToValueAtTime(0.001, start + laenge);
            o.connect(g).connect(ctx.destination); o.start(start); o.stop(start + laenge + 0.02);
        };
        // Ein Schleifen (Magazin gleitet, Schlitten fährt zurück): Rauschen mit gleitendem Filter
        const schleifen = (bruch, laenge, vol) => {
            const start = t0 + bruch * D, quelle = rauschen(laenge + 0.02), f = ctx.createBiquadFilter(), g = ctx.createGain();
            f.type = 'bandpass'; f.Q.value = 1.5; f.frequency.setValueAtTime(900, start); f.frequency.linearRampToValueAtTime(2400, start + laenge);
            g.gain.setValueAtTime(vol, start); g.gain.linearRampToValueAtTime(0.001, start + laenge);
            quelle.connect(f).connect(g).connect(ctx.destination); quelle.start(start);
        };
        if (waffe === 'shotgun') {
            for (let i = 0; i < 5; i++) { const b = 0.04 + i * 0.15; klick(b, 2400, 5, 0.22); schlag(b + 0.01, 190, 0.2, 0.05); }   // Patronen einlegen
            schleifen(0.8, 0.07, 0.2); klick(0.82, 1700, 4, 0.3); schlag(0.84, 140, 0.35);                                     // Vorderschaft zurück
            klick(0.92, 2000, 4, 0.3); schlag(0.94, 120, 0.4);                                                                 // und wieder nach vorn
        } else {
            const gewehr = waffe === 'rifle';
            klick(0.0, 3000, 6, 0.3); schlag(0.01, 150, 0.2, 0.05);                      // Magazinhalter drücken
            schleifen(0.06, 0.12, 0.18);                                                 // Magazin gleitet heraus
            schlag(0.22, 90, 0.16, 0.06);                                                // Magazin fällt/wird herausgezogen
            schleifen(0.5, 0.08, 0.14);                                                  // neues Magazin ansetzen
            klick(0.58, 3200, 5, 0.38); schlag(0.585, gewehr ? 120 : 160, 0.5, 0.08);    // Magazin rastet ein
            schleifen(0.8, gewehr ? 0.09 : 0.07, 0.25); klick(0.82, 1800, 4, 0.35);      // Verschluss zurückziehen
            klick(0.9, 2600, 5, 0.42); schlag(0.905, gewehr ? 100 : 130, 0.55, 0.09);    // Verschluss schnappt nach vorn
        }
    }

    // Ein Gegner wurde getroffen (nur wenn der Treffer wirklich ankam): nasser Klang. Stärkere Treffer klingen lauter und tiefer.
    // art 'feuer' (Flammenwerfer) macht keinen Treffer-Klang, das Feuer hat seinen eigenen Dauerton.
    gegnerTreffer(schaden = 1, art = 'kugel') {
        if (this.muted || art === 'feuer') return;
        const s = Math.min(6, Math.max(0.5, schaden)), k = TREFFER.ton.starkFaktor;
        if (!this.spiele('treffer.nass', 'treffer', 1.08 - s * 0.04, 0.75 + s * k * 2)) {      // ohne Aufnahme: der alte kurze Ton
            this.tone(220, 120, 0.06, 'square', 0.08);
        }
    }

    // Ein Gegner stirbt: ein längerer nasser Klang (feuer: leiser)
    gegnerTod(art = 'kugel') {
        if (this.muted) return;
        const l = (art === 'feuer' ? 0.55 : 1) * TREFFER.ton.todLautstaerke;
        if (!this.spiele('treffer.tod', 'treffer', 1, l)) this.tone(300, 50, 0.25, 'sawtooth', 0.12);
    }

    // Spielt ein Geräusch nach Namen ab.
    play(name) {
        if (this.muted) return;
        switch (name) {
            case 'pistol':   if (!this.spiele('pistol.schuss', 'waffen')) this.deagle(); break;   // echte Aufnahme (9 mm), sonst der Ersatzton aus dem Code
            case 'messerWurf':    if (!this.spiele('knife.wurf', 'waffen')) this.noise(0.12, 0.06, 5000); break;
            case 'messerTreffer': if (!this.spiele('knife.treffer', 'waffen')) { this.tone(900, 300, 0.06, 'square', 0.08); this.noise(0.05, 0.1, 3000); } break;
            case 'messerAuf':     if (!this.spiele('knife.auf', 'waffen')) this.tone(2400, 1800, 0.07, 'triangle', 0.07); break;
            case 'raketeStart':   if (!this.spiele('rocket.start', 'waffen')) { this.noise(0.5, 0.3, 2500); this.tone(110, 40, 0.3, 'sawtooth', 0.2); } break;
            case 'raketeKnall':   if (!this.spiele('rocket.knall', 'waffen')) this.play('explosion'); break;
            case 'flammeStart':   if (!this.spiele('flame.start', 'waffen')) this.noise(0.3, 0.2, 1500); break;
            case 'flammeEnde':    if (!this.spiele('flame.ende', 'waffen')) this.noise(0.25, 0.1, 900); break;
            case 'leer':          this.tone(1400, 900, 0.03, 'square', 0.05); this.noise(0.02, 0.08, 6000); break;   // trockenes Klicken: nichts mehr im Magazin
            case 'entdeckung':    // großer Fund: ein leises, glänzendes Arpeggio mit einem warmen Grundton
                [392, 494, 587, 784, 988].forEach((f, i) => this.tone(f, f * 1.005, 0.7 - i * 0.05, 'triangle', 0.09, i * 0.09));
                this.tone(196, 196, 1.1, 'sine', 0.08); this.tone(294, 294, 1.0, 'sine', 0.05, 0.1); this.noise(0.25, 0.04, 6000, 0.35); break;
            case 'waffeFallen':   this.noise(0.12, 0.12, 900); this.tone(110, 55, 0.14, 'sine', 0.22); this.spiele('knife.auf', 'waffen', 0.7); break;   // eine Waffe fällt zu Boden
            case 'waffeAuf':      this.spiele('knife.auf', 'waffen', 0.85); this.tone(520, 700, 0.05, 'square', 0.04); break;
            case 'tauschAuf':     this.tone(520, 680, 0.07, 'triangle', 0.08); break;
            case 'tauschWahl':    this.tone(760, 760, 0.04, 'square', 0.05); break;
            case 'hinweis':       this.tone(262, 247, 0.6, 'sine', 0.05); this.tone(392, 370, 0.7, 'sine', 0.03, 0.12); break;   // leiser Hinweis beim Betreten einer Zone
            case 'neueWaffe':     [392, 523, 659, 784].forEach((f, i) => this.tone(f, f, 0.14, 'triangle', 0.1, i * 0.07)); this.noise(0.05, 0.1, 5000); break;
            case 'rifle':    if (!this.spiele('ak47.schuss', 'waffen')) this.ak47(); break;   // echte Aufnahme, sonst der Ersatzton aus dem Code
            case 'shotgun':  this.schuss(1.5, 0.18); break;
            case 'fleisch':  this.noise(0.09, 0.14, 900); this.tone(130, 60, 0.08, 'sine', 0.12); break;
            case 'enemyShot':this.tone(400, 100, 0.15, 'triangle', 0.1); break;
            case 'hit':      this.tone(220, 120, 0.06, 'square', 0.08); break;
            case 'kill':     this.tone(300, 50, 0.25, 'sawtooth', 0.12); break;
            case 'hurt':     this.tone(200, 60, 0.3, 'sawtooth', 0.2); this.noise(0.15, 0.15, 1500); break;
            case 'schwert':  this.noise(0.18, 0.18, 4500); this.tone(500, 1400, 0.12, 'sawtooth', 0.05); break;
            case 'schwertHit': this.tone(1800, 900, 0.1, 'square', 0.1); this.noise(0.08, 0.15, 6000); break;
            case 'seil':     this.noise(0.14, 0.05, 2500); this.tone(180, 140, 0.12, 'sawtooth', 0.03); break;
            case 'tor':      this.noise(0.5, 0.4, 900); this.tone(90, 45, 0.35, 'square', 0.25); break;
            case 'bogen':    this.tone(340, 110, 0.1, 'triangle', 0.12); this.noise(0.06, 0.06, 3500); break;
            case 'throw':    this.noise(0.15, 0.08, 1200); break;
            case 'explosion':this.noise(0.8, 0.5, 1800); this.tone(110, 30, 0.6, 'sawtooth', 0.3); break;
            case 'reload':   this.tone(300, 500, 0.06, 'square', 0.08); this.tone(500, 300, 0.06, 'square', 0.08, 0.15); break;
            case 'pickup':   this.tone(600, 900, 0.08, 'square', 0.1); this.tone(900, 1200, 0.1, 'square', 0.1, 0.08); break;
            case 'heal':     this.tone(400, 800, 0.25, 'sine', 0.15); this.tone(600, 1000, 0.25, 'sine', 0.12, 0.12); break;
            case 'roar':     this.tone(90, 40, 0.7, 'sawtooth', 0.3); this.noise(0.5, 0.15, 800); break;
            case 'win':      [523, 659, 784, 1047].forEach((f, i) => this.tone(f, f, 0.25, 'triangle', 0.15, i * 0.15)); break;
            case 'lose':     [400, 300, 220, 150].forEach((f, i) => this.tone(f, f * 0.9, 0.35, 'sawtooth', 0.15, i * 0.25)); break;
        }
    }
}

// Es gibt nur ein einziges Sound-Objekt für das ganze Spiel; alle Dateien teilen es sich.
export const sfx = new Sound();
