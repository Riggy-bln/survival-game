// "import" holt Code aus anderen Dateien. So bleibt jede Datei klein und übersichtlich.
import Player from '../entities/Player.js';
import Bullet from '../entities/Bullet.js';
import Enemy from '../entities/Enemy.js';
import RangedEnemy from '../entities/RangedEnemy.js';
import Boss from '../entities/Boss.js';
import Brut from '../entities/Brut.js';
import Skelett from '../entities/Skelett.js';
import Touch from '../Touch.js';
import Pickup from '../entities/Pickup.js';
import Grenade from '../entities/Grenade.js';
import Fass from '../entities/Fass.js';
import { sfx } from '../Sound.js';
import { buildLandscape } from '../Landscape.js';
import { buildDschungelHimmel, buildDschungelSchicht, buildBrandherde } from '../Dschungel.js';
import Mehrspieler, { SPIELERFARBEN } from '../Mehrspieler.js';
import Effects, { buildSky, buildSkyline, decoratePlatforms, buildVignette, buildEmbers, buildCaves, buildHuegel, buildBerge } from '../Effects.js';
import level from '../levels/Level01.js';  // die Leveldaten (Listen)

// Größe der Spielwelt. Das Fenster ist nur 960 breit, die Welt ist viel größer.
// Die Breite kommt jetzt aus der Level-Datei.
const WORLD_WIDTH = level.width;
// Die Welt ist jetzt höher als das Fenster (540): oben Platz für Gebäude, unten für Tunnel.
// Die Kamera scrollt deshalb auch senkrecht. "boden" ist die Höhe der Oberfläche.
const WORLD_HEIGHT = level.height;
const BODEN = level.boden;

const BELEBEN_DAUER = 3;   // so viele Sekunden muss man E halten, um einen Gefallenen wiederzubeleben

// Länge der Waffe in Pixeln (vom Griff bis zur Mündung) für die Zeichnung und das Mündungsfeuer
const WAFFENLAENGE = { pistol: 18, rifle: 32, shotgun: 28, sword: 30, fist: 14 };

// Inventarleiste unten in der Mitte: vier Plätze
const SLOT = 64, SLOT_ABSTAND = 8;
// Die Leiste sitzt unten in der Mitte: x nach der Fensterbreite (this.slotX0), y nach der Fensterhöhe (this.slotY)

// Seilbahn
const SEIL_TEMPO = 640;      // Fahrgeschwindigkeit auf dem Seil (Pixel pro Sekunde)
const SEIL_HANG = 62;        // so weit hängt die Körpermitte unter dem Seil

// Schwerthieb
const HIEB_DAUER = 260;        // so lange dauert der Schwung (ms)
const HIEB_PAUSE = 400;        // Pause bis zum nächsten Hieb (ms)
const HIEB_REICHWEITE = 74;    // Pixel vom Spieler
const HIEB_SCHADEN = 2;        // Gegner haben normalerweise 3 Leben (die Faust macht nur 1)
const FAUST_REICHWEITE = 54;

// Die Szene baut die Welt auf und lässt die Spielobjekte zusammenarbeiten.
export default class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    // create() läuft einmal beim Start: hier bauen wir die Welt auf.
    create() {
        // Spielmodus aus dem Menü: 'einzel' (später auch 'online' und 'lokal'). Bleibt auch nach einem Neustart erhalten.
        this.modus = this.registry.get('modus') ?? 'einzel';
        const netz = this.registry.get('netz');
        this.online = (this.modus === 'host' || this.modus === 'gast') && !!netz;   // Online-Mehrspieler?
        this.meineNr = this.online ? netz.meineNr : 1;
        this.istHost = this.online && netz.rolle === 'host';   // rechnet die Welt und verteilt sie
        this.istGast = this.online && netz.rolle === 'gast';   // zeigt die Welt nur an
        this.rechnet = !this.istGast;                          // wer Gegner, Kugeln, Schaden und Explosionen berechnet
        this.bulletZaehler = 0;                                // fortlaufende Nummern für Kugeln und Granaten
        this.belebenInfo = {};                                 // Wiederbeleben: nr -> { p, bis }
        this.belebenZeit = 0;
        this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

        // --- Himmel und Hintergrund-Schichten (Parallax: weiter weg = langsamer) ---
        // Krieg im Dschungel: giftig-grüner Himmel mit Bränden am Horizont und fünf Dschungelschichten (Palmen, Wachtürme, Hütten)
        buildDschungelHimmel(this);
        buildDschungelSchicht(this, WORLD_WIDTH, BODEN, 0.04, 0x3f8f68, 230, 160, 'j0', 5, 55, false, -27.5);     // ferne, dunstige Hügel
        buildDschungelSchicht(this, WORLD_WIDTH, BODEN, 0.08, 0x2f7a54, 190, 130, 'j1', 6, 75, true, -26.5);      // Dschungel mit Wachtürmen
        buildBrandherde(this, WORLD_WIDTH, BODEN, 0.08, 'b1', 7);                                                  // Rauchsäulen und Glühen
        buildDschungelSchicht(this, WORLD_WIDTH, BODEN, 0.14, 0x226444, 150, 105, 'j2', 8, 95, true, -25);
        buildDschungelSchicht(this, WORLD_WIDTH, BODEN, 0.22, 0x194c34, 115, 85, 'j3', 9, 120, false, -24);
        buildDschungelSchicht(this, WORLD_WIDTH, BODEN, 0.32, 0x103a28, 85, 65, 'j4', 8, 150, false, -23);        // nahe, dunkle Palmen

        // --- Dekoration: Ruinen im Hintergrund (ohne Physik) ---
        // (Die alten Rechtecke sind weg: Verfallene Gebäude und Pflanzen kommen aus Landscape.js.)
        buildLandscape(this, level);

        // --- Dekoration und Schilder aus der Level-Datei (ohne Physik) ---
        for (const d of level.decor) {
            this.add.rectangle(d.x, d.y, d.w, d.h, d.color);
        }
        // Hinweise: einfach Text in der Landschaft, ohne Tafel und Pfosten.
        for (const sg of level.signs) {
            this.add.text(sg.x, sg.y, sg.text, {
                fontSize: '16px', color: '#e6ded0', align: 'center', lineSpacing: 2,
            }).setOrigin(0.5).setDepth(3);
        }

        // --- Boden und Plattformen ---
        this.platforms = [];
        this.brechbarZaehler = 0;     // Nummern der zerstörbaren Blöcke (für den Mehrspielermodus)
        // Für jeden Eintrag der Liste in Level01.js eine Plattform bauen.
        // "p" steht für einen Eintrag. Fehlt "color", gilt die Standardfarbe nach dem "??".
        for (const p of level.platforms) {
            this.addPlatform(p.x, p.y, p.w, p.h, p.color ?? 0x6b5b4a);
            if (p.brechbar) {                        // brüchige Erdwand: hält ein paar Treffer aus und zerbricht dann
                const wand = this.platforms[this.platforms.length - 1];
                wand.brechbar = true;
                wand.hp = p.hp ?? 5;
                wand.id = this.brechbarZaehler++;
                wand.maxHp = wand.hp;
                wand.art = p.art;                    // Aussehen: 'holz', 'sand', 'beton', 'kiste' (sonst Erde)
                wand.deckung = !!p.deckung;          // Deckung: auch Gegnerkugeln beschädigen sie
                wand.gruppe = p.gruppe;              // Zusammengehörige Teile (Stützen und Böden eines Turms)
                wand.rolle = p.rolle;                // 'stuetze' trägt, 'boden' fällt herunter, wenn alle Stützen der Gruppe weg sind
            }
            if (p.kollision) {                       // Stufenblock eines sanften Hügels: unsichtbar, nur zum Laufen
                const block = this.platforms[this.platforms.length - 1];
                block.setVisible(false);
                block.kollisionNur = true;
            }
        }

        buildHuegel(this, level.huegelformen, BODEN);   // Erdoberfläche der sanften Hügel
        buildCaves(this, level.hoehlen, level.lampen);  // Höhlenwände (statt schwarzer Flächen)
        decoratePlatforms(this, this.platforms, BODEN);  // Gras, Sprenkel, Kanten
        this.fx = new Effects(this);                       // Partikel
        // Testhilfe (nur mit ?shot=1): nach 6 Sekunden ein Bild des Spiels an einen lokalen Testserver schicken
        if (new URLSearchParams(window.location.search).get('shot')) {
            this.time.delayedCall(6000, () => this.game.renderer.snapshot((bild) => fetch('http://localhost:8002/', { method: 'POST', body: bild.src })));
        }
        buildEmbers(this);                                 // Glut und Asche in der Luft
        buildVignette(this);                               // dunkle Bildränder

        // --- Spieler ---
        // Eine Zeile statt vieler: Alles Wichtige steckt jetzt in Player.js.
        // Testhilfe: Mit http://localhost:8001/?x=3330&y=1000 startet man an einer anderen Stelle des Levels.
        const startParam = new URLSearchParams(window.location.search);
        const startX = Number(startParam.get('x')) || 200, startY = Number(startParam.get('y')) || BODEN - 200;
        this.player = new Player(this, startX + (this.meineNr - 1) * 48, startY);  // startet in der Luft und landet (Mitspieler daneben)
        this.physics.add.collider(this.player, this.platforms);

        // --- Gegner ---
        // Jeder Gegner bekommt Startposition und Patrouillenbereich (links, rechts).
        // map() wandelt jeden Listeneintrag in ein fertiges Objekt um und liefert die neue Liste.
        // Nahkämpfer und Fernkämpfer landen in derselben Liste: Für die Szene sind beide
        // "Gegner" mit update() und takeDamage(). Nur das Verhalten unterscheidet sich.
        // Die starke Kreatur merken wir uns zusätzlich einzeln (this.boss),
        // weil Lebensanzeige und Evakuierung sie brauchen. "? :" heißt: wenn vorhanden, dann ...
        // Kleine Hilfsfunktion: baut einen Gegner der gegebenen Klasse aus einem Listeneintrag.
        // Hat der Eintrag "hp", überschreibt das die Standard-Lebenspunkte (zähere Gegner).
        // Mehr Spieler = zähere Gegner: Pro zusätzlichem Spieler +50 % Leben. Der Gastgeber rechnet das aus;
        // die Gäste lesen Leben und Höchstleben später aus den Weltmeldungen.
        const spielerZahl = this.online ? Math.max(1, netz.liste().length) : 1;
        this.lebenFaktor = 1 + 0.5 * (spielerZahl - 1);
        const baue = (Klasse, e) => {
            const gegner = new Klasse(this, e.x, e.y, e.left, e.right);
            const basis = e.hp ?? gegner.health;
            const hp = this.istGast ? basis : Math.max(1, Math.round(basis * this.lebenFaktor));
            gegner.health = hp;
            gegner.maxHealth = hp;
            if (this.istGast) {                       // Gäste rechnen keine Gegner: Die Figur ist eine Attrappe, die der Gastgeber steuert
                gegner.body.enable = false;
                gegner.body.setAllowGravity(false);
                gegner.body.blocked.down = true;      // sie "steht" beim Zeichnen am Boden (Laufanimation statt Sprungbeine)
                gegner.istGeist = true;
                gegner.update = () => {};
            }
            return gegner;
        };
        const b = level.boss;
        const haupt = [
            ...level.enemies.map(e => baue(Enemy, e)),
            ...level.rangedEnemies.map(e => baue(RangedEnemy, e)),
            ...(level.skelette ?? []).map(e => baue(Skelett, e)),
            ...(b ? [baue(Boss, b)] : []),
        ];
        this.boss = b ? haupt[haupt.length - 1] : null;
        // Die Brutlinge der Kreatur schlafen am Arenarand, bis sie gerufen werden. Sie bekommen ihre Nummern am Ende.
        const brutListe = (level.brutlinge ?? []).map(e => {
            const g = baue(Brut, e);
            g.schlaeft = true;
            g.body.enable = false;
            return g;
        });
        const liste = [...haupt, ...brutListe];
        liste.forEach((g, i) => { g.id = i; });      // feste Nummer: auf allen Geräten dieselbe Reihenfolge
        this.gegnerNachId = liste;                   // bleibt unverändert (auch wenn Gegner sterben)
        this.enemies = haupt.slice();                // nur die Wachen: Schlafende kommen erst beim Wecken dazu
        this.enemyBullets = [];  // Kugeln der Gegner
        this.warnungen = [];     // rote Einschlagkreise (Steinschlag)
        // Eine collider-Zeile für alle Gegner (auch die schlafenden): Sie stehen auf Boden und Plattformen.
        if (this.rechnet) this.physics.add.collider(liste, this.platforms);   // Attrappen der Gäste haben keine Physik


        // --- Explosive Fässer ---
        this.faesser = (level.faesser ?? []).map((f, i) => { const o = new Fass(this, f.x, f.y); o.id = i; return o; });

        // --- Gegenstände ---
        // Die Positionen stehen in Level01.js (Boden: y = 490).
        this.pickups = level.pickups.map((p, i) => { const o = new Pickup(this, p.x, p.y, p.type); o.id = i; return o; });

        // --- Hubschrauber (Levelende) ---
        // Das Evakuierungsfeld: eine grün leuchtende Zone am Boden (220 breit, 120 hoch).
        // Sie ist der eigentliche Auslöser: Wer sie berührt, gewinnt.
        // Die 0.18 am Ende ist die Durchsichtigkeit (0 = unsichtbar, 1 = deckend).
        // hx = x-Mitte des Hubschraubers. Sie steht in der Level-Datei (goalX), alle Teile
        // werden relativ dazu platziert, damit das Ziel leicht verschoben werden kann.
        const hx = level.goalX;
        // Alle Höhen sind relativ zu BODEN angegeben (BODEN - 60 = 60 Pixel über der Oberfläche).
        this.helicopter = this.add.rectangle(hx, BODEN - 60, 220, 120, 0x66ff99, 0.18)
            .setStrokeStyle(2, 0x66ff99);

        // Der Hubschrauber selbst besteht aus mehreren Rechtecken (nur Optik, keine Physik).
        this.add.rectangle(hx, BODEN - 22, 90, 40, 0x6b7a4a);       // Rumpf (olivgrün)
        this.add.rectangle(hx + 68, BODEN - 30, 60, 10, 0x6b7a4a);  // Heckausleger
        this.add.rectangle(hx + 92, BODEN - 42, 8, 24, 0x6b7a4a);   // Heckflosse
        this.add.rectangle(hx - 20, BODEN - 30, 30, 20, 0x9fd3e6);  // Cockpitfenster
        this.add.rectangle(hx, BODEN - 48, 6, 12, 0x333333);        // Rotormast
        const rotor = this.add.rectangle(hx, BODEN - 54, 160, 6, 0x333333);  // Rotorblatt

        // Ein "Tween" verändert einen Wert über die Zeit. Hier schrumpft und wächst die
        // Breite des Rotors ständig (yoyo = hin und zurück, repeat -1 = endlos),
        // das sieht aus wie ein sich drehender Rotor.
        this.tweens.add({
            targets: rotor, scaleX: 0.15, duration: 90, yoyo: true, repeat: -1,
        });

        this.evacLabel = this.add.text(hx, BODEN - 150, 'EVACUATION', {
            fontSize: '28px', color: '#66ff99', fontStyle: 'bold',
        }).setOrigin(0.5);
        this.evacOpen = undefined;  // wird in update() gesetzt: offen (grün) oder gesperrt (rot)

        // --- Kamera ---
        this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

        // --- Fadenkreuz ---
        this.crosshair = this.add.circle(0, 0, 10).setStrokeStyle(2, 0xff4444);
        this.crosshair.setDepth(10);
        this.input.setDefaultCursor('none');

        // --- Optik der Figuren ---
        // Die Rechtecke bleiben die "Körper" (Physik und Treffer). Köpfe, Waffen, Augen und Hörner
        // zeichnen wir in jedem Frame neu auf eine gemeinsame Zeichenfläche darüber.
        this.charGfx = this.add.graphics().setDepth(6);
        // Die Rechtecke selbst werden nicht mehr gezeigt: Wir malen die Figuren stattdessen.
        this.player.setVisible(false);
        this.enemies.forEach(e => e.setVisible(false));

        // --- Schießen ---
        this.bullets = [];
        this.lastShot = 0;
        this.grenadeList = [];  // fliegende Granaten

        // --- Anzeige (Lebensbalken) ---
        // setScrollFactor(0) heftet ein Objekt an den Bildschirm statt an die Welt.
        // Es bleibt dann an derselben Stelle im Fenster, obwohl die Kamera scrollt.
        this.hpBack = this.add.rectangle(20, 20, 204, 24, 0x000000).setOrigin(0, 0);
        this.hpBar = this.add.rectangle(22, 22, 200, 20, 0x44cc44).setOrigin(0, 0);
        this.hpText = this.add.text(30, 24, '', { fontSize: '16px', color: '#ffffff' });
        // Alle Teile gemeinsam: am Bildschirm festhalten und über alles andere legen.
        [this.hpBack, this.hpBar, this.hpText].forEach(obj => {
            obj.setScrollFactor(0).setDepth(20);
        });
        this.hiebe = [];              // laufende Schwerthiebe aller Spieler
        this.sichere = [];            // zuletzt betretene sichere Stellen (für den Absturz ins Nichts)
        this.naechsteSichere = 0;
        this.erzeugeHotbar();         // Inventarleiste unten
        this.touch = new Touch(this);   // Touch-Steuerung (schaltet sich am Handy selbst ein)
        // Ändert sich die Fensterbreite, ordnen wir die Anzeigen neu an (und räumen beim Verlassen der Szene wieder auf)
        this.scale.on('resize', this.layoutHud, this);
        this.events.once('shutdown', () => this.scale.off('resize', this.layoutHud, this));

        // --- Lebensanzeige der starken Kreatur (oben in der Mitte, erst sichtbar, wenn sie erwacht) ---
        const mitteX = this.scale.width / 2;   // Fenstermitte (das Fenster ist jetzt 1280 breit)
        this.bossBack = this.add.rectangle(mitteX, 28, 304, 18, 0x000000);
        this.bossBar = this.add.rectangle(mitteX - 150, 28, 300, 14, 0xcc3333).setOrigin(0, 0.5);
        this.bossLabel = this.add.text(mitteX, 50, 'MUTATED CREATURE', {
            fontSize: '14px', color: '#ffffff',
        }).setOrigin(0.5);
        // Kerben bei 1/3 und 2/3: Dort wechselt die Kreatur die Phase
        this.bossKerben = [100, 200].map(dx => this.add.rectangle(mitteX - 150 + dx, 28, 3, 18, 0xffffff, 0.8));
        this.bossUI = [this.bossBack, this.bossBar, this.bossLabel, ...this.bossKerben];
        this.bossUI.forEach(obj => obj.setScrollFactor(0).setDepth(20).setVisible(false));

        // --- Statistik für den Endbildschirm ---
        this.startTime = this.time.now;              // Beginn des Versuchs (in Millisekunden)
        this.kills = 0;                              // besiegte Gegner
        this.totalEnemies = this.enemies.length;     // alle Gegner im Level, Kreatur eingeschlossen (ohne Brut)

        // --- Zustand und Neustart ---
        this.zuZerbrechen = [];       // brüchige Wände, die am Anfang des nächsten Bildes zerbrechen
        this.naechsterStaub = 0;
        this.gameOver = false;
        // Neustart auf Enter, denn R bedeutet jetzt Nachladen.
        this.restartKey = this.input.keyboard.addKey('ENTER');
        this.mp = this.online ? new Mehrspieler(this, netz) : null;   // Netzwerk-Anteil des Mehrspielermodus
        // Wiederbeleben und Zuschauerkamera
        this.kameraZiel = this.add.rectangle(0, 0, 4, 4, 0x000000, 0).setVisible(false);
        // Leitern
        this.leitern = level.leitern ?? [];
        this.baueLeitern();
        this.baueTuerme();
        // Checkpoint (Fahne auf dem Gipfel) und Seilbahn
        this.checkpoint = null;
        this.respawnZeit = 0;
        this.wipeSeit = 0;
        this.baueFlagge();
        this.baueSeilbahn();
        this.teamHud = this.add.graphics().setScrollFactor(0).setDepth(20);   // Lebensbalken der Mitspieler
        this.teamTexte = new Map();
        this.belebenHinweis = this.add.text(this.scale.width / 2, this.scale.height - 90, '', {
            fontSize: '22px', color: '#ffffff', backgroundColor: '#000000aa', padding: { x: 12, y: 6 },
        }).setOrigin(0.5).setScrollFactor(0).setDepth(25).setVisible(false);
        this.pauseKey = this.input.keyboard.addKey('ESC');
        this.muteKey = this.input.keyboard.addKey('N');
        // Nach dem Fortsetzen kann derselbe Esc-Druck noch in der Warteschlange stecken.
        // Darum Esc kurz sperren (Date.now ist die echte Uhr, die Spieluhr steht ja in der Pause).
        this.pauseBlockedUntil = 0;
        this.events.on('resume', () => { this.pauseBlockedUntil = Date.now() + 300; });
    }

    // Dunklere bzw. hellere Variante einer Farbe (für Schatten und Glanz).
    dunkler(c, n = 30) { return Phaser.Display.Color.ValueToColor(c).darken(n).color; }
    heller(c, n = 20) { return Phaser.Display.Color.ValueToColor(c).lighten(n).color; }

    // Malt einen Menschen-ähnlichen Körper (Spieler, Soldaten, Fernkämpfer) aus einfachen Formen.
    // (x, y) = Mitte des Körper-Rechtecks (32 x 48). o beschreibt Aussehen und Haltung.
    drawHumanoid(g, x, y, o) {
        const a = o.alpha ?? 1, f = o.facing, t = this.time.now;
        const hose = this.dunkler(o.body, 45);

        // Beine: beim Laufen schwingen sie gegenläufig, in der Luft sind sie gespreizt.
        const s = Math.sin(t * 0.018), c = Math.cos(t * 0.018);
        let l1 = 0, l2 = 0, h1 = 0, h2 = 0;
        if (o.klettern) { const k = Math.sin((o.kPhase ?? 0) * 0.12); h1 = 5 + k * 5; h2 = 5 - k * 5; l1 = 3; l2 = -3; }     // Beine steigen abwechselnd
        else if (o.wand) { l1 = o.wand * 6; l2 = o.wand * 3; h1 = 2; h2 = 6; }                                         // Beine gegen die Wand gestemmt
        else if (o.air) { l1 = 6; l2 = -6; h1 = 3; }
        else if (o.moving) { l1 = s * 7; l2 = -s * 7; h1 = Math.max(0, c) * 4; h2 = Math.max(0, -c) * 4; }
        for (const [lx, h] of [[l2, h2], [l1, h1]]) {
            g.fillStyle(hose, a).fillRect(x + lx - 6, y + 10, 12, 14 - h);                  // Bein
            g.fillStyle(0x222222, a).fillRect(x + lx - 6 + (f > 0 ? 1 : -3), y + 20 - h, 14, 4);   // Stiefel
        }

        // Rucksack auf dem Rücken, Torso, Gürtel, Schulterglanz
        g.fillStyle(this.dunkler(o.body, 55), a).fillRect(x - f * 15 - 3, y - 8, 6, 15);
        g.fillStyle(o.body, a).fillRect(x - 13, y - 10, 26, 20);
        g.fillStyle(this.heller(o.body, 15), a).fillRect(x - 13, y - 10, 26, 4);
        g.fillStyle(0x2a2a2a, a).fillRect(x - 13, y + 6, 26, 4);
        g.fillStyle(0xb8a040, a).fillRect(x - 3, y + 6, 6, 4);                            // Gürtelschnalle
        if (o.rippen) {                                                                   // Rippen und Wirbelsäule
            for (let k = 0; k < 4; k++) g.fillStyle(0xd8d4c0, a).fillRect(x - 9, y - 8 + k * 4, 18, 2);
            g.fillStyle(0xd8d4c0, a).fillRect(x - 1, y - 10, 2, 18);
        }
        if (o.strap) {                                                                    // Patronengurt
            g.lineStyle(3, 0x8a6d2a, a).beginPath().moveTo(x - 12, y - 9).lineTo(x + 12, y + 6).strokePath();
        }

        // Kopf
        const hy = y - 24;
        if (o.head === 'mask') {
            g.fillStyle(0x555a4a, a).fillRect(x - 9, hy, 18, 15);
            g.fillStyle(0xff4444, a).fillRect(x + (f > 0 ? -1 : -9), hy + 4, 10, 4);       // leuchtende Brille
            g.fillStyle(0x2a2a2a, a).fillRect(x + (f > 0 ? 5 : -12), hy + 9, 7, 6);        // Filter
        } else if (o.head === 'skull') {
            g.fillStyle(0xe4e0cc, a).fillRect(x - 8, hy, 16, 12);                           // Schädel
            g.fillStyle(0xc9c4ac, a).fillRect(x - 7, hy + 11, 14, 5);                       // Kiefer
            const so = f > 0 ? 1 : -1;
            g.fillStyle(0x15130f, a).fillRect(x - 6 + so, hy + 3, 5, 5).fillRect(x + 1 + so, hy + 3, 5, 5);   // Augenhöhlen
            g.fillStyle(0xff5533, a).fillRect(x - 4 + so * 2, hy + 5, 2, 2).fillRect(x + 3 + so * 2, hy + 5, 2, 2);   // glühende Punkte
            g.fillStyle(0x15130f, a).fillRect(x - 1, hy + 8, 2, 2);                        // Nasenloch
            for (let k = -5; k <= 5; k += 3) g.fillStyle(0x15130f, a).fillRect(x + k, hy + 12, 1, 3);   // Zähne
        } else if (o.head === 'hood') {
            g.fillStyle(this.dunkler(o.body, 50), a).fillRect(x - 10, hy - 2, 20, 17);
            g.fillStyle(0xffee66, a).fillRect(x + (f > 0 ? 0 : -9), hy + 5, 9, 3);          // leuchtende Augen
        } else {
            g.fillStyle(o.skin, a).fillRect(x - 8, hy + 1, 16, 14);
            g.fillStyle(0x222222, a).fillRect(x - 8, hy - 1, 16, 4);                        // Haar
            g.fillStyle(0xcc2222, a).fillRect(x - 9, hy + 3, 18, 4);                        // Stirnband
            const tx = f > 0 ? x - 16 : x + 9;                                              // flatterndes Ende
            g.fillRect(tx, hy + 3 + Math.sin(t * 0.02) * 2, 7, 3);
            const ex = f > 0 ? x + 1 : x - 5;
            g.fillStyle(0xffffff, a).fillRect(ex, hy + 8, 4, 3);
            g.fillStyle(0x111111, a).fillRect(ex + (f > 0 ? 2 : 0), hy + 8, 2, 3);
        }

        // Arme und Waffe
        const schulter = { x, y: y - 6 };
        if (o.wand && !o.klettern) {                                                      // an der Wand: ein Arm greift hoch, der andere stützt
            g.lineStyle(6, o.skin, a).beginPath().moveTo(x + o.wand * 8, y - 8).lineTo(x + o.wand * 17, y - 28).strokePath();
            g.lineStyle(6, o.skin, a).beginPath().moveTo(x + o.wand * 6, y - 4).lineTo(x + o.wand * 16, y - 12).strokePath();
            return;
        }
        if (o.klettern) {                                                                 // beide Arme greifen an die Holme
            const ka = Math.sin((o.kPhase ?? 0) * 0.12) * 4;
            g.lineStyle(6, o.skin, a).beginPath().moveTo(x - 8, y - 8).lineTo(x - 9, y - 26 + ka).strokePath();
            g.lineStyle(6, o.skin, a).beginPath().moveTo(x + 8, y - 8).lineTo(x + 9, y - 26 - ka).strokePath();
            return;
        }
        if (o.aim !== undefined) {
            // Rückstoß: Die Waffe hebt sich leicht (Drehung) und der Arm zieht sich zurück
            const rueck = o.rueck ?? 0;
            const ang = o.aim + (Math.cos(o.aim) >= 0 ? -1 : 1) * rueck * 0.025;
            const dx = Math.cos(ang), dy = Math.sin(ang);
            const handX = schulter.x + dx * (12 - rueck), handY = schulter.y + dy * (12 - rueck);
            g.lineStyle(6, o.skin, a).beginPath().moveTo(schulter.x, schulter.y).lineTo(handX, handY).strokePath();
            if (o.art === 'sword') {
                // Schwert: in Ruhe schräg nach oben gehalten, beim Hieb schwingt es in einem Bogen von oben nach unten
                const dir = Math.cos(o.aim) >= 0 ? 1 : -1;
                const hieb = o.hieb;
                const klingenWinkel = (w) => o.aim + dir * (-1.5 + 3.0 * w);
                const bw = hieb !== undefined ? klingenWinkel(hieb) : o.aim - dir * 0.6;
                if (hieb !== undefined) {
                    for (let k = 1; k <= 6; k++) {                                          // Schweif hinter der Klinge
                        const wk = klingenWinkel(Math.max(0, hieb - k * 0.045));
                        g.lineStyle(5, 0xffffff, a * (0.32 - k * 0.045)).beginPath().moveTo(handX, handY)
                            .lineTo(handX + Math.cos(wk) * (o.gun + 6), handY + Math.sin(wk) * (o.gun + 6)).strokePath();
                    }
                }
                const bx = Math.cos(bw), by = Math.sin(bw);
                g.lineStyle(5, 0x6a4a2a, a).beginPath().moveTo(handX - bx * 7, handY - by * 7).lineTo(handX + bx * 2, handY + by * 2).strokePath();   // Griff
                g.lineStyle(4, 0xc9a227, a).beginPath().moveTo(handX + bx * 3 - by * 6, handY + by * 3 + bx * 6)
                    .lineTo(handX + bx * 3 + by * 6, handY + by * 3 - bx * 6).strokePath();                                            // Parierstange
                g.lineStyle(5, 0xcfd8e0, a).beginPath().moveTo(handX + bx * 4, handY + by * 4).lineTo(handX + bx * o.gun, handY + by * o.gun).strokePath();   // Klinge
                g.lineStyle(1, 0xffffff, a).beginPath().moveTo(handX + bx * 5, handY + by * 5).lineTo(handX + bx * (o.gun - 1), handY + by * (o.gun - 1)).strokePath();
            } else if (o.art === 'bow') {
                // Bogen: Holzbogen quer zur Zielrichtung, Sehne wird beim Zielen zurückgezogen, ein Pfeil liegt an
                const zug = o.zug ?? 0, px = -dy, py = dx;
                const t1x = handX + px * 24 - dx * 5, t1y = handY + py * 24 - dy * 5, t2x = handX - px * 24 - dx * 5, t2y = handY - py * 24 - dy * 5;
                const nx = handX - dx * (2 + zug * 14), ny = handY - dy * (2 + zug * 14);
                g.lineStyle(4, 0x7a5a2a, a).beginPath().moveTo(t1x, t1y).lineTo(handX + px * 12 + dx * 6, handY + py * 12 + dy * 6)
                    .lineTo(handX + dx * 9, handY + dy * 9).lineTo(handX - px * 12 + dx * 6, handY - py * 12 + dy * 6).lineTo(t2x, t2y).strokePath();
                g.lineStyle(1, 0xe8e0c8, a).beginPath().moveTo(t1x, t1y).lineTo(nx, ny).lineTo(t2x, t2y).strokePath();
                if (zug > 0) {
                    g.lineStyle(5, o.skin, a).beginPath().moveTo(schulter.x, schulter.y).lineTo(nx, ny).strokePath();       // Zugarm
                    g.lineStyle(2, 0xd8c9a0, a).beginPath().moveTo(nx, ny).lineTo(handX + dx * 24, handY + dy * 24).strokePath();   // Pfeilschaft
                    g.fillStyle(0xaab0b8, a).fillTriangle(handX + dx * 31, handY + dy * 31, handX + dx * 23 + px * 3, handY + dy * 23 + py * 3, handX + dx * 23 - px * 3, handY + dy * 23 - py * 3);
                }
            } else if (o.art === 'fist') {
                // Faust: in Ruhe geballt vor dem Körper, beim Hieb schnellt der Arm nach vorn
                const ext = o.hieb !== undefined ? 22 * Math.sin(Math.PI * Math.min(1, o.hieb * 1.2)) : 0;
                const fx2 = handX + dx * ext, fy2 = handY + dy * ext;
                if (ext > 0) g.lineStyle(6, o.skin, a).beginPath().moveTo(handX, handY).lineTo(fx2, fy2).strokePath();
                g.fillStyle(this.dunkler(o.skin, 18), a).fillRect(fx2 - 4, fy2 - 4, 9, 9);
                if (o.hieb !== undefined) g.lineStyle(3, 0xffffff, a * 0.35 * (1 - o.hieb)).beginPath().moveTo(handX - dx * 6, handY - dy * 6).lineTo(fx2 + dx * 8, fy2 + dy * 8).strokePath();
            } else if (o.art === 'grenade') {
                g.fillStyle(0x556b2f, a).fillRect(handX - 1, handY - 6, 9, 11);
                g.fillStyle(0x2a2a2a, a).fillRect(handX + 2, handY - 9, 4, 4);
            } else if (o.art === 'medkit') {
                g.fillStyle(0xf4f4f4, a).fillRect(handX - 2, handY - 7, 14, 12);
                g.fillStyle(0xd62f2f, a).fillRect(handX + 3, handY - 5, 3, 8).fillRect(handX, handY - 2, 9, 3);
            } else {
                g.lineStyle(6, 0x2a2a2a, a).beginPath().moveTo(handX - dx * 6, handY - dy * 6)
                    .lineTo(handX + dx * o.gun, handY + dy * o.gun).strokePath();
                g.lineStyle(3, 0x777777, a).beginPath().moveTo(handX + dx * (o.gun - 8), handY + dy * (o.gun - 8))
                    .lineTo(handX + dx * o.gun, handY + dy * o.gun).strokePath();               // Lauf heller
            }
            g.fillStyle(o.skin, a).fillRect(handX - 3, handY - 3, 6, 6);                     // Hand
        } else if (o.reach) {
            for (const hy2 of [-4, 3]) {
                g.lineStyle(6, o.skin, a).beginPath().moveTo(schulter.x, schulter.y)
                    .lineTo(x + f * 20, y + hy2).strokePath();
                g.fillStyle(this.dunkler(o.skin, 15), a).fillRect(x + f * 20 - 3, y + hy2 - 3, 7, 7);
            }
        }
    }

    // Die große Kreatur: breite Brust, dicke Arme mit Klauen, Hörner, Zähne, glühende Augen.
    drawBoss(g, e) {
        const x = e.x, y = e.y, f = Math.sign(this.player.x - x) || 1, t = this.time.now;
        const body = e.fillColor;
        const dunkel = this.dunkler(body, 35), hell = this.heller(body, 18);
        const geht = Math.abs(e.body.velocity.x) > 20;
        const s = geht ? Math.sin(t * 0.012) * 9 : 0;

        // Beine
        g.fillStyle(dunkel).fillRect(x - 30 + s, y + 20, 26, 30);
        g.fillStyle(dunkel).fillRect(x + 4 - s, y + 20, 26, 30);
        g.fillStyle(0x1a1a1a).fillRect(x - 32 + s, y + 44, 30, 6).fillRect(x + 2 - s, y + 44, 30, 6);

        // Rückenstacheln (auf der abgewandten Seite)
        g.fillStyle(0x1c3a2a);
        for (let i = 0; i < 3; i++) {
            g.fillTriangle(x - f * 40, y - 28 + i * 14, x - f * 40, y - 14 + i * 14, x - f * 56, y - 22 + i * 14);
        }

        // Rumpf mit Brust und Bauch
        g.fillStyle(body).fillRect(x - 40, y - 34, 80, 58);
        g.fillStyle(hell).fillRect(x - 22, y - 12, 44, 30);
        g.fillStyle(dunkel).fillRect(x - 1, y - 34, 2, 50).fillRect(x - 22, y + 2, 44, 2);   // Muskellinien
        g.fillStyle(0x7a2a2a).fillRect(x - 12, y - 26, 6, 10).fillRect(x + 6, y - 22, 5, 8); // Narben

        // Arme mit Klauen (schwingen leicht)
        const sw = Math.sin(t * 0.006) * 4;
        for (const seite of [-1, 1]) {
            const sx = x + seite * 40;
            g.lineStyle(18, dunkel).beginPath().moveTo(sx, y - 24).lineTo(sx + seite * 8, y + 22 + sw).strokePath();
            for (let k = -1; k <= 1; k++) {
                g.fillStyle(0xe8e0c8).fillTriangle(sx + seite * 8 + k * 6 - 3, y + 28 + sw, sx + seite * 8 + k * 6 + 3, y + 28 + sw, sx + seite * 8 + k * 6, y + 42 + sw);
            }
        }

        // Kopf: breit, Kiefer mit Zähnen, Hörner, glühende Augen
        const kx = x + f * 4;
        g.fillStyle(this.dunkler(body, 10)).fillRect(kx - 24, y - 62, 48, 30);
        g.fillStyle(this.dunkler(body, 30)).fillRect(kx - 20, y - 38, 40, 12);                // Unterkiefer
        g.fillStyle(0xffffff);
        for (let i = 0; i < 5; i++) g.fillTriangle(kx - 18 + i * 8, y - 38, kx - 12 + i * 8, y - 38, kx - 15 + i * 8, y - 30);
        g.fillStyle(0xe8e0c8)
            .fillTriangle(kx - 22, y - 60, kx - 12, y - 60, kx - 30, y - 88)
            .fillTriangle(kx + 22, y - 60, kx + 12, y - 60, kx + 30, y - 88);                // Hörner
        const glut = Math.floor(t / 250) % 2 === 0 ? 0xff3333 : 0xff7744;
        g.fillStyle(glut).fillRect(kx - 16, y - 54, 10, 7).fillRect(kx + 6, y - 54, 10, 7);
        if (e.schild) {                                                                      // Schild: eine pulsierende blaue Blase
            const puls = 0.5 + 0.5 * Math.sin(t * 0.008);
            g.fillStyle(0x66bbff, 0.16 + 0.1 * puls).fillEllipse(x, y - 8, 150, 170);
            g.lineStyle(4, 0xaaddff, 0.6 + 0.3 * puls).strokeEllipse(x, y - 8, 150, 170);
            g.lineStyle(2, 0xffffff, 0.35).strokeEllipse(x, y - 8, 134 + puls * 8, 154 + puls * 8);
        }
    }

    // Malt einen Gegenstand mit Animation: Er schwebt auf und ab, Glanz wandert darüber, und es funkelt.
    // Jeder Typ hat sein eigenes Pixelbild (Verbandskasten, Munitionskiste, Granate, Gewehr, Schrotflinte).
    drawPickup(g, it) {
        const t = this.time.now;
        const bob = Math.round(Math.sin(t * 0.004 + it.phase) * 3);     // sanftes Schweben
        const x = it.x, y = it.y + bob;
        let w = 20, h = 16;
        g.fillStyle(0x000000, 0.28).fillRect(x - 9, it.y + 11, 18, 3);      // Schatten am Boden
        if (it.type === 'health') {
            const p = 1 + 0.08 * Math.sin(t * 0.006 + it.phase);          // Herzschlag: pulsiert leicht
            w = 20 * p; h = 16 * p;
            g.fillStyle(0xbfbfbf).fillRect(x - w / 2 - 1, y - h / 2 - 1, w + 2, h + 2);
            g.fillStyle(0xf4f4f4).fillRect(x - w / 2, y - h / 2, w, h);
            g.fillStyle(0xd62f2f).fillRect(x - 2 * p, y - 6 * p, 4 * p, 12 * p).fillRect(x - 6 * p, y - 2 * p, 12 * p, 4 * p);
            g.fillStyle(0x9a9a9a).fillRect(x - 4, y - h / 2 - 3, 8, 3);                 // Griff
        } else if (it.type === 'ammo') {
            w = 22; h = 14;
            g.fillStyle(0x4a3d26).fillRect(x - 12, y - 6, 24, 15);
            g.fillStyle(0x6b5b3a).fillRect(x - 11, y - 5, 22, 13);
            g.fillStyle(0xddaa33).fillRect(x - 11, y, 22, 3);                           // gelbes Band
            for (let k = 0; k < 4; k++) {                                              // Patronen oben in der Kiste
                g.fillStyle(0xc9a227).fillRect(x - 9 + k * 5, y - 12, 3, 8);
                g.fillStyle(0xe0e0e0).fillRect(x - 9 + k * 5, y - 14, 3, 3);
            }
        } else if (it.type === 'grenade') {
            w = 12; h = 15;
            const wackel = Math.round(Math.sin(t * 0.005 + it.phase) * 2);              // wackelt hin und her
            g.fillStyle(0x3d4f22).fillRect(x - 7 + wackel, y - 8, 14, 17);
            g.fillStyle(0x556b2f).fillRect(x - 6 + wackel, y - 7, 12, 15);
            g.fillStyle(0x3d4f22).fillRect(x - 6 + wackel, y - 2, 12, 2).fillRect(x - 6 + wackel, y + 3, 12, 2);   // Rillen
            g.fillStyle(0x2a2a2a).fillRect(x - 3 + wackel, y - 12, 6, 5);               // Zünder
            g.fillStyle(0x888888).fillRect(x + 3 + wackel, y - 13, 8, 3);               // Bügel
            g.fillStyle(0xe8c030).fillRect(x + 8 + wackel, y - 11, 5, 5).fillStyle(0x556b2f).fillRect(x + 9 + wackel, y - 10, 3, 3);   // Ring
        } else if (it.type === 'sword') {                                               // Schwert: steckt schräg, Klinge glänzt
            w = 34; h = 34;
            g.lineStyle(5, 0x6a4a2a).beginPath().moveTo(x - 10, y + 12).lineTo(x - 15, y + 17).strokePath();      // Griff
            g.lineStyle(5, 0xc9a227).beginPath().moveTo(x - 14, y + 4).lineTo(x - 4, y + 14).strokePath();        // Parierstange
            g.lineStyle(6, 0xaab4be).beginPath().moveTo(x - 8, y + 10).lineTo(x + 14, y - 12).strokePath();       // Klinge
            g.lineStyle(2, 0xffffff).beginPath().moveTo(x - 6, y + 8).lineTo(x + 13, y - 11).strokePath();        // Kante
            g.fillStyle(0xeaf4ff).fillRect(x + 12, y - 15, 5, 5);
        } else {                                                                        // Gewehr oder Schrotflinte
            const flinte = it.type === 'shotgun';
            w = flinte ? 42 : 38; h = 12;
            const akzent = flinte ? 0xb5452a : 0xff7a3d;
            g.fillStyle(0x6a4a2a).fillRect(x - w / 2, y - 3, 11, 10);                   // Schaft
            g.fillStyle(0x2a2a2a).fillRect(x - w / 2 + 10, y - 3, w - 18, 6);           // Gehäuse
            g.fillStyle(0x777777).fillRect(x + w / 2 - 12, y - 2, 12, 3);               // Lauf
            if (flinte) g.fillStyle(0x6a4a2a).fillRect(x + 1, y + 3, 12, 4);             // Vorderschaft
            else g.fillStyle(0x333333).fillRect(x - 3, y + 3, 6, 9);                    // Magazin
            g.fillStyle(akzent).fillRect(x - 8, y - 5, 18, 2);                          // farbiger Akzent
        }
        // Glanz: alle 2,4 Sekunden läuft ein heller Streifen von links nach rechts über den Gegenstand
        const ph = (t % 2400) / 2400;
        if (ph < 0.3) {
            const links = x - w / 2, rechts = x + w / 2, sx = links - 4 + (ph / 0.3) * (w + 8);
            const a = Math.max(links, sx), b = Math.min(rechts, sx + 5);
            if (b > a) g.fillStyle(0xffffff, 0.6).fillRect(a, y - h / 2, b - a, h);
        }
        // Funkeln: zwei kleine Sterne blitzen abwechselnd neben dem Gegenstand auf
        for (let k = 0; k < 2; k++) {
            if (Math.sin(t * 0.005 + it.phase * 3 + k * 2.1) < 0.6) continue;
            const px = x + (k ? 1 : -1) * (w / 2 + 5), py = y - h / 2 - 3 - k * 4;
            g.fillStyle(0xffffff, 0.9).fillRect(px - 1, py - 4, 2, 8).fillRect(px - 4, py - 1, 8, 2);
        }
    }

    // Zeichnet die Figur eines Mitspielers (Zustand r kommt aus Mehrspieler.js).
    zeichneFremdenSpieler(g, r) {
        this.zeichneBelebenBalken(g, r.nr, r.x, r.y);
        if (r.z && level.seilbahn) this.zeichneSeilGeraet(g, r.x, r.y);
        if (r.warTot && !r.tot) this.belebtEffekt(r.x, r.y);      // ein Dritter steht wieder auf
        r.warTot = !!r.tot;
        if (r.tot) { this.zeichneLiegend(g, r.x, r.y, SPIELERFARBEN[(r.nr - 1) % 4]); return; }
        const hb = this.hiebVon(r.nr);
        const rueck = Math.max(0, 1 - (r.s ?? 9999) / 130) * ({ pistol: 5, rifle: 3, shotgun: 10 }[r.w] ?? 4);
        this.drawHumanoid(g, r.x, r.y, {
            facing: Math.cos(r.a) >= 0 ? 1 : -1, alpha: 1, body: SPIELERFARBEN[(r.nr - 1) % 4], skin: 0xe0b890, rueck,
            head: 'bandana', strap: true, aim: hb ? hb.a : r.a, gun: WAFFENLAENGE[r.w] ?? 18,
            art: ['sword', 'fist', 'grenade', 'medkit'].includes(r.w) ? r.w : undefined, hieb: hb ? hb.f : undefined,
            moving: Math.abs(r.vx) > 20 && !!r.g, air: !r.g && !r.k,
            klettern: r.k === 1, kPhase: r.y, wand: r.k === 2 ? -1 : (r.k === 3 ? 1 : 0),
        });
    }

    // Zeichnet alle Figuren. Die Rechtecke sind unsichtbar, bleiben aber Körper und Hitbox;
    // ihre Farbe (fillColor) benutzen wir weiter für den Rumpf, damit Aufblitzen und
    // Warnfarben (Gelb, Orange, Lila) automatisch sichtbar bleiben.
    drawCharacters() {
        const g = this.charGfx;
        g.clear();
        const cam = this.cameras.main;
        const mitte = cam.midPoint;

        // --- Spieler ---
        const p = this.player;
        const zp = this.zielPunkt();
        const winkel = Phaser.Math.Angle.Between(p.x, p.y, zp.x, zp.y);
        // Rückstoß: Nach einem Schuss ruckt die Waffe zurück und hebt sich, dann kehrt sie in 130 ms zurück.
        const rueck = Math.max(0, 1 - (this.time.now - (p.lastShotTime ?? -999)) / 130) * ({ pistol: 5, rifle: 3, shotgun: 10 }[p.weapon] ?? 4);
        const meinHieb = this.hiebVon(this.meineNr);
        if (p.tot) this.zeichneLiegend(g, p.x, p.y, SPIELERFARBEN[(this.meineNr - 1) % 4]);
        else this.drawHumanoid(g, p.x, p.y, {
            facing: Math.cos(meinHieb ? meinHieb.a : winkel) >= 0 ? 1 : -1, alpha: p.alpha, body: SPIELERFARBEN[(this.meineNr - 1) % 4], skin: 0xe0b890, rueck,
            head: 'bandana', strap: true, aim: meinHieb ? meinHieb.a : winkel, gun: WAFFENLAENGE[p.auswahl === 2 ? (p.hatSchwert ? 'sword' : 'fist') : p.weapon] ?? 18,
            art: ['', undefined, p.hatSchwert ? 'sword' : 'fist', 'grenade', 'medkit'][p.auswahl], hieb: meinHieb ? meinHieb.f : undefined,
            moving: Math.abs(p.body.velocity.x) > 20 && p.body.blocked.down, air: !p.body.blocked.down && !p.leiter && !p.wand,
            klettern: !!p.leiter, kPhase: p.y, wand: p.wand,
        });
        this.zeichneBelebenBalken(g, this.meineNr, p.x, p.y);
        this.zeichneBelebtAnim(g);

        this.zeichneFlagge(g);
        this.zeichneWarnungen(g);
        if (p.seil) this.zeichneSeilGeraet(g, p.x, p.y);
        if (this.mp) this.mp.zeichne(g, mitte);   // Figuren der Mitspieler

        // --- Gegenstände: schweben, glänzen und funkeln ---
        for (const it of this.pickups) {
            if (!it.active || Math.abs(it.x - mitte.x) > 800 || Math.abs(it.y - mitte.y) > 500) continue;
            this.drawPickup(g, it);
        }

        // --- Fässer: rot mit Rand, Bändern, Glanz und gelbem Warnzeichen. Blinken kurz vor der Explosion. ---
        for (const f of this.faesser) {
            if (!f.active || Math.abs(f.x - mitte.x) > 800 || Math.abs(f.y - mitte.y) > 500) continue;
            const blink = f.zuendet && Math.floor(this.time.now / 60) % 2 === 0;
            g.fillStyle(blink ? 0xffffff : 0xb03a2a).fillRect(f.x - 13, f.y - 19, 26, 38);
            g.fillStyle(blink ? 0xffffff : 0xd05a44).fillRect(f.x - 13, f.y - 19, 4, 38);       // Glanz links
            g.fillStyle(0x7a2218).fillRect(f.x - 13, f.y - 19, 26, 4).fillRect(f.x - 13, f.y + 15, 26, 4);   // Deckel/Boden
            g.fillStyle(0x4a1a14).fillRect(f.x - 13, f.y - 8, 26, 3).fillRect(f.x - 13, f.y + 6, 26, 3);    // Bänder
            g.fillStyle(0xe8c030).fillRect(f.x - 5, f.y - 4, 10, 10);                               // Warnzeichen
            g.fillStyle(0x1a1a1a).fillRect(f.x - 1, f.y - 2, 2, 5).fillRect(f.x - 1, f.y + 4, 2, 2);
        }

        // --- Gegner (nur in der Nähe der Kamera, spart Rechenzeit) ---
        for (const e of this.enemies) {
            if (!e.active || Math.abs(e.x - mitte.x) > 800 || Math.abs(e.y - mitte.y) > 500) continue;
            if (e === this.boss) { this.drawBoss(g, e); continue; }
            if (e.brut) { this.drawBrut(g, e); continue; }
            if (e.skelett) { this.drawSkelett(g, e, p); continue; }
            const dx = p.x - e.x;
            const blick = Math.abs(dx) < 700 ? (Math.sign(dx) || 1) : (e.direction ?? 1);
            const fern = e.range !== undefined;  // nur der Fernkämpfer hat "range"
            this.drawHumanoid(g, e.x, e.y, {
                facing: blick, body: e.fillColor, skin: fern ? 0x8a6fb0 : 0xc88a6a,
                head: fern ? 'hood' : 'mask',
                moving: Math.abs(e.body.velocity.x) > 10, air: !e.body.blocked.down,
                aim: fern ? Phaser.Math.Angle.Between(e.x, e.y, p.x, p.y) : undefined,
                gun: 26, reach: !fern,
                rueck: Math.max(0, 1 - (this.time.now - (e.lastShotTime ?? -999)) / 160) * 6,
            });
        }
    }

    // Aktualisiert Breite, Farbe und Text des Lebensbalkens.
    updateHealthBar() {
        const anteil = this.player.health / this.player.maxHealth;  // 0 bis 1
        this.hpBar.width = 200 * anteil;
        // Unter 30 % wird der Balken rot.
        this.hpBar.setFillStyle(anteil <= 0.3 ? 0xcc3333 : 0x44cc44);
        this.hpText.setText(`HP ${this.player.health} / ${this.player.maxHealth}`);

        this.zeichneHotbar();
    }

    // Blendet eine Meldung oben im Bild ein, die nach etwa zwei Sekunden verblasst.
    showMessage(text) {
        const meldung = this.add.text(this.scale.width / 2, 100, text, {
            fontSize: '24px', color: '#ffdd55', align: 'center',
            backgroundColor: '#000000bb', padding: { x: 14, y: 8 },
        }).setOrigin(0.5).setScrollFactor(0).setDepth(25);
        // Tween: nach 2 Sekunden Wartezeit in 0,6 Sekunden durchsichtig werden, dann löschen.
        this.tweens.add({
            targets: meldung, alpha: 0, delay: 2000, duration: 600,
            onComplete: () => meldung.destroy(),
        });
    }

    // Zeigt die Lebensanzeige der Kreatur, solange sie lebt und erwacht ist.
    updateBossBar() {
        const boss = this.boss;
        const sichtbar = !!boss && boss.active && boss.activated;  // !! macht daraus true/false
        this.bossUI.forEach(obj => obj.setVisible(sichtbar));
        if (sichtbar) {
            this.bossBar.width = 300 * boss.health / boss.maxHealth;
            this.bossBar.setFillStyle(boss.schild ? 0x66bbff : 0xcc3333);
            this.bossLabel.setText(boss.schild ? 'SHIELD ACTIVE: defeat the brood!' : 'MUTATED CREATURE').setColor(boss.schild ? '#88ddff' : '#ffffff');
        }
    }

    // Der Hubschrauber ist gesperrt (rot), solange die Kreatur lebt, danach offen (grün).
    updateEvacZone() {
        const offen = !(this.boss && this.boss.active);
        if (offen === this.evacOpen) return;  // nichts geändert, nichts zu tun
        this.evacOpen = offen;
        const farbe = offen ? 0x66ff99 : 0xff5555;
        this.helicopter.setFillStyle(farbe, 0.18).setStrokeStyle(2, farbe);
        this.evacLabel.setColor(offen ? '#66ff99' : '#ff5555');
        this.evacLabel.setText(offen ? 'EVACUATION' : 'Defeat the creature first!');
    }

    // Zeigt den Endbildschirm (Sieg oder Niederlage) und hält das Spiel an.
    // Titel und Farbe werden übergeben, damit eine Funktion für beide Fälle reicht.
    // untertitel ist optional (Standard: leer), zum Beispiel "Level 01 abgeschlossen".
    showEndScreen(titel, farbe, untertitel = '', statistikText = null, fussText = 'Press Enter to restart') {
        this.gameOver = true;
        sfx.play(titel === 'DEFEATED' ? 'lose' : 'win');
        this.physics.pause();                 // Physik anhalten: alles friert ein
        this.input.setDefaultCursor('default');  // normalen Mauszeiger zurückholen
        this.crosshair.setVisible(false);
        this.player.setAlpha(1);

        // Halbdurchsichtiger dunkler Schleier über dem ganzen Fenster
        this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 0.65)
            .setOrigin(0, 0).setScrollFactor(0).setDepth(30);

        // Statistik: Spielzeit in Minuten:Sekunden. padStart(2, '0') füllt vorne mit Nullen auf,
        // damit 5 Sekunden als "05" erscheinen und nicht als "5".
        const sekunden = Math.floor((this.time.now - this.startTime) / 1000);
        const zeit = `${Math.floor(sekunden / 60)}:${String(sekunden % 60).padStart(2, '0')}`;
        const statistik = statistikText ?? (`Time: ${zeit}     Enemies defeated: ${this.kills} / ${this.totalEnemies}     ` +
                          `Health: ${this.player.health} / ${this.player.maxHealth}`);
        this.endeZeit = zeit;

        // Alle Texte: am Bildschirm festgehalten (ScrollFactor 0) und über dem Schleier (Depth 31).
        const zeige = (y, text, groesse, farbeText) => {
            this.add.text(this.scale.width / 2, y + (this.scale.height - 540) / 2, text, { fontSize: groesse, color: farbeText })
                .setOrigin(0.5).setScrollFactor(0).setDepth(31);
        };
        zeige(180, titel, '72px', farbe);
        if (untertitel) zeige(240, untertitel, '28px', '#ffffff');
        zeige(310, statistik, '20px', '#cfd8dc');
        zeige(380, fussText, '24px', '#ffffff');
    }

    // Online: Der Sieg gehört dem ganzen Team, sobald EIN Spieler den Hubschrauber erreicht hat (auch wenn die anderen
    // gerade nicht mehr leben). Alle Geräte zeigen dasselbe Ende.
    zeigeTeamSieg(nr) {
        if (this.gameOver) return;
        const sekunden = Math.floor((this.time.now - this.startTime) / 1000);
        const zeit = `${Math.floor(sekunden / 60)}:${String(sekunden % 60).padStart(2, '0')}`;
        const anzahl = this.mp ? this.mp.netz.liste().length : 1;
        this.showEndScreen('EVACUATED!', '#66ff99', `Level 01 complete: ${this.mp ? this.mp.netz.nameVon(nr) : 'Player ' + nr} reached the helicopter`,
            `Time: ${zeit}     Team: ${anzahl} players`,
            this.mp && this.mp.netz.rolle === 'host' ? 'Enter: new game for everyone      Esc twice: menu' : 'The host starts the next game      Esc twice: menu');
    }

    // Erzeugt eine feste Fläche und merkt sie sich in der Liste.
    addPlatform(x, y, breite, hoehe, farbe) {
        const rect = this.add.rectangle(x, y, breite, hoehe, farbe);
        this.physics.add.existing(rect, true);  // true = statisch
        this.platforms.push(rect);
    }

    // Erzeugt die Kugeln eines Schusses, die vom Spieler zum Ziel fliegen.
    shoot(zielX, zielY) {
        const p = this.player;
        const winkel = Phaser.Math.Angle.Between(p.x, p.y, zielX, zielY);
        // Mündung: Schulter (y - 6) + 12 Pixel Arm + Waffenlänge in Zielrichtung
        const abstand = 12 + (WAFFENLAENGE[p.weapon] ?? 18);
        const mx = p.x + Math.cos(winkel) * abstand, my = p.y - 6 + Math.sin(winkel) * abstand;
        const gross = { pistol: 1, rifle: 1.1, shotgun: 1.7 }[p.weapon] ?? 1;
        this.fx.muzzleFlash(mx, my, winkel, gross);
        this.fx.sparks(mx, my, 3);
        this.fx.huelse(p.x, p.y - 6, Math.cos(winkel) >= 0 ? 1 : -1);          // Hülse fliegt nach hinten
        if (p.weapon === 'shotgun') { this.fx.muendungsrauch(mx, my); this.cameras.main.shake(110, 0.006); }
        else this.cameras.main.shake(50, 0.0015);
        p.lastShotTime = this.time.now;                                         // für den Rückstoß der Waffe
        sfx.play(p.weapon);  // Geräusch heißt wie die Waffe: pistol, rifle, shotgun
        // Eine Schrotflinte feuert mehrere Kugeln, jede mit zufälliger Abweichung (Streuung).
        const winkelListe = [];
        for (let i = 0; i < p.pellets; i++) winkelListe.push(winkel + Phaser.Math.FloatBetween(-p.spread, p.spread));
        // Ein Gast erzeugt nur Bilder (sofortige Rückmeldung); die echten Kugeln erzeugt der Gastgeber.
        for (const w of winkelListe) this.spawneSpielerKugel(p.x, p.y, w, p.range, this.meineNr, this.istGast);
        if (this.mp) this.mp.meldeSchuss(mx, my, winkel, winkelListe, p.range, p.weapon);
    }

    // Eine Spielerkugel. besitzer = Nummer des Spielers. visuell = nur ein Bild (kein Treffer, kein Schaden).
    spawneSpielerKugel(x, y, winkel, reichweite, besitzer, visuell) {
        const bullet = new Bullet(this, x, y, winkel, 900);
        bullet.id = ++this.bulletZaehler;
        bullet.owner = besitzer;
        bullet.speed = 900;
        bullet.visuell = visuell;
        // Hat die Waffe nur kurze Reichweite, verschwindet die Kugel nach "range" Millisekunden.
        if (reichweite > 0) bullet.diesAt = this.time.now + reichweite;
        // Trifft die Kugel eine Plattform, verschwindet sie.
        this.physics.add.collider(bullet, this.platforms, (b, platte) => {
            if (platte.brechbar && this.rechnet) this.treffeBroeckelig(platte, b.x, b.y);   // nur wer rechnet, zerstört Wände
            this.fx.sparks(b.x, b.y, 3);
            b.destroy();
        });
        this.bullets.push(bullet);
        return bullet;
    }

    // Effekt für einen gestorbenen Gegner: Leiche (kippt vom Spieler weg) oder Boss-Explosionen.
    zeigeTod(enemy) {
        if (enemy === this.boss) {
            this.fx.bossDeath(enemy.x, enemy.y);
        } else {
            this.fx.death(enemy.x, enemy.y, enemy.baseColor, enemy.x < this.player.x ? -1 : 1);
        }
    }

    // ---------- Fensterform ----------

    // Das Fenster hat seine Breite geändert (Drehen, Vollbild): Alles, was mittig oder rechts am Bildschirm hängt, neu setzen.
    layoutHud() {
        if (!this.bossBack || !this.slotRects || !this.touch) return;      // Szene ist noch nicht fertig aufgebaut
        const B = this.scale.width, mitte = B / 2;
        this.bossBack.setX(mitte);
        this.bossBar.setX(mitte - 150);
        this.bossLabel.setX(mitte);
        [100, 200].forEach((dx, i) => this.bossKerben[i].setX(mitte - 150 + dx));
        this.belebenHinweis.setX(mitte);
        if (this.seilHinweis) this.seilHinweis.setX(mitte);
        this.slotX0 = (B - (4 * SLOT + 3 * SLOT_ABSTAND)) / 2;
        for (let i = 0; i < 4; i++) {
            const x = this.slotX0 + i * (SLOT + SLOT_ABSTAND);
            this.slotRects[i].x = x;
            this.slotZahl[i].setPosition(x + 5, this.slotY + 3);
            this.slotTexte[i].setPosition(x + SLOT - 4, this.slotY + SLOT - 17);
        }
        this.slotName.setX(this.slotX0 + (4 * SLOT + 3 * SLOT_ABSTAND) / 2);
        this.touch.layout();
        if (this.mp) this.mp.layout();
        buildVignette(this);
    }

    // ---------- Inventarleiste ----------

    // Ein kleines Symbol für einen Platz (cx, cy = Mitte). dunkel = nicht verfügbar.
    zeichneSymbol(g, art, cx, cy, a = 1) {
        if (art === 'pistol') {
            g.fillStyle(0x2a2a2a, a).fillRect(cx - 14, cy - 8, 26, 9).fillRect(cx - 4, cy - 1, 9, 16);
            g.fillStyle(0x777777, a).fillRect(cx + 8, cy - 8, 6, 4);
        } else if (art === 'rifle') {
            g.fillStyle(0x6a4a2a, a).fillRect(cx - 22, cy - 5, 12, 11);
            g.fillStyle(0x2a2a2a, a).fillRect(cx - 12, cy - 6, 30, 7).fillRect(cx - 4, cy + 1, 7, 11);
            g.fillStyle(0x777777, a).fillRect(cx + 14, cy - 5, 9, 3);
        } else if (art === 'shotgun') {
            g.fillStyle(0x6a4a2a, a).fillRect(cx - 24, cy - 4, 14, 11);
            g.fillStyle(0x2a2a2a, a).fillRect(cx - 12, cy - 6, 34, 6);
            g.fillStyle(0x8a3a22, a).fillRect(cx - 2, cy, 14, 6);
        } else if (art === 'sword') {
            g.lineStyle(5, 0xdfe6ee, a).beginPath().moveTo(cx - 6, cy + 6).lineTo(cx + 18, cy - 18).strokePath();
            g.lineStyle(2, 0xffffff, a).beginPath().moveTo(cx - 4, cy + 4).lineTo(cx + 17, cy - 17).strokePath();
            g.lineStyle(5, 0xc9a227, a).beginPath().moveTo(cx - 12, cy - 2).lineTo(cx + 2, cy + 12).strokePath();
            g.lineStyle(5, 0x6a4a2a, a).beginPath().moveTo(cx - 8, cy + 8).lineTo(cx - 17, cy + 17).strokePath();
        } else if (art === 'fist') {
            g.fillStyle(0xe0b890, a).fillRect(cx - 12, cy - 9, 24, 20);                       // Faust
            g.fillStyle(0xc99a72, a).fillRect(cx - 12, cy + 4, 24, 4);
            for (let k = 0; k < 4; k++) g.fillStyle(0xa87a52, a).fillRect(cx - 10 + k * 6, cy - 9, 2, 8);   // Finger
            g.fillStyle(0xe0b890, a).fillRect(cx - 14, cy + 6, 8, 10);                         // Daumen
            g.fillStyle(0x5a4a3a, a).fillRect(cx - 12, cy + 12, 24, 6);                        // Armband
        } else if (art === 'grenade') {
            g.fillStyle(0x3d4f22, a).fillRect(cx - 9, cy - 7, 18, 21);
            g.fillStyle(0x556b2f, a).fillRect(cx - 8, cy - 6, 16, 19);
            g.fillStyle(0x3d4f22, a).fillRect(cx - 8, cy, 16, 2).fillRect(cx - 8, cy + 6, 16, 2);
            g.fillStyle(0x2a2a2a, a).fillRect(cx - 4, cy - 12, 8, 6);
            g.fillStyle(0xe8c030, a).fillRect(cx + 4, cy - 14, 8, 4);
        } else if (art === 'medkit') {
            g.fillStyle(0xbfbfbf, a).fillRect(cx - 15, cy - 11, 30, 24);
            g.fillStyle(0xf4f4f4, a).fillRect(cx - 14, cy - 10, 28, 22);
            g.fillStyle(0xd62f2f, a).fillRect(cx - 3, cy - 8, 6, 18).fillRect(cx - 9, cy - 2, 18, 6);
            g.fillStyle(0x9a9a9a, a).fillRect(cx - 6, cy - 15, 12, 4);
        }
    }

    erzeugeHotbar() {
        this.hotbar = this.add.graphics().setScrollFactor(0).setDepth(20);
        const stil = { fontSize: '13px', color: '#ffffff', stroke: '#000000', strokeThickness: 3, fontFamily: 'monospace' };
        this.slotX0 = (this.scale.width - (4 * SLOT + 3 * SLOT_ABSTAND)) / 2;
        this.slotY = this.scale.height - SLOT - 14;
        this.slotRects = [];
        this.slotZahl = [];
        this.slotTexte = [];
        for (let i = 0; i < 4; i++) {
            const x = this.slotX0 + i * (SLOT + SLOT_ABSTAND), y = this.slotY;
            this.slotRects.push({ x, y, w: SLOT, h: SLOT });
            this.slotZahl.push(this.add.text(x + 5, y + 3, String(i + 1), { ...stil, color: '#cfd8dc' }).setScrollFactor(0).setDepth(21));
            this.slotTexte.push(this.add.text(x + SLOT - 4, y + SLOT - 17, '', stil).setOrigin(1, 0).setScrollFactor(0).setDepth(21));
        }
        this.slotName = this.add.text(this.slotX0 + (4 * SLOT + 3 * SLOT_ABSTAND) / 2, this.slotY - 14, '', { ...stil, fontSize: '15px', color: '#ffdd55' })
            .setOrigin(0.5).setScrollFactor(0).setDepth(21);
        // Mausrad wechselt den Platz (höchstens alle 120 ms, denn ein Trackpad schickt sehr viele Meldungen)
        this.letztesRad = 0;
        this.input.on('wheel', (pointer, objs, dx, dy) => {
            if (this.player.tot || this.gameOver || this.time.now - this.letztesRad < 120) return;
            this.letztesRad = this.time.now;
            this.player.naechster(dy > 0 ? 1 : -1);
        });
    }

    zeichneHotbar() {
        const p = this.player, g = this.hotbar;
        g.clear();
        const namen = ['', p.weaponName, p.hatSchwert ? 'Sword  (click: strike)' : 'Fist  (a sword lies somewhere in the caves)',
            'Grenade  (click: throw, G)', 'Medkit  (click: heal, H)'];
        const arten = ['', p.weapon, p.hatSchwert ? 'sword' : 'fist', 'grenade', 'medkit'];
        const leer = p.magAmmo === 0 && p.ammo === 0;
        for (let i = 1; i <= 4; i++) {
            const x = this.slotX0 + (i - 1) * (SLOT + SLOT_ABSTAND), y = this.slotY;
            const gewaehlt = p.auswahl === i;
            const gesperrt = false;
            const keins = (i === 3 && p.grenades === 0) || (i === 4 && p.medkits === 0);
            g.fillStyle(gewaehlt ? 0x3a4450 : 0x161b20, 0.85).fillRect(x, y, SLOT, SLOT);
            g.lineStyle(gewaehlt ? 4 : 2, gewaehlt ? 0xffdd55 : 0x55616b, 1).strokeRect(x, y, SLOT, SLOT);
            if (gesperrt) {
                this.zeichneSymbol(g, 'sword', x + SLOT / 2, y + SLOT / 2 - 3, 0.18);
                this.slotTexte[i - 1].setText('?').setColor('#667788');
            } else {
                this.zeichneSymbol(g, arten[i], x + SLOT / 2, y + SLOT / 2 - 3, keins ? 0.3 : 1);
            }
            const t = this.slotTexte[i - 1];
            if (i === 1) t.setText(p.isReloading() ? '...' : `${p.magAmmo}/${p.ammo}`).setColor(leer ? '#ff4444' : (p.isReloading() || p.magAmmo === 0 ? '#ff9944' : '#ffdd55'));
            else if (i === 3) t.setText(`x${p.grenades}`).setColor(keins ? '#ff6666' : '#b5c96a');
            else if (i === 4) t.setText(`x${p.medkits}`).setColor(keins ? '#ff6666' : '#66ee99');
            else if (i === 2 && !gesperrt) t.setText('');
            if (i === 1 && p.isReloading()) {                         // Nachladebalken auf dem Platz der Schusswaffe
                const anteil = 1 - Math.max(0, p.reloadingUntil - this.time.now) / p.reloadTime;
                g.fillStyle(0x000000, 0.7).fillRect(x + 4, y + SLOT - 8, SLOT - 8, 5);
                g.fillStyle(0xff9944).fillRect(x + 5, y + SLOT - 7, (SLOT - 10) * anteil, 3);
            }
            if (i === 4 && p.medkits > 0 && p.health >= p.maxHealth) g.fillStyle(0x000000, 0.35).fillRect(x + 1, y + 1, SLOT - 2, SLOT - 2);   // Leben voll: heilen sinnlos
        }
        this.slotName.setText(namen[p.auswahl]);
    }

    // ---------- Nahkampf ----------

    // Ein Schwerthieb (dieses Gerät): Schwung zeigen, Treffer berechnen (Gastgeber) bzw. melden (Gast).
    nahkampf() {
        const p = this.player;
        const zp = this.zielPunkt();
        const winkel = Phaser.Math.Angle.Between(p.x, p.y - 6, zp.x, zp.y);
        const schwert = p.hatSchwert;
        this.hiebStart(this.meineNr, winkel, schwert);
        if (this.istGast) this.mp.meldeHieb(Math.round(p.x), Math.round(p.y), winkel, schwert);
        else this.hiebTreffer(this.meineNr, p.x, p.y, winkel, schwert);
        if (this.istHost) this.mp.sendeAnAlleAusser(this.meineNr, { t: 'fx', k: 'hieb', n: this.meineNr, a: winkel, s: schwert ? 1 : 0 });
    }

    // Nur die Optik und der Ton eines Hiebs (für jeden Spieler, auch bei den anderen).
    hiebStart(nr, winkel, schwert) {
        this.hiebe = this.hiebe.filter((h) => h.nr !== nr);
        this.hiebe.push({ nr, a: winkel, t0: this.time.now });
        sfx.play(schwert ? 'schwert' : 'throw');
    }

    // Wie weit ist der Hieb dieses Spielers? (undefined = kein Hieb, sonst 0 bis 1) und sein Winkel.
    hiebVon(nr) {
        const h = this.hiebe.find((x) => x.nr === nr);
        if (!h) return undefined;
        const f = (this.time.now - h.t0) / HIEB_DAUER;
        return f >= 1 ? undefined : { f, a: h.a };
    }

    // Wer trifft der Hieb? Nur Gastgeber/Einzelspieler. Alles im Bogen vor dem Schwert nimmt Schaden, Gegnerkugeln werden abgewehrt.
    hiebTreffer(nr, x, y, winkel, schwert = true) {
        if (!this.rechnet) return;
        const reichweite0 = schwert ? HIEB_REICHWEITE : FAUST_REICHWEITE, schaden = schwert ? HIEB_SCHADEN : 1;
        let traf = false;
        for (const e of this.enemies) {
            if (!e.active) continue;
            const dx = e.x - x, dy = e.y - y, d = Math.hypot(dx, dy);
            const reichweite = reichweite0 + e.displayWidth / 2;
            if (d > reichweite) continue;
            if (d > 34 && Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(dy, dx) - winkel)) > 1.2) continue;     // nicht im Bogen
            traf = true;
            if (e.takeDamage(schaden)) this.gegnerStirbt(e);
            else this.zeigeBlut(e.x, e.y, 8);
        }
        this.enemies = this.enemies.filter((e) => e.active);
        for (const k of this.enemyBullets) {                  // Kugeln mit dem Schwert abwehren (die Faust kann das nicht)
            if (!k.active || !schwert) continue;
            const dx = k.x - x, dy = k.y - y;
            if (Math.hypot(dx, dy) > HIEB_REICHWEITE + 10) continue;
            if (Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(dy, dx) - winkel)) > 1.2) continue;
            this.fx.sparks(k.x, k.y, 6);
            k.destroy();
            traf = true;
        }
        if (traf) sfx.play(schwert ? 'schwertHit' : 'hit');
    }

    // ---------- Wände ----------

    // Ist die Wand neben dem Spieler hoch genug für den Wandsprung? (Sie muss über seinen Kopf ragen: Treppenstufen und
    // Plattformkanten zählen nicht.) dir = -1 links, 1 rechts.
    hoheWand(p, dir) {
        const b = p.body;
        const x = dir < 0 ? b.left - 3 : b.right + 3, y = b.top - 8;
        for (const pl of this.platforms) {
            const pb = pl.body;
            if (pb && x >= pb.left && x <= pb.right && y >= pb.top && y <= pb.bottom) return true;
        }
        return false;
    }

    // ---------- Leitern ----------

    // Malt alle Leitern (fest): zwei Holm-Schienen mit Sprossen. Holz oder Stahl.
    baueLeitern() {
        const g = this.add.graphics().setDepth(2.4);
        for (const l of this.leitern) {
            const stahl = l.art === 'stahl';
            const holm = stahl ? 0x59626a : 0x7a5a2a, dunkel = stahl ? 0x3a4046 : 0x4a331d, spr = stahl ? 0x7a848c : 0x8a6a38;
            for (const dx of [-10, 7]) {
                g.fillStyle(dunkel).fillRect(l.x + dx, l.oben, 4, l.unten - l.oben);
                g.fillStyle(holm).fillRect(l.x + dx, l.oben, 3, l.unten - l.oben);
            }
            for (let y = l.oben + 6; y < l.unten - 2; y += 14) {
                g.fillStyle(dunkel).fillRect(l.x - 10, y + 2, 21, 4);
                g.fillStyle(spr).fillRect(l.x - 10, y, 21, 3);
            }
            g.fillStyle(0x2a2a2a).fillRect(l.x - 13, l.oben - 2, 5, 4).fillRect(l.x + 9, l.oben - 2, 5, 4);   // Halterungen oben
        }
    }

    // Steht der Spieler so, dass er an eine Leiter greifen kann? richtung -1 = nach oben, 1 = nach unten.
    leiterFuer(p, richtung) {
        const fuss = p.body.bottom;
        for (const l of this.leitern) {
            const dx = Math.abs(p.x - l.x);
            const reichweite = Math.max(26, (l.ausX ?? 22) + 6);                       // auch dort, wo man nach dem Ausstieg steht
            const aufLeiter = dx < reichweite && fuss > l.oben + 2 && fuss <= l.unten + 8;
            if (richtung < 0 && aufLeiter) return l;
            if (richtung > 0) {
                if (aufLeiter) return l;
                // oben auf der Plattform neben dem Ausstieg stehen und nach unten drücken
                if (Math.abs(p.x - (l.x + l.seite * (l.ausX ?? 22))) < 26 && Math.abs(fuss - l.oben) < 8) return l;
            }
        }
        return null;
    }

    // ---------- Abgründe ----------

    // Fällt der Spieler aus dem Bild (bodenlose Spalte), kostet das Leben, und er steht wieder an der letzten sicheren Stelle,
    // die er mindestens eine Sekunde vorher betreten hatte (also vor dem Anlauf). Stirbt er dabei, liegt er dort am Boden.
    pruefeAbsturz() {
        const p = this.player, jetzt = this.time.now;
        if (!p.tot && !p.leiter && !p.seil && p.body.blocked.down && jetzt > this.naechsteSichere) {
            this.naechsteSichere = jetzt + 250;
            this.sichere.push({ x: p.x, y: p.y, t: jetzt });
            if (this.sichere.length > 24) this.sichere.shift();
        }
        if (p.tot || p.y < WORLD_HEIGHT - 150) return;
        let ort = null;
        for (let i = this.sichere.length - 1; i >= 0; i--) { if (jetzt - this.sichere[i].t >= 1000) { ort = this.sichere[i]; break; } }
        ort = ort ?? this.sichere[0] ?? { x: this.checkpoint ? this.checkpoint.x : 200, y: BODEN - 100 };
        p.health = Math.max(0, p.health - 35);
        p.body.reset(ort.x, ort.y - 4);
        p.invulnerableUntil = jetzt + 1500;
        sfx.play('hurt');
        this.cameras.main.flash(300, 0, 0, 0);
        this.showMessage('You fell into the abyss!\nBack on safe ground.');
        this.letzteHP = p.health;
    }

    // ---------- Zielen und Touch ----------

    // Wohin zielt der Spieler? Mit Maus: der Mauszeiger. Am Handy: die Richtung des Zielsticks (oder des letzten Schnellschusses).
    zielPunkt() {
        if (this.touch && this.touch.aktiv) return this.touch.zielPunkt(this.player);
        const pointer = this.input.activePointer;
        return { x: pointer.worldX, y: pointer.worldY };
    }

    // Vollbild an/aus. Auf dem iPhone (Safari) gibt es das nicht: Dort hilft nur "Zum Home-Bildschirm" und das Spiel von dort öffnen.
    vollbildUmschalten() {
        if (!this.scale.fullscreen.available) {
            this.showMessage('Fullscreen is not available in this browser.\niPhone: tap the Share icon, then "Add to Home Screen"\nand open the game from there.');
            return;
        }
        try {
            this.scale.toggleFullscreen();
            if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {});
        } catch (e) { /* egal */ }
    }

    // Der Pause-Knopf der Touch-Steuerung (statt Esc).
    touchPause() {
        if (this.gameOver) {
            if (this.mp) this.mp.escDruecken(); else this.scene.start('MenuScene');
            return;
        }
        if (this.mp) { this.mp.escDruecken(); return; }
        this.scene.launch('PauseScene');
        this.scene.pause();
    }

    nimmEndeTipp() {
        const t = this.touch.endeTipp;
        this.touch.endeTipp = false;
        return t;
    }

    // ---------- Checkpoint (große Fahne) ----------

    // Die festen Teile jeder Fahne: Mast, Knauf und Sockel (der Stoff wird jedes Bild neu gemalt).
    baueFlagge() {
        this.flaggen = (level.flaggen ?? []).map((f) => ({ ...f, erreicht: false, hissStart: 0 }));
        for (const f of this.flaggen) {
            const g = this.add.graphics().setDepth(2.7);
            g.fillStyle(0x4a4f55).fillRect(f.x - 18, f.y - 14, 36, 14);              // Sockel aus Steinen
            g.fillStyle(0x5e646b).fillRect(f.x - 18, f.y - 14, 36, 4);
            g.fillStyle(0x2f3338).fillRect(f.x - 3, f.y - 194, 6, 182);              // Mast
            g.fillStyle(0x6b7178).fillRect(f.x - 1, f.y - 194, 2, 182);
            g.fillStyle(0xe8c030).fillRect(f.x - 6, f.y - 202, 12, 10);              // goldener Knauf
            g.fillStyle(0xfff0a0).fillRect(f.x - 4, f.y - 200, 4, 4);
        }
    }

    // Der Stoff aller Fahnen. Noch nicht erreicht: schlaff unten am Mast. Erreicht: wird langsam (4 Sekunden) nach oben gehisst und weht dann grün.
    zeichneFlagge(g) {
        const t = this.time.now;
        for (const f of this.flaggen ?? []) {
            const hiss = f.erreicht ? Math.min(1, (t - f.hissStart) / 4000) : 0;
            const oben = f.y - 190 + (1 - hiss) * 112, breite = 112, hoehe = 66;
            const fertig = hiss >= 1;
            const hell = fertig ? 0x4fd477 : 0xc23a3a, dunkel = fertig ? 0x2f9a52 : 0x8a2626;
            const wehen = f.erreicht ? 1 : 0.25;                                       // unten hängt der Stoff fast still
            const breiteJetzt = f.erreicht ? breite : 44;
            for (let i = 0; i < breiteJetzt; i += 8) {
                const welle = Math.sin(t * 0.004 - i * 0.1) * (1 + i * 0.07) * wehen;
                const h = (f.erreicht ? hoehe - i * 0.14 : 40 - i * 0.5);
                g.fillStyle(((i / 8) | 0) % 2 ? hell : dunkel).fillRect(f.x + 3 + i, oben + welle, 8, h);
                g.fillStyle(0x000000, 0.18).fillRect(f.x + 3 + i, oben + welle + h - 4, 8, 4);        // Saum
            }
            if (f.erreicht) {
                const ew = Math.sin(t * 0.004 - 4) * 2;                                 // Emblem: ein weißes Kreuz auf dem Stoff
                g.fillStyle(0xffffff, 0.9).fillRect(f.x + 36, oben + 14 + ew, 8, 32).fillRect(f.x + 24, oben + 26 + ew, 32, 8);
            }
            if (fertig) g.fillStyle(0x66ff99, 0.10 + 0.05 * Math.sin(t * 0.005)).fillCircle(f.x + 55, oben + 32, 80);   // leuchtender Schein
        }
    }

    // Kommt ein lebender Spieler an einer noch nicht erreichten Fahne vorbei, ist dieser Checkpoint erreicht.
    pruefeFlagge() {
        if (this.player.tot) return;
        const p = this.player;
        (this.flaggen ?? []).forEach((f, i) => {
            if (f.erreicht) return;
            if (p.x >= f.x - 24 && p.x <= f.x + 140 && p.y > f.y - 140 && p.y < f.y + 30) {
                this.checkpointErreicht(false, i);
                if (this.mp) this.mp.meldeCheckpoint(i);
            }
        });
    }

    checkpointErreicht(vomNetz, nr = 0) {
        const f = this.flaggen && this.flaggen[nr];
        if (!f || f.erreicht) return;
        f.erreicht = true;
        f.hissStart = this.time.now;
        if (!this.checkpoint || f.x > this.checkpoint.x) this.checkpoint = { x: f.x + 50, y: f.y - 40 };   // zählt immer die am weitesten erreichte Fahne
        sfx.play('win');
        this.fx.pickup(f.x, f.y - 60, 0x66ee88, 'CHECKPOINT');
        this.showMessage(vomNetz ? 'The team reached a checkpoint!\nYou restart here after dying.' : 'Checkpoint reached!\nYou restart here after dying.');
    }

    // Einzelspieler: Leben auf null, aber es gibt einen Checkpoint. Man liegt kurz am Boden und steht dann an der Fahne wieder auf.
    sterbeEinzel() {
        const p = this.player;
        p.loslassen(0, 0);
        p.tot = true;
        p.body.setVelocity(0, 0);
        sfx.play('lose');
        this.cameras.main.shake(250, 0.01);
        this.showMessage('You have fallen!\nRestarting at the checkpoint ...');
        this.respawnZeit = this.time.now + 2200;
    }

    // Zurück an die Fahne: volles Leben, etwas Munition, kurzer Schutz.
    respawnAnCheckpoint() {
        if (!this.checkpoint) return;
        const p = this.player;
        if (p.seil) this.seilLoslassen(false);
        p.tot = false;
        p.health = p.maxHealth;
        p.invulnerableUntil = this.time.now + 2500;
        p.setPosition(this.checkpoint.x + (this.meineNr - 1) * 26, this.checkpoint.y);
        p.body.reset(p.x, p.y);
        p.ammo = Math.max(p.ammo, 30);
        p.magAmmo = p.magSize;
        p.reloadingUntil = 0;
        p.medkits = Math.max(p.medkits, 1);
        p.grenades = Math.max(p.grenades, 2);
        this.cameras.main.startFollow(p, true, 0.1, 0.1);
        this.cameras.main.flash(400, 200, 255, 220);
        this.fx.pickup(p.x, p.y, 0x66ee88, '');
        sfx.play('heal');
        this.showMessage('Back at the checkpoint!');
        this.letzteHP = p.health;
        this.wipeSeit = 0;
        this.sichere = [];
    }

    // ---------- Seilbahn ----------

    // Die feste Hälfte: Seil, Startturm, Endturm und Gittermasten dazwischen.
    baueSeilbahn() {
        const sb = level.seilbahn;
        if (!sb) return;
        const g = this.add.graphics().setDepth(2.6);
        const steigung = (sb.y1 - sb.y0) / (sb.x1 - sb.x0);
        const seilY = (x) => sb.y0 + (x - sb.x0) * steigung;
        const mast = (x, unten, oben, b) => {
            g.lineStyle(4, 0x3a4046).beginPath().moveTo(x - b, unten).lineTo(x - 4, oben).strokePath();
            g.lineStyle(4, 0x3a4046).beginPath().moveTo(x + b, unten).lineTo(x + 4, oben).strokePath();
            const h = unten - oben, stufen = Math.max(2, Math.round(h / 46));
            g.lineStyle(2, 0x59626a);
            for (let k = 0; k < stufen; k++) {
                const u0 = k / stufen, u1 = (k + 1) / stufen;
                const l0 = x - b + (b - 4) * u0, r0 = x + b - (b - 4) * u0, l1 = x - b + (b - 4) * u1, r1 = x + b - (b - 4) * u1;
                const y0 = unten - h * u0, y1 = unten - h * u1;
                g.beginPath().moveTo(l0, y0).lineTo(r1, y1).strokePath();
                g.beginPath().moveTo(r0, y0).lineTo(l1, y1).strokePath();
                g.beginPath().moveTo(l1, y1).lineTo(r1, y1).strokePath();
            }
            g.fillStyle(0x2f3338).fillRect(x - 14, oben - 2, 28, 5);                       // Querträger
            g.fillStyle(0x80878e).fillCircle(x, oben - 4, 6);                              // Seilrolle
            g.fillStyle(0xc9a227).fillRect(x - 2, oben - 12, 4, 4);                        // Warnlicht
        };
        for (const m of sb.masten) mast(m.x, m.boden, seilY(m.x) + 6, 22);
        mast(sb.x0 + 14, BODEN - 544, sb.y0 + 6, 14);                                      // Startturm auf dem Gipfel
        g.fillStyle(0x6b4a2a).fillRect(sb.x0 + 14, BODEN - 544 - 22, 34, 22);              // Winden-Häuschen
        g.fillStyle(0x4a331d).fillRect(sb.x0 + 14, BODEN - 544 - 22, 34, 4);
        g.fillStyle(0xd9b43a).fillRect(sb.x0 + 24, BODEN - 544 - 14, 10, 8);
        mast(sb.x1, BODEN, sb.y1 + 6, 20);                                                 // Endturm vor der Arena
        // das Seil selbst: dunkel, mit hellem Glanz
        g.lineStyle(4, 0x1f2326).beginPath().moveTo(sb.x0, sb.y0).lineTo(sb.x1, sb.y1).strokePath();
        g.lineStyle(1, 0x9aa3ab, 0.9).beginPath().moveTo(sb.x0, sb.y0 - 2).lineTo(sb.x1, sb.y1 - 2).strokePath();
        this.seilHinweis = this.add.text(this.scale.width / 2, this.scale.height - 130, 'E: hook onto the zipline', {
            fontSize: '22px', color: '#ffffff', backgroundColor: '#000000aa', padding: { x: 12, y: 6 },
        }).setOrigin(0.5).setScrollFactor(0).setDepth(25).setVisible(false);
        this.seilSteigung = steigung;
        this.seilNaechsterTon = 0;
    }

    seilYBei(x) { const sb = level.seilbahn; return sb.y0 + (x - sb.x0) * this.seilSteigung; }

    // Jedes Bild: einhängen (E), mitfahren, loslassen (Leertaste) und am Ende abspringen.
    seilUpdate() {
        const sb = level.seilbahn, p = this.player;
        if (!sb || this.gameOver) return;
        if (p.seil) {
            if (p.tot) { this.seilLoslassen(false); return; }
            const laenge = Math.hypot(sb.x1 - sb.x0, sb.y1 - sb.y0);
            const ux = (sb.x1 - sb.x0) / laenge, uy = (sb.y1 - sb.y0) / laenge;
            p.body.setVelocity(ux * SEIL_TEMPO, uy * SEIL_TEMPO);
            p.y = this.seilYBei(p.x) + SEIL_HANG;                              // bleibt am Seil hängen
            if (this.time.now > this.seilNaechsterTon) { this.seilNaechsterTon = this.time.now + 140; sfx.play('seil'); }
            if (Phaser.Input.Keyboard.JustDown(p.keys.SPACE) || this.touch.sprungTipp) this.seilLoslassen(true);
            else if (p.x >= sb.x1) this.seilLoslassen(false);
            return;
        }
        const nah = !p.tot && Math.abs(p.x - sb.x0) < 80 && Math.abs(p.y - (sb.y0 + SEIL_HANG)) < 120;
        this.seilHinweis.setVisible(nah && !this.touch.aktiv);
        if (nah) this.touch.interaktionText = 'Zipline';
        if (nah && this.time.now > (p.seilPause ?? 0) && (Phaser.Input.Keyboard.JustDown(p.keys.E) || this.touch.eTippAktuell)) {
            p.seil = true;
            this.seilHinweis.setVisible(false);
            p.body.allowGravity = false;
            p.x = sb.x0;
            p.y = sb.y0 + SEIL_HANG;
            sfx.play('throw');
            this.showMessage('Space: let go');
        }
    }

    seilLoslassen(abspringen) {
        const sb = level.seilbahn, p = this.player;
        if (!p.seil) return;
        p.seil = null;
        p.seilPause = this.time.now + 600;
        p.body.allowGravity = true;
        const laenge = Math.hypot(sb.x1 - sb.x0, sb.y1 - sb.y0);
        const vx = (sb.x1 - sb.x0) / laenge * SEIL_TEMPO, vy = (sb.y1 - sb.y0) / laenge * SEIL_TEMPO;
        p.body.setVelocity(vx * (abspringen ? 0.8 : 0.9), abspringen ? -260 : vy * 0.4);
        this.seilHinweis.setVisible(false);
    }

    // Rolle, Aufhängung und erhobene Arme eines Fahrgasts (x, y = Körpermitte).
    zeichneSeilGeraet(g, x, y) {
        const ky = y - SEIL_HANG;
        g.fillStyle(0x555b61).fillRect(x - 9, ky - 6, 18, 9);
        g.fillStyle(0x9aa3ab).fillCircle(x - 6, ky - 1, 4).fillCircle(x + 6, ky - 1, 4);
        g.lineStyle(2, 0x222222).beginPath().moveTo(x, ky + 3).lineTo(x, y - 32).strokePath();
        g.fillStyle(0xc9a227).fillRect(x - 10, y - 34, 20, 4);                            // Haltegriff
        g.lineStyle(5, 0xe0b890).beginPath().moveTo(x - 4, y - 8).lineTo(x - 9, y - 32).strokePath();
        g.lineStyle(5, 0xe0b890).beginPath().moveTo(x + 4, y - 8).lineTo(x + 9, y - 32).strokePath();
    }

    // ---------- Schwierigkeit: Brut und Steinschlag ----------

    anzahlSpieler() { return this.online ? Math.max(1, this.mp.netz.liste().length) : 1; }

    // Weckt n schlafende Brutlinge (Gastgeber/Einzelspieler). Gibt die geweckten Brutlinge zurück.
    weckeBrut(n) {
        const geweckt = [];
        for (const g of this.gegnerNachId) {
            if (geweckt.length >= n) break;
            if (g.brut && g.schlaeft) { this.wecke(g); geweckt.push(g); }
        }
        return geweckt;
    }

    wecke(g) {
        if (!g.schlaeft) return;
        g.schlaeft = false;
        if (!g.istGeist) { g.body.enable = true; g.body.reset(g.x, g.y); }
        this.enemies.push(g);
        this.effektLokal('druckwelle', g.x, g.y + 18);
        this.fx.dust(g.x, g.y + 18);
        sfx.play('roar');
        if (this.istHost) this.mp.sendeAnAlle({ t: 'fx', k: 'weck', id: g.id });
    }

    // Rote Kreise am Boden: Hier schlägt gleich etwas ein. (Gastgeber meldet sie an die Gäste.)
    warnung(x, dauer) {
        this.warnungen.push({ x, t0: this.time.now, bis: this.time.now + dauer });
        if (this.istHost) this.mp.sendeAnAlle({ t: 'fx', k: 'warn', x, d: dauer });
    }

    // Felsbrocken stürzen an den gewarnten Stellen herab. Plattformen schützen: Wer sich darunter stellt, ist sicher.
    steinschlag(stellen, verzoegerung) {
        this.time.delayedCall(verzoegerung, () => {
            if (this.gameOver) return;
            for (const x of stellen) this.spawnEnemyBullet(x, BODEN - 460, Math.PI / 2, 640, 20, true);
        });
    }

    zeichneWarnungen(g) {
        const jetzt = this.time.now;
        this.warnungen = this.warnungen.filter((w) => jetzt < w.bis);
        for (const w of this.warnungen) {
            const blink = 0.35 + 0.25 * Math.sin(jetzt * 0.02);
            g.fillStyle(0xff2222, blink * 0.6).fillEllipse(w.x, BODEN - 4, 90, 16);
            g.lineStyle(3, 0xff4444, blink + 0.3).strokeEllipse(w.x, BODEN - 4, 90, 16);
            g.lineStyle(2, 0xff4444, blink * 0.5).beginPath().moveTo(w.x, BODEN - 12).lineTo(w.x, BODEN - 160).strokePath();
        }
    }

    // Ein Skelett mit Bogen: Beim Zielen (Körper leuchtet gelb) ist der Bogen gespannt, sonst hängt die Sehne locker.
    drawSkelett(g, e, p) {
        const dx = p.x - e.x;
        const blick = Math.abs(dx) < 700 ? (Math.sign(dx) || 1) : (e.direction ?? 1);
        this.drawHumanoid(g, e.x, e.y, {
            facing: blick, body: e.fillColor, skin: 0xd8d4c0, head: 'skull', rippen: true,
            moving: Math.abs(e.body.velocity.x) > 10, air: !e.body.blocked.down,
            aim: Phaser.Math.Angle.Between(e.x, e.y, p.x, p.y), gun: 26, art: 'bow', zug: e.fillColor === 0xffee55 ? 1 : 0,
            rueck: Math.max(0, 1 - (this.time.now - (e.lastShotTime ?? -999)) / 160) * 4,
        });
    }

    // Ein Brutling: klein, mit Stacheln und leuchtenden Augen.
    drawBrut(g, e) {
        const f = Math.sign(this.player.x - e.x) || 1, t = this.time.now;
        const x = e.x, y = e.y, body = e.fillColor, dunkel = this.dunkler(body, 35);
        const s = Math.sin(t * 0.03) * 4;
        g.fillStyle(dunkel).fillRect(x - 12 + s, y + 8, 6, 10).fillRect(x + 6 - s, y + 8, 6, 10);                 // Beine
        g.fillStyle(body).fillRect(x - 13, y - 14, 26, 24);                                                        // Körper
        g.fillStyle(this.heller(body, 20)).fillRect(x - 13, y - 14, 26, 4);
        g.fillStyle(0x3a1a2c);
        for (let i = 0; i < 3; i++) g.fillTriangle(x - 10 + i * 9, y - 14, x - 5 + i * 9, y - 14, x - 7 + i * 9, y - 24);   // Rückenstacheln
        g.fillStyle(0xff4455).fillRect(x + f * 4 - 3, y - 7, 4, 4).fillRect(x + f * 10 - 3, y - 7, 4, 4);        // Augen
        g.fillStyle(0xffffff).fillRect(x + f * 6 - 3, y + 2, 8, 3);                                              // Zähne
    }

    // ---------- Mehrspieler: Welt ----------

    // Wen soll dieser Gegner angreifen? Den nächsten lebenden Spieler (online auch die Mitspieler).
    zielFuer(wer) {
        if (!this.mp) return this.player;
        let bestes = null, besteEntfernung = Infinity;
        const pruefe = (z) => {
            const d = (z.x - wer.x) ** 2 + (z.y - wer.y) ** 2;
            if (d < besteEntfernung) { besteEntfernung = d; bestes = z; }
        };
        if (!this.player.tot) pruefe(this.player);
        for (const r of this.mp.fern.values()) if (!r.tot) pruefe(r);
        return bestes ?? this.player;
    }

    // Alle Spieler, die gerade Schaden nehmen können: [{ nr, rect }]
    alleZiele() {
        const liste = [];
        if (!this.player.tot) liste.push({ nr: this.meineNr, rect: this.player.getBounds() });
        if (this.mp) {
            for (const r of this.mp.fern.values()) {
                if (!r.tot) liste.push({ nr: r.nr, rect: new Phaser.Geom.Rectangle(r.x - 16, r.y - 24, 32, 48) });
            }
        }
        return liste;
    }

    // Schaden an einem Spieler (nur Gastgeber bzw. Einzelspieler). Für Mitspieler geht eine Meldung an ihr Gerät: Dort gilt
    // wie sonst die Sekunde Unverwundbarkeit. Der Gastgeber merkt sie sich auch, um nicht jedes Bild eine Meldung zu schicken.
    schadeAnSpieler(nr, menge, vonX) {
        if (nr === this.meineNr) { this.player.takeDamage(menge, vonX); return; }
        const r = this.mp && this.mp.fern.get(nr);
        if (!r || r.tot || this.time.now < (r.schutzBis ?? 0)) return;
        r.schutzBis = this.time.now + 1000;
        this.mp.sendeAn(nr, { t: 'schaden', m: menge, x: vonX });
    }

    // Ein Gegner ist gestorben (Gastgeber/Einzelspieler): zählen, Leiche zeigen, den Gästen Bescheid sagen.
    gegnerStirbt(enemy) {
        if (!enemy.brut) this.kills += 1;
        this.zeigeTod(enemy);
        if (this.istHost) this.mp.sendeAnAlle({ t: 'tot', id: enemy.id });
    }

    // Die Gäste bekommen die Todesmeldung: Leiche zeigen und die Attrappe entfernen.
    gegnerTotEmpfangen(d) {
        const g = this.gegnerNachId[d.id];
        if (!g || !g.active) return;
        this.zeigeTod(g);
        g.destroy();
        this.enemies = this.enemies.filter((e) => e.active);
    }

    zeigeBlut(x, y, n = 8) { this.zeigeEffekt('blut', x, y, 0, n); }

    // Ein Effekt, den alle sehen sollen: wird hier gezeigt und vom Gastgeber an die Gäste verteilt.
    zeigeEffekt(art, x, y, a = 0, g = 1, f = 0xffdd55) {
        this.effektLokal(art, x, y, a, g, f);
        if (this.istHost) this.mp.sendeAnAlle({ t: 'fx', k: art, x, y, a, g, f });
    }

    effektLokal(art, x, y, a, g, f) {
        if (art === 'muendung') this.fx.muzzleFlash(x, y, a, g, f);
        else if (art === 'druckwelle') this.fx.druckwelle(x, y);
        else if (art === 'blut') this.fx.blood(x, y, g);
    }

    // Mündungsfeuer, Funken und Ton eines Schusses von jemand anderem.
    zeigeSchussEffekt(mx, my, winkel, waffe) {
        const gross = { pistol: 1, rifle: 1.1, shotgun: 1.7 }[waffe] ?? 1;
        this.fx.muzzleFlash(mx, my, winkel, gross);
        this.fx.sparks(mx, my, 3);
        if (waffe === 'shotgun') this.fx.muendungsrauch(mx, my);
        sfx.play(waffe);
    }

    // Effekt-Meldungen vom Gastgeber (bei den Gästen).
    effektEmpfangen(d) {
        switch (d.k) {
            case 'muendung': case 'druckwelle': case 'blut': this.effektLokal(d.k, d.x, d.y, d.a, d.g, d.f); break;
            case 'schuss': this.zeigeSchussEffekt(d.x, d.y, d.a, d.wp); break;
            case 'hieb': this.hiebStart(d.n, d.a, !!d.s); break;
            case 'weck': { const g = this.gegnerNachId[d.id]; if (g) this.wecke(g); break; }
            case 'warn': this.warnungen.push({ x: d.x, t0: this.time.now, bis: this.time.now + d.d }); break;
            case 'explosion': this.explosionEffekt(d.x, d.y, d.r); break;
            case 'fassZ': { const f = this.faesser.find((o) => o.id === d.id); if (f) f.zuendet = true; break; }
            case 'fassWeg': {
                const f = this.faesser.find((o) => o.id === d.id);
                if (f) f.destroy();
                this.faesser = this.faesser.filter((o) => o.active);
                break;
            }
            case 'wand': { const w = this.wandNachId(d.id); if (w) this.wandTreffer(w, d.x, d.y); break; }
            case 'wandWeg': { const w = this.wandNachId(d.id); if (w) this.zerbrich(w); break; }
        }
    }

    wandNachId(id) { return this.platforms.find((p) => p.brechbar && p.id === id && p.active); }

    pickupEntfernen(id) {
        const p = this.pickups.find((o) => o.id === id && o.active);
        if (p) p.destroy();
    }

    // Der Gastgeber erzeugt die echten Kugeln eines Gastes.
    fremderSchuss(nr, d) {
        for (const w of d.w) this.spawneSpielerKugel(d.x, d.y, w, d.r, nr, false);
        this.zeigeSchussEffekt(d.mx, d.my, d.a, d.wp);
        this.mp.netz.sendeAnAlleAusser(nr, { t: 'fx', k: 'schuss', x: d.mx, y: d.my, a: d.a, wp: d.wp });
    }

    // Der Gastgeber erzeugt die echte Granate eines Gastes.
    fremderHieb(nr, d) {
        this.hiebStart(nr, d.a, d.s);
        this.hiebTreffer(nr, d.x, d.y, d.a, d.s);
        this.mp.netz.sendeAnAlleAusser(nr, { t: 'fx', k: 'hieb', n: nr, a: d.a, s: d.s ? 1 : 0 });
    }

    fremdeGranate(nr, d) {
        const g = new Grenade(this, d.x, d.y, d.vx, d.vy);
        g.owner = nr;
        g.id = ++this.bulletZaehler;
        this.physics.add.collider(g, this.platforms);
        this.grenadeList.push(g);
        sfx.play('throw');
    }

    // ---------- Mehrspieler: Gefallene und Wiederbeleben ----------

    // Leben auf null: Online scheidet man nicht aus, sondern liegt am Boden, bis ein Mitspieler einen wiederbelebt.
    geheNieder() {
        const p = this.player;
        p.loslassen(0, 0);
        p.tot = true;
        p.body.setVelocity(0, 0);
        p.setAlpha(1);
        this.kameraZiel.setPosition(p.x, p.y);
        this.cameras.main.startFollow(this.kameraZiel, true, 0.1, 0.1);     // Zuschauerkamera
        sfx.play('lose');
        this.showMessage('You are down!\nA teammate can revive you with E.');
    }

    wiederbelebt() {
        const p = this.player;
        if (!p.tot) return;
        p.tot = false;
        p.health = 50;
        p.invulnerableUntil = this.time.now + 2500;
        this.cameras.main.startFollow(p, true, 0.1, 0.1);
        this.belebtEffekt(p.x, p.y);
        this.showMessage('You were revived!');
    }

    // Animation beim Wiederbeleben: Lichtsäule, aufsteigende Ringe und grüne Funken (dauert knapp eine Sekunde).
    belebtEffekt(x, y) {
        (this.belebtAnim ??= []).push({ x, y, t0: this.time.now });
        this.fx.pickup(x, y, 0x66ee88, '');
        sfx.play('heal');
    }

    zeichneBelebtAnim(g) {
        if (!this.belebtAnim) return;
        const jetzt = this.time.now;
        this.belebtAnim = this.belebtAnim.filter((a) => jetzt - a.t0 < 1000);
        for (const a of this.belebtAnim) {
            const t = (jetzt - a.t0) / 1000;                       // 0 bis 1
            const al = 1 - t;
            g.fillStyle(0x99ffbb, 0.35 * al).fillRect(a.x - 18 * (1 - t * 0.5), a.y - 150, 36 * (1 - t * 0.5), 174);   // Lichtsäule
            for (let k = 0; k < 3; k++) {                          // Ringe steigen nacheinander auf
                const u = t * 1.4 - k * 0.25;
                if (u < 0 || u > 1) continue;
                const ry = a.y + 24 - u * 90, rw = 30 + u * 14;
                g.lineStyle(3, 0x66ee88, 1 - u).strokeEllipse(a.x, ry, rw, rw * 0.35);
            }
            for (let k = 0; k < 8; k++) {                          // Funken
                const ph = k * 0.8, fy = a.y + 24 - ((t + k * 0.13) % 1) * 110, fx = a.x + Math.sin(t * 6 + ph) * 22;
                g.fillStyle(0xccffdd, al).fillRect(fx - 1, fy, 3, 3);
            }
            g.fillStyle(0xff4444, 0.9 * al).fillRect(a.x - 2, a.y - 62 - t * 30, 4, 12).fillRect(a.x - 6, a.y - 58 - t * 30, 12, 4);   // Kreuz schwebt davon
        }
    }

    belebenAnzeige(ziel, p) { this.belebenInfo[ziel] = { p, bis: this.time.now + 400 }; }

    // Jedes Bild im Online-Modus: Zuschauerkamera, Wiederbeleben halten, Niederlage prüfen.
    mpUpdate() {
        this.zeichneTeamHud();
        const dt = this.game.loop.delta / 1000;
        if (this.player.tot) {
            const k = [...this.mp.fern.values()].find((r) => !r.tot);        // einem lebenden Mitspieler zuschauen
            if (k) {
                this.kameraZiel.x += (k.x - this.kameraZiel.x) * 0.1;
                this.kameraZiel.y += (k.y - this.kameraZiel.y) * 0.1;
            }
            this.belebenHinweis.setText('You are down. Wait for help.').setVisible(true);
        } else {
            this.pruefeBeleben(dt);
        }
        // Niederlage: alle liegen am Boden. Der Gastgeber entscheidet und sagt es allen.
        const alleAmBoden = this.player.tot && [...this.mp.fern.values()].every((r) => r.tot);
        if (!alleAmBoden) this.wipeSeit = 0;
        else if (this.istHost && !this.gameOver) {
            if (this.checkpoint) {                                           // mit Checkpoint: alle stehen dort wieder auf
                this.wipeSeit = this.wipeSeit || this.time.now;
                if (this.time.now - this.wipeSeit > 2200) { this.mp.meldeRespawn(); this.respawnAnCheckpoint(); }
            } else {
                this.mp.meldeNiederlage();
                this.zeigeNiederlage();
            }
        }
    }

    // Kleine Lebensbalken der Mitspieler unter der eigenen Anzeige (links oben).
    zeichneTeamHud() {
        const g = this.teamHud;
        g.clear();
        let y = 60;
        for (const r of this.mp.fern.values()) {
            let t = this.teamTexte.get(r.nr);
            if (!t) {
                t = this.add.text(22, y, '', { fontSize: '13px', color: '#ffffff', stroke: '#000000', strokeThickness: 3 }).setScrollFactor(0).setDepth(21);
                this.teamTexte.set(r.nr, t);
            }
            const farbe = SPIELERFARBEN[(r.nr - 1) % 4];
            const anteil = r.tot ? 0 : Phaser.Math.Clamp((r.h ?? 100) / 100, 0, 1);
            g.fillStyle(0x000000, 0.6).fillRect(20, y + 16, 124, 10);
            g.fillStyle(r.tot ? 0x444444 : (anteil <= 0.3 ? 0xcc3333 : farbe)).fillRect(22, y + 18, 120 * anteil, 6);
            t.setPosition(22, y).setText(r.tot ? `${this.mp.netz.nameVon(r.nr)}  DOWN` : this.mp.netz.nameVon(r.nr));
            y += 34;
        }
    }

    // Steht ein Gefallener in der Nähe, kann man mit gedrückter E-Taste 3 Sekunden lang wiederbeleben.
    pruefeBeleben(dt) {
        let ziel = null;
        for (const r of this.mp.fern.values()) {
            if (r.tot && Math.hypot(r.x - this.player.x, r.y - this.player.y) < 90) { ziel = r; break; }
        }
        if (!ziel) { this.belebenZeit = 0; this.belebenHinweis.setVisible(false); return; }
        this.belebenHinweis.setText(this.touch.aktiv ? `Hold the button: revive ${this.mp.netz.nameVon(ziel.nr)}` : `Hold E: revive ${this.mp.netz.nameVon(ziel.nr)}`).setVisible(true);
        this.touch.interaktionText = 'Revive';
        if (this.player.keys.E.isDown || this.touch.gedrueckt.interaktion) {
            this.belebenZeit += dt;
            const p = Math.min(1, this.belebenZeit / BELEBEN_DAUER);
            this.mp.meldeBelebenFortschritt(ziel.nr, p);
            if (p >= 1) {
                this.mp.meldeBelebt(ziel.nr);
                ziel.warTot = false; this.belebtEffekt(ziel.x, ziel.y);
                ziel.tot = false;                     // gleich als wieder da betrachten (der echte Zustand kommt in 50 ms nach)
                this.belebenZeit = 0;
            }
        } else {
            this.belebenZeit = 0;
        }
    }

    zeigeNiederlage() {
        if (this.gameOver) return;
        const sekunden = Math.floor((this.time.now - this.startTime) / 1000);
        const zeit = `${Math.floor(sekunden / 60)}:${String(sekunden % 60).padStart(2, '0')}`;
        this.showEndScreen('DEFEATED', '#ff4444', 'All players have fallen',
            `Time: ${zeit}     Enemies defeated: ${this.kills} / ${this.totalEnemies}`,
            this.mp && this.mp.istHost ? 'Enter: new game for everyone      Esc twice: menu' : 'The host starts the next game      Esc twice: menu');
    }

    // Ein Gefallener liegt flach auf dem Boden (x, y = Mitte der aufrechten Figur).
    zeichneLiegend(g, x, y, farbe) {
        const f = y + 24;                                               // Bodenhöhe
        g.fillStyle(this.dunkler(farbe, 45)).fillRect(x - 24, f - 10, 16, 10);   // Beine
        g.fillStyle(farbe).fillRect(x - 10, f - 18, 26, 18);                      // Rumpf
        g.fillStyle(0x2a2a2a).fillRect(x - 10, f - 8, 26, 4);                     // Gürtel
        g.fillStyle(0xe0b890).fillRect(x + 16, f - 16, 14, 14);                   // Kopf
        g.fillStyle(0xcc2222).fillRect(x + 15, f - 14, 16, 4);                    // Stirnband
        if (Math.floor(this.time.now / 500) % 2 === 0) g.fillStyle(0xff4444).fillRect(x - 2, f - 40, 4, 12).fillRect(x - 6, f - 36, 12, 4);   // blinkendes Kreuz: "hilf mir"
    }

    // Der grüne Balken über einem Gefallenen, während jemand ihn wiederbelebt.
    zeichneBelebenBalken(g, nr, x, y) {
        const info = this.belebenInfo[nr];
        if (!info || this.time.now > info.bis) return;
        g.fillStyle(0x000000, 0.7).fillRect(x - 26, y - 62, 52, 8);
        g.fillStyle(0x66ee88).fillRect(x - 24, y - 60, 48 * info.p, 4);
    }

    // Zündet ein Fass: Nach "verzoegerung" Millisekunden explodiert es (kleinerer Radius, weniger Eigenschaden).
    // Nur wer rechnet, zündet Fässer; die Gäste erfahren es durch Meldungen.
    zuendeFass(fass, verzoegerung = 0) {
        if (!this.rechnet || !fass.active || fass.zuendet) return;
        fass.zuendet = true;
        if (this.istHost) this.mp.sendeAnAlle({ t: 'fx', k: 'fassZ', id: fass.id });
        this.time.delayedCall(verzoegerung, () => {
            if (!fass.active) return;
            const x = fass.x, y = fass.y;
            fass.destroy();
            if (this.istHost) this.mp.sendeAnAlle({ t: 'fx', k: 'fassWeg', id: fass.id });
            this.explode(x, y, 120, 25);
        });
    }

    // Wirft eine Granate Richtung Maus. Je weiter die Maus weg ist, desto weiter fliegt sie.
    // Ein Gast erzeugt nur ein Bild (sofortige Rückmeldung) und meldet den Wurf; die echte Granate rechnet der Gastgeber.
    // Mit Vorgabe (Handy: Richtung und Weite vom gezogenen Granatenknopf) oder zur Maus.
    throwGrenade(winkelVorgabe, abstandVorgabe) {
        const p = this.player;
        const zp = this.zielPunkt();
        const winkel = winkelVorgabe ?? Phaser.Math.Angle.Between(p.x, p.y, zp.x, zp.y);
        const abstand = abstandVorgabe ?? Phaser.Math.Distance.Between(p.x, p.y, zp.x, zp.y);
        const tempo = Phaser.Math.Clamp(abstand * 1.6, 250, 650);
        // Etwas nach oben zusätzlich (-180), damit sie einen Bogen fliegt statt gerade.
        const vx = Math.cos(winkel) * tempo, vy = Math.sin(winkel) * tempo - 180;
        const g = new Grenade(this, p.x, p.y - 10, vx, vy);
        g.owner = this.meineNr;
        g.id = ++this.bulletZaehler;
        g.visuell = this.istGast;
        this.physics.add.collider(g, this.platforms);
        this.grenadeList.push(g);
        p.grenades -= 1;
        sfx.play('throw');
        if (this.istGast) this.mp.meldeGranate(Math.round(p.x), Math.round(p.y - 10), Math.round(vx), Math.round(vy));
    }

    // Nur die Wirkung einer Explosion zum Anschauen: Feuerball, Wackeln, Knall, Trümmer. (Auch die Gäste zeigen sie.)
    explosionEffekt(x, y, radius) {
        const ball = this.add.circle(x, y, radius, 0xffaa33, 0.7).setDepth(5);
        this.tweens.add({
            targets: ball, alpha: 0, scale: 1.25, duration: 350,
            onComplete: () => ball.destroy(),
        });
        this.cameras.main.shake(200, 0.01);
        sfx.play('explosion');
        this.fx.explosion(x, y);
    }

    // Explosion: Schaden an allen im Radius (auch an Spielern!) plus ein Feuerball als Optik.
    explode(x, y, radius = 140, selbstschaden = 30) {
        this.explosionEffekt(x, y, radius);
        if (this.istHost) this.mp.sendeAnAlle({ t: 'fx', k: 'explosion', x, y, r: radius });
        for (const p of this.platforms) {                      // Explosionen zerstören brüchige Wände in der Nähe
            if (!p.brechbar || p.hp <= 0) continue;
            // Abstand vom Explosionspunkt bis zum Rand des Blocks (nicht bis zur Mitte): Auch große Böden werden getroffen
            const ddx = Math.max(Math.abs(x - p.x) - p.width / 2, 0), ddy = Math.max(Math.abs(y - p.y) - p.height / 2, 0);
            if (Math.hypot(ddx, ddy) <= radius + 20) { p.hp = 0; this.zuZerbrechen.push(p); }
        }

        for (const enemy of this.enemies) {
            if (!enemy.active) continue;
            if (Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y) <= radius) {
                if (enemy.takeDamage(6)) this.gegnerStirbt(enemy);
                else this.zeigeBlut(enemy.x, enemy.y);
            }
        }
        this.enemies = this.enemies.filter(e => e.active);  // gestorbene sofort aus der Liste nehmen
        // Fässer in der Nähe fangen Feuer und explodieren kurz danach (Kettenreaktion)
        for (const f of this.faesser) {
            if (f.active && !f.zuendet && Phaser.Math.Distance.Between(x, y, f.x, f.y) <= radius + 20) this.zuendeFass(f, 160);
        }
        for (const z of this.alleZiele()) {                    // Spieler in der Nähe nehmen Schaden (auch du selbst!)
            if (Phaser.Math.Distance.Between(x, y, z.rect.centerX, z.rect.centerY) <= radius) this.schadeAnSpieler(z.nr, selbstschaden, x);
        }
    }

    // Eine Kugel trifft eine brüchige Erdwand: Brocken fliegen, das Bild zuckt. Nach genug Treffern zerbricht sie.
    treffeBroeckelig(wand, x, y) {
        if (!wand.active || wand.hp <= 0) return;
        wand.hp -= 1;
        this.wandTreffer(wand, x, y);
        if (this.istHost) this.mp.sendeAnAlle({ t: 'fx', k: 'wand', id: wand.id, x, y });
        if (wand.hp <= 0) this.zuZerbrechen.push(wand);      // erst am Anfang des nächsten Bildes entfernen (nicht mitten in der Physik)
    }

    // Nur die Optik eines Treffers auf eine brüchige Wand (auch bei den Gästen).
    wandTreffer(wand, x, y) {
        this.fx.truemmerE.explode(6, x, y);
        sfx.play('hit');
        if (wand.deko) {
            wand.deko.setAlpha(0.55);
            this.time.delayedCall(70, () => { if (wand.deko && wand.deko.active) wand.deko.setAlpha(1); });
        }
    }

    // Entfernt eine zerbrochene Wand: Staub, Brocken, Rauch, ein Knall und eine Meldung. Der Weg ist frei.
    zerbrich(wand) {
        if (!wand.active) return;
        const x = wand.x, y = wand.y;
        if (this.istHost) this.mp.sendeAnAlle({ t: 'fx', k: 'wandWeg', id: wand.id });
        if (wand.deko) wand.deko.destroy();
        const i = this.platforms.indexOf(wand);
        if (i >= 0) this.platforms.splice(i, 1);              // aus der Liste, die die Physik benutzt (dieselbe Liste bleibt bestehen)
        wand.destroy();
        const letzter = wand.gruppe === 'sturz' && !this.platforms.some(p => p.brechbar && p.gruppe === 'sturz');   // war das der letzte Brocken des Felssturzes?
        const gross = letzter || wand.rolle === 'boden' || wand.rolle === 'stuetze';
        this.fx.truemmerE.explode(letzter ? 44 : (gross ? 28 : 18), x, y);
        this.fx.staubE.explode(letzter ? 26 : (gross ? 16 : 10), x, y);
        if (letzter) this.fx.rauchE.explode(8, x, y);
        this.cameras.main.shake(letzter ? 240 : 100, letzter ? 0.01 : 0.005);
        sfx.play(letzter ? 'explosion' : 'kill');
        if (letzter) this.showMessage('The earth gives way!\nA buried passage opens up.');
        this.pruefeEinsturz(wand);
    }

    // Fällt eine Stütze eines Turms oder Laufstegs aus, stürzt alles dieser Gruppe ein: die Böden (und mit ihnen, was darauf steht)
    // und die übrigen Stützen.
    // Malt die Wachtürme als Ganzes: schiefe Bambus-/Holzbeine mit Querstreben, Lianen, Bretterboden, Geländer, Strohdach und Wimpel.
    // Die Kollision liegt in den (unsichtbaren) Bauteilen der Gruppe; stürzt der Turm ein, kippt diese Grafik mit.
    baueTuerme() {
        this.turmGrafiken = {};
        for (const t of level.tuerme ?? []) {
            const rnd = new Phaser.Math.RandomDataGenerator(['turm' + t.gruppe]);
            const g = this.add.graphics().setDepth(2.4);
            const { x, oben } = t;
            const holz = [0x5a3f22, 0x6e4e2a, 0x7f5c33], gras = [0x6d8a2c, 0x8aa63a, 0xa8b84a];
            const bein = (sx, ex, unten) => {                  // ein Bein aus zwei Stämmen, leicht nach außen geneigt
                for (let d = 0; d < 2; d++) {
                    const ox = d * 9 + (sx < x ? 0 : 3);
                    const n = Math.max(1, Math.floor((unten - oben) / 8));
                    for (let i = 0; i < n; i++) {
                        const f = i / n, px = sx + ox + (ex - sx) * f + rnd.between(-1, 1);
                        g.fillStyle(holz[(i + d) % 3]).fillRect(px, oben + 14 + i * 8, 7, 9);
                    }
                }
            };
            bein(x - 58, x - 66, t.bl); bein(x + 49, x + 57, t.br);
            // Querstreben (X) zwischen den Beinen, Stufe für Stufe
            const hoehe = Math.min(t.bl, t.br) - oben - 20;
            for (let y = oben + 40; y < oben + 20 + hoehe - 30; y += 56) {
                for (let i = 0; i < 12; i++) {
                    const f = i / 11;
                    g.fillStyle(holz[0]).fillRect(x - 56 + f * 112, y + f * 40, 5, 5);
                    g.fillStyle(holz[1]).fillRect(x + 56 - f * 112, y + f * 40, 5, 5);
                }
            }
            // Lianen
            for (let k = 0; k < 3; k++) {
                let lx = x + rnd.between(-60, 60), ly = oben + 18;
                const len = rnd.between(50, 120);
                for (let i = 0; i < len; i += 4) { lx += rnd.between(-1, 1) * 2; g.fillStyle(gras[rnd.between(0, 1)]).fillRect(lx, ly + i, 3, 4); }
            }
            // Boden: Bretter mit Lücken
            for (let px = x - 72; px < x + 72; px += 12) g.fillStyle(holz[rnd.between(0, 2)]).fillRect(px, oben, 11, 8).fillStyle(0x3a2916).fillRect(px, oben + 8, 11, 4);
            g.fillStyle(0x2c1e10).fillRect(x - 72, oben + 12, 144, 4);
            // Geländer und Dachpfosten
            g.fillStyle(holz[0]).fillRect(x - 70, oben - 56, 6, 56).fillRect(x + 64, oben - 56, 6, 56);
            g.fillStyle(holz[1]).fillRect(x - 70, oben - 28, 140, 4).fillRect(x - 70, oben - 14, 140, 3);
            // Strohdach aus gestaffelten Reihen, unten ausgefranst
            for (let r = 0; r < 4; r++) {
                const br = 100 - r * 24, y = oben - 82 - r * 8;
                for (let px = x - br; px < x + br; px += 6) g.fillStyle(gras[(r + (px >> 3)) % 3]).fillRect(px, y, 6, 9 + (r === 0 ? rnd.between(0, 6) : 0));
            }
            // Wimpel
            g.fillStyle(0x4a3220).fillRect(x + 2, oben - 140, 3, 36);
            g.fillStyle(0xb02a1a).fillRect(x + 5, oben - 140, 18, 8).fillRect(x + 5, oben - 132, 12, 4);
            this.turmGrafiken[t.gruppe] = g;
        }
    }

    pruefeEinsturz(wand) {
        if (wand.rolle !== 'stuetze' || !wand.gruppe) return;
        const bild = this.turmGrafiken && this.turmGrafiken[wand.gruppe];
        if (bild) {
            delete this.turmGrafiken[wand.gruppe];
            this.tweens.add({ targets: bild, y: 260, angle: 6, alpha: 0, duration: 700, ease: 'Quad.easeIn', onComplete: () => bild.destroy() });
        }
        const teile = this.platforms.filter(p => p.brechbar && p.gruppe === wand.gruppe && (p.rolle === 'boden' || p.rolle === 'stuetze'));
        if (!teile.length) return;
        this.cameras.main.shake(380, 0.012);
        sfx.play('explosion');
        for (const b of teile) this.zerbrich(b);
    }

    // Erzeugt eine Gegner-Kugel. Wird vom Fernkämpfer aufgerufen.
    // art: null = normale Kugel, 'pfeil' = Pfeil eines Skeletts, 'fels' (oder true) = Felsbrocken
    spawnEnemyBullet(x, y, winkel, speed, damage, art = null) {
        if (art === true) art = 'fels';
        sfx.play(art === 'fels' ? 'hit' : (art === 'pfeil' ? 'bogen' : 'enemyShot'));
        const bullet = new Bullet(this, x, y, winkel, speed, 0xff6644);  // orange-rot
        if (art === 'fels') {                                  // Felsbrocken: größer, grau und nicht gedreht
            bullet.setSize(22, 22).setRotation(0).setFillStyle(0x8a7a60).setStrokeStyle(2, 0x4a4238);
            bullet.body.setSize(22, 22);
            bullet.gross = true;
        } else if (art === 'pfeil') {                          // Pfeil: lang und dünn, hell
            bullet.setSize(26, 3).setFillStyle(0xd8c9a0);
            bullet.body.setSize(10, 6);
            bullet.pfeil = true;
        }
        bullet.damage = damage;  // Wir hängen den Schaden direkt an die Kugel
        bullet.id = ++this.bulletZaehler;
        bullet.speed = speed;
        this.physics.add.collider(bullet, this.platforms, (b, platte) => {
            if (platte.deckung && this.rechnet) this.treffeBroeckelig(platte, b.x, b.y);   // Deckung hält nicht ewig: auch Gegnerkugeln beschädigen sie
            this.fx.sparks(bullet.x, bullet.y, 3);
            bullet.destroy();
        });
        this.enemyBullets.push(bullet);
    }

    // update() läuft ca. 60-mal pro Sekunde.
    update() {
        // Nach der Niederlage läuft nur noch die Abfrage der Neustart-Taste.
        if (this.gameOver) {
            if (this.mp) {                                    // Online: Enter startet (nur der Gastgeber) für alle neu, Esc zweimal verlässt
                if (Phaser.Input.Keyboard.JustDown(this.pauseKey)) this.mp.escDruecken();
                if (Phaser.Input.Keyboard.JustDown(this.restartKey) || this.nimmEndeTipp()) this.mp.neustartWunsch();
                return;
            }
            // JustDown ist nur im Moment des Tastendrucks wahr, nicht dauerhaft.
            if (Phaser.Input.Keyboard.JustDown(this.restartKey) || this.nimmEndeTipp()) {
                this.scene.restart();  // create() läuft komplett neu: alles startet frisch
            }
            return;
        }

        // Brüchige Wände, die in diesem Bild zerbrechen sollen
        if (this.zuZerbrechen.length) {
            this.zuZerbrechen.forEach(w => this.zerbrich(w));
            this.zuZerbrechen = [];
        }
        // Dezenter Hinweis: Aus den zerstörbaren Blöcken rieselt ab und zu ein Körnchen Staub
        if (this.time.now > this.naechsterStaub) {
            this.naechsterStaub = this.time.now + 1400;
            for (const p of this.platforms) {
                if (p.brechbar && p.active && Math.random() < 0.15 && Math.abs(p.x - this.player.x) < 700 && Math.abs(p.y - this.player.y) < 400) {
                    this.fx.staubE.explode(1, p.x + Phaser.Math.Between(-14, 14), p.y + Phaser.Math.Between(-14, 14));
                }
            }
        }

        // Esc: Im Einzelspielermodus Pause. Online gibt es keine Pause (die anderen spielen weiter): Zweimal Esc verlässt das Spiel.
        if (Phaser.Input.Keyboard.JustDown(this.pauseKey) && Date.now() > this.pauseBlockedUntil) {
            if (this.mp) { this.mp.escDruecken(); }
            else {
                this.scene.launch('PauseScene');
                this.scene.pause();
                return;
            }
        }

        // N schaltet den Ton an/aus.
        if (Phaser.Input.Keyboard.JustDown(this.muteKey)) {
            this.showMessage(sfx.toggle() ? 'Sound off (N)' : 'Sound on (N)');
        }

        // Landestaub: Wenn der Spieler schnell fallend aufkommt.
        const boden = this.player.body.blocked.down;
        if (boden && !this.warAmBoden && this.letzteFallgeschw > 350) {
            this.fx.dust(this.player.x, this.player.y + 24);
        }
        this.warAmBoden = boden;
        this.letzteFallgeschw = this.player.body.velocity.y;

        if (!this.player.tot) this.player.update();  // Der Spieler kümmert sich selbst um Laufen und Springen.
        else this.player.body.setVelocityX(0);       // Gefallene liegen still
        if (this.mp) { this.mp.aktualisiere(); this.mpUpdate(); }   // eigenen Zustand senden, fremde Figuren nachführen, Wiederbeleben
        this.touch.interaktionText = null;
        this.seilUpdate();
        this.pruefeFlagge();
        if (!this.mp && this.player.tot && this.checkpoint && this.time.now >= this.respawnZeit) this.respawnAnCheckpoint();

        // Schaden kommt irgendwo später im Frame an; wir vergleichen deshalb mit dem Wert des letzten Frames.
        if (this.player.health < (this.letzteHP ?? this.player.health) && this.touch.aktiv) { try { navigator.vibrate && navigator.vibrate(60); } catch (e) { /* egal */ } }
        if (this.player.health < (this.letzteHP ?? this.player.health)) { this.fx.blood(this.player.x, this.player.y, 10); this.cameras.main.shake(150, 0.007); this.cameras.main.flash(90, 140, 0, 0); }
        this.letzteHP = this.player.health;

        // --- Zielen ---
        // worldX/worldY = Mausposition in der Welt (nicht im Fenster).
        const pointer = this.input.activePointer;
        pointer.updateWorldPoint(this.cameras.main);
        this.touch.update();
        const zp = this.zielPunkt();
        this.crosshair.setPosition(zp.x, zp.y);
        if (this.touch.aktiv) this.crosshair.setVisible(this.time.now < this.touch.zielSichtbarBis && !this.player.tot);

        // --- Schießen (Maustaste gedrückt halten = Dauerfeuer) ---
        // Schießen geht nur mit Kugel im Magazin und nicht während des Nachladens.
        // Die linke Maustaste benutzt den gewählten Platz der Inventarleiste.
        // Am Handy ersetzt der Zielstick die Maustaste: Gezogen halten = Dauerfeuer, kurzes Tippen = Schnellschuss auf den nächsten Gegner.
        const gedrueckt = this.touch.aktiv ? (this.touch.feuer || this.touch.tippSchuss()) : pointer.isDown;
        const klick = gedrueckt && !this.player.tot;
        const neuerKlick = this.touch.aktiv ? (this.touch.feuerBeginn || this.touch.tippEvent) && !this.player.tot
            : klick && !this.zeigerWarUnten;                    // nur im Moment des Drückens (für Granate und Heilung)
        this.zeigerWarUnten = gedrueckt;
        const wahl = this.player.auswahl;
        if (klick && wahl === 1 && this.player.canShoot() &&
            this.time.now - this.lastShot > this.player.fireDelay) {  // Feuerrate der Waffe
            this.shoot(zp.x, zp.y);
            this.player.magAmmo -= 1;  // jeder Schuss kostet eine Kugel aus dem Magazin
            this.lastShot = this.time.now;
        } else if (klick && wahl === 2 && this.time.now - this.lastShot > HIEB_PAUSE) {
            this.nahkampf();                                    // Schwert (Dauerklick = Hieb auf Hieb)
            this.lastShot = this.time.now;
        } else if (neuerKlick && wahl === 3 && this.player.grenades > 0) {
            this.throwGrenade();
        } else if (neuerKlick && wahl === 4 && !this.player.useMedkit()) {
            this.showMessage(this.player.medkits <= 0 ? 'No medkits left!' : 'Your health is already full.');
        }

        // --- Granaten: Lunte prüfen, bei Ablauf explodieren ---
        for (const gr of this.grenadeList) {
            gr.update();
            if (gr.isReady()) {
                if (!gr.visuell) this.explode(gr.x, gr.y);     // Gäste zeigen nur ein Bild; die Explosion kommt vom Gastgeber
                gr.destroy();
            }
        }
        this.grenadeList = this.grenadeList.filter(gr => gr.active);

        // --- Gegenstände aufsammeln ---
        for (const pickup of this.pickups) {
            if (!pickup.active || this.player.tot) continue;
            const beruehrt = Phaser.Geom.Intersects.RectangleToRectangle(
                pickup.getBounds(), this.player.getBounds()
            );
            if (beruehrt && pickup.applyTo(this.player) && this.mp) this.mp.meldePickup(pickup.id);
        }
        this.pickups = this.pickups.filter(p => p.active);

        // --- Leuchtspur hinter allen Kugeln ---
        this.bullets.forEach(b => { if (b.active) this.fx.spur(b.x, b.y, true); });
        this.enemyBullets.forEach(b => { if (b.active) this.fx.spur(b.x, b.y, false); });

        // --- Gegner bewegen ---
        // Nur lebende Gegner bewegen: Eine Granate kann einen Gegner schon in diesem Frame zerstört haben.
        // Gäste bewegen keine Gegner selbst: Sie zeigen nur, was der Gastgeber meldet.
        if (this.rechnet) {
            this.enemies.forEach(enemy => {
                if (!enemy.active) return;
                enemy.update();
                // Wer in eine bodenlose Spalte fällt, ist weg
                if (enemy !== this.boss && enemy.y > WORLD_HEIGHT - 100 && enemy.takeDamage(9999)) this.gegnerStirbt(enemy);
            });
        }
        this.drawCharacters();

        // --- Nahkampf: Gegner berührt den Spieler ---
        // takeDamage entscheidet selbst, ob der Schaden wirklich ankommt (Unverwundbarkeit).
        const ziele = this.rechnet ? this.alleZiele() : [];
        for (const enemy of this.enemies) {
            if (!this.rechnet) break;
            const eb = enemy.getBounds();
            for (const z of ziele) {
                if (Phaser.Geom.Intersects.RectangleToRectangle(eb, z.rect)) this.schadeAnSpieler(z.nr, enemy.contactDamage, enemy.x);
            }
        }
        // --- Gegner-Kugeln treffen den Spieler ---
        for (const kugel of this.enemyBullets) {
            if (!kugel.active) continue;
            const kb = kugel.getBounds();
            const opfer = ziele.find((z) => Phaser.Geom.Intersects.RectangleToRectangle(kb, z.rect));
            if (opfer) {
                this.schadeAnSpieler(opfer.nr, kugel.damage, kugel.x);  // Unverwundbarkeit gilt auch hier
                kugel.destroy();
            }
        }
        // Zerstörte und weit entfernte Kugeln aussortieren.
        this.enemyBullets = this.enemyBullets.filter(b => {
            if (!b.active) return false;
            if (b.isOutside(WORLD_WIDTH, WORLD_HEIGHT)) {
                b.destroy();
                return false;
            }
            return true;
        });

        this.pruefeAbsturz();
        this.updateHealthBar();
        if (this.player.isDead()) {
            if (this.mp) { if (!this.player.tot) this.geheNieder(); }      // online: man liegt am Boden und kann wiederbelebt werden
            else if (this.checkpoint) { if (!this.player.tot) this.sterbeEinzel(); }   // Einzelspieler mit Checkpoint: Respawn
            else { this.showEndScreen('DEFEATED', '#ff4444'); return; }
        }

        // --- Levelende: Hubschrauber erreicht? ---
        const amZiel = Phaser.Geom.Intersects.RectangleToRectangle(
            this.helicopter.getBounds(), this.player.getBounds()
        );
        this.updateEvacZone();
        this.updateBossBar();
        // Gewonnen ist nur, wer die Zone berührt UND die Kreatur besiegt hat.
        if (amZiel && this.evacOpen && !this.player.tot) {
            if (this.mp) {
                if (this.mp.meldeSieg()) return;              // Online: meldet den Sieg dem ganzen Team (der Gastgeber zeigt ihn sofort)
            } else {
                this.showEndScreen('EVACUATED!', '#66ff99', 'Level 01 complete: Abandoned Military Zone');
                return;
            }
        }

        // --- Treffer prüfen ---
        // Wir vergleichen jede Kugel mit jedem Gegner: Überlappen sich ihre Rechtecke?
        // getBounds() liefert das umgebende Rechteck eines Objekts.
        for (const bullet of this.bullets) {
            for (const enemy of this.enemies) {
                if (!bullet.active || !enemy.active) continue;  // schon zerstört? überspringen
                if (bullet.visuell) {                           // Gast: nur ein Bild, kein Schaden (der Gastgeber entscheidet)
                    if (Phaser.Geom.Intersects.RectangleToRectangle(bullet.getBounds(), enemy.getBounds())) { this.fx.blood(bullet.x, bullet.y, 4); bullet.destroy(); }
                    continue;
                }
                const getroffen = Phaser.Geom.Intersects.RectangleToRectangle(
                    bullet.getBounds(), enemy.getBounds()
                );
                if (getroffen) {
                    bullet.destroy();
                    // takeDamage meldet true zurück, wenn der Gegner dadurch gestorben ist.
                    if (enemy.takeDamage(1)) this.gegnerStirbt(enemy);
                    else this.zeigeBlut(bullet.x, bullet.y, 5);
                }
            }
        }
        // Kugeln (von beiden Seiten) treffen Fässer
        for (const kugel of this.bullets.concat(this.enemyBullets)) {
            if (!kugel.active || !this.rechnet) continue;
            for (const f of this.faesser) {
                if (f.active && !f.zuendet &&
                    Phaser.Geom.Intersects.RectangleToRectangle(kugel.getBounds(), f.getBounds())) {
                    kugel.destroy();
                    this.zuendeFass(f);
                    break;
                }
            }
        }
        this.faesser = this.faesser.filter(f => f.active);
        // Tote Gegner aus der Liste entfernen (nur die, die noch leben, bleiben).
        this.enemies = this.enemies.filter(e => e.active);

        // --- Aufräumen: zerstörte und weit entfernte Kugeln entfernen ---
        this.bullets = this.bullets.filter(b => {
            if (!b.active) return false;
            if (b.isOutside(WORLD_WIDTH, WORLD_HEIGHT) || (b.diesAt && this.time.now > b.diesAt)) {
                b.destroy();
                return false;
            }
            return true;
        });
    }
}
