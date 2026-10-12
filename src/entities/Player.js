// Der Spieler: ein grünes Rechteck, das sich selbst steuern kann.
export default class Player extends Phaser.GameObjects.Rectangle {
    constructor(scene, x, y) {
        super(scene, x, y, 32, 48, 0x66cc66);
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.body.setCollideWorldBounds(true);  // nicht aus der Welt laufen können

        // Werte, die wir zum Feintuning des Spielgefühls später leicht ändern können
        this.speed = 250;      // Lauftempo in Pixeln pro Sekunde
        this.jumpSpeed = 520;  // Startgeschwindigkeit nach oben beim Sprung

        // Lebenspunkte: Zwei Zahlen reichen. "health" ändert sich, "maxHealth" bleibt fest.
        this.maxHealth = 100;
        this.health = this.maxHealth;

        // Munition: begrenzt. Ohne Munition kann man nicht schießen.
        this.maxAmmo = 60;
        this.ammo = 30;

        // Zeitpunkte (in Millisekunden seit Spielstart), bis zu denen etwas gilt.
        // 0 heißt: gilt gerade nicht, denn die Zeit ist schon vorbei.
        this.invulnerableUntil = 0;  // bis dahin kann der Spieler keinen Schaden nehmen
        this.stunnedUntil = 0;       // bis dahin kann er nicht laufen (Rückstoß)

        // Tasten, die der Spieler abfragt
        this.cursors = scene.input.keyboard.createCursorKeys();
        this.keys = scene.input.keyboard.addKeys('A,D,SPACE');
    }

    // Ist der Spieler besiegt?
    isDead() {
        return this.health <= 0;
    }

    // Versucht, Schaden zuzufügen. fromX = x-Position des Angreifers (für den Rückstoß).
    // Gibt true zurück, wenn der Schaden wirklich angekommen ist.
    takeDamage(amount, fromX) {
        const now = this.scene.time.now;

        // Solange die Unverwundbarkeit läuft, passiert nichts. Genau das verhindert,
        // dass dieselbe Berührung in jedem der 60 Frames pro Sekunde erneut Schaden macht.
        if (now < this.invulnerableUntil) return false;

        this.health = Math.max(0, this.health - amount);  // nie unter 0
        this.invulnerableUntil = now + 1000;  // 1 Sekunde Schutz
        this.stunnedUntil = now + 250;        // kurz die Kontrolle verlieren

        // Rückstoß: weg vom Angreifer und ein kleiner Sprung nach oben.
        const richtung = this.x < fromX ? -1 : 1;
        this.body.setVelocity(richtung * 300, -250);
        return true;
    }

    // Wird von der Szene in jedem Frame aufgerufen.
    update() {
        const body = this.body;
        const now = this.scene.time.now;

        // Während der Unverwundbarkeit blinken: alle 100 ms zwischen durchsichtig
        // und normal wechseln. So sieht man, dass man gerade geschützt ist.
        const geschuetzt = now < this.invulnerableUntil;
        this.setAlpha(geschuetzt && Math.floor(now / 100) % 2 === 0 ? 0.3 : 1);

        // Beim Rückstoß nicht laufen, sonst würde die Steuerung ihn sofort überschreiben.
        if (now < this.stunnedUntil) return;

        // Laufen
        if (this.cursors.left.isDown || this.keys.A.isDown) {
            body.setVelocityX(-this.speed);   // negativ = nach links
        } else if (this.cursors.right.isDown || this.keys.D.isDown) {
            body.setVelocityX(this.speed);    // positiv = nach rechts
        } else {
            body.setVelocityX(0);
        }

        // Springen: nur auf festem Grund. In Phaser zeigt "oben" ins Negative!
        const jumpPressed = this.cursors.up.isDown || this.keys.SPACE.isDown;
        if (jumpPressed && body.blocked.down) {
            body.setVelocityY(-this.jumpSpeed);
        }
    }
}
