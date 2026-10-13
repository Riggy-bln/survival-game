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

        this.input.keyboard.once('keydown-ESC', () => {
            this.input.setDefaultCursor('none');
            this.scene.resume('GameScene');
            this.scene.stop();
        });
        this.input.keyboard.once('keydown-M', () => {
            this.scene.stop('GameScene');
            this.scene.start('MenuScene');
        });
    }
}
