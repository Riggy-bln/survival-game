// Die Pause: liegt als Schleier über dem eingefrorenen Spiel.
// GameScene wird mit scene.pause() angehalten (auch ihre Uhr!), diese Szene läuft daneben.
export default class PauseScene extends Phaser.Scene {
    constructor() {
        super('PauseScene');
    }

    create() {
        this.cameras.main.setZoom(this.scale.width / 960).centerOn(480, 270);
        this.input.setDefaultCursor('default');  // Mauszeiger zurückholen
        this.add.rectangle(0, 0, 960, 540, 0x000000, 0.6).setOrigin(0, 0);
        this.add.text(480, 220, 'PAUSE', { fontSize: '72px', color: '#ffffff' }).setOrigin(0.5);
        this.add.text(480, 300, 'Esc: weiter        M: Hauptmenü', {
            fontSize: '24px', color: '#cfd8dc',
        }).setOrigin(0.5);

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
        [['Weiter', 380, weiter], ['Hauptmenü', 436, menue]].forEach(([text, y, aktion]) => {
            const r = this.add.rectangle(480, y, 300, 46, 0x1b2630, 0.95).setStrokeStyle(2, 0x6f8190).setInteractive({ useHandCursor: true });
            this.add.text(480, y, text, { fontSize: '24px', color: '#e6edf2' }).setOrigin(0.5);
            r.on('pointerdown', aktion);
        });
    }
}
