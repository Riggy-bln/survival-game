// Eine Kugel. "extends Phaser.GameObjects.Rectangle" heißt: Eine Bullet IST ein Rechteck
// und kann alles, was ein Rechteck kann, plus unsere eigenen Fähigkeiten.
export default class Bullet extends Phaser.GameObjects.Rectangle {
    // Der constructor läuft einmal, wenn wir "new Bullet(...)" schreiben.
    // "color = 0xffdd55" ist ein Standardwert: Wer keine Farbe angibt, bekommt Gelb.
    // Gegner-Kugeln übergeben eine andere Farbe.
    constructor(scene, x, y, winkel, speed, color = 0xffdd55) {
        super(scene, x, y, 14, 4, color);  // super(...) baut zuerst das Rechteck
        scene.add.existing(this);             // in die Szene aufnehmen (sichtbar machen)
        scene.physics.add.existing(this);     // Physik-Körper hinzufügen

        this.setRotation(winkel);             // in Flugrichtung drehen
        this.body.setAllowGravity(false);     // gerade fliegen, nicht fallen
        this.body.setVelocity(
            Math.cos(winkel) * speed,         // Anteil nach rechts
            Math.sin(winkel) * speed          // Anteil nach unten
        );
    }

    // Ist die Kugel aus der Welt geflogen? worldWidth/worldHeight kommen von der Szene.
    isOutside(worldWidth, worldHeight) {
        return this.x < 0 || this.x > worldWidth || this.y < 0 || this.y > worldHeight;
    }
}
