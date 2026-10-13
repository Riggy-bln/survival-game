import RangedEnemy from './RangedEnemy.js';

// Ein Skelett mit Pfeil und Bogen: ein Fernkämpfer, der Pfeile statt Kugeln schießt.
// Er legt erst an und spannt den Bogen (der Körper leuchtet dabei gelb), dann fliegt der Pfeil: gezielt auf die Stelle, wo du
// gleich bist. Pfeile sind schneller als normale Gegnerkugeln und tun etwas mehr Schaden.
export default class Skelett extends RangedEnemy {
    constructor(scene, x, y, patrolLeft, patrolRight) {
        super(scene, x, y, patrolLeft, patrolRight);
        this.baseColor = 0x6a6552;        // verschlissene, graubraune Lumpen
        this.setFillStyle(this.baseColor);
        this.contactDamage = 10;
        this.range = 650;                 // sieht weit
        this.keepDistance = 260;          // hält mehr Abstand
        this.fireDelay = 1800;
        this.aimTime = 700;               // Bogen spannen dauert etwas länger
        this.bulletSpeed = 430;
        this.bulletDamage = 18;
        this.geschossArt = 'pfeil';
        this.muendung = false;            // kein Mündungsfeuer
        this.skelett = true;
    }
}
