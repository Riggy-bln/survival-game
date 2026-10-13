// Ein explosives Fass. Es steht nur herum, bis ein Schuss oder eine Explosion es trifft.
// Das Rechteck bleibt unsichtbar (nur die Trefferfläche); gemalt wird es von der Szene.
export default class Fass extends Phaser.GameObjects.Rectangle {
    constructor(scene, x, y) {
        super(scene, x, y, 26, 38, 0xb03a2a);
        scene.add.existing(this);
        this.setVisible(false);
        this.zuendet = false;   // wurde es schon getroffen? (verhindert doppeltes Explodieren)
    }
}
