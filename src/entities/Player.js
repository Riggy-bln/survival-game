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

        // Munition in zwei Teilen, wie bei echten Waffen:
        //   magAmmo = Kugeln im Magazin (die kann man sofort verschießen)
        //   ammo    = Reserve im Rucksack (die kommt beim Nachladen ins Magazin)
        this.magSize = 12;       // so viele Kugeln passen ins Magazin
        this.magAmmo = 12;       // Start: volles Magazin
        this.maxAmmo = 60;       // größte Reserve, die man tragen kann
        this.ammo = 30;          // Start-Reserve
        this.reloadTime = 1200;  // Nachladedauer in Millisekunden
        this.reloadingUntil = 0; // 0 = lädt gerade nicht nach

        // Zeitpunkte (in Millisekunden seit Spielstart), bis zu denen etwas gilt.
        // 0 heißt: gilt gerade nicht, denn die Zeit ist schon vorbei.
        this.invulnerableUntil = 0;  // bis dahin kann der Spieler keinen Schaden nehmen
        this.stunnedUntil = 0;       // bis dahin kann er nicht laufen (Rückstoß)

        // Tasten, die der Spieler abfragt
        this.cursors = scene.input.keyboard.createCursorKeys();
        this.keys = scene.input.keyboard.addKeys('A,D,SPACE,R');
    }

    // Lädt gerade nach?
    isReloading() {
        return this.reloadingUntil > 0;
    }

    // Darf der Spieler jetzt schießen? Nur mit Kugel im Magazin und nicht beim Nachladen.
    canShoot() {
        return this.magAmmo > 0 && !this.isReloading();
    }

    // Beginnt das Nachladen, aber nur wenn es sinnvoll ist:
    // nicht doppelt, nicht bei vollem Magazin, nicht ohne Reserve.
    startReload() {
        if (this.isReloading() || this.magAmmo >= this.magSize || this.ammo <= 0) return;
        this.reloadingUntil = this.scene.time.now + this.reloadTime;
    }

    // Wenn die Nachladezeit vorbei ist, wandern Kugeln aus der Reserve ins Magazin.
    updateReload() {
        if (!this.isReloading() || this.scene.time.now < this.reloadingUntil) return;
        const benoetigt = this.magSize - this.magAmmo;   // so viele fehlen im Magazin
        const kugeln = Math.min(benoetigt, this.ammo);   // mehr als die Reserve gibt es nicht
        this.magAmmo += kugeln;
        this.ammo -= kugeln;
        this.reloadingUntil = 0;
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

        // Nachladen: Taste R startet es. JustDown ist nur im Moment des Drückens wahr.
        if (Phaser.Input.Keyboard.JustDown(this.keys.R)) this.startReload();
        // Ist das Magazin leer, aber noch Reserve da? Dann automatisch nachladen.
        if (this.magAmmo === 0) this.startReload();
        this.updateReload();

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
