import Enemy from './Enemy.js';
import { stufenHilfe } from '../Stufen.js';

// Ein Fernkämpfer: bleibt auf Abstand und schießt auf den Spieler.
// "extends Enemy" heißt: Er erbt Lebenspunkte, Treffer-Aufblitzen, Tod und Physik vom
// normalen Gegner. Wir überschreiben nur, was anders ist: das Verhalten in update().
export default class RangedEnemy extends Enemy {
    constructor(scene, x, y, patrolLeft, patrolRight) {
        super(scene, x, y, patrolLeft, patrolRight);

        this.baseColor = 0x8844cc;       // lila, damit man ihn vom roten Nahkämpfer unterscheidet
        this.setFillStyle(this.baseColor);
        this.contactDamage = 10;         // Berührung tut weniger weh als beim Nahkämpfer

        this.speed = 90;                 // Tempo beim Zurückweichen
        this.range = 600;                // ab dieser Entfernung (in Pixeln) bemerkt er den Spieler
        this.keepDistance = 220;         // näher als das? Dann weicht er zurück
        this.fireDelay = 1500;           // Pause zwischen zwei Schüssen (ms)
        this.aimTime = 520;              // Vorwarnzeit: so lange leuchtet er gelb vor dem Schuss
        this.bulletSpeed = 380;          // langsamer als die Spielerkugeln (900), also ausweichbar
        this.bulletDamage = 15;

        this.nextShot = scene.time.now + 1000;  // Zeitpunkt, ab dem er wieder schießen darf
        this.aimingUntil = 0;                   // 0 = zielt gerade nicht
    }

    // Überschreibt Enemy.update(): statt hin- und herzulaufen verhält er sich so:
    // außer Reichweite = stehen, zu nah = zurückweichen, sonst Schuss vorbereiten.
    update() {
        const player = this.scene.zielFuer(this);   // der nächste lebende Spieler (online auch Mitspieler)
        const now = this.scene.time.now;
        const abstand = Math.abs(player.x - this.x);

        // Phase "Zielen" (Vorwarnung): stehen bleiben, gelb leuchten, dann feuern.
        if (this.aimingUntil > 0) {
            this.body.setVelocityX(0);
            if (now >= this.aimingUntil) {
                // Der Winkel wird erst JETZT berechnet. Wer in der Vorwarnzeit wegläuft,
                // wird verfehlt. Das macht den Angriff fair.
                // Er zielt etwas VORAUS: Wer geradeaus davonrennt, läuft in den Schuss hinein (Stehenbleiben oder Richtungswechsel hilft).
                const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
                const flug = Math.min(0.9, dist / this.bulletSpeed) * 0.85;
                const vx = player.body ? player.body.velocity.x : (player.vx ?? 0), vy = player.body ? player.body.velocity.y : (player.vy ?? 0);
                const winkel = Phaser.Math.Angle.Between(this.x, this.y, player.x + vx * flug, player.y + Math.max(-60, Math.min(60, vy * flug * 0.5)));
                // Starke Schützen (5 oder mehr Leben) feuern zwei Kugeln knapp nebeneinander.
                const kugeln = this.maxHealth >= 5 ? [-0.07, 0.07] : [0];
                for (const v of kugeln) this.scene.spawnEnemyBullet(this.x, this.y, winkel + v, this.bulletSpeed, this.bulletDamage, this.geschossArt);
                // Mündungsfeuer an der Waffe (Schulter y - 6, Arm 12 + Waffe 26) und Rückstoß für die Zeichnung
                if (this.muendung !== false) this.scene.zeigeEffekt('muendung', this.x + Math.cos(winkel) * 38, this.y - 6 + Math.sin(winkel) * 38, winkel, 0.9, 0xff7744);
                this.lastShotTime = now;
                this.aimingUntil = 0;
                this.nextShot = now + this.fireDelay;
                this.setFillStyle(this.baseColor);
            }
            return;
        }

        // Spieler weit weg: nichts tun. "Weit" gilt auch senkrecht: Wer in einem Tunnel
        // unter oder auf einer anderen Etage steht, wird nicht durch die Wand beschossen.
        const hoehenUnterschied = Math.abs(player.y - this.y);
        if (abstand > this.range || hoehenUnterschied > 200) {
            this.body.setVelocityX(0);
            return;
        }

        // Spieler zu nah: vom Spieler weg laufen, aber nicht über den Bereich hinaus.
        if (abstand < this.keepDistance) {
            const weg = this.x < player.x ? -1 : 1;  // -1 = nach links, 1 = nach rechts
            const darf = (weg === -1 && this.x > this.patrolLeft) ||
                         (weg === 1 && this.x < this.patrolRight);
            this.body.setVelocityX(darf ? this.speed * weg : 0);
            if (darf) stufenHilfe(this, weg);
        } else {
            this.body.setVelocityX(0);
        }

        // Schuss vorbereiten: ab jetzt gelb leuchten (die Warnung für den Spieler).
        if (now >= this.nextShot) {
            this.aimingUntil = now + this.aimTime;
            this.setFillStyle(0xffee55);
        }
    }
}
