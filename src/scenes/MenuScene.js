// Der Startbildschirm: zeigt Titel und Steuerung. Enter oder ein Klick startet das Spiel.
// Eine eigene Szene, damit das Menü nichts mit der Spielwelt zu tun hat.
export default class MenuScene extends Phaser.Scene {
    constructor() {
        super('MenuScene');
    }

    create() {
        this.add.text(480, 110, 'SURVIVAL GAME', {
            fontSize: '64px', color: '#e0e6ea', fontStyle: 'bold',
        }).setOrigin(0.5);
        this.add.text(480, 175, 'Level 01: Verlassene Militärzone', {
            fontSize: '22px', color: '#9fb0bd',
        }).setOrigin(0.5);

        this.add.text(480, 300,
            'A / D  oder  Pfeile: Laufen        Leertaste: Springen\n' +
            'Maus: Zielen        Linke Maustaste: Schießen\n' +
            'R: Nachladen        H: Verbandskasten        G: Granate\n' +
            'Esc: Pause        N: Ton an/aus\n\n' +
            'Ziel: Erreiche den Hubschrauber, aber besiege vorher die Kreatur.',
            { fontSize: '18px', color: '#cfd8dc', align: 'center', lineSpacing: 8 }
        ).setOrigin(0.5);

        const start = this.add.text(480, 450, 'Enter oder Klick zum Starten', {
            fontSize: '28px', color: '#ffdd55',
        }).setOrigin(0.5);
        // Blinken, damit klar ist, dass das Spiel auf dich wartet.
        this.tweens.add({ targets: start, alpha: 0.3, duration: 700, yoyo: true, repeat: -1 });

        this.input.keyboard.once('keydown-ENTER', () => this.scene.start('GameScene'));
        this.input.once('pointerdown', () => this.scene.start('GameScene'));
    }
}
