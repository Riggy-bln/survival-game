// Eine Granate: fliegt im Bogen, prallt von Wänden ab und explodiert nach einer Zündzeit.
// Anders als eine Kugel hat sie Schwerkraft (sie fällt) und eine Lunte (Zeit bis zur Explosion).
export default class Grenade extends Phaser.GameObjects.Rectangle {
    constructor(scene, x, y, vx, vy) {
        super(scene, x, y, 14, 14, 0x556b2f);  // dunkles Olivgrün
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.setStrokeStyle(2, 0xffffff);

        this.body.setVelocity(vx, vy);
        this.body.setBounce(0.45, 0.45);   // federt beim Aufprall teilweise zurück
        this.body.setDragX(120);           // rollt aus: bremst am Boden ab
        this.explodeAt = scene.time.now + 1500;  // Lunte: 1,5 Sekunden
    }

    // Ist die Lunte abgebrannt?
    isReady() {
        return this.scene.time.now >= this.explodeAt;
    }

    // Blinkt kurz vor der Explosion rot: eine Warnung, auch für den Spieler selbst.
    update() {
        const rest = this.explodeAt - this.scene.time.now;
        const blinkt = rest < 600 && Math.floor(rest / 80) % 2 === 0;
        this.setFillStyle(blinkt ? 0xff3333 : 0x556b2f);
    }
}
