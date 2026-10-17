import { WAFFEN } from '../WaffenKonfig.js';

// Das Bild einer Rakete (Nase nach rechts, einmal im Nullpunkt gemalt, danach nur bewegt und gedreht). Auch die Gäste im Mehrspielermodus benutzen es.
export function baueRaketenBild(scene, x, y, winkel) {
    const g = scene.add.graphics({ x, y }).setDepth(6).setRotation(winkel);
    g.fillStyle(0x4a5a3a).fillRect(-12, -4, 20, 8);                   // Rumpf (olivgrün)
    g.fillStyle(0xd04a2a).fillTriangle(8, -4, 8, 4, 16, 0);            // rote Spitze
    g.fillStyle(0x2a2a2a).fillRect(-14, -6, 4, 12);                    // Leitwerk
    g.fillStyle(0xcfd8e0).fillRect(-4, -4, 2, 8);                      // Streifen
    return g;
}

// Feuer und Rauch am Heck einer Rakete (Gastgeber und Gäste)
export function raketenSpur(scene, x, y, winkel) {
    const hx = x - Math.cos(winkel) * 14, hy = y - Math.sin(winkel) * 14;
    scene.fx.feuerE.explode(1, hx, hy);
    if (Math.random() < 0.7) scene.fx.rauchE.explode(1, hx - Math.cos(winkel) * 6, hy - Math.sin(winkel) * 6);
}

// Eine Rakete: fliegt geradeaus, zieht Feuer und Rauch hinter sich her und explodiert beim Aufprall auf eine Wand oder einen Gegner
// (oder nach ihrer Flugzeit). Die Explosion selbst (Flächenschaden) macht GameScene.explode().
export default class Rakete extends Phaser.GameObjects.Rectangle {
    constructor(scene, x, y, winkel, besitzer, visuell) {
        super(scene, x, y, 24, 9, 0x000000, 0);              // das Rechteck ist nur die Trefferfläche
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.body.setAllowGravity(false);
        this.owner = besitzer;
        this.visuell = visuell;                               // Gast: nur ein Bild, kein Schaden
        this.winkel = winkel;
        this.explodiert = false;
        this.diesAt = scene.time.now + 2600;                  // nach 2,6 s Flugzeit explodiert sie von selbst
        this.body.setVelocity(Math.cos(winkel) * WAFFEN.rocket.tempo, Math.sin(winkel) * WAFFEN.rocket.tempo);
        this.bild = baueRaketenBild(scene, x, y, winkel);
    }

    update() {
        this.bild.setPosition(this.x, this.y);
        raketenSpur(this.scene, this.x, this.y, this.winkel);
    }

    destroy(fromScene) {
        if (this.bild) this.bild.destroy();
        super.destroy(fromScene);
    }
}
