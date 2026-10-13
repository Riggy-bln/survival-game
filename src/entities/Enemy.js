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
    }

    // Zieht Lebenspunkte ab. Gibt true zurück, wenn der Gegner dadurch gestorben ist.
    takeDamage(amount) {
        this.health -= amount;

        if (this.health <= 0) {
            sfx.play('kill');
            this.destroy();
            return true;
        }

        sfx.play('hit');
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
        // Am Ende des Patrouillenbereichs umdrehen.
        if (this.x <= this.patrolLeft) this.direction = 1;
        if (this.x >= this.patrolRight) this.direction = -1;

        this.body.setVelocityX(this.speed * this.direction);
        stufenHilfe(this, this.direction);   // kleine Stufen (sanfte Hänge) nehmen
    }
}
