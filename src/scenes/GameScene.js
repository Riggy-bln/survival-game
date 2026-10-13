// "import" holt Code aus anderen Dateien. So bleibt jede Datei klein und übersichtlich.
import Player from '../entities/Player.js';
import Bullet from '../entities/Bullet.js';
import Enemy from '../entities/Enemy.js';
import RangedEnemy from '../entities/RangedEnemy.js';
import Boss from '../entities/Boss.js';
import Pickup from '../entities/Pickup.js';
import level from '../levels/Level01.js';  // die Leveldaten (Listen)

// Größe der Spielwelt. Das Fenster ist nur 960 breit, die Welt ist viel größer.
// Die Breite kommt jetzt aus der Level-Datei.
const WORLD_WIDTH = level.width;
// Die Welt ist jetzt höher als das Fenster (540): oben Platz für Gebäude, unten für Tunnel.
// Die Kamera scrollt deshalb auch senkrecht. "boden" ist die Höhe der Oberfläche.
const WORLD_HEIGHT = level.height;
const BODEN = level.boden;

// Die Szene baut die Welt auf und lässt die Spielobjekte zusammenarbeiten.
export default class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    // create() läuft einmal beim Start: hier bauen wir die Welt auf.
    create() {
        this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

        // --- Dekoration: Ruinen im Hintergrund (ohne Physik) ---
        for (let x = 300; x < WORLD_WIDTH; x += 450) {
            const hoehe = 100 + (x % 3) * 60;
            this.add.rectangle(x, BODEN - hoehe / 2, 80, hoehe, 0x2a3540);
        }

        // --- Dekoration und Schilder aus der Level-Datei (ohne Physik) ---
        for (const d of level.decor) {
            this.add.rectangle(d.x, d.y, d.w, d.h, d.color);
        }
        for (const s of level.signs) {
            this.add.text(s.x, s.y, s.text, {
                fontSize: '16px', color: '#cfd8dc', align: 'center',
            }).setOrigin(0.5);
        }

        // --- Boden und Plattformen ---
        this.platforms = [];
        // Für jeden Eintrag der Liste in Level01.js eine Plattform bauen.
        // "p" steht für einen Eintrag. Fehlt "color", gilt die Standardfarbe nach dem "??".
        for (const p of level.platforms) {
            this.addPlatform(p.x, p.y, p.w, p.h, p.color ?? 0x6b5b4a);
        }

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

        // --- Schießen ---
        this.bullets = [];
        this.lastShot = 0;

        // --- Anzeige (Lebensbalken) ---
        // setScrollFactor(0) heftet ein Objekt an den Bildschirm statt an die Welt.
        // Es bleibt dann an derselben Stelle im Fenster, obwohl die Kamera scrollt.
        this.hpBack = this.add.rectangle(20, 20, 204, 24, 0x000000).setOrigin(0, 0);
        this.hpBar = this.add.rectangle(22, 22, 200, 20, 0x44cc44).setOrigin(0, 0);
        this.hpText = this.add.text(30, 24, '', { fontSize: '16px', color: '#ffffff' });
        // Alle drei Teile gemeinsam: am Bildschirm festhalten und über alles andere legen.
        this.ammoText = this.add.text(22, 52, '', { fontSize: '16px', color: '#ffdd55' });
        [this.hpBack, this.hpBar, this.hpText, this.ammoText].forEach(obj => {
            obj.setScrollFactor(0).setDepth(20);
        });

        // --- Lebensanzeige der starken Kreatur (oben in der Mitte, erst sichtbar, wenn sie erwacht) ---
        this.bossBack = this.add.rectangle(480, 28, 304, 18, 0x000000);
        this.bossBar = this.add.rectangle(330, 28, 300, 14, 0xcc3333).setOrigin(0, 0.5);
        this.bossLabel = this.add.text(480, 50, 'MUTIERTE KREATUR', {
            fontSize: '14px', color: '#ffffff',
        }).setOrigin(0.5);
        this.bossUI = [this.bossBack, this.bossBar, this.bossLabel];
        this.bossUI.forEach(obj => obj.setScrollFactor(0).setDepth(20).setVisible(false));

        // --- Statistik für den Endbildschirm ---
        this.startTime = this.time.now;              // Beginn des Versuchs (in Millisekunden)
        this.kills = 0;                              // besiegte Gegner
        this.totalEnemies = this.enemies.length;     // alle Gegner im Level, Kreatur eingeschlossen

        // --- Zustand und Neustart ---
        this.gameOver = false;
        // Neustart auf Enter, denn R bedeutet jetzt Nachladen.
        this.restartKey = this.input.keyboard.addKey('ENTER');
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
        // Rot, wenn gar keine Munition mehr da ist; orange bei leerem Magazin / beim Nachladen.
        const leer = p.magAmmo === 0 && p.ammo === 0;
        this.ammoText.setColor(leer ? '#ff4444' : (p.isReloading() || p.magAmmo === 0 ? '#ff9944' : '#ffdd55'));
    }

    // Blendet eine Meldung oben im Bild ein, die nach etwa zwei Sekunden verblasst.
    showMessage(text) {
        const meldung = this.add.text(480, 100, text, {
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
        this.physics.pause();                 // Physik anhalten: alles friert ein
        this.input.setDefaultCursor('default');  // normalen Mauszeiger zurückholen
        this.crosshair.setVisible(false);
        this.player.setAlpha(1);

        // Halbdurchsichtiger dunkler Schleier über dem ganzen Fenster
        this.add.rectangle(0, 0, 960, 540, 0x000000, 0.65)
            .setOrigin(0, 0).setScrollFactor(0).setDepth(30);

        // Statistik: Spielzeit in Minuten:Sekunden. padStart(2, '0') füllt vorne mit Nullen auf,
        // damit 5 Sekunden als "05" erscheinen und nicht als "5".
        const sekunden = Math.floor((this.time.now - this.startTime) / 1000);
        const zeit = `${Math.floor(sekunden / 60)}:${String(sekunden % 60).padStart(2, '0')}`;
        const statistik = `Zeit: ${zeit}     Gegner besiegt: ${this.kills} / ${this.totalEnemies}     ` +
                          `Leben: ${this.player.health} / ${this.player.maxHealth}`;

        // Alle Texte: am Bildschirm festgehalten (ScrollFactor 0) und über dem Schleier (Depth 31).
        const zeige = (y, text, groesse, farbeText) => {
            this.add.text(480, y, text, { fontSize: groesse, color: farbeText })
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
        const bullet = new Bullet(this, this.player.x, this.player.y, winkel, 900);

        // Trifft die Kugel eine Plattform, verschwindet sie.
        this.physics.add.collider(bullet, this.platforms, () => bullet.destroy());
        this.bullets.push(bullet);
    }

    // Erzeugt eine Gegner-Kugel. Wird vom Fernkämpfer aufgerufen.
    spawnEnemyBullet(x, y, winkel, speed, damage) {
        const bullet = new Bullet(this, x, y, winkel, speed, 0xff6644);  // orange-rot
        bullet.damage = damage;  // Wir hängen den Schaden direkt an die Kugel
        this.physics.add.collider(bullet, this.platforms, () => bullet.destroy());
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

        this.player.update();  // Der Spieler kümmert sich selbst um Laufen und Springen.

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

        // --- Gegenstände aufsammeln ---
        for (const pickup of this.pickups) {
            if (!pickup.active) continue;
            const beruehrt = Phaser.Geom.Intersects.RectangleToRectangle(
                pickup.getBounds(), this.player.getBounds()
            );
            if (beruehrt) pickup.applyTo(this.player);
        }
        this.pickups = this.pickups.filter(p => p.active);

        // --- Gegner bewegen ---
        this.enemies.forEach(enemy => enemy.update());

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
                    if (enemy.takeDamage(1)) this.kills += 1;
                }
            }
        }
        // Tote Gegner aus der Liste entfernen (nur die, die noch leben, bleiben).
        this.enemies = this.enemies.filter(e => e.active);

        // --- Aufräumen: zerstörte und weit entfernte Kugeln entfernen ---
        this.bullets = this.bullets.filter(b => {
            if (!b.active) return false;
            if (b.isOutside(WORLD_WIDTH, WORLD_HEIGHT)) {
                b.destroy();
                return false;
            }
            return true;
        });
    }
}
