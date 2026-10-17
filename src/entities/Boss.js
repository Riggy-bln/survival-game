import Enemy from './Enemy.js';
import { sfx } from '../Sound.js';

// Die mutierte Kreatur: ein Kampf in drei Phasen.
//
// Phase 1 (über 2/3 Leben):   Sturmangriff und Sprung.
// Phase 2 (unter 2/3):        Die Kreatur brüllt und ruft die BRUT herbei. Solange noch Brutlinge leben, schützt ein SCHILD sie
//                             (keine Treffer möglich). Dazu kommen Spucken und STEINSCHLAG (Felsen fallen von der Decke).
// Phase 3 (unter 1/3):        Noch schneller. Eine zweite Brut, Doppel-Sturmangriff, Spuckfächer mit fünf Geschossen, mehr Steinschlag.
// Nach jeder Brut fällt das Schild, und die Kreatur ist 2,5 Sekunden lang erschöpft: Jetzt zählt jeder Treffer doppelt.
//
// Zustände im Kampf:
//   walk      -> läuft auf den Spieler zu
//   telegraph -> bleibt stehen und leuchtet in der FARBE des kommenden Angriffs (Vorwarnung)
//   charge    -> Sturmangriff (orange Warnung)
//   leap      -> Sprungangriff mit zwei Druckwellen am Boden (gelb)
//   spit      -> Spuckangriff im Fächer (lila)
//   rubble    -> Steinschlag (braun): rote Kreise zeigen am Boden, wo gleich Felsen einschlagen
//   summon    -> Gebrüll, die Brut erwacht
//   tired     -> kurz erschöpft und blass: jetzt zählt jeder Treffer doppelt
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

        this.schild = false;      // geschützt, solange Brutlinge leben
        this.brut = [];           // die Brutlinge der aktuellen Welle
        this.stufeErledigt = 1;   // welche Phasen-Wechsel hat sie schon gehabt (1 = keiner)
        this.kettenAngriffe = 0;  // Phase 3: wie viele Sturmangriffe folgen noch direkt hintereinander?
        this.spuckSalven = 0;     // Phase 3: wie viele Spucksalven folgen noch?
        this.steinStellen = [];   // x-Positionen des geplanten Steinschlags
    }

    // Aktuelle Phase aus den Lebenspunkten: 1, 2 oder 3.
    phase() {
        if (this.health > this.maxHealth * 2 / 3) return 1;
        return this.health > this.maxHealth / 3 ? 2 : 3;
    }

    isEnraged() {
        return this.phase() >= 2;
    }

    // Wechselt den Zustand: merkt sich Dauer und Farbe.
    // baseColor setzen wir mit, damit das Aufblitzen beim Treffer zur richtigen Farbe zurückkehrt.
    setPhase(name, dauer, farbe) {
        this.state = name;
        this.stateUntil = this.scene.time.now + dauer;
        this.baseColor = farbe;
        this.setFillStyle(farbe);
    }

    // Im erschöpften Zustand zählt jeder Treffer doppelt. Mit Schild prallt alles ab.
    takeDamage(amount, art = 'kugel') {
        if (this.schild) {
            sfx.play('schwertHit');
            this.scene.zeigeEffekt('muendung', this.x, this.y - 20, Math.random() * 6.28, 0.6, 0x88ddff);
            return false;
        }
        const tot = super.takeDamage(this.state === 'tired' ? amount * 2 : amount, art);
        if (!tot && this.stufeErledigt < this.phase() && this.state !== 'summon') this.beginneBrut();   // Grenze zu Phase 2 oder 3 überschritten
        return tot;
    }

    // Gebrüll: Die Kreatur bleibt stehen, die Brut erwacht, und sie ist bis zum letzten Brutling geschützt.
    beginneBrut() {
        this.stufeErledigt = this.phase();
        this.schild = true;
        this.body.setVelocityX(0);
        this.contactDamage = 15;
        this.setPhase('summon', 1500, 0x66bbff);
        sfx.play('roar');
        this.scene.cameras.main.shake(400, 0.012);
        this.scene.zeigeEffekt('druckwelle', this.x, this.y + 46);
        const zahl = (this.phase() === 2 ? 3 : 4) + (this.scene.anzahlSpieler() - 1);
        this.brut = this.scene.weckeBrut(zahl);
        this.scene.showMessage(this.phase() === 2 ? 'The creature calls its brood!\nWhile they live, the creature is shielded.' : 'A second brood!\nDefeat them to make the creature vulnerable.');
    }

    // Wählt zufällig den nächsten Angriff aus einer Liste (je nach Phase).
    chooseAttack() {
        const angebot = this.phase() === 1 ? ['charge', 'leap'] : ['charge', 'leap', 'spit', 'rubble'];
        // Nicht zweimal hintereinander derselbe Angriff, sonst wirkt es eintönig.
        const frei = angebot.filter(a => a !== this.nextAttack);
        return Phaser.Math.RND.pick(frei);
    }

    update() {
        const player = this.scene.zielFuer(this);   // der nächste lebende Spieler (online auch Mitspieler)
        const now = this.scene.time.now;
        const body = this.body;
        const faz = this.phase();
        const wut = [1, 1, 1.15, 1.4][faz];        // je Phase schneller
        const warnzeit = [0, 720, 560, 420][faz];  // je Phase kürzere Vorwarnung

        // Das Schild fällt, sobald der letzte Brutling tot ist: Dann ist die Kreatur kurz erschöpft und verwundbar.
        if (this.schild && this.state !== 'summon' && this.brut.every(b => !b.active)) {
            this.schild = false;
            this.brut = [];
            body.setVelocityX(0);
            this.setPhase('tired', 2500, 0x9fb8a6);
            sfx.play('heal');
            this.scene.showMessage('The shield is down!\nStrike now!');
        }

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
                    const warnfarbe = { charge: 0xff8a1f, leap: 0xffd23f, spit: 0xcc66ff, rubble: 0xa8793a }[this.nextAttack];
                    this.setPhase('telegraph', warnzeit, warnfarbe);
                    if (this.nextAttack === 'rubble') this.zeigeSteinWarnung();
                    if (this.nextAttack === 'charge' && faz === 3) this.kettenAngriffe = 1;
                    if (this.nextAttack === 'spit') this.spuckSalven = faz === 3 ? 1 : 0;
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
                    if (this.kettenAngriffe > 0) {                    // Phase 3: gleich noch einmal, diesmal zurück zum Spieler
                        this.kettenAngriffe -= 1;
                        this.nextAttack = 'charge';
                        this.setPhase('telegraph', 260, 0xff8a1f);
                    } else {
                        this.setPhase('tired', faz === 3 ? 800 : 1100, 0x9fb8a6);
                    }
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
                    // Zwei Druckwellen am Boden: eine nach links (Winkel PI), eine nach rechts (0). In Phase 3 schneller.
                    const tempo = faz === 3 ? 400 : 320;
                    this.scene.spawnEnemyBullet(this.x, this.y + 42, Math.PI, tempo, 15);
                    this.scene.spawnEnemyBullet(this.x, this.y + 42, 0, tempo, 15);
                    this.scene.zeigeEffekt('druckwelle', this.x, this.y + 46);               // sichtbare Druckwelle am Boden
                    this.setPhase('tired', faz === 3 ? 700 : 900, 0x9fb8a6);
                }
                break;
            }

            case 'spit':
                body.setVelocityX(0);
                if (now >= this.stateUntil) {
                    if (this.spuckSalven > 0) {                       // Phase 3: eine zweite Salve gleich hinterher
                        this.spuckSalven -= 1;
                        this.spucke(player);
                        this.setPhase('spit', 450, 0xcc66ff);
                    } else {
                        this.setPhase('tired', 800, 0x9fb8a6);
                    }
                }
                break;

            case 'rubble':
                body.setVelocityX(0);
                if (now >= this.stateUntil) this.setPhase('tired', 700, 0x9fb8a6);
                break;

            case 'summon':
                body.setVelocityX(0);
                if (now >= this.stateUntil) this.setPhase('walk', 600, 0x2f6b4a);
                break;

            case 'tired':
                body.setVelocityX(0);
                if (now >= this.stateUntil) this.setPhase('walk', 700, 0x2f6b4a);
                break;
        }
    }

    // Spuckfächer um die Richtung zum Spieler: 3 Geschosse, in Phase 3 fünf.
    spucke(player) {
        const winkel = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
        const versaetze = this.phase() === 3 ? [-0.5, -0.25, 0, 0.25, 0.5] : [-0.28, 0, 0.28];
        for (const versatz of versaetze) {
            this.scene.spawnEnemyBullet(this.x, this.y - 10, winkel + versatz, 360, 15);
            this.scene.zeigeEffekt('muendung', this.x + Math.cos(winkel) * 30, this.y - 40 + Math.sin(winkel) * 30, winkel + versatz, 1.2, 0x88ff66);   // grüner Schleimblitz am Maul
        }
    }

    // Steinschlag, Vorwarnung: Rote Kreise am Boden zeigen die Einschlagstellen (unter den Spielern und an Zufallsstellen).
    zeigeSteinWarnung() {
        const ziele = this.scene.alleZiele().map((z) => z.rect.centerX);
        const extra = this.phase() === 3 ? 3 : 1;
        for (let i = 0; i < extra; i++) ziele.push(Phaser.Math.Between(this.patrolLeft, this.patrolRight));
        this.steinStellen = ziele.slice(0, 6);
        for (const x of this.steinStellen) this.scene.warnung(x, 2000);
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

        } else if (this.nextAttack === 'rubble') {
            // Die Felsbrocken stürzen kurz nach der Vorwarnung herab: Zeit zum Weglaufen (oder zum Unterstellen unter eine Plattform).
            this.scene.cameras.main.shake(300, 0.01);
            sfx.play('explosion');
            this.scene.steinschlag(this.steinStellen, 500);
            this.setPhase('rubble', 1100, 0xa8793a);

        } else {  // spit
            this.spucke(player);
            this.setPhase('spit', 500, 0xcc66ff);
        }
    }
}
