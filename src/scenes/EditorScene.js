// Der Karteneditor (nur auf localhost im Menü): Hier skizziert man selbst, wie ein Abschnitt oder eine Herausforderung aussehen soll.
// Man malt Erde, Stein und Holzböden, zieht Leitern, setzt Gegner, Gegenstände, Fahnen, den Hubschrauber und den Startpunkt, schreibt Notizen
// und zeichnet beschriftete Bereiche ("hier kommt der Boss"). Die Skizze wird als Datei editor/karte.json gespeichert, die Claude lesen und
// weiterverarbeiten kann.
//
// Das Raster ist dasselbe wie im Spiel: Eine Zelle ist 56 x 56 Pixel groß (cx von links nach rechts, cy von der Oberfläche aus: 0 = die Zelle
// direkt unter der Oberfläche, negative Zahlen = darüber). Alles wird in diesem Zellraster gespeichert.
//
// Wichtige Werkzeuge:
//   Auswahl (V)    Ein Rechteck aufziehen: Der Bereich bleibt markiert. Dann Entf = löschen, Strg+C/X/V = kopieren/ausschneiden/einfügen,
//                  den markierten Bereich mit der Maus verschieben (Strg beim Loslassen = kopieren), "Fill" füllt ihn mit dem letzten Block.
//   Radierer (E)   Ein Pinsel zum Wegradieren (Größe 1, 3 oder 5 Zellen). Die rechte Maustaste radiert immer.
//   Blöcke         Rechteck aufziehen (Standard) oder frei malen (Knopf DRAW oder Taste B).
const Z = 56;               // Zellgröße
const BODEN = 760;          // Höhe der Oberfläche im Spiel
const SERVER = 'http://localhost:8010/karte';   // kleiner Speicherserver (speichern.py); ohne ihn wird die Datei heruntergeladen
const SPEICHER = 'brokrun_editor_karte';

const BREITE_PANEL = 214;
const KOPF = 34;
const FUSS = 28;            // Hinweisleiste unten

// Alle Werkzeuge: id, Beschriftung, Gruppe, Farbe des Symbols, Hilfetext
const WERKZEUGE = [
    { id: 'auswahl', name: 'Select area', gruppe: 'SELECT', farbe: 0xffd860, tipp: 'Drag a rectangle to select an area. Then: Delete = remove, drag inside = move, Ctrl+C / X / V = copy / cut / paste.' },
    { id: 'erde', name: 'Earth block', gruppe: 'BLOCKS', farbe: 0x7a5a3c, tipp: 'Drag a rectangle to fill it with earth (or switch to freehand with the DRAW button / B).' },
    { id: 'stein', name: 'Stone block', gruppe: 'BLOCKS', farbe: 0x7a7670, tipp: 'Drag a rectangle to fill it with stone.' },
    { id: 'holz', name: 'Wooden floor', gruppe: 'BLOCKS', farbe: 0x9a7a3a, tipp: 'Thin wooden floor that you can stand on (good for floors inside buildings).' },
    { id: 'radierer', name: 'Eraser brush', gruppe: 'BLOCKS', farbe: 0xe06060, tipp: 'Paint over things to erase them. Choose the brush SIZE below. To erase a big area: use Select area + Delete.' },
    { id: 'leiter', name: 'Ladder (drag)', gruppe: 'CLIMB', farbe: 0xc9a05a, tipp: 'Drag from the top to the bottom of the ladder (one cell wide).' },
    { id: 'nahkaempfer', name: 'Soldier (melee)', gruppe: 'ENEMIES', farbe: 0xc84a4a, tipp: 'Click to place a soldier who runs at you.' },
    { id: 'fernkaempfer', name: 'Gunner', gruppe: 'ENEMIES', farbe: 0x9a6ad0, tipp: 'Click to place a gunner who shoots from a distance.' },
    { id: 'skelett', name: 'Skeleton archer', gruppe: 'ENEMIES', farbe: 0xe8e4d0, tipp: 'Click to place a skeleton with a bow.' },
    { id: 'schwer', name: 'Heavy guard', gruppe: 'ENEMIES', farbe: 0x8a2a2a, tipp: 'Click to place a tough guard with lots of health.' },
    { id: 'boss', name: 'Boss', gruppe: 'ENEMIES', farbe: 0x3a9a5a, tipp: 'Click to place the boss.' },
    { id: 'heilung', name: 'Medkit', gruppe: 'ITEMS', farbe: 0xf0f0f0, tipp: 'Click to place a medkit.' },
    { id: 'munition', name: 'Ammo', gruppe: 'ITEMS', farbe: 0xd8b040, tipp: 'Click to place ammo.' },
    { id: 'granate', name: 'Grenade', gruppe: 'ITEMS', farbe: 0x5a8a3a, tipp: 'Click to place a grenade pickup.' },
    { id: 'schrotflinte', name: 'Shotgun', gruppe: 'ITEMS', farbe: 0xb07a3a, tipp: 'Click to place a shotgun pickup.' },
    { id: 'gewehr', name: 'Assault rifle', gruppe: 'ITEMS', farbe: 0x6a6a72, tipp: 'Click to place an assault rifle pickup.' },
    { id: 'schwert', name: 'Sword', gruppe: 'ITEMS', farbe: 0x9ad0f0, tipp: 'Click to place a sword pickup.' },
    { id: 'fass', name: 'Explosive barrel', gruppe: 'ITEMS', farbe: 0xc03a2a, tipp: 'Click to place an explosive barrel.' },
    { id: 'fahne', name: 'Checkpoint flag', gruppe: 'MARKS', farbe: 0xd03030, tipp: 'Click to place a checkpoint flag (you respawn there).' },
    { id: 'ziel', name: 'Helicopter (goal)', gruppe: 'MARKS', farbe: 0x66ff99, tipp: 'Click to place the goal. There is only one: placing it again moves it.' },
    { id: 'start', name: 'Player start', gruppe: 'MARKS', farbe: 0x66cc66, tipp: 'Click to place the start point. There is only one.' },
    { id: 'notiz', name: 'Note (text)', gruppe: 'MARKS', farbe: 0xffe080, tipp: 'Click to write a note on the map (for example "hard part: snipers").' },
    { id: 'bereich', name: 'Area (drag + label)', gruppe: 'MARKS', farbe: 0x66a0ff, tipp: 'Drag a rectangle and give it a name (for example "Boss arena").' },
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
        this.mini = this.add.graphics().setDepth(2);              // Übersichtskarte (nur bei Änderungen neu gemalt)
        this.g2 = this.add.graphics().setDepth(3);                // Sucherrahmen der Übersichtskarte (liegt über deren Inhalt)
        this.bloecke = new Map();                   // "cx,cy" -> 'erde' | 'stein' | 'holz'
        this.dinge = [];                            // { id, t, cx, cy, ... }
        this.naechsteId = 1;
        this.werkzeug = 'erde';
        this.letzterBlock = 'erde';
        this.groesse = 1;                           // Pinselgröße (Zellen) für Radierer und freies Malen
        this.frei = false;                          // false = Rechteck aufziehen, true = frei malen
        this.camX = -300; this.camY = BODEN - 380; this.zoom = 0.8;
        this.gitter = true; this.hilfe = true;
        this.zieh = null;
        this.auswahl = null;                        // markierter Bereich { c0, r0, c1, r1 }
        this.zwischen = null;                       // Zwischenablage { bloecke, dinge, w, h }
        this.einfuegen = false;                     // Einfügemodus (Vorschau am Mauszeiger)
        this.verlaufListe = []; this.verlaufPos = -1;
        this.textObjekte = new Map();
        this.lineal = [];                           // Beschriftung der Zellnummern am Rand (Lineal)
        this.meldung = { text: '', bis: 0 };
        this.maus = { x: 0, y: 0 };
        this.miniGrenzen = null; this.miniDirty = true;

        const param = new URLSearchParams(window.location.search);
        this.ladeStart(param);
        this.baueOberflaeche();
        this.baueEingaben();
        this.verlaufNeu();
        window.__editor = this;                     // Testhilfe

        if (param.get('ansicht')) { const [a, b, c] = param.get('ansicht').split(',').map(Number); this.camX = a * Z - 100; this.camY = BODEN + b * Z - 300; this.zoom = c || this.zoom; }
        if (param.get('hilfe') === '0') this.hilfe = false;
        if (param.get('auswahl')) { const [a, b, c, d] = param.get('auswahl').split(',').map(Number); this.auswahl = { c0: a, r0: b, c1: c, r1: d }; }
        if (param.get('shot')) this.time.delayedCall(2500, () => this.game.renderer.snapshot((bild) => fetch('http://localhost:8002/', { method: 'POST', body: bild.src })));
        this.events.once('shutdown', () => { this.speichereLokal(); this.textObjekte.forEach((t) => t.destroy()); });
    }

    // ---------- Daten ----------

    vorlage() {
        this.bloecke.clear(); this.dinge = [];
        for (let cx = -8; cx < 90; cx++) for (let cy = 0; cy < 4; cy++) this.bloecke.set(cx + ',' + cy, 'erde');
        this.dinge.push({ id: this.naechsteId++, t: 'start', cx: 1, cy: -1 });
        this.miniDirty = true;
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
        this.miniDirty = true;
    }

    ladeStart(param) {
        let geladen = false;
        if (param.get('demo') === '1') { this.vorlage(); this.demo(); return; }
        if (param.get('datei') === '1') { this.vorlage(); fetch(SERVER).then((a) => a.json()).then((d) => { this.uebernimm(d); this.miniDirty = true; }); return; }
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
        this.miniDirty = true;
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
            this.uebernimm(await antwort.json()); this.auswahl = null; this.verlaufSpeichern(); this.zeigeMeldung('Loaded editor/karte.json');
        } catch (e) { this.zeigeMeldung('Could not load from the save server (is speichern.py running?)', 5000); }
    }

    neu() {
        if (!window.confirm('Start a new empty map? (Undo brings the old one back.)')) return;
        this.vorlage(); this.auswahl = null; this.verlaufSpeichern(); this.zeigeMeldung('New map');
    }

    zeigeMeldung(text, ms = 2200) { this.meldung = { text, bis: this.time.now + ms }; }

    // ---------- Oberfläche ----------

    baueOberflaeche() {
        this.knoepfe = [];            // { x, y, w, h, aktion, ... } in Bildschirmkoordinaten
        this.kopfKnoepfe = [];
        const stil = { fontFamily: 'monospace', fontSize: '13px', color: '#e8f0e8' };
        const text = (x, y, t, extra = {}) => this.add.text(x, y, t, { ...stil, ...extra }).setDepth(5);
        // Werkzeugliste links
        let y = KOPF + 5, letzteGruppe = '';
        for (const w of WERKZEUGE) {
            if (w.gruppe !== letzteGruppe) { letzteGruppe = w.gruppe; text(10, y, w.gruppe, { color: '#8fb0a0', fontSize: '11px' }); y += 14; }
            const taste = ZIFFERN.indexOf(w.id); const kurz = taste >= 0 ? String((taste + 1) % 10) : (w.id === 'auswahl' ? 'V' : '');
            const k = { x: 6, y, w: BREITE_PANEL - 12, h: 21, id: w.id, farbe: w.farbe, tipp: w.tipp, aktion: () => this.waehle(w.id) };
            k.label = text(34, y + 3, (kurz ? '[' + kurz + '] ' : '') + w.name);
            this.knoepfe.push(k);
            y += 22;
        }
        // Pinselgröße und Malmodus (unten im Panel)
        const H = this.scale.height;
        this.sizeLabel = text(10, H - 80, 'BRUSH SIZE', { color: '#8fb0a0', fontSize: '11px' });
        this.sizeKnoepfe = [1, 3, 5].map((n, i) => {
            const k = { x: 6 + i * 66, y: H - 64, w: 62, h: 22, groesse: n, tipp: `Brush size ${n} x ${n} cells (for the eraser and freehand drawing).`, aktion: () => { this.groesse = n; } };
            k.label = text(k.x + 12, k.y + 4, `${n} x ${n}`); this.knoepfe.push(k); return k;
        });
        this.modusKnopf = { x: 6, y: H - 36, w: BREITE_PANEL - 12, h: 24, tipp: 'Blocks: draw a rectangle or paint freely. Key B switches.', aktion: () => { this.frei = !this.frei; } };
        this.modusKnopf.label = text(14, H - 31, ''); this.knoepfe.push(this.modusKnopf);
        // Knöpfe oben rechts
        const kopf = [['UNDO', () => this.rueckgaengig(), 56, 'Undo the last action (Ctrl+Z)'], ['REDO', () => this.wiederholen(), 56, 'Redo (Ctrl+Y)'], ['SAVE', () => this.speichern(), 56, 'Save so Claude can read the map (Ctrl+S)'],
            ['LOAD', () => this.laden(), 56, 'Load the last saved map from editor/karte.json'], ['NEW', () => this.neu(), 48, 'Start a new empty map'],
            ['FIT', () => this.passeAn(), 48, 'Show the whole map (key F)'], ['LEVEL VIEW', () => this.zumLevelAnsehen(), 100, 'Look at the real game level for comparison'],
            ['HELP', () => { this.hilfe = !this.hilfe; }, 52, 'Show or hide the help (key H)'], ['MENU', () => this.zumMenue(), 52, 'Back to the menu (your map stays saved in the browser)']];
        let kx = this.scale.width - 8;
        for (const [name, aktion, b, tipp] of kopf.reverse()) { kx -= b + 4; const k = { x: kx, y: 4, w: b, h: 25, aktion, kopf: true, name, tipp }; k.label = text(kx + 7, 10, name, { fontSize: '12px' }); this.knoepfe.push(k); this.kopfKnoepfe.push(k); }
        this.statusText = text(BREITE_PANEL + 10, 10, '', { fontSize: '13px', color: '#ffe9a0' });
        this.hinweisText = text(BREITE_PANEL + 10, H - FUSS + 6, '', { fontSize: '13px', color: '#c8e8d8' }).setDepth(6);
        this.hilfeText = text(BREITE_PANEL + 14, KOPF + 12, [
            'MAP EDITOR - sketch your idea, then press SAVE so Claude can read it.',
            '',
            'Left mouse: paint / place        Right mouse: erase        Middle mouse or Space + drag: move the view',
            'Wheel: zoom        WASD / arrows: move        F: show everything        G: grid        H: this help',
            'SELECT AREA (V): drag a rectangle, then Delete removes it, dragging inside moves it,',
            '                 Ctrl+C / Ctrl+X / Ctrl+V copy / cut / paste, Esc clears the selection.',
            'Ctrl+Z undo   Ctrl+Y redo   Ctrl+S save   Ctrl+A select everything   Keys 1-0 pick the first ten tools.',
            'Everything is also remembered in your browser automatically.',
        ].join('\n'), { backgroundColor: '#000000aa', padding: { x: 10, y: 8 }, lineSpacing: 3 }).setDepth(4);
        this.tooltip = text(0, 0, '', { backgroundColor: '#000000cc', padding: { x: 6, y: 3 }, fontSize: '12px' }).setDepth(8).setVisible(false);
        this.auswahlKnoepfe = [['DELETE', 'Del', () => this.loescheAuswahl()], ['COPY', '', () => this.kopiere(false)], ['CUT', '', () => this.kopiere(true)], ['FILL', '', () => this.fuelleAuswahl()]].map(([name, , aktion]) => {
            const k = { w: name === 'DELETE' ? 62 : 48, h: 22, name, aktion, tipp: { DELETE: 'Remove everything in the selection (key Delete)', COPY: 'Copy the selection (Ctrl+C), then paste with Ctrl+V', CUT: 'Cut the selection (Ctrl+X)', FILL: 'Fill the selection with the last used block type' }[name], auswahl: true, x: -999, y: -999 };
            k.label = text(0, 0, name, { fontSize: '12px' }).setDepth(7).setVisible(false); return k;
        });
        this.knoepfe.push(...this.auswahlKnoepfe);
        this.scale.on('resize', () => this.ordneNeu());
    }

    ordneNeu() {
        const B = this.scale.width, H = this.scale.height;
        let x2 = B - 8; for (const k of this.kopfKnoepfe) { x2 -= k.w + 4; k.x = x2; k.label.setX(x2 + 7); }
        this.sizeLabel.setY(H - 80); for (const k of this.sizeKnoepfe) { k.y = H - 64; k.label.setY(k.y + 4); }
        this.modusKnopf.y = H - 36; this.modusKnopf.label.setY(H - 31); this.hinweisText.setY(H - FUSS + 6);
    }

    waehle(id) {
        this.werkzeug = id; this.zieh = null; this.einfuegen = false;
        if (BLOCK_CODE[id]) this.letzterBlock = id;
    }

    zumMenue() { this.speichereLokal(); this.scene.start('MenuScene'); }
    zumLevelAnsehen() { this.speichereLokal(); this.registry.set('modus', 'viewer'); this.scene.start('GameScene'); }

    // Zeigt alles, was gezeichnet wurde
    passeAn() {
        const gr = this.grenzen(false);
        const B = this.scale.width - BREITE_PANEL, H = this.scale.height - KOPF - FUSS;
        const w = (gr.c1 - gr.c0 + 3) * Z, h = (gr.r1 - gr.r0 + 3) * Z;
        this.zoom = Phaser.Math.Clamp(Math.min(B / w, H / h), 0.08, 1.5);
        this.camX = (gr.c0 - 1) * Z - (BREITE_PANEL + (B - w * this.zoom) / 2) / this.zoom;
        this.camY = BODEN + (gr.r0 - 1) * Z - (KOPF + (H - h * this.zoom) / 2) / this.zoom;
    }

    // Umgebendes Rechteck (in Zellen) aller Blöcke und Dinge; mitBoden = auch ein Stück Erde unterhalb einbeziehen
    grenzen(mitBoden) {
        let c0 = 1e9, c1 = -1e9, r0 = 1e9, r1 = -1e9;
        const f = (c, r) => { c0 = Math.min(c0, c); c1 = Math.max(c1, c); r0 = Math.min(r0, r); r1 = Math.max(r1, r); };
        for (const k of this.bloecke.keys()) { const i = k.indexOf(','); f(Number(k.slice(0, i)), Number(k.slice(i + 1))); }
        for (const d of this.dinge) {
            if (d.t === 'leiter') { f(d.cx, d.cy0); f(d.cx, d.cy1); }
            else if (d.t === 'bereich') { f(d.cx0, d.cy0); f(d.cx1, d.cy1); } else f(d.cx, d.cy);
        }
        if (c0 > c1) { c0 = 0; c1 = 20; r0 = -8; r1 = 4; }
        if (!mitBoden) r1 = Math.min(r1, Math.max(r0 + 6, 6));
        return { c0, c1, r0, r1 };
    }

    // ---------- Auswahl, Kopieren, Verschieben ----------

    // Gehört das Ding zum Rechteck? Einzelne Dinge: wenn ihre Zelle darin liegt. Leitern: wenn sie die Spalte schneiden. Bereiche: nur, wenn ganz darin.
    inRechteck(d, a) {
        const innen = (c, r) => c >= a.c0 && c <= a.c1 && r >= a.r0 && r <= a.r1;
        if (d.t === 'leiter') return d.cx >= a.c0 && d.cx <= a.c1 && d.cy1 >= a.r0 && d.cy0 <= a.r1;
        if (d.t === 'bereich') return d.cx0 >= a.c0 && d.cx1 <= a.c1 && d.cy0 >= a.r0 && d.cy1 <= a.r1;
        return innen(d.cx, d.cy);
    }

    loescheRechteck(a) {
        for (let x = a.c0; x <= a.c1; x++) for (let y = a.r0; y <= a.r1; y++) this.bloecke.delete(x + ',' + y);
        this.dinge = this.dinge.filter((d) => !this.inRechteck(d, a));
    }

    loescheAuswahl() {
        const a = this.auswahl; if (!a) return;
        const n = this.zaehle(a);
        this.loescheRechteck(a); this.verlaufSpeichern(); this.zeigeMeldung(`Deleted ${n.b} blocks and ${n.d} objects`);
    }

    zaehle(a) {
        let b = 0; for (let x = a.c0; x <= a.c1; x++) for (let y = a.r0; y <= a.r1; y++) if (this.bloecke.has(x + ',' + y)) b++;
        return { b, d: this.dinge.filter((d) => this.inRechteck(d, a)).length };
    }

    fuelleAuswahl() {
        const a = this.auswahl; if (!a) return;
        for (let x = a.c0; x <= a.c1; x++) for (let y = a.r0; y <= a.r1; y++) this.bloecke.set(x + ',' + y, this.letzterBlock);
        this.verlaufSpeichern(); this.zeigeMeldung(`Filled with ${NAMEN[this.letzterBlock].toLowerCase()}`);
    }

    // Inhalt eines Rechtecks als Kopie (Zellen relativ zur linken oberen Ecke)
    inhalt(a) {
        const bloecke = [];
        for (let x = a.c0; x <= a.c1; x++) for (let y = a.r0; y <= a.r1; y++) { const t = this.bloecke.get(x + ',' + y); if (t) bloecke.push([x - a.c0, y - a.r0, t]); }
        const dinge = this.dinge.filter((d) => this.inRechteck(d, a)).map((d) => this.verschobenes(d, -a.c0, -a.r0));
        return { bloecke, dinge, w: a.c1 - a.c0 + 1, h: a.r1 - a.r0 + 1 };
    }

    verschobenes(d, dx, dy) {
        const o = { ...d }; delete o.id;
        if (o.t === 'leiter') { o.cx += dx; o.cy0 += dy; o.cy1 += dy; }
        else if (o.t === 'bereich') { o.cx0 += dx; o.cx1 += dx; o.cy0 += dy; o.cy1 += dy; }
        else { o.cx += dx; o.cy += dy; }
        return o;
    }

    setzeInhalt(inh, c, r) {
        for (const [dx, dy, t] of inh.bloecke) this.bloecke.set((c + dx) + ',' + (r + dy), t);
        for (const d of inh.dinge) {
            if (EINZIGARTIG.includes(d.t)) this.dinge = this.dinge.filter((x) => x.t !== d.t);
            this.dinge.push({ id: this.naechsteId++, ...this.verschobenes(d, c, r) });
        }
    }

    kopiere(ausschneiden) {
        const a = this.auswahl; if (!a) { this.zeigeMeldung('Select an area first (tool V)'); return; }
        this.zwischen = this.inhalt(a);
        if (ausschneiden) { this.loescheRechteck(a); this.verlaufSpeichern(); this.zeigeMeldung('Cut. Paste with Ctrl+V'); } else this.zeigeMeldung('Copied. Paste with Ctrl+V');
    }

    einfuegeModus() {
        if (!this.zwischen) { this.zeigeMeldung('Nothing copied yet: select an area and press Ctrl+C'); return; }
        this.einfuegen = true; this.zeigeMeldung('Click to paste (several times if you like). Esc ends.');
    }

    alleAuswaehlen() { const g = this.grenzen(true); this.auswahl = { c0: g.c0, r0: g.r0, c1: g.c1, r1: g.r1 }; this.werkzeug = 'auswahl'; }

    // ---------- Eingaben ----------

    baueEingaben() {
        const k = this.input.keyboard;
        this.tasten = k.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SHIFT,SPACE,CTRL');
        for (let i = 0; i < 10; i++) k.on('keydown-' + ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'ZERO'][i], (e) => { if (!e.ctrlKey && !e.metaKey) this.waehle(ZIFFERN[i]); });
        k.on('keydown', (e) => {
            const ctrl = e.ctrlKey || e.metaKey, taste = e.key.toLowerCase();
            if (ctrl && taste === 'z') { e.shiftKey ? this.wiederholen() : this.rueckgaengig(); e.preventDefault(); }
            else if (ctrl && taste === 'y') { this.wiederholen(); e.preventDefault(); }
            else if (ctrl && taste === 's') { this.speichern(); e.preventDefault(); }
            else if (ctrl && taste === 'c') { this.kopiere(false); e.preventDefault(); }
            else if (ctrl && taste === 'x') { this.kopiere(true); e.preventDefault(); }
            else if (ctrl && taste === 'v') { this.einfuegeModus(); e.preventDefault(); }
            else if (ctrl && taste === 'a') { this.alleAuswaehlen(); e.preventDefault(); }
            else if (!ctrl && (taste === 'delete' || taste === 'backspace')) { this.loescheAuswahl(); e.preventDefault(); }
            else if (!ctrl && taste === 'e') this.waehle('radierer');
            else if (!ctrl && taste === 'v') this.waehle('auswahl');
            else if (!ctrl && taste === 'l') this.waehle('leiter');
            else if (!ctrl && taste === 'b') { this.frei = !this.frei; this.zeigeMeldung(this.frei ? 'Freehand drawing' : 'Rectangle drawing'); }
            else if (!ctrl && taste === 'g') this.gitter = !this.gitter;
            else if (!ctrl && taste === 'h') this.hilfe = !this.hilfe;
            else if (!ctrl && taste === 'f') this.passeAn();
            else if (!ctrl && (taste === '[' || taste === '-')) this.groesse = this.groesse === 5 ? 3 : 1;
            else if (!ctrl && (taste === ']' || taste === '=' || taste === '+')) this.groesse = this.groesse === 1 ? 3 : 5;
            else if (taste === 'escape') {
                if (this.einfuegen) this.einfuegen = false;
                else if (this.auswahl) this.auswahl = null;
                else if (this.zieh) this.zieh = null;
                else this.zumMenue();
            }
        });
        this.input.on('pointerdown', (p) => this.mausUnten(p));
        this.input.on('pointermove', (p) => this.mausBewegt(p));
        this.input.on('pointerup', (p) => this.mausOben(p));
        this.input.on('wheel', (p, o, dx, dy) => { if (!this.imPanel(p)) this.zoomeUm(p.x, p.y, dy > 0 ? 0.88 : 1.14); });
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
    imPanel(p) { return p.x < BREITE_PANEL || p.y < KOPF || p.y > this.scale.height - FUSS; }
    miniRect() { const B = this.scale.width, H = this.scale.height; return { x: B - 244, y: H - FUSS - 92, w: 236, h: 84 }; }
    imMini(p) { const m = this.miniRect(); return p.x >= m.x && p.x <= m.x + m.w && p.y >= m.y && p.y <= m.y + m.h; }
    trifftKnopf(p, k) { return p.x >= k.x && p.x <= k.x + k.w && p.y >= k.y && p.y <= k.y + k.h; }
    inAuswahl(c, r) { const a = this.auswahl; return !!a && c >= a.c0 && c <= a.c1 && r >= a.r0 && r <= a.r1; }

    // Die Zellen eines Pinselstrichs (Größe 1, 3 oder 5), mittig um die Zelle (c, r)
    pinsel(c, r) {
        const h = Math.floor(this.groesse / 2), liste = [];
        for (let x = c - h; x <= c + h; x++) for (let y = r - h; y <= r + h; y++) liste.push([x, y]);
        return liste;
    }

    mausUnten(p) {
        this.maus = { x: p.x, y: p.y };
        if (p.button === 0) {
            for (const k of this.knoepfe) { if (k.auswahl && !this.auswahl) continue; if (this.trifftKnopf(p, k)) { k.aktion(); return; } }
            if (this.imMini(p)) { this.springeMini(p); this.zieh = { art: 'mini' }; return; }
        }
        if (this.imPanel(p)) return;
        const c = this.zelleX(p.x), r = this.zelleY(p.y);
        if (p.button === 1 || (p.button === 0 && this.tasten.SPACE.isDown)) { this.zieh = { art: 'schieben', sx: p.x, sy: p.y, camX: this.camX, camY: this.camY }; return; }
        if (p.button === 2) { this.zieh = { art: 'radieren', c0: c, r0: r, c1: c, r1: r, button: 2, geaendert: false }; this.radierePinsel(c, r); return; }
        if (p.button !== 0) return;
        if (this.einfuegen) { this.setzeInhalt(this.zwischen, c, r); this.auswahl = { c0: c, r0: r, c1: c + this.zwischen.w - 1, r1: r + this.zwischen.h - 1 }; this.verlaufSpeichern(); return; }
        const w = this.werkzeug;
        if (w === 'auswahl') {
            if (this.inAuswahl(c, r)) this.zieh = { art: 'bewegen', c0: c, r0: r, c1: c, r1: r };
            else { this.auswahl = null; this.zieh = { art: 'auswahl', c0: c, r0: r, c1: c, r1: r }; }
        } else if (w === 'radierer') { this.zieh = { art: 'radieren', c0: c, r0: r, c1: c, r1: r, button: 0, geaendert: false }; this.radierePinsel(c, r); }
        else if (BLOCK_CODE[w]) {
            if (this.frei) { this.zieh = { art: 'malen', c0: c, r0: r, c1: c, r1: r }; this.malePinsel(c, r); }
            else this.zieh = { art: 'rechteck', c0: c, r0: r, c1: c, r1: r };
        } else if (w === 'bereich') this.zieh = { art: 'rechteck', c0: c, r0: r, c1: c, r1: r };
        else if (w === 'leiter') this.zieh = { art: 'leiter', c0: c, r0: r, c1: c, r1: r };
        else if (w === 'notiz') this.setzeNotiz(c, r);
        else this.setzeDing(w, c, r);
    }

    mausBewegt(p) {
        this.maus = { x: p.x, y: p.y };
        const z = this.zieh;
        if (!z) return;
        if (z.art === 'schieben') { this.camX = z.camX - (p.x - z.sx) / this.zoom; this.camY = z.camY - (p.y - z.sy) / this.zoom; return; }
        if (z.art === 'mini') { this.springeMini(p); return; }
        const c = this.zelleX(p.x), r = this.zelleY(p.y);
        if (z.art === 'radieren' || z.art === 'malen') {
            // Zwischenzellen füllen, damit auch bei schnellen Mausbewegungen keine Lücken entstehen
            const n = Math.max(Math.abs(c - z.c1), Math.abs(r - z.r1));
            for (let i = 1; i <= n; i++) {
                const cc = Math.round(z.c1 + (c - z.c1) * i / n), rr = Math.round(z.r1 + (r - z.r1) * i / n);
                if (z.art === 'radieren') this.radierePinsel(cc, rr); else this.malePinsel(cc, rr);
            }
        }
        z.c1 = c; z.r1 = r;
    }

    mausOben(p) {
        const z = this.zieh; this.zieh = null;
        if (!z || z.art === 'schieben' || z.art === 'mini') return;
        if (z.art === 'radieren') { if (z.geaendert) this.verlaufSpeichern(); return; }
        if (z.art === 'malen') { this.verlaufSpeichern(); return; }
        const c0 = Math.min(z.c0, z.c1), c1 = Math.max(z.c0, z.c1), r0 = Math.min(z.r0, z.r1), r1 = Math.max(z.r0, z.r1);
        const w = this.werkzeug;
        if (z.art === 'auswahl') {
            if (c0 === c1 && r0 === r1) { this.auswahl = null; return; }              // nur geklickt: Auswahl aufheben
            this.auswahl = { c0, r0, c1, r1 };
            const n = this.zaehle(this.auswahl); this.zeigeMeldung(`Selected ${c1 - c0 + 1} x ${r1 - r0 + 1} cells (${n.b} blocks, ${n.d} objects). Press Delete to remove.`, 4000);
        } else if (z.art === 'bewegen') {
            const dx = z.c1 - z.c0, dy = z.r1 - z.r0;
            if (!dx && !dy) return;
            const a = this.auswahl, inh = this.inhalt(a), kopie = this.tasten.CTRL.isDown || p.event && (p.event.ctrlKey || p.event.metaKey);
            if (!kopie) this.loescheRechteck(a);
            this.setzeInhalt(inh, a.c0 + dx, a.r0 + dy);
            this.auswahl = { c0: a.c0 + dx, r0: a.r0 + dy, c1: a.c1 + dx, r1: a.r1 + dy };
            this.verlaufSpeichern(); this.zeigeMeldung(kopie ? 'Copied' : 'Moved');
        } else if (z.art === 'rechteck') {
            if (BLOCK_CODE[w]) { for (let x = c0; x <= c1; x++) for (let y = r0; y <= r1; y++) this.bloecke.set(x + ',' + y, w); this.verlaufSpeichern(); }
            else if (w === 'bereich') {
                const t = window.prompt('Label for this area (for example "Boss arena", "Sniper tower"):', '');
                if (t !== null) { this.dinge.push({ id: this.naechsteId++, t: 'bereich', cx0: c0, cy0: r0, cx1: c1, cy1: r1, text: t }); this.verlaufSpeichern(); }
            }
        } else if (z.art === 'leiter') {
            this.dinge.push({ id: this.naechsteId++, t: 'leiter', cx: z.c0, cy0: Math.min(z.r0, z.r1), cy1: Math.max(z.r0, z.r1) }); this.verlaufSpeichern();
        }
    }

    springeMini(p) {
        const m = this.miniRect(), g = this.miniGrenzen; if (!g) return;
        const c = g.c0 + (p.x - m.x - g.ox) / g.s, r = g.r0 + (p.y - m.y - g.oy) / g.s;
        const B = this.scale.width - BREITE_PANEL, H = this.scale.height - KOPF - FUSS;
        this.camX = c * Z - (BREITE_PANEL + B / 2) / this.zoom; this.camY = BODEN + r * Z - (KOPF + H / 2) / this.zoom;
    }

    setzeDing(t, cx, cy) {
        if (EINZIGARTIG.includes(t)) this.dinge = this.dinge.filter((d) => d.t !== t);
        else if (this.dinge.some((d) => d.t === t && d.cx === cx && d.cy === cy)) return;
        this.dinge.push({ id: this.naechsteId++, t, cx, cy });
        this.verlaufSpeichern();
    }

    setzeNotiz(cx, cy) {
        const t = window.prompt('Note text:', '');
        if (t) { this.dinge.push({ id: this.naechsteId++, t: 'notiz', cx, cy, text: t }); this.verlaufSpeichern(); }
    }

    malePinsel(c, r) { for (const [x, y] of this.pinsel(c, r)) this.bloecke.set(x + ',' + y, this.werkzeug); }

    // Radiert alles im Pinselbereich: Blöcke, Gegner, Gegenstände, Leitern (wenn eine Zelle getroffen wird), Notizen; Bereiche nur am Rand
    radierePinsel(c, r) {
        if (this.zieh) this.zieh.geaendert = true;
        for (const [cx, cy] of this.pinsel(c, r)) {
            this.bloecke.delete(cx + ',' + cy);
            this.dinge = this.dinge.filter((d) => {
                if (d.t === 'leiter') return !(d.cx === cx && cy >= d.cy0 && cy <= d.cy1);
                if (d.t === 'bereich') return !((cx === d.cx0 || cx === d.cx1) && cy >= d.cy0 && cy <= d.cy1 || (cy === d.cy0 || cy === d.cy1) && cx >= d.cx0 && cx <= d.cx1);
                return !(d.cx === cx && d.cy === cy);
            });
        }
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

    rect(farbe, wx, wy, w, h, a = 1) { this.g.fillStyle(farbe, a).fillRect((wx - this.camX) * this.zoom, (wy - this.camY) * this.zoom, w * this.zoom, h * this.zoom); }
    zellRahmen(c0, r0, c1, r1, farbe, fuellung, breite = 2) {
        const zz = this.zoom, x = (c0 * Z - this.camX) * zz, y = (BODEN + r0 * Z - this.camY) * zz, w = (c1 - c0 + 1) * Z * zz, h = (r1 - r0 + 1) * Z * zz;
        if (fuellung > 0) this.g.fillStyle(farbe, fuellung).fillRect(x, y, w, h);
        this.g.lineStyle(breite, farbe, 0.95).strokeRect(x, y, w, h);
    }

    zeichne() {
        const g = this.g, z = this.zoom, B = this.scale.width, H = this.scale.height;
        g.clear(); this.g2.clear();
        const c0 = Math.floor(this.camX / Z) - 1, c1 = Math.ceil((this.camX + B / z) / Z) + 1;
        const r0 = Math.floor((this.camY - BODEN) / Z) - 1, r1 = Math.ceil((this.camY + H / z - BODEN) / Z) + 1;
        this.rect(0x1d4a40, this.camX, this.camY, B / z, BODEN - this.camY, 0.55);
        this.rect(0xe8e0a0, this.camX, BODEN - 1, B / z, 2, 0.25);
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
        if (this.gitter && z > 0.35) {
            g.lineStyle(1, 0xffffff, 0.07);
            for (let c = c0; c <= c1; c++) { const x = (c * Z - this.camX) * z; g.lineBetween(x, 0, x, H); }
            for (let r = r0; r <= r1; r++) { const y = (BODEN + r * Z - this.camY) * z; g.lineBetween(0, y, B, y); }
        }
        const gesehen = new Set();
        for (const d of this.dinge) if (d.t === 'bereich') this.zeichneBereich(d, gesehen);
        for (const d of this.dinge) if (d.t === 'leiter') this.zeichneLeiter(d);
        for (const d of this.dinge) if (d.t !== 'bereich' && d.t !== 'leiter') this.zeichneDing(d, gesehen);
        this.zeichneAuswahl();
        this.zeichneVorschau();
        for (const [id, o] of this.textObjekte) if (!gesehen.has(id)) { o.destroy(); this.textObjekte.delete(id); }
        this.zeichneLineal(c0, c1, r0, r1);
        this.zeichnePanel();
        this.zeichneMini();
        this.zeichneText();
    }

    // Lineal: Zellnummern am oberen und linken Rand der Karte (alle 5 bzw. 10 Zellen, je nach Zoom), damit man Orte benennen kann
    zeichneLineal(c0, c1, r0, r1) {
        const schritt = this.zoom >= 0.5 ? 5 : (this.zoom >= 0.22 ? 10 : 20), z = this.zoom;
        const liste = [];
        for (let c = Math.ceil(c0 / schritt) * schritt; c <= c1; c += schritt) { const x = (c * Z - this.camX) * z + 2; if (x > BREITE_PANEL + 4) liste.push({ t: String(c), x, y: KOPF + 2, f: '#9ad0b8' }); }
        for (let r = Math.ceil(r0 / schritt) * schritt; r <= r1; r += schritt) { const y = (BODEN + r * Z - this.camY) * z + 1; if (y > KOPF + 14 && y < this.scale.height - FUSS - 14) liste.push({ t: String(r), x: BREITE_PANEL + 3, y, f: '#d8c890' }); }
        while (this.lineal.length < liste.length) this.lineal.push(this.add.text(0, 0, '', { fontFamily: 'monospace', fontSize: '11px', backgroundColor: '#00000088' }).setDepth(2));
        this.lineal.forEach((o, i) => { const e = liste[i]; if (e) { o.setVisible(true).setText(e.t).setColor(e.f).setPosition(e.x, e.y); } else o.setVisible(false); });
    }

    zeichnePanel() {
        const g = this.g, B = this.scale.width, H = this.scale.height;
        g.fillStyle(0x0c1a18, 0.97).fillRect(0, 0, BREITE_PANEL, H).fillRect(BREITE_PANEL, 0, B - BREITE_PANEL, KOPF).fillRect(BREITE_PANEL, H - FUSS, B - BREITE_PANEL, FUSS);
        g.lineStyle(1, 0x3a5a50, 1).lineBetween(BREITE_PANEL, 0, BREITE_PANEL, H).lineBetween(0, KOPF, B, KOPF).lineBetween(BREITE_PANEL, H - FUSS, B, H - FUSS);
        for (const k of this.knoepfe) {
            if (k.auswahl) continue;
            const aktiv = (k.id && k.id === this.werkzeug) || (k.groesse && k.groesse === this.groesse);
            g.fillStyle(aktiv ? 0x2f6a58 : (k.kopf ? 0x24433b : 0x15302a), 1).fillRect(k.x, k.y, k.w, k.h);
            g.lineStyle(aktiv ? 2 : 1, aktiv ? 0xfff0a0 : 0x3a5a50, 1).strokeRect(k.x, k.y, k.w, k.h);
            if (k.farbe !== undefined) g.fillStyle(k.farbe, 1).fillRect(k.x + 5, k.y + 4, 14, 13).lineStyle(1, 0x000000, 0.6).strokeRect(k.x + 5, k.y + 4, 14, 13);
        }
        // Auswahlleiste: schwebt über der markierten Fläche
        const sichtbar = !!this.auswahl;
        if (sichtbar) {
            const a = this.auswahl, zz = this.zoom;
            const ax = (a.c0 * Z - this.camX) * zz, ay = (BODEN + a.r0 * Z - this.camY) * zz;
            let x = Phaser.Math.Clamp(ax, BREITE_PANEL + 6, B - 230), y = ay - 28; if (y < KOPF + 4) y = Math.min((BODEN + (a.r1 + 1) * Z - this.camY) * zz + 6, H - FUSS - 28);
            for (const k of this.auswahlKnoepfe) {
                k.x = x; k.y = y; x += k.w + 4;
                g.fillStyle(0x4a3a18, 1).fillRect(k.x, k.y, k.w, k.h); g.lineStyle(1, 0xffd860, 1).strokeRect(k.x, k.y, k.w, k.h);
                k.label.setPosition(k.x + 7, k.y + 4);
            }
        }
        for (const k of this.auswahlKnoepfe) k.label.setVisible(sichtbar);
        this.hilfeText.setVisible(this.hilfe);
    }

    zeichneText() {
        const z = this.zoom, c = this.zelleX(this.maus.x), r = this.zelleY(this.maus.y);
        const meld = this.meldung.bis > this.time.now ? '   |   ' + this.meldung.text : '';
        this.statusText.setText(`Tool: ${NAMEN[this.werkzeug]}   cell ${c}, ${r}   zoom ${(z * 100).toFixed(0)}%${meld}`);
        this.modusKnopf.label.setText(this.frei ? 'DRAW: freehand  (B)' : 'DRAW: rectangle  (B)');
        // Hinweisleiste: Tipp zum Knopf unter der Maus, sonst zum aktuellen Werkzeug
        let tipp = null;
        for (const k of this.knoepfe) if (k.tipp && (!k.auswahl || this.auswahl) && this.trifftKnopf(this.maus, k)) tipp = k.tipp;
        if (!tipp) tipp = this.einfuegen ? 'Paste mode: click to place the copy. Esc ends.' : WERKZEUGE.find((w) => w.id === this.werkzeug).tipp;
        this.hinweisText.setText(tipp);
        this.zeichneTooltip(c, r);
    }

    zeichneBlockLauf(t, c0, c1, r) {
        const x = c0 * Z, y = BODEN + r * Z, w = (c1 - c0 + 1) * Z;
        if (t === 'erde') {
            this.rect(0x5b4a35, x, y, w, Z);
            this.rect(0x4a3b2a, x, y + Z - 4, w, 4, 0.7);
            for (let c = c0; c <= c1; c++) if (!this.bloecke.has(c + ',' + (r - 1))) this.rect(0x6aa032, c * Z, y, Z, 8);
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

    beschrifte(d, inhalt, sx, sy, farbe, gesehen) {
        gesehen.add(d.id);
        let o = this.textObjekte.get(d.id);
        if (!o) { o = this.add.text(0, 0, '', { fontFamily: 'monospace', fontSize: '13px', backgroundColor: '#000000aa', padding: { x: 4, y: 2 } }).setDepth(3); this.textObjekte.set(d.id, o); }
        if (o.text !== inhalt) o.setText(inhalt);
        o.setColor(farbe).setPosition(sx, sy);
        o.setVisible(sx + o.width > BREITE_PANEL && sx < this.scale.width && sy > KOPF - 12 && sy < this.scale.height - FUSS);
    }

    zeichneFigur(fx, fy, farbe, kopf, breit = 32, hoch = 48) {
        this.rect(farbe, fx - breit / 2, fy - hoch, breit, hoch);
        this.rect(kopf, fx - breit / 2 + 4, fy - hoch, breit - 8, hoch * 0.3);
        this.rect(0x000000, fx - breit / 2 + 6, fy - hoch + hoch * 0.1, 5, 4, 0.8);
    }

    zeichneDing(d, gesehen) {
        const fx = d.cx * Z + Z / 2, fy = BODEN + (d.cy + 1) * Z;
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

    // Die markierte Fläche: gelber Rahmen, Größe, und beim Verschieben eine Vorschau der neuen Lage
    zeichneAuswahl() {
        const a = this.auswahl, z = this.zieh; let tmp = null;
        if (z && z.art === 'auswahl') tmp = { c0: Math.min(z.c0, z.c1), r0: Math.min(z.r0, z.r1), c1: Math.max(z.c0, z.c1), r1: Math.max(z.r0, z.r1) };
        if (tmp) this.zellRahmen(tmp.c0, tmp.r0, tmp.c1, tmp.r1, 0xffd860, 0.18);
        if (a) {
            this.zellRahmen(a.c0, a.r0, a.c1, a.r1, 0xffd860, 0.14, 2);
            if (z && z.art === 'bewegen') {
                const dx = z.c1 - z.c0, dy = z.r1 - z.r0;
                for (const [bx, by, t] of this.inhalt(a).bloecke) this.zellRahmen(a.c0 + dx + bx, a.r0 + dy + by, a.c0 + dx + bx, a.r0 + dy + by, t === 'erde' ? 0x9a7a4a : (t === 'stein' ? 0xb0aca4 : 0xc9a05a), 0.5, 1);
                this.zellRahmen(a.c0 + dx, a.r0 + dy, a.c1 + dx, a.r1 + dy, 0xffffff, 0.08, 2);
            }
        }
    }

    zeichneVorschau() {
        const p = this.maus;
        if (this.imPanel(p) || this.imMini(p)) return;
        const c = this.zelleX(p.x), r = this.zelleY(p.y), w = this.werkzeug, z = this.zieh;
        const info = WERKZEUGE.find((x) => x.id === w);
        if (this.einfuegen && this.zwischen) {
            for (const [bx, by, t] of this.zwischen.bloecke) this.zellRahmen(c + bx, r + by, c + bx, r + by, t === 'erde' ? 0x9a7a4a : (t === 'stein' ? 0xb0aca4 : 0xc9a05a), 0.5, 1);
            this.zellRahmen(c, r, c + this.zwischen.w - 1, r + this.zwischen.h - 1, 0xffffff, 0.06, 2); return;
        }
        if (z && z.art === 'rechteck') this.zellRahmen(Math.min(z.c0, z.c1), Math.min(z.r0, z.r1), Math.max(z.c0, z.c1), Math.max(z.r0, z.r1), info.farbe, 0.3);
        else if (z && z.art === 'leiter') this.zellRahmen(z.c0, Math.min(z.r0, z.r1), z.c0, Math.max(z.r0, z.r1), info.farbe, 0.3);
        else if (z && (z.art === 'auswahl' || z.art === 'bewegen' || z.art === 'schieben' || z.art === 'mini')) return;
        else if (w === 'auswahl') this.zellRahmen(c, r, c, r, 0xffd860, 0.12, 1);
        else if (w === 'radierer' || (z && z.button === 2)) { const h = Math.floor(this.groesse / 2); this.zellRahmen(c - h, r - h, c + h, r + h, 0xff5050, 0.3); }
        else if (BLOCK_CODE[w] && this.frei) { const h = Math.floor(this.groesse / 2); this.zellRahmen(c - h, r - h, c + h, r + h, info.farbe, 0.3); }
        else this.zellRahmen(c, r, c, r, info.farbe, 0.25);
    }

    // Übersichtskarte unten rechts: die ganze Skizze im Kleinen; ein Klick springt dorthin
    zeichneMini() {
        const m = this.miniRect(), g = this.g;
        if (this.miniDirty) {
            this.miniDirty = false;
            const gr = this.grenzen(false), sp = gr.c1 - gr.c0 + 3, hh = gr.r1 - gr.r0 + 3, s = Math.min(m.w / sp, m.h / hh);
            this.miniGrenzen = { c0: gr.c0 - 1, r0: gr.r0 - 1, s, ox: (m.w - sp * s) / 2, oy: (m.h - hh * s) / 2 };
            const mg = this.mini; mg.clear();
            const M = this.miniGrenzen;
            for (const [k, t] of this.bloecke) {
                const i = k.indexOf(','), c = Number(k.slice(0, i)), r = Number(k.slice(i + 1));
                if (r > gr.r1) continue;
                mg.fillStyle(t === 'erde' ? 0x8a6a44 : (t === 'stein' ? 0xa8a49c : 0xc9a05a), 1).fillRect(m.x + M.ox + (c - M.c0) * s, m.y + M.oy + (r - M.r0) * s, Math.max(1, s), Math.max(1, s));
            }
            for (const d of this.dinge) {
                const c = d.cx ?? d.cx0, r = d.cy ?? d.cy0 ?? d.cy0;
                const farbe = { start: 0x66ff66, ziel: 0x66ff99, fahne: 0xff4040, notiz: 0xffe080 }[d.t] ?? (['nahkaempfer', 'fernkaempfer', 'skelett', 'schwer', 'boss'].includes(d.t) ? 0xff6060 : (d.t === 'bereich' ? 0x66a0ff : (d.t === 'leiter' ? 0xc9a05a : 0xffffff)));
                mg.fillStyle(farbe, 1).fillRect(m.x + M.ox + (c - M.c0) * s - 1, m.y + M.oy + ((d.cy ?? d.cy0) - M.r0) * s - 1, Math.max(3, s), Math.max(3, s));
            }
        }
        g.fillStyle(0x0c1a18, 0.85).fillRect(m.x, m.y, m.w, m.h); g.lineStyle(1, 0x3a5a50, 1).strokeRect(m.x, m.y, m.w, m.h);
        const M = this.miniGrenzen;
        if (M) {
            const vx = m.x + M.ox + (this.camX / Z - M.c0) * M.s, vy = m.y + M.oy + ((this.camY - BODEN) / Z - M.r0) * M.s;
            const vw = ((this.scale.width - BREITE_PANEL) / this.zoom / Z) * M.s, vh = ((this.scale.height - KOPF - FUSS) / this.zoom / Z) * M.s;
            const ox = vx + (BREITE_PANEL / this.zoom / Z) * M.s, oy = vy + (KOPF / this.zoom / Z) * M.s;
            this.g2.lineStyle(1, 0xffffff, 0.9).strokeRect(Phaser.Math.Clamp(ox, m.x, m.x + m.w - 2), Phaser.Math.Clamp(oy, m.y, m.y + m.h - 2), Math.min(vw, m.w), Math.min(vh, m.h));
        }
    }

    zeichneTooltip(c, r) {
        if (this.imPanel(this.maus) || this.imMini(this.maus) || this.zieh) { this.tooltip.setVisible(false); return; }
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
