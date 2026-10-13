import { zentriere, baueTitel, pixelKnopf, MITTE_X } from '../MenuStil.js';

// Die Pause: liegt als Schleier über dem eingefrorenen Spiel.
// GameScene wird mit scene.pause() angehalten (auch ihre Uhr!), diese Szene läuft daneben.
export default class PauseScene extends Phaser.Scene {
    constructor() {
        super('PauseScene');
    }

    create() {
        zentriere(this);
        this.input.setDefaultCursor('default');  // Mauszeiger zurückholen
        // Schleier über allem und eine Tafel in der Mitte
        this.add.rectangle(-600, -200, 2200, 940, 0x0a0714, 0.7).setOrigin(0, 0);
        const tafel = this.add.graphics();
        tafel.fillStyle(0x000000, 0.4).fillRect(MITTE_X - 190 + 5, 150 + 6, 380, 250);
        tafel.fillStyle(0xffdd55).fillRect(MITTE_X - 190, 150, 380, 250);
        tafel.fillStyle(0x14101f, 0.95).fillRect(MITTE_X - 187, 153, 374, 244);
        tafel.fillStyle(0xffffff, 0.06).fillRect(MITTE_X - 187, 153, 374, 5);
        this.titel = baueTitel(this, 'PAUSE', 206, 8);

        const weiter = () => {
            this.input.setDefaultCursor('none');
            this.scene.resume('GameScene');
            this.scene.stop();
        };
        const menue = () => {
            this.scene.stop('GameScene');
            this.scene.start('MenuScene');
        };
        this.input.keyboard.once('keydown-ESC', weiter);
        this.input.keyboard.once('keydown-M', menue);
        // Knöpfe zum Antippen (Handy) oder Anklicken
        this.knoepfe = [
            pixelKnopf(this, MITTE_X, 290, 320, 46, 'RESUME (ESC)', 0x58c06a, weiter, { px: 3 }),
            pixelKnopf(this, MITTE_X, 350, 320, 46, 'MAIN MENU (M)', 0x8a96a0, menue, { px: 3 }),
        ];
    }

    update(zeit) {
        this.titel.update(zeit);
        this.knoepfe.forEach(k => { k.an += ((k.hover ? 1 : 0) - k.an) * 0.25; k.zeichne(zeit); });
    }
}
