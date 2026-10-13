// Alle Geräusche des Spiels, ohne eine einzige Audiodatei: Sie werden live berechnet
// (Web Audio API des Browsers). Ein "Oszillator" erzeugt einen Ton, "Rauschen" klingt
// wie Zischen oder Knall. Später kann man echte Sounddateien an derselben Stelle einsetzen.
class Sound {
    constructor() {
        this.ctx = null;      // der Audio-Kontext; wird erst beim ersten Abspielen erstellt
        this.muted = false;
    }

    // Browser erlauben Ton erst nach einer Benutzeraktion (Klick/Taste), deshalb "lazy" erstellen.
    context() {
        if (!this.ctx) {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return null;
            this.ctx = new AC();
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

    // Spielt ein Geräusch nach Namen ab.
    play(name) {
        if (this.muted) return;
        switch (name) {
            case 'pistol':   this.tone(900, 150, 0.1, 'square', 0.12); this.noise(0.08, 0.1, 5000); break;
            case 'rifle':    this.tone(700, 120, 0.08, 'sawtooth', 0.1); this.noise(0.06, 0.1, 6000); break;
            case 'shotgun':  this.noise(0.3, 0.35, 3500); this.tone(150, 40, 0.25, 'sawtooth', 0.2); break;
            case 'enemyShot':this.tone(400, 100, 0.15, 'triangle', 0.1); break;
            case 'hit':      this.tone(220, 120, 0.06, 'square', 0.08); break;
            case 'kill':     this.tone(300, 50, 0.25, 'sawtooth', 0.12); break;
            case 'hurt':     this.tone(200, 60, 0.3, 'sawtooth', 0.2); this.noise(0.15, 0.15, 1500); break;
            case 'schwert':  this.noise(0.18, 0.18, 4500); this.tone(500, 1400, 0.12, 'sawtooth', 0.05); break;
            case 'schwertHit': this.tone(1800, 900, 0.1, 'square', 0.1); this.noise(0.08, 0.15, 6000); break;
            case 'seil':     this.noise(0.14, 0.05, 2500); this.tone(180, 140, 0.12, 'sawtooth', 0.03); break;
            case 'tor':      this.noise(0.5, 0.4, 900); this.tone(90, 45, 0.35, 'square', 0.25); break;
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
