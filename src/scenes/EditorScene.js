// Der Karteneditor (nur auf localhost im Menü): Hier skizziert man selbst, wie ein Abschnitt oder eine Herausforderung aussehen soll.
// Man malt Erde, Stein und Holzböden, zieht Leitern, setzt Gegner, Gegenstände, Fahnen, den Hubschrauber und den Startpunkt, schreibt Notizen
// und zeichnet beschriftete Bereiche ("hier kommt der Boss"). Die Skizze wird als Datei editor/karte.json gespeichert, die Claude lesen und
// weiterverarbeiten kann.
//
// Das Raster ist dasselbe wie im Spiel: Eine Zelle ist 56 x 56 Pixel groß (cx von links nach rechts, cy von der Oberfläche aus: 0 = die Zelle
// direkt unter der Oberfläche, negative Zahlen = darüber). Alles wird in diesem Zellraster gespeichert.
//
// Bedienung: Werkzeug links wählen (oder Zifferntaste), mit der linken Maustaste malen (bei Blöcken und Radierer ein Rechteck aufziehen),
// rechte Maustaste radiert, mittlere Maustaste oder Leertaste + Ziehen verschiebt die Ansicht, Mausrad zoomt, WASD/Pfeile verschieben.
// Strg+Z macht rückgängig, Strg+S speichert. Alles wird außerdem laufend im Browser zwischengespeichert.
const Z = 56;               // Zellgröße
const BODEN = 760;          // Höhe der Oberfläche im Spiel
const SERVER = 'http://localhost:8010/karte';   // kleiner Speicherserver (speichern.py); ohne ihn wird die Datei heruntergeladen
const SPEICHER = 'brokrun_editor_karte';

const BREITE_PANEL = 206;
const KOPF = 34;

// Alle Werkzeuge: id, Beschriftung, Gruppe, Farbe des Symbols
const WERKZEUGE = [
    { id: 'erde', name: 'Earth block', gruppe: 'BLOCKS', farbe: 0x7a5a3c },
    { id: 'stein', name: 'Stone block', gruppe: 'BLOCKS', farbe: 0x7a7670 },
    { id: 'holz', name: 'Wooden floor', gruppe: 'BLOCKS', farbe: 0x9a7a3a },
    { id: 'radierer', name: 'Eraser', gruppe: 'BLOCKS', farbe: 0xe06060 },
    { id: 'leiter', name: 'Ladder (drag)', gruppe: 'CLIMB', farbe: 0xc9a05a },
    { id: 'nahkaempfer', name: 'Soldier (melee)', gruppe: 'ENEMIES', farbe: 0xc84a4a },
    { id: 'fernkaempfer', name: 'Gunner', gruppe: 'ENEMIES', farbe: 0x9a6ad0 },
    { id: 'skelett', name: 'Skeleton archer', gruppe: 'ENEMIES', farbe: 0xe8e4d0 },
    { id: 'schwer', name: 'Heavy guard', gruppe: 'ENEMIES', farbe: 0x8a2a2a },
    { id: 'boss', name: 'Boss', gruppe: 'ENEMIES', farbe: 0x3a9a5a },
    { id: 'heilung', name: 'Medkit', gruppe: 'ITEMS', farbe: 0xf0f0f0 },
    { id: 'munition', name: 'Ammo', gruppe: 'ITEMS', farbe: 0xd8b040 },
    { id: 'granate', name: 'Grenade', gruppe: 'ITEMS', farbe: 0x5a8a3a },
    { id: 'schrotflinte', name: 'Shotgun', gruppe: 'ITEMS', farbe: 0xb07a3a },
    { id: 'gewehr', name: 'Assault rifle', gruppe: 'ITEMS', farbe: 0x6a6a72 },
    { id: 'schwert', name: 'Sword', gruppe: 'ITEMS', farbe: 0x9ad0f0 },
    { id: 'fass', name: 'Explosive barrel', gruppe: 'ITEMS', farbe: 0xc03a2a },
    { id: 'fahne', name: 'Checkpoint flag', gruppe: 'MARKS', farbe: 0xd03030 },
    { id: 'ziel', name: 'Helicopter (goal)', gruppe: 'MARKS', farbe: 0x66ff99 },
    { id: 'start', name: 'Player start', gruppe: 'MARKS', farbe: 0x66cc66 },
    { id: 'notiz', name: 'Note (text)', gruppe: 'MARKS', farbe: 0xffe080 },
    { id: 'bereich', name: 'Area (drag + label)', gruppe: 'MARKS', farbe: 0x66a0ff },
];
const ZIFFERN = ['erde', 'stein', 'holz', 'radierer', 'leiter', 'nahkaempfer', 'fernkaempfer', 'skelett', 'schwer', 'boss'];   // Tasten 1 bis 0
const NAMEN = Object.fromEntries(WERKZEUGE.map((w) => [w.id, w.name]));
const BLOCK_CODE = { erde: 'e', stein: 's', holz: 'h' };
const CODE_BLOCK = { e: 'erde', s: 'stein', h: 'holz' };
const EINZIGARTIG = ['start', 'ziel'];                          // davon gibt es nur eines

export default class EditorScene extends Phaser.Scene {
    constructor() { super('EditorScene'); }

    create() {
        this.input.setDefaultCursor('default');
        this.input.mouse.disableContextMenu();
        this.cameras.main.setBackgroundColor(0x16302c);
        this.g = this.add.graphics().setDepth(1);
        this.bloecke = new Map();                   // "cx,cy" -> 'erde' | 'stein' | 'holz'
        this.dinge = [];                            // { id, t, cx, cy, ... }
        this.naechsteId = 1;
        this.werkzeug = 'erde';
        this.camX = -300; this.camY = BODEN - 380; this.zoom = 0.8;
        this.gitter = true;
        this.hilfe = true;
        this.zieh = null;                           // laufende Ziehaktion { art, c0, r0, c1, r1, button }
        this.verlaufListe = []; this.verlaufPos = -1;
        this.textObjekte = new Map();               // id -> Text (Notizen und Bereichsnamen)
        this.meldung = { text: '', bis: 0 };
        this.maus = { x: 0, y: 0 };

        const param = new URLSearchParams(window.location.search);
        this.ladeStart(param);
        this.baueOberflaeche();
        this.baueEingaben();
        this.verlaufNeu();
        window.__editor = this;                     // Testhilfe

        if (param.get('ansicht')) { const [a, b, c] = param.get('ansicht').split(',').map(Number); this.camX = a * Z - 100; this.camY = BODEN + b * Z - 300; this.zoom = c || this.zoom; }
        if (param.get('shot')) this.time.delayedCall(2500, () => this.game.renderer.snapshot((bild) => fetch('http://localhost:8002/', { method: 'POST', body: bild.src })));
        this.events.once('shutdown', () => { this.speichereLokal(); this.textObjekte.forEach((t) => t.destroy()); });
    }

    // ---------- Daten ----------

    vorlage() {
        this.bloecke.clear(); this.dinge = [];
        for (let cx = -8; cx < 90; cx++) for (let cy = 0; cy < 4; cy++) this.bloecke.set(cx + ',' + cy, 'erde');
        this.dinge.push({ id: this.naechsteId++, t: 'start', cx: 1, cy: -1 });
    }

    serialisiere() {
        const bloecke = [];
        for (const [k, t] of this.bloecke) { const [cx, cy] = k.split(',').map(Number); bloecke.push([cx, cy, BLOCK_CODE[t]]); }
        bloecke.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
        const dinge = this.dinge.map((d) => { const o = { ...d }; delete o.id; return o; });
        return { version: 1, zelle: Z, boden: BODEN, hinweis: 'cx: Zelle nach rechts, cy: Zelle von der Oberfläche (0) nach unten; negative cy liegen über der Erde. bloecke: [cx, cy, e=Erde|s=Stein|h=Holzboden]', bloecke, dinge };
    }

    uebernimm(daten) {
        this.bloecke.clear(); this.dinge = []; this.naechsteId = 1;
        for (const [cx, cy, code] of daten.bloecke ?? []) if (CODE_BLOCK[code]) this.bloecke.set(cx + ',' + cy, CODE_BLOCK[code]);
        for (const d of daten.dinge ?? []) this.dinge.push({ ...d, id: this.naechsteId++ });
        this.textObjekte.forEach((t) => t.destroy()); this.textObjekte.clear();
    }

    ladeStart(param) {
        let geladen = false;
        if (param.get('demo') === '1') { this.vorlage(); this.demo(); return; }
        try { const s = localStorage.getItem(SPEICHER); if (s) { this.uebernimm(JSON.parse(s)); geladen = true; } } catch (e) { /* egal */ }
        if (!geladen) this.vorlage();
    }

    // Eine kleine Beispielskizze (für Tests): ein Turm mit Leitern, Gegnern und Beute
    demo() {
        const b = (cx0, cy0, cx1, cy1, t) => { for (let x = cx0; x <= cx1; x++) for (let y = cy0; y <= cy1; y++) this.bloecke.set(x + ',' + y, t); };
        b(20, -9, 20, -1, 'stein'); b(30, -9, 30, -1, 'stein'); b(20, -9, 30, -9, 'stein'); b(21, -5, 29, -5, 'holz'); b(21, -4, 24, -4, 'holz');
        b(34, -3, 40, -1, 'erde'); b(37, -6, 40, -4, 'erde');
        const d = (o) => this.dinge.push({ id: this.naechsteId++, ...o });
        d({ t: 'leiter', cx: 22, cy0: -9, cy1: -1 }); d({ t: 'nahkaempfer', cx: 25, cy: -6 }); d({ t: 'fernkaempfer', cx: 28, cy: -10 }); d({ t: 'skelett', cx: 26, cy: -2 });
        d({ t: 'heilung', cx: 27, cy: -2 }); d({ t: 'munition', cx: 23, cy: -6 }); d({ t: 'fass', cx: 29, cy: -2 }); d({ t: 'fahne', cx: 14, cy: -1 }); d({ t: 'ziel', cx: 38, cy: -7 });
        d({ t: 'notiz', cx: 18, cy: -4, text: 'Tower challenge:\nclimb 3 floors' }); d({ t: 'bereich', cx0: 19, cy0: -10, cx1: 31, cy1: -1, text: 'Enemy tower' });
    }

    // ---------- Verlauf (rückgängig) ----------

    verlaufNeu() { this.verlaufListe = [JSON.stringify(this.serialisiere())]; this.verlaufPos = 0; }
    verlaufSpeichern() {
        this.verlaufListe = this.verlaufListe.slice(0, this.verlaufPos + 1);
        this.verlaufListe.push(JSON.stringify(this.serialisiere()));
        if (this.verlaufListe.length > 100) this.verlaufListe.shift();
        this.verlaufPos = this.verlaufListe.length - 1;
        this.speichereLokal();
    }
    rueckgaengig() { if (this.verlaufPos > 0) { this.verlaufPos--; this.uebernimm(JSON.parse(this.verlaufListe[this.verlaufPos])); this.speichereLokal(); this.zeigeMeldung('Undo'); } }
    wiederholen() { if (this.verlaufPos < this.verlaufListe.length - 1) { this.verlaufPos++; this.uebernimm(JSON.parse(this.verlaufListe[this.verlaufPos])); this.speichereLokal(); this.zeigeMeldung('Redo'); } }
    speichereLokal() { try { localStorage.setItem(SPEICHER, JSON.stringify(this.serialisiere())); } catch (e) { /* egal */ } }

    // ---------- Speichern und Laden ----------

    async speichern() {
        const text = JSON.stringify(this.serialisiere(), null, 1);
        this.speichereLokal();
        try {
            const antwort = await fetch(SERVER, { method: 'POST', body: text });
            if (!antwort.ok) throw new Error('Server');
            this.zeigeMeldung('Saved to editor/karte.json (Claude can read it now)', 4000);
        } catch (e) {
            const blob = new Blob([text], { type: 'application/json' }), a = document.createElement('a');
            a.href = URL.createObjectURL(blob); a.download = 'karte.json'; a.click();
            this.zeigeMeldung('Save server not running: downloaded karte.json instead (start: python3 speichern.py)', 6000);
        }
    }

    async laden() {
        try {
            const antwort = await fetch(SERVER);
            if (!antwort.ok) throw new Error('Server');
            this.uebernimm(await antwort.json()); this.verlaufSpeichern(); this.zeigeMeldung('Loaded editor/karte.json');
        } catch (e) { this.zeigeMeldung('Could not load from the save server (is speichern.py running?)', 5000); }
    }

    neu() {
        if (!window.confirm('Start a new empty map? (Undo brings the old one back.)')) return;
        this.vorlage(); this.verlaufSpeichern(); this.zeigeMeldung('New map');
    }

    zeigeMeldung(text, ms = 2200) { this.meldung = { text, bis: this.time.now + ms }; }

    // ---------- Oberfläche ----------

    baueOberflaeche() {
        this.knoepfe = [];            // { x, y, w, h, text, aktion, id? } in Bildschirmkoordinaten
        this.labels = [];
        const stil = { fontFamily: 'monospace', fontSize: '13px', color: '#e8f0e8' };
        const text = (x, y, t, extra = {}) => { const o = this.add.text(x, y, t, { ...stil, ...extra }).setDepth(5); this.labels.push(o); return o; };
        // Werkzeugliste links
        let y = KOPF + 6, letzteGruppe = '';
        this.werkzeugKnoepfe = [];
        for (const w of WERKZEUGE) {
            if (w.gruppe !== letzteGruppe) { letzteGruppe = w.gruppe; text(10, y, w.gruppe, { color: '#8fb0a0', fontSize: '11px' }); y += 15; }
            const taste = ZIFFERN.indexOf(w.id); const kurz = taste >= 0 ? String((taste + 1) % 10) : '';
            const k = { x: 6, y, w: BREITE_PANEL - 12, h: 23, id: w.id, farbe: w.farbe, aktion: () => this.waehle(w.id) };
            k.label = text(34, y + 4, (kurz ? '[' + kurz + '] ' : '') + w.name);
            this.knoepfe.push(k); this.werkzeugKnoepfe.push(k);
            y += 25;
        }
        // Knöpfe oben rechts
        const kopf = [['UNDO', () => this.rueckgaengig(), 60], ['REDO', () => this.wiederholen(), 60], ['SAVE', () => this.speichern(), 60], ['LOAD', () => this.laden(), 60],
            ['NEW', () => this.neu(), 52], ['LEVEL VIEW', () => this.zumLevelAnsehen(), 104], ['HELP', () => { this.hilfe = !this.hilfe; }, 56], ['MENU', () => this.zumMenue(), 56]];
        let kx = this.scale.width - 8;
        this.kopfKnoepfe = [];
        for (const [name, aktion, b] of kopf.reverse()) { kx -= b + 5; const k = { x: kx, y: 4, w: b, h: 25, aktion, kopf: true, name }; k.label = text(kx + 8, 10, name, { fontSize: '12px' }); this.knoepfe.push(k); this.kopfKnoepfe.push(k); }
        this.statusText = text(BREITE_PANEL + 10, 10, '', { fontSize: '13px', color: '#ffe9a0' });
        this.hilfeText = text(BREITE_PANEL + 14, KOPF + 12, [
            'MAP EDITOR - sketch your idea, then press SAVE so Claude can read it.',
            '',
            'Left mouse: paint (blocks/eraser: drag a rectangle)    Right mouse: erase',
            'Middle mouse or Space + drag: move view    Wheel: zoom    WASD / arrows: move',
            'Ctrl+Z undo   Ctrl+Y redo   Ctrl+S save   G grid   H help',
            'Keys 1-0 pick the first ten tools.   Ladders: drag from top to bottom.',
            'Notes and areas ask for a text. The goal helicopter and the start exist only once.',
        ].join('\n'), { backgroundColor: '#00000099', padding: { x: 10, y: 8 }, lineSpacing: 3 });
        this.tooltip = text(0, 0, '', { backgroundColor: '#000000cc', padding: { x: 6, y: 3 }, fontSize: '12px' }).setDepth(8).setVisible(false);
        this.scale.on('resize', () => { let x2 = this.scale.width - 8; for (const k of this.kopfKnoepfe) { x2 -= k.w + 5; k.x = x2; k.label.setX(x2 + 8); } });
    }

    waehle(id) { this.werkzeug = id; this.zieh = null; }

    zumMenue() { this.speichereLokal(); this.scene.start('MenuScene'); }
    zumLevelAnsehen() { this.speichereLokal(); this.registry.set('modus', 'viewer'); this.scene.start('GameScene'); }

    // ---------- Eingaben ----------

    baueEingaben() {
        const k = this.input.keyboard;
        this.tasten = k.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SHIFT,SPACE,CTRL,Z,Y,E,L,G,H');
        for (let i = 0; i < 10; i++) k.on('keydown-' + ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'ZERO'][i], () => { if (!this.tasten.CTRL.isDown) this.waehle(ZIFFERN[i]); });
        k.on('keydown-E', () => { if (!this.tasten.CTRL.isDown) this.waehle('radierer'); });
        k.on('keydown-L', () => this.waehle('leiter'));
        k.on('keydown-G', () => { this.gitter = !this.gitter; });
        k.on('keydown-H', () => { this.hilfe = !this.hilfe; });
        k.on('keydown-ESC', () => this.zumMenue());
        k.on('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.shiftKey ? this.wiederholen() : this.rueckgaengig(); e.preventDefault(); }
            else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { this.wiederholen(); e.preventDefault(); }
            else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { this.speichern(); e.preventDefault(); }
        });
        this.input.on('pointerdown', (p) => this.mausUnten(p));
        this.input.on('pointermove', (p) => this.mausBewegt(p));
        this.input.on('pointerup', (p) => this.mausOben(p));
        this.input.on('wheel', (p, o, dx, dy) => this.zoomeUm(p.x, p.y, dy > 0 ? 0.88 : 1.14));
    }

    zoomeUm(px, py, faktor) {
        const wx = this.camX + px / this.zoom, wy = this.camY + py / this.zoom;
        this.zoom = Phaser.Math.Clamp(this.zoom * faktor, 0.08, 2.5);
        this.camX = wx - px / this.zoom; this.camY = wy - py / this.zoom;
    }

    weltX(px) { return this.camX + px / this.zoom; }
    weltY(py) { return this.camY + py / this.zoom; }
    zelleX(px) { return Math.floor(this.weltX(px) / Z); }
    zelleY(py) { return Math.floor((this.weltY(py) - BODEN) / Z); }
    imPanel(p) { return p.x < BREITE_PANEL || p.y < KOPF; }

    mausUnten(p) {
        this.maus = { x: p.x, y: p.y };
        if (this.imPanel(p)) {
            if (p.button === 0) for (const k of this.knoepfe) if (p.x >= k.x && p.x <= k.x + k.w && p.y >= k.y && p.y <= k.y + k.h) { k.aktion(); return; }
            return;
        }
        const c = this.zelleX(p.x), r = this.zelleY(p.y);
        if (p.button === 1 || (p.button === 0 && this.tasten.SPACE.isDown)) { this.zieh = { art: 'schieben', sx: p.x, sy: p.y, camX: this.camX, camY: this.camY }; return; }
        if (p.button === 2) { this.zieh = { art: 'radieren', c0: c, r0: r, c1: c, r1: r, button: 2 }; this.radiereZelle(c, r); return; }
        if (p.button !== 0) return;
        const w = this.werkzeug;
        if (BLOCK_CODE[w] || w === 'radierer' || w === 'bereich') this.zieh = { art: 'rechteck', c0: c, r0: r, c1: c, r1: r };
        else if (w === 'leiter') this.zieh = { art: 'leiter', c0: c, r0: r, c1: c, r1: r };
        else if (w === 'notiz') this.setzeNotiz(c, r);
        else this.setzeDing(w, c, r);
    }

    mausBewegt(p) {
        this.maus = { x: p.x, y: p.y };
        const z = this.zieh;
        if (!z) return;
        if (z.art === 'schieben') { this.camX = z.camX - (p.x - z.sx) / this.zoom; this.camY = z.camY - (p.y - z.sy) / this.zoom; return; }
        const c = this.zelleX(p.x), r = this.zelleY(p.y);
        if (z.art === 'radieren') { this.radiereZelle(c, r); z.c1 = c; z.r1 = r; return; }
        z.c1 = c; z.r1 = r;
    }

    mausOben(p) {
        const z = this.zieh; this.zieh = null;
        if (!z) return;
        if (z.art === 'schieben') return;
        if (z.art === 'radieren') { this.verlaufSpeichern(); return; }
        const c0 = Math.min(z.c0, z.c1), c1 = Math.max(z.c0, z.c1), r0 = Math.min(z.r0, z.r1), r1 = Math.max(z.r0, z.r1);
        const w = this.werkzeug;
        if (z.art === 'rechteck') {
            if (BLOCK_CODE[w]) { for (let x = c0; x <= c1; x++) for (let y = r0; y <= r1; y++) this.bloecke.set(x + ',' + y, w); this.verlaufSpeichern(); }
            else if (w === 'radierer') { for (let x = c0; x <= c1; x++) for (let y = r0; y <= r1; y++) this.radiereZelle(x, y, true); this.verlaufSpeichern(); }
            else if (w === 'bereich') {
                const t = window.prompt('Label for this area (for example "Boss arena", "Sniper tower"):', '');
                if (t !== null) { this.dinge.push({ id: this.naechsteId++, t: 'bereich', cx0: c0, cy0: r0, cx1: c1, cy1: r1, text: t }); this.verlaufSpeichern(); }
            }
        } else if (z.art === 'leiter') {
            const cx = z.c0, a = Math.min(z.r0, z.r1), b = Math.max(z.r0, z.r1);
            this.dinge.push({ id: this.naechsteId++, t: 'leiter', cx, cy0: a, cy1: b }); this.verlaufSpeichern();
        }
    }

    setzeDing(t, cx, cy) {
        if (EINZIGARTIG.includes(t)) this.dinge = this.dinge.filter((d) => d.t !== t);
        else if (this.dinge.some((d) => d.t === t && d.cx === cx && d.cy === cy)) return;
        this.dinge.push({ id: this.naechsteId++, t, cx, cy });
        this.verlaufSpeichern();
    }

    setzeNotiz(cx, cy) {
        const t = window.prompt('Note text (use \\n for a new line is not needed: just type):', '');
        if (t) { this.dinge.push({ id: this.naechsteId++, t: 'notiz', cx, cy, text: t }); this.verlaufSpeichern(); }
    }

    // Radiert alles in einer Zelle: Block, Gegner, Gegenstände, Leitern, Notizen; Bereiche nur, wenn die Zelle auf ihrem Rand liegt.
    radiereZelle(cx, cy, stumm = false) {
        this.bloecke.delete(cx + ',' + cy);
        this.dinge = this.dinge.filter((d) => {
            if (d.t === 'leiter') return !(d.cx === cx && cy >= d.cy0 && cy <= d.cy1);
            if (d.t === 'bereich') return !((cx === d.cx0 || cx === d.cx1) && cy >= d.cy0 && cy <= d.cy1 || (cy === d.cy0 || cy === d.cy1) && cx >= d.cx0 && cx <= d.cx1);
            return !(d.cx === cx && d.cy === cy);
        });
        if (!stumm && !this.zieh) this.verlaufSpeichern();
    }

    // ---------- Zeichnen ----------

    update(zeit, delta) {
        const t = this.tasten, v = (t.SHIFT.isDown ? 28 : 12) * (delta / 16.7) / this.zoom;
        if (t.A.isDown || t.LEFT.isDown) this.camX -= v;
        if (t.D.isDown || t.RIGHT.isDown) this.camX += v;
        if (t.W.isDown || t.UP.isDown) this.camY -= v;
        if (t.S.isDown || t.DOWN.isDown) this.camY += v;
        this.zeichne();
    }

    // Zeichenhilfen: Weltkoordinaten -> Bildschirm
    rect(farbe, wx, wy, w, h, a = 1) { this.g.fillStyle(farbe, a).fillRect((wx - this.camX) * this.zoom, (wy - this.camY) * this.zoom, w * this.zoom, h * this.zoom); }

    zeichne() {
        const g = this.g, z = this.zoom, B = this.scale.width, H = this.scale.height;
        g.clear();
        const c0 = Math.floor(this.camX / Z) - 1, c1 = Math.ceil((this.camX + B / z) / Z) + 1;
        const r0 = Math.floor((this.camY - BODEN) / Z) - 1, r1 = Math.ceil((this.camY + H / z - BODEN) / Z) + 1;
        // Oberfläche als Hilfslinie und Himmelsband
        this.rect(0x1d4a40, this.camX, this.camY, B / z, BODEN - this.camY, 0.55);
        this.rect(0xe8e0a0, this.camX, BODEN - 1, B / z, 2, 0.25);
        // Blöcke (zeilenweise zusammengefasst)
        for (let r = r0; r <= r1; r++) {
            let lauf = null;
            const ende = (cx) => { if (lauf) { this.zeichneBlockLauf(lauf.t, lauf.c, cx - 1, r); lauf = null; } };
            for (let c = c0; c <= c1; c++) {
                const t = this.bloecke.get(c + ',' + r);
                if (t && lauf && lauf.t === t) continue;
                ende(c);
                if (t) lauf = { t, c };
            }
            ende(c1 + 1);
        }
        // Gitter
        if (this.gitter && z > 0.35) {
            g.lineStyle(1, 0xffffff, 0.07);
            for (let c = c0; c <= c1; c++) { const x = (c * Z - this.camX) * z; g.lineBetween(x, 0, x, H); }
            for (let r = r0; r <= r1; r++) { const y = (BODEN + r * Z - this.camY) * z; g.lineBetween(0, y, B, y); }
        }
        // Bereiche zuerst (liegen hinter den Dingen)
        const gesehen = new Set();
        for (const d of this.dinge) if (d.t === 'bereich') this.zeichneBereich(d, gesehen);
        for (const d of this.dinge) if (d.t === 'leiter') this.zeichneLeiter(d);
        for (const d of this.dinge) if (d.t !== 'bereich' && d.t !== 'leiter') this.zeichneDing(d, gesehen);
        // Vorschau und Zellmarkierung
        this.zeichneVorschau();
        for (const [id, o] of this.textObjekte) if (!gesehen.has(id)) { o.destroy(); this.textObjekte.delete(id); }
        // Oberfläche (Leiste und Panel)
        g.fillStyle(0x0c1a18, 0.96).fillRect(0, 0, BREITE_PANEL, H).fillRect(BREITE_PANEL, 0, B - BREITE_PANEL, KOPF);
        g.lineStyle(1, 0x3a5a50, 1).lineBetween(BREITE_PANEL, 0, BREITE_PANEL, H).lineBetween(0, KOPF, B, KOPF);
        for (const k of this.knoepfe) {
            const aktiv = k.id && k.id === this.werkzeug;
            g.fillStyle(aktiv ? 0x2f6a58 : (k.kopf ? 0x24433b : 0x15302a), 1).fillRect(k.x, k.y, k.w, k.h);
            g.lineStyle(aktiv ? 2 : 1, aktiv ? 0xfff0a0 : 0x3a5a50, 1).strokeRect(k.x, k.y, k.w, k.h);
            if (k.farbe !== undefined) g.fillStyle(k.farbe, 1).fillRect(k.x + 5, k.y + 5, 14, 13).lineStyle(1, 0x000000, 0.6).strokeRect(k.x + 5, k.y + 5, 14, 13);
        }
        this.hilfeText.setVisible(this.hilfe);
        // Status
        const c = this.zelleX(this.maus.x), r = this.zelleY(this.maus.y);
        const meld = this.meldung.bis > this.time.now ? '   |   ' + this.meldung.text : '';
        this.statusText.setText(`Tool: ${NAMEN[this.werkzeug]}   cell ${c}, ${r}   zoom ${(z * 100).toFixed(0)}%${meld}`);
        this.zeichneTooltip(c, r);
    }

    zeichneBlockLauf(t, c0, c1, r) {
        const x = c0 * Z, y = BODEN + r * Z, w = (c1 - c0 + 1) * Z;
        if (t === 'erde') {
            this.rect(0x5b4a35, x, y, w, Z);
            this.rect(0x4a3b2a, x, y + Z - 4, w, 4, 0.7);
            let oben = true; for (let c = c0; c <= c1; c++) if (this.bloecke.has(c + ',' + (r - 1))) { oben = false; break; }
            if (oben) this.rect(0x6aa032, x, y, w, 8);
            else for (let c = c0; c <= c1; c++) if (!this.bloecke.has(c + ',' + (r - 1))) this.rect(0x6aa032, c * Z, y, Z, 8);
        } else if (t === 'stein') {
            this.rect(0x5e5a55, x, y, w, Z);
            this.rect(0x75716a, x, y, w, 3, 0.8);
            this.rect(0x3f3c38, x, y + Z - 3, w, 3, 0.8);
        } else {
            this.rect(0x7a5a2e, x, y, w, 14);
            this.rect(0x9a7a3a, x, y, w, 4);
            for (let c = c0; c <= c1; c++) this.rect(0x4a331d, c * Z + Z - 2, y, 2, 14);
        }
    }

    zeichneLeiter(d) {
        const x = d.cx * Z, y0 = BODEN + d.cy0 * Z, y1 = BODEN + (d.cy1 + 1) * Z;
        this.rect(0x4a331d, x + 8, y0 - 24, 6, y1 - y0 + 24); this.rect(0x4a331d, x + Z - 14, y0 - 24, 6, y1 - y0 + 24);
        this.rect(0x8a6a3c, x + 9, y0 - 24, 3, y1 - y0 + 24); this.rect(0x8a6a3c, x + Z - 13, y0 - 24, 3, y1 - y0 + 24);
        for (let y = y1 - 14; y > y0 - 12; y -= 28) this.rect(0x8a6a38, x + 6, y, Z - 12, 4);
    }

    zeichneBereich(d, gesehen) {
        const x = d.cx0 * Z, y = BODEN + d.cy0 * Z, w = (d.cx1 - d.cx0 + 1) * Z, h = (d.cy1 - d.cy0 + 1) * Z;
        this.rect(0x66a0ff, x, y, w, h, 0.12);
        this.g.lineStyle(2, 0x8ac0ff, 0.9).strokeRect((x - this.camX) * this.zoom, (y - this.camY) * this.zoom, w * this.zoom, h * this.zoom);
        this.beschrifte(d, d.text || '(area)', (x - this.camX) * this.zoom + 6, (y - this.camY) * this.zoom + 4, '#bfe0ff', gesehen);
    }

    // Ein Text mit festem Objekt je Ding; wird jedes Bild neu platziert
    beschrifte(d, inhalt, sx, sy, farbe, gesehen) {
        gesehen.add(d.id);
        let o = this.textObjekte.get(d.id);
        if (!o) { o = this.add.text(0, 0, '', { fontFamily: 'monospace', fontSize: '13px', backgroundColor: '#000000aa', padding: { x: 4, y: 2 } }).setDepth(3); this.textObjekte.set(d.id, o); }
        if (o.text !== inhalt) o.setText(inhalt);
        o.setColor(farbe).setPosition(sx, sy);
        o.setVisible(sx + o.width > BREITE_PANEL && sx < this.scale.width && sy > KOPF - 12 && sy < this.scale.height);
    }

    zeichneFigur(fx, fy, farbe, kopf, breit = 32, hoch = 48) {
        this.rect(farbe, fx - breit / 2, fy - hoch, breit, hoch);
        this.rect(kopf, fx - breit / 2 + 4, fy - hoch, breit - 8, hoch * 0.3);
        this.rect(0x000000, fx - breit / 2 + 6, fy - hoch + hoch * 0.1, 5, 4, 0.8);
    }

    zeichneDing(d, gesehen) {
        const fx = d.cx * Z + Z / 2, fy = BODEN + (d.cy + 1) * Z;      // Fußpunkt: Mitte der Unterkante der Zelle
        switch (d.t) {
            case 'nahkaempfer': this.zeichneFigur(fx, fy, 0xc84a4a, 0x2a1a1a); this.rect(0x8a2a2a, fx + 8, fy - 30, 18, 5); break;
            case 'fernkaempfer': this.zeichneFigur(fx, fy, 0x9a6ad0, 0x20182a); this.rect(0x3a3a44, fx + 8, fy - 30, 24, 5); break;
            case 'skelett': this.zeichneFigur(fx, fy, 0xe8e4d0, 0xf4f0e0); this.rect(0x8a6a3a, fx + 12, fy - 40, 3, 30); this.rect(0x8a6a3a, fx + 12, fy - 40, 9, 3); break;
            case 'schwer': this.zeichneFigur(fx, fy, 0x8a2a2a, 0x1a1010, 44, 56); this.rect(0xffcc33, fx - 22, fy - 56, 44, 4); break;
            case 'boss': this.zeichneFigur(fx, fy, 0x3a9a5a, 0xe8e0c0, 100, 110); this.rect(0xff3030, fx - 26, fy - 92, 10, 8); this.rect(0xff3030, fx + 16, fy - 92, 10, 8); break;
            case 'heilung': this.rect(0xf0f0f0, fx - 12, fy - 24, 24, 20); this.rect(0xd03030, fx - 3, fy - 22, 6, 16); this.rect(0xd03030, fx - 9, fy - 16, 18, 6); break;
            case 'munition': this.rect(0xd8b040, fx - 12, fy - 22, 24, 18); this.rect(0x7a5a10, fx - 12, fy - 22, 24, 4); for (let i = 0; i < 3; i++) this.rect(0xfff0a0, fx - 8 + i * 8, fy - 18, 4, 10); break;
            case 'granate': this.rect(0x5a8a3a, fx - 9, fy - 22, 18, 18); this.rect(0x3a5a22, fx - 9, fy - 22, 18, 5); this.rect(0xcccccc, fx - 3, fy - 28, 6, 6); break;
            case 'schrotflinte': this.rect(0xb07a3a, fx - 18, fy - 14, 36, 8); this.rect(0x4a3a2a, fx - 18, fy - 14, 12, 12); this.rect(0x2a2a2a, fx + 4, fy - 14, 14, 4); break;
            case 'gewehr': this.rect(0x6a6a72, fx - 20, fy - 16, 40, 8); this.rect(0x3a3a40, fx - 20, fy - 16, 12, 12); this.rect(0x2a2a2a, fx + 6, fy - 12, 14, 3); break;
            case 'schwert': this.rect(0x9ad0f0, fx - 3, fy - 38, 6, 30); this.rect(0xc9a227, fx - 10, fy - 10, 20, 4); this.rect(0x6a4a2a, fx - 3, fy - 8, 6, 10); break;
            case 'fass': this.rect(0xb03a2a, fx - 13, fy - 38, 26, 38); this.rect(0x7a2218, fx - 13, fy - 30, 26, 3); this.rect(0x7a2218, fx - 13, fy - 12, 26, 3); this.rect(0xe8c030, fx - 5, fy - 24, 10, 10); break;
            case 'fahne': this.rect(0x2f3338, fx - 3, fy - 190, 6, 190); this.rect(0xe8c030, fx - 6, fy - 198, 12, 10); this.rect(0xc23a3a, fx + 3, fy - 188, 80, 50); this.rect(0xffffff, fx + 36, fy - 174, 8, 22, 0.9); this.rect(0xffffff, fx + 29, fy - 167, 22, 8, 0.9); break;
            case 'ziel': this.rect(0x66ff99, fx - 110, fy - 120, 220, 120, 0.2); this.g.lineStyle(2, 0x66ff99, 0.9).strokeRect((fx - 110 - this.camX) * this.zoom, (fy - 120 - this.camY) * this.zoom, 220 * this.zoom, 120 * this.zoom);
                this.rect(0x6b7a4a, fx - 45, fy - 40, 90, 40); this.rect(0x6b7a4a, fx + 45, fy - 32, 60, 10); this.rect(0x9fd3e6, fx - 40, fy - 32, 30, 20); this.rect(0x333333, fx - 80, fy - 62, 160, 6); break;
            case 'start': this.zeichneFigur(fx, fy, 0x66cc66, 0x2a4a2a); this.rect(0xffffff, fx - 8, fy - 62, 16, 6); this.rect(0xffffff, fx - 3, fy - 70, 6, 14); break;
            case 'notiz': this.rect(0xffe080, fx - 8, fy - 40, 16, 16, 0.9); this.rect(0x8a6a10, fx - 3, fy - 24, 6, 20, 0.9);
                this.beschrifte(d, d.text, (fx - this.camX) * this.zoom + 14 * this.zoom, (fy - 44 - this.camY) * this.zoom, '#ffe9a0', gesehen); break;
            default: this.rect(0xff00ff, fx - 10, fy - 20, 20, 20);
        }
    }

    zeichneVorschau() {
        const p = this.maus;
        if (this.imPanel({ x: p.x, y: p.y })) return;
        const c = this.zelleX(p.x), r = this.zelleY(p.y), w = this.werkzeug, g = this.g, zz = this.zoom;
        const z = this.zieh;
        const zelle = (cx0, cy0, cx1, cy1, farbe, a) => { g.fillStyle(farbe, a).fillRect((cx0 * Z - this.camX) * zz, (BODEN + cy0 * Z - this.camY) * zz, (cx1 - cx0 + 1) * Z * zz, (cy1 - cy0 + 1) * Z * zz); g.lineStyle(2, farbe, 0.9).strokeRect((cx0 * Z - this.camX) * zz, (BODEN + cy0 * Z - this.camY) * zz, (cx1 - cx0 + 1) * Z * zz, (cy1 - cy0 + 1) * Z * zz); };
        const info = WERKZEUGE.find((x) => x.id === w);
        if (z && z.art === 'rechteck') zelle(Math.min(z.c0, z.c1), Math.min(z.r0, z.r1), Math.max(z.c0, z.c1), Math.max(z.r0, z.r1), w === 'radierer' ? 0xff5050 : info.farbe, 0.3);
        else if (z && z.art === 'leiter') zelle(z.c0, Math.min(z.r0, z.r1), z.c0, Math.max(z.r0, z.r1), info.farbe, 0.3);
        else zelle(c, r, c, r, w === 'radierer' || this.zieh && this.zieh.button === 2 ? 0xff5050 : info.farbe, 0.25);
    }

    zeichneTooltip(c, r) {
        if (this.imPanel(this.maus)) { this.tooltip.setVisible(false); return; }
        let text = '';
        for (const d of this.dinge) {
            if (d.t === 'leiter' && d.cx === c && r >= d.cy0 && r <= d.cy1) text = NAMEN.leiter;
            else if (d.t !== 'leiter' && d.t !== 'bereich' && d.cx === c && d.cy === r) text = NAMEN[d.t] ?? d.t;
        }
        if (!text) { const b = this.bloecke.get(c + ',' + r); if (b) text = NAMEN[b] ?? b; }
        if (!text) { this.tooltip.setVisible(false); return; }
        this.tooltip.setText(text).setPosition(this.maus.x + 14, this.maus.y + 16).setVisible(true);
    }
}
