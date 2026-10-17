import { sfx } from '../Sound.js';
import { stufenHilfe } from '../Stufen.js';
// Ein einfacher Gegner: läuft zwischen zwei Punkten hin und her und hat Lebenspunkte.
export default class Enemy extends Phaser.GameObjects.Rectangle {
    // patrolLeft und patrolRight sind die x-Grenzen, zwischen denen er patrouilliert.
    // Breite, Höhe und Farbe sind optional (Standardwerte): So kann eine Unterklasse,
    // zum Beispiel die große Kreatur, den Körper größer und anders gefärbt bauen.
    constructor(scene, x, y, patrolLeft, patrolRight, width = 32, height = 48, color = 0xcc4444) {
        super(scene, x, y, width, height, color);
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.patrolLeft = patrolLeft;
        this.patrolRight = patrolRight;
        this.speed = 80;       // langsamer als der Spieler (250)
        this.direction = 1;    // 1 = nach rechts, -1 = nach links
        this.health = 3;       // so viele Treffer hält er aus
        this.contactDamage = 20;  // Schaden, wenn er den Spieler berührt
        this.baseColor = color;  // Normalfarbe; zu ihr kehrt er nach dem Aufblitzen zurück

        // Verfolgung: Bemerkt der Nahkämpfer einen Spieler auf etwa gleicher Höhe, rennt er ihm hinterher.
        // Er bleibt aber an einer "Leine" (höchstens leine Pixel außerhalb seines Patrouillenbereichs)
        // und läuft nie über eine Kante. Der Spieler ist trotzdem schneller (250), aber nicht mehr sicher.
        this.jagdReichweite = 380;   // ab dieser waagerechten Entfernung bemerkt er den Spieler
        this.jagdTempo = 150;        // Lauftempo bei der Verfolgung
        this.leine = 260;
        this.naechsterSprung = 0;
    }

    // Gibt es direkt vor ihm festen Boden? (Damit er bei der Verfolgung nicht in Gruben und von Klippen läuft.)
    bodenVoraus(richtung) {
        const px = this.x + richtung * (this.width / 2 + 10), fuss = this.body.bottom;
        for (const p of this.scene.platforms) {
            const b = p.body;
            if (!b || px < b.left || px > b.right) continue;
            if (b.top >= fuss - 6 && b.top <= fuss + 44) return true;
        }
        return false;
    }

    // Verfolgt den Spieler. Gibt true zurück, wenn er gerade jagt (dann entfällt die Patrouille).
    jage() {
        const ziel = this.scene.zielFuer(this);
        if (!ziel || ziel.tot) return false;
        const dx = ziel.x - this.x, dy = ziel.y - this.y;
        if (Math.abs(dx) > this.jagdReichweite || Math.abs(dy) > 120) return false;
        const richtung = Math.sign(dx) || 1;
        const erlaubt = richtung === 1 ? this.x < this.patrolRight + this.leine : this.x > this.patrolLeft - this.leine;
        this.direction = richtung;
        if (!erlaubt || Math.abs(dx) < 20 || !this.bodenVoraus(richtung)) { this.body.setVelocityX(0); return true; }
        this.body.setVelocityX(this.jagdTempo * richtung);
        stufenHilfe(this, richtung);
        // Steht eine höhere Kante im Weg (zum Beispiel eine Kiste), hüpft er darüber.
        const blockiert = richtung > 0 ? this.body.blocked.right : this.body.blocked.left;
        if (blockiert && this.body.blocked.down && this.scene.time.now > this.naechsterSprung) {
            this.body.setVelocityY(-430);
            this.naechsterSprung = this.scene.time.now + 800;
        }
        return true;
    }

    // Zieht Lebenspunkte ab. Gibt true zurück, wenn der Gegner dadurch gestorben ist.
    // art: 'kugel' (Standard), 'feuer' (Flammenwerfer: kein Treffer-Klang). Der nasse Klang kommt aus Sound.js.
    takeDamage(amount, art = 'kugel') {
        this.health -= amount;

        if (this.health <= 0) {
            sfx.gegnerTod(art);
            this.destroy();
            return true;
        }

        sfx.gegnerTreffer(amount, art);
        // Kurz weiß aufblitzen, damit man den Treffer sieht.
        this.setFillStyle(0xffffff);
        // delayedCall führt eine Funktion nach 80 Millisekunden aus.
        this.scene.time.delayedCall(80, () => {
            // Der Gegner könnte in der Zwischenzeit zerstört worden sein.
            if (this.active) this.setFillStyle(this.baseColor);
        });
        return false;
    }

    // Wird in jedem Frame aufgerufen.
    update() {
        if (this.jage()) return;
        // Am Ende des Patrouillenbereichs umdrehen.
        if (this.x <= this.patrolLeft) this.direction = 1;
        if (this.x >= this.patrolRight) this.direction = -1;

        this.body.setVelocityX(this.speed * this.direction);
        stufenHilfe(this, this.direction);   // kleine Stufen (sanfte Hänge) nehmen
    }
}
