import Enemy from './Enemy.js';

// Die stärkere Kreatur. Sie hat ein festes Angriffsmuster aus vier Phasen:
//   walk      -> läuft langsam auf den Spieler zu
//   telegraph -> bleibt stehen und leuchtet ORANGE (Vorwarnung: gleich kommt ein Angriff)
//   charge    -> stürmt in die Richtung, in der der Spieler stand (schnell, gefährlich)
//   tired     -> erschöpft und blass: jetzt ist sie verwundbar (doppelter Schaden)
// Danach beginnt es von vorn. Unter der Hälfte der Lebenspunkte wird sie wütend (schneller).
export default class Boss extends Enemy {
    constructor(scene, x, y, patrolLeft, patrolRight) {
        // 84 breit, 100 hoch, dunkelgrün: deutlich größer als normale Gegner
        super(scene, x, y, patrolLeft, patrolRight, 84, 100, 0x2f6b4a);

        this.maxHealth = 24;
        this.health = this.maxHealth;

        this.walkSpeed = 70;
        this.chargeSpeed = 430;
        this.chargeDir = 1;       // Richtung des Sturmangriffs (-1 links, 1 rechts)

        this.state = 'dormant';   // "schläft", bis der Spieler nah genug kommt
        this.stateUntil = 0;      // Zeitpunkt, an dem die aktuelle Phase endet
        this.activated = false;   // wurde sie schon geweckt? (für die Lebensanzeige)
    }

    // Wütend, sobald sie nur noch die Hälfte der Lebenspunkte hat.
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

    // Überschreibt Enemy.takeDamage: Im erschöpften Zustand zählt jeder Treffer doppelt.
    takeDamage(amount) {
        return super.takeDamage(this.state === 'tired' ? amount * 2 : amount);
    }

    update() {
        const player = this.scene.player;
        const now = this.scene.time.now;
        const body = this.body;
        const wut = this.isEnraged() ? 1.3 : 1;  // Wütende Kreatur: 30 % schneller

        switch (this.state) {
            case 'dormant':
                // Aufwachen, wenn der Spieler näher als 650 Pixel ist.
                body.setVelocityX(0);
                if (Math.abs(player.x - this.x) < 650) {
                    this.activated = true;
                    this.setPhase('walk', 1500, 0x2f6b4a);
                }
                break;

            case 'walk': {
                // Langsam auf den Spieler zugehen (aber nie aus dem Bereich heraus).
                const richtung = player.x < this.x ? -1 : 1;
                const darf = (richtung === -1 && this.x > this.patrolLeft) ||
                             (richtung === 1 && this.x < this.patrolRight);
                body.setVelocityX(darf ? this.walkSpeed * wut * richtung : 0);
                this.contactDamage = 15;
                if (now >= this.stateUntil) {
                    // Vorwarnung: stehen bleiben und orange leuchten.
                    body.setVelocityX(0);
                    this.setPhase('telegraph', this.isEnraged() ? 550 : 850, 0xff8a1f);
                }
                break;
            }

            case 'telegraph':
                body.setVelocityX(0);
                if (now >= this.stateUntil) {
                    // Erst JETZT wird die Richtung festgelegt. Wer in der Vorwarnzeit die Seite
                    // wechselt, kann dem Sturmangriff ausweichen.
                    this.chargeDir = player.x < this.x ? -1 : 1;
                    this.contactDamage = 30;
                    this.setPhase('charge', 900, 0xdd2222);
                }
                break;

            case 'charge': {
                body.setVelocityX(this.chargeSpeed * wut * this.chargeDir);
                const amRand = (this.chargeDir === -1 && this.x <= this.patrolLeft) ||
                               (this.chargeDir === 1 && this.x >= this.patrolRight);
                if (amRand || now >= this.stateUntil) {
                    body.setVelocityX(0);
                    this.contactDamage = 15;
                    this.setPhase('tired', 1700, 0x9fb8a6);  // blass = erschöpft = verwundbar
                }
                break;
            }

            case 'tired':
                body.setVelocityX(0);
                if (now >= this.stateUntil) {
                    this.setPhase('walk', 1300, 0x2f6b4a);
                }
                break;
        }
    }
}
