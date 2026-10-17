import { MESSER } from '../WaffenKonfig.js';

// Ein Wurfmesser. Es fliegt im Bogen (leichte Schwerkraft, dreht sich) und hat vier Zustände:
//   'flug'   fliegt noch
//   'fall'   hat einen Gegner getroffen oder ist zu weit geflogen: fällt zu Boden
//   'steckt' steckt in einer Wand: bleibt dort
//   'liegt'  liegt auf dem Boden
// 'steckt' und 'liegt' kann der Spieler wieder aufheben (die Szene prüft das). Danach wird das Messer zerstört und der Zähler im Inventar steigt.
// "eingesammelt" verhindert, dass dasselbe Messer zweimal gezählt wird.
export default class Messer extends Phaser.GameObjects.Rectangle {
    constructor(scene, x, y, winkel, besitzer, visuell) {
        super(scene, x, y, 22, 5, 0xdfe6ee);              // die Klinge
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.setDepth(6).setStrokeStyle(1, 0x8a96a2);
        this.griff = scene.add.rectangle(x, y, 9, 6, 0x5a3d22).setDepth(6);   // der Griff (hängt hinter der Klinge)
        this.body.setAllowGravity(false);                  // die Flugbahn rechnen wir selbst (siehe update), damit sie sich einstellen lässt
        this.body.setBounce(0.15, 0.15);
        this.body.setDragX(0);
        this.owner = besitzer;
        this.visuell = visuell;                            // Gast: nur ein Bild, kein Schaden
        this.zustand = 'flug';
        this.eingesammelt = false;
        this.gelandetAm = 0;
        this.weg = 0;                                      // bisher zurückgelegter Weg (Pixel)
        this.drehung = (Math.cos(winkel) >= 0 ? 1 : -1) * 0.55;   // Drehung pro Bild (Bogenmaß)
        this.rotation = winkel;
        this.body.setVelocity(Math.cos(winkel) * MESSER.tempo, Math.sin(winkel) * MESSER.tempo);
    }

    // Fällt zu Boden (nach einem Treffer oder zu großer Reichweite): jetzt gilt die normale Schwerkraft der Welt.
    faelltJetzt(vx = 0, vy = -120) {
        this.zustand = 'fall';
        this.body.setAllowGravity(true);
        this.body.setDragX(500);
        this.body.setVelocity(vx, vy);
    }

    // Wand getroffen: stecken bleiben (Körper aus) oder, beim Aufprall von oben, flach liegen bleiben.
    landet(aufBoden) {
        const jetzt = this.scene.time.now;
        this.gelandetAm = jetzt;
        if (aufBoden) {
            this.zustand = 'liegt';
            this.body.setAllowGravity(true);
            this.body.setDragX(900);
            this.rotation = Math.cos(this.rotation) >= 0 ? 0 : Math.PI;
        } else {
            this.zustand = 'steckt';
            this.rotation = Math.atan2(this.body.velocity.y, this.body.velocity.x);   // zeigt in die Wand
            this.body.setVelocity(0, 0);
            this.body.setAllowGravity(false);
            this.body.enable = false;
        }
    }

    // Kann man es aufheben?
    liegtBereit() {
        return !this.eingesammelt && (this.zustand === 'liegt' || this.zustand === 'steckt') && this.scene.time.now - this.gelandetAm > MESSER.aufhebenNach;
    }

    update(delta) {
        const dt = delta / 1000;
        if (this.zustand === 'flug') {
            this.body.velocity.y += MESSER.schwerkraft * dt;          // leichte Schwerkraft: Bogen statt gerader Linie
            this.rotation += this.drehung;
            this.weg += this.body.speed * dt;
            if (this.weg > MESSER.reichweite) this.faelltJetzt(this.body.velocity.x * 0.4, this.body.velocity.y);
        } else if (this.zustand === 'fall') {
            this.rotation += this.drehung * 0.6;
        } else if (this.zustand === 'liegt' && this.body.blocked.down && Math.abs(this.body.velocity.x) < 8) {
            this.body.setVelocityX(0);
        }
        const r = this.rotation;
        this.griff.setPosition(this.x - Math.cos(r) * 14, this.y - Math.sin(r) * 14).setRotation(r);
    }

    destroy(fromScene) {
        if (this.griff) this.griff.destroy();
        super.destroy(fromScene);
    }
}
