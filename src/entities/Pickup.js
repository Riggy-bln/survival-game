// Ein Gegenstand zum Aufsammeln. "type" bestimmt, was er bewirkt:
// 'health' (Heilung), 'ammo' (Munition) oder 'rifle' (die Waffe Sturmgewehr).
// Er braucht keine Physik: Er liegt nur da, und die Szene prüft, ob der Spieler ihn berührt.
const TYPES = {
    health: { color: 0x44ff88, amount: 0 },                // grün: Verbandskasten (wird mit H benutzt)
    ammo:   { color: 0xddaa33, amount: 15 },               // gelb: gibt 15 Schuss
    rifle:  { color: 0xff7a3d, amount: 0, w: 38, h: 14 },  // orange und länglich wie eine Waffe
    grenade:{ color: 0x556b2f, amount: 2, w: 16, h: 16 },  // olivgrün: 2 Granaten
};

export default class Pickup extends Phaser.GameObjects.Rectangle {
    constructor(scene, x, y, type) {
        // "?? 20" heißt: Gibt der Typ keine Größe an, nimm 20 Pixel.
        super(scene, x, y, TYPES[type].w ?? 20, TYPES[type].h ?? 20, TYPES[type].color);
        scene.add.existing(this);
        this.setStrokeStyle(2, 0xffffff);  // weißer Rand, damit man sie gut sieht

        this.type = type;
        this.amount = TYPES[type].amount;
    }

    // Versucht, den Gegenstand dem Spieler zu geben.
    // Gibt true zurück, wenn er benutzt wurde (und verschwindet), sonst bleibt er liegen.
    applyTo(player) {
        if (this.type === 'health') {
            // Der Verbandskasten kommt ins Inventar. Ist der Rucksack voll, bleibt er liegen.
            if (player.medkits >= player.maxMedkits) return false;
            player.medkits += 1;
        } else if (this.type === 'ammo') {
            if (player.ammo >= player.maxAmmo) return false;
            player.ammo = Math.min(player.maxAmmo, player.ammo + this.amount);
        } else if (this.type === 'grenade') {
            if (player.grenades >= player.maxGrenades) return false;
            player.grenades = Math.min(player.maxGrenades, player.grenades + this.amount);
        } else if (this.type === 'rifle') {
            if (player.weapon === 'rifle') return false;  // schon ausgerüstet
            player.equip('rifle');
            // this.scene ist die Szene, in der der Gegenstand liegt.
            this.scene.showMessage('Sturmgewehr gefunden!\nSchneller feuern, 30 Schuss pro Magazin');
        }
        this.destroy();
        return true;
    }
}
