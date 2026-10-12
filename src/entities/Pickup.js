// Ein Gegenstand zum Aufsammeln. "type" bestimmt, was er bewirkt: 'health' oder 'ammo'.
// Er braucht keine Physik: Er liegt nur da, und die Szene prüft, ob der Spieler ihn berührt.
const TYPES = {
    health: { color: 0x44ff88, amount: 30 },  // grün: heilt 30 HP
    ammo:   { color: 0xddaa33, amount: 15 },  // gelb: gibt 15 Schuss
};

export default class Pickup extends Phaser.GameObjects.Rectangle {
    constructor(scene, x, y, type) {
        super(scene, x, y, 20, 20, TYPES[type].color);
        scene.add.existing(this);
        this.setStrokeStyle(2, 0xffffff);  // weißer Rand, damit man sie gut sieht

        this.type = type;
        this.amount = TYPES[type].amount;
    }

    // Versucht, den Gegenstand dem Spieler zu geben.
    // Gibt true zurück, wenn er benutzt wurde (und verschwindet), sonst bleibt er liegen.
    applyTo(player) {
        if (this.type === 'health') {
            if (player.health >= player.maxHealth) return false;  // schon voll: liegen lassen
            player.health = Math.min(player.maxHealth, player.health + this.amount);
        } else if (this.type === 'ammo') {
            if (player.ammo >= player.maxAmmo) return false;
            player.ammo = Math.min(player.maxAmmo, player.ammo + this.amount);
        }
        this.destroy();
        return true;
    }
}
