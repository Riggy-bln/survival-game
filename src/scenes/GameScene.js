// "import" holt Code aus anderen Dateien. So bleibt jede Datei klein und übersichtlich.
import Player from '../entities/Player.js';
import Bullet from '../entities/Bullet.js';
import Enemy from '../entities/Enemy.js';
import RangedEnemy from '../entities/RangedEnemy.js';
import Boss from '../entities/Boss.js';
import Pickup from '../entities/Pickup.js';
import Grenade from '../entities/Grenade.js';
import Fass from '../entities/Fass.js';
import { sfx } from '../Sound.js';
import { buildLandscape } from '../Landscape.js';
import Effects, { buildSky, buildSkyline, decoratePlatforms, buildVignette, buildEmbers, buildCaves, buildHuegel, buildBerge } from '../Effects.js';
import level from '../levels/Level01.js';  // die Leveldaten (Listen)

// Größe der Spielwelt. Das Fenster ist nur 960 breit, die Welt ist viel größer.
// Die Breite kommt jetzt aus der Level-Datei.
const WORLD_WIDTH = level.width;
// Die Welt ist jetzt höher als das Fenster (540): oben Platz für Gebäude, unten für Tunnel.
// Die Kamera scrollt deshalb auch senkrecht. "boden" ist die Höhe der Oberfläche.
const WORLD_HEIGHT = level.height;
const BODEN = level.boden;

// Länge der Waffe in Pixeln (vom Griff bis zur Mündung) für die Zeichnung und das Mündungsfeuer
const WAFFENLAENGE = { pistol: 18, rifle: 32, shotgun: 28 };

// Die Szene baut die Welt auf und lässt die Spielobjekte zusammenarbeiten.
export default class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    // create() läuft einmal beim Start: hier bauen wir die Welt auf.
    create() {
        this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

        // --- Himmel und Hintergrund-Schichten (Parallax: weiter weg = langsamer) ---
        buildSky(this);
        buildBerge(this, WORLD_WIDTH, BODEN, 0.05, 0x8a5a5c, 150, 120, 'berge1');                 // ferne Berge
        buildBerge(this, WORLD_WIDTH, BODEN, 0.17, 0x5a4254, 100, 70, 'berge2', true);            // nähere Hügel mit Kiefern
        buildSkyline(this, WORLD_WIDTH, BODEN, 0.12, 0x6b4a52, 120, 260, 'fern');
        buildSkyline(this, WORLD_WIDTH, BODEN, 0.3, 0x453a47, 90, 230, 'mitte');

        // --- Dekoration: Ruinen im Hintergrund (ohne Physik) ---
        // (Die alten Rechtecke sind weg: Verfallene Gebäude und Pflanzen kommen aus Landscape.js.)
        buildLandscape(this, level);

        // --- Dekoration und Schilder aus der Level-Datei (ohne Physik) ---
        for (const d of level.decor) {
            this.add.rectangle(d.x, d.y, d.w, d.h, d.color);
        }
        // Schilder: Text auf einer Holztafel, die auf einem Pfosten steht. Der Pfosten reicht bis zum Boden unter dem Schild
        // (höchstens 260 Pixel tief; sonst hängt die Tafel einfach an der Wand). So schweben keine Texte in der Luft.
        const schilderGrafik = this.add.graphics().setDepth(2.5);
        for (const s of level.signs) {
            const text = this.add.text(s.x, s.y, s.text, {
                fontSize: '16px', color: '#e6ded0', align: 'center', lineSpacing: 2,
            }).setOrigin(0.5).setDepth(3);
            const bw = text.width + 16, bh = text.height + 10;
            schilderGrafik.fillStyle(0x2a1f14).fillRect(s.x - bw / 2 - 2, s.y - bh / 2 - 2, bw + 4, bh + 4);     // dunkler Rand
            schilderGrafik.fillStyle(0x4a3826).fillRect(s.x - bw / 2, s.y - bh / 2, bw, bh);                      // Holztafel
            schilderGrafik.fillStyle(0x5a4630).fillRect(s.x - bw / 2, s.y - bh / 2, bw, 3);                       // Lichtkante oben
            let boden = Infinity;                                                                               // Boden unter dem Schild suchen
            for (const p of level.platforms) {
                const top = p.y - p.h / 2;
                if (top >= s.y + bh / 2 - 2 && Math.abs(s.x - p.x) <= p.w / 2 && top < boden) boden = top;
            }
            if (boden - (s.y + bh / 2) <= 260) {
                schilderGrafik.fillStyle(0x3d2a18).fillRect(s.x - 3, s.y + bh / 2, 6, boden - (s.y + bh / 2) + 2);   // Pfosten
                schilderGrafik.fillStyle(0x5a4630).fillRect(s.x - 3, s.y + bh / 2, 2, boden - (s.y + bh / 2) + 2);
            }
        }

        // --- Boden und Plattformen ---
        this.platforms = [];
        // Für jeden Eintrag der Liste in Level01.js eine Plattform bauen.
        // "p" steht für einen Eintrag. Fehlt "color", gilt die Standardfarbe nach dem "??".
        for (const p of level.platforms) {
            this.addPlatform(p.x, p.y, p.w, p.h, p.color ?? 0x6b5b4a);
            if (p.brechbar) {                        // brüchige Erdwand: hält ein paar Treffer aus und zerbricht dann
                const wand = this.platforms[this.platforms.length - 1];
                wand.brechbar = true;
                wand.hp = p.hp ?? 5;
                wand.maxHp = wand.hp;
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
        buildEmbers(this);                                 // Glut und Asche in der Luft
        buildVignette(this);                               // dunkle Bildränder

        // --- Spieler ---
        // Eine Zeile statt vieler: Alles Wichtige steckt jetzt in Player.js.
        this.player = new Player(this, 200, BODEN - 200);  // startet in der Luft und landet
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
        const baue = (Klasse, e) => {
            const gegner = new Klasse(this, e.x, e.y, e.left, e.right);
            if (e.hp) {
                gegner.health = e.hp;
                gegner.maxHealth = e.hp;
            }
            return gegner;
        };
        const b = level.boss;
        this.boss = b ? baue(Boss, b) : null;
        this.enemies = [
            ...level.enemies.map(e => baue(Enemy, e)),
            ...level.rangedEnemies.map(e => baue(RangedEnemy, e)),
            ...(this.boss ? [this.boss] : []),
        ];
        this.enemyBullets = [];  // Kugeln der Gegner
        // Eine collider-Zeile für alle Gegner: Sie stehen auf Boden und Plattformen.
        this.physics.add.collider(this.enemies, this.platforms);

        // --- Explosive Fässer ---
        this.faesser = (level.faesser ?? []).map(f => new Fass(this, f.x, f.y));

        // --- Gegenstände ---
        // Die Positionen stehen in Level01.js (Boden: y = 490).
        this.pickups = level.pickups.map(p => new Pickup(this, p.x, p.y, p.type));

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

        this.evacLabel = this.add.text(hx, BODEN - 150, 'EVAKUIERUNG', {
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
        // Alle drei Teile gemeinsam: am Bildschirm festhalten und über alles andere legen.
        this.ammoText = this.add.text(22, 52, '', { fontSize: '16px', color: '#ffdd55' });
        this.medText = this.add.text(22, 74, '', { fontSize: '16px', color: '#66ee99' });
        this.grenText = this.add.text(22, 96, '', { fontSize: '16px', color: '#b5c96a' });
        [this.hpBack, this.hpBar, this.hpText, this.ammoText, this.medText, this.grenText].forEach(obj => {
            obj.setScrollFactor(0).setDepth(20);
        });

        // --- Lebensanzeige der starken Kreatur (oben in der Mitte, erst sichtbar, wenn sie erwacht) ---
        const mitteX = this.scale.width / 2;   // Fenstermitte (das Fenster ist jetzt 1280 breit)
        this.bossBack = this.add.rectangle(mitteX, 28, 304, 18, 0x000000);
        this.bossBar = this.add.rectangle(mitteX - 150, 28, 300, 14, 0xcc3333).setOrigin(0, 0.5);
        this.bossLabel = this.add.text(mitteX, 50, 'MUTIERTE KREATUR', {
            fontSize: '14px', color: '#ffffff',
        }).setOrigin(0.5);
        this.bossUI = [this.bossBack, this.bossBar, this.bossLabel];
        this.bossUI.forEach(obj => obj.setScrollFactor(0).setDepth(20).setVisible(false));

        // --- Statistik für den Endbildschirm ---
        this.startTime = this.time.now;              // Beginn des Versuchs (in Millisekunden)
        this.kills = 0;                              // besiegte Gegner
        this.totalEnemies = this.enemies.length;     // alle Gegner im Level, Kreatur eingeschlossen

        // --- Zustand und Neustart ---
        this.zuZerbrechen = [];       // brüchige Wände, die am Anfang des nächsten Bildes zerbrechen
        this.naechsterStaub = 0;
        this.gameOver = false;
        // Neustart auf Enter, denn R bedeutet jetzt Nachladen.
        this.restartKey = this.input.keyboard.addKey('ENTER');
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
        if (o.air) { l1 = 6; l2 = -6; h1 = 3; }
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
        if (o.strap) {                                                                    // Patronengurt
            g.lineStyle(3, 0x8a6d2a, a).beginPath().moveTo(x - 12, y - 9).lineTo(x + 12, y + 6).strokePath();
        }

        // Kopf
        const hy = y - 24;
        if (o.head === 'mask') {
            g.fillStyle(0x555a4a, a).fillRect(x - 9, hy, 18, 15);
            g.fillStyle(0xff4444, a).fillRect(x + (f > 0 ? -1 : -9), hy + 4, 10, 4);       // leuchtende Brille
            g.fillStyle(0x2a2a2a, a).fillRect(x + (f > 0 ? 5 : -12), hy + 9, 7, 6);        // Filter
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
        if (o.aim !== undefined) {
            // Rückstoß: Die Waffe hebt sich leicht (Drehung) und der Arm zieht sich zurück
            const rueck = o.rueck ?? 0;
            const ang = o.aim + (Math.cos(o.aim) >= 0 ? -1 : 1) * rueck * 0.025;
            const dx = Math.cos(ang), dy = Math.sin(ang);
            const handX = schulter.x + dx * (12 - rueck), handY = schulter.y + dy * (12 - rueck);
            g.lineStyle(6, o.skin, a).beginPath().moveTo(schulter.x, schulter.y).lineTo(handX, handY).strokePath();
            g.lineStyle(6, 0x2a2a2a, a).beginPath().moveTo(handX - dx * 6, handY - dy * 6)
                .lineTo(handX + dx * o.gun, handY + dy * o.gun).strokePath();
            g.lineStyle(3, 0x777777, a).beginPath().moveTo(handX + dx * (o.gun - 8), handY + dy * (o.gun - 8))
                .lineTo(handX + dx * o.gun, handY + dy * o.gun).strokePath();               // Lauf heller
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
        const pointer = this.input.activePointer;
        const winkel = Phaser.Math.Angle.Between(p.x, p.y, pointer.worldX, pointer.worldY);
        // Rückstoß: Nach einem Schuss ruckt die Waffe zurück und hebt sich, dann kehrt sie in 130 ms zurück.
        const rueck = Math.max(0, 1 - (this.time.now - (p.lastShotTime ?? -999)) / 130) * ({ pistol: 5, rifle: 3, shotgun: 10 }[p.weapon] ?? 4);
        this.drawHumanoid(g, p.x, p.y, {
            facing: Math.cos(winkel) >= 0 ? 1 : -1, alpha: p.alpha, body: 0x4f7a3a, skin: 0xe0b890, rueck,
            head: 'bandana', strap: true, aim: winkel, gun: WAFFENLAENGE[p.weapon] ?? 18,
            moving: Math.abs(p.body.velocity.x) > 20 && p.body.blocked.down, air: !p.body.blocked.down,
        });

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

        // Munitionsanzeige; bei 0 rot, damit man es sofort merkt.
        const p = this.player;
        if (p.isReloading()) {
            this.ammoText.setText(`${p.weaponName}: Nachladen...   Reserve: ${p.ammo}`);
        } else {
            this.ammoText.setText(`${p.weaponName}: ${p.magAmmo} / ${p.magSize}   Reserve: ${p.ammo}`);
        }
        // Inventar: Verbandskästen als kleine Kästchen-Anzeige, z. B. "Verbandskasten [H]: ■ □"
        const gefuellt = '■ '.repeat(p.medkits);
        const leerPlaetze = '□ '.repeat(p.maxMedkits - p.medkits);
        this.medText.setText(`Verbandskasten [H]: ${gefuellt}${leerPlaetze}`);

        this.grenText.setText(`Granaten [G]: ${'● '.repeat(p.grenades)}${'○ '.repeat(p.maxGrenades - p.grenades)}`);

        // Rot, wenn gar keine Munition mehr da ist; orange bei leerem Magazin / beim Nachladen.
        const leer = p.magAmmo === 0 && p.ammo === 0;
        this.ammoText.setColor(leer ? '#ff4444' : (p.isReloading() || p.magAmmo === 0 ? '#ff9944' : '#ffdd55'));
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
        this.evacLabel.setText(offen ? 'EVAKUIERUNG' : 'Erst die Kreatur besiegen!');
    }

    // Zeigt den Endbildschirm (Sieg oder Niederlage) und hält das Spiel an.
    // Titel und Farbe werden übergeben, damit eine Funktion für beide Fälle reicht.
    // untertitel ist optional (Standard: leer), zum Beispiel "Level 01 abgeschlossen".
    showEndScreen(titel, farbe, untertitel = '') {
        this.gameOver = true;
        sfx.play(titel === 'BESIEGT' ? 'lose' : 'win');
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
        const statistik = `Zeit: ${zeit}     Gegner besiegt: ${this.kills} / ${this.totalEnemies}     ` +
                          `Leben: ${this.player.health} / ${this.player.maxHealth}`;

        // Alle Texte: am Bildschirm festgehalten (ScrollFactor 0) und über dem Schleier (Depth 31).
        const zeige = (y, text, groesse, farbeText) => {
            this.add.text(this.scale.width / 2, y + (this.scale.height - 540) / 2, text, { fontSize: groesse, color: farbeText })
                .setOrigin(0.5).setScrollFactor(0).setDepth(31);
        };
        zeige(180, titel, '72px', farbe);
        if (untertitel) zeige(240, untertitel, '28px', '#ffffff');
        zeige(310, statistik, '20px', '#cfd8dc');
        zeige(380, 'Drücke Enter für einen Neustart', '24px', '#ffffff');
    }

    // Erzeugt eine feste Fläche und merkt sie sich in der Liste.
    addPlatform(x, y, breite, hoehe, farbe) {
        const rect = this.add.rectangle(x, y, breite, hoehe, farbe);
        this.physics.add.existing(rect, true);  // true = statisch
        this.platforms.push(rect);
    }

    // Erzeugt eine Kugel, die vom Spieler zum Ziel fliegt.
    shoot(zielX, zielY) {
        const winkel = Phaser.Math.Angle.Between(
            this.player.x, this.player.y, zielX, zielY
        );
        // Mündung: Schulter (y - 6) + 12 Pixel Arm + Waffenlänge in Zielrichtung
        const p = this.player;
        const abstand = 12 + (WAFFENLAENGE[p.weapon] ?? 18);
        const mx = p.x + Math.cos(winkel) * abstand, my = p.y - 6 + Math.sin(winkel) * abstand;
        const gross = { pistol: 1, rifle: 1.1, shotgun: 1.7 }[p.weapon] ?? 1;
        this.fx.muzzleFlash(mx, my, winkel, gross);
        this.fx.sparks(mx, my, 3);
        this.fx.huelse(p.x, p.y - 6, Math.cos(winkel) >= 0 ? 1 : -1);          // Hülse fliegt nach hinten
        if (p.weapon === 'shotgun') { this.fx.muendungsrauch(mx, my); this.cameras.main.shake(110, 0.006); }
        else this.cameras.main.shake(50, 0.0015);
        p.lastShotTime = this.time.now;                                         // für den Rückstoß der Waffe
        sfx.play(this.player.weapon);  // Geräusch heißt wie die Waffe: pistol, rifle, shotgun
        // Eine Schrotflinte feuert mehrere Kugeln, jede mit zufälliger Abweichung (Streuung).
        for (let i = 0; i < this.player.pellets; i++) {
            const streuung = Phaser.Math.FloatBetween(-this.player.spread, this.player.spread);
            const bullet = new Bullet(this, this.player.x, this.player.y, winkel + streuung, 900);
            // Hat die Waffe nur kurze Reichweite, verschwindet die Kugel nach "range" Millisekunden.
            if (this.player.range > 0) bullet.diesAt = this.time.now + this.player.range;

            // Trifft die Kugel eine Plattform, verschwindet sie.
            this.physics.add.collider(bullet, this.platforms, (b, platte) => {
                if (platte.brechbar) this.treffeBroeckelig(platte, b.x, b.y);   // Spielerkugeln können brüchige Wände zerstören
                this.fx.sparks(b.x, b.y, 3);
                b.destroy();
            });
            this.bullets.push(bullet);
        }
    }

    // Effekt für einen gestorbenen Gegner: Leiche (kippt vom Spieler weg) oder Boss-Explosionen.
    zeigeTod(enemy) {
        if (enemy === this.boss) {
            this.fx.bossDeath(enemy.x, enemy.y);
        } else {
            this.fx.death(enemy.x, enemy.y, enemy.baseColor, enemy.x < this.player.x ? -1 : 1);
        }
    }

    // Zündet ein Fass: Nach "verzoegerung" Millisekunden explodiert es (kleinerer Radius, weniger Eigenschaden).
    zuendeFass(fass, verzoegerung = 0) {
        if (!fass.active || fass.zuendet) return;
        fass.zuendet = true;
        this.time.delayedCall(verzoegerung, () => {
            const x = fass.x, y = fass.y;
            fass.destroy();
            this.explode(x, y, 120, 25);
        });
    }

    // Wirft eine Granate Richtung Maus. Je weiter die Maus weg ist, desto weiter fliegt sie.
    throwGrenade() {
        const p = this.player;
        const pointer = this.input.activePointer;
        const winkel = Phaser.Math.Angle.Between(p.x, p.y, pointer.worldX, pointer.worldY);
        const abstand = Phaser.Math.Distance.Between(p.x, p.y, pointer.worldX, pointer.worldY);
        const tempo = Phaser.Math.Clamp(abstand * 1.6, 250, 650);
        // Etwas nach oben zusätzlich (-180), damit sie einen Bogen fliegt statt gerade.
        const g = new Grenade(this, p.x, p.y - 10, Math.cos(winkel) * tempo, Math.sin(winkel) * tempo - 180);
        this.physics.add.collider(g, this.platforms);
        this.grenadeList.push(g);
        p.grenades -= 1;
        sfx.play('throw');
    }

    // Explosion: Schaden an allen im Radius (auch am Spieler!) plus ein Feuerball als Optik.
    explode(x, y, radius = 140, selbstschaden = 30) {
        const ball = this.add.circle(x, y, radius, 0xffaa33, 0.7).setDepth(5);
        this.tweens.add({
            targets: ball, alpha: 0, scale: 1.25, duration: 350,
            onComplete: () => ball.destroy(),
        });
        this.cameras.main.shake(200, 0.01);
        sfx.play('explosion');
        this.fx.explosion(x, y);
        for (const p of this.platforms) {                      // Explosionen zerstören brüchige Wände in der Nähe
            if (p.brechbar && p.hp > 0 && Phaser.Math.Distance.Between(x, y, p.x, p.y) <= radius + 50) { p.hp = 0; this.zuZerbrechen.push(p); }
        }

        for (const enemy of this.enemies) {
            if (!enemy.active) continue;
            if (Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y) <= radius) {
                if (enemy.takeDamage(6)) { this.kills += 1; this.zeigeTod(enemy); }
                else this.fx.blood(enemy.x, enemy.y);
            }
        }
        this.enemies = this.enemies.filter(e => e.active);  // gestorbene sofort aus der Liste nehmen
        // Fässer in der Nähe fangen Feuer und explodieren kurz danach (Kettenreaktion)
        for (const f of this.faesser) {
            if (f.active && !f.zuendet && Phaser.Math.Distance.Between(x, y, f.x, f.y) <= radius + 20) this.zuendeFass(f, 160);
        }
        if (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) <= radius) {
            this.player.takeDamage(selbstschaden, x);  // Eigenbeschuss: Abstand halten!
        }
    }

    // Eine Kugel trifft eine brüchige Erdwand: Brocken fliegen, das Bild zuckt. Nach genug Treffern zerbricht sie.
    treffeBroeckelig(wand, x, y) {
        if (!wand.active || wand.hp <= 0) return;
        wand.hp -= 1;
        this.fx.truemmerE.explode(6, x, y);
        sfx.play('hit');
        if (wand.deko) {
            wand.deko.setAlpha(0.55);
            this.time.delayedCall(70, () => { if (wand.deko && wand.deko.active) wand.deko.setAlpha(1); });
        }
        if (wand.hp <= 0) this.zuZerbrechen.push(wand);      // erst am Anfang des nächsten Bildes entfernen (nicht mitten in der Physik)
    }

    // Entfernt eine zerbrochene Wand: Staub, Brocken, Rauch, ein Knall und eine Meldung. Der Weg ist frei.
    zerbrich(wand) {
        if (!wand.active) return;
        const x = wand.x, y = wand.y;
        this.fx.truemmerE.explode(44, x, y);
        this.fx.staubE.explode(26, x, y);
        this.fx.rauchE.explode(8, x, y);
        this.cameras.main.shake(240, 0.01);
        sfx.play('explosion');
        if (wand.deko) wand.deko.destroy();
        const i = this.platforms.indexOf(wand);
        if (i >= 0) this.platforms.splice(i, 1);              // aus der Liste, die die Physik benutzt (dieselbe Liste bleibt bestehen)
        wand.destroy();
        this.showMessage('Die brüchige Erde gibt nach!\nEin verschütteter Gang wird frei.');
    }

    // Erzeugt eine Gegner-Kugel. Wird vom Fernkämpfer aufgerufen.
    spawnEnemyBullet(x, y, winkel, speed, damage) {
        sfx.play('enemyShot');
        const bullet = new Bullet(this, x, y, winkel, speed, 0xff6644);  // orange-rot
        bullet.damage = damage;  // Wir hängen den Schaden direkt an die Kugel
        this.physics.add.collider(bullet, this.platforms, () => { this.fx.sparks(bullet.x, bullet.y, 3); bullet.destroy(); });
        this.enemyBullets.push(bullet);
    }

    // update() läuft ca. 60-mal pro Sekunde.
    update() {
        // Nach der Niederlage läuft nur noch die Abfrage der Neustart-Taste.
        if (this.gameOver) {
            // JustDown ist nur im Moment des Tastendrucks wahr, nicht dauerhaft.
            if (Phaser.Input.Keyboard.JustDown(this.restartKey)) {
                this.scene.restart();  // create() läuft komplett neu: alles startet frisch
            }
            return;
        }

        // Brüchige Wände, die in diesem Bild zerbrechen sollen
        if (this.zuZerbrechen.length) {
            this.zuZerbrechen.forEach(w => this.zerbrich(w));
            this.zuZerbrechen = [];
        }
        // Hinweis für den Spieler: Aus der brüchigen Wand rieselt in regelmäßigen Abständen etwas Staub
        if (this.time.now > this.naechsterStaub) {
            this.naechsterStaub = this.time.now + 650;
            for (const p of this.platforms) {
                if (p.brechbar && p.active && Math.abs(p.x - this.player.x) < 700 && Math.abs(p.y - this.player.y) < 400) {
                    this.fx.staubE.explode(2, p.x + Phaser.Math.Between(-26, 26), p.y + Phaser.Math.Between(-40, 0));
                }
            }
        }

        // Pause: Esc friert diese Szene ein und legt die PauseScene darüber.
        if (Phaser.Input.Keyboard.JustDown(this.pauseKey) && Date.now() > this.pauseBlockedUntil) {
            this.scene.launch('PauseScene');
            this.scene.pause();
            return;
        }

        // N schaltet den Ton an/aus.
        if (Phaser.Input.Keyboard.JustDown(this.muteKey)) {
            this.showMessage(sfx.toggle() ? 'Ton aus (N)' : 'Ton an (N)');
        }

        // Landestaub: Wenn der Spieler schnell fallend aufkommt.
        const boden = this.player.body.blocked.down;
        if (boden && !this.warAmBoden && this.letzteFallgeschw > 350) {
            this.fx.dust(this.player.x, this.player.y + 24);
        }
        this.warAmBoden = boden;
        this.letzteFallgeschw = this.player.body.velocity.y;

        this.player.update();  // Der Spieler kümmert sich selbst um Laufen und Springen.

        // Schaden kommt irgendwo später im Frame an; wir vergleichen deshalb mit dem Wert des letzten Frames.
        if (this.player.health < (this.letzteHP ?? this.player.health)) { this.fx.blood(this.player.x, this.player.y, 10); this.cameras.main.shake(150, 0.007); this.cameras.main.flash(90, 140, 0, 0); }
        this.letzteHP = this.player.health;

        // --- Zielen ---
        // worldX/worldY = Mausposition in der Welt (nicht im Fenster).
        const pointer = this.input.activePointer;
        pointer.updateWorldPoint(this.cameras.main);
        this.crosshair.setPosition(pointer.worldX, pointer.worldY);

        // --- Schießen (Maustaste gedrückt halten = Dauerfeuer) ---
        // Schießen geht nur mit Kugel im Magazin und nicht während des Nachladens.
        if (pointer.isDown && this.player.canShoot() &&
            this.time.now - this.lastShot > this.player.fireDelay) {  // Feuerrate der Waffe
            this.shoot(pointer.worldX, pointer.worldY);
            this.player.magAmmo -= 1;  // jeder Schuss kostet eine Kugel aus dem Magazin
            this.lastShot = this.time.now;
        }

        // --- Granaten: Lunte prüfen, bei Ablauf explodieren ---
        for (const gr of this.grenadeList) {
            gr.update();
            if (gr.isReady()) {
                this.explode(gr.x, gr.y);
                gr.destroy();
            }
        }
        this.grenadeList = this.grenadeList.filter(gr => gr.active);

        // --- Gegenstände aufsammeln ---
        for (const pickup of this.pickups) {
            if (!pickup.active) continue;
            const beruehrt = Phaser.Geom.Intersects.RectangleToRectangle(
                pickup.getBounds(), this.player.getBounds()
            );
            if (beruehrt) pickup.applyTo(this.player);
        }
        this.pickups = this.pickups.filter(p => p.active);

        // --- Leuchtspur hinter allen Kugeln ---
        this.bullets.forEach(b => { if (b.active) this.fx.spur(b.x, b.y, true); });
        this.enemyBullets.forEach(b => { if (b.active) this.fx.spur(b.x, b.y, false); });

        // --- Gegner bewegen ---
        // Nur lebende Gegner bewegen: Eine Granate kann einen Gegner schon in diesem Frame zerstört haben.
        this.enemies.forEach(enemy => { if (enemy.active) enemy.update(); });
        this.drawCharacters();

        // --- Nahkampf: Gegner berührt den Spieler ---
        // takeDamage entscheidet selbst, ob der Schaden wirklich ankommt (Unverwundbarkeit).
        for (const enemy of this.enemies) {
            const beruehrt = Phaser.Geom.Intersects.RectangleToRectangle(
                enemy.getBounds(), this.player.getBounds()
            );
            if (beruehrt) {
                this.player.takeDamage(enemy.contactDamage, enemy.x);
            }
        }
        // --- Gegner-Kugeln treffen den Spieler ---
        for (const kugel of this.enemyBullets) {
            if (!kugel.active) continue;
            const getroffen = Phaser.Geom.Intersects.RectangleToRectangle(
                kugel.getBounds(), this.player.getBounds()
            );
            if (getroffen) {
                this.player.takeDamage(kugel.damage, kugel.x);  // Unverwundbarkeit gilt auch hier
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

        this.updateHealthBar();
        if (this.player.isDead()) {
            this.showEndScreen('BESIEGT', '#ff4444');
            return;
        }

        // --- Levelende: Hubschrauber erreicht? ---
        const amZiel = Phaser.Geom.Intersects.RectangleToRectangle(
            this.helicopter.getBounds(), this.player.getBounds()
        );
        this.updateEvacZone();
        this.updateBossBar();
        // Gewonnen ist nur, wer die Zone berührt UND die Kreatur besiegt hat.
        if (amZiel && this.evacOpen) {
            this.showEndScreen('EVAKUIERT!', '#66ff99', 'Level 01 abgeschlossen: Verlassene Militärzone');
            return;
        }

        // --- Treffer prüfen ---
        // Wir vergleichen jede Kugel mit jedem Gegner: Überlappen sich ihre Rechtecke?
        // getBounds() liefert das umgebende Rechteck eines Objekts.
        for (const bullet of this.bullets) {
            for (const enemy of this.enemies) {
                if (!bullet.active || !enemy.active) continue;  // schon zerstört? überspringen
                const getroffen = Phaser.Geom.Intersects.RectangleToRectangle(
                    bullet.getBounds(), enemy.getBounds()
                );
                if (getroffen) {
                    bullet.destroy();
                    // takeDamage meldet true zurück, wenn der Gegner dadurch gestorben ist.
                    if (enemy.takeDamage(1)) { this.kills += 1; this.zeigeTod(enemy); }
                    else this.fx.blood(bullet.x, bullet.y, 5);
                }
            }
        }
        // Kugeln (von beiden Seiten) treffen Fässer
        for (const kugel of this.bullets.concat(this.enemyBullets)) {
            if (!kugel.active) continue;
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
