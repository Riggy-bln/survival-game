import { sfx } from '../Sound.js';
// Ein Gegenstand zum Aufsammeln. "type" bestimmt, was er bewirkt:
// 'health' (Heilung), 'ammo' (Munition) oder 'rifle' (die Waffe Sturmgewehr).
// Er braucht keine Physik: Er liegt nur da, und die Szene prüft, ob der Spieler ihn berührt.
const TYPES = {
    health: { color: 0x44ff88, amount: 0, label: '+1 Verbandskasten' },                // grün: Verbandskasten (wird mit H benutzt)
    ammo:   { color: 0xddaa33, amount: 15, label: '+15 Munition' },               // gelb: gibt 15 Schuss
    rifle:  { color: 0xff7a3d, amount: 0, w: 38, h: 14, weapon: 'rifle', label: 'Sturmgewehr!', msg: 'Sturmgewehr gefunden!\nSchneller feuern, 30 Schuss pro Magazin' },  // orange und länglich wie eine Waffe
    shotgun:{ color: 0xb5452a, amount: 0, w: 42, h: 14, weapon: 'shotgun', label: 'Schrotflinte!', msg: 'Schrotflinte gefunden!\nSechs Kugeln pro Schuss: stark auf kurze Distanz\n(ersetzt deine bisherige Waffe)' },
    sword:  { color: 0xcfd8e0, amount: 0, w: 36, h: 36, label: 'Schwert!' },        // silbern: Nahkampfwaffe, versteckt in den Höhlen
    grenade:{ color: 0x556b2f, amount: 2, w: 16, h: 16, label: '+2 Granaten' },  // olivgrün: 2 Granaten
};

export default class Pickup extends Phaser.GameObjects.Rectangle {
    constructor(scene, x, y, type) {
        // "?? 20" heißt: Gibt der Typ keine Größe an, nimm 20 Pixel.
        super(scene, x, y, TYPES[type].w ?? 20, TYPES[type].h ?? 20, TYPES[type].color);
        scene.add.existing(this);
        // Das Rechteck bleibt nur als Trefferfläche; gezeichnet und animiert wird der Gegenstand von der Szene
        // (drawPickup in GameScene.js): schwebend, mit Glanz und Funkeln.
        this.setVisible(false);
        this.phase = Math.random() * 6.28;   // jeder Gegenstand schwebt in eigenem Takt

        // Leuchtender Schein hinter dem Gegenstand, der sanft pulsiert: so findet man ihn leichter.
        this.glow = scene.add.circle(x, y, 22, TYPES[type].color, 0.25).setDepth(-1);
        scene.tweens.add({ targets: this.glow, scale: 1.5, alpha: 0.05, duration: 900, yoyo: true, repeat: -1 });

        this.type = type;
        this.amount = TYPES[type].amount;
    }

    // Beim Verschwinden auch den Schein entfernen.
    destroy(fromScene) {
        if (this.glow) this.glow.destroy();
        super.destroy(fromScene);
    }

    // Zeigt höchstens alle 2 Sekunden eine "voll"-Meldung (sonst käme sie in jedem Frame).
    // Gibt false zurück: Der Gegenstand bleibt liegen.
    meldeVoll(text) {
        const jetzt = this.scene.time.now;
        if (jetzt > (this.scene.letzteVollMeldung ?? 0)) {
            this.scene.showMessage(text);
            this.scene.letzteVollMeldung = jetzt + 2500;
        }
        return false;
    }

    // Versucht, den Gegenstand dem Spieler zu geben.
    // Gibt true zurück, wenn er benutzt wurde (und verschwindet), sonst bleibt er liegen.
    applyTo(player) {
        if (this.type === 'health') {
            // Der Verbandskasten kommt ins Inventar. Ist der Rucksack voll, bleibt er liegen.
            if (player.medkits >= player.maxMedkits) return this.meldeVoll('Verbandskasten-Rucksack voll (H zum Benutzen)');
            player.medkits += 1;
        } else if (this.type === 'ammo') {
            if (player.ammo >= player.maxAmmo) return this.meldeVoll('Munition voll');
            player.ammo = Math.min(player.maxAmmo, player.ammo + this.amount);
        } else if (this.type === 'grenade') {
            if (player.grenades >= player.maxGrenades) return this.meldeVoll('Granaten voll');
            player.grenades = Math.min(player.maxGrenades, player.grenades + this.amount);
        } else if (this.type === 'sword') {
            if (player.hatSchwert) return false;
            player.hatSchwert = true;
            player.waehle(2);
            this.scene.showMessage('Schwert gefunden!\nTaste 2 oder Mausrad: auswählen, Linksklick: zuschlagen\nKeine Munition nötig, wehrt Kugeln ab');
        } else if (TYPES[this.type].weapon) {
            const waffe = TYPES[this.type].weapon;
            if (player.weapon === waffe) return false;  // schon ausgerüstet
            player.equip(waffe);
            // this.scene ist die Szene, in der der Gegenstand liegt.
            this.scene.showMessage(TYPES[this.type].msg);
        }
        sfx.play('pickup');
        this.scene.fx.pickup(this.x, this.y, TYPES[this.type].color, TYPES[this.type].label);
        this.destroy();
        return true;
    }
}
