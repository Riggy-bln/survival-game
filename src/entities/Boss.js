import Enemy from './Enemy.js';
import { sfx } from '../Sound.js';

// Die stärkere Kreatur. Sie wechselt zwischen Verfolgen und drei verschiedenen Angriffen.
//
//   walk      -> läuft auf den Spieler zu (aktiv, nicht langsam)
//   telegraph -> bleibt stehen und leuchtet in der FARBE des kommenden Angriffs (Vorwarnung)
//   charge    -> Sturmangriff: rast waagerecht in die Richtung, in der der Spieler stand
//   leap      -> Sprungangriff: springt auf den Spieler zu, bei der Landung laufen am Boden
//                zwei Druckwellen nach links und rechts (darüber springen!)
//   spit      -> Spuckangriff (erst in der Wut-Phase): drei Geschosse im Fächer
//   tired     -> kurz erschöpft und blass: jetzt zählt jeder Treffer doppelt
//
// Farben der Vorwarnung:  orange = Sturmangriff,  gelb = Sprung,  lila = Spucken.
// Unter der Hälfte der Lebenspunkte wird sie wütend: schneller, kürzere Vorwarnung, mehr Angriffe.
export default class Boss extends Enemy {
    constructor(scene, x, y, patrolLeft, patrolRight) {
        // 84 breit, 100 hoch, dunkelgrün: deutlich größer als normale Gegner
        super(scene, x, y, patrolLeft, patrolRight, 84, 100, 0x2f6b4a);

        this.maxHealth = 50;
        this.health = this.maxHealth;

        this.walkSpeed = 120;
        this.chargeSpeed = 520;
        this.dir = 1;             // Richtung des aktuellen Angriffs (-1 links, 1 rechts)
        this.nextAttack = 'charge';

        this.state = 'dormant';   // "schläft", bis der Spieler nah genug kommt
        this.stateUntil = 0;      // Zeitpunkt, an dem die aktuelle Phase endet
        this.leapStart = 0;       // Zeitpunkt des Absprungs
        this.activated = false;   // wurde sie schon geweckt? (für die Lebensanzeige)
    }

    isEnraged() {
        return this.health <= this.maxHealth / 2;
    }

    // Wechselt die Phase: merkt sich Dauer und Farbe.
    // baseColor setzen wir mit, damit das Aufblitzen beim Treffer zur richtigen Farbe zurückkehrt.
    setPhase(name, dauer, farbe) {
        this.state = name;
        this.stateUntil = this.scene.time.now + dauer;
        this.baseColor = farbe;
        this.setFillStyle(farbe);
    }

    // Im erschöpften Zustand zählt jeder Treffer doppelt.
    takeDamage(amount) {
        return super.takeDamage(this.state === 'tired' ? amount * 2 : amount);
    }

    // Wählt zufällig den nächsten Angriff aus einer Liste.
    // In der Wut-Phase kommt "spit" dazu.
    chooseAttack() {
        const angebot = this.isEnraged() ? ['charge', 'leap', 'spit'] : ['charge', 'leap'];
        // Nicht zweimal hintereinander derselbe Angriff, sonst wirkt es eintönig.
        const frei = angebot.filter(a => a !== this.nextAttack);
        return Phaser.Math.RND.pick(frei);
    }

    update() {
        const player = this.scene.player;
        const now = this.scene.time.now;
        const body = this.body;
        const wut = this.isEnraged() ? 1.3 : 1;  // Wütende Kreatur: 30 % schneller

        switch (this.state) {
            case 'dormant':
                body.setVelocityX(0);
                if (Math.abs(player.x - this.x) < 650) {
                    this.activated = true;
                    sfx.play('roar');
                    this.setPhase('walk', 900, 0x2f6b4a);
                }
                break;

            case 'walk': {
                // Auf den Spieler zugehen, aber nie aus der Arena heraus.
                const richtung = player.x < this.x ? -1 : 1;
                const darf = (richtung === -1 && this.x > this.patrolLeft) ||
                             (richtung === 1 && this.x < this.patrolRight);
                body.setVelocityX(darf ? this.walkSpeed * wut * richtung : 0);
                this.contactDamage = 15;
                if (now >= this.stateUntil) {
                    body.setVelocityX(0);
                    this.nextAttack = this.chooseAttack();
                    // Jeder Angriff hat seine eigene Warnfarbe.
                    const warnfarbe = { charge: 0xff8a1f, leap: 0xffd23f, spit: 0xcc66ff }[this.nextAttack];
                    this.setPhase('telegraph', this.isEnraged() ? 450 : 700, warnfarbe);
                }
                break;
            }

            case 'telegraph':
                body.setVelocityX(0);
                if (now >= this.stateUntil) this.startAttack(player, now);
                break;

            case 'charge': {
                body.setVelocityX(this.chargeSpeed * wut * this.dir);
                const amRand = (this.dir === -1 && this.x <= this.patrolLeft) ||
                               (this.dir === 1 && this.x >= this.patrolRight);
                if (amRand || now >= this.stateUntil) {
                    body.setVelocityX(0);
                    this.contactDamage = 15;
                    this.setPhase('tired', 1100, 0x9fb8a6);
                }
                break;
            }

            case 'leap': {
                // Am Rand der Arena die waagerechte Bewegung stoppen.
                if ((this.x <= this.patrolLeft && body.velocity.x < 0) ||
                    (this.x >= this.patrolRight && body.velocity.x > 0)) {
                    body.setVelocityX(0);
                }
                // Gelandet? (Erst kurz nach dem Absprung prüfen, sonst gilt der Start als "Boden".)
                if (now - this.leapStart > 300 && body.blocked.down) {
                    body.setVelocityX(0);
                    this.contactDamage = 15;
                    // Zwei Druckwellen am Boden: eine nach links (Winkel PI), eine nach rechts (0).
                    this.scene.spawnEnemyBullet(this.x, this.y + 42, Math.PI, 320, 15);
                    this.scene.spawnEnemyBullet(this.x, this.y + 42, 0, 320, 15);
                    this.setPhase('tired', 900, 0x9fb8a6);
                }
                break;
            }

            case 'spit':
                body.setVelocityX(0);
                if (now >= this.stateUntil) {
                    this.setPhase('tired', 800, 0x9fb8a6);
                }
                break;

            case 'tired':
                body.setVelocityX(0);
                if (now >= this.stateUntil) this.setPhase('walk', 700, 0x2f6b4a);
                break;
        }
    }

    // Führt den vorbereiteten Angriff aus (am Ende der Vorwarnung).
    // Wichtig: Richtung und Ziel werden erst JETZT bestimmt. Wer sich in der Vorwarnzeit
    // bewegt, kann ausweichen. Das macht die Angriffe fair.
    startAttack(player, now) {
        this.dir = player.x < this.x ? -1 : 1;

        if (this.nextAttack === 'charge') {
            this.contactDamage = 30;
            this.setPhase('charge', 900, 0xdd2222);

        } else if (this.nextAttack === 'leap') {
            this.contactDamage = 25;
            // Sprungweite grob zum Spieler hin, begrenzt auf ±380 Pixel pro Sekunde.
            const vx = Phaser.Math.Clamp((player.x - this.x) * 1.2, -380, 380);
            this.body.setVelocity(vx, -640);
            this.leapStart = now;
            this.setPhase('leap', 3000, 0xffb000);

        } else {  // spit
            // Drei Geschosse im Fächer um die Richtung zum Spieler (links, Mitte, rechts).
            const winkel = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
            for (const versatz of [-0.28, 0, 0.28]) {
                this.scene.spawnEnemyBullet(this.x, this.y - 10, winkel + versatz, 360, 15);
            }
            this.setPhase('spit', 500, 0xcc66ff);
        }
    }
}
